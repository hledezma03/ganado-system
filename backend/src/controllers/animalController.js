const supabase = require("../config/database");
const {
  calculateCategory,
  updateAnimalCategory,
  syncAnimalsCategories,
} = require("../services/animalCategoryService");

// ============================================================
// CREAR ANIMAL
// ============================================================

exports.createAnimal = async (req, res) => {
  try {
    const {
      arete,
      nombre,
      sexo,
      fecha_nacimiento,
      categoria,
      raza,
      color,
      senales,
      senales_particulares,
      id_madre,
      id_padre,
      potrero,
      peso_actual,
      finalidad,
      condicion_reproductiva,
    } = req.body;

    if (!arete || !String(arete).trim()) {
      return res.status(400).json({
        error: "El arete es obligatorio",
      });
    }

    if (!["Macho", "Hembra"].includes(sexo)) {
      return res.status(400).json({
        error: "El sexo debe ser Macho o Hembra",
      });
    }

    const categoriaCalculada = calculateCategory({
      sexo,
      fecha_destete: null,
      condicion_reproductiva: sexo === "Hembra" ? null : condicion_reproductiva,
      peso_actual,
      finalidad,
      hasBirths: false,
    });

    const animal = {
      arete: String(arete).trim(),
      nombre: nombre || null,
      sexo,
      fecha_nacimiento: fecha_nacimiento || null,
      categoria:
        categoriaCalculada ||
        categoria ||
        (sexo === "Hembra" ? "Becerra" : "Becerro"),
      raza: raza || null,
      color: color || null,
      senales_particulares: senales_particulares || senales || null,
      id_madre: id_madre || null,
      id_padre: id_padre || null,
      estado: "Activo",
      potrero: potrero || null,
      peso_actual:
        peso_actual !== undefined && peso_actual !== null && peso_actual !== ""
          ? Number(peso_actual)
          : null,
      finalidad: finalidad || null,
      condicion_reproductiva:
        sexo === "Hembra" ? null : condicion_reproductiva || null,
      fecha_destete: null,
    };

    const { data, error } = await supabase
      .from("animals")
      .insert([animal])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      const { error: historyError } = await supabase
        .from("animal_category_history")
        .insert({
          id_animal: data.id,
          categoria: data.categoria,
          fecha_inicio:
            data.fecha_nacimiento || new Date().toISOString().split("T")[0],
          fecha_fin: null,
          motivo: "Registro inicial",
        });

      if (historyError) {
        console.error(
          "Error registrando historial de categoría:",
          historyError,
        );
      }
    }

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("createAnimal:", err);

    return res.status(400).json({
      error: err.message || "Error al registrar animal",
    });
  }
};

// ============================================================
// OBTENER TODOS
// ============================================================

