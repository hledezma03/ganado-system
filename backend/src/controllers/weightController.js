const supabase = require('../config/database');

exports.recordWeight = async (req, res) => {
  try {
    const { id_animal, fecha_pesaje, peso_kg } = req.body;

    // Obtener peso anterior
    const { data: lastWeight } = await supabase
      .from('weights')
      .select('peso_kg, fecha_pesaje')
      .eq('id_animal', id_animal)
      .order('fecha_pesaje', { ascending: false })
      .limit(1)
      .single();

    let gdp = null;
    let diasTranscurridos = null;
    let pesoAnterior = null;

    if (lastWeight) {
      const fecha1 = new Date(lastWeight.fecha_pesaje);
      const fecha2 = new Date(fecha_pesaje);
      diasTranscurridos = Math.floor((fecha2 - fecha1) / (1000 * 60 * 60 * 24));
      pesoAnterior = lastWeight.peso_kg;
      
      if (diasTranscurridos > 0) {
        gdp = ((peso_kg - pesoAnterior) / diasTranscurridos).toFixed(3);
      }
    }

    const { data, error } = await supabase
      .from('weights')
      .insert([{
        id_animal,
        fecha_pesaje,
        peso_kg,
        gdp_diaria: gdp,
        peso_anterior: pesoAnterior,
        dias_transcurridos: diasTranscurridos
      }])
      .select();

    if (error) throw error;
    
    // Actualizar peso_actual en tabla animals
    await supabase
      .from('animals')
      .update({ peso_actual: peso_kg })
      .eq('id', id_animal);

    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getWeightHistory = async (req, res) => {
  try {
    const { id_animal } = req.params;
    const { data, error } = await supabase
      .from('weights')
      .select('*')
      .eq('id_animal', id_animal)
      .order('fecha_pesaje', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};