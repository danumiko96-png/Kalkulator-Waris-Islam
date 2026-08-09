/**
 * tests.js
 * --------
 * Lightweight test runner for the Faraidh engine — no external test
 * framework. Open test.html in a browser (or include this file after the
 * other scripts) and call runTests() from the console, or just load
 * test.html directly: it calls runTests() automatically and prints a
 * report both to the console and to the page.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFractionEquals(actual, expected, label) {
  assert(
    FR.compareFraction(actual, expected) === 0,
    `${label}: diharapkan ${FR.fractionToString(expected)}, didapat ${FR.fractionToString(actual)}`
  );
}

function findRow(result, key) {
  return [...result.finalRows, ...result.asabahRows].find((r) => r.key === key);
}

function findBlocked(result, key) {
  return result.blockedRows.find((r) => r.key === key);
}

function baseEstate(overrides) {
  return Object.assign({
    deceasedGender: 'male',
    totalAssets: 120000000,
    funeralCost: 0,
    debt: 0,
    bequest: 0,
    otherDeduction: 0
  }, overrides);
}

function baseHeirs(overrides) {
  return Object.assign({
    husband: 0, wives: 0, sons: 0, daughters: 0, father: false, mother: false,
    paternalGrandfather: false, paternalGrandmother: false, maternalGrandmother: false,
    fullBrothers: 0, fullSisters: 0, paternalBrothers: 0, paternalSisters: 0,
    maternalBrothers: 0, maternalSisters: 0
  }, overrides);
}

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }

/* 1. Suami + anak laki-laki (pewaris perempuan) */
test('Suami + anak laki-laki: suami 1/4, anak sisa 3/4', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ deceasedGender: 'female' }),
    heirs: baseHeirs({ husband: 1, sons: 1 })
  });
  assert(result.success, 'perhitungan harus berhasil');
  assertFractionEquals(findRow(result, 'husband').finalFraction, { numerator: 1, denominator: 4 }, 'Suami');
  assertFractionEquals(findRow(result, 'sons').finalFraction, { numerator: 3, denominator: 4 }, 'Anak laki-laki');
});

/* 2. Istri + anak (pewaris laki-laki) */
test('Istri + anak laki-laki: istri 1/8, anak sisa 7/8', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ deceasedGender: 'male' }),
    heirs: baseHeirs({ wives: 1, sons: 1 })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'wives').finalFraction, { numerator: 1, denominator: 8 }, 'Istri');
  assertFractionEquals(findRow(result, 'sons').finalFraction, { numerator: 7, denominator: 8 }, 'Anak laki-laki');
});

/* 3. Ayah + ibu + anak laki-laki */
test('Ayah + ibu + anak laki-laki: ayah 1/6, ibu 1/6, anak 2/3', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ father: true, mother: true, sons: 1 })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'father').finalFraction, { numerator: 1, denominator: 6 }, 'Ayah');
  assertFractionEquals(findRow(result, 'mother').finalFraction, { numerator: 1, denominator: 6 }, 'Ibu');
  assertFractionEquals(findRow(result, 'sons').finalFraction, { numerator: 2, denominator: 3 }, 'Anak laki-laki');
});

/* 4. Anak laki-laki + anak perempuan saja (murni asabah) */
test('Anak laki-laki + anak perempuan saja: rasio 2:1', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ sons: 1, daughters: 1 })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'sons').finalFraction, { numerator: 2, denominator: 3 }, 'Anak laki-laki');
  assertFractionEquals(findRow(result, 'daughters').finalFraction, { numerator: 1, denominator: 3 }, 'Anak perempuan');
});

/* 5. Hanya anak perempuan tunggal -> 1/2 lalu radd jadi seluruhnya */
test('Anak perempuan tunggal sendirian: 1/2 fardh, lalu Radd jadi 1/1', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ daughters: 1 })
  });
  assert(result.success);
  assert(result.raddApplied, 'radd seharusnya diterapkan');
  assertFractionEquals(findRow(result, 'daughters').finalFraction, { numerator: 1, denominator: 1 }, 'Anak perempuan (setelah radd)');
});

