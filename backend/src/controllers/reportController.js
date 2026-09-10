const supabase = require("../config/database");

// ============================================================
// UTILIDADES
// ============================================================

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;

  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const getDatePart = (value) => {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 10);
};

const getYear = (value) => {
  const date = getDatePart(value);

  return date ? Number(date.slice(0, 4)) : null;
};

const getMonth = (value) => {
  const date = getDatePart(value);

  return date ? Number(date.slice(5, 7)) : null;
};

const emptyMetrics = () => ({
  sales: 0,
  expenses: 0,
  purchases: 0,
  operatingResult: 0,
  cashFlow: 0,
  operatingMargin: 0,
  saleCount: 0,
  expenseCount: 0,
  purchaseCount: 0,
});

const addSale = (metrics, amount) => {
  metrics.sales += toNumber(amount);
  metrics.saleCount += 1;
};

const addExpense = (metrics, amount) => {
  metrics.expenses += toNumber(amount);
  metrics.expenseCount += 1;
};

const addPurchase = (metrics, amount) => {
  metrics.purchases += toNumber(amount);
  metrics.purchaseCount += 1;
};

const finalizeMetrics = (metrics) => {
  const operatingResult = metrics.sales - metrics.expenses;

  const cashFlow = operatingResult - metrics.purchases;

  return {
    sales: round(metrics.sales),

    expenses: round(metrics.expenses),

    purchases: round(metrics.purchases),

    operatingResult: round(operatingResult),

    cashFlow: round(cashFlow),

    operatingMargin:
      metrics.sales > 0 ? round((operatingResult / metrics.sales) * 100) : 0,

    saleCount: metrics.saleCount,

    expenseCount: metrics.expenseCount,

    purchaseCount: metrics.purchaseCount,
  };
};

const percentageChange = (current, previous) => {
  const currentNumber = toNumber(current);

  const previousNumber = toNumber(previous);

  if (previousNumber === 0) {
    return currentNumber === 0 ? 0 : 100;
  }

  return round(
    ((currentNumber - previousNumber) / Math.abs(previousNumber)) * 100,
    1,
  );
};

const createMonthlyMap = () => {
  const map = {};

  for (let month = 1; month <= 12; month += 1) {
    map[month] = emptyMetrics();
  }

  return map;
};

const summarizeTransactions = ({ sales, expenses, purchases, year }) => {
  const monthly = createMonthlyMap();

  const summary = emptyMetrics();

  // ----------------------------------------------------------
  // VENTAS
  // ----------------------------------------------------------

  (sales || []).forEach((sale) => {
    if (getYear(sale.fecha_venta) !== year) {
      return;
    }

    const month = getMonth(sale.fecha_venta);

    if (!month) {
      return;
    }

    addSale(monthly[month], sale.ingreso_total);

    addSale(summary, sale.ingreso_total);
  });

  // ----------------------------------------------------------
  // GASTOS
  // ----------------------------------------------------------

  (expenses || []).forEach((expense) => {
    if (getYear(expense.fecha) !== year) {
      return;
    }

    const month = getMonth(expense.fecha);

    if (!month) {
      return;
    }

    addExpense(monthly[month], expense.monto);

    addExpense(summary, expense.monto);
  });

  // ----------------------------------------------------------
  // COMPRAS / INVERSION
  // ----------------------------------------------------------

  (purchases || []).forEach((purchase) => {
    if (getYear(purchase.fecha_compra) !== year) {
      return;
    }

    const month = getMonth(purchase.fecha_compra);

    if (!month) {
      return;
    }

    const investment =
      purchase.costo_adquisicion !== null &&
      purchase.costo_adquisicion !== undefined
        ? toNumber(purchase.costo_adquisicion)
        : toNumber(purchase.precio_total) +
          toNumber(purchase.flete_asignado ?? purchase.costo_flete);

    addPurchase(monthly[month], investment);

    addPurchase(summary, investment);
  });

  // ----------------------------------------------------------
  // DATOS MENSUALES
  // ----------------------------------------------------------

  const monthlyData = Object.entries(monthly).map(([month, metrics]) => {
    const date = new Date(2000, Number(month) - 1, 1);

    return {
      month: Number(month),

      label: date.toLocaleDateString("es-ES", {
        month: "long",
      }),

      shortLabel: date
        .toLocaleDateString("es-ES", {
          month: "short",
        })
        .replace(".", ""),

      ...finalizeMetrics(metrics),
    };
  });

  return {
    summary: finalizeMetrics(summary),

    monthly: monthlyData,
  };
};

