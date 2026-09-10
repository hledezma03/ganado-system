const supabase = require("../config/database");

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
        error: "La vaca es obligatoria",
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

    // ----------------------------------------------------------
    // Verificar que la vaca exista y sea hembra
    // ----------------------------------------------------------

    const { data: vaca, error: vacaError } = await supabase
      .from("animals")
      .select("id, arete, nombre, sexo")
      .eq("id", id_vaca)
      .single();

    if (vacaError) throw vacaError;

    if (vaca.sexo !== "Hembra") {
      return res.status(400).json({
        error: "El animal seleccionado como madre no es una hembra",
      });
    }

    // ----------------------------------------------------------
    // Verificar que la cría exista
    // ----------------------------------------------------------

    const { data: cria, error: criaError } = await supabase
      .from("animals")
      .select("id, arete, nombre, sexo, fecha_nacimiento, id_madre, estado")
      .eq("id", id_cria)
      .single();

    if (criaError) throw criaError;

    // ----------------------------------------------------------
    // Evitar registrar la misma cría dos veces
    // ----------------------------------------------------------

    const { data: existingBirth, error: existingError } = await supabase
      .from("reproduction")
      .select("id")
      .eq("id_cria", id_cria)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingBirth) {
      return res.status(400).json({
        error: "Este animal ya está registrado como cría de un parto",
      });
    }

    // ----------------------------------------------------------
    // Validar fecha de nacimiento de la cría
    // ----------------------------------------------------------

    if (cria.fecha_nacimiento && cria.fecha_nacimiento !== fecha_parto_real) {
      return res.status(400).json({
        error:
          "La fecha de nacimiento de la cría no coincide con la fecha del parto",
      });
    }

    // ----------------------------------------------------------
    // Buscar último parto de la vaca
    // ----------------------------------------------------------

    const { data: previousBirth, error: previousError } = await supabase
      .from("reproduction")
      .select("fecha_parto_real")
      .eq("id_vaca", id_vaca)
      .not("fecha_parto_real", "is", null)
      .order("fecha_parto_real", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError) throw previousError;

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

    // ----------------------------------------------------------
    // Registrar parto
    // ----------------------------------------------------------

    const { data, error } = await supabase
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

    if (error) throw error;

    // ----------------------------------------------------------
    // Actualizar relación madre → cría
    // ----------------------------------------------------------

    const { data: updatedCria, error: updateCriaError } = await supabase
      .from("animals")
      .update({
        id_madre: id_vaca,
        fecha_nacimiento: fecha_parto_real,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id_cria)
      .select()
      .single();

    if (updateCriaError) throw updateCriaError;

    return res.status(201).json({
      success: true,
      message: "Parto registrado correctamente",
      data,
      cria: updatedCria,
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
// OBTENER PARTOS DE UNA VACA
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
          peso_actual
        )
        `,
      )
      .eq("id_vaca", id_vaca)
      .order("fecha_parto_real", {
        ascending: false,
      });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("getReproductionByAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// OBTENER TODAS LAS VACAS CON SUS PARTOS
// ============================================================

exports.getCowsReproduction = async (req, res) => {
  try {
    const { data: cows, error: cowsError } = await supabase
      .from("animals")
      .select(
        "id, arete, nombre, sexo, fecha_nacimiento, categoria, estado, finalidad",
      )
      .eq("sexo", "Hembra")
      .eq("estado", "Activo")
      .order("arete", { ascending: true });

    if (cowsError) throw cowsError;

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
          peso_actual
        )
        `,
      )
      .order("fecha_parto_real", {
        ascending: false,
      });

    if (birthsError) throw birthsError;

    const result = (cows || []).map((cow) => {
      const cowBirths = (births || []).filter(
        (birth) => birth.id_vaca === cow.id,
      );

      const intervals = cowBirths
        .map((birth) => Number(birth.iep_dias))
        .filter((value) => Number.isFinite(value) && value > 0);

      const averageInterval =
        intervals.length > 0
          ? Math.round(
              intervals.reduce((sum, value) => sum + value, 0) /
                intervals.length,
            )
          : null;

      const lastBirth = cowBirths[0] || null;

      const calvesAlive = cowBirths.filter(
        (birth) => birth.cria?.estado === "Activo",
      ).length;

      const calvesDead = cowBirths.filter(
        (birth) => birth.cria?.estado === "Muerto",
      ).length;

      const lastBirthDate = lastBirth?.fecha_parto_real
        ? new Date(`${lastBirth.fecha_parto_real}T00:00:00`)
        : null;

      const daysSinceLastBirth = lastBirthDate
        ? Math.floor((new Date() - lastBirthDate) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...cow,
        total_partos: cowBirths.length,
        intervalo_promedio_dias: averageInterval,
        ultimo_parto: lastBirth?.fecha_parto_real || null,
        dias_desde_ultimo_parto: daysSinceLastBirth,
        crias_vivas: calvesAlive,
        crias_muertas: calvesDead,
        tasa_supervivencia:
          cowBirths.length > 0
            ? Number(((calvesAlive / cowBirths.length) * 100).toFixed(1))
            : null,
        partos: cowBirths,
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
      .eq("id_cria", id_cria)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
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

    if (error) throw error;

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