/* 6. Beberapa istri */
test('3 istri + 1 anak laki-laki: total istri 1/8, per istri 1/24', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ wives: 3, sons: 1 })
  });
  assert(result.success);
  const wivesRow = findRow(result, 'wives');
  assertFractionEquals(wivesRow.finalFraction, { numerator: 1, denominator: 8 }, 'Istri (total)');
  const perWife = FR.divideFraction(wivesRow.finalFraction, { numerator: 3, denominator: 1 });
  assertFractionEquals(perWife, { numerator: 1, denominator: 24 }, 'Istri (per orang)');
});

/* 7. Saudara kandung sebagai asabah (tanpa anak, tanpa ayah) */
test('Saudara laki-laki & perempuan sekandung (tanpa ayah/anak): rasio 2:1', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ fullBrothers: 1, fullSisters: 1 })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'fullBrothers').finalFraction, { numerator: 2, denominator: 3 }, 'Saudara laki-laki sekandung');
  assertFractionEquals(findRow(result, 'fullSisters').finalFraction, { numerator: 1, denominator: 3 }, 'Saudara perempuan sekandung');
});

/* 8. Ahli waris terhalang: anak laki-laki menghalangi saudara kandung */
test('Anak laki-laki menghalangi saudara kandung (Mahjub)', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ wives: 1, sons: 1, fullBrothers: 1 })
  });
  assert(result.success);
  const blocked = findBlocked(result, 'fullSiblings');
  assert(blocked, 'saudara kandung seharusnya masuk daftar terhalang');
  assert(blocked.reason.includes('anak laki-laki'), 'alasan harus menyebut anak laki-laki');
  assertFractionEquals(findRow(result, 'sons').finalFraction, { numerator: 7, denominator: 8 }, 'Anak laki-laki (sisa penuh, saudara tidak dapat bagian)');
});

/* 9. Kasus 'Awl: suami + ibu + 2 saudara perempuan sekandung */
test("'Awl: suami + ibu + 2 saudara perempuan sekandung (asal masalah 6 -> 8)", () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ deceasedGender: 'female' }),
    heirs: baseHeirs({ husband: 1, mother: true, fullSisters: 2 })
  });
  assert(result.success);
  assert(result.awlApplied, "'awl seharusnya diterapkan");
  assert(result.originalBase === 6 && result.awlBase === 8, `asal masalah seharusnya 6->8, didapat ${result.originalBase}->${result.awlBase}`);
  assertFractionEquals(findRow(result, 'husband').finalFraction, { numerator: 3, denominator: 8 }, 'Suami');
  assertFractionEquals(findRow(result, 'mother').finalFraction, { numerator: 1, denominator: 8 }, 'Ibu');
  assertFractionEquals(findRow(result, 'fullSisters').finalFraction, { numerator: 4, denominator: 8 }, 'Saudara perempuan sekandung (total)');
});

/* 10. Radd: suami + ibu saja (tanpa anak, tanpa ayah) */
test('Radd: suami + ibu saja -> suami tetap 1/2, ibu menerima sisa (1/2)', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ deceasedGender: 'female' }),
    heirs: baseHeirs({ husband: 1, mother: true })
  });
  assert(result.success);
  assert(result.raddApplied, 'radd seharusnya diterapkan');
  assertFractionEquals(findRow(result, 'husband').finalFraction, { numerator: 1, denominator: 2 }, 'Suami');
  assertFractionEquals(findRow(result, 'mother').finalFraction, { numerator: 1, denominator: 2 }, 'Ibu (setelah radd)');
});

/* 11. Kasus dengan orang tua saja (tanpa pasangan, tanpa anak) */
test('Ayah + ibu saja (tanpa anak, tanpa pasangan): ibu 1/3, ayah asabah 2/3', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ father: true, mother: true })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'mother').finalFraction, { numerator: 1, denominator: 3 }, 'Ibu');
  assertFractionEquals(findRow(result, 'father').finalFraction, { numerator: 2, denominator: 3 }, 'Ayah (asabah)');
});