// ============================================================
// REPORTE FINANCIERO PRINCIPAL
// ============================================================

exports.getFinancialReport = async (req, res) => {
  try {
    const currentDate = new Date();

    const requestedYear = Number(req.query.year);

    const requestedMonth = Number(req.query.month);

    const year =
      Number.isInteger(requestedYear) && requestedYear >= 2000
        ? requestedYear
        : currentDate.getFullYear();

    const month =
      Number.isInteger(requestedMonth) &&
      requestedMonth >= 1 &&
      requestedMonth <= 12
        ? requestedMonth
        : currentDate.getMonth() + 1;

    const [
      { data: sales, error: salesError },
      { data: expenses, error: expensesError },
      { data: purchases, error: purchasesError },
    ] = await Promise.all([
      supabase
        .from("sales")
        .select("id, fecha_venta, ingreso_total")
        .order("fecha_venta", {
          ascending: true,
        }),

      supabase
        .from("expenses")
        .select("id, fecha, categoria, monto")
        .order("fecha", {
          ascending: true,
        }),

      supabase
        .from("purchases")
        .select(
          "id, id_lote, fecha_compra, precio_total, costo_flete, flete_asignado, costo_adquisicion",
        )
        .order("fecha_compra", {
          ascending: true,
        }),
    ]);

    if (salesError) {
      throw salesError;
    }

    if (expensesError) {
      throw expensesError;
    }

    if (purchasesError) {
      throw purchasesError;
    }

    // --------------------------------------------------------
    // AÑO ACTUAL
    // --------------------------------------------------------

    const currentYearReport = summarizeTransactions({
      sales,
      expenses,
      purchases,
      year,
    });

    // --------------------------------------------------------
    // AÑO ANTERIOR
    // --------------------------------------------------------

    const previousYearReport = summarizeTransactions({
      sales,
      expenses,
      purchases,
      year: year - 1,
    });

    // --------------------------------------------------------
    // HISTORIAL DE AÑOS
    // --------------------------------------------------------

    const allYears = new Set();

    [...(sales || []), ...(expenses || []), ...(purchases || [])].forEach(
      (item) => {
        const value = item.fecha_venta || item.fecha || item.fecha_compra;

        const itemYear = getYear(value);

        if (itemYear) {
          allYears.add(itemYear);
        }
      },
    );

    allYears.add(year);
    allYears.add(year - 1);

    const history = Array.from(allYears)
      .sort((a, b) => a - b)
      .map((historyYear) => {
        const report = summarizeTransactions({
          sales,
          expenses,
          purchases,
          year: historyYear,
        });

        return {
          year: historyYear,
          ...report.summary,
        };
      });

    // --------------------------------------------------------
    // MES SELECCIONADO
    // --------------------------------------------------------

    const selectedMonthData =
      currentYearReport.monthly.find((item) => item.month === month) ||
      finalizeMetrics(emptyMetrics());

    // --------------------------------------------------------
    // MES ANTERIOR
    // --------------------------------------------------------

    const previousMonthDate = new Date(year, month - 2, 1);

    const previousMonthYear = previousMonthDate.getFullYear();

    const previousMonthNumber = previousMonthDate.getMonth() + 1;

    const previousMonthReport = summarizeTransactions({
      sales,
      expenses,
      purchases,
      year: previousMonthYear,
    });

    const previousMonthData =
      previousMonthReport.monthly.find(
        (item) => item.month === previousMonthNumber,
      ) || finalizeMetrics(emptyMetrics());

    // --------------------------------------------------------
    // COMPARACION ANUAL
    // --------------------------------------------------------

    const previousYearSummary = previousYearReport.summary;

    const currentYearSummary = currentYearReport.summary;

    const annualComparison = {
      previousYear: year - 1,

      currentYear: year,

      previousSummary: previousYearSummary,

      currentSummary: currentYearSummary,

      salesChange: percentageChange(
        currentYearSummary.sales,
        previousYearSummary.sales,
      ),

      expensesChange: percentageChange(
        currentYearSummary.expenses,
        previousYearSummary.expenses,
      ),

      purchasesChange: percentageChange(
        currentYearSummary.purchases,
        previousYearSummary.purchases,
      ),

      operatingResultChange: percentageChange(
        currentYearSummary.operatingResult,
        previousYearSummary.operatingResult,
      ),

      cashFlowChange: percentageChange(
        currentYearSummary.cashFlow,
        previousYearSummary.cashFlow,
      ),
    };

    // --------------------------------------------------------
    // MESES PRODUCTIVOS
    // --------------------------------------------------------

    const productiveMonths = currentYearReport.monthly
      .filter((item) => item.sales > 0)
      .sort((a, b) => b.operatingResult - a.operatingResult)
      .map((item) => ({
        month: item.month,

        label: item.label,

        sales: item.sales,

        expenses: item.expenses,

        purchases: item.purchases,

        operatingResult: item.operatingResult,

        cashFlow: item.cashFlow,
      }));

    // --------------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------------

    res.json({
      year,

      month,

      yearData: {
        selected: year,

        summary: currentYearSummary,

        monthly: currentYearReport.monthly,
      },

      monthData: {
        selected: month,

        year,

        label: selectedMonthData.label,

        ...selectedMonthData,
      },

      previousMonth: {
        month: previousMonthNumber,

        year: previousMonthYear,

        label: previousMonthData.label,

        ...previousMonthData,
      },

      annualComparison,

      productiveMonths,

      history,

      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error generando reporte financiero:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// REPORTES REPRODUCTIVOS
// ============================================================

exports.getReproductiveReport = async (req, res) => {
  try {
    const { data: vacas, error: vacasError } = await supabase
      .from("animals")
      .select("id, arete, nombre, created_at")
      .eq("sexo", "Hembra")
      .eq("estado", "Activo");

    if (vacasError) {
      throw vacasError;
    }

    const reportData = [];

    for (const vaca of vacas || []) {
      const { data: reproData, error: reproError } = await supabase
        .from("reproduction")
        .select("iep_dias, dias_abiertos, fecha_parto_real")
        .eq("id_vaca", vaca.id)
        .order("fecha_parto_real", {
          ascending: true,
        });

      if (reproError) {
        throw reproError;
      }

      const totalPartos = reproData?.length || 0;

      const iepValues = (reproData || [])
        .slice(1)
        .map((item) => toNumber(item.iep_dias))
        .filter((value) => value > 0);

      const iepPromedio =
        iepValues.length > 0
          ? round(
              iepValues.reduce((sum, value) => sum + value, 0) /
                iepValues.length,
              0,
            )
          : null;

      const ultimoParto =
        reproData?.[reproData.length - 1]?.fecha_parto_real || null;

      const diasDesdeUltimoParto = ultimoParto
        ? Math.floor(
            (new Date() - new Date(ultimoParto)) / (1000 * 60 * 60 * 24),
          )
        : null;

      const createdAt = vaca.created_at
        ? new Date(vaca.created_at)
        : new Date();

      const yearsActive = Math.max(
        (new Date() - createdAt) / (1000 * 60 * 60 * 24 * 365),
        0.01,
      );

      const eficiencia =
        totalPartos > 0 ? ((totalPartos / yearsActive) * 100).toFixed(0) : "0";

      const alerta =
        (iepPromedio !== null && iepPromedio > 450) ||
        (diasDesdeUltimoParto !== null && diasDesdeUltimoParto > 365);

      reportData.push({
        id: vaca.id,
        arete: vaca.arete,
        nombre: vaca.nombre,
        totalPartos,
        iepPromedio,
        diasDesdeUltimoParto,
        eficiencia: `${eficiencia}%`,
        alerta,
      });
    }

    res.json(reportData);
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// CANDIDATOS A DESCARTE
// ============================================================

exports.getDiscardCandidates = async (req, res) => {
  try {
    const { data: vacas, error: vacasError } = await supabase
      .from("animals")
      .select("id, arete, nombre, estado")
      .eq("sexo", "Hembra")
      .eq("estado", "Activo");

    if (vacasError) {
      throw vacasError;
    }

    const descarte = [];

    for (const vaca of vacas || []) {
      const { data: reproData, error: reproError } = await supabase
        .from("reproduction")
        .select("*")
        .eq("id_vaca", vaca.id);

      if (reproError) {
        throw reproError;
      }

      const failedServices =
        reproData?.filter((item) => item.diagnostico_preñez === "Vacía")
          .length || 0;

      const lastBirth = reproData?.[reproData.length - 1]?.fecha_parto_real;

      const daysSinceBirth = lastBirth
        ? Math.floor((new Date() - new Date(lastBirth)) / (1000 * 60 * 60 * 24))
        : 9999;

      const shouldDiscard = failedServices >= 2 || daysSinceBirth > 365;

      if (shouldDiscard) {
        descarte.push({
          arete: vaca.arete,

          nombre: vaca.nombre,

          razon:
            failedServices >= 2
              ? "Servicios fallidos"
              : "Sin preñez en 12 meses",

          detalles: `${failedServices} servicios fallidos, ${daysSinceBirth} días sin parir`,
        });
      }
    }

    res.json(descarte);
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// COMPATIBILIDAD CON REPORTE FINANCIERO ANTERIOR
// ============================================================

exports.getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let expenseQuery = supabase.from("expenses").select("monto");

    let saleQuery = supabase.from("sales").select("ingreso_total");

    if (startDate) {
      expenseQuery = expenseQuery.gte("fecha", startDate);

      saleQuery = saleQuery.gte("fecha_venta", startDate);
    }

    if (endDate) {
      expenseQuery = expenseQuery.lte("fecha", endDate);

      saleQuery = saleQuery.lte("fecha_venta", endDate);
    }

    const [
      { data: expenseData, error: expenseError },
      { data: saleData, error: saleError },
    ] = await Promise.all([expenseQuery, saleQuery]);

    if (expenseError) {
      throw expenseError;
    }

    if (saleError) {
      throw saleError;
    }

    const totalExpenses =
      expenseData?.reduce((sum, item) => sum + toNumber(item.monto), 0) || 0;

    const totalIncome =
      saleData?.reduce((sum, item) => sum + toNumber(item.ingreso_total), 0) ||
      0;

    const profit = totalIncome - totalExpenses;

    res.json({
      totalExpenses: round(totalExpenses),

      totalIncome: round(totalIncome),

      profit: round(profit),

      margin:
        totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : "0.00",
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// RENDIMIENTO INDIVIDUAL
// ============================================================

exports.getAnimalPerformance = async (req, res) => {
  try {
    const { id_animal } = req.params;

    const { data: animal } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id_animal)
      .single();

    const { data: purchase } = await supabase
      .from("purchases")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_compra", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const { data: weights } = await supabase
      .from("weights")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_pesaje", {
        ascending: true,
      });

    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .eq("id_animal", id_animal)
      .order("fecha_venta", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const gdpPromedio =
      weights && weights.length > 1
        ? (
            weights.reduce((sum, item) => sum + toNumber(item.gdp_diaria), 0) /
            weights.length
          ).toFixed(3)
        : null;

    const investment = purchase
      ? toNumber(
          purchase.costo_adquisicion ??
            toNumber(purchase.precio_total) +
              toNumber(purchase.flete_asignado ?? purchase.costo_flete),
        )
      : null;

    const realValue = sales?.ingreso_total || null;

    const roi =
      realValue && investment
        ? (((toNumber(realValue) - investment) / investment) * 100).toFixed(2)
        : null;

    res.json({
      animal,

      purchase,

      weightHistory: weights,

      gdpPromedio,

      realValue,

      roi,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
};
