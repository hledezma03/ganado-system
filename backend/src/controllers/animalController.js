const supabase = require("../config/database");

const calculateCategory = ({
  sexo,
  fecha_nacimiento,
  finalidad,
  categoriaActual,
}) => {
  if (!fecha_nacimiento) {
    return categoriaActual || "Becerro";
  }

  const nacimiento = new Date(`${fecha_nacimiento}T00:00:00`);
  const hoy = new Date();

  if (Number.isNaN(nacimiento.getTime())) {
    return categoriaActual || "Becerro";
  }

  let edadMeses =
    (hoy.getFullYear() - nacimiento.getFullYear()) * 12 +
    (hoy.getMonth() - nacimiento.getMonth());

  if (hoy.getDate() < nacimiento.getDate()) {
    edadMeses--;
  }

  edadMeses = Math.max(0, edadMeses);

  if (sexo === "Hembra") {
    if (edadMeses <= 7) {
      return "Becerro";
    }

    return "Novilla";
  }

  if (sexo === "Macho") {
    if (edadMeses <= 7) {
      return "Becerro";
    }

    if (edadMeses <= 24) {
      return "Maute";
    }

    if (finalidad === "Reproducción") {
      return "Toro";
    }

    return "Novillo";
  }

  return categoriaActual || "Becerro";
};

// Crear animal
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

    if (!sexo || !["Macho", "Hembra"].includes(sexo)) {
      return res.status(400).json({
        error: "El sexo debe ser Macho o Hembra",
      });
    }

    const categoriaCalculada = calculateCategory({
      sexo,
      fecha_nacimiento,
      finalidad,
      categoriaActual: categoria,
    });

    const animal = {
      arete: String(arete).trim(),
      nombre: nombre || null,
      sexo,
      fecha_nacimiento: fecha_nacimiento || null,
      categoria: categoriaCalculada,
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
      condicion_reproductiva: condicion_reproductiva || null,
    };

    console.log("Creando animal:", animal);

    const { data, error } = await supabase
      .from("animals")
      .insert([animal])
      .select()
      .single();

    if (error) {
      console.error("Supabase createAnimal:", error);
      throw error;
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

// Obtener todos los animales
exports.getAnimals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("animals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("getAnimals:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// Obtener animal por ID
exports.getAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("getAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// Actualizar animal
exports.updateAnimal = async (req, res) => {
  try {
    const { id } = req.params;

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
      estado,
    } = req.body;

    const { data: currentAnimal, error: currentError } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError) throw currentError;

    const sexoFinal = sexo ?? currentAnimal.sexo;
    const fechaNacimientoFinal =
      fecha_nacimiento ?? currentAnimal.fecha_nacimiento;
    const finalidadFinal = finalidad ?? currentAnimal.finalidad;

    const updateData = {
      arete: arete !== undefined ? String(arete).trim() : currentAnimal.arete,

      nombre: nombre !== undefined ? nombre || null : currentAnimal.nombre,

      sexo: sexoFinal,

      fecha_nacimiento:
        fecha_nacimiento !== undefined
          ? fecha_nacimiento || null
          : currentAnimal.fecha_nacimiento,

      categoria: calculateCategory({
        sexo: sexoFinal,
        fecha_nacimiento: fechaNacimientoFinal,
        finalidad: finalidadFinal,
        categoriaActual: categoria ?? currentAnimal.categoria,
      }),

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

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("updateAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// Eliminación lógica
exports.deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("animals")
      .update({
        estado: "Desaparecido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("deleteAnimal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
