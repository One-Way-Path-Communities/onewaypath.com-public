(() => {
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
  window.OWP_WEBSITES_API_BASE_CANDIDATES = [...new Set(candidates)];
  window.OWP_sanitizeApiBase = (base) => (base || '').replace(/\/+$/, '');

  const desktopMenu = document.getElementById('desktop-menu');
  const mobileMenuList = document.getElementById('mobile-menu-list');
  if (!desktopMenu || !mobileMenuList) return;

  const AUTH_KEY = 'owp-editor';
  const fallbackMenu = [
    { label: 'About Us', url: 'index.html', status: 'active', displayOrder: 1 },
    {
      label: 'Projects',
      url: '#projects',
      status: 'in-progress',
      displayOrder: 2,
      children: [
        { label: 'Dewitt Road', url: '#projects-dewitt-road', status: 'in-progress', displayOrder: 1 },
        { label: 'Millen Road', url: '#projects-millen-road', status: 'in-progress', displayOrder: 2 },
      ],
    },
    { label: 'Designers', url: 'designers.html', status: 'active', displayOrder: 3 },
    { label: 'Experience', url: 'experience.html', status: 'active', displayOrder: 4 },
    { label: 'Builders', url: 'builders.html', status: 'active', displayOrder: 5 },
    {
      label: 'Community',
      url: '#',
      status: 'active',
      displayOrder: 6,
      children: [
        { label: 'Wellness', url: 'wellness.html', status: 'active', displayOrder: 1 },
        { label: 'Homes', url: 'community.html#homes', status: 'active', displayOrder: 2 },
        { label: 'Jobs', url: 'community.html#jobs', status: 'active', displayOrder: 3 },
        { label: 'Environment', url: 'community.html#environment', status: 'active', displayOrder: 4 },
      ],
    },
    { label: 'Contact', url: '#contact', status: 'active', displayOrder: 7 },
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
    svg.classList.add('h-4', 'w-4');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
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
      'fitwel-heading-sm text-olive-500 inline-flex items-center gap-1 hover:text-olive-800 focus:outline-none font-bold';
    button.textContent = item.label;
    button.appendChild(createChevron());

    const dropdown = document.createElement('div');
    dropdown.id = dropdownId;
    dropdown.className =
      'z-20 hidden absolute left-0 mt-2 min-w-[10rem] rounded-lg border border-slate-500 bg-olive-50 text-sm text-slate-950 shadow';
    const list = document.createElement('ul');
    list.className = 'py-2';

    for (const child of item.children || []) {
      if (isInactive(child)) continue;
      const li = document.createElement('li');
      const childLink = createLink(child, 'block px-4 py-2 font-semibold uppercase hover:bg-olive-50', {
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
      const link = createLink(item, 'fitwel-heading-sm text-olive-500 hover:text-olive-800 font-bold', {
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
          `block uppercase text-olive-500 hover:text-olive-800 font-bold ${status}`.trim()
        );
        mobileMenuList.appendChild(link);
        return;
      }

      const group = document.createElement('div');
      group.className = `space-y-1 ${status}`.trim();
      applyStatus(group, item.status);

      const heading = document.createElement('p');
      heading.className = 'uppercase text-olive-500 text-sm';
      heading.textContent = item.label;
      group.appendChild(heading);

      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'flex flex-col gap-1 pl-2';

      for (const child of item.children || []) {
        if (isInactive(child)) continue;
        const childLink = createLink(child, 'hover:text-olive-800');
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
