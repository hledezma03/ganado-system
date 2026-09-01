const supabase = require("../config/database");

// Crear una venta por lote
exports.createSale = async (req, res) => {
  try {
    const {
      fecha_venta,
      comprador,
      tipo_venta,
      precio_kg,
      notas,
      animales,
    } = req.body;

    if (!fecha_venta) {
      return res.status(400).json({
        error: "La fecha de venta es obligatoria",
      });
    }

    if (!tipo_venta) {
      return res.status(400).json({
        error: "El tipo de venta es obligatorio",
      });
    }

    if (!precio_kg || Number(precio_kg) <= 0) {
      return res.status(400).json({
        error: "El precio por kg debe ser mayor a 0",
      });
    }

    if (!Array.isArray(animales) || animales.length === 0) {
      return res.status(400).json({
        error: "Debe seleccionar al menos un animal",
      });
    }

    // Verificar animales
    const animalIds = animales.map(
      (animal) => animal.id_animal
    );

    const { data: existingAnimals, error: animalsError } =
      await supabase
        .from("animals")
        .select("id, arete, estado")
        .in("id", animalIds);

    if (animalsError) throw animalsError;

    if (
      !existingAnimals ||
      existingAnimals.length !== animalIds.length
    ) {
      return res.status(400).json({
        error:
          "Uno o más animales seleccionados no existen",
      });
    }

    const unavailable = existingAnimals.filter(
      (animal) => animal.estado !== "Activo"
    );

    if (unavailable.length > 0) {
      return res.status(400).json({
        error:
          "Solo se pueden vender animales que estén activos",
        animales: unavailable,
      });
    }

    // Calcular detalle de venta
    const saleAnimals = animales.map((animal) => {
      const peso = Number(animal.peso_venta_kg);
      const precio = Number(precio_kg);

      if (!peso || peso <= 0) {
        throw new Error(
          `Peso inválido para el animal ${animal.id_animal}`
        );
      }

      const ingreso = peso * precio;

      return {
        id_animal: animal.id_animal,
        peso_venta_kg: peso,
        rendimiento_canal:
          animal.rendimiento_canal || null,
        precio_kg: precio,
        ingreso_animal: ingreso,
      };
    });

    const ingresoTotal = saleAnimals.reduce(
      (total, animal) =>
        total + Number(animal.ingreso_animal),
      0
    );

    // Crear venta
    const { data: sale, error: saleError } =
      await supabase
        .from("sales")
        .insert([
          {
            fecha_venta,
            comprador,
            tipo_venta,
            precio_kg: Number(precio_kg),
            notas,
            ingreso_total: ingresoTotal,
          },
        ])
        .select()
        .single();

    if (saleError) throw saleError;

    // Asociar animales
    const saleAnimalsWithSaleId =
      saleAnimals.map((animal) => ({
        ...animal,
        id_venta: sale.id,
      }));

    const {
      data: insertedAnimals,
      error: saleAnimalsError,
    } = await supabase
      .from("sale_animals")
      .insert(saleAnimalsWithSaleId)
      .select();

    if (saleAnimalsError) {
      // Intentar revertir la venta
      await supabase
        .from("sales")
        .delete()
        .eq("id", sale.id);

      throw saleAnimalsError;
    }

    // Marcar animales como vendidos
    const { error: updateAnimalsError } =
      await supabase
        .from("animals")
        .update({
          estado: "Vendido",
        })
        .in("id", animalIds);

    if (updateAnimalsError) {
      throw updateAnimalsError;
    }

    res.status(201).json({
      success: true,
      data: {
        venta: sale,
        animales: insertedAnimals,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(400).json({
      error: err.message,
    });
  }
};


// Obtener todas las ventas
exports.getSales = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_animals (
          id,
          id_animal,
          peso_venta_kg,
          rendimiento_canal,
          precio_kg,
          ingreso_animal,
          animals (
            id,
            arete,
            nombre,
            sexo,
            categoria
          )
        )
      `)
      .order("fecha_venta", {
        ascending: false,
      });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);

    res.status(400).json({
      error: err.message,
    });
  }
};


// Obtener una venta
exports.getSale = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_animals (
          *,
          animals (
            id,
            arete,
            nombre,
            sexo,
            categoria,
            peso_actual
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
  }
};