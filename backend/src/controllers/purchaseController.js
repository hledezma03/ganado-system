const supabase = require("../config/database");

const parseNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const validatePurchaseData = ({
  id_animal,
  fecha_compra,
  peso_recepcion,
  precio_unitario,
  precio_total,
  costo_flete,
}) => {
  if (!id_animal) {
    return "El animal es obligatorio";
  }

  if (!fecha_compra) {
    return "La fecha de compra es obligatoria";
  }

  const date = new Date(`${fecha_compra}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "La fecha de compra no es válida";
  }

  const peso = parseNumber(peso_recepcion);
  const precioUnitario = parseNumber(precio_unitario);
  const precioTotal = parseNumber(precio_total);
  const flete =
    costo_flete === undefined || costo_flete === null || costo_flete === ""
      ? 0
      : parseNumber(costo_flete);

  if (peso === null || peso <= 0) {
    return "El peso de recepción debe ser mayor que cero";
  }

  if (precioUnitario === null || precioUnitario <= 0) {
    return "El precio por kg debe ser mayor que cero";
  }

  if (precioTotal === null || precioTotal <= 0) {
    return "El precio total debe ser mayor que cero";
  }

  if (flete === null || flete < 0) {
    return "El costo de flete no puede ser negativo";
  }

  return null;
};

const getAnimal = async (id_animal) => {
  const { data, error } = await supabase
    .from("animals")
    .select("id, arete, nombre, estado, peso_actual")
    .eq("id", id_animal)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const getLatestWeightOnOrBeforeDate = async (id_animal, fecha_compra) => {
  const { data, error } = await supabase
    .from("weights")
    .select("id, peso_kg, fecha_pesaje")
    .eq("id_animal", id_animal)
    .lte("fecha_pesaje", fecha_compra)
    .order("fecha_pesaje", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] || null;
};

const updateAnimalWeightIfAppropriate = async ({
  id_animal,
  peso_recepcion,
  fecha_compra,
}) => {
  const latestWeight = await getLatestWeightOnOrBeforeDate(
    id_animal,
    fecha_compra,
  );

  /*
   * La compra representa el peso confirmado al momento
   * de entrada del animal.
   *
   * Si existe un pesaje posterior, no lo reemplazamos.
   */
  const { data: futureWeights, error } = await supabase
    .from("weights")
    .select("id, peso_kg, fecha_pesaje")
    .eq("id_animal", id_animal)
    .gt("fecha_pesaje", fecha_compra)
    .order("fecha_pesaje", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw error;
  }

  if (futureWeights?.length > 0) {
    return;
  }

  const pesoActual = latestWeight?.peso_kg ?? peso_recepcion;

  const { error: updateError } = await supabase
    .from("animals")
    .update({
      peso_actual: pesoActual,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id_animal);

  if (updateError) {
    throw updateError;
  }
};

// ============================================================
// CREAR COMPRA
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

    const validationError = validatePurchaseData({
      id_animal,
      fecha_compra,
      peso_recepcion,
      precio_unitario,
      precio_total,
      costo_flete,
    });

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const animal = await getAnimal(id_animal);

    if (!animal) {
      return res.status(404).json({
        error: "El animal no existe",
      });
    }

    if (animal.estado && animal.estado !== "Activo") {
      return res.status(400).json({
        error: "Solo se puede registrar la compra de un animal activo",
      });
    }

    /*
     * El diseño actual de purchases representa la adquisición
     * inicial de un animal. Por eso evitamos registrar dos
     * compras para el mismo animal.
     */
    const { data: existingPurchase, error: existingError } = await supabase
      .from("purchases")
      .select("id")
      .eq("id_animal", id_animal)
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    if (existingPurchase?.length > 0) {
      return res.status(400).json({
        error: "Este animal ya tiene una compra registrada",
      });
    }

    const peso = parseNumber(peso_recepcion);
    const precioUnitario = parseNumber(precio_unitario);
    const precioTotal = parseNumber(precio_total);
    const flete =
      costo_flete === undefined || costo_flete === null || costo_flete === ""
        ? 0
        : parseNumber(costo_flete);

    const costoKgComprado = precioTotal / peso;

    const { data, error } = await supabase
      .from("purchases")
      .insert([
        {
          id_animal,
          fecha_compra,
          proveedor: proveedor?.trim() || null,
          peso_recepcion: peso,
          precio_unitario: precioUnitario,
          precio_total: precioTotal,
          costo_flete: flete,
          costo_kg_comprado: Number(costoKgComprado.toFixed(2)),
        },
      ])
      .select(
        `
        *,
        animals (
          id,
          arete,
          nombre,
          estado
        )
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    /*
     * El peso de recepción es un peso real confirmado.
     * Lo usamos como peso actual cuando no existe un pesaje
     * posterior que deba prevalecer.
     */
    await updateAnimalWeightIfAppropriate({
      id_animal,
      peso_recepcion: peso,
      fecha_compra,
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error creando compra:", err);

    res.status(400).json({
      error: err?.message || "Error registrando la compra",
    });
  }
};

// ============================================================
// OBTENER TODAS LAS COMPRAS
// ============================================================

exports.getPurchases = async (req, res) => {
  try {
    const { startDate, endDate, id_animal, proveedor } = req.query;

    let query = supabase.from("purchases").select(
      `
        *,
        animals (
          id,
          arete,
          nombre,
          sexo,
          categoria,
          estado
        )
        `,
    );

    if (startDate) {
      query = query.gte("fecha_compra", startDate);
    }

    if (endDate) {
      query = query.lte("fecha_compra", endDate);
    }

    if (id_animal) {
      query = query.eq("id_animal", id_animal);
    }

    if (proveedor) {
      query = query.ilike("proveedor", `%${proveedor}%`);
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
      error: err?.message || "Error obteniendo compras",
    });
  }
};

// ============================================================
// OBTENER COMPRA DE UN ANIMAL
// ============================================================

exports.getPurchaseByAnimal = async (req, res) => {
  try {
    const { id_animal } = req.params;

    const { data, error } = await supabase
      .from("purchases")
      .select(
        `
        *,
        animals (
          id,
          arete,
          nombre,
          sexo,
          categoria,
          estado
        )
        `,
      )
      .eq("id_animal", id_animal)
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.json(data || null);
  } catch (err) {
    console.error("Error obteniendo compra del animal:", err);

    res.status(400).json({
      error: err?.message || "Error obteniendo compra",
    });
  }
};

// ============================================================
// ACTUALIZAR COMPRA
// ============================================================

exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      id_animal,
      fecha_compra,
      proveedor,
      peso_recepcion,
      precio_unitario,
      precio_total,
      costo_flete,
    } = req.body;

    const validationError = validatePurchaseData({
      id_animal,
      fecha_compra,
      peso_recepcion,
      precio_unitario,
      precio_total,
      costo_flete,
    });

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const { data: currentPurchase, error: currentError } = await supabase
      .from("purchases")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError) {
      throw currentError;
    }

    const animal = await getAnimal(id_animal);

    if (!animal) {
      return res.status(404).json({
        error: "El animal no existe",
      });
    }

    if (animal.estado && animal.estado !== "Activo") {
      return res.status(400).json({
        error: "Solo se puede asociar una compra a un animal activo",
      });
    }

    /*
     * Si se cambia de animal, verificamos que el nuevo animal
     * no tenga otra compra.
     */
    if (id_animal !== currentPurchase.id_animal) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("purchases")
        .select("id")
        .eq("id_animal", id_animal)
        .neq("id", id)
        .limit(1);

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicate?.length > 0) {
        return res.status(400).json({
          error: "El nuevo animal ya tiene una compra registrada",
        });
      }
    }

    const peso = parseNumber(peso_recepcion);
    const precioUnitario = parseNumber(precio_unitario);
    const precioTotal = parseNumber(precio_total);
    const flete =
      costo_flete === undefined || costo_flete === null || costo_flete === ""
        ? 0
        : parseNumber(costo_flete);

    const costoKgComprado = precioTotal / peso;

    const { data, error } = await supabase
      .from("purchases")
      .update({
        id_animal,
        fecha_compra,
        proveedor: proveedor?.trim() || null,
        peso_recepcion: peso,
        precio_unitario: precioUnitario,
        precio_total: precioTotal,
        costo_flete: flete,
        costo_kg_comprado: Number(costoKgComprado.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        animals (
          id,
          arete,
          nombre,
          sexo,
          categoria,
          estado
        )
        `,
      )
      .single();

    if (error) {
      throw error;
    }

    await updateAnimalWeightIfAppropriate({
      id_animal,
      peso_recepcion: peso,
      fecha_compra,
    });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error actualizando compra:", err);

    res.status(400).json({
      error: err?.message || "Error actualizando compra",
    });
  }
};

// ============================================================
// ELIMINAR COMPRA
// ============================================================

exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: purchase, error: findError } = await supabase
      .from("purchases")
      .select("id, id_animal, peso_recepcion, fecha_compra")
      .eq("id", id)
      .single();

    if (findError) {
      throw findError;
    }

    const { error } = await supabase.from("purchases").delete().eq("id", id);

    if (error) {
      throw error;
    }

    /*
     * No modificamos peso_actual al borrar una compra.
     * El peso del animal pertenece al historial de pesos y no
     * debe desaparecer automáticamente por eliminar un registro
     * financiero.
     */

    res.json({
      success: true,
      data: purchase,
    });
  } catch (err) {
    console.error("Error eliminando compra:", err);

    res.status(400).json({
      error: err?.message || "Error eliminando compra",
    });
  }
};
