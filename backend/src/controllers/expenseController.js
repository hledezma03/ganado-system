const supabase = require('../config/database');

exports.createExpense = async (req, res) => {
  try {
    const { fecha, categoria, concepto, monto, notas } = req.body;

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        fecha,
        categoria,
        concepto,
        monto: parseFloat(monto),
        notas
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, categoria } = req.query;
    let query = supabase.from('expenses').select('*');

    if (startDate) query = query.gte('fecha', startDate);
    if (endDate) query = query.lte('fecha', endDate);
    if (categoria) query = query.eq('categoria', categoria);

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = supabase
      .from('expenses')
      .select('categoria, monto');

    if (startDate) query = query.gte('fecha', startDate);
    if (endDate) query = query.lte('fecha', endDate);

    const { data, error } = await query;

    if (error) throw error;

    const summary = data.reduce((acc, item) => {
      const cat = item.categoria;
      acc[cat] = (acc[cat] || 0) + parseFloat(item.monto);
      return acc;
    }, {});

    res.json(summary);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('expenses')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};