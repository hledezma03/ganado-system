const supabase = require('../config/database');

exports.createPurchase = async (req, res) => {
  try {
    const { id_animal, fecha_compra, proveedor, peso_recepcion, precio_unitario, precio_total, costo_flete } = req.body;

    const costo_kg = precio_total / peso_recepcion;

    const { data, error } = await supabase
      .from('purchases')
      .insert([{
        id_animal,
        fecha_compra,
        proveedor,
        peso_recepcion,
        precio_unitario,
        precio_total,
        costo_flete: costo_flete || 0,
        costo_kg_comprado: parseFloat(costo_kg.toFixed(2))
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, animals(arete, nombre)')
      .order('fecha_compra', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPurchaseByAnimal = async (req, res) => {
  try {
    const { id_animal } = req.params;
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id_animal', id_animal)
      .single();

    if (error) throw error;
    res.json(data || {});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('purchases')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};