const supabase = require("../config/database");

const SALE_SELECT = `
  id,
  fecha_venta,
  comprador,
  tipo_venta,
  precio_kg,
  notas,
  ingreso_total,
  created_at,
  updated_at,
  edad_dias,
  edad_meses,
  peso_nacimiento,
  peso_ganado,
  ganancia_diaria,
  ganancia_semanal,
  ganancia_mensual,
  id_lote,
  edad_al_vender,
  dias_en_finca,
  sale_animals (
    id,
    id_venta,
    id_animal,
    peso_venta_kg,
    rendimiento_canal,
    precio_kg,
    ingreso_animal,
    created_at,
    animals (
      id,
      arete,
      nombre,
      sexo,
      categoria,
      estado,
      fecha_nacimiento,
      peso_nacimiento,
      peso_actual,
      finalidad,
      condicion_reproductiva
    )
  )
`;

const BATCH_SELECT = `
  id,
  fecha_venta,
  comprador,
  tipo_venta,
  notas,
  ingreso_total,
  created_at,
  updated_at,
  sales (
    ${SALE_SELECT}
  )
`;

// ============================================================
// HELPERS
// ============================================================

function normalizeRpcError(error) {
  if (!error) return "Error desconocido";

  return (
    error.message || error.details || error.hint || "Error procesando la venta"
  );
}

function normalizeBatch(batch) {
  const sales = Array.isArray(batch?.sales) ? batch.sales : [];

  const saleAnimals = sales.flatMap((sale) =>
    Array.isArray(sale.sale_animals) ? sale.sale_animals : [],
  );

  const totalPesoVenta = saleAnimals.reduce(
    (total, item) => total + Number(item.peso_venta_kg || 0),
    0,
  );

  return {
    ...batch,
    sales,
    animales: saleAnimals,
    animales_count: saleAnimals.length,
    peso_total_venta: Number(totalPesoVenta.toFixed(2)),
  };
}

// ============================================================
// CREAR VENTA POR LOTE
// ============================================================

exports.createSaleBatch = async (req, res) => {
  try {
    const { fecha_venta, comprador, tipo_venta, notas, animales } = req.body;

    if (!fecha_venta) {
      return res.status(400).json({
        error: "La fecha de venta es obligatoria",
      });
    }

    if (!Array.isArray(animales) || animales.length === 0) {
      return res.status(400).json({
        error: "Debe seleccionar al menos un animal",
      });
    }

    const ids = animales.map((animal) => animal?.id_animal);

    if (ids.some((id) => !id)) {
      return res.status(400).json({
        error: "Todos los animales deben tener un ID válido",
      });
    }

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({
        error: "No puede seleccionar el mismo animal dos veces",
      });
    }

    const tipoVenta = tipo_venta || "Pie";

    if (!["Pie", "Canal"].includes(tipoVenta)) {
      return res.status(400).json({
        error: "El tipo de venta debe ser Pie o Canal",
      });
    }

    const payload = {
      fecha_venta,
      comprador: comprador || null,
      tipo_venta: tipoVenta,
      notas: notas || null,
      animales: animales.map((animal) => ({
        id_animal: animal.id_animal,
        peso_venta_kg: Number(animal.peso_venta_kg),
        precio_kg: Number(animal.precio_kg),
        rendimiento_canal:
          animal.rendimiento_canal === "" ||
          animal.rendimiento_canal === null ||
          animal.rendimiento_canal === undefined
            ? null
            : Number(animal.rendimiento_canal),
      })),
    };

    for (const animal of payload.animales) {
      if (!Number.isFinite(animal.peso_venta_kg) || animal.peso_venta_kg <= 0) {
        return res.status(400).json({
          error: `Peso de venta inválido para el animal ${animal.id_animal}`,
        });
      }

      if (!Number.isFinite(animal.precio_kg) || animal.precio_kg <= 0) {
        return res.status(400).json({
          error: `Precio por kg inválido para el animal ${animal.id_animal}`,
        });
      }

      if (
        animal.rendimiento_canal !== null &&
        (!Number.isFinite(animal.rendimiento_canal) ||
          animal.rendimiento_canal < 0 ||
          animal.rendimiento_canal > 100)
      ) {
        return res.status(400).json({
          error: `Rendimiento de canal inválido para el animal ${animal.id_animal}`,
        });
      }

      if (tipoVenta === "Canal" && animal.rendimiento_canal === null) {
        return res.status(400).json({
          error:
            `Debe indicar el rendimiento de canal para el animal ` +
            `${animal.id_animal}`,
        });
      }
    }

    // ========================================================
    // LA TRANSACCION REAL OCURRE EN POSTGRES
    // ========================================================

    const { data, error } = await supabase.rpc("create_sale_batch", {
      p_payload: payload,
    });

    if (error) {
      console.error("RPC create_sale_batch:", error);

      return res.status(400).json({
        error: normalizeRpcError(error),
      });
    }

    const batchId = data?.id_lote;

    if (!batchId) {
      return res.status(500).json({
        error: "La venta se registró pero no se recibió el ID del lote",
      });
    }

    // Obtener inmediatamente el lote completo.
    const { data: batch, error: batchError } = await supabase
      .from("sales_batches")
      .select(BATCH_SELECT)
      .eq("id", batchId)
      .single();

    if (batchError) {
      console.error("Error obteniendo venta recién creada:", batchError);

      return res.status(201).json({
        success: true,
        data,
        warning:
          "La venta fue registrada, pero no se pudo cargar el detalle inmediatamente.",
      });
    }

    return res.status(201).json({
      success: true,
      data: normalizeBatch(batch),
    });
  } catch (err) {
    console.error("Error creando venta por lote:", err);

    return res.status(400).json({
      error: err.message || "Error registrando la venta",
    });
  }
};

