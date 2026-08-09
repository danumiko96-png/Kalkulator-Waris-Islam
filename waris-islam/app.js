/**
 * app.js
 * ------
 * DOM wiring only. All calculation logic lives in faraidh.js, all validation
 * in validation.js, all fraction math in fraction.js — this file just reads
 * inputs, calls FARAIDH.calculateInheritance(), and renders the result.
 */

(function () {
  const STEP_COUNT = 5;
  let currentStep = 1;
  let lastResult = null;

  const $ = (id) => document.getElementById(id);

  function goToStep(step) {
    currentStep = step;
    for (let i = 1; i <= STEP_COUNT; i++) {
      const el = $(`step-${i}`);
      if (el) el.hidden = i !== step;
    }
    document.querySelectorAll('.stepper__item').forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle('is-active', s === step);
      li.classList.toggle('is-done', s < step);
    });
    if (step === 4) renderSummaryPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function readEstateInput() {
    return {
      deceasedGender: document.querySelector('input[name="deceasedGender"]:checked')?.value || null,
      totalAssets: parseFloat($('totalAssets').value) || 0,
      funeralCost: parseFloat($('funeralCost').value) || 0,
      debt: parseFloat($('debt').value) || 0,
      bequest: parseFloat($('bequest').value) || 0,
      otherDeduction: parseFloat($('otherDeduction').value) || 0
    };
  }

  function readHeirsInput() {
    const intVal = (id) => {
      const raw = $(id).value;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      husband: intVal('husband'),
      wives: intVal('wives'),
      sons: intVal('sons'),
      daughters: intVal('daughters'),
      father: $('father').checked,
      mother: $('mother').checked,
      paternalGrandfather: $('paternalGrandfather').checked,
      paternalGrandmother: $('paternalGrandmother').checked,
      maternalGrandmother: $('maternalGrandmother').checked,
      fullBrothers: intVal('fullBrothers'),
      fullSisters: intVal('fullSisters'),
      paternalBrothers: intVal('paternalBrothers'),
      paternalSisters: intVal('paternalSisters'),
      maternalBrothers: intVal('maternalBrothers'),
      maternalSisters: intVal('maternalSisters')
    };
  }

  /** Gate the spouse fields (husband vs wives) according to deceased's gender. */
  function updateSpouseFieldVisibility() {
    const gender = document.querySelector('input[name="deceasedGender"]:checked')?.value;
    const wivesField = $('wivesField');
    const husbandField = $('husbandField');
    const hint = $('spouseHint');
    if (gender === 'male') {
      wivesField.style.display = '';
      husbandField.style.display = 'none';
      $('husband').value = '0';
      hint.textContent = 'Pewaris laki-laki: masukkan jumlah istri (maksimal 4).';
    } else if (gender === 'female') {
      wivesField.style.display = 'none';
      husbandField.style.display = '';
      $('wives').value = '0';
      hint.textContent = 'Pewaris perempuan: pilih apakah suami masih hidup.';
    } else {
      wivesField.style.display = '';
      husbandField.style.display = 'none';
      hint.textContent = 'Pilih jenis kelamin pewaris di Langkah 1 terlebih dahulu.';
    }
  }

  function updateNetEstatePreview() {
    const estate = readEstateInput();
    const net = FARAIDH.calculateNetEstate(estate);
    $('netEstatePreview').innerHTML = `Harta bersih: <strong>${formatRupiah(net.netEstate)}</strong>`;
  }

  function renderSummaryPreview() {
    const estate = readEstateInput();
    const heirs = readHeirsInput();
    const net = FARAIDH.calculateNetEstate(estate);

    const heirLines = [];
    const heirLabels = {
      husband: 'Suami', wives: 'Istri', sons: 'Anak laki-laki', daughters: 'Anak perempuan',
      fullBrothers: 'Saudara laki-laki sekandung', fullSisters: 'Saudara perempuan sekandung',
      paternalBrothers: 'Saudara laki-laki seayah', paternalSisters: 'Saudara perempuan seayah',
      maternalBrothers: 'Saudara laki-laki seibu', maternalSisters: 'Saudara perempuan seibu'
    };
    for (const [key, label] of Object.entries(heirLabels)) {
      if (heirs[key] > 0) heirLines.push(`<dt>${label}</dt><dd>${heirs[key]}</dd>`);
    }
    if (heirs.father) heirLines.push('<dt>Ayah</dt><dd>Ada</dd>');
    if (heirs.mother) heirLines.push('<dt>Ibu</dt><dd>Ada</dd>');
    if (heirs.paternalGrandfather) heirLines.push('<dt>Kakek (ayah)</dt><dd>Ada</dd>');
    if (heirs.paternalGrandmother) heirLines.push('<dt>Nenek (dari ayah)</dt><dd>Ada</dd>');
    if (heirs.maternalGrandmother) heirLines.push('<dt>Nenek (dari ibu)</dt><dd>Ada</dd>');

    $('summaryPreview').innerHTML = `
      <dl>
        <dt>Jenis kelamin pewaris</dt><dd>${estate.deceasedGender === 'male' ? 'Laki-laki' : estate.deceasedGender === 'female' ? 'Perempuan' : '—'}</dd>
        <dt>Harta kotor</dt><dd>${formatRupiah(estate.totalAssets)}</dd>
        <dt>Total pengurang</dt><dd>${formatRupiah(net.totalDeduction)}</dd>
        <dt>Harta bersih</dt><dd><strong>${formatRupiah(net.netEstate)}</strong></dd>
        ${heirLines.join('')}
      </dl>
      ${heirLines.length === 0 ? '<p style="color:var(--color-danger);margin-top:0.6rem;">Belum ada ahli waris yang dimasukkan.</p>' : ''}
    `;
  }

  function showErrors(errors) {
    const banner = $('errorBanner');
    const list = $('errorList');
    list.innerHTML = errors.map((e) => `<li>${e}</li>`).join('');
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearErrors() {
    $('errorBanner').hidden = true;
    $('errorList').innerHTML = '';
  }

  function statusBadge(status) {
    if (status === 'ashabul_furudh') return '<span class="badge badge--furudh">Ashabul Furudh</span>';
    if (status === 'asabah') return '<span class="badge badge--asabah">\'Ashabah</span>';
    if (status === 'mahjub') return '<span class="badge badge--mahjub">Mahjub</span>';
    return '';
  }

  function runCalculation() {
    clearErrors();
    const estate = readEstateInput();
    const heirs = readHeirsInput();
    const result = FARAIDH.calculateInheritance({ estate, heirs });

    if (!result.success) {
      showErrors(result.errors);
      return;
    }

    lastResult = result;
    renderResults(result, estate);
    goToStep(5);
  }

  function renderResults(result, estate) {
    const { netEstateResult, finalRows, asabahRows, blockedRows, awlApplied, originalBase, awlBase, warnings } = result;

    let html = '';

    html += `<div class="result-summary">
      <div class="result-summary__item"><div class="label">Total Harta</div><div class="value">${formatRupiah(netEstateResult.totalAssets)}</div></div>
      <div class="result-summary__item"><div class="label">Biaya Jenazah</div><div class="value">${formatRupiah(netEstateResult.funeralCost)}</div></div>
      <div class="result-summary__item"><div class="label">Utang</div><div class="value">${formatRupiah(netEstateResult.debt)}</div></div>
      <div class="result-summary__item"><div class="label">Wasiat</div><div class="value">${formatRupiah(netEstateResult.bequest)}</div></div>
      <div class="result-summary__item is-net"><div class="label">Harta Bersih</div><div class="value">${formatRupiah(netEstateResult.netEstate)}</div></div>
    </div>`;

    if (warnings && warnings.length) {
      html += warnings.map((w) => `<div class="alert alert--warning">⚠ ${w}</div>`).join('');
    }

    if (awlApplied) {
      html += `<div class="alert alert--info">
        <strong>Penyesuaian 'Awl diterapkan.</strong><br>
        Total bagian ahli waris melebihi asal masalah. Asal masalah: ${originalBase} → setelah 'Awl: ${awlBase}.
        Setiap bagian dikurangi secara proporsional agar totalnya tetap 100% dari harta bersih.
      </div>`;
    }
    if (result.raddApplied) {
      html += `<div class="alert alert--info">
        <strong>Mekanisme Radd diterapkan.</strong><br>
        Terdapat sisa harta setelah bagian tetap diberikan dan tidak ada \'ashabah yang berhak menerima sisa,
        sehingga sisa harta dikembalikan secara proporsional kepada ahli waris ashabul furudh yang berhak.
      </div>`;
    }

    const allRows = [...finalRows, ...asabahRows];
    const totalPercent = allRows.reduce((acc, r) => acc + FR.fractionToDecimal(r.finalFraction), 0);

    html += `<table class="result-table">
      <thead><tr>
        <th>Ahli Waris</th><th>Status</th><th class="num">Bagian</th><th class="num">Persentase</th><th class="num">Jumlah</th>
      </tr></thead>
      <tbody>`;

    for (const row of allRows) {
      const pct = (FR.fractionToDecimal(row.finalFraction) * 100).toFixed(2).replace('.', ',');
      html += `<tr>
        <td>${row.label}${row.count > 1 ? '' : ''}<span class="reason">${row.reason || ''}</span></td>
        <td>${statusBadge(row.status)}</td>
        <td class="num">${FR.fractionToString(row.finalFraction)}</td>
        <td class="num">${pct}%</td>
        <td class="num">${formatRupiah(row.amount)}</td>
      </tr>`;
      if (row.count > 1) {
        const perPersonFraction = FR.divideFraction(row.finalFraction, { numerator: row.count, denominator: 1 });
        const perPersonAmount = Math.round(row.amount / row.count);
        html += `<tr>
          <td style="padding-left:1.5rem;color:var(--color-muted);font-size:0.85rem;">↳ per orang (${row.count} orang)</td>
          <td></td>
          <td class="num">${FR.fractionToString(perPersonFraction)}</td>
          <td class="num">${(FR.fractionToDecimal(perPersonFraction) * 100).toFixed(2).replace('.', ',')}%</td>
          <td class="num">${formatRupiah(perPersonAmount)}</td>
        </tr>`;
      }
    }

    for (const row of blockedRows) {
      html += `<tr class="row-mahjub">
        <td>${row.label}<span class="reason">Alasan: ${row.reason}</span></td>
        <td>${statusBadge('mahjub')}</td>
        <td class="num">—</td>
        <td class="num">0%</td>
        <td class="num">Rp 0</td>
      </tr>`;
    }

    html += `</tbody></table>`;

    html += `<p style="font-size:0.8rem;color:var(--color-muted);">Total bagian yang didistribusikan: ${(totalPercent * 100).toFixed(2).replace('.', ',')}% dari harta bersih.</p>`;

    html += `<h3 class="section-subtitle">Penjelasan Perhitungan</h3>
      <ol class="explanation-list">
        ${result.explanationSteps.map((s) => `<li>${s}</li>`).join('')}
      </ol>`;

    html += `<div class="alert alert--warning">
      Catatan: Kasus ini dihitung menggunakan metode faraidh umum (pendapat jumhur). Beberapa persoalan
      kewarisan memiliki perbedaan pendapat fiqih — lihat tombol "Referensi Hukum" untuk detail. Untuk perkara
      nyata, konsultasikan dengan ahli faraidh.
    </div>`;

    $('resultsContent').innerHTML = html;
  }

  function buildAuditHtml(result) {
    const pipeline = [
      'INPUT', 'HARTA BERSIH', 'AHLI WARIS YANG BERHAK', 'AHLI WARIS YANG TERHALANG',
      'ASHABUL FURUDH', 'SISA HARTA', "ASHABAH", "AWL / RADD", 'HASIL AKHIR'
    ];
    let html = '<div class="pipeline">';
    pipeline.forEach((p, i) => {
      html += `<div class="pipeline__step">${p}</div>`;
      if (i < pipeline.length - 1) html += `<div class="pipeline__arrow">↓</div>`;
    });
    html += '</div>';
    html += '<h3 class="section-subtitle">Langkah Detail</h3>';
    html += `<ol class="explanation-list">${result.explanationSteps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
    return html;
  }

  function copyResultsToClipboard() {
    if (!lastResult) return;
    const lines = [];
    lines.push('KALKULATOR PEMBAGIAN WARIS ISLAM (FARAIDH)');
    lines.push(`Tanggal perhitungan: ${new Date().toLocaleDateString('id-ID')}`);
    lines.push(`Harta bersih: ${formatRupiah(lastResult.netEstateResult.netEstate)}`);
    lines.push('');
    lines.push('HASIL PEMBAGIAN:');
    for (const row of [...lastResult.finalRows, ...lastResult.asabahRows]) {
      lines.push(`- ${row.label}: ${FR.fractionToString(row.finalFraction)} = ${formatRupiah(row.amount)}`);
    }
    for (const row of lastResult.blockedRows) {
      lines.push(`- ${row.label}: TERHALANG (${row.reason})`);
    }
    lines.push('');
    lines.push('Disclaimer: Hasil ini adalah alat bantu perhitungan, bukan fatwa atau putusan hukum final.');
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const btn = $('btnCopy');
      const original = btn.textContent;
      btn.textContent = 'Tersalin ✓';
      setTimeout(() => { btn.textContent = original; }, 1800);
    }).catch(() => {
      alert('Gagal menyalin otomatis. Silakan salin manual dari tabel hasil.');
    });
  }

  /* ---------------- References modal ---------------- */
  function renderReferencesModal() {
    let html = '';
    html += '<h3 class="section-subtitle" style="border-top:none;margin-top:0;">Sumber Al-Qur\'an</h3>';
    for (const q of REFERENCES.quran) {
      html += `<div class="ref-block">
        <span class="ref-block__tag quran">Sumber Al-Qur'an</span>
        <h4 style="margin:0.3rem 0;">${q.ref}</h4>
        <div class="ref-arabic">${q.arabic}</div>
        <p>${q.translation_id}</p>
        <p class="ref-note">${q.note}<br><em>Relevansi: ${q.relevance}</em></p>
      </div>`;
    }
    html += '<h3 class="section-subtitle">Sumber Hadis</h3>';
    for (const h of REFERENCES.hadith) {
      html += `<div class="ref-block">
        <span class="ref-block__tag hadith">Sumber Hadis</span>
        <h4 style="margin:0.3rem 0;">${h.book}</h4>
        <p>${h.text_summary}</p>
        <p class="ref-note">${h.hadithNumber}<br><em>Relevansi: ${h.relevance}</em></p>
      </div>`;
    }
    html += `<h3 class="section-subtitle">Referensi Hukum Indonesia</h3>`;
    html += `<div class="ref-block">
      <span class="ref-block__tag khi">Sumber KHI</span>
      <h4 style="margin:0.3rem 0;">${REFERENCES.khi.title} — ${REFERENCES.khi.section}</h4>
      <p class="ref-note">${REFERENCES.khi.note}</p>
      ${REFERENCES.khi.articles.map((a) => `<p><strong>${a.article}:</strong> ${a.text_summary}</p>`).join('')}
    </div>`;
    html += '<h3 class="section-subtitle">Perbedaan Pendapat Fiqih</h3>';
    for (const f of REFERENCES.fiqhDifferences) {
      html += `<div class="ref-block">
        <span class="ref-block__tag fiqh">Sumber Fiqih</span>
        <h4 style="margin:0.3rem 0;">${f.topic}</h4>
        <p class="ref-note">${f.note}</p>
      </div>`;
    }
    $('referencesBody').innerHTML = html;
  }

  /* ---------------- Scenarios (Contoh Kasus) ---------------- */
  const SCENARIOS = [
    {
      title: '1. Suami, 1 anak laki-laki, 2 anak perempuan',
      desc: 'Pewaris laki-laki meninggalkan istri, 1 anak laki-laki, dan 2 anak perempuan.',
      estate: { deceasedGender: 'male', totalAssets: 500000000, funeralCost: 10000000, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { wives: 1, sons: 1, daughters: 2 }
    },
    {
      title: '2. Suami, ayah, ibu, dan anak',
      desc: 'Pewaris perempuan meninggalkan suami, ayah, ibu, dan anak.',
      estate: { deceasedGender: 'female', totalAssets: 480000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { husband: 1, father: true, mother: true, sons: 1 }
    },
    {
      title: '3. Ibu, ayah, dan anak',
      desc: 'Pewaris meninggalkan ibu, ayah, dan anak (tanpa pasangan).',
      estate: { deceasedGender: 'male', totalAssets: 300000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { father: true, mother: true, daughters: 1 }
    },
    {
      title: '4. Hanya anak perempuan',
      desc: 'Pewaris hanya memiliki anak perempuan (2 orang), ayah, dan ibu.',
      estate: { deceasedGender: 'male', totalAssets: 240000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { daughters: 2, father: true, mother: true }
    },
    {
      title: '5. Beberapa istri',
      desc: 'Pewaris laki-laki memiliki 2 istri dan 3 anak laki-laki.',
      estate: { deceasedGender: 'male', totalAssets: 800000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { wives: 2, sons: 3 }
    },
    {
      title: "6. Kasus 'Awl",
      desc: 'Suami + ibu + 2 saudara perempuan sekandung — total bagian melebihi harta.',
      estate: { deceasedGender: 'female', totalAssets: 120000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { husband: 1, mother: true, fullSisters: 2 }
    },
    {
      title: '7. Kasus Radd',
      desc: 'Hanya ibu dan 1 anak perempuan — ada sisa harta tanpa \'ashabah.',
      estate: { deceasedGender: 'male', totalAssets: 90000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { mother: true, daughters: 1 }
    },
    {
      title: '8. Ahli waris terhalang',
      desc: 'Anak laki-laki menghalangi saudara kandung dan kakek.',
      estate: { deceasedGender: 'male', totalAssets: 400000000, funeralCost: 0, debt: 0, bequest: 0, otherDeduction: 0 },
      heirs: { wives: 1, sons: 1, fullBrothers: 1, paternalGrandfather: false }
    }
  ];

  function renderScenariosModal() {
    $('scenariosBody').innerHTML = SCENARIOS.map((s, i) => `
      <div class="scenario-item" data-scenario="${i}">
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
      </div>
    `).join('');
    document.querySelectorAll('.scenario-item').forEach((el) => {
      el.addEventListener('click', () => {
        applyScenario(SCENARIOS[Number(el.dataset.scenario)]);
        closeModal('scenariosModal');
      });
    });
  }

  function applyScenario(scenario) {
    const e = scenario.estate;
    document.querySelector(`input[name="deceasedGender"][value="${e.deceasedGender}"]`).checked = true;
    updateSpouseFieldVisibility();
    $('totalAssets').value = e.totalAssets;
    $('funeralCost').value = e.funeralCost || 0;
    $('debt').value = e.debt || 0;
    $('bequest').value = e.bequest || 0;
    $('otherDeduction').value = e.otherDeduction || 0;
    updateNetEstatePreview();

    const h = Object.assign({
      husband: 0, wives: 0, sons: 0, daughters: 0, father: false, mother: false,
      paternalGrandfather: false, paternalGrandmother: false, maternalGrandmother: false,
      fullBrothers: 0, fullSisters: 0, paternalBrothers: 0, paternalSisters: 0,
      maternalBrothers: 0, maternalSisters: 0
    }, scenario.heirs);

    $('husband').value = h.husband;
    $('wives').value = h.wives;
    $('sons').value = h.sons;
    $('daughters').value = h.daughters;
    $('father').checked = h.father;
    $('mother').checked = h.mother;
    $('paternalGrandfather').checked = h.paternalGrandfather;
    $('paternalGrandmother').checked = h.paternalGrandmother;
    $('maternalGrandmother').checked = h.maternalGrandmother;
    $('fullBrothers').value = h.fullBrothers;
    $('fullSisters').value = h.fullSisters;
    $('paternalBrothers').value = h.paternalBrothers;
    $('paternalSisters').value = h.paternalSisters;
    $('maternalBrothers').value = h.maternalBrothers;
    $('maternalSisters').value = h.maternalSisters;

    goToStep(3);
  }

  /* ---------------- Modal helpers ---------------- */
  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  /* ---------------- Wire up events ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-next]').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.next)));
    });
    document.querySelectorAll('[data-prev]').forEach((btn) => {
      btn.addEventListener('click', () => goToStep(Number(btn.dataset.prev)));
    });

    document.querySelectorAll('input[name="deceasedGender"]').forEach((r) => {
      r.addEventListener('change', updateSpouseFieldVisibility);
    });
    updateSpouseFieldVisibility();

    ['totalAssets', 'funeralCost', 'debt', 'bequest', 'otherDeduction'].forEach((id) => {
      $(id).addEventListener('input', updateNetEstatePreview);
    });
    updateNetEstatePreview();

    $('btnCalculate').addEventListener('click', runCalculation);

    $('btnReferences').addEventListener('click', () => { renderReferencesModal(); openModal('referencesModal'); });
    $('closeReferences').addEventListener('click', () => closeModal('referencesModal'));
    $('referencesModal').addEventListener('click', (e) => { if (e.target.id === 'referencesModal') closeModal('referencesModal'); });

    $('btnScenarios').addEventListener('click', () => { renderScenariosModal(); openModal('scenariosModal'); });
    $('closeScenarios').addEventListener('click', () => closeModal('scenariosModal'));
    $('scenariosModal').addEventListener('click', (e) => { if (e.target.id === 'scenariosModal') closeModal('scenariosModal'); });

    $('btnAudit').addEventListener('click', () => {
      if (!lastResult) return;
      $('auditBody').innerHTML = buildAuditHtml(lastResult);
      openModal('auditModal');
    });
    $('closeAudit').addEventListener('click', () => closeModal('auditModal'));
    $('auditModal').addEventListener('click', (e) => { if (e.target.id === 'auditModal') closeModal('auditModal'); });

    $('btnCopy').addEventListener('click', copyResultsToClipboard);
    $('btnPrint').addEventListener('click', () => window.print());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['referencesModal', 'scenariosModal', 'auditModal'].forEach((id) => closeModal(id));
      }
    });
  });
})();