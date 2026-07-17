/* STEG Status — frontend */
(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // i18n (FR default, AR with RTL)
  // -------------------------------------------------------------------------
  const I18N = {
    fr: {
      tagline: "Coupures d'électricité — Tunisie",
      navMap: 'Carte', navHistory: 'Historique', navStats: 'Statistiques',
      madeBy: 'Réalisé par',
      zonesDown: 'zones en coupure confirmée',
      zonesSuspected: 'zones signalées',
      activeReports: 'signalements actifs',
      panelTitle: 'Le courant est coupé chez vous ?',
      panelHelp: "Choisissez votre délégation sur la carte ou ci-dessous, puis signalez la coupure. La zone passe en rouge sur la carte dès que plusieurs personnes confirment.",
      useLocation: 'Utiliser ma position',
      governorate: 'Gouvernorat',
      delegation: 'Délégation',
      chooseGov: '— Choisir un gouvernorat —',
      chooseDel: '— Choisir une délégation —',
      reportDown: '⚡ Signaler une coupure',
      reportBack: "Le courant est rétabli ici",
      legendDown: 'Coupure confirmée',
      legendSuspect: (n) => `Signalements en cours (moins de ${n})`,
      legendRestoring: 'Retour du courant signalé',
      legendOk: 'Aucun signalement',
      footnote: "Données fournies par les citoyens, sans vérification officielle. Les signalements expirent automatiquement après 90 minutes. Aucune donnée personnelle n'est conservée.",
      statusOk: 'Aucun signalement',
      statusSuspected: 'Signalements en cours',
      statusDown: 'Coupure confirmée',
      statusRestoring: 'Retour signalé',
      metaReports: (n, t) => `${n} signalement${n > 1 ? 's' : ''} · confirmé à partir de ${t}`,
      sent: 'Merci, votre signalement a été pris en compte.',
      sentBack: 'Merci, le retour du courant a été signalé.',
      already: (m) => `Vous avez déjà signalé cette zone. Réessayez dans ${m} minutes.`,
      rateLimited: 'Trop de signalements pour le moment. Réessayez plus tard.',
      netError: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      geoUnsupported: "La géolocalisation n'est pas disponible sur cet appareil.",
      geoDenied: 'Position refusée. Choisissez votre délégation manuellement.',
      geoOutside: 'Votre position semble hors de Tunisie. Choisissez manuellement.',
      updatedAgo: (s) => `mis à jour il y a ${s} s`,
      locating: 'Localisation…',
      faqTitle: 'Questions fréquentes',
      faqQ1: 'Comment fonctionne STEG Status ?',
      faqA1: "Chaque visiteur peut signaler une coupure de courant dans sa délégation. Dès que plusieurs personnes signalent la même zone, la coupure est confirmée et apparaît en rouge sur la carte, en temps réel. Les signalements expirent automatiquement, donc la carte reflète toujours la situation actuelle.",
      faqQ2: 'Ce site est-il un site officiel de la STEG ?',
      faqA2: "Non. STEG Status est un site citoyen indépendant, sans aucun lien avec la Société Tunisienne de l'Électricité et du Gaz. Les données proviennent uniquement des signalements des visiteurs. Pour toute information officielle ou urgence, contactez directement la STEG.",
      faqQ3: "Pourquoi ma zone n'apparaît pas en rouge ?",
      faqA3: "Une zone passe en rouge quand suffisamment de personnes différentes signalent une coupure. Si vous êtes parmi les premiers, elle apparaît d'abord en orange (« signalements en cours »). Partagez le lien avec vos voisins pour confirmer plus vite.",
      faqQ4: "Une coupure d'électricité est-elle en cours en Tunisie aujourd'hui ?",
      faqA4: "La carte ci-dessus montre en direct les coupures d'électricité signalées aujourd'hui dans toute la Tunisie, gouvernorat par gouvernorat. Consultez aussi la page Historique pour les coupures récentes et la page Statistiques pour les zones les plus touchées.",
      disclaimer: 'Site indépendant, non affilié à la STEG.',
      shareZone: 'Partager cette zone',
      linkCopied: 'Lien copié !',
      shareText: (z) => `Coupure d'électricité à ${z} ? Signale-la et suis la situation en direct :`,
    },
    ar: {
      tagline: 'انقطاع الكهرباء — تونس',
      navMap: 'الخريطة', navHistory: 'السجلّ', navStats: 'إحصائيات',
      madeBy: 'من إنجاز',
      zonesDown: 'مناطق انقطاع مؤكّد',
      zonesSuspected: 'مناطق بها بلاغات',
      activeReports: 'بلاغات نشطة',
      panelTitle: 'انقطعت الكهرباء عندك؟',
      panelHelp: 'اختر معتمديتك على الخريطة أو من القائمة، ثم أبلغ عن الانقطاع. تتحوّل المنطقة إلى الأحمر على الخريطة بمجرّد تأكيد عدّة أشخاص.',
      useLocation: 'استعمال موقعي',
      governorate: 'الولاية',
      delegation: 'المعتمدية',
      chooseGov: '— اختر الولاية —',
      chooseDel: '— اختر المعتمدية —',
      reportDown: '⚡ الإبلاغ عن انقطاع',
      reportBack: 'الكهرباء تعمل',
      legendDown: 'انقطاع مؤكّد',
      legendSuspect: (n) => `بلاغات جارية (أقل من ${n})`,
      legendRestoring: 'تمّ الإبلاغ عن رجوع الكهرباء',
      legendOk: 'لا توجد بلاغات',
      footnote: 'بيانات مقدّمة من المواطنين دون تحقّق رسمي. تنتهي صلاحية البلاغات تلقائيًا بعد 90 دقيقة. لا يتمّ الاحتفاظ بأي بيانات شخصية.',
      statusOk: 'لا توجد بلاغات',
      statusSuspected: 'بلاغات جارية',
      statusDown: 'انقطاع مؤكّد',
      statusRestoring: 'تمّ الإبلاغ عن الرجوع',
      metaReports: (n, t) => `${n} بلاغ · يُؤكَّد بداية من ${t}`,
      sent: 'شكرًا، تمّ تسجيل بلاغك.',
      sentBack: 'شكرًا، تمّ الإبلاغ عن رجوع الكهرباء.',
      already: (m) => `سبق أن أبلغت عن هذه المنطقة. أعد المحاولة بعد ${m} دقيقة.`,
      rateLimited: 'عدد كبير من البلاغات حاليًا. أعد المحاولة لاحقًا.',
      netError: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك.',
      geoUnsupported: 'تحديد الموقع غير متوفّر على هذا الجهاز.',
      geoDenied: 'تمّ رفض تحديد الموقع. اختر معتمديتك يدويًا.',
      geoOutside: 'يبدو أنّ موقعك خارج تونس. اختر يدويًا.',
      updatedAgo: (s) => `آخر تحديث منذ ${s} ثانية`,
      locating: 'جارٍ تحديد الموقع…',
      faqTitle: 'أسئلة شائعة',
      faqQ1: 'كيف يعمل STEG Status؟',
      faqA1: 'يمكن لكل زائر الإبلاغ عن انقطاع الكهرباء في معتمديته. بمجرد أن يبلغ عدة أشخاص عن نفس المنطقة، يتأكّد الانقطاع وتظهر المنطقة بالأحمر على الخريطة في الوقت الفعلي. تنتهي صلاحية البلاغات تلقائيًا، فتعكس الخريطة دائمًا الوضع الحالي.',
      faqQ2: 'هل هذا موقع رسمي تابع للشركة التونسية للكهرباء والغاز؟',
      faqA2: 'لا. STEG Status موقع مواطني مستقل، لا علاقة له بالشركة التونسية للكهرباء والغاز. البيانات مصدرها بلاغات الزوّار فقط. للمعلومات الرسمية أو الحالات المستعجلة، اتصل مباشرة بالشركة التونسية للكهرباء والغاز.',
      faqQ3: 'لماذا لا تظهر منطقتي بالأحمر؟',
      faqA3: 'تتحوّل المنطقة إلى الأحمر عندما يبلغ عدد كافٍ من الأشخاص المختلفين عن انقطاع. إذا كنت من الأوائل، تظهر أولاً بالبرتقالي («بلاغات جارية»). شارك الرابط مع جيرانك لتأكيد أسرع.',
      faqQ4: 'هل يوجد انقطاع كهرباء في تونس اليوم؟',
      faqA4: 'الخريطة أعلاه تعرض مباشرةً انقطاعات الكهرباء المبلّغ عنها اليوم في كامل تونس، ولاية بولاية. راجع أيضًا صفحة السجلّ للانقطاعات الأخيرة وصفحة الإحصائيات لأكثر المناطق تضرّرًا.',
      disclaimer: 'موقع مستقل، غير تابع للشركة التونسية للكهرباء والغاز.',
      shareZone: 'مشاركة هذه المنطقة',
      linkCopied: 'تمّ نسخ الرابط!',
      shareText: (z) => `انقطاع كهرباء في ${z}؟ أبلغ عنه وتابع الوضع مباشرة:`,
    },
  };
  let lang = localStorage.getItem('kahraba-lang') || 'fr';
  const t = (key, ...args) => {
    const v = I18N[lang][key];
    return typeof v === 'function' ? v(...args) : v;
  };

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  let map, zoneLayer;
  let features = [];              // delegation features
  const layersById = new Map();   // delegation id -> leaflet layer
  let status = { regions: {}, totals: {}, thresholds: { confirm: 10 }, generated_at: Date.now() };
  let selectedId = localStorage.getItem('kahraba-region') || null;

  const $ = (id) => document.getElementById(id);

  // -------------------------------------------------------------------------
  // Rendering helpers
  // -------------------------------------------------------------------------
  const STYLE = {
    ok:        { fillColor: '#1c2a41', fillOpacity: 0.55, color: '#31415c', weight: 1 },
    suspected: { fillColor: '#ffb54d', fillOpacity: 0.55, color: '#ffb54d', weight: 1.2 },
    down:      { fillColor: '#ef5350', fillOpacity: 0.75, color: '#ff8a80', weight: 1.4 },
    restoring: { fillColor: '#35c99a', fillOpacity: 0.55, color: '#35c99a', weight: 1.2 },
  };

  const regionStatus = (id) => (status.regions[id] && status.regions[id].status) || 'ok';

  function styleFor(id) {
    const s = { ...STYLE[regionStatus(id)] };
    if (id === selectedId) { s.weight = 3; s.color = '#ffd28f'; }
    return s;
  }

  function delName(props) { return lang === 'ar' ? props.del_ar : props.del_fr; }
  function govName(props) { return lang === 'ar' ? props.gouv_ar : props.gouv_fr; }

  function restyleAll() {
    for (const [id, layer] of layersById) {
      layer.setStyle(styleFor(id));
      const el = layer.getElement && layer.getElement();
      if (el) el.classList.toggle('zone-down', regionStatus(id) === 'down');
      layer.setTooltipContent(tooltipHtml(id));
    }
  }

  function tooltipHtml(id) {
    const f = features.find((x) => x.properties.id === id);
    const r = status.regions[id];
    const line2 = r && r.down
      ? `${t('status' + cap(r.status))} · ${r.down}`
      : t('statusOk');
    return `<div class="tip-name">${delName(f.properties)} — ${govName(f.properties)}</div>` +
           `<div class="tip-status">${line2}</div>`;
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // -------------------------------------------------------------------------
  // i18n application
  // -------------------------------------------------------------------------
  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    $('lang-toggle').textContent = lang === 'fr' ? 'العربية' : 'Français';
    $('legend-suspect-label').textContent = t('legendSuspect', status.thresholds.confirm);
    buildGovSelect();
    if (selectedId) showSelected(selectedId, false);
    restyleAll();
    renderTotals();
  }

  // -------------------------------------------------------------------------
  // Selects
  // -------------------------------------------------------------------------
  function govList() {
    const seen = new Map();
    for (const f of features) {
      if (!seen.has(f.properties.gouv_id)) seen.set(f.properties.gouv_id, f.properties);
    }
    return [...seen.values()].sort((a, b) => govName(a).localeCompare(govName(b), lang));
  }

  function buildGovSelect(preserve = true) {
    const sel = $('gov-select');
    const current = preserve ? sel.value : '';
    sel.innerHTML = `<option value="">${t('chooseGov')}</option>` +
      govList().map((p) => `<option value="${p.gouv_id}">${govName(p)}</option>`).join('');
    if (current) sel.value = current;
    buildDelSelect();
  }

  function buildDelSelect() {
    const gov = $('gov-select').value;
    const sel = $('del-select');
    if (!gov) { sel.innerHTML = ''; sel.disabled = true; return; }
    const dels = features
      .filter((f) => f.properties.gouv_id === gov)
      .sort((a, b) => delName(a.properties).localeCompare(delName(b.properties), lang));
    sel.innerHTML = `<option value="">${t('chooseDel')}</option>` +
      dels.map((f) => `<option value="${f.properties.id}">${delName(f.properties)}</option>`).join('');
    sel.disabled = false;
    if (selectedId && dels.some((f) => f.properties.id === selectedId)) sel.value = selectedId;
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------
  function showSelected(id, pan = true) {
    selectedId = id;
    localStorage.setItem('kahraba-region', id);
    const f = features.find((x) => x.properties.id === id);
    if (!f) return;

    $('selected-card').hidden = false;
    $('sel-name').textContent = delName(f.properties);
    $('sel-gov').textContent = govName(f.properties);

    const st = regionStatus(id);
    const badge = $('sel-badge');
    badge.className = 'badge badge-' + st;
    badge.textContent = t('status' + cap(st));

    const r = status.regions[id];
    $('sel-meta').textContent = r && r.down
      ? t('metaReports', r.down, status.thresholds.confirm)
      : t('metaReports', 0, status.thresholds.confirm);

    $('gov-select').value = f.properties.gouv_id;
    buildDelSelect();
    $('del-select').value = id;
    $('feedback').textContent = '';

    restyleAll();
    if (pan) {
      const layer = layersById.get(id);
      if (layer) map.fitBounds(layer.getBounds(), { maxZoom: 10, padding: [30, 30] });
    }
  }

  // -------------------------------------------------------------------------
  // API
  // -------------------------------------------------------------------------
  async function refreshStatus() {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      status = await res.json();
      restyleAll();
      renderTotals();
      if (selectedId) showSelected(selectedId, false);
    } catch (_) { /* keep last known state */ }
  }

  function renderTotals() {
    $('stat-confirmed').textContent = status.totals.confirmed ?? '–';
    $('stat-suspected').textContent = status.totals.suspected ?? '–';
    $('stat-reports').textContent = status.totals.reports ?? '–';
    $('legend-suspect-label').textContent = t('legendSuspect', status.thresholds.confirm);
  }

  async function sendReport(type) {
    if (!selectedId) return;
    const fb = $('feedback');
    fb.className = 'feedback';
    $('report-down').disabled = true;
    $('report-back').disabled = true;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: selectedId, type }),
      });
      if (res.ok) {
        fb.classList.add('good');
        fb.textContent = type === 'down' ? t('sent') : t('sentBack');
        await refreshStatus();
      } else {
        const body = await res.json().catch(() => ({}));
        fb.classList.add('bad');
        if (res.status === 409) fb.textContent = t('already', body.cooldown_min || 20);
        else if (res.status === 429) fb.textContent = t('rateLimited');
        else fb.textContent = t('netError');
      }
    } catch (_) {
      fb.classList.add('bad');
      fb.textContent = t('netError');
    } finally {
      setTimeout(() => {
        $('report-down').disabled = false;
        $('report-back').disabled = false;
      }, 1500);
    }
  }

  async function shareZone() {
    if (!selectedId) return;
    const f = features.find((x) => x.properties.id === selectedId);
    const url = `${location.origin}/?zone=${selectedId}`;
    const title = 'STEG Status';
    const text = t('shareText', delName(f.properties));
    const fb = $('feedback');
    fb.className = 'feedback';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        fb.classList.add('good');
        fb.textContent = t('linkCopied');
      }
    } catch (_) { /* user cancelled the share sheet */ }
  }

  // -------------------------------------------------------------------------
  // Geolocation → point-in-polygon (ray casting)
  // -------------------------------------------------------------------------
  function pointInRing(pt, ring) {
    const [x, y] = pt;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pointInFeature(pt, geom) {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      if (pointInRing(pt, poly[0])) {
        let inHole = false;
        for (let h = 1; h < poly.length; h++) if (pointInRing(pt, poly[h])) { inHole = true; break; }
        if (!inHole) return true;
      }
    }
    return false;
  }

  function locate() {
    const fb = $('feedback');
    if (!navigator.geolocation) { alert(t('geoUnsupported')); return; }
    const btn = $('locate-btn');
    const label = btn.querySelector('[data-i18n]');
    label.textContent = t('locating');
    btn.disabled = true;
    const restore = () => { label.textContent = t('useLocation'); btn.disabled = false; };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        restore();
        const pt = [pos.coords.longitude, pos.coords.latitude];
        const hit = features.find((f) => pointInFeature(pt, f.geometry));
        if (hit) showSelected(hit.properties.id);
        else { $('selected-card').hidden = false; fb.className = 'feedback bad'; fb.textContent = t('geoOutside'); }
      },
      () => {
        restore();
        $('selected-card').hidden = false;
        fb.className = 'feedback bad';
        fb.textContent = t('geoDenied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // -------------------------------------------------------------------------
  // "Updated X s ago" ticker
  // -------------------------------------------------------------------------
  setInterval(() => {
    const s = Math.max(0, Math.round((Date.now() - status.generated_at) / 1000));
    $('updated-ago').textContent = t('updatedAgo', s);
  }, 1000);

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  async function init() {
    map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([34.1, 9.4], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 13,
    }).addTo(map);

    const [delegations, governorates] = await Promise.all([
      fetch('data/delegations.geojson').then((r) => r.json()),
      fetch('data/governorates.geojson').then((r) => r.json()),
    ]);
    features = delegations.features;

    zoneLayer = L.geoJSON(delegations, {
      style: (f) => styleFor(f.properties.id),
      onEachFeature: (f, layer) => {
        layersById.set(f.properties.id, layer);
        layer.bindTooltip(tooltipHtml(f.properties.id), { sticky: true, className: 'zone-tip' });
        layer.on('click', () => showSelected(f.properties.id, false));
      },
    }).addTo(map);

    // Governorate borders on top, non-interactive.
    L.geoJSON(governorates, {
      style: { fill: false, color: '#5a6d8c', weight: 1.6, opacity: 0.8 },
      interactive: false,
    }).addTo(map);

    map.fitBounds(zoneLayer.getBounds(), { padding: [10, 10] });

    // Wire up UI
    $('gov-select').addEventListener('change', buildDelSelect);
    $('del-select').addEventListener('change', (e) => { if (e.target.value) showSelected(e.target.value); });
    $('report-down').addEventListener('click', () => sendReport('down'));
    $('report-back').addEventListener('click', () => sendReport('restored'));
    $('share-zone').addEventListener('click', shareZone);
    $('locate-btn').addEventListener('click', locate);
    $('lang-toggle').addEventListener('click', () => {
      lang = lang === 'fr' ? 'ar' : 'fr';
      localStorage.setItem('kahraba-lang', lang);
      applyLang();
    });

    // Shareable links: /?zone=TN13A preselects and zooms to a delegation.
    const zoneParam = new URLSearchParams(location.search).get('zone');
    if (zoneParam && layersById.has(zoneParam)) selectedId = zoneParam;

    applyLang();
    await refreshStatus();
    if (zoneParam && layersById.has(zoneParam)) showSelected(zoneParam, true);
    setInterval(refreshStatus, 60_000);
  }

  init();
})();
