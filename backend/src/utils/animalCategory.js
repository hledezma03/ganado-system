const MS_PER_DAY = 1000 * 60 * 60 * 24;

const CATEGORY_RULES = {
  WEANING_MONTHS: 8,
  MALE_ADULT_MONTHS: 24
};

function calculateAgeInMonths(birthDate, referenceDate = new Date()) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T00:00:00`);
  const reference = new Date(referenceDate);

  if (Number.isNaN(birth.getTime())) return null;

  const diffDays = Math.floor(
    (reference - birth) / MS_PER_DAY
  );

  if (diffDays < 0) return 0;

  return diffDays / 30.4375;
}

function calculateAnimalCategory({
  sexo,
  fecha_nacimiento,
  finalidad,
  condicion_reproductiva,
  hasCalving
}) {
  const ageMonths = calculateAgeInMonths(fecha_nacimiento);

  /*
   * Si no conocemos la fecha de nacimiento,
   * no podemos hacer una clasificación automática
   * basada en edad.
   */
  if (ageMonths === null) {
    if (sexo === 'Hembra' && hasCalving) {
      return 'Vaca';
    }

    if (
      sexo === 'Macho' &&
      finalidad === 'Reproducción' &&
      condicion_reproductiva === 'Entero'
    ) {
      return 'Toro';
    }

    return null;
  }

  /*
   * Hasta el destete.
   */
  if (ageMonths < CATEGORY_RULES.WEANING_MONTHS) {
    return sexo === 'Macho'
      ? 'Becerro'
      : 'Becerra';
  }

  /*
   * HEMBRAS
   */
  if (sexo === 'Hembra') {
    if (hasCalving) {
      return 'Vaca';
    }

    return 'Novilla';
  }

  /*
   * MACHOS
   */

  if (
    finalidad === 'Reproducción' &&
    condicion_reproductiva === 'Entero'
  ) {
    return 'Toro';
  }

  if (ageMonths < CATEGORY_RULES.MALE_ADULT_MONTHS) {
    return 'Maute';
  }

  return 'Novillo';
}

module.exports = {
  calculateAnimalCategory,
  calculateAgeInMonths,
  CATEGORY_RULES
};