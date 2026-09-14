const supabase = require("../config/database");

const VALID_CATEGORIES = [
  "Becerro",
  "Becerra",
  "Maute",
  "Mauta",
  "Novilla",
  "Vaca",
  "Toro",
];

const getToday = () => new Date().toISOString().split("T")[0];

const calculateCategory = ({
  sexo,
  fecha_destete,
  condicion_reproductiva,
  peso_actual,
  finalidad,
  hasBirths = false,
}) => {
  if (sexo === "Hembra") {
    // Una hembra con al menos un parto registrado es Vaca
    // permanentemente dentro del ciclo productivo.
    if (hasBirths) {
      return "Vaca";
    }

    // Una Mauta pasa a Novilla cuando queda preñada.
    if (condicion_reproductiva === "Preñada") {
      return "Novilla";
    }

    // Una hembra destetada que todavía no está preñada es Mauta.
    if (fecha_destete) {
      return "Mauta";
    }

    // Antes del destete.
    return "Becerra";
  }

  if (sexo === "Macho") {
    // Antes del destete.
    if (!fecha_destete) {
      return "Becerro";
    }

    // Un maute destinado a reproducción pasa a Toro
    // cuando alcanza 400 kg o más.
    if (Number(peso_actual) >= 400 && finalidad === "Reproducción") {
      return "Toro";
    }

    return "Maute";
  }

  return null;
};

const getBirthMotherIds = async () => {
  const { data, error } = await supabase
    .from("reproduction")
    .select("id_vaca")
    .not("fecha_parto_real", "is", null);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((item) => item.id_vaca));
};

const getAnimalHasBirths = async (animalId) => {
  const { count, error } = await supabase
    .from("reproduction")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("id_vaca", animalId)
    .not("fecha_parto_real", "is", null);

  if (error) {
    throw error;
  }

  return Number(count || 0) > 0;
};

const registerCategoryHistory = async ({
  animalId,
  oldCategory,
  newCategory,
  fechaInicio,
  motivo,
}) => {
  if (!newCategory || oldCategory === newCategory) {
    return;
  }

  const date = fechaInicio || getToday();

  const { error: closeError } = await supabase
    .from("animal_category_history")
    .update({
      fecha_fin: date,
    })
    .eq("id_animal", animalId)
    .is("fecha_fin", null);

  if (closeError) {
    throw closeError;
  }

  const { error: historyError } = await supabase
    .from("animal_category_history")
    .insert({
      id_animal: animalId,
      categoria: newCategory,
      fecha_inicio: date,
      fecha_fin: null,
      motivo: motivo || "Actualización automática",
    });

  if (historyError) {
    throw historyError;
  }
};

const updateAnimalCategory = async (
  animal,
  {
    motivo = "Actualización automática",
    fechaInicio = null,
    hasBirths = null,
  } = {},
) => {
  if (!animal) {
    throw new Error("Animal requerido para actualizar categoría");
  }

  const resolvedHasBirths =
    hasBirths === null ? await getAnimalHasBirths(animal.id) : hasBirths;

  const newCategory = calculateCategory({
    sexo: animal.sexo,
    fecha_destete: animal.fecha_destete,
    condicion_reproductiva: animal.condicion_reproductiva,
    peso_actual: animal.peso_actual,
    finalidad: animal.finalidad,
    hasBirths: resolvedHasBirths,
  });

  if (!newCategory) {
    return animal.categoria;
  }

  if (newCategory === animal.categoria) {
    return newCategory;
  }

  await registerCategoryHistory({
    animalId: animal.id,
    oldCategory: animal.categoria,
    newCategory,
    fechaInicio,
    motivo,
  });

  const { error } = await supabase
    .from("animals")
    .update({
      categoria: newCategory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", animal.id);

  if (error) {
    throw error;
  }

  return newCategory;
};

const syncAnimalsCategories = async (animals) => {
  const birthMotherIds = await getBirthMotherIds();

  let updated = 0;

  for (const animal of animals) {
    const previousCategory = animal.categoria;

    const newCategory = calculateCategory({
      sexo: animal.sexo,
      fecha_destete: animal.fecha_destete,
      condicion_reproductiva: animal.condicion_reproductiva,
      peso_actual: animal.peso_actual,
      finalidad: animal.finalidad,
      hasBirths: birthMotherIds.has(animal.id),
    });

    /*
     * No degradamos automáticamente registros antiguos que
     * todavía no tengan los nuevos indicadores registrados.
     *
     * Sí corregimos:
     * - Hembras con partos registrados -> Vaca
     * - Animales cuyo flujo ya tiene indicadores suficientes
     */
    const canApply =
      birthMotherIds.has(animal.id) ||
      animal.fecha_destete ||
      animal.categoria === "Becerro" ||
      animal.categoria === "Becerra" ||
      animal.categoria === "Mauta" ||
      animal.categoria === "Novilla" ||
      animal.categoria === "Maute" ||
      animal.categoria === "Toro";

    if (!canApply || !newCategory || newCategory === previousCategory) {
      continue;
    }

    await registerCategoryHistory({
      animalId: animal.id,
      oldCategory: previousCategory,
      newCategory,
      motivo: "Sincronización de ciclo productivo",
    });

    const { error } = await supabase
      .from("animals")
      .update({
        categoria: newCategory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", animal.id);

    if (error) {
      throw error;
    }

    updated += 1;
  }

  return updated;
};

module.exports = {
  VALID_CATEGORIES,
  calculateCategory,
  getAnimalHasBirths,
  updateAnimalCategory,
  syncAnimalsCategories,
};
