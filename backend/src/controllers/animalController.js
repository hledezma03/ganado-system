const supabase = require('../config/database');

// Crear animal
exports.createAnimal = async (req, res) => {
  try {
    const { arete, nombre, sexo, fecha_nacimiento, categoria, raza, color, senales, id_madre, id_padre, potrero } = req.body;

    const { data, error } = await supabase
      .from('animals')
      .insert([{
        arete,
        nombre,
        sexo,
        fecha_nacimiento,
        categoria,
        raza,
        color,
        senales_particulares: senales,
        id_madre,
        id_padre,
        potrero,
        estado: 'Activo'
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtener todos los animales
exports.getAnimals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtener animal por ID
exports.getAnimal = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Actualizar animal
exports.updateAnimal = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('animals')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Eliminar animal (soft delete - cambiar estado)
exports.deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('animals')
      .update({ estado: 'Desaparecido' })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};