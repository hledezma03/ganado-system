const supabase = require('../config/database');

exports.getReproductiveReport = async (req, res) => {
  try {
    const { data: vacas, error: vacasError } = await supabase
      .from('animals')
      .select('id, arete, nombre')
      .eq('sexo', 'Hembra')
      .eq('estado', 'Activo');

    if (vacasError) throw vacasError;

    const reportData = [];

    for (let vaca of vacas) {
      const { data: reproData } = await supabase
        .from('reproduction')
        .select('iep_dias, dias_abiertos, fecha_parto_real')
        .eq('id_vaca', vaca.id);

      const totalPartos = reproData?.length || 0;
      const iepPromedio = reproData?.length > 1
        ? (reproData.reduce((sum, r) => sum + (r.iep_dias || 0), 0) / (reproData.length - 1)).toFixed(0)
        : null;

      const ultimoParto = reproData?.[reproData.length - 1]?.fecha_parto_real;
      const diasDesdeUltimoParto = ultimoParto
        ? Math.floor((new Date() - new Date(ultimoParto)) / (1000 * 60 * 60 * 24))
        : null;

      const eficiencia = totalPartos > 0 ? ((totalPartos / ((new Date() - new Date(vaca.created_at)) / (1000 * 60 * 60 * 24 * 365))) * 100).toFixed(0) : 0;

      const alerta = iepPromedio > 450 || diasDesdeUltimoParto > 365;

      reportData.push({
        id: vaca.id,
        arete: vaca.arete,
        nombre: vaca.nombre,
        totalPartos,
        iepPromedio,
        diasDesdeUltimoParto,
        eficiencia: `${eficiencia}%`,
        alerta
      });
    }

    res.json(reportData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDiscardCandidates = async (req, res) => {
  try {
    const { data: vacas } = await supabase
      .from('animals')
      .select('id, arete, nombre, estado')
      .eq('sexo', 'Hembra')
      .eq('estado', 'Activo');

    const descarte = [];

    for (let vaca of vacas) {
      const { data: reproData } = await supabase
        .from('reproduction')
        .select('*')
        .eq('id_vaca', vaca.id);

      const failedServices = reproData?.filter(r => r.diagnostico_preñez === 'Vacía').length || 0;
      const lastBirth = reproData?.[reproData.length - 1]?.fecha_parto_real;
      const daysSinceBirth = lastBirth
        ? Math.floor((new Date() - new Date(lastBirth)) / (1000 * 60 * 60 * 24))
        : 9999;

      const shouldDiscard = failedServices >= 2 || daysSinceBirth > 365;

      if (shouldDiscard) {
        descarte.push({
          arete: vaca.arete,
          nombre: vaca.nombre,
          razon: failedServices >= 2 ? 'Servicios fallidos' : 'Sin preñez en 12 meses',
          detalles: `${failedServices} servicios fallidos, ${daysSinceBirth} días sin parir`
        });
      }
    }

    res.json(descarte);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Gastos
    let expenseQuery = supabase.from('expenses').select('monto');
    if (startDate) expenseQuery = expenseQuery.gte('fecha', startDate);
    if (endDate) expenseQuery = expenseQuery.lte('fecha', endDate);
    const { data: expenseData } = await expenseQuery;
    const totalExpenses = expenseData?.reduce((sum, e) => sum + parseFloat(e.monto), 0) || 0;

    // Ingresos
    let saleQuery = supabase.from('sales').select('ingreso_total');
    if (startDate) saleQuery = saleQuery.gte('fecha_venta', startDate);
    if (endDate) saleQuery = saleQuery.lte('fecha_venta', endDate);
    const { data: saleData } = await saleQuery;
    const totalIncome = saleData?.reduce((sum, s) => sum + parseFloat(s.ingreso_total), 0) || 0;

    const profit = totalIncome - totalExpenses;

    res.json({
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      margin: totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : 0
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAnimalPerformance = async (req, res) => {
  try {
    const { id_animal } = req.params;

    // Datos del animal
    const { data: animal } = await supabase
      .from('animals')
      .select('*')
      .eq('id', id_animal)
      .single();

    // Compra
    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('id_animal', id_animal)
      .single();

    // Pesajes
    const { data: weights } = await supabase
      .from('weights')
      .select('*')
      .eq('id_animal', id_animal)
      .order('fecha_pesaje', { ascending: true });

    // Ventas
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('id_animal', id_animal)
      .single();

    const gdpPromedio = weights && weights.length > 1
      ? (weights.reduce((sum, w) => sum + (parseFloat(w.gdp_diaria) || 0), 0) / weights.length).toFixed(3)
      : null;

    const teoricValue = purchase && animal?.peso_actual
      ? (parseFloat(animal.peso_actual) * 3500).toFixed(2) // Precio ejemplo $/kg
      : null;

    const realValue = sales?.ingreso_total || null;
    const roi = realValue && purchase
      ? (((realValue - purchase.precio_total) / purchase.precio_total) * 100).toFixed(2)
      : null;

    res.json({
      animal,
      purchase,
      weightHistory: weights,
      gdpPromedio,
      teoricValue,
      realValue,
      roi
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};