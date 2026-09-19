const supabase = require("../config/database");

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

// ============================================================
// UTILIDADES
// ============================================================

const getActiveAnimal = async (id) => {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Animal no encontrado");
  }

  if (data.estado !== "Activo") {
    throw new Error("Solo se pueden gestionar animales activos");
  }

  return data;
};

// ============================================================
// IDENTIFICACIÓN
// ============================================================

// GET /api/field/identification
exports.getIdentification = async (req, res) => {
  try {
    const { data: animals, error: animalsError } = await supabase
      .from("animals")
      .select(
        `
        id,
        arete,
        nombre,
        sexo,
        categoria,
        estado,
        potrero
        `,
      )
      .eq("estado", "Activo")
      .order("arete", { ascending: true });

    if (animalsError) {
      throw animalsError;
    }

    const { data: identification, error: identificationError } = await supabase
      .from("animal_identification")
      .select(
        `
          id,
          id_animal,
          herrado,
          fecha_herrado,
          numerado,
          fecha_numerado,
          created_at,
          updated_at
          `,
      );

    if (identificationError) {
      throw identificationError;
    }

    const identificationMap = new Map(
      (identification || []).map((item) => [item.id_animal, item]),
    );

    const data = (animals || []).map((animal) => {
      const record = identificationMap.get(animal.id);

      return {
        ...animal,
        herrado: record?.herrado || false,
        fecha_herrado: record?.fecha_herrado || null,
        numerado: record?.numerado || false,
        fecha_numerado: record?.fecha_numerado || null,
        identification_id: record?.id || null,
      };
    });

    const summary = {
      total: data.length,

      herrados: data.filter((animal) => animal.herrado).length,

      sin_herrar: data.filter((animal) => !animal.herrado).length,

      numerados: data.filter((animal) => animal.numerado).length,

      sin_numerar: data.filter((animal) => !animal.numerado).length,

      completos: data.filter((animal) => animal.herrado && animal.numerado)
        .length,
    };

    return res.json({
      success: true,
      data,
      summary,
    });
  } catch (err) {
    console.error("getIdentification:", err);

    return res.status(400).json({
      error: err.message || "Error cargando identificación",
    });
  }
};