exports.getAnimals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("animals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("getAnimals:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// OBTENER POR ID
// ============================================================

exports.getAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("getAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ACTUALIZAR ANIMAL
// ============================================================

exports.updateAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      arete,
      nombre,
      sexo,
      fecha_nacimiento,
      raza,
      color,
      senales,
      senales_particulares,
      id_madre,
      id_padre,
      potrero,
      peso_actual,
      finalidad,
      condicion_reproductiva,
      estado,
    } = req.body;

    const { data: currentAnimal, error: currentError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError) {
      throw currentError;
    }

    const updateData = {
      arete: arete !== undefined ? String(arete).trim() : currentAnimal.arete,

      nombre: nombre !== undefined ? nombre || null : currentAnimal.nombre,

      sexo: sexo ?? currentAnimal.sexo,

      fecha_nacimiento:
        fecha_nacimiento !== undefined
          ? fecha_nacimiento || null
          : currentAnimal.fecha_nacimiento,

      raza: raza !== undefined ? raza || null : currentAnimal.raza,

      color: color !== undefined ? color || null : currentAnimal.color,

      senales_particulares:
        senales_particulares !== undefined
          ? senales_particulares || null
          : senales !== undefined
            ? senales || null
            : currentAnimal.senales_particulares,

      id_madre:
        id_madre !== undefined ? id_madre || null : currentAnimal.id_madre,

      id_padre:
        id_padre !== undefined ? id_padre || null : currentAnimal.id_padre,

      potrero: potrero !== undefined ? potrero || null : currentAnimal.potrero,

      peso_actual:
        peso_actual !== undefined
          ? peso_actual === "" || peso_actual === null
            ? null
            : Number(peso_actual)
          : currentAnimal.peso_actual,

      finalidad:
        finalidad !== undefined ? finalidad || null : currentAnimal.finalidad,

      condicion_reproductiva:
        condicion_reproductiva !== undefined
          ? condicion_reproductiva || null
          : currentAnimal.condicion_reproductiva,

      estado: estado !== undefined ? estado : currentAnimal.estado,

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("animals")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    /*
     * La categoría no se recibe directamente del frontend.
     * Se deriva de los indicadores productivos.
     */
    await updateAnimalCategory({
      ...currentAnimal,
      ...data,
    });

    const { data: updatedAnimal, error: finalError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (finalError) {
      throw finalError;
    }

    res.json({
      success: true,
      data: updatedAnimal,
    });
  } catch (err) {
    console.error("updateAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ACTUALIZAR EVENTO PRODUCTIVO
// ============================================================

exports.updateLifecycle = async (req, res) => {
  try {
    const { id } = req.params;
    const { evento, fecha_destete, condicion_reproductiva } = req.body;

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (animalError) {
      throw animalError;
    }

    if (animal.estado !== "Activo") {
      return res.status(400).json({
        error: "Solo se pueden actualizar eventos de animales activos",
      });
    }

    // ========================================================
    // DESTETE
    // ========================================================

    if (evento === "destete") {
      if (!fecha_destete) {
        return res.status(400).json({
          error: "La fecha de destete es obligatoria",
        });
      }

      if (animal.categoria !== "Becerro" && animal.categoria !== "Becerra") {
        return res.status(400).json({
          error: "Solo un Becerro o Becerra puede registrar el destete",
        });
      }

      const updateData = {
        fecha_destete,
        updated_at: new Date().toISOString(),
      };

      if (animal.sexo === "Hembra") {
        updateData.condicion_reproductiva = "Vacía";
      }

      const { data: updated, error: updateError } = await supabase
        .from("animals")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      await updateAnimalCategory(updated, {
        motivo: "Destete",
        fechaInicio: fecha_destete,
        hasBirths: false,
      });

      const { data: finalAnimal } = await supabase
        .from("animals")
        .select("*")
        .eq("id", id)
        .single();

      return res.json({
        success: true,
        evento: "destete",
        data: finalAnimal,
      });
    }

    // ========================================================
    // PREÑEZ / CONDICIÓN REPRODUCTIVA
    // ========================================================

    if (evento === "condicion_reproductiva") {
      const validConditions = ["Vacía", "Preñada", "Lactando"];

      if (!validConditions.includes(condicion_reproductiva)) {
        return res.status(400).json({
          error: "Condición reproductiva no válida",
        });
      }

      if (animal.sexo !== "Hembra") {
        return res.status(400).json({
          error: "La condición reproductiva solo aplica a hembras",
        });
      }

      if (
        animal.categoria !== "Mauta" &&
        animal.categoria !== "Novilla" &&
        animal.categoria !== "Vaca"
      ) {
        return res.status(400).json({
          error:
            "El indicador reproductivo solo aplica a Mautas, Novillas y Vacas",
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from("animals")
        .update({
          condicion_reproductiva,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      await updateAnimalCategory(updated, {
        motivo:
          condicion_reproductiva === "Preñada"
            ? "Preñez registrada"
            : "Actualización de condición reproductiva",
        hasBirths: updated.categoria === "Vaca" ? true : null,
      });

      const { data: finalAnimal } = await supabase
        .from("animals")
        .select("*")
        .eq("id", id)
        .single();

      return res.json({
        success: true,
        evento: "condicion_reproductiva",
        data: finalAnimal,
      });
    }

    return res.status(400).json({
      error: "Evento productivo no válido",
    });
  } catch (err) {
    console.error("updateLifecycle:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// CAMBIAR ESTADO
// ============================================================

exports.updateAnimalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fecha_baja, notas } = req.body;

    const estadosValidos = ["Activo", "Vendido", "Muerto", "Desaparecido"];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado no válido",
      });
    }

    if (estado === "Muerto" || estado === "Desaparecido") {
      if (!fecha_baja) {
        return res.status(400).json({
          error: "La fecha de baja es obligatoria",
        });
      }

      const { error: dischargeError } = await supabase
        .from("animal_discharges")
        .insert([
          {
            id_animal: id,
            fecha_baja,
            motivo: estado,
            notas: notas || null,
          },
        ]);

      if (dischargeError) {
        throw dischargeError;
      }
    }

    const { data, error } = await supabase
      .from("animals")
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
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
    console.error("updateAnimalStatus:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ELIMINACIÓN PERMANENTE
// ============================================================

exports.deleteAnimalPermanent = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: animal, error: findError } = await supabase
      .from("animals")
      .select("id, arete, nombre")
      .eq("id", id)
      .single();

    if (findError) {
      throw findError;
    }

    const { error } = await supabase.from("animals").delete().eq("id", id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `Animal ${animal.arete} eliminado permanentemente`,
    });
  } catch (err) {
    console.error("deleteAnimalPermanent:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// SINCRONIZAR CATEGORÍAS
// ============================================================

exports.syncCategories = async (req, res) => {
  try {
    const { data: animals, error } = await supabase
      .from("animals")
      .select("*")
      .eq("estado", "Activo");

    if (error) {
      throw error;
    }

    const actualizados = await syncAnimalsCategories(animals || []);

    return res.json({
      success: true,
      animales_revisados: animals?.length || 0,
      categorias_actualizadas: actualizados,
    });
  } catch (err) {
    console.error("syncCategories:", err);

    return res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// REGISTRAR BAJA
// ============================================================

exports.registerDischarge = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_baja, motivo, notas } = req.body;

    if (!fecha_baja) {
      return res.status(400).json({
        error: "La fecha de baja es obligatoria",
      });
    }

    if (!["Muerto", "Desaparecido"].includes(motivo)) {
      return res.status(400).json({
        error: "Motivo de baja inválido",
      });
    }

    const { data: animal, error: animalError } = await supabase
      .from("animals")
      .select("id, estado")
      .eq("id", id)
      .single();

    if (animalError) {
      throw animalError;
    }

    if (animal.estado !== "Activo") {
      return res.status(400).json({
        error: "Solo se puede dar de baja un animal activo",
      });
    }

    const { data: baja, error: bajaError } = await supabase
      .from("animal_discharges")
      .insert([
        {
          id_animal: id,
          fecha_baja,
          motivo,
          notas: notas || null,
        },
      ])
      .select()
      .single();

    if (bajaError) {
      throw bajaError;
    }

    const nuevoEstado = motivo === "Muerto" ? "Muerto" : "Desaparecido";

    const { data, error: updateError } = await supabase
      .from("animals")
      .update({
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(201).json({
      success: true,
      baja,
      estado: nuevoEstado,
      data,
    });
  } catch (err) {
    console.error("registerDischarge:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// HISTORIAL DE BAJAS
// ============================================================

exports.getAnimalDischarges = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("animal_discharges")
      .select(
        `
        id,
        id_animal,
        fecha_baja,
        motivo,
        notas,
        created_at
      `,
      )
      .eq("id_animal", id)
      .order("fecha_baja", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error("getAnimalDischarges:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
