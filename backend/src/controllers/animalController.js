const supabase = require('../config/database');

/**
 * Calcula la categoría actual del animal.
 *
 * Importante:
 * La categoría NO debe depender del valor enviado
 * por el frontend. Se calcula en el backend.
 */
const calculateCategory = ({
  sexo,
  fecha_nacimiento,
  finalidad,
  categoriaActual
}) => {
  // Si no tenemos fecha de nacimiento, conservamos
  // la categoría enviada como respaldo.
  if (!fecha_nacimiento) {
    return categoriaActual || 'Becerro';
  }

  const nacimiento = new Date(`${fecha_nacimiento}T00:00:00`);
  const hoy = new Date();

  if (Number.isNaN(nacimiento.getTime())) {
    return categoriaActual || 'Becerro';
  }

  let edadMeses =
    (hoy.getFullYear() - nacimiento.getFullYear()) * 12 +
    (hoy.getMonth() - nacimiento.getMonth());

  if (hoy.getDate() < nacimiento.getDate()) {
    edadMeses -= 1;
  }

  edadMeses = Math.max(0, edadMeses);

  /*
   * Hembras
   *
   * 0 - 7 meses      -> Becerro
   * 8 - 24 meses     -> Novilla
   * > 24 meses       -> Novilla hasta registrar primer parto
   * Vaca             -> se determina posteriormente mediante reproducción
   */
  if (sexo === 'Hembra') {
    if (edadMeses <= 7) {
      return 'Becerro';
    }

    return 'Novilla';
  }

  /*
   * Machos
   *
   * 0 - 7 meses      -> Becerro
   * 8 - 24 meses     -> Maute
   * > 24 meses       -> depende de finalidad
   */
  if (sexo === 'Macho') {
    if (edadMeses <= 7) {
      return 'Becerro';
    }

    if (edadMeses <= 24) {
      return 'Maute';
    }

    if (finalidad === 'Reproducción') {
      return 'Toro';
    }

    return 'Novillo';
  }

  return categoriaActual || 'Becerro';
};

/**
 * Crear animal
 */
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
      condicion_reproductiva
    } = req.body;

    // Validaciones básicas
    if (!arete || !String(arete).trim()) {
      return res.status(400).json({
        error: 'El arete es obligatorio'
      });
    }

    if (!sexo || !['Macho', 'Hembra'].includes(sexo)) {
      return res.status(400).json({
        error: 'El sexo debe ser Macho o Hembra'
      });
    }

    // Calculamos la categoría en el backend.
    const categoriaCalculada = calculateCategory({
      sexo,
      fecha_nacimiento,
      finalidad,
      categoriaActual: categoria
    });

    const { data, error } = await supabase
      .from('animals')
      .insert([
        {
          arete: String(arete).trim(),
          nombre: nombre || null,
          sexo,
          fecha_nacimiento: fecha_nacimiento || null,

          // Nunca dependemos exclusivamente del frontend.
          categoria: categoriaCalculada,

          raza: raza || null,
          color: color || null,

          senales_particulares:
            senales_particulares || senales || null,

          id_madre: id_madre || null,
          id_padre: id_padre || null,

          estado: 'Activo',
          potrero: potrero || null,

          peso_actual:
            peso_actual !== undefined &&
            peso_actual !== null &&
            peso_actual !== ''
              ? Number(peso_actual)
              : null,

          finalidad: finalidad || null,
          condicion_reproductiva: condicion_reproductiva || null
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    /*
     * Registrar la categoría inicial en el historial.
     *
     * Si esta operación falla, NO hacemos fallar la creación
     * del animal. El animal ya fue creado correctamente.
     */
    const { error: historyError } = await supabase
      .from('animal_category_history')
      .insert([
        {
          id_animal: data.id,
          categoria: categoriaCalculada,
          fecha_inicio: fecha_nacimiento || new Date().toISOString().split('T')[0],
          fecha_fin: null,
          motivo: 'Registro inicial'
        }
      ]);

    if (historyError) {
      console.error(
        'Error registrando historial de categoría:',
        historyError
      );
    }

    return res.status(201).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('createAnimal:', err);

    return res.status(400).json({
      error: err.message || 'Error al registrar animal'
    });
  }
};


/**
 * Obtener todos los animales
 */
exports.getAnimals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json(data);
  } catch (err) {
    console.error('getAnimals:', err);

    return res.status(400).json({
      error: err.message
    });
  }
};


/**
 * Obtener animal por ID
 */
exports.getAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return res.json(data);
  } catch (err) {
    console.error('getAnimal:', err);

    return res.status(400).json({
      error: err.message
    });
  }
};


/**
 * Actualizar animal
 */
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
      estado
    } = req.body;

    const updateData = {};

    if (arete !== undefined) {
      updateData.arete = String(arete).trim();
    }

    if (nombre !== undefined) {
      updateData.nombre = nombre || null;
    }

    if (sexo !== undefined) {
      updateData.sexo = sexo;
    }

    if (fecha_nacimiento !== undefined) {
      updateData.fecha_nacimiento = fecha_nacimiento || null;
    }

    if (raza !== undefined) {
      updateData.raza = raza || null;
    }

    if (color !== undefined) {
      updateData.color = color || null;
    }

    if (senales !== undefined || senales_particulares !== undefined) {
      updateData.senales_particulares =
        senales_particulares || senales || null;
    }

    if (id_madre !== undefined) {
      updateData.id_madre = id_madre || null;
    }

    if (id_padre !== undefined) {
      updateData.id_padre = id_padre || null;
    }

    if (potrero !== undefined) {
      updateData.potrero = potrero || null;
    }

    if (peso_actual !== undefined) {
      updateData.peso_actual =
        peso_actual === '' || peso_actual === null
          ? null
          : Number(peso_actual);
    }

    if (finalidad !== undefined) {
      updateData.finalidad = finalidad || null;
    }

    if (condicion_reproductiva !== undefined) {
      updateData.condicion_reproductiva =
        condicion_reproductiva || null;
    }

    if (estado !== undefined) {
      updateData.estado = estado;
    }

    /*
     * Si cambiaron datos que afectan la categoría,
     * la recalculamos.
     */
    if (
      sexo !== undefined ||
      fecha_nacimiento !== undefined ||
      finalidad !== undefined ||
      categoria !== undefined
    ) {
      const currentAnimal = await supabase
        .from('animals')
        .select('sexo, fecha_nacimiento, finalidad, categoria')
        .eq('id', id)
        .single();

      if (currentAnimal.error) {
        throw currentAnimal.error;
      }

      const animalActual = currentAnimal.data;

      const nuevoSexo = sexo ?? animalActual.sexo;
      const nuevaFechaNacimiento =
        fecha_nacimiento ?? animalActual.fecha_nacimiento;
      const nuevaFinalidad =
        finalidad ?? animalActual.finalidad;
      const categoriaAnterior =
        categoria ?? animalActual.categoria;

      updateData.categoria = calculateCategory({
        sexo: nuevoSexo,
        fecha_nacimiento: nuevaFechaNacimiento,
        finalidad: nuevaFinalidad,
        categoriaActual: categoriaAnterior
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('animals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('updateAnimal:', err);

    return res.status(400).json({
      error: err.message
    });
  }
};


/**
 * Eliminar animal.
 *
 * NO borramos físicamente el registro.
 * Lo marcamos como Desaparecido para conservar
 * historial contable, reproductivo y genealógico.
 */
exports.deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('animals')
      .update({
        estado: 'Desaparecido',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('deleteAnimal:', err);

    return res.status(400).json({
      error: err.message
    });
  }
};