// PATCH /api/field/identification/:id_animal
exports.updateIdentification = async (req, res) => {
  try {
    const { id_animal } = req.params;

    const { herrado, numerado, fecha_herrado, fecha_numerado } = req.body;

    const animal = await getActiveAnimal(id_animal);

    if (typeof herrado !== "boolean") {
      return res.status(400).json({
        error: "El campo herrado debe ser booleano",
      });
    }

    if (typeof numerado !== "boolean") {
      return res.status(400).json({
        error: "El campo numerado debe ser booleano",
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from("animal_identification")
      .select("*")
      .eq("id_animal", id_animal)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const dataToSave = {
      id_animal,

      herrado,

      fecha_herrado: herrado
        ? fecha_herrado || existing?.fecha_herrado || getToday()
        : null,

      numerado,

      fecha_numerado: numerado
        ? fecha_numerado || existing?.fecha_numerado || getToday()
        : null,

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("animal_identification")
      .upsert(dataToSave, {
        onConflict: "id_animal",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      message: `Identificación de ${animal.arete} actualizada`,
      data,
    });
  } catch (err) {
    console.error("updateIdentification:", err);

    return res.status(400).json({
      error: err.message || "Error actualizando identificación",
    });
  }
};

// ============================================================
// VACUNACIÓN
// ============================================================

// GET /api/field/vaccinations
exports.getVaccinations = async (req, res) => {
  try {
    const { data: animals, error: animalsError } = await supabase
      .from("animals")
      .select(
        `
        id,
        arete,
        nombre,
        sexo,
        categoria,
        estado,
        potrero
        `,
      )
      .eq("estado", "Activo")
      .order("arete", { ascending: true });

    if (animalsError) {
      throw animalsError;
    }

    const { data: vaccinations, error: vaccinationsError } = await supabase
      .from("animal_vaccinations")
      .select(
        `
          id,
          id_animal,
          vacuna,
          fecha_aplicacion,
          dosis_ml,
          observaciones
          `,
      )
      .order("fecha_aplicacion", {
        ascending: false,
      });

    if (vaccinationsError) {
      throw vaccinationsError;
    }

    const vaccinationMap = new Map();

    for (const vaccination of vaccinations || []) {
      if (!vaccinationMap.has(vaccination.id_animal)) {
        vaccinationMap.set(vaccination.id_animal, vaccination);
      }
    }

    const countMap = new Map();

    for (const vaccination of vaccinations || []) {
      countMap.set(
        vaccination.id_animal,
        (countMap.get(vaccination.id_animal) || 0) + 1,
      );
    }

    const data = (animals || []).map((animal) => {
      const lastVaccination = vaccinationMap.get(animal.id);

      return {
        ...animal,

        vacunado: Boolean(lastVaccination),

        ultima_vacuna: lastVaccination?.vacuna || null,

        ultima_vacunacion: lastVaccination?.fecha_aplicacion || null,

        ultima_dosis_ml: lastVaccination?.dosis_ml ?? null,

        total_vacunaciones: countMap.get(animal.id) || 0,
      };
    });

    const summary = {
      total: data.length,

      vacunados: data.filter((animal) => animal.vacunado).length,

      sin_vacunar: data.filter((animal) => !animal.vacunado).length,

      total_registros: vaccinations?.length || 0,
    };

    return res.json({
      success: true,
      data,
      summary,
    });
  } catch (err) {
    console.error("getVaccinations:", err);

    return res.status(400).json({
      error: err.message || "Error cargando vacunaciones",
    });
  }
};

// GET /api/field/vaccinations/:id_animal
exports.getVaccinationHistory = async (req, res) => {
  try {
    const { id_animal } = req.params;

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("id, arete, nombre, estado")
      .eq("id", id_animal)
      .single();

    if (animalError) {
      throw animalError;
    }

    const { data, error } = await supabase
      .from("animal_vaccinations")
      .select(
        `
        id,
        id_animal,
        vacuna,
        fecha_aplicacion,
        dosis_ml,
        observaciones,
        created_at
        `,
      )
      .eq("id_animal", id_animal)
      .order("fecha_aplicacion", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      animal,
      data: data || [],
    });
  } catch (err) {
    console.error("getVaccinationHistory:", err);

    return res.status(400).json({
      error: err.message || "Error cargando historial de vacunación",
    });
  }
};

// POST /api/field/vaccinations
exports.createVaccination = async (req, res) => {
  try {
    const { id_animal, vacuna, fecha_aplicacion, dosis_ml, observaciones } =
      req.body;

    if (!id_animal) {
      return res.status(400).json({
        error: "El animal es obligatorio",
      });
    }

    if (!vacuna || !String(vacuna).trim()) {
      return res.status(400).json({
        error: "La vacuna es obligatoria",
      });
    }

    if (!fecha_aplicacion) {
      return res.status(400).json({
        error: "La fecha de aplicación es obligatoria",
      });
    }

    const animal = await getActiveAnimal(id_animal);

    let dosis = null;

    if (dosis_ml !== undefined && dosis_ml !== null && dosis_ml !== "") {
      dosis = Number(dosis_ml);

      if (!Number.isFinite(dosis) || dosis <= 0) {
        return res.status(400).json({
          error: "La dosis debe ser mayor que 0",
        });
      }
    }

    const { data, error } = await supabase
      .from("animal_vaccinations")
      .insert([
        {
          id_animal,

          vacuna: String(vacuna).trim(),

          fecha_aplicacion,

          dosis_ml: dosis,

          observaciones:
            observaciones && String(observaciones).trim()
              ? String(observaciones).trim()
              : null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: `Vacunación registrada para ${animal.arete}`,
      data,
    });
  } catch (err) {
    console.error("createVaccination:", err);

    return res.status(400).json({
      error: err.message || "Error registrando vacunación",
    });
  }
};
