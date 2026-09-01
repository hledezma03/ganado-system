const supabase = require("../config/database");

// Crear venta por lote
exports.createSaleBatch = async (req, res) => {
  try {
    const { fecha_venta, comprador, tipo_venta, notas, animales } = req.body;

    if (!fecha_venta) {
      return res.status(400).json({
        error: "La fecha de venta es obligatoria",
      });
    }

    if (!animales || !Array.isArray(animales) || animales.length === 0) {
      return res.status(400).json({
        error: "Debe seleccionar al menos un animal",
      });
    }

    // Crear lote
    const { data: lote, error: loteError } = await supabase
      .from("sales_batches")
      .insert([
        {
          fecha_venta,
          comprador: comprador || null,
          tipo_venta: tipo_venta || "Pie",
          notas: notas || null,
          ingreso_total: 0,
        },
      ])
      .select()
      .single();

    if (loteError) throw loteError;

    let ingresoTotal = 0;
    const ventas = [];

    for (const animalVenta of animales) {
      const { id_animal, peso_venta_kg, precio_kg, rendimiento_canal } =
        animalVenta;

      if (!id_animal) {
        throw new Error("Uno de los animales no tiene ID");
      }

      if (
        peso_venta_kg === undefined ||
        peso_venta_kg === null ||
        peso_venta_kg === ""
      ) {
        throw new Error("Todos los animales deben tener peso de venta");
      }

      if (precio_kg === undefined || precio_kg === null || precio_kg === "") {
        throw new Error("Todos los animales deben tener precio por kg");
      }

      // Obtener información actual del animal
      const { data: animal, error: animalError } = await supabase
        .from("animals")
        .select("id, fecha_nacimiento, peso_nacimiento, peso_actual")
        .eq("id", id_animal)
        .single();

      if (animalError) throw animalError;

      const pesoVenta = Number(peso_venta_kg);
      const precioKg = Number(precio_kg);

      const ingresoTotalAnimal = pesoVenta * precioKg;

      ingresoTotal += ingresoTotalAnimal;

      // Edad al momento de venta
      let edadDias = null;
      let edadMeses = null;
      let edadAnios = null;

      if (animal.fecha_nacimiento) {
        const nacimiento = new Date(animal.fecha_nacimiento);
        const venta = new Date(fecha_venta);

        edadDias = Math.floor((venta - nacimiento) / (1000 * 60 * 60 * 24));

        edadMeses = Math.floor(edadDias / 30.4375);
        edadAnios = Math.floor(edadDias / 365.25);
      }

      // Peso ganado desde nacimiento
      let pesoGanado = null;
      let gananciaDiaria = null;

      if (
        animal.peso_nacimiento !== null &&
        animal.peso_nacimiento !== undefined &&
        edadDias !== null &&
        edadDias > 0
      ) {
        pesoGanado = pesoVenta - Number(animal.peso_nacimiento);

        gananciaDiaria = pesoGanado / edadDias;
      }

      // Crear registro individual de venta
      const { data: venta, error: ventaError } = await supabase
        .from("sales")
        .insert([
          {
            id_animal,
            id_lote: lote.id,
            fecha_venta,
            comprador: comprador || null,
            tipo_venta: tipo_venta || "Pie",
            peso_venta_kg: pesoVenta,
            precio_kg: precioKg,
            rendimiento_canal:
              rendimiento_canal !== undefined && rendimiento_canal !== ""
                ? Number(rendimiento_canal)
                : null,
            ingreso_total: ingresoTotalAnimal,

            edad_al_vender: edadDias,
            dias_en_finca: null,
            peso_ganado: pesoGanado,
            ganancia_diaria: gananciaDiaria,
          },
        ])
        .select()
        .single();

      if (ventaError) throw ventaError;

      ventas.push(venta);

      // Marcar animal como vendido
      const { error: updateAnimalError } = await supabase
        .from("animals")
        .update({
          estado: "Vendido",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id_animal);

      if (updateAnimalError) {
        throw updateAnimalError;
      }
    }

    // Actualizar total del lote
    const { data: loteActualizado, error: updateLoteError } = await supabase
      .from("sales_batches")
      .update({
        ingreso_total: ingresoTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lote.id)
      .select()
      .single();

    if (updateLoteError) throw updateLoteError;

    res.status(201).json({
      success: true,
      lote: loteActualizado,
      ventas,
    });
  } catch (err) {
    console.error("Error creando venta por lote:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// Obtener lotes de ventas
exports.getSaleBatches = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sales_batches")
      .select("*")
      .order("fecha_venta", {
        ascending: false,
      });

    if (error) {
      console.error("Error Supabase obteniendo lotes:", error);
      return res.status(400).json({
        error: error.message,
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Error obteniendo ventas:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};

// Obtener un lote específico
exports.getSaleBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("sales_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error Supabase obteniendo lote:", error);
      return res.status(400).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("Error obteniendo lote:", err);

    res.status(400).json({
      error: err.message,
    });
  }
};
