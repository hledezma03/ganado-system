const supabase = require("../config/database");
const { updateAnimalCategory } = require("../services/animalCategoryService");

// ============================================================
// REGISTRAR PARTO
// ============================================================

exports.recordBirth = async (req, res) => {
  try {
    const {
      id_vaca,
      id_cria,
      fecha_parto_real,
      peso_cria_nacimiento,
      condicion_parto,
    } = req.body;

    if (!id_vaca) {
      return res.status(400).json({
        error: "La madre es obligatoria",
      });
    }

    if (!id_cria) {
      return res.status(400).json({
        error: "La cría es obligatoria",
      });
    }

    if (!fecha_parto_real) {
      return res.status(400).json({
        error: "La fecha del parto es obligatoria",
      });
    }

    // ========================================================
    // VERIFICAR MADRE
    // ========================================================

    const { data: madre, error: madreError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_vaca)
      .single();

    if (madreError) {
      throw madreError;
    }

    if (madre.sexo !== "Hembra") {
      return res.status(400).json({
        error: "El animal seleccionado como madre no es una hembra",
      });
    }

    if (madre.categoria !== "Novilla" && madre.categoria !== "Vaca") {
      return res.status(400).json({
        error: "Solo una Novilla o Vaca puede registrar un parto",
      });
    }

    // ========================================================
    // VERIFICAR CRÍA
    // ========================================================

    const { data: cria, error: criaError } = await supabase
      .from("animals")
      .select(
        "id, arete, nombre, sexo, fecha_nacimiento, id_madre, estado, categoria",
      )
      .eq("id", id_cria)
      .single();

    if (criaError) {
      throw criaError;
    }

    if (cria.estado !== "Activo") {
      return res.status(400).json({
        error: "La cría debe estar activa",
      });
    }

    if (cria.categoria !== "Becerro" && cria.categoria !== "Becerra") {
      return res.status(400).json({
        error: "La cría debe estar registrada como Becerro o Becerra",
      });
    }

    if (cria.id_madre) {
      return res.status(400).json({
        error: "Esta cría ya tiene una madre registrada",
      });
    }

    // ========================================================
    // EVITAR DUPLICAR PARTO
    // ========================================================

    const { data: existingBirth, error: existingError } = await supabase
      .from("reproduction")
      .select("id")
      .eq("id_cria", id_cria)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingBirth) {
      return res.status(400).json({
        error: "Este animal ya está registrado como cría de un parto",
      });
    }

    // ========================================================
    // FECHA DE NACIMIENTO
    // ========================================================

    if (cria.fecha_nacimiento && cria.fecha_nacimiento !== fecha_parto_real) {
      return res.status(400).json({
        error:
          "La fecha de nacimiento de la cría no coincide con la fecha del parto",
      });
    }

    // ========================================================
    // ÚLTIMO PARTO
    // ========================================================

    const { data: previousBirth, error: previousError } = await supabase
      .from("reproduction")
      .select("fecha_parto_real")
      .eq("id_vaca", id_vaca)
      .not("fecha_parto_real", "is", null)
      .order("fecha_parto_real", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (previousError) {
      throw previousError;
    }

    let iep_dias = null;

    if (previousBirth?.fecha_parto_real) {
      const previousDate = new Date(
        `${previousBirth.fecha_parto_real}T00:00:00`,
      );

      const currentDate = new Date(`${fecha_parto_real}T00:00:00`);

      iep_dias = Math.floor(
        (currentDate - previousDate) / (1000 * 60 * 60 * 24),
      );

      if (iep_dias <= 0) {
        return res.status(400).json({
          error:
            "La fecha del nuevo parto debe ser posterior al parto anterior",
        });
      }
    }

    // ========================================================
    // REGISTRAR PARTO
    // ========================================================

    const { data: birth, error: birthError } = await supabase
      .from("reproduction")
      .insert([
        {
          id_vaca,
          id_cria,
          fecha_parto_real,
          peso_cria_nacimiento:
            peso_cria_nacimiento !== undefined &&
            peso_cria_nacimiento !== null &&
            peso_cria_nacimiento !== ""
              ? Number(peso_cria_nacimiento)
              : null,
          condicion_parto: condicion_parto || null,
          iep_dias,
        },
      ])
      .select()
      .single();

    if (birthError) {
      throw birthError;
    }

    // ========================================================
    // ACTUALIZAR CRÍA
    // ========================================================

    const { data: updatedCalf, error: calfError } = await supabase
      .from("animals")
      .update({
        id_madre: id_vaca,
        fecha_nacimiento: fecha_parto_real,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id_cria)
      .select()
      .single();

    if (calfError) {
      throw calfError;
    }

    // ========================================================
    // ACTUALIZAR MADRE
    // Novilla -> Vaca
    // Vaca -> Vaca
    // Condición -> Lactando
    // ========================================================

    const { data: updatedMother, error: motherUpdateError } = await supabase
      .from("animals")
      .update({
        condicion_reproductiva: "Lactando",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id_vaca)
      .select()
      .single();

    if (motherUpdateError) {
      throw motherUpdateError;
    }

    await updateAnimalCategory(updatedMother, {
      motivo: madre.categoria === "Novilla" ? "Primer parto" : "Nuevo parto",
      fechaInicio: fecha_parto_real,
      hasBirths: true,
    });

    const { data: finalMother, error: finalMotherError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_vaca)
      .single();

    if (finalMotherError) {
      throw finalMotherError;
    }

    return res.status(201).json({
      success: true,
      message: "Parto registrado correctamente",
      data: birth,
      madre: finalMother,
      cria: updatedCalf,
      intervalo_partos_dias: iep_dias,
    });
  } catch (err) {
    console.error("recordBirth:", err);

    return res.status(400).json({
      error: err.message || "Error registrando parto",
    });
  }
};

// ============================================================
// OBTENER PARTOS DE UNA MADRE
// ============================================================

exports.getReproductionByAnimal = async (req, res) => {
  try {
    const { id_vaca } = req.params;

    const { data, error } = await supabase
      .from("reproduction")
      .select(
        `
        *,
        cria:id_cria (
          id,
          arete,
          nombre,
          sexo,
          fecha_nacimiento,
          estado,
          categoria,
          peso_actual
        )
      `,
      )
      .eq("id_vaca", id_vaca)
      .order("fecha_parto_real", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("getReproductionByAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// HEMBRAS REPRODUCTIVAS
// Mauta + Novilla + Vaca
// ============================================================

exports.getCowsReproduction = async (req, res) => {
  try {
    const { data: females, error: femalesError } = await supabase
      .from("animals")
      .select(
        `
          id,
          arete,
          nombre,
          sexo,
          fecha_nacimiento,
          fecha_destete,
          categoria,
          estado,
          finalidad,
          condicion_reproductiva,
          peso_actual
        `,
      )
      .eq("sexo", "Hembra")
      .eq("estado", "Activo")
      .in("categoria", ["Mauta", "Novilla", "Vaca"])
      .order("arete", {
        ascending: true,
      });

    if (femalesError) {
      throw femalesError;
    }

    const { data: births, error: birthsError } = await supabase
      .from("reproduction")
      .select(
        `
          id,
          id_vaca,
          id_cria,
          fecha_parto_real,
          peso_cria_nacimiento,
          condicion_parto,
          iep_dias,
          cria:id_cria (
            id,
            arete,
            nombre,
            sexo,
            fecha_nacimiento,
            estado,
            categoria,
            peso_actual
          )
        `,
      )
      .order("fecha_parto_real", {
        ascending: false,
      });

    if (birthsError) {
      throw birthsError;
    }

    const result = (females || []).map((female) => {
      const femaleBirths = (births || []).filter(
        (birth) => birth.id_vaca === female.id,
      );

      const intervals = femaleBirths
        .map((birth) => Number(birth.iep_dias))
        .filter((value) => Number.isFinite(value) && value > 0);

      const averageInterval =
        intervals.length > 0
          ? Math.round(
              intervals.reduce((sum, value) => sum + value, 0) /
                intervals.length,
            )
          : null;

      const lastBirth = femaleBirths[0] || null;

      const calvesAlive = femaleBirths.filter(
        (birth) => birth.cria?.estado === "Activo",
      ).length;

      const calvesDead = femaleBirths.filter(
        (birth) => birth.cria?.estado === "Muerto",
      ).length;

      const lastBirthDate = lastBirth?.fecha_parto_real
        ? new Date(`${lastBirth.fecha_parto_real}T00:00:00`)
        : null;

      const daysSinceLastBirth = lastBirthDate
        ? Math.floor((new Date() - lastBirthDate) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...female,
        total_partos: femaleBirths.length,
        intervalo_promedio_dias: averageInterval,
        ultimo_parto: lastBirth?.fecha_parto_real || null,
        dias_desde_ultimo_parto: daysSinceLastBirth,
        crias_vivas: calvesAlive,
        crias_muertas: calvesDead,
        tasa_supervivencia:
          femaleBirths.length > 0
            ? Number(((calvesAlive / femaleBirths.length) * 100).toFixed(1))
            : null,
        partos: femaleBirths,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getCowsReproduction:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// DESTETE
// ============================================================

exports.recordWeaning = async (req, res) => {
  try {
    const { id_cria, fecha_destete, peso_cria_destete } = req.body;

    if (!id_cria || !fecha_destete) {
      return res.status(400).json({
        error: "La cría y la fecha de destete son obligatorias",
      });
    }

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_cria)
      .single();

    if (animalError) {
      throw animalError;
    }

    if (animal.categoria !== "Becerro" && animal.categoria !== "Becerra") {
      return res.status(400).json({
        error: "Solo un Becerro o Becerra puede registrar el destete",
      });
    }

    const { data: birth, error: birthError } = await supabase
      .from("reproduction")
      .select("id")
      .eq("id_cria", id_cria)
      .maybeSingle();

    if (birthError) {
      throw birthError;
    }

    /*
     * Guardamos siempre la fecha en animals.
     * Esto permite registrar el destete incluso
     * en animales comprados que no tienen parto
     * registrado dentro del sistema.
     */
    const updateAnimal = {
      fecha_destete,
      updated_at: new Date().toISOString(),
    };

    if (animal.sexo === "Hembra") {
      updateAnimal.condicion_reproductiva = "Vacía";
    }

    const { data: updatedAnimal, error: updateError } = await supabase
      .from("animals")
      .update(updateAnimal)
      .eq("id", id_cria)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Si la cría tiene parto registrado, también guardamos
    // el peso de destete en reproduction.
    let reproductionData = null;

    if (birth) {
      const { data, error } = await supabase
        .from("reproduction")
        .update({
          fecha_destete,
          peso_cria_destete:
            peso_cria_destete !== undefined &&
            peso_cria_destete !== null &&
            peso_cria_destete !== ""
              ? Number(peso_cria_destete)
              : null,
        })
        .eq("id", birth.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      reproductionData = data;
    }

    await updateAnimalCategory(updatedAnimal, {
      motivo: "Destete",
      fechaInicio: fecha_destete,
      hasBirths: false,
    });

    const { data: finalAnimal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_cria)
      .single();

    res.json({
      success: true,
      data: finalAnimal,
      reproduction: reproductionData,
    });
  } catch (err) {
    console.error("recordWeaning:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ACTUALIZAR REGISTRO REPRODUCTIVO
// ============================================================

exports.updateReproduction = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "fecha_parto_real",
      "peso_cria_nacimiento",
      "fecha_destete",
      "peso_cria_destete",
      "condicion_parto",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const { data, error } = await supabase
      .from("reproduction")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("updateReproduction:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