/* 12. Kasus tanpa anak: istri + ayah + ibu */
test('Istri + ayah + ibu (tanpa anak): istri 1/4, ibu 1/4 (sisa siblingTotal=0), ayah sisa', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ wives: 1, father: true, mother: true })
  });
  assert(result.success);
  assertFractionEquals(findRow(result, 'wives').finalFraction, { numerator: 1, denominator: 4 }, 'Istri');
  // Umariyyatain: mother gets 1/3 of remainder after spouse (3/4 * 1/3 = 1/4)
  assertFractionEquals(findRow(result, 'mother').finalFraction, { numerator: 1, denominator: 4 }, 'Ibu (Umariyyatain)');
  assertFractionEquals(findRow(result, 'father').finalFraction, { numerator: 1, denominator: 2 }, 'Ayah (asabah)');
});

/* 13. Operasi pecahan murni (fraction.js) */
test('Operasi pecahan: 1/2 + 1/3 = 5/6, 2/3 - 1/6 = 1/2, 1/2 * 2/3 = 1/3', () => {
  assertFractionEquals(FR.addFraction({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }), { numerator: 5, denominator: 6 }, '1/2 + 1/3');
  assertFractionEquals(FR.subtractFraction({ numerator: 2, denominator: 3 }, { numerator: 1, denominator: 6 }), { numerator: 1, denominator: 2 }, '2/3 - 1/6');
  assertFractionEquals(FR.multiplyFraction({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 3 }), { numerator: 1, denominator: 3 }, '1/2 * 2/3');
  assert(FR.gcd(24, 18) === 6, 'gcd(24,18) harus 6');
  assert(FR.lcm(4, 6) === 12, 'lcm(4,6) harus 12');
});

/* 14. Pembulatan Rupiah: total tetap sama walau ada pecahan sepertiga */
test('Pembulatan Rupiah: jumlah semua bagian tetap sama dengan harta bersih', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ totalAssets: 100, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 }),
    heirs: baseHeirs({ sons: 1, daughters: 2 })
  });
  assert(result.success);
  const total = [...result.finalRows, ...result.asabahRows].reduce((acc, r) => acc + r.amount, 0);
  assert(total === result.netEstateResult.netEstate, `total bagian (${total}) harus sama dengan harta bersih (${result.netEstateResult.netEstate})`);
});

/* 15. Input tidak valid: harta negatif */
test('Validasi: total harta negatif harus ditolak', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ totalAssets: -1000 }),
    heirs: baseHeirs({ sons: 1 })
  });
  assert(!result.success, 'perhitungan seharusnya gagal untuk harta negatif');
});

/* 16. Input tidak valid: wasiat melebihi 1/3 */
test('Validasi: wasiat melebihi 1/3 dari harta harus ditolak', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({ totalAssets: 100000000, bequest: 60000000 }),
    heirs: baseHeirs({ sons: 1 })
  });
  assert(!result.success, 'perhitungan seharusnya gagal karena wasiat melebihi 1/3');
});

/* 17. Input tidak valid: jumlah anak berupa desimal */
test('Validasi: jumlah anak berupa desimal harus ditolak', () => {
  const result = FARAIDH.calculateInheritance({
    estate: baseEstate({}),
    heirs: baseHeirs({ sons: 1.5 })
  });
  assert(!result.success, 'perhitungan seharusnya gagal karena anak laki-laki berupa desimal');
});

function runTests() {
  let passed = 0;
  const failures = [];
  for (const t of TESTS) {
    try {
      t.fn();
      passed++;
      console.log(`✅ ${t.name}`);
    } catch (err) {
      failures.push({ name: t.name, error: err.message });
      console.error(`❌ ${t.name}\n   ${err.message}`);
    }
  }
  const summary = `${passed}/${TESTS.length} test lulus.`;
  console.log(summary);

  if (typeof document !== 'undefined') {
    const el = document.getElementById('testResults');
    if (el) {
      el.innerHTML = `<p><strong>${summary}</strong></p><ul>` +
        TESTS.map((t) => {
          const fail = failures.find((f) => f.name === t.name);
          return `<li style="color:${fail ? '#A23B3B' : '#2F6F4F'}">${fail ? '❌' : '✅'} ${t.name}${fail ? `<br><small>${fail.error}</small>` : ''}</li>`;
        }).join('') + '</ul>';
    }
  }
  return { passed, total: TESTS.length, failures };
}

if (typeof window !== 'undefined') {
  window.runTests = runTests;
}