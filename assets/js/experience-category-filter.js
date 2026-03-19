/**
 * Experience page — category filter (desktop tabs + mobile select), aligned with company filter UX.
 * API field is `category` (sync maps Airtable `category` → DB).
 * API: GET /api/websites/experience?category=<slug> (omit param = all categories).
 *
 * @see methodology/experience-category-filter-feature.md (Figma alignment, data flow)
 * @see methodology/owpc-coding-policy-v1.md (URL state, accessibility)
 */
(function () {
  const OPTIONS = [
    { slug: '', label: 'All Categories' },
    { slug: 'residential', label: 'Residential' },
    { slug: 'commercial', label: 'Commercial' },
    { slug: 'industrial', label: 'Industrial' },
    { slug: 'institutional', label: 'Institutional' },
  ];

  const VALID_CATEGORY_SLUGS = new Set(['residential', 'commercial', 'industrial', 'institutional']);

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
    if (VALID_CATEGORY_SLUGS.has(s)) return s;
    if (s === 'multi-residential' || s === 'multiresidential' || s.includes('resident')) return 'residential';
    if (s.includes('commercial')) return 'commercial';
    if (s.includes('industrial')) return 'industrial';
    if (s.includes('institution')) return 'institutional';
    return '';
  }

  /**
   * Canonicalize category for URL/API (like company filter): only known slugs; empty = all.
   * @param {string} value
   * @returns {string}
   */
  function canonicalizeCategoryValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = normalizeExperienceCategoryParam(raw);
    if (!normalized || !VALID_CATEGORY_SLUGS.has(normalized)) return '';
    return normalized;
  }

  /** Same tab button classes as company filter for visual parity. */
  const TAB_BTN_CLASS =
    'border-2 border-slate-300 text-[#4A5565] font-["Roboto_Condensed"] leading-5 tracking-widest uppercase font-semibold text-base h-12 px-6 py-3 transition-colors aria-selected:bg-red-200 aria-selected:text-red-500 aria-selected:border-none';

  function populateExperienceCategorySelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    OPTIONS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.slug;
      o.textContent = opt.label;
      selectEl.appendChild(o);
    });
  }

  /**
   * @param {HTMLElement} tabsEl
   * @param {string} selectedSlug
   * @param {HTMLSelectElement|null} selectEl — when set, tab clicks sync select and dispatch change
   */
  function renderExperienceCategoryTabs(tabsEl, selectedSlug, selectEl) {
    if (!tabsEl) return;
    tabsEl.innerHTML = '';
    OPTIONS.forEach((opt) => {
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

  /**
   * @param {HTMLElement} tabsEl
   * @param {string} selectedSlug
   */
  function updateExperienceCategoryTabSelection(tabsEl, selectedSlug) {
    if (!tabsEl) return;
    tabsEl.querySelectorAll('[data-category]').forEach((btn) => {
      const slug = btn.getAttribute('data-category') || '';
      btn.setAttribute('aria-selected', slug === selectedSlug ? 'true' : 'false');
    });
  }

  /**
   * Wire desktop tabs + mobile select (mirrors company filter setup).
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

  /**
   * Keep tabs, select.value, and aria-selected in sync after URL or programmatic updates.
   * @param {HTMLElement|null} tabsOrLegacyContainer
   * @param {HTMLSelectElement|string|null} selectElOrSlug — select element, or legacy: selected slug when only 2 args
   * @param {string} [selectedSlug]
   */
  function updateExperienceCategorySelection(tabsOrLegacyContainer, selectElOrSlug, selectedSlug) {
    if (arguments.length === 2) {
      updateExperienceCategoryTabSelection(tabsOrLegacyContainer, String(selectElOrSlug || ''));
      return;
    }
    const slug = selectedSlug || '';
    if (selectElOrSlug && 'value' in selectElOrSlug) selectElOrSlug.value = slug;
    updateExperienceCategoryTabSelection(tabsOrLegacyContainer, slug);
  }

  /** @deprecated Use setupExperienceCategoryFilter with tabs + select */
  function renderExperienceCategoryFilter(container, selectedSlug, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', 'Project category');
    container.className =
      'flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-2 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory md:snap-none';
    const BTN_CLASS =
      'border-2 border-slate-300 text-[#4A5565] font-[\'Roboto_Condensed\'] leading-5 tracking-widest uppercase font-semibold text-sm sm:text-base min-h-12 px-4 sm:px-6 py-2.5 shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 aria-selected:bg-red-200 aria-selected:text-red-500 aria-selected:border-transparent';
    OPTIONS.forEach((opt) => {
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

  window.OWP_EXPERIENCE_CATEGORY_OPTIONS = OPTIONS;
  window.OWP_normalizeExperienceCategoryParam = normalizeExperienceCategoryParam;
  window.OWP_canonicalizeExperienceCategoryValue = canonicalizeCategoryValue;
  window.OWP_populateExperienceCategorySelect = populateExperienceCategorySelect;
  window.OWP_renderExperienceCategoryTabs = renderExperienceCategoryTabs;
  window.OWP_updateExperienceCategoryTabSelection = updateExperienceCategoryTabSelection;
  window.OWP_setupExperienceCategoryFilter = setupExperienceCategoryFilter;
  window.OWP_renderExperienceCategoryFilter = renderExperienceCategoryFilter;
  window.OWP_updateExperienceCategorySelection = updateExperienceCategorySelection;
})();
