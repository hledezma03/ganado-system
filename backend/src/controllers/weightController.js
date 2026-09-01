const supabase = require("../config/database");

// ============================================================
// VALIDAR PESO
// ============================================================

const validarPeso = (peso) => {
  if (peso === undefined || peso === null || peso === "") {
    return false;
  }

  const numero = Number(peso);

  if (!Number.isFinite(numero)) {
    return false;
  }

  if (numero <= 0) {
    return false;
  }

  return true;
};

// ============================================================
// CALCULAR DÍAS ENTRE DOS FECHAS
// ============================================================

const calcularDias = (fechaAnterior, fechaActual) => {
  const [aYear, aMonth, aDay] = fechaAnterior.split("-").map(Number);
  const [bYear, bMonth, bDay] = fechaActual.split("-").map(Number);

  const anteriorUTC = Date.UTC(aYear, aMonth - 1, aDay);
  const actualUTC = Date.UTC(bYear, bMonth - 1, bDay);

  return Math.floor((actualUTC - anteriorUTC) / (1000 * 60 * 60 * 24));
};

// ============================================================
// REGISTRAR PESO
// ============================================================

exports.recordWeight = async (req, res) => {
  try {
    const { id_animal, fecha_pesaje, peso_kg } = req.body;

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

    if (!validarPeso(peso_kg)) {
      return res.status(400).json({
        error: "El peso debe ser un número mayor que 0",
      });
    }

    const pesoActual = Number(peso_kg);

    // --------------------------------------------------------
    // VERIFICAR ANIMAL
    // --------------------------------------------------------

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("id, arete, nombre, estado")
      .eq("id", id_animal)
      .single();

    if (animalError) {
      throw animalError;
    }

    if (!animal) {
      return res.status(404).json({
        error: "Animal no encontrado",
      });
    }

    // No tiene sentido registrar pesajes de animales
    // eliminados físicamente. Los estados Muerto,
    // Vendido o Desaparecido pueden conservar historial.
    if (animal.estado === "Muerto") {
      return res.status(400).json({
        error: "No se puede registrar un nuevo pesaje de un animal muerto",
      });
    }

    // --------------------------------------------------------
    // EVITAR DOS PESAJES EL MISMO DÍA
    // --------------------------------------------------------

    const { data: pesajeExistente, error: duplicateError } = await supabase
      .from("weights")
      .select("id, peso_kg")
      .eq("id_animal", id_animal)
      .eq("fecha_pesaje", fecha_pesaje)
      .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (pesajeExistente) {
      return res.status(400).json({
        error: `Ya existe un pesaje para este animal en la fecha ${fecha_pesaje}`,
      });
    }

    // --------------------------------------------------------
    // BUSCAR PESO ANTERIOR REAL
    // --------------------------------------------------------
    //
    // Importante:
    // Buscamos el último pesaje ANTERIOR a la fecha actual.
    // Esto permite introducir posteriormente un pesaje antiguo
    // sin romper el cálculo.
    // --------------------------------------------------------

    const { data: lastWeight, error: lastWeightError } = await supabase
      .from("weights")
      .select("peso_kg, fecha_pesaje")
      .eq("id_animal", id_animal)
      .lt("fecha_pesaje", fecha_pesaje)
      .order("fecha_pesaje", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastWeightError) {
      throw lastWeightError;
    }

    let gdp = null;
    let diasTranscurridos = null;
    let pesoAnterior = null;

    if (lastWeight) {
      pesoAnterior = Number(lastWeight.peso_kg);

      diasTranscurridos = calcularDias(lastWeight.fecha_pesaje, fecha_pesaje);

      if (diasTranscurridos > 0) {
        gdp = Number(
          ((pesoActual - pesoAnterior) / diasTranscurridos).toFixed(3),
        );
      }
    }

    // --------------------------------------------------------
    // INSERTAR PESO
    // --------------------------------------------------------

    const { data, error } = await supabase
      .from("weights")
      .insert([
        {
          id_animal,
          fecha_pesaje,
          peso_kg: pesoActual,
          gdp_diaria: gdp,
          peso_anterior: pesoAnterior,
          dias_transcurridos: diasTranscurridos,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // ACTUALIZAR PESO ACTUAL DEL ANIMAL
    // --------------------------------------------------------
    //
    // Solo actualizamos animals.peso_actual si este nuevo
    // pesaje es el más reciente.
    // --------------------------------------------------------

    const { data: latestWeight, error: latestWeightError } = await supabase
      .from("weights")
      .select("peso_kg, fecha_pesaje")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", { ascending: false })
      .limit(1)
      .single();

    if (latestWeightError) {
      throw latestWeightError;
    }

    if (latestWeight && latestWeight.fecha_pesaje === fecha_pesaje) {
      const { error: updateAnimalError } = await supabase
        .from("animals")
        .update({
          peso_actual: pesoActual,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id_animal);

      if (updateAnimalError) {
        throw updateAnimalError;
      }
    }

    // --------------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("recordWeight:", err);

    return res.status(400).json({
      error: err.message || "Error registrando pesaje",
    });
  }
};

// ============================================================
// HISTORIAL DE PESAJES
// ============================================================

exports.getWeightHistory = async (req, res) => {
  try {
    const { id_animal } = req.params;

    if (!id_animal) {
      return res.status(400).json({
        error: "El animal es obligatorio",
      });
    }

    const { data, error } = await supabase
      .from("weights")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(data || []);
  } catch (err) {
    console.error("getWeightHistory:", err);

    return res.status(400).json({
      error: err.message || "Error obteniendo historial de pesajes",
    });
  }
};