// ============================================================
// OBTENER TODOS LOS LOTES
// ============================================================

exports.getSaleBatches = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sales_batches")
      .select(BATCH_SELECT)
      .order("fecha_venta", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Error obteniendo lotes:", error);

      return res.status(400).json({
        error: error.message,
      });
    }

    const batches = (data || []).map(normalizeBatch);

    return res.json(batches);
  } catch (err) {
    console.error("Error obteniendo historial de ventas:", err);

    return res.status(400).json({
      error: err.message || "Error obteniendo historial",
    });
  }
};

// ============================================================
// OBTENER UN LOTE
// ============================================================

exports.getSaleBatch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "ID de lote requerido",
      });
    }

    const { data, error } = await supabase
      .from("sales_batches")
      .select(BATCH_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error obteniendo lote:", error);

      return res.status(404).json({
        error: "Venta no encontrada",
      });
    }

    return res.json(normalizeBatch(data));
  } catch (err) {
    console.error("Error obteniendo detalle de venta:", err);

    return res.status(400).json({
      error: err.message || "Error obteniendo detalle",
    });
  }
};

// ============================================================
// RESUMEN DE VENTAS
// ============================================================

exports.getSalesSummary = async (req, res) => {
  try {
    const { count: lotes, error: lotesError } = await supabase
      .from("sales_batches")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (lotesError) {
      throw lotesError;
    }

    const { data: batches, error: batchesError } = await supabase
      .from("sales_batches")
      .select("ingreso_total");

    if (batchesError) {
      throw batchesError;
    }

    const { count: animalesVendidos, error: animalesError } = await supabase
      .from("sale_animals")
      .select("id", {
        count: "exact",
        head: true,
      });

    if (animalesError) {
      throw animalesError;
    }

    const ingresoTotal = (batches || []).reduce(
      (total, batch) => total + Number(batch.ingreso_total || 0),
      0,
    );

    const ticketPromedio = lotes > 0 ? ingresoTotal / lotes : 0;

    return res.json({
      lotes: lotes || 0,
      animales_vendidos: animalesVendidos || 0,
      ingreso_total: Number(ingresoTotal.toFixed(2)),
      ticket_promedio: Number(ticketPromedio.toFixed(2)),
    });
  } catch (err) {
    console.error("Error obteniendo resumen de ventas:", err);

    return res.status(400).json({
      error: err.message || "Error obteniendo resumen de ventas",
    });
  }
};
