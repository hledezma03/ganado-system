const supabase = require("../config/database");

const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : defaultValue;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

// ============================================================
// CREAR COMPRA INDIVIDUAL
// Mantiene compatibilidad con registros antiguos.
// ============================================================

exports.createPurchase = async (req, res) => {
  try {
    const {
      id_animal,
      fecha_compra,
      proveedor,
      peso_recepcion,
      precio_unitario,
      precio_total,
      costo_flete,
    } = req.body;

    if (!id_animal) {
      return res.status(400).json({
        error: "El animal es obligatorio",
      });
    }

    if (!fecha_compra) {
      return res.status(400).json({
        error: "La fecha de compra es obligatoria",
      });
    }

    const peso = toNumber(peso_recepcion);
    const precioUnitario = toNumber(precio_unitario);
    const precioTotal = toNumber(precio_total);
    const flete = toNumber(costo_flete);

    if (peso <= 0) {
      return res.status(400).json({
        error: "El peso de recepción debe ser mayor que 0",
      });
    }

    if (precioTotal <= 0) {
      return res.status(400).json({
        error: "El precio total debe ser mayor que 0",
      });
    }

    const costoAdquisicion = precioTotal + flete;

    const costoKg = costoAdquisicion / peso;

    const { data, error } = await supabase
      .from("purchases")
      .insert([
        {
          id_animal,
          fecha_compra,
          proveedor: proveedor || null,
          peso_recepcion: peso,
          precio_unitario: precioUnitario,
          precio_total: precioTotal,
          costo_flete: flete,
          flete_asignado: flete,
          costo_adquisicion: round(costoAdquisicion),
          costo_kg_comprado: round(costoKg),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error creando compra:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// CREAR COMPRA POR LOTE
// ============================================================

exports.createPurchaseBatch = async (req, res) => {
  try {
    const { fecha_compra, proveedor, flete_total, notas, animales } = req.body;

    if (!fecha_compra) {
      return res.status(400).json({
        error: "La fecha de compra es obligatoria",
      });
    }

    if (!Array.isArray(animales) || animales.length === 0) {
      return res.status(400).json({
        error: "Debes seleccionar al menos un animal",
      });
    }

    const fleteTotal = toNumber(flete_total);

    if (fleteTotal < 0) {
      return res.status(400).json({
        error: "El flete no puede ser negativo",
      });
    }

    // Evitar animales repetidos
    const ids = animales.map((animal) => animal.id_animal);

    const idsUnicos = new Set(ids);

    if (idsUnicos.size !== ids.length) {
      return res.status(400).json({
        error: "No puedes registrar el mismo animal dos veces en una compra",
      });
    }

    // ========================================================
    // OBTENER ANIMALES
    // ========================================================

    const { data: animalsData, error: animalsError } = await supabase
      .from("animals")
      .select("id, arete, nombre, estado")
      .in("id", ids);

    if (animalsError) {
      throw animalsError;
    }

    if (!animalsData || animalsData.length !== ids.length) {
      return res.status(400).json({
        error: "Uno o más animales seleccionados no existen",
      });
    }

    // Un animal ya comprado no debe recibir otra compra inicial.
    const { data: existingPurchases, error: existingError } = await supabase
      .from("purchases")
      .select("id_animal")
      .in("id_animal", ids);

    if (existingError) {
      throw existingError;
    }

    if (existingPurchases && existingPurchases.length > 0) {
      const duplicatedIds = new Set(
        existingPurchases.map((purchase) => purchase.id_animal),
      );

      const duplicatedAnimals = animalsData
        .filter((animal) => duplicatedIds.has(animal.id))
        .map((animal) => animal.arete || animal.id);

      return res.status(400).json({
        error: `Los siguientes animales ya tienen una compra registrada: ${duplicatedAnimals.join(
          ", ",
        )}`,
      });
    }

    // ========================================================
    // VALIDAR DETALLES
    // ========================================================

    const details = [];

    for (const animal of animales) {
      const peso = toNumber(animal.peso_recepcion);
      const precioTotal = toNumber(animal.precio_total);

      if (peso <= 0) {
        return res.status(400).json({
          error: `El peso de recepción de ${animal.arete || animal.id} debe ser mayor que 0`,
        });
      }

      if (precioTotal <= 0) {
        return res.status(400).json({
          error: `El precio de compra de ${animal.arete || animal.id} debe ser mayor que 0`,
        });
      }

      details.push({
        id_animal: animal.id_animal,
        peso_recepcion: peso,
        precio_unitario: toNumber(animal.precio_unitario, precioTotal / peso),
        precio_total: precioTotal,
      });
    }

    // ========================================================
    // DISTRIBUIR FLETE
    // ========================================================

    const cantidadAnimales = details.length;

    const fleteBase = cantidadAnimales > 0 ? fleteTotal / cantidadAnimales : 0;

    const subtotalAnimales = details.reduce(
      (sum, detail) => sum + detail.precio_total,
      0,
    );

    const detallesFinales = details.map((detail, index) => {
      // Para evitar diferencias por redondeo, el último animal
      // absorbe los centavos restantes.
      let fleteAsignado = round(fleteBase);

      if (index === details.length - 1) {
        const fleteAnterior = details
          .slice(0, -1)
          .reduce(
            (sum, item, itemIndex) =>
              sum + round(item.precio_total >= 0 ? fleteBase : 0),
            0,
          );

        fleteAsignado = round(fleteTotal - fleteAnterior);
      }

      const costoAdquisicion = detail.precio_total + fleteAsignado;

      const costoKgComprado =
        detail.peso_recepcion > 0
          ? costoAdquisicion / detail.peso_recepcion
          : 0;

      return {
        ...detail,
        flete_asignado: round(fleteAsignado),
        costo_adquisicion: round(costoAdquisicion),
        costo_kg_comprado: round(costoKgComprado),
      };
    });

    // Corregir exactamente cualquier diferencia de redondeo.
    const fleteDistribuido = detallesFinales.reduce(
      (sum, detail) => sum + detail.flete_asignado,
      0,
    );

    const diferenciaFlete = round(fleteTotal - fleteDistribuido);

    if (diferenciaFlete !== 0 && detallesFinales.length > 0) {
      const ultimo = detallesFinales[detallesFinales.length - 1];

      ultimo.flete_asignado = round(ultimo.flete_asignado + diferenciaFlete);

      ultimo.costo_adquisicion = round(
        ultimo.precio_total + ultimo.flete_asignado,
      );

      ultimo.costo_kg_comprado = round(
        ultimo.costo_adquisicion / ultimo.peso_recepcion,
      );
    }

    const inversionTotal = round(subtotalAnimales + fleteTotal);

    // ========================================================
    // CREAR LOTE
    // ========================================================

    const { data: lote, error: loteError } = await supabase
      .from("purchase_batches")
      .insert([
        {
          fecha_compra,
          proveedor: proveedor?.trim() || null,
          flete_total: round(fleteTotal),
          subtotal_animales: round(subtotalAnimales),
          inversion_total: inversionTotal,
          notas: notas?.trim() || null,
        },
      ])
      .select()
      .single();

    if (loteError) {
      throw loteError;
    }

    // ========================================================
    // CREAR DETALLES
    // ========================================================

    const purchasesToInsert = detallesFinales.map((detail) => ({
      id_animal: detail.id_animal,
      id_lote: lote.id,
      fecha_compra,
      proveedor: proveedor?.trim() || null,
      peso_recepcion: detail.peso_recepcion,
      precio_unitario: detail.precio_unitario,
      precio_total: detail.precio_total,
      costo_flete: detail.flete_asignado,
      flete_asignado: detail.flete_asignado,
      costo_adquisicion: detail.costo_adquisicion,
      costo_kg_comprado: detail.costo_kg_comprado,
    }));

    const { data: purchases, error: purchasesError } = await supabase
      .from("purchases")
      .insert(purchasesToInsert)
      .select(
        `
        *,
        animals (
          id,
          arete,
          nombre,
          sexo,
          categoria
        )
        `,
      );

    if (purchasesError) {
      // Intentar limpiar el lote si los detalles fallan.
      await supabase.from("purchase_batches").delete().eq("id", lote.id);

      throw purchasesError;
    }

    res.status(201).json({
      success: true,
      lote: {
        ...lote,
        purchases,
      },
    });
  } catch (err) {
    console.error("Error creando compra por lote:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// HISTORIAL DE LOTES
// ============================================================

exports.getPurchaseBatches = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("purchase_batches")
      .select(
        `
        *,
        purchases (
          id,
          id_animal,
          fecha_compra,
          proveedor,
          peso_recepcion,
          precio_unitario,
          precio_total,
          costo_flete,
          flete_asignado,
          costo_adquisicion,
          costo_kg_comprado,
          animals (
            id,
            arete,
            nombre,
            sexo,
            categoria
          )
        )
        `,
      )
      .order("fecha_compra", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("Error obteniendo lotes de compras:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// DETALLE DE LOTE
// ============================================================

exports.getPurchaseBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("purchase_batches")
      .select(
        `
        *,
        purchases (
          id,
          id_animal,
          fecha_compra,
          proveedor,
          peso_recepcion,
          precio_unitario,
          precio_total,
          costo_flete,
          flete_asignado,
          costo_adquisicion,
          costo_kg_comprado,
          animals (
            id,
            arete,
            nombre,
            sexo,
            categoria
          )
        )
        `,
      )
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error obteniendo detalle de compra:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// HISTORIAL INDIVIDUAL / COMPATIBILIDAD
// ============================================================

exports.getPurchases = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase.from("purchases").select(
      `
        *,
        animals (
          id,
          arete,
          nombre,
          sexo,
          categoria
        )
        `,
    );

    if (startDate) {
      query = query.gte("fecha_compra", startDate);
    }

    if (endDate) {
      query = query.lte("fecha_compra", endDate);
    }

    const { data, error } = await query.order("fecha_compra", {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("Error obteniendo compras:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// COMPRA DE UN ANIMAL
// ============================================================

exports.getPurchaseByAnimal = async (req, res) => {
  try {
    const { id_animal } = req.params;

    const { data, error } = await supabase
      .from("purchases")
      .select(
        `
        *,
        purchase_batches (
          id,
          fecha_compra,
          proveedor,
          flete_total,
          subtotal_animales,
          inversion_total
        )
        `,
      )
      .eq("id_animal", id_animal)
      .order("fecha_compra", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.json(data || null);
  } catch (err) {
    console.error("Error obteniendo compra del animal:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ACTUALIZAR COMPRA INDIVIDUAL
// ============================================================

exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fecha_compra,
      proveedor,
      peso_recepcion,
      precio_unitario,
      precio_total,
      costo_flete,
    } = req.body;

    const peso = toNumber(peso_recepcion);
    const precioUnitario = toNumber(precio_unitario);
    const precioTotal = toNumber(precio_total);
    const flete = toNumber(costo_flete);

    if (peso <= 0) {
      return res.status(400).json({
        error: "El peso debe ser mayor que 0",
      });
    }

    if (precioTotal <= 0) {
      return res.status(400).json({
        error: "El precio total debe ser mayor que 0",
      });
    }

    const costoAdquisicion = precioTotal + flete;

    const { data, error } = await supabase
      .from("purchases")
      .update({
        fecha_compra,
        proveedor: proveedor || null,
        peso_recepcion: peso,
        precio_unitario: precioUnitario,
        precio_total: precioTotal,
        costo_flete: flete,
        flete_asignado: flete,
        costo_adquisicion: round(costoAdquisicion),
        costo_kg_comprado: round(costoAdquisicion / peso),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("Error actualizando compra:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// ELIMINAR COMPRA INDIVIDUAL
// ============================================================

exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: purchase, error: findError } = await supabase
      .from("purchases")
      .select("id_lote")
      .eq("id", id)
      .single();

    if (findError) {
      throw findError;
    }

    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (error) {
      throw error;
    }

    // Si pertenece a un lote, recalcular sus totales.
    if (purchase?.id_lote) {
      await recalculateBatch(purchase.id_lote);
    }

    res.json({
      success: true,
    });
  } catch (err) {
    console.error("Error eliminando compra:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// ============================================================
// RECALCULAR LOTE
// ============================================================

const recalculateBatch = async (batchId) => {
  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("precio_total, flete_asignado")
    .eq("id_lote", batchId);

  if (error) {
    throw error;
  }

  const subtotal = (purchases || []).reduce(
    (sum, item) => sum + toNumber(item.precio_total),
    0,
  );

  const flete = (purchases || []).reduce(
    (sum, item) => sum + toNumber(item.flete_asignado),
    0,
  );

  await supabase
    .from("purchase_batches")
    .update({
      subtotal_animales: round(subtotal),
      flete_total: round(flete),
      inversion_total: round(subtotal + flete),
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);
};
