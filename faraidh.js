/**
 * faraidh.js
 * ----------
 * The Faraidh Calculation Engine. Pure functions only — no DOM access here.
 * All money math is done with integer fractions (see fraction.js) until the
 * very last step, where fractions are converted into Rupiah.
 *
 * Pipeline (per the required architecture):
 *   calculateInheritance(input)
 *     -> validateInput()
 *     -> calculateNetEstate()
 *     -> determineEligibleHeirs()
 *     -> determineBlockedHeirs()   (Hijab)
 *     -> calculateFixedShares()    (Ashabul Furudh)
 *     -> calculateAsabah()
 *     -> handleAwlIfNecessary()
 *     -> handleRaddIfNecessary()
 *     -> performTashih()
 *     -> calculateFinalAmounts()
 *     -> generateExplanation()
 *
 * KNOWN LIMITATIONS (declared deliberately rather than silently guessed):
 *  - Grandchildren (cucu) as substitute heirs are NOT calculated yet. The
 *    heir data structure is intentionally kept extensible for this.
 *  - Where classical fiqh opinions genuinely diverge (e.g. grandfather vs.
 *    siblings, radd to a spouse), this engine picks ONE well-known opinion
 *    and documents it in references.js -> fiqhDifferences, instead of
 *    silently claiming to support every madhhab.
 */

const ZERO = { numerator: 0, denominator: 1 };
const HALF = { numerator: 1, denominator: 2 };
const THIRD = { numerator: 1, denominator: 3 };
const QUARTER = { numerator: 1, denominator: 4 };
const SIXTH = { numerator: 1, denominator: 6 };
const EIGHTH = { numerator: 1, denominator: 8 };
const TWO_THIRDS = { numerator: 2, denominator: 3 };

/** Step: calculate net (distributable) estate after deductions. */
function calculateNetEstate(estate) {
  const total = estate.totalAssets || 0;
  const funeralCost = estate.funeralCost || 0;
  const debt = estate.debt || 0;
  const bequest = estate.bequest || 0;
  const otherDeduction = estate.otherDeduction || 0;
  const totalDeduction = funeralCost + debt + bequest + otherDeduction;
  const netEstate = total - totalDeduction;
  return {
    totalAssets: total,
    funeralCost,
    debt,
    bequest,
    otherDeduction,
    totalDeduction,
    netEstate: Math.max(0, netEstate)
  };
}

/** Step: figure out who exists among the entered heirs (count/flag > 0). */
function determineEligibleHeirs(heirs) {
  return {
    husband: heirs.husband > 0,
    wives: heirs.wives > 0,
    sons: heirs.sons > 0,
    daughters: heirs.daughters > 0,
    father: !!heirs.father,
    mother: !!heirs.mother,
    paternalGrandfather: !!heirs.paternalGrandfather,
    paternalGrandmother: !!heirs.paternalGrandmother,
    maternalGrandmother: !!heirs.maternalGrandmother,
    fullBrothers: heirs.fullBrothers > 0,
    fullSisters: heirs.fullSisters > 0,
    paternalBrothers: heirs.paternalBrothers > 0,
    paternalSisters: heirs.paternalSisters > 0,
    maternalBrothers: heirs.maternalBrothers > 0,
    maternalSisters: heirs.maternalSisters > 0
  };
}

/**
 * Step: determine Hijab Hirman (total blocking) for each heir category.
 * Returns a map: category -> reason string (blocked) or null (not blocked).
 */
