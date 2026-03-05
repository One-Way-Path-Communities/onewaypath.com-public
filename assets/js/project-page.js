/**
 * Dynamic project page: fetches project data from /api/websites/project/:slug
 * and populates the page. Shows a loader until the API responds; then shows content with API data
 * or an error message. Uses data-project-slug on body and data-project-field on value elements.
 * Omit suites section; show/hide image block based on hasExteriorRenders.
 */
(function () {
  // Refs for loader, content, and error (must match ids in project page HTML).
  function getLoadingEl() { return document.getElementById('project-page-loading'); }
  function getContentEl() { return document.getElementById('project-page-content'); }
  function getErrorEl() { return document.getElementById('project-page-error'); }

  function hideLoader() {
    var el = getLoadingEl();
    if (el) el.classList.add('hidden');
  }
  function showContent() {
    var el = getContentEl();
    if (el) el.classList.remove('hidden');
  }
  function hideContent() {
    var el = getContentEl();
    if (el) el.classList.add('hidden');
  }
  function showError() {
    var el = getErrorEl();
    if (el) el.classList.remove('hidden');
  }
  function hideError() {
    var el = getErrorEl();
    if (el) el.classList.add('hidden');
  }

  function getSlug() {
    const slug = document.body.getAttribute('data-project-slug');
    if (slug) return slug.trim().toLowerCase();
    const path = (window.location.pathname || '').replace(/^\//, '');
    if (path.includes('dewitt')) return 'dewitt-road';
    if (path.includes('millen')) return 'millen-road';
    return null;
  }

  function getApiBase() {
    const candidates = window.OWP_WEBSITES_API_BASE_CANDIDATES || [];
    const sanitize = window.OWP_sanitizeApiBase;
    for (let i = 0; i < candidates.length; i++) {
      const base = sanitize ? sanitize(candidates[i]) : (candidates[i] || '').replace(/\/+$/, '');
      if (base) return base;
    }
    const origin = window.location.origin || '';
    if (origin) return origin + '/api/websites';
    return 'https://api.onewaypath.com/api/websites';
  }

  function setFieldValues(project) {
    const fieldMap = {
      'project-name': project.name,
      'project-type': project.type,
      'project-height': project.heightStoriesLabel != null ? project.heightStoriesLabel : (project.heightStories != null ? project.heightStories + ' stories' : ''),
      'project-area': project.areaSqFtFormatted != null ? project.areaSqFtFormatted + ' sq. ft.' : '',
      'project-units': project.residentialUnits != null ? String(project.residentialUnits) : '',
      'project-commercial': project.commercialAreaFormatted != null ? project.commercialAreaFormatted + ' sq. ft.' : '',
      'project-construction': project.plannedConstructionFormatted || '',
      'project-completion': project.plannedCompletionFormatted || '',
    };
    Object.keys(fieldMap).forEach(function (key) {
      const value = fieldMap[key];
      if (value === undefined || value === null) return;
      document.querySelectorAll('[data-project-field="' + key + '"]').forEach(function (el) {
        el.textContent = value;
      });
    });
  }

  function renderAmenities(container, amenities) {
    if (!container || !Array.isArray(amenities)) return;
    container.innerHTML = amenities
      .map(function (a) {
        const name = (a.name || '').trim();
        if (!name) return '';
        return (
          '<div class="p-1 md:p-2 bg-olive-200 flex justify-start items-center gap-1">' +
          '<div class="justify-center text-slate-700 text-sm md:text-lg font-semibold md:font-medium font-[&#39;DM_Sans&#39;] md:leading-6 leading-5 tracking-widest md:tracking-normal uppercase md:normal-case">' +
          escapeHtml(name) +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderCommunityHighlights(container, items) {
    if (!container || !Array.isArray(items)) return;
    var cards = items
      .filter(function (item) {
        return (item.title || '').trim() || (item.description || '').trim();
      })
      .map(function (item) {
        var title = (item.title || '').trim();
        var desc = (item.description || '').trim();
        var card =
          '<div class="flex-1 inline-flex flex-col justify-start items-start gap-4 md:gap-6">' +
          '<div class="inline-flex justify-start items-center gap-2">' +
          '<img class="w-3.5 h-5" src="assets/images/leaf-logo.svg" alt="">' +
          '<div class="justify-center text-olive-500 text-lg md:text-2xl font-semibold font-[&#39;DM_Sans&#39;] md:font-[&#39;Roboto_Condensed&#39;] md:uppercase leading-4 md:leading-8 md:tracking-widest md:tracking-[4px]">' +
          escapeHtml(title) +
          '</div></div>';
        if (desc) {
          card += '<div class="self-stretch justify-center text-slate-950 text-xl font-normal font-[&#39;DM_Sans&#39;] leading-7">' + escapeHtml(desc) + '</div>';
        }
        return card + '</div>';
      });
    container.innerHTML =
      '<div class="w-full flex flex-col justify-start items-start gap-5 md:gap-10">' +
      '<div class="self-stretch grid md:grid-cols-2 justify-start items-start gap-5 md:gap-8 lg:gap-x-14 lg:gap-y-10">' +
      cards.join('') +
      '</div></div>';
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function setupImages(exteriorRenders) {
    var section = document.getElementById('project-images-section');
    var mainImg = document.getElementById('mainImage');
    var thumbContainer = document.getElementById('project-thumbnails');
    if (!section) return;
    if (!exteriorRenders || exteriorRenders.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    var firstUrl = exteriorRenders[0].url;
    if (mainImg && firstUrl) mainImg.src = firstUrl;
    if (thumbContainer && exteriorRenders.length) {
      thumbContainer.innerHTML = exteriorRenders
        .map(function (r, i) {
          var borderClass = i === 0 ? 'border-olive-500' : 'border-transparent';
          return (
            '<img onclick="selectImage(this)" class="thumbnail flex-1 sm:h-32 sm:w-auto w-28 h-20 object-cover cursor-pointer border-2 ' +
            borderClass +
            '" src="' +
            escapeHtml(r.url) +
            '" alt="">'
          );
        })
        .join('');
    }
  }

  function removeSuitesSection() {
    var el = document.getElementById('suites-section');
    if (el) el.remove();
  }

  var slug = getSlug();
  if (!slug) return;

  var base = getApiBase();
  var url = base + '/project/' + encodeURIComponent(slug);

  // Initial state: loader visible, content and error hidden (already set in HTML; no JS needed here).

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Project not found');
      return res.json();
    })
    .then(function (data) {
      hideLoader();
      if (!data.ok || !data.project) {
        hideContent();
        showError();
        return;
      }
      hideError();
      showContent();
      var project = data.project;
      document.title = 'One Way Path Communities | ' + (project.name || 'Project');
      setFieldValues(project);
      renderAmenities(document.getElementById('project-amenities-list'), data.amenities || []);
      var communityHighlightsEl = document.getElementById('project-community-highlights');
      if (communityHighlightsEl) {
        renderCommunityHighlights(communityHighlightsEl, data.communityHighlights || []);
      }
      setupImages(data.exteriorRenders || []);
      removeSuitesSection();
    })
    .catch(function () {
      hideLoader();
      hideContent();
      showError();
      removeSuitesSection();
    });
})();
