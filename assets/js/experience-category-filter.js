/**
 * Experience page — category filter (desktop tabs + mobile select).
 * Options can be filled from GET /api/websites/experience/filter-options (distinct categories).
 *
 * API: GET /api/websites/experience?category=<slug> (omit = all categories).
 */
(function () {
  /**
   * Stable slug from label (must match server slugFromLabel + PostgreSQL).
   * @param {string} label
   * @returns {string}
   */
  function slugFromExperienceLabel(label) {
    if (!label || typeof label !== 'string') return '';
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Default when API not loaded yet (footer deep-links). */
  const FALLBACK_CATEGORY_SLUGS = new Set(['residential', 'commercial', 'industrial', 'institutional']);

  /** @type {{ slug: string, label: string }[]} */
  let currentCategoryOptions = [
    { slug: '', label: 'All Categories' },
    { slug: 'residential', label: 'Residential' },
    { slug: 'commercial', label: 'Commercial' },
    { slug: 'industrial', label: 'Industrial' },
    { slug: 'institutional', label: 'Institutional' },
  ];

  function getCategoryRowsForRender() {
    return currentCategoryOptions;
  }

  function getAllowedCategorySlugs() {
    const s = new Set();
    currentCategoryOptions.forEach((o) => {
      if (o.slug) s.add(o.slug);
    });
    return s;
  }

  /**
   * Replace category filter options (from API). Always keeps "All Categories" first.
   * @param {{ slug: string, label: string }[]} rows — no "all" row; distinct labels/slugs from server
   */
  function setExperienceCategoryOptionsFromApi(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const seen = new Set(['']);
    const next = [{ slug: '', label: 'All Categories' }];
    for (const r of list) {
      const label = r && r.label != null ? String(r.label).trim() : '';
      let slug = r && r.slug != null ? String(r.slug).trim().toLowerCase() : '';
      if (!label) continue;
      if (!slug) slug = slugFromExperienceLabel(label);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      next.push({ slug, label });
    }
    currentCategoryOptions = next.length > 1 ? next : currentCategoryOptions;
  }

  /**
   * Map URL ?category= value to API slug. Empty string = all categories.
   * @param {string|null|undefined} raw
   * @returns {string}
   */
  function normalizeExperienceCategoryParam(raw) {
    const s = String(raw == null ? '' : raw)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
    if (!s || s === 'all') return '';
    const allowed = getAllowedCategorySlugs();
    if (allowed.has(s)) return s;
    if (allowed.size <= FALLBACK_CATEGORY_SLUGS.size) {
      if (FALLBACK_CATEGORY_SLUGS.has(s)) return s;
      if (s === 'multi-residential' || s === 'multiresidential' || s.includes('resident')) return 'residential';
      if (s.includes('commercial')) return 'commercial';
      if (s.includes('industrial')) return 'industrial';
      if (s.includes('institution')) return 'institutional';
    }
    return '';
  }

  /**
   * Canonicalize category for URL/API; empty = all.
   * @param {string} value
   * @returns {string}
   */
  function canonicalizeCategoryValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = normalizeExperienceCategoryParam(raw);
    if (!normalized) return '';
    const allowed = getAllowedCategorySlugs();
    if (allowed.has(normalized)) return normalized;
    return '';
  }

  const TAB_BTN_CLASS =
    'border-2 border-slate-300 text-[#4A5565] font-["Roboto_Condensed"] leading-5 tracking-widest uppercase font-semibold text-base h-12 px-6 py-3 transition-colors aria-selected:bg-red-200 aria-selected:text-red-500 aria-selected:border-none';

  function populateExperienceCategorySelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    getCategoryRowsForRender().forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.slug;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    });
  }

  /**
   * @param {HTMLElement} tabsEl
   * @param {string} selectedSlug
   * @param {HTMLSelectElement|null} selectEl
   */
  function renderExperienceCategoryTabs(tabsEl, selectedSlug, selectEl) {
    if (!tabsEl) return;
    tabsEl.innerHTML = '';
    getCategoryRowsForRender().forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = TAB_BTN_CLASS;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-category', opt.slug);
      btn.setAttribute('aria-selected', opt.slug === selectedSlug ? 'true' : 'false');
      btn.id = opt.slug ? `experience-cat-${opt.slug}` : 'experience-cat-all';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        if (!selectEl) return;
        selectEl.value = opt.slug;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      });
      tabsEl.appendChild(btn);
    });
  }

  function updateExperienceCategoryTabSelection(tabsEl, selectedSlug) {
    if (!tabsEl) return;
    tabsEl.querySelectorAll('[data-category]').forEach((btn) => {
      const slug = btn.getAttribute('data-category') || '';
      btn.setAttribute('aria-selected', slug === selectedSlug ? 'true' : 'false');
    });
  }

  /**
   * @param {{ tabsEl: HTMLElement|null, selectEl: HTMLSelectElement|null, selectedSlug: string, onSelect: (slug: string) => void }} opts
   */
  function setupExperienceCategoryFilter(opts) {
    const tabsEl = opts && opts.tabsEl;
    const selectEl = opts && opts.selectEl;
    const selectedSlug = opts && opts.selectedSlug != null ? opts.selectedSlug : '';
    const onSelect = opts && typeof opts.onSelect === 'function' ? opts.onSelect : function () {};

    populateExperienceCategorySelect(selectEl);
    renderExperienceCategoryTabs(tabsEl, selectedSlug, selectEl);

    if (selectEl) {
      selectEl.value = selectedSlug;
      selectEl.addEventListener('change', (e) => {
        const slug = canonicalizeCategoryValue(String(e.target.value || ''));
        onSelect(slug);
      });
    }
  }

  function updateExperienceCategorySelection(tabsOrLegacyContainer, selectElOrSlug, selectedSlug) {
    if (arguments.length === 2) {
      updateExperienceCategoryTabSelection(tabsOrLegacyContainer, String(selectElOrSlug || ''));
      return;
    }
    const slug = selectedSlug || '';
    if (selectElOrSlug && 'value' in selectElOrSlug) selectElOrSlug.value = slug;
    updateExperienceCategoryTabSelection(tabsOrLegacyContainer, slug);
  }

  /** @deprecated */
  function renderExperienceCategoryFilter(container, selectedSlug, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', 'Project category');
    container.className =
      'flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-2 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory md:snap-none';
    const BTN_CLASS =
      'border-2 border-slate-300 text-[#4A5565] font-[\'Roboto_Condensed\'] leading-5 tracking-widest uppercase font-semibold text-sm sm:text-base min-h-12 px-4 sm:px-6 py-2.5 shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 aria-selected:bg-red-200 aria-selected:text-red-500 aria-selected:border-transparent';
    getCategoryRowsForRender().forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-category', opt.slug);
      btn.setAttribute('aria-selected', opt.slug === selectedSlug ? 'true' : 'false');
      btn.id = opt.slug ? `experience-cat-${opt.slug}` : 'experience-cat-all';
      btn.className = `${BTN_CLASS} snap-start`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        onSelect(opt.slug);
      });
      container.appendChild(btn);
    });
  }

  window.OWP_slugFromExperienceLabel = slugFromExperienceLabel;
  window.OWP_setExperienceCategoryOptionsFromApi = setExperienceCategoryOptionsFromApi;
  window.OWP_getExperienceCategoryOptions = getCategoryRowsForRender;
  window.OWP_normalizeExperienceCategoryParam = normalizeExperienceCategoryParam;
  window.OWP_canonicalizeExperienceCategoryValue = canonicalizeCategoryValue;
  window.OWP_populateExperienceCategorySelect = populateExperienceCategorySelect;
  window.OWP_renderExperienceCategoryTabs = renderExperienceCategoryTabs;
  window.OWP_updateExperienceCategoryTabSelection = updateExperienceCategoryTabSelection;
  window.OWP_setupExperienceCategoryFilter = setupExperienceCategoryFilter;
  window.OWP_renderExperienceCategoryFilter = renderExperienceCategoryFilter;
  window.OWP_updateExperienceCategorySelection = updateExperienceCategorySelection;
})();
