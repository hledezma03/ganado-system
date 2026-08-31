const supabase = require('../config/database');
const {
  calculateAnimalCategory
} = require('../utils/animalCategory');

const ALLOWED_UPDATE_FIELDS = [
  'arete',
  'nombre',
  'sexo',
  'fecha_nacimiento',
  'raza',
  'color',
  'senales_particulares',
  'id_madre',
  'id_padre',
  'potrero',
  'finalidad',
  'condicion_reproductiva'
];

const VALID_STATUSES = [
  'Activo',
  'Vendido',
  'Muerto',
  'Desaparecido'
];

function normalizeNullable(value) {
  return value === '' || value === undefined
    ? null
    : value;
}

function buildAnimalPayload(body) {
  const payload = {};

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = normalizeNullable(body[field]);
    }
  }

  return payload;
}

async function getAnimalCalvingStatus(animalId) {
  const { data, error } = await supabase
    .from('reproduction')
    .select('id, fecha_parto_real, condicion_parto')
    .eq('id_vaca', animalId)
    .not('fecha_parto_real', 'is', null)
    .limit(1);

  if (error) throw error;

  return Array.isArray(data) && data.length > 0;
}

async function syncAnimalCategory(animal) {
  const hasCalving = await getAnimalCalvingStatus(animal.id);

  const calculatedCategory = calculateAnimalCategory({
    sexo: animal.sexo,
    fecha_nacimiento: animal.fecha_nacimiento,
    finalidad: animal.finalidad,
    condicion_reproductiva: animal.condicion_reproductiva,
    hasCalving
  });

  /*
   * Si todavía no podemos calcular una categoría,
   * conservamos la existente.
   */
  if (!calculatedCategory) {
    return animal;
  }

  if (calculatedCategory === animal.categoria) {
    return animal;
  }

  /*
   * Cerramos la categoría anterior.
   */
  const { error: closeHistoryError } = await supabase
    .from('animal_category_history')
    .update({
      fecha_fin: new Date().toISOString().slice(0, 10)
    })
    .eq('id_animal', animal.id)
    .is('fecha_fin', null);

  if (closeHistoryError) {
    throw closeHistoryError;
  }

  /*
   * Guardamos la nueva categoría.
   */
  const { error: historyError } = await supabase
    .from('animal_category_history')
    .insert([
      {
        id_animal: animal.id,
        categoria: calculatedCategory,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        motivo: 'Actualización automática'
      }
    ]);

  if (historyError) {
    throw historyError;
  }

  /*
   * Actualizamos el estado actual.
   */
  const { data, error } = await supabase
    .from('animals')
    .update({
      categoria: calculatedCategory,
      updated_at: new Date().toISOString()
    })
    .eq('id', animal.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// Crear animal
// ============================================================

exports.createAnimal = async (req, res) => {
  try {
    const {
      arete,
      nombre,
      sexo,
      fecha_nacimiento,
      raza,
      color,
      senales,
      id_madre,
      id_padre,
      potrero,
      finalidad,
      condicion_reproductiva
    } = req.body;

    if (!arete || !sexo) {
      return res.status(400).json({
        error: 'Arete y sexo son obligatorios'
      });
    }

    /*
     * Creamos primero el animal.
     * La categoría se determina después.
     */
    const initialCategory =
      sexo === 'Macho'
        ? 'Becerro'
        : 'Becerra';

    const { data, error } = await supabase
      .from('animals')
      .insert([
        {
          arete: arete.trim(),
          nombre: normalizeNullable(nombre),
          sexo,
          fecha_nacimiento: normalizeNullable(fecha_nacimiento),
          categoria: initialCategory,
          raza: normalizeNullable(raza),
          color: normalizeNullable(color),
          senales_particulares: normalizeNullable(senales),
          id_madre: normalizeNullable(id_madre),
          id_padre: normalizeNullable(id_padre),
          potrero: normalizeNullable(potrero),
          finalidad: normalizeNullable(finalidad),
          condicion_reproductiva:
            sexo === 'Macho'
              ? normalizeNullable(condicion_reproductiva)
              : null,
          estado: 'Activo'
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'El arete ya está registrado'
        });
      }

      throw error;
    }

    /*
     * Calculamos la categoría real después de crear
     * el animal.
     */
    const syncedAnimal = await syncAnimalCategory(data);

    res.status(201).json({
      success: true,
      data: syncedAnimal
    });
  } catch (err) {
    console.error('createAnimal:', err);

    res.status(400).json({
      error: err.message
    });
  }
};


// ============================================================
// Obtener todos
// ============================================================

exports.getAnimals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    /*
     * Sincronizamos categorías antes de responder.
     *
     * Esto permite que un becerro pueda convertirse
     * automáticamente en maute/novilla/etc. con el tiempo.
     */
    const syncedAnimals = [];

    for (const animal of data) {
      const synced = await syncAnimalCategory(animal);
      syncedAnimals.push(synced);
    }

    res.json(syncedAnimals);
  } catch (err) {
    console.error('getAnimals:', err);

    res.status(400).json({
      error: err.message
    });
  }
};


// ============================================================
// Obtener uno
// ============================================================

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

    const syncedAnimal = await syncAnimalCategory(data);

    res.json(syncedAnimal);
  } catch (err) {
    console.error('getAnimal:', err);

    res.status(404).json({
      error: err.message
    });
  }
};


// ============================================================
// Actualizar animal
// ============================================================

exports.updateAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const payload = buildAnimalPayload(req.body);

    if (payload.sexo === 'Hembra') {
      payload.condicion_reproductiva = null;
    }

    /*
     * La categoría NO se recibe desde el frontend.
     * El backend la calcula.
     */
    delete payload.categoria;
    delete payload.peso_actual;
    delete payload.estado;

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('animals')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'El arete ya está registrado'
        });
      }

      throw error;
    }

    const syncedAnimal = await syncAnimalCategory(data);

    res.json(syncedAnimal);
  } catch (err) {
    console.error('updateAnimal:', err);

    res.status(400).json({
      error: err.message
    });
  }
};


// ============================================================
// Dar de baja
// ============================================================

exports.deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params;

    const estado = req.body?.estado;

    if (!VALID_STATUSES.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Debe ser uno de: ${VALID_STATUSES.join(', ')}`
      });
    }

    const { data, error } = await supabase
      .from('animals')
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('deleteAnimal:', err);

    res.status(400).json({
      error: err.message
    });
  }
};