/**
 * validation.js
 * -------------
 * All input validation lives here, separated from the UI (app.js) and the
 * calculation engine (faraidh.js). Every function returns
 * { valid: boolean, errors: string[] } so the caller can display every
 * problem at once instead of stopping at the first one.
 */

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}

/** Validate the "Data Pewaris & Harta" step. */
function validateEstateInput(estate) {
  const errors = [];

  if (estate.deceasedGender !== 'male' && estate.deceasedGender !== 'female') {
    errors.push('Jenis kelamin pewaris harus dipilih (laki-laki atau perempuan).');
  }

  if (!isPositiveNumber(estate.totalAssets) || estate.totalAssets <= 0) {
    errors.push('Total harta peninggalan harus berupa angka lebih besar dari 0.');
  }

  const deductionFields = [
    ['funeralCost', 'Biaya pengurusan jenazah'],
    ['debt', 'Utang pewaris'],
    ['bequest', 'Wasiat'],
    ['otherDeduction', 'Pengurang lainnya']
  ];

  let totalDeduction = 0;
  for (const [key, label] of deductionFields) {
    const v = estate[key] || 0;
    if (!isPositiveNumber(v)) {
      errors.push(`${label} harus berupa angka dan tidak boleh negatif.`);
    } else {
      totalDeduction += v;
    }
  }

  if (isPositiveNumber(estate.totalAssets) && isPositiveNumber(estate.bequest)) {
    const maxBequest = estate.totalAssets / 3;
    if (estate.bequest > maxBequest + 0.01) {
      errors.push(
        `Wasiat melebihi batas maksimal 1/3 dari harta (maks. ${formatRupiah(maxBequest)}). ` +
        'Wasiat kepada ahli waris juga memerlukan persetujuan ahli waris lain — periksa kembali.'
      );
    }
  }

  if (isPositiveNumber(estate.totalAssets) && totalDeduction > estate.totalAssets) {
    errors.push(
      '⚠ Harta bersih tidak mencukupi setelah pengurangan. Periksa kembali biaya, utang, dan wasiat.'
    );
  }

  return { valid: errors.length === 0, errors };
}

/** Validate the "Ahli Waris" step. */
function validateHeirsInput(heirs, deceasedGender) {
  const errors = [];

  const intFields = [
    ['husband', 'Suami'],
    ['wives', 'Istri'],
    ['sons', 'Anak laki-laki'],
    ['daughters', 'Anak perempuan'],
    ['fullBrothers', 'Saudara laki-laki sekandung'],
    ['fullSisters', 'Saudara perempuan sekandung'],
    ['paternalBrothers', 'Saudara laki-laki seayah'],
    ['paternalSisters', 'Saudara perempuan seayah'],
    ['maternalBrothers', 'Saudara laki-laki seibu'],
    ['maternalSisters', 'Saudara perempuan seibu']
  ];

  for (const [key, label] of intFields) {
    const v = heirs[key];
    if (!isNonNegativeInteger(v)) {
      errors.push(`${label} harus berupa bilangan bulat, tidak boleh negatif atau desimal.`);
    }
  }

  // Spouse must match deceased's gender.
  if (deceasedGender === 'male' && heirs.husband > 0) {
    errors.push('Pewaris laki-laki tidak dapat memiliki ahli waris "suami". Periksa kembali data pasangan.');
  }
  if (deceasedGender === 'female' && heirs.wives > 0) {
    errors.push('Pewaris perempuan tidak dapat memiliki ahli waris "istri". Periksa kembali data pasangan.');
  }
  if (deceasedGender === 'male' && heirs.husband === undefined) {
    // husband field irrelevant for male deceased; no error needed here.
  }
  if (deceasedGender === 'female' && heirs.wives > 1) {
    errors.push('Pewaris perempuan hanya dapat memiliki 1 suami.');
  }
  if (deceasedGender === 'male' && heirs.wives > 4) {
    errors.push('Jumlah istri yang diinput tidak wajar (maksimal 4 dalam praktik syariat). Periksa kembali data.');
  }
  if (deceasedGender === 'male' && heirs.husband > 1) {
    errors.push('Nilai "suami" tidak valid untuk pewaris laki-laki.');
  }

  if (heirs.paternalGrandfather && heirs.father) {
    errors.push('Kakek dari pihak ayah tidak relevan dimasukkan bersamaan dengan ayah pewaris yang masih ada — kakek akan otomatis terhalang (mahjub) oleh ayah.');
  }

  return { valid: errors.length === 0, errors };
}

/** Format a number as Indonesian Rupiah, e.g. "Rp 125.000.000". */
function formatRupiah(value) {
  const rounded = Math.round(value || 0);
  const parts = Math.abs(rounded).toString().split('').reverse();
  let grouped = '';
  for (let i = 0; i < parts.length; i++) {
    grouped = parts[i] + grouped;
    if ((i + 1) % 3 === 0 && i !== parts.length - 1) grouped = '.' + grouped;
  }
  return (rounded < 0 ? '-Rp ' : 'Rp ') + grouped;
}

const VALIDATION = {
  isNonNegativeInteger,
  isPositiveNumber,
  validateEstateInput,
  validateHeirsInput,
  formatRupiah
};

window.VALIDATION = VALIDATION;
window.formatRupiah = formatRupiah; // convenience global, used widely across app.js