function determineBlockedHeirs(heirs) {
  const hasSon = heirs.sons > 0;
  const hasDaughter = heirs.daughters > 0;
  const hasChild = hasSon || hasDaughter;
  const hasFather = !!heirs.father;
  const hasMother = !!heirs.mother;
  const siblingTotal =
    heirs.fullBrothers + heirs.fullSisters +
    heirs.paternalBrothers + heirs.paternalSisters +
    heirs.maternalBrothers + heirs.maternalSisters;

  const blocked = {};

  // Paternal grandfather: blocked entirely by the father's presence.
  if (heirs.paternalGrandfather) {
    blocked.paternalGrandfather = hasFather
      ? 'Terhalang oleh ayah pewaris (ayah lebih dekat kedudukannya).'
      : null;
  }
  const grandfatherIsFatherSubstitute = heirs.paternalGrandfather && !hasFather;

  // Grandmothers: blocked entirely by the mother's presence. The paternal
  // grandmother is also blocked by the father in the majority opinion.
  if (heirs.paternalGrandmother) {
    if (hasMother) blocked.paternalGrandmother = 'Terhalang oleh ibu pewaris.';
    else if (hasFather) blocked.paternalGrandmother = 'Terhalang oleh ayah pewaris (pendapat mayoritas).';
    else blocked.paternalGrandmother = null;
  }
  if (heirs.maternalGrandmother) {
    blocked.maternalGrandmother = hasMother ? 'Terhalang oleh ibu pewaris.' : null;
  }
  // If both grandmothers present and neither is blocked, they will share 1/6.

  // Full & paternal siblings: blocked by father, by a father-substitute
  // grandfather, or by a son (any male descendant taking asabah).
  const agnateSiblingBlocker = hasFather
    ? 'Terhalang oleh ayah pewaris.'
    : (hasSon ? 'Terhalang oleh anak laki-laki pewaris.'
      : (grandfatherIsFatherSubstitute ? 'Terhalang oleh kakek (menggantikan kedudukan ayah).' : null));

  if (heirs.fullBrothers > 0 || heirs.fullSisters > 0) {
    blocked.fullSiblings = agnateSiblingBlocker;
  }
  if (heirs.paternalBrothers > 0 || heirs.paternalSisters > 0) {
    if (agnateSiblingBlocker) {
      blocked.paternalSiblings = agnateSiblingBlocker;
    } else if (heirs.fullBrothers > 0) {
      blocked.paternalSiblings = 'Terhalang oleh saudara laki-laki sekandung (ashabah sekandung lebih diutamakan).';
    } else if (heirs.fullSisters >= 2) {
      blocked.paternalSiblings =
        'Terhalang: dua saudara perempuan sekandung atau lebih telah mengambil bagian 2/3 dan tidak menyisakan bagian bagi saudara seayah (pendapat yang digunakan aplikasi ini).';
    } else {
      blocked.paternalSiblings = null;
    }
  }

  // Maternal siblings: blocked by ANY child/descendant, or by father, or by
  // a father-substitute grandfather. (Their gender does not matter — both
  // maternal brothers and sisters follow identical rules and equal shares.)
  const maternalSiblingBlocker = hasChild
    ? 'Terhalang oleh anak pewaris.'
    : (hasFather ? 'Terhalang oleh ayah pewaris.'
      : (grandfatherIsFatherSubstitute ? 'Terhalang oleh kakek (menggantikan kedudukan ayah).' : null));
  if (heirs.maternalBrothers > 0 || heirs.maternalSisters > 0) {
    blocked.maternalSiblings = maternalSiblingBlocker;
  }

  return {
    blocked,
    hasSon,
    hasDaughter,
    hasChild,
    hasFather,
    hasMother,
    siblingTotal,
    grandfatherIsFatherSubstitute
  };
}

/**
 * Step: calculate the fixed (Ashabul Furudh) shares.
 * Returns an array of "rows", each describing one heir CATEGORY
 * (e.g. "2 anak perempuan" together), with its fraction of the estate.
 * Rows do NOT yet include asabah (residuary) heirs — that is a separate step.
 */
