const supabase = require("../config/database");

// ============================================================
// REGISTRAR PESO
// ============================================================

exports.recordWeight = async (req, res) => {
  try {
    const { id_animal, fecha_pesaje, peso_kg } = req.body;

    console.log("========================================");
    console.log("REGISTRANDO PESAJE");
    console.log("Datos recibidos:", {
      id_animal,
      fecha_pesaje,
      peso_kg,
    });
    console.log("========================================");

    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (!id_animal) {
      return res.status(400).json({
        error: "El animal es obligatorio",
      });
    }

    if (!fecha_pesaje) {
      return res.status(400).json({
        error: "La fecha del pesaje es obligatoria",
      });
    }

    if (
      peso_kg === undefined ||
      peso_kg === null ||
      peso_kg === "" ||
      Number.isNaN(Number(peso_kg))
    ) {
      return res.status(400).json({
        error: "El peso debe ser un número válido",
      });
    }

    const peso = Number(peso_kg);

    if (peso <= 0) {
      return res.status(400).json({
        error: "El peso debe ser mayor que 0",
      });
    }

    // --------------------------------------------------------
    // VERIFICAR QUE EL ANIMAL EXISTE
    // --------------------------------------------------------

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("id, arete, nombre, estado, peso_actual")
      .eq("id", id_animal)
      .single();

    if (animalError) {
      console.error("ERROR BUSCANDO ANIMAL:");
      console.error(animalError);

      return res.status(400).json({
        error: `No se pudo encontrar el animal: ${animalError.message}`,
      });
    }

    console.log("Animal encontrado:", animal);

    // --------------------------------------------------------
    // OBTENER ÚLTIMO PESO
    // --------------------------------------------------------

    const { data: lastWeight, error: lastWeightError } = await supabase
      .from("weights")
      .select("peso_kg, fecha_pesaje")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastWeightError) {
      console.error("ERROR BUSCANDO PESO ANTERIOR:");
      console.error(lastWeightError);

      return res.status(400).json({
        error: `No se pudo consultar el historial de peso: ${lastWeightError.message}`,
      });
    }

    console.log("Último peso:", lastWeight);

    // --------------------------------------------------------
    // CALCULAR GANANCIA DIARIA
    // --------------------------------------------------------

    let gdp = null;
    let diasTranscurridos = null;
    let pesoAnterior = null;

    if (lastWeight) {
      const fecha1 = new Date(`${lastWeight.fecha_pesaje}T00:00:00`);
      const fecha2 = new Date(`${fecha_pesaje}T00:00:00`);

      diasTranscurridos = Math.floor((fecha2 - fecha1) / (1000 * 60 * 60 * 24));

      pesoAnterior = Number(lastWeight.peso_kg);

      console.log("Peso anterior:", pesoAnterior);
      console.log("Días transcurridos:", diasTranscurridos);

      if (diasTranscurridos > 0) {
        gdp = Number(((peso - pesoAnterior) / diasTranscurridos).toFixed(3));
      }
    }

    console.log("GDP calculada:", gdp);

    // --------------------------------------------------------
    // INSERTAR PESAJE
    // --------------------------------------------------------

    const pesoData = {
      id_animal,
      fecha_pesaje,
      peso_kg: peso,
      gdp_diaria: gdp,
      peso_anterior: pesoAnterior,
      dias_transcurridos: diasTranscurridos,
    };

    console.log("Insertando en weights:", pesoData);

    const { data, error } = await supabase
      .from("weights")
      .insert([pesoData])
      .select()
      .single();

    if (error) {
      console.error("========================================");
      console.error("ERROR SUPABASE INSERTANDO PESO");
      console.error(error);
      console.error("========================================");

      return res.status(400).json({
        error: error.message,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null,
      });
    }

    // --------------------------------------------------------
    // ACTUALIZAR PESO ACTUAL DEL ANIMAL
    // --------------------------------------------------------

    const { error: updateAnimalError } = await supabase
      .from("animals")
      .update({
        peso_actual: peso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id_animal);

    if (updateAnimalError) {
      console.error("ERROR ACTUALIZANDO PESO ACTUAL DEL ANIMAL:");
      console.error(updateAnimalError);

      return res.status(400).json({
        error: `El pesaje fue registrado, pero no se pudo actualizar el peso actual del animal: ${updateAnimalError.message}`,
      });
    }

    console.log("Pesaje registrado correctamente:", data);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("========================================");
    console.error("ERROR GENERAL recordWeight:");
    console.error(err);
    console.error("========================================");

    return res.status(400).json({
      error: err.message || "Error al registrar pesaje",
    });
  }
};

// ============================================================
// HISTORIAL DE PESOS
// ============================================================

exports.getWeightHistory = async (req, res) => {
  try {
    const { id_animal } = req.params;

    console.log("Consultando historial de peso:", id_animal);

    const { data, error } = await supabase
      .from("weights")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", { ascending: true });

    if (error) {
      console.error("ERROR OBTENIENDO HISTORIAL:");
      console.error(error);

      return res.status(400).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("getWeightHistory:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
