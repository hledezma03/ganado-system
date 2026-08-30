const supabase = require('../config/database');

exports.recordReproduction = async (req, res) => {
  try {
    const { id_vaca, fecha_celo, fecha_servicio, tipo_servicio, diagnostico_preñez, fecha_parto_estimada } = req.body;

    const { data, error } = await supabase
      .from('reproduction')
      .insert([{
        id_vaca,
        fecha_celo,
        fecha_servicio,
        tipo_servicio,
        diagnostico_preñez,
        fecha_parto_estimada
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.recordBirth = async (req, res) => {
  try {
    const { id_vaca, id_cria, fecha_parto_real, sexo_cria, peso_cria_nacimiento, condicion_parto } = req.body;

    // Calcular días abiertos
    const { data: reproData } = await supabase
      .from('reproduction')
      .select('fecha_parto_real')
      .eq('id_vaca', id_vaca)
      .order('fecha_parto_real', { ascending: false })
      .limit(1)
      .single();

    let iep = null;
    if (reproData?.fecha_parto_real) {
      const fecha1 = new Date(reproData.fecha_parto_real);
      const fecha2 = new Date(fecha_parto_real);
      iep = Math.floor((fecha2 - fecha1) / (1000 * 60 * 60 * 24));
    }

    const { data, error } = await supabase
      .from('reproduction')
      .insert([{
        id_vaca,
        id_cria,
        fecha_parto_real,
        sexo_cria,
        peso_cria_nacimiento,
        condicion_parto,
        iep_dias: iep
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.recordWeaning = async (req, res) => {
  try {
    const { id_cria, fecha_destete, peso_cria_destete } = req.body;

    const { data, error } = await supabase
      .from('reproduction')
      .update({ fecha_destete, peso_cria_destete })
      .eq('id_cria', id_cria)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getReproductionByAnimal = async (req, res) => {
  try {
    const { id_vaca } = req.params;
    const { data, error } = await supabase
      .from('reproduction')
      .select('*')
      .eq('id_vaca', id_vaca)
      .order('fecha_parto_real', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateReproduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('reproduction')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};