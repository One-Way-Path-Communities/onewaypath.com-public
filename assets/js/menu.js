(() => {
  function getWebsitesApiBaseCandidates() {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const defaultBase = origin && origin.startsWith('http') ? `${origin.replace(/\/$/, '')}/api/websites` : null;
    const localhostBase = origin?.includes('localhost') ? 'http://localhost:3000/api/websites' : null;
    const candidates = [
      window.WEBSITES_API_BASE,
      window.WEBSITES_API_BASE_URL,
      defaultBase,
      'http://localhost:3000/api/websites',
      localhostBase,
    ].filter(Boolean);
    return [...new Set(candidates)];
  }
  window.OWP_getWebsitesApiBaseCandidates = getWebsitesApiBaseCandidates;
  window.OWP_WEBSITES_API_BASE_CANDIDATES = getWebsitesApiBaseCandidates();
  window.OWP_sanitizeApiBase = (base) => (base || '').replace(/\/+$/, '');

  document.addEventListener('click', (e) => {
    const link = e.target.closest('footer a[href="#contact"]');
    if (!link) return;
    const panel = document.getElementById('nav-panel');
    const contactSection = document.getElementById('contact');
    if (!panel) return;
    e.preventDefault();
    e.stopPropagation();
    panel.classList.remove('hidden');
    if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const desktopMenu = document.getElementById('desktop-menu');
  const mobileMenuList = document.getElementById('mobile-menu-list');
  if (!desktopMenu || !mobileMenuList) return;

  const AUTH_KEY = 'owp-editor';

  /** Fallback when GET /experience/filter-options fails or returns no categories (desktop + mobile Experience). */
  const EXPERIENCE_DROPDOWN_LINKS = [
    { label: 'Residential', url: 'experience.html?category=residential' },
    { label: 'Commercial', url: 'experience.html?category=commercial' },
    { label: 'Industrial', url: 'experience.html?category=industrial' },
    { label: 'Institutional', url: 'experience.html?category=institutional' },
    { label: 'All Categories', url: 'experience.html' },
  ];

  function slugFromExperienceLabel(label) {
    return String(label || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * @param {{ slug?: string, label?: string }[]} categories from /experience/filter-options
   * @returns {{ label: string, url: string, status: string, displayOrder: number }[]|null}
   */
  function buildExperienceCategoryMenuItems(categories) {
    if (!Array.isArray(categories) || categories.length === 0) return null;
    const items = [];
    let order = 1;
    const seen = new Set();
    for (const c of categories) {
      const label = c && c.label != null ? String(c.label).trim() : '';
      let slug = c && c.slug != null ? String(c.slug).trim().toLowerCase() : '';
      if (!label) continue;
      if (!slug) slug = slugFromExperienceLabel(label);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      items.push({
        label,
        url: `experience.html?category=${encodeURIComponent(slug)}`,
        status: 'active',
        displayOrder: order++,
      });
    }
    if (!items.length) return null;
    items.push({
      label: 'All Categories',
      url: 'experience.html',
      status: 'active',
      displayOrder: order++,
    });
    return items;
  }

  /**
   * Replace Projects → experience links (non–current-project) with API categories; keep owpProjectChild rows (static + status from /menu).
   * @param {object[]} menu
   * @param {{ slug?: string, label?: string }[]|null} categories
   */
  function applyExperienceCategoriesToProjects(menu, categories) {
    const projects = (menu || []).find((n) => n.owpProjectsLayout);
    if (!projects?.children) return;

    const projectRows = projects.children.filter((c) => c.owpProjectChild);
    const dynamicItems = buildExperienceCategoryMenuItems(categories);
    const experienceItems = dynamicItems
      ? dynamicItems
      : EXPERIENCE_DROPDOWN_LINKS.map((link, i) => ({
        label: link.label,
        url: link.url,
        status: 'active',
        displayOrder: i + 1,
      }));

    let order = 1;
    experienceItems.forEach((row) => {
      row.displayOrder = order++;
    });
    projectRows.forEach((row) => {
      row.displayOrder = order++;
    });

    projects.children = [...experienceItems, ...projectRows];
  }

  const CANONICAL_MENU = [
    {
      label: 'Company',
      url: '#',
      status: 'active',
      displayOrder: 1,
      children: [
        { label: 'About Us', url: 'index.html#about', status: 'active', displayOrder: 1 },
        { label: 'Designers', url: 'designers.html', status: 'active', displayOrder: 2 },
        { label: 'Administration', url: 'administration.html', status: 'active', displayOrder: 3 },
        { label: 'Builders', url: 'builders.html', status: 'active', displayOrder: 4 },
        { label: 'Contact', url: '#contact', status: 'active', displayOrder: 5 },
      ],
    },
    {
      label: 'Projects',
      url: '#',
      status: 'active',
      displayOrder: 2,
      owpProjectsLayout: true,
      children: [
        ...EXPERIENCE_DROPDOWN_LINKS.map((link, i) => ({
          label: link.label,
          url: link.url,
          status: 'active',
          displayOrder: i + 1,
        })),
        {
          label: 'Dewitt Road LP',
          url: 'projects-dewitt-road.html',
          status: 'active',
          displayOrder: 6,
          owpProjectChild: true,
        },
        {
          label: 'Millen Road LP',
          url: 'projects-millen-road.html',
          status: 'active',
          displayOrder: 7,
          owpProjectChild: true,
        },
      ],
    },
    {
      label: 'Community',
      url: '#',
      status: 'active',
      displayOrder: 3,
      children: [
        { label: 'Wellness', url: 'wellness.html', status: 'active', displayOrder: 1 },
        { label: 'Environment', url: 'community.html#environment', status: 'active', displayOrder: 2 },
        { label: 'Homes', url: 'community.html#homes', status: 'active', displayOrder: 3 },
        { label: 'Jobs', url: 'community.html#jobs', status: 'active', displayOrder: 4 },
      ],
    },
  ];

  const baseCandidates = window.OWP_WEBSITES_API_BASE_CANDIDATES || [];
  const sanitizeBase = window.OWP_sanitizeApiBase;

  async function fetchMenu() {
    const errors = [];
    for (const base of baseCandidates) {
      const safeBase = sanitizeBase(base);
      if (!safeBase) continue;
      try {
        const res = await fetch(`${safeBase}/menu`, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          errors.push(`${safeBase} → ${res.status}`);
          continue;
        }
        const body = await res.json();
        if (Array.isArray(body?.menu) && body.menu.length > 0) return body.menu;
      } catch (err) {
        errors.push(`${safeBase} → ${err.message}`);
      }
    }
    if (errors.length) console.warn('Menu fetch failed; using canonical menu.', errors);
    return null;
  }

  /** Same source as Experience page filters: distinct categories (live + cover_image rules on server). */
  async function fetchExperienceNavOptions() {
    const errors = [];
    for (const base of baseCandidates) {
      const safeBase = sanitizeBase(base);
      if (!safeBase) continue;
      try {
        const res = await fetch(`${safeBase}/experience/filter-options`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          errors.push(`${safeBase}/experience/filter-options → ${res.status}`);
          continue;
        }
        const body = await res.json();
        if (body?.ok) {
          return {
            categories: Array.isArray(body.categories) ? body.categories : [],
          };
        }
      } catch (err) {
        errors.push(`${safeBase}/experience/filter-options → ${err.message}`);
      }
    }
    if (errors.length) console.warn('Experience nav filter-options failed; using static category links.', errors);
    return null;
  }

  function mergeStatusFromApi(canonical, apiRoots) {
    const entries = [];
    function walk(nodes) {
      for (const n of nodes || []) {
        entries.push({
          url: (n.url || '').trim(),
          label: (n.label || '').trim(),
          status: n.status,
          isExternal: n.isExternal,
        });
        walk(n.children);
      }
    }
    walk(apiRoots);

    function apply(nodes) {
      for (const node of nodes || []) {
        const label = (node.label || '').trim();
        const url = (node.url || '').trim();
        let match = entries.find((e) => e.url === url && e.label.toLowerCase() === label.toLowerCase());
        if (!match && url) match = entries.find((e) => e.url === url);
        if (match) {
          if (match.status) node.status = match.status;
          if (match.isExternal != null) node.isExternal = match.isExternal;
        }
        if (node.children) apply(node.children);
      }
    }
    const copy = JSON.parse(JSON.stringify(canonical));
    apply(copy);
    return copy;
  }

  /** One merged menu tree drives desktop + mobile (same labels, URLs, status after API merge). */
  function menuRootByLabel(menu, label) {
    const L = (label || '').toLowerCase();
    return (menu || []).find((n) => (n.label || '').toLowerCase() === L);
  }

  function visibleChildren(root) {
    if (!root?.children?.length) return [];
    return root.children.filter((c) => !isInactive(c));
  }

  function splitProjectsNode(menu) {
    const p = (menu || []).find((n) => n.owpProjectsLayout);
    if (!p?.children?.length) return { experience: [], currentProjects: [] };
    const experience = [];
    const currentProjects = [];
    for (const c of p.children) {
      if (isInactive(c)) continue;
      if (c.owpProjectChild) currentProjects.push(c);
      else experience.push(c);
    }
    return { experience, currentProjects };
  }

  const statusClasses = (status) => (status && status !== 'active' ? ['requires-auth', 'hidden'] : []);
  const applyStatus = (el, status) => {
    if (!el) return;
    if (status) el.dataset.menuStatus = status;
    for (const cls of statusClasses(status)) el.classList.add(cls);
  };

  const isInactive = (item) => !item || item.status === 'inactive';
  const hasVisibleChildren = (item = {}) =>
    Array.isArray(item.children) && item.children.some((child) => !isInactive(child));
  const isContact = (item = {}) => (item.label || '').toLowerCase() === 'contact';

  function createChevron() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('h-5', 'w-5');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('d', 'M19 9l-7 7-7-7');
    svg.appendChild(path);
    return svg;
  }

  const linkClassDesktop =
    "block pl-4 pr-6 py-2.5 text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:bg-olive-100";
  const linkClassDesktopNested =
    "block pl-3 pr-6 py-2 text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:bg-olive-100";

  function createLink(item, className, options = {}) {
    const { allowCollapseToggle = false } = options;
    const a = document.createElement('a');
    a.textContent = item.label;
    a.href = item.url || '#';
    a.className = className;
    if (item.isExternal) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    applyStatus(a, item.status);
    if (allowCollapseToggle && isContact(item)) {
      a.dataset.collapseToggle = 'nav-panel';
      a.setAttribute('aria-controls', 'nav-panel');
      a.setAttribute('aria-expanded', 'false');
    }
    return a;
  }

  function buildProjectsDropdown(item, idx) {
    const children = item.children || [];
    const categoryRows = children.filter((c) => !c.owpProjectChild && !isInactive(c));
    const projectRows = children.filter((c) => c.owpProjectChild && !isInactive(c));
    if (!categoryRows.length && !projectRows.length) return null;

    const dropdownId = `menu-dropdown-${idx}-${Math.random().toString(36).slice(2, 8)}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    applyStatus(wrapper, item.status);

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.owpDropdown = dropdownId;
    button.setAttribute('aria-controls', dropdownId);
    button.setAttribute('aria-expanded', 'false');
    button.className =
      "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] inline-flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none";
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    labelSpan.className = 'inline-flex items-center pt-0.5';
    button.appendChild(labelSpan);
    const chevron = createChevron();
    chevron.classList.add('flex-shrink-0');
    button.appendChild(chevron);

    const dropdown = document.createElement('div');
    dropdown.id = dropdownId;
    dropdown.className =
      'z-20 hidden absolute left-0 mt-2 min-w-[240px] max-w-[320px] rounded-lg border border-slate-500 text-sm text-slate-950 shadow';
    dropdown.style.backgroundColor = '#FBF9F3';

    const wrap = document.createElement('div');
    wrap.className = 'py-2';

    if (categoryRows.length) {
      const ul = document.createElement('ul');
      for (const child of categoryRows) {
        const li = document.createElement('li');
        li.appendChild(createLink(child, linkClassDesktop, { allowCollapseToggle: true }));
        applyStatus(li, child.status);
        ul.appendChild(li);
      }
      wrap.appendChild(ul);
    }

    if (categoryRows.length && projectRows.length) {
      const hr = document.createElement('div');
      hr.className = 'my-2 border-t border-slate-300';
      hr.setAttribute('role', 'separator');
      wrap.appendChild(hr);
    }

    if (projectRows.length) {
      const heading = document.createElement('p');
      heading.className =
        "px-4 pt-1 pb-2 text-slate-500 font-semibold text-xs tracking-[0.2em] uppercase font-['Roboto_Condensed']";
      heading.textContent = 'Current Projects';
      wrap.appendChild(heading);
      const nest = document.createElement('div');
      nest.className = 'ml-4 mr-2 mb-2 border-l border-slate-300 pl-3';
      const ul = document.createElement('ul');
      ul.className = 'flex flex-col gap-0.5';
      for (const child of projectRows) {
        const li = document.createElement('li');
        li.appendChild(createLink(child, linkClassDesktopNested, { allowCollapseToggle: true }));
        applyStatus(li, child.status);
        ul.appendChild(li);
      }
      nest.appendChild(ul);
      wrap.appendChild(nest);
    }

    dropdown.appendChild(wrap);
    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    return wrapper;
  }

  function buildDropdown(item, idx) {
    if (item.owpProjectsLayout) return buildProjectsDropdown(item, idx);

    const dropdownId = `menu-dropdown-${idx}-${Math.random().toString(36).slice(2, 8)}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    applyStatus(wrapper, item.status);

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.owpDropdown = dropdownId;
    button.setAttribute('aria-controls', dropdownId);
    button.setAttribute('aria-expanded', 'false');
    button.className =
      "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] inline-flex items-center justify-center gap-2 hover:opacity-90 focus:outline-none";
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    labelSpan.className = 'inline-flex items-center pt-0.5';
    button.appendChild(labelSpan);
    button.appendChild(createChevron());

    const dropdown = document.createElement('div');
    dropdown.id = dropdownId;
    dropdown.className =
      'z-20 hidden absolute left-0 mt-2 min-w-max rounded-lg border border-slate-500 text-sm text-slate-950 shadow';
    dropdown.style.backgroundColor = '#FBF9F3';
    const list = document.createElement('ul');
    list.className = 'py-2';

    for (const child of item.children || []) {
      if (isInactive(child)) continue;
      const li = document.createElement('li');
      li.appendChild(createLink(child, linkClassDesktop, { allowCollapseToggle: true }));
      applyStatus(li, child.status);
      list.appendChild(li);
    }

    if (!list.childElementCount) return null;

    dropdown.appendChild(list);
    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    return wrapper;
  }

  function renderDesktop(menu = []) {
    desktopMenu.innerHTML = '';
    menu.forEach((item, idx) => {
      if (isInactive(item)) return;
      if (!hasVisibleChildren(item)) {
        desktopMenu.appendChild(
          createLink(item, "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:opacity-90", {
            allowCollapseToggle: true,
          })
        );
        return;
      }
      const dropdown = buildDropdown(item, idx);
      if (dropdown) desktopMenu.appendChild(dropdown);
    });
  }

  const mobileSectionTitle =
    "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] mb-3";
  const mobileNestedLink =
    "block py-2.5 pl-3 text-slate-950 font-semibold leading-5 tracking-widest uppercase text-sm font-['Roboto_Condensed'] hover:opacity-90";

  function renderMobile(menu) {
    mobileMenuList.innerHTML = '';
    mobileMenuList.className =
      'mx-auto max-w-6xl px-8 py-6 text-base font-medium text-slate-950 flex flex-col gap-0';

    const company = visibleChildren(menuRootByLabel(menu, 'Company'));
    const { experience, currentProjects } = splitProjectsNode(menu);
    const community = visibleChildren(menuRootByLabel(menu, 'Community'));

    const sec1 = document.createElement('div');
    sec1.className = 'pb-4 mb-4 border-b border-slate-300';
    const hCompany = document.createElement('p');
    hCompany.className = mobileSectionTitle;
    hCompany.textContent = 'Company';
    sec1.appendChild(hCompany);
    const nestCompany = document.createElement('div');
    nestCompany.className = 'ml-1 border-l border-slate-300 pl-4 flex flex-col';
    for (const item of company) {
      if (isInactive(item)) continue;
      const isContactLink = (item.label || '').toLowerCase() === 'contact';
      nestCompany.appendChild(createLink(item, mobileNestedLink, { allowCollapseToggle: isContactLink }));
    }
    sec1.appendChild(nestCompany);
    mobileMenuList.appendChild(sec1);

    const sec2 = document.createElement('div');
    sec2.className = 'pb-4 mb-4 border-b border-slate-300';
    const h2 = document.createElement('p');
    h2.className = mobileSectionTitle;
    h2.textContent = 'Experience';
    sec2.appendChild(h2);
    const nest2 = document.createElement('div');
    nest2.className = 'ml-1 border-l border-slate-300 pl-4 flex flex-col';
    for (const item of experience) {
      nest2.appendChild(createLink(item, mobileNestedLink));
    }
    sec2.appendChild(nest2);
    mobileMenuList.appendChild(sec2);

    const sec3 = document.createElement('div');
    sec3.className = 'pb-4 mb-4 border-b border-slate-300';
    const h3 = document.createElement('p');
    h3.className = mobileSectionTitle;
    h3.textContent = 'Current Projects';
    sec3.appendChild(h3);
    const nest3 = document.createElement('div');
    nest3.className = 'ml-1 border-l border-slate-300 pl-4 flex flex-col';
    for (const item of currentProjects) {
      nest3.appendChild(createLink(item, mobileNestedLink));
    }
    sec3.appendChild(nest3);
    mobileMenuList.appendChild(sec3);

    const sec4 = document.createElement('div');
    const h4 = document.createElement('p');
    h4.className = mobileSectionTitle;
    h4.textContent = 'Community';
    sec4.appendChild(h4);
    const nest4 = document.createElement('div');
    nest4.className = 'ml-1 border-l border-slate-300 pl-4 flex flex-col';
    for (const item of community) {
      if (isInactive(item)) continue;
      nest4.appendChild(createLink(item, mobileNestedLink));
    }
    sec4.appendChild(nest4);
    if (nest4.childElementCount > 0) {
      mobileMenuList.appendChild(sec4);
    }
  }

  function applyAuthVisibility() {
    const authed = localStorage.getItem(AUTH_KEY) === 'true';
    document.querySelectorAll('.requires-auth').forEach((el) => el.classList.toggle('hidden', !authed));
    document.querySelectorAll('.auth-only').forEach((el) => el.classList.toggle('hidden', !authed));
  }

  let flowbiteLoadHookAttached = false;
  function initFlowbiteIfReady() {
    if (typeof window.initFlowbite === 'function') window.initFlowbite();
    if (!flowbiteLoadHookAttached) {
      flowbiteLoadHookAttached = true;
      window.addEventListener('load', () => {
        if (typeof window.initFlowbite === 'function') window.initFlowbite();
      });
    }
  }

  function renderMenu(menu) {
    renderDesktop(menu);
    renderMobile(menu);
    initFlowbiteIfReady();
    applyAuthVisibility();
    bindCustomDropdowns();
    document.dispatchEvent(new CustomEvent('owp:menu-updated'));
  }

  let dropdownDelegationBound = false;
  function bindCustomDropdowns() {
    if (dropdownDelegationBound) return;
    dropdownDelegationBound = true;

    const closeAll = (exceptId) => {
      document.querySelectorAll('[data-owp-dropdown]').forEach((btn) => {
        const targetId = btn.dataset.owpDropdown;
        if (!targetId || targetId === exceptId) return;
        const target = document.getElementById(targetId);
        if (target) target.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      });
    };

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-owp-dropdown]');
      if (!btn) {
        closeAll();
        return;
      }
      const targetId = btn.dataset.owpDropdown;
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const willShow = target.classList.contains('hidden');
      closeAll(targetId);
      target.classList.toggle('hidden', !willShow);
      btn.setAttribute('aria-expanded', willShow ? 'true' : 'false');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  const canonical = () => JSON.parse(JSON.stringify(CANONICAL_MENU));

  renderMenu(canonical());

  Promise.all([fetchMenu(), fetchExperienceNavOptions()])
    .then(([apiMenu, navOpts]) => {
      const menu = canonical();
      const cats = navOpts?.categories;
      applyExperienceCategoriesToProjects(menu, cats && cats.length ? cats : null);
      const merged =
        apiMenu && apiMenu.length ? mergeStatusFromApi(menu, apiMenu) : menu;
      renderMenu(merged);
    })
    .catch((err) => {
      console.error('Menu fetch crashed; using canonical menu.', err);
      renderMenu(canonical());
    });
})();