function calculateFixedShares(heirs, ctx) {
  const rows = [];
  const notes = [];

  // --- Husband ---
  if (heirs.husband > 0) {
    const fraction = ctx.hasChild ? QUARTER : HALF;
    rows.push({
      key: 'husband',
      label: 'Suami',
      count: 1,
      status: 'ashabul_furudh',
      fraction,
      reason: ctx.hasChild
        ? 'Suami mendapat 1/4 karena pewaris memiliki anak/keturunan.'
        : 'Suami mendapat 1/2 karena pewaris tidak memiliki anak/keturunan.'
    });
  }

  // --- Wives (collective share, split later per person) ---
  if (heirs.wives > 0) {
    const fraction = ctx.hasChild ? EIGHTH : QUARTER;
    rows.push({
      key: 'wives',
      label: heirs.wives > 1 ? `Istri (${heirs.wives} orang)` : 'Istri',
      count: heirs.wives,
      status: 'ashabul_furudh',
      fraction,
      reason: ctx.hasChild
        ? `Istri mendapat 1/8 (dibagi rata di antara ${heirs.wives} istri) karena pewaris memiliki anak/keturunan.`
        : `Istri mendapat 1/4 (dibagi rata di antara ${heirs.wives} istri) karena pewaris tidak memiliki anak/keturunan.`
    });
  }

  // --- Mother ---
  let motherIsUmariyyah = false;
  if (heirs.mother) {
    const reducedByChildOrSiblings = ctx.hasChild || ctx.siblingTotal >= 2;
    const spouseFraction = heirs.husband > 0 ? HALF : (heirs.wives > 0 ? QUARTER : null);
    // Umariyyatain / Gharrawayn: spouse + BOTH parents only, no children, no siblings.
    if (!ctx.hasChild && ctx.siblingTotal === 0 && ctx.hasFather && spouseFraction) {
      motherIsUmariyyah = true;
      const remainder = FR.subtractFraction({ numerator: 1, denominator: 1 }, spouseFraction);
      const fraction = FR.multiplyFraction(THIRD, remainder);
      rows.push({
        key: 'mother',
        label: 'Ibu',
        count: 1,
        status: 'ashabul_furudh',
        fraction,
        reason:
          'Kasus Umariyyatain/Gharrawayn: ibu mendapat 1/3 dari SISA harta setelah bagian pasangan diambil (bukan 1/3 dari total harta), karena pewaris hanya meninggalkan pasangan, ayah, dan ibu.'
      });
    } else {
      const fraction = reducedByChildOrSiblings ? SIXTH : THIRD;
      rows.push({
        key: 'mother',
        label: 'Ibu',
        count: 1,
        status: 'ashabul_furudh',
        fraction,
        reason: reducedByChildOrSiblings
          ? (ctx.hasChild
            ? 'Ibu mendapat 1/6 karena pewaris memiliki anak/keturunan.'
            : 'Ibu mendapat 1/6 karena pewaris memiliki dua saudara atau lebih.')
          : 'Ibu mendapat 1/3 karena tidak ada anak/keturunan dan saudara pewaris kurang dari dua.'
      });
    }
  }

  // --- Father ---
  // Father's fardh row (1/6) is only a SEPARATE row when there are children.
  // When there are no children, the father is purely asabah (handled in
  // calculateAsabah). When there are only daughters, the father gets BOTH
  // 1/6 fardh AND the remaining residue (asabah) — flagged via fatherGetsResidueToo.
  let fatherGetsResidueToo = false;
  if (heirs.father && ctx.hasChild) {
    rows.push({
      key: 'father',
      label: 'Ayah',
      count: 1,
      status: 'ashabul_furudh',
      fraction: SIXTH,
      reason: 'Ayah mendapat 1/6 karena pewaris memiliki anak/keturunan.'
    });
    if (!ctx.hasSon) {
      fatherGetsResidueToo = true;
    }
  }

  // --- Paternal grandfather (only relevant when father is absent) ---
  let grandfatherGetsResidueToo = false;
  if (heirs.paternalGrandfather && !heirs.father && ctx.hasChild) {
    rows.push({
      key: 'paternalGrandfather',
      label: 'Kakek dari pihak ayah',
      count: 1,
      status: 'ashabul_furudh',
      fraction: SIXTH,
      reason:
        'Kakek mendapat 1/6 (menggantikan kedudukan ayah) karena pewaris memiliki anak/keturunan dan ayah sudah tidak ada.'
    });
    if (!ctx.hasSon) {
      grandfatherGetsResidueToo = true;
    }
  }

  // --- Grandmothers (paternal / maternal), sharing 1/6 collectively if both present ---
  const activeGrandmothers = [];
  if (heirs.paternalGrandmother && !ctx.blocked.paternalGrandmother) activeGrandmothers.push('paternal');
  if (heirs.maternalGrandmother && !ctx.blocked.maternalGrandmother) activeGrandmothers.push('maternal');
  if (activeGrandmothers.length > 0) {
    const perGrandmother = FR.divideFraction(SIXTH, { numerator: activeGrandmothers.length, denominator: 1 });
    if (activeGrandmothers.includes('paternal')) {
      rows.push({
        key: 'paternalGrandmother',
        label: 'Nenek dari pihak ayah',
        count: 1,
        status: 'ashabul_furudh',
        fraction: perGrandmother,
        reason: activeGrandmothers.length === 2
          ? 'Nenek dari pihak ayah berbagi 1/6 bersama nenek dari pihak ibu (masing-masing 1/12).'
          : 'Nenek dari pihak ayah mendapat 1/6 karena ibu pewaris tidak ada.'
      });
    }
    if (activeGrandmothers.includes('maternal')) {
      rows.push({
        key: 'maternalGrandmother',
        label: 'Nenek dari pihak ibu',
        count: 1,
        status: 'ashabul_furudh',
        fraction: perGrandmother,
        reason: activeGrandmothers.length === 2
          ? 'Nenek dari pihak ibu berbagi 1/6 bersama nenek dari pihak ayah (masing-masing 1/12).'
          : 'Nenek dari pihak ibu mendapat 1/6 karena ibu pewaris tidak ada.'
      });
    }
  }

  // --- Daughters, when there is NO son (otherwise daughters become asabah with sons) ---
  if (heirs.daughters > 0 && !ctx.hasSon) {
    const fraction = heirs.daughters === 1 ? HALF : TWO_THIRDS;
    rows.push({
      key: 'daughters',
      label: heirs.daughters > 1 ? `Anak perempuan (${heirs.daughters} orang)` : 'Anak perempuan',
      count: heirs.daughters,
      status: 'ashabul_furudh',
      fraction,
      reason: heirs.daughters === 1
        ? 'Anak perempuan tunggal mendapat 1/2 karena tidak ada anak laki-laki.'
        : `${heirs.daughters} anak perempuan berbagi 2/3 (dibagi rata) karena tidak ada anak laki-laki.`
    });
  }

  // --- Maternal siblings (fardh: 1/6 if one, 1/3 shared if two or more) ---
  const maternalCount = (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
  if (maternalCount > 0 && !ctx.blocked.maternalSiblings) {
    const totalFraction = maternalCount === 1 ? SIXTH : THIRD;
    if (heirs.maternalBrothers > 0) {
      rows.push({
        key: 'maternalBrothers',
        label: heirs.maternalBrothers > 1 ? `Saudara laki-laki seibu (${heirs.maternalBrothers} orang)` : 'Saudara laki-laki seibu',
        count: heirs.maternalBrothers,
        status: 'ashabul_furudh',
        fraction: FR.multiplyFraction(totalFraction, { numerator: heirs.maternalBrothers, denominator: maternalCount }),
        reason: 'Saudara seibu (laki-laki maupun perempuan) mendapat bagian yang sama rata: 1/6 jika sendirian, 1/3 dibagi rata jika dua orang atau lebih.'
      });
    }
    if (heirs.maternalSisters > 0) {
      rows.push({
        key: 'maternalSisters',
        label: heirs.maternalSisters > 1 ? `Saudara perempuan seibu (${heirs.maternalSisters} orang)` : 'Saudara perempuan seibu',
        count: heirs.maternalSisters,
        status: 'ashabul_furudh',
        fraction: FR.multiplyFraction(totalFraction, { numerator: heirs.maternalSisters, denominator: maternalCount }),
        reason: 'Saudara seibu (laki-laki maupun perempuan) mendapat bagian yang sama rata: 1/6 jika sendirian, 1/3 dibagi rata jika dua orang atau lebih.'
      });
    }
  }

  // --- Full sisters as fardh (ONLY when not becoming asabah — i.e. no son,
  //     no father/grandfather, AND no full brother to elevate them to
  //     asabah bi nafsihi, AND no daughters to elevate them to asabah ma'al ghair) ---
  const fullSiblingsBlocked = !!ctx.blocked.fullSiblings;
  const fullBecomesAsabah =
    !fullSiblingsBlocked &&
    (heirs.fullBrothers > 0 || (heirs.daughters > 0)); // brothers present, or sisters inherit alongside daughters as asabah ma'al ghair
  if (heirs.fullSisters > 0 && !fullSiblingsBlocked && !fullBecomesAsabah) {
    const fraction = heirs.fullSisters === 1 ? HALF : TWO_THIRDS;
    rows.push({
      key: 'fullSisters',
      label: heirs.fullSisters > 1 ? `Saudara perempuan sekandung (${heirs.fullSisters} orang)` : 'Saudara perempuan sekandung',
      count: heirs.fullSisters,
      status: 'ashabul_furudh',
      fraction,
      reason: heirs.fullSisters === 1
        ? 'Saudara perempuan sekandung tunggal mendapat 1/2 (tidak ada saudara laki-laki sekandung maupun anak perempuan pewaris).'
        : `${heirs.fullSisters} saudara perempuan sekandung berbagi 2/3.`
    });
  }

  // --- Paternal sisters as fardh (same logic, only when not blocked/asabah) ---
  const paternalSiblingsBlocked = !!ctx.blocked.paternalSiblings;
  const paternalBecomesAsabah =
    !paternalSiblingsBlocked &&
    (heirs.paternalBrothers > 0 || (heirs.daughters > 0 && heirs.fullSisters === 0 && heirs.fullBrothers === 0));
  if (heirs.paternalSisters > 0 && !paternalSiblingsBlocked && !paternalBecomesAsabah) {
    const fraction = heirs.paternalSisters === 1 ? HALF : TWO_THIRDS;
    rows.push({
      key: 'paternalSisters',
      label: heirs.paternalSisters > 1 ? `Saudara perempuan seayah (${heirs.paternalSisters} orang)` : 'Saudara perempuan seayah',
      count: heirs.paternalSisters,
      status: 'ashabul_furudh',
      fraction,
      reason: heirs.paternalSisters === 1
        ? 'Saudara perempuan seayah tunggal mendapat 1/2.'
        : `${heirs.paternalSisters} saudara perempuan seayah berbagi 2/3.`
    });
  }

  return { rows, fatherGetsResidueToo, grandfatherGetsResidueToo, motherIsUmariyyah };
}

/**
 * Step: determine who takes the residue as 'ashabah, and in what ratio.
 * Priority order (classical): children (sons+daughters) > father > grandfather
 * > full siblings (bi nafsihi or ma'al ghair with daughters) > paternal siblings.
 */
function calculateAsabah(heirs, ctx, fixedResult) {
  // 1. Children take priority (sons + daughters together, 2:1)
  if (ctx.hasSon) {
    const members = [];
    if (heirs.sons > 0) members.push({ key: 'sons', label: heirs.sons > 1 ? `Anak laki-laki (${heirs.sons} orang)` : 'Anak laki-laki', count: heirs.sons, unitEach: 2 });
    if (heirs.daughters > 0) members.push({ key: 'daughters', label: heirs.daughters > 1 ? `Anak perempuan (${heirs.daughters} orang)` : 'Anak perempuan', count: heirs.daughters, unitEach: 1 });
    return {
      taker: 'children',
      members,
      explanation: 'Anak laki-laki dan anak perempuan menjadi \'ashabah bersama (ashabah bi nafsihi): sisa harta dibagi dengan perbandingan bagian anak laki-laki = 2 × bagian anak perempuan.'
    };
  }

  // 2. Father with only daughters (fardh 1/6 already given, plus residue)
  if (fixedResult.fatherGetsResidueToo) {
    return {
      taker: 'father',
      members: [{ key: 'father', label: 'Ayah', count: 1, unitEach: 1 }],
      explanation: 'Ayah menerima sisa harta sebagai \'ashabah SETELAH bagian tetap 1/6-nya, karena pewaris hanya memiliki anak perempuan (bi al-fardh wa at-ta\'shib).'
    };
  }
  if (!heirs.father && !ctx.hasChild && false) { /* unreachable placeholder for clarity */ }
  if (heirs.father && !ctx.hasChild) {
    return {
      taker: 'father',
      members: [{ key: 'father', label: 'Ayah', count: 1, unitEach: 1 }],
      explanation: 'Ayah menerima seluruh sisa harta sebagai \'ashabah karena pewaris tidak memiliki anak/keturunan.'
    };
  }

  // 3. Paternal grandfather (father-substitute), same two sub-cases
  if (fixedResult.grandfatherGetsResidueToo) {
    return {
      taker: 'paternalGrandfather',
      members: [{ key: 'paternalGrandfather', label: 'Kakek dari pihak ayah', count: 1, unitEach: 1 }],
      explanation: 'Kakek menerima sisa harta sebagai \'ashabah setelah bagian tetap 1/6-nya, karena pewaris hanya memiliki anak perempuan dan ayah sudah tidak ada.'
    };
  }
  if (heirs.paternalGrandfather && !heirs.father && !ctx.hasChild) {
    return {
      taker: 'paternalGrandfather',
      members: [{ key: 'paternalGrandfather', label: 'Kakek dari pihak ayah', count: 1, unitEach: 1 }],
      explanation: 'Kakek menerima seluruh sisa harta sebagai \'ashabah (menggantikan kedudukan ayah) karena pewaris tidak memiliki anak/keturunan dan ayah sudah tidak ada.'
    };
  }

  // 4. Full siblings (brothers, or sisters alongside daughters / alone with brothers)
  if (!ctx.blocked.fullSiblings && (heirs.fullBrothers > 0 || heirs.fullSisters > 0)) {
    const eligible = heirs.fullBrothers > 0 || heirs.daughters > 0; // brothers present -> normal asabah; sisters alone need daughters to become asabah ma'al ghair
    if (eligible) {
      const members = [];
      if (heirs.fullBrothers > 0) members.push({ key: 'fullBrothers', label: heirs.fullBrothers > 1 ? `Saudara laki-laki sekandung (${heirs.fullBrothers} orang)` : 'Saudara laki-laki sekandung', count: heirs.fullBrothers, unitEach: 2 });
      if (heirs.fullSisters > 0) members.push({ key: 'fullSisters', label: heirs.fullSisters > 1 ? `Saudara perempuan sekandung (${heirs.fullSisters} orang)` : 'Saudara perempuan sekandung', count: heirs.fullSisters, unitEach: heirs.fullBrothers > 0 ? 1 : 1 });
      return {
        taker: 'fullSiblings',
        members,
        explanation: heirs.fullBrothers > 0
          ? 'Saudara laki-laki dan perempuan sekandung menjadi \'ashabah bersama, dengan perbandingan 2:1 (laki-laki:perempuan).'
          : 'Saudara perempuan sekandung menjadi \'ashabah ma\'al ghair (ashabah bersama pihak lain) karena mewarisi bersama anak perempuan pewaris tanpa ada anak laki-laki.'
      };
    }
  }

  // 5. Paternal siblings (same logic as full siblings, one tier lower priority)
  if (!ctx.blocked.paternalSiblings && (heirs.paternalBrothers > 0 || heirs.paternalSisters > 0) && heirs.fullBrothers === 0) {
    const eligible = heirs.paternalBrothers > 0 || heirs.daughters > 0;
    if (eligible && heirs.fullSisters === 0) {
      const members = [];
      if (heirs.paternalBrothers > 0) members.push({ key: 'paternalBrothers', label: heirs.paternalBrothers > 1 ? `Saudara laki-laki seayah (${heirs.paternalBrothers} orang)` : 'Saudara laki-laki seayah', count: heirs.paternalBrothers, unitEach: 2 });
      if (heirs.paternalSisters > 0) members.push({ key: 'paternalSisters', label: heirs.paternalSisters > 1 ? `Saudara perempuan seayah (${heirs.paternalSisters} orang)` : 'Saudara perempuan seayah', count: heirs.paternalSisters, unitEach: 1 });
      return {
        taker: 'paternalSiblings',
        members,
        explanation: heirs.paternalBrothers > 0
          ? 'Saudara laki-laki dan perempuan seayah menjadi \'ashabah bersama, dengan perbandingan 2:1 (laki-laki:perempuan).'
          : 'Saudara perempuan seayah menjadi \'ashabah ma\'al ghair karena mewarisi bersama anak perempuan pewaris tanpa ada anak laki-laki maupun saudara sekandung.'
      };
    }
  }

  return null; // No asabah taker found — any residue will go through Radd.
}

/**
 * Step: build the "asal masalah" (LCD base) from all fardh rows, then
 * detect & apply 'Awl (proportional reduction) if the shares exceed the
 * whole estate.
 */
function buildAsalMasalahAndAwl(fixedRows) {
  if (fixedRows.length === 0) {
    return { base: 1, rowsWithNumerator: [], awlApplied: false, originalBase: 1, sumNumerator: 0 };
  }
  let base = 1;
  for (const row of fixedRows) {
    base = FR.lcm(base, row.fraction.denominator);
  }
  const rowsWithNumerator = fixedRows.map(row => ({
    ...row,
    numerator: (base / row.fraction.denominator) * row.fraction.numerator
  }));
  const sumNumerator = rowsWithNumerator.reduce((acc, r) => acc + r.numerator, 0);

  if (sumNumerator > base) {
    // 'Awl: the denominator itself grows to match the sum of numerators,
    // so every fardh heir's numerator stays the same but the base (and
    // therefore everyone's effective share) shrinks proportionally.
    return {
      base: sumNumerator,
      originalBase: base,
      rowsWithNumerator,
      awlApplied: true,
      sumNumerator
    };
  }
  return { base, originalBase: base, rowsWithNumerator, awlApplied: false, sumNumerator };
}

/**
 * Step: apply Radd (return of leftover residue to fardh heirs) when there
 * is leftover residue AND no 'ashabah heir exists to absorb it.
 */
function applyRadd(rowsWithNumerator, base, sumNumerator) {
  const leftover = base - sumNumerator; // > 0 implies radd is relevant
  if (leftover <= 0) return { applied: false, finalFractions: rowsWithNumerator.map(r => ({ key: r.key, fraction: { numerator: r.numerator, denominator: base } })) };

  const spouseRow = rowsWithNumerator.find(r => r.key === 'husband' || r.key === 'wives');
  const otherRows = rowsWithNumerator.filter(r => r !== spouseRow);

  if (otherRows.length === 0) {
    if (spouseRow) {
      // Spouse is the ONLY heir: practical resolution — spouse receives the
      // entire estate via radd (see references.js -> fiqhDifferences for
      // the classical-vs-practical note on this specific edge case).
      return {
        applied: true,
        soleSpouseCase: true,
        finalFractions: [{ key: spouseRow.key, fraction: { numerator: 1, denominator: 1 } }]
      };
    }
    return { applied: false, finalFractions: rowsWithNumerator.map(r => ({ key: r.key, fraction: { numerator: r.numerator, denominator: base } })) };
  }

  const reddSum = otherRows.reduce((acc, r) => acc + r.numerator, 0);
  const spouseFraction = spouseRow ? { numerator: spouseRow.numerator, denominator: base } : null;
  const remainderOfEstate = spouseFraction
    ? FR.subtractFraction({ numerator: 1, denominator: 1 }, spouseFraction)
    : { numerator: 1, denominator: 1 };

  const finalFractions = [];
  if (spouseRow) finalFractions.push({ key: spouseRow.key, fraction: spouseFraction });
  for (const row of otherRows) {
    const shareOfRemainder = { numerator: row.numerator, denominator: reddSum };
    const finalFraction = FR.multiplyFraction(shareOfRemainder, remainderOfEstate);
    finalFractions.push({ key: row.key, fraction: finalFraction });
  }
  return { applied: true, soleSpouseCase: false, finalFractions };
}

/**
 * Full pipeline. `input` = { estate: {...}, heirs: {...} }.
 * Returns a rich result object consumed by app.js for rendering.
 */
function calculateInheritance(input) {
  const { estate, heirs } = input;

  const estateValidation = VALIDATION.validateEstateInput(estate);
  const heirsValidation = VALIDATION.validateHeirsInput(heirs, estate.deceasedGender);
  const allErrors = [...estateValidation.errors, ...heirsValidation.errors];
  if (allErrors.length > 0) {
    return { success: false, errors: allErrors };
  }

  const netEstateResult = calculateNetEstate(estate);
  const eligible = determineEligibleHeirs(heirs);
  const hijabCtx = determineBlockedHeirs(heirs);

  const fixedResult = calculateFixedShares(heirs, hijabCtx);
  const asabahResult = calculateAsabah(heirs, hijabCtx, fixedResult);

  const { base, rowsWithNumerator, awlApplied, originalBase, sumNumerator } =
    buildAsalMasalahAndAwl(fixedResult.rows);

  let finalFractionsByKey = {};
  let raddApplied = false;
  let raddInfo = null;
  let residueFraction = ZERO;

  if (fixedResult.rows.length === 0) {
    // No fardh heirs at all — 100% of the estate is residue.
    residueFraction = { numerator: 1, denominator: 1 };
  } else if (awlApplied) {
    // 'Awl: every fardh heir's numerator stays the same, base grows.
    for (const row of rowsWithNumerator) {
      finalFractionsByKey[row.key] = { numerator: row.numerator, denominator: base };
    }
    residueFraction = ZERO; // nothing left over under 'awl
  } else if (sumNumerator === base) {
    for (const row of rowsWithNumerator) {
      finalFractionsByKey[row.key] = { numerator: row.numerator, denominator: base };
    }
    residueFraction = ZERO;
  } else {
    // sumNumerator < base: leftover residue exists.
    residueFraction = FR.simplifyFraction({ numerator: base - sumNumerator, denominator: base });
    if (asabahResult) {
      for (const row of rowsWithNumerator) {
        finalFractionsByKey[row.key] = { numerator: row.numerator, denominator: base };
      }
    } else {
      // No asabah taker -> Radd.
      const raddResult = applyRadd(rowsWithNumerator, base, sumNumerator);
      raddApplied = raddResult.applied;
      raddInfo = raddResult;
      for (const f of raddResult.finalFractions) {
        finalFractionsByKey[f.key] = f.fraction;
      }
      residueFraction = ZERO; // fully redistributed via radd
    }
  }

  // Assemble the final per-category rows (fardh heirs).
  const finalRows = fixedResult.rows.map(row => {
    const fraction = finalFractionsByKey[row.key] || ZERO;
    return {
      ...row,
      finalFraction: fraction,
      amount: FR.fractionOfAmount(fraction, netEstateResult.netEstate)
    };
  });

  // Assemble asabah rows (residue-takers), only when NOT overridden by radd/awl.
  const asabahRows = [];
  if (asabahResult && !awlApplied && FR.fractionToDecimal(residueFraction) > 0) {
    const totalUnits = asabahResult.members.reduce((acc, m) => acc + m.count * m.unitEach, 0);
    for (const member of asabahResult.members) {
      const memberUnits = member.count * member.unitEach;
      const memberFraction = FR.multiplyFraction(residueFraction, { numerator: memberUnits, denominator: totalUnits });
      asabahRows.push({
        key: member.key,
        label: member.label,
        count: member.count,
        status: 'asabah',
        finalFraction: memberFraction,
        amount: FR.fractionOfAmount(memberFraction, netEstateResult.netEstate)
      });
    }
  } else if (asabahResult && !awlApplied && fixedResult.rows.length === 0) {
    // Pure-asabah case (e.g. sons only, no fardh heirs at all): 100% residue.
    const totalUnits = asabahResult.members.reduce((acc, m) => acc + m.count * m.unitEach, 0);
    for (const member of asabahResult.members) {
      const memberUnits = member.count * member.unitEach;
      const memberFraction = { numerator: memberUnits, denominator: totalUnits };
      asabahRows.push({
        key: member.key,
        label: member.label,
        count: member.count,
        status: 'asabah',
        finalFraction: memberFraction,
        amount: FR.fractionOfAmount(memberFraction, netEstateResult.netEstate)
      });
    }
  }

  // Blocked (mahjub) heirs, shown explicitly rather than silently omitted.
  const blockedRows = [];
  const blockedLabels = {
    paternalGrandfather: 'Kakek dari pihak ayah',
    paternalGrandmother: 'Nenek dari pihak ayah',
    maternalGrandmother: 'Nenek dari pihak ibu',
    fullSiblings: 'Saudara sekandung',
    paternalSiblings: 'Saudara seayah',
    maternalSiblings: 'Saudara seibu'
  };
  for (const [key, reason] of Object.entries(hijabCtx.blocked)) {
    if (reason) {
      blockedRows.push({ key, label: blockedLabels[key] || key, status: 'mahjub', reason, amount: 0 });
    }
  }

  // Rounding reconciliation: make sure rounded amounts sum EXACTLY to the
  // net estate by adjusting the largest row with any leftover Rupiah.
  reconcileRounding([...finalRows, ...asabahRows], netEstateResult.netEstate);

  const explanationSteps = generateExplanation({
    estate,
    netEstateResult,
    heirs,
    hijabCtx,
    fixedResult,
    asabahResult,
    finalRows,
    asabahRows,
    blockedRows,
    awlApplied,
    originalBase,
    base,
    raddApplied,
    raddInfo
  });

  return {
    success: true,
    netEstateResult,
    finalRows,
    asabahRows,
    blockedRows,
    awlApplied,
    originalBase: awlApplied ? originalBase : null,
    awlBase: awlApplied ? base : null,
    raddApplied,
    explanationSteps,
    warnings: buildWarnings(heirs, hijabCtx)
  };
}

/** Adjust rounding so the sum of displayed amounts equals netEstate exactly. */
function reconcileRounding(rows, netEstate) {
  if (rows.length === 0) return;
  const sum = rows.reduce((acc, r) => acc + r.amount, 0);
  const diff = Math.round(netEstate) - sum;
  if (diff === 0) return;
  // Apply the small rounding difference to the largest row (least noticeable).
  let largest = rows[0];
  for (const r of rows) if (r.amount > largest.amount) largest = r;
  largest.amount += diff;
}

/** Non-fatal notes shown alongside results (fiqh-difference disclosures etc.) */
function buildWarnings(heirs, hijabCtx) {
  const warnings = [];
  if (heirs.paternalGrandfather && (heirs.fullBrothers > 0 || heirs.fullSisters > 0 || heirs.paternalBrothers > 0 || heirs.paternalSisters > 0)) {
    warnings.push(
      'Kasus ini melibatkan kakek bersama saudara pewaris — ada perbedaan pendapat fiqih mengenai hal ini. Lihat bagian Referensi Hukum.'
    );
  }
  if (heirs.wives > 1) {
    warnings.push('Bagian istri ditampilkan sebagai bagian kolektif yang dibagi rata di antara seluruh istri.');
  }
  return warnings;
}

/** Step: generate a human-readable, case-specific step-by-step explanation. */
function generateExplanation(ctx) {
  const steps = [];
  const { estate, netEstateResult, heirs, finalRows, asabahRows, blockedRows, awlApplied, originalBase, base, raddApplied } = ctx;

  steps.push(`Harta peninggalan kotor: ${formatRupiah(netEstateResult.totalAssets)}.`);
  if (netEstateResult.totalDeduction > 0) {
    steps.push(
      `Dikurangi biaya pengurusan jenazah (${formatRupiah(netEstateResult.funeralCost)}), utang (${formatRupiah(netEstateResult.debt)}), wasiat (${formatRupiah(netEstateResult.bequest)}), dan pengurang lain (${formatRupiah(netEstateResult.otherDeduction)}).`
    );
  }
  steps.push(`Harta bersih yang dibagi kepada ahli waris: ${formatRupiah(netEstateResult.netEstate)}.`);

  const heirNames = [];
  if (heirs.husband > 0) heirNames.push('suami');
  if (heirs.wives > 0) heirNames.push(heirs.wives > 1 ? `${heirs.wives} istri` : 'istri');
  if (heirs.sons > 0) heirNames.push(`${heirs.sons} anak laki-laki`);
  if (heirs.daughters > 0) heirNames.push(`${heirs.daughters} anak perempuan`);
  if (heirs.father) heirNames.push('ayah');
  if (heirs.mother) heirNames.push('ibu');
  if (heirNames.length > 0) {
    steps.push(`Pewaris meninggalkan ahli waris: ${heirNames.join(', ')}${heirNames.length < Object.values(heirs).filter(Boolean).length ? ', dan lainnya' : ''}.`);
  }

  for (const row of finalRows) {
    steps.push(`${row.label}: ${row.reason} Bagian akhir = ${FR.fractionToString(row.finalFraction)} = ${formatRupiah(row.amount)}.`);
  }

  for (const row of blockedRows) {
    steps.push(`${row.label}: TERHALANG (Mahjub). Alasan: ${row.reason}`);
  }

  if (awlApplied) {
    steps.push(
      `Terjadi 'Awl karena total bagian ahli waris (dalam pecahan asal masalah ${originalBase}) melebihi harta yang tersedia. Asal masalah disesuaikan dari ${originalBase} menjadi ${base}, sehingga setiap bagian dikurangi secara proporsional.`
    );
  }

  if (asabahRows.length > 0) {
    steps.push(ctx.asabahResult ? ctx.asabahResult.explanation : 'Sisa harta dibagikan kepada \'ashabah.');
    for (const row of asabahRows) {
      steps.push(`${row.label} (\'ashabah): ${FR.fractionToString(row.finalFraction)} = ${formatRupiah(row.amount)}.`);
    }
  } else if (raddApplied) {
    steps.push(
      'Terdapat sisa harta setelah bagian tetap diberikan, dan tidak ada \'ashabah yang berhak menerima sisa. Sisa harta dikembalikan (Radd) secara proporsional kepada ahli waris ashabul furudh yang berhak (selain pasangan, kecuali pasangan adalah ahli waris tunggal).'
    );
  }

  return steps;
}

const FARAIDH = {
  calculateInheritance,
  calculateNetEstate,
  determineEligibleHeirs,
  determineBlockedHeirs,
  calculateFixedShares,
  calculateAsabah,
  buildAsalMasalahAndAwl,
  applyRadd
};

window.FARAIDH = FARAIDH;