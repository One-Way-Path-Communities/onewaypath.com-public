(() => {
  /** Single source of truth for websites API base URL candidates (same-origin, localhost, production). */
  function getWebsitesApiBaseCandidates() {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const defaultBase = origin && origin.startsWith('http') ? `${origin.replace(/\/$/, '')}/api/websites` : null;
    const localhostBase = origin?.includes('localhost') ? 'http://localhost:3000/api/websites' : null;
    const candidates = [
      window.WEBSITES_API_BASE,
      window.WEBSITES_API_BASE_URL,
      defaultBase,
      'https://api.onewaypath.com/api/websites',
      localhostBase,
    ].filter(Boolean);
    return [...new Set(candidates)];
  }
  window.OWP_getWebsitesApiBaseCandidates = getWebsitesApiBaseCandidates;
  window.OWP_WEBSITES_API_BASE_CANDIDATES = getWebsitesApiBaseCandidates();
  window.OWP_sanitizeApiBase = (base) => (base || '').replace(/\/+$/, '');

  /** Footer Contact: open nav-panel only and scroll to contact section. */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('footer a[href="#contact"]');
    if (!link) return;
    const panel = document.getElementById('nav-panel');
    const contactSection = document.getElementById('contact');
    if (!panel) return;
    e.preventDefault();
    e.stopPropagation();
    panel.classList.remove('hidden');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const desktopMenu = document.getElementById('desktop-menu');
  const mobileMenuList = document.getElementById('mobile-menu-list');
  if (!desktopMenu || !mobileMenuList) return;

  const AUTH_KEY = 'owp-editor';
  const fallbackMenu = [
    {
      label: 'Company',
      url: '#',
      status: 'active',
      displayOrder: 1,
      children: [
        { label: 'About Us', url: 'index.html#about', status: 'active', displayOrder: 1 },
        { label: 'Designers', url: 'designers.html', status: 'active', displayOrder: 2 },
        { label: 'Experience', url: 'experience.html', status: 'active', displayOrder: 3 },
        { label: 'Builders', url: 'builders.html', status: 'active', displayOrder: 4 },
        { label: 'Contact', url: '#contact', status: 'active', displayOrder: 5 },
      ],
    },
    {
      label: 'Projects',
      url: '#',
      status: 'active',
      displayOrder: 2,
      children: [
        { label: 'Dewitt Road LP', url: 'projects-dewitt-road.html', status: 'active', displayOrder: 1 },
        { label: 'Millen Road LP', url: 'projects-millen-road.html', status: 'active', displayOrder: 2 },
      ],
    },
    {
      label: 'Community',
      url: '#',
      status: 'active',
      displayOrder: 3,
      children: [
        { label: 'Wellness', url: 'wellness.html', status: 'active', displayOrder: 1 },
        { label: 'Homes', url: 'community.html#homes', status: 'active', displayOrder: 2 },
        { label: 'Jobs', url: 'community.html#jobs', status: 'active', displayOrder: 3 },
        { label: 'Environment', url: 'community.html#environment', status: 'active', displayOrder: 4 },
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
        if (Array.isArray(body?.menu) && body.menu.length) return body.menu;
        // Same-origin success with empty menu - use fallback, avoid trying cross-origin (CORS)
        if (origin && safeBase.startsWith(origin)) return fallbackMenu;
      } catch (err) {
        errors.push(`${safeBase} → ${err.message}`);
      }
    }
    if (errors.length) {
      console.warn('Menu fetch failed; using fallback.', errors);
    }
    return fallbackMenu;
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

  function createLink(item, className, options = {}) {
    const { allowCollapseToggle = false } = options;
    const link = document.createElement('a');
    link.textContent = item.label;
    link.href = item.url || '#';
    link.className = className;
    if (item.isExternal) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    applyStatus(link, item.status);
    if (allowCollapseToggle && isContact(item)) {
      link.dataset.collapseToggle = 'nav-panel';
      link.setAttribute('aria-controls', 'nav-panel');
      link.setAttribute('aria-expanded', 'false');
    }
    return link;
  }

  function buildDropdown(item, idx) {
    const dropdownId = `menu-dropdown-${idx}-${Math.random().toString(36).slice(2, 8)}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'relative';
    applyStatus(wrapper, item.status);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = `${dropdownId}-btn`;
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
      'z-20 hidden absolute left-0 mt-2 min-w-max pr-3 rounded-lg border border-slate-500 text-sm text-slate-950 shadow';
    dropdown.style.backgroundColor = '#FBF9F3';
    const list = document.createElement('ul');
    list.className = 'py-2';

    for (const child of item.children || []) {
      if (isInactive(child)) continue;
      const li = document.createElement('li');
      const childLink = createLink(child, "block px-4 py-2 text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:bg-olive-100", {
        allowCollapseToggle: true,
      });
      applyStatus(li, child.status);
      li.appendChild(childLink);
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
      const hasChildren = hasVisibleChildren(item);
      if (hasChildren) {
        const dropdown = buildDropdown(item, idx);
        if (dropdown) desktopMenu.appendChild(dropdown);
        return;
      }
      const link = createLink(item, "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:opacity-90", {
        allowCollapseToggle: true,
      });
      desktopMenu.appendChild(link);
    });
  }

  function renderMobile(menu = []) {
    mobileMenuList.innerHTML = '';
    menu.forEach((item) => {
      if (isInactive(item)) return;
      const status = statusClasses(item.status).join(' ');
      const hasChildren = hasVisibleChildren(item);

      if (!hasChildren) {
        const link = createLink(
          item,
          `block text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:opacity-90 ${status}`.trim()
        );
        mobileMenuList.appendChild(link);
        return;
      }

      const group = document.createElement('div');
      group.className = `flex flex-col gap-4 ${status}`.trim();
      applyStatus(group, item.status);

      const heading = document.createElement('p');
      heading.className = "text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed']";
      heading.textContent = item.label;
      group.appendChild(heading);

      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'flex flex-col';

      for (const child of item.children || []) {
        if (isInactive(child)) continue;
        const childLink = createLink(child, "h-11 px-7 text-sm inline-flex justify-start items-center text-slate-950 font-semibold leading-5 tracking-widest uppercase text-base font-['Roboto_Condensed'] hover:opacity-90");
        applyStatus(childLink, child.status);
        childrenWrap.appendChild(childLink);
      }

      if (childrenWrap.childElementCount) {
        group.appendChild(childrenWrap);
        mobileMenuList.appendChild(group);
      }
    });
  }

  function applyAuthVisibility() {
    const authed = localStorage.getItem(AUTH_KEY) === 'true';
    document.querySelectorAll('.requires-auth').forEach((el) => el.classList.toggle('hidden', !authed));
    document.querySelectorAll('.auth-only').forEach((el) => el.classList.toggle('hidden', !authed));
  }

  let flowbiteLoadHookAttached = false;
  function initFlowbiteIfReady() {
    if (typeof window.initFlowbite === 'function') {
      window.initFlowbite();
    }
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

    const getButtons = () => Array.from(document.querySelectorAll('[data-owp-dropdown]'));

    const closeAll = (exceptId) => {
      for (const btn of getButtons()) {
        const targetId = btn.dataset.owpDropdown;
        if (!targetId || targetId === exceptId) continue;
        const target = document.getElementById(targetId);
        if (target) target.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    };

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-owp-dropdown]');
      if (!btn) {
        // Clicked outside any dropdown trigger
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

  renderMenu(fallbackMenu);
  fetchMenu().then(renderMenu).catch((err) => {
    console.error('Menu fetch crashed; using fallback.', err);
    renderMenu(fallbackMenu);
  });
})();
