const supabase = require("../config/database");
const { updateAnimalCategory } = require("../services/animalCategoryService");

// ============================================================
// REGISTRAR PESO
// ============================================================

exports.recordWeight = async (req, res) => {
  try {
    const { id_animal, fecha_pesaje, peso_kg } = req.body;

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

    // ========================================================
    // ANIMAL
    // ========================================================

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_animal)
      .single();

    if (animalError) {
      throw animalError;
    }

    // ========================================================
    // ÚLTIMO PESO
    // ========================================================

    const { data: lastWeight, error: lastWeightError } = await supabase
      .from("weights")
      .select("peso_kg, fecha_pesaje")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (lastWeightError) {
      throw lastWeightError;
    }

    // ========================================================
    // GANANCIA DIARIA
    // ========================================================

    let gdp = null;
    let diasTranscurridos = null;
    let pesoAnterior = null;

    if (lastWeight) {
      const fecha1 = new Date(`${lastWeight.fecha_pesaje}T00:00:00`);

      const fecha2 = new Date(`${fecha_pesaje}T00:00:00`);

      diasTranscurridos = Math.floor((fecha2 - fecha1) / (1000 * 60 * 60 * 24));

      pesoAnterior = Number(lastWeight.peso_kg);

      if (diasTranscurridos > 0) {
        gdp = Number(((peso - pesoAnterior) / diasTranscurridos).toFixed(3));
      }
    }

    // ========================================================
    // GUARDAR PESO
    // ========================================================

    const { data, error } = await supabase
      .from("weights")
      .insert([
        {
          id_animal,
          fecha_pesaje,
          peso_kg: peso,
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

    // ========================================================
    // ACTUALIZAR PESO ACTUAL
    // ========================================================

    const { data: updatedAnimal, error: updateError } = await supabase
      .from("animals")
      .update({
        peso_actual: peso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id_animal)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // ========================================================
    // CATEGORÍA
    // Maute >= 400 kg + Reproducción -> Toro
    // ========================================================

    await updateAnimalCategory(updatedAnimal, {
      motivo:
        peso >= 400 ? "Pesaje confirmó 400 kg o más" : "Actualización de peso",
      fechaInicio: fecha_pesaje,
    });

    const { data: finalAnimal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_animal)
      .single();

    res.json({
      success: true,
      data,
      animal: finalAnimal,
    });
  } catch (err) {
    console.error("recordWeight:", err);

    res.status(400).json({
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

    const { data, error } = await supabase
      .from("weights")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("getWeightHistory:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
