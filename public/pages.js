/* STEG Status — history & statistics pages */
(() => {
  'use strict';

  const I18N = {
    fr: {
      tagline: "Coupures d'électricité — Tunisie",
      navMap: 'Carte', navHistory: 'Historique', navStats: 'Statistiques',
      madeBy: 'Réalisé par',
      historyTitle: 'Historique des coupures confirmées',
      historyHelp: 'Chaque ligne correspond à une coupure confirmée par les signalements citoyens, du début à la fin.',
      thZone: 'Zone', thStart: 'Début', thEnd: 'Fin', thDuration: 'Durée', thPeak: 'Pic de signalements',
      thEvents: 'Coupures',
      loading: 'Chargement…',
      empty: 'Aucune coupure confirmée pour le moment. Bonne nouvelle !',
      ongoing: 'en cours',
      statsTitle: 'Statistiques',
      kpiEvents: 'coupures confirmées (30 j)',
      kpiDuration: 'durée moyenne',
      kpiOngoing: 'en cours',
      chartTitle: 'Signalements par jour (14 derniers jours)',
      topTitle: 'Zones les plus touchées (7 j)',
      govTitle: 'Coupures par gouvernorat (30 j)',
      governorate: 'Gouvernorat',
      reportsUnit: 'signalements',
      noData: 'Pas encore de données.',
      mins: (m) => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`,
    },
    ar: {
      tagline: 'انقطاع الكهرباء — تونس',
      navMap: 'الخريطة', navHistory: 'السجلّ', navStats: 'إحصائيات',
      madeBy: 'من إنجاز',
      historyTitle: 'سجلّ الانقطاعات المؤكّدة',
      historyHelp: 'كل سطر يمثّل انقطاعًا مؤكّدًا عبر بلاغات المواطنين، من بدايته إلى نهايته.',
      thZone: 'المنطقة', thStart: 'البداية', thEnd: 'النهاية', thDuration: 'المدّة', thPeak: 'أقصى عدد بلاغات',
      thEvents: 'انقطاعات',
      loading: 'جارٍ التحميل…',
      empty: 'لا توجد انقطاعات مؤكّدة حاليًا. خبر جيّد!',
      ongoing: 'جارٍ',
      statsTitle: 'إحصائيات',
      kpiEvents: 'انقطاعات مؤكّدة (30 يومًا)',
      kpiDuration: 'متوسّط المدّة',
      kpiOngoing: 'جارية الآن',
      chartTitle: 'البلاغات اليومية (آخر 14 يومًا)',
      topTitle: 'أكثر المناطق تضرّرًا (7 أيام)',
      govTitle: 'الانقطاعات حسب الولاية (30 يومًا)',
      governorate: 'الولاية',
      reportsUnit: 'بلاغ',
      noData: 'لا توجد بيانات بعد.',
      mins: (m) => m >= 60 ? `${Math.floor(m / 60)} س ${m % 60} د` : `${m} د`,
    },
  };

  let lang = localStorage.getItem('kahraba-lang') || 'fr';
  const t = (key, ...args) => {
    const v = I18N[lang][key];
    return typeof v === 'function' ? v(...args) : v;
  };
  const $ = (id) => document.getElementById(id);
  const page = document.body.dataset.page;
  let data = null;

  const locale = () => (lang === 'ar' ? 'ar-TN' : 'fr-TN');
  const fmtDT = (ms) => new Date(ms).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const zoneName = (r) => (lang === 'ar' ? `${r.del_ar} — ${r.gouv_ar}` : `${r.del_fr} — ${r.gouv_fr}`);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $('lang-toggle').textContent = lang === 'fr' ? 'العربية' : 'Français';
    if (data) render();
  }

  // ------------------------------------------------------------------ history
  function renderHistory() {
    const body = $('history-body');
    const events = data.events;
    if (!events.length) {
      body.innerHTML = `<tr><td colspan="5" class="empty">${t('empty')}</td></tr>`;
      return;
    }
    body.innerHTML = events.map((e) => `
      <tr>
        <td class="cell-zone">${esc(zoneName(e))}</td>
        <td class="cell-mono">${fmtDT(e.started_at)}</td>
        <td class="cell-mono">${e.ended_at ? fmtDT(e.ended_at) : `<span class="badge badge-down">${t('ongoing')}</span>`}</td>
        <td class="cell-mono">${e.duration_min != null ? t('mins', e.duration_min) : '—'}</td>
        <td class="cell-mono">${e.peak_reports}</td>
      </tr>`).join('');
  }

  // -------------------------------------------------------------------- stats
  function renderStats() {
    const ev = data.events_30d;
    $('kpi-events').textContent = ev.total;
    $('kpi-ongoing').textContent = ev.ongoing;
    $('kpi-duration').textContent = ev.avg_duration_min != null ? t('mins', ev.avg_duration_min) : '—';

    drawChart($('daily-chart'), data.daily_reports_14d);

    const top = $('top-regions');
    top.innerHTML = data.top_regions_7d.length
      ? data.top_regions_7d.map((r) => `
          <li><span class="rank-name">${esc(zoneName(r))}</span>
          <span class="rank-num">${r.reports} ${t('reportsUnit')}</span></li>`).join('')
      : `<li class="empty">${t('noData')}</li>`;

    const gov = $('gov-body');
    gov.innerHTML = data.governorates_30d.length
      ? data.governorates_30d.map((g) => `
          <tr><td>${esc(lang === 'ar' ? g.gouv_ar : g.gouv_fr)}</td><td class="cell-mono">${g.events}</td></tr>`).join('')
      : `<tr><td colspan="2" class="empty">${t('noData')}</td></tr>`;
  }

  // Fill in missing days so the chart always shows a continuous 14-day window.
  function last14Days(rows) {
    const map = new Map(rows.map((r) => [r.day, r.n]));
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, n: map.get(key) || 0, label: d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }) });
    }
    return out;
  }

  function drawChart(el, rows) {
    const days = last14Days(rows);
    const max = Math.max(1, ...days.map((d) => d.n));
    const W = 700, H = 220, pad = { t: 14, r: 8, b: 34, l: 8 };
    const bw = (W - pad.l - pad.r) / days.length;

    let bars = '';
    days.forEach((d, i) => {
      const h = Math.round(((H - pad.t - pad.b) * d.n) / max);
      const x = pad.l + i * bw + bw * 0.15;
      const y = H - pad.b - h;
      bars += `<rect x="${x.toFixed(1)}" y="${y}" width="${(bw * 0.7).toFixed(1)}" height="${h}" rx="3" fill="var(--amber)" fill-opacity="${d.n ? 0.85 : 0.15}"><title>${d.label}: ${d.n}</title></rect>`;
      if (d.n) bars += `<text x="${(x + bw * 0.35).toFixed(1)}" y="${y - 5}" text-anchor="middle" class="chart-val">${d.n}</text>`;
      if (i % 2 === 1) bars += `<text x="${(x + bw * 0.35).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="chart-lbl">${d.label}</text>`;
    });

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="var(--line-strong, #31415c)" stroke-width="1"/>
      ${bars}</svg>`;
  }

  // --------------------------------------------------------------------- boot
  function render() { page === 'history' ? renderHistory() : renderStats(); }

  async function init() {
    $('lang-toggle').addEventListener('click', () => {
      lang = lang === 'fr' ? 'ar' : 'fr';
      localStorage.setItem('kahraba-lang', lang);
      applyLang();
    });
    applyLang();
    try {
      const url = page === 'history' ? '/api/history?limit=200' : '/api/stats';
      data = await (await fetch(url, { cache: 'no-store' })).json();
      render();
    } catch (_) { /* leave loading state */ }
  }

  init();
})();
