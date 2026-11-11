/* Shared AbelAI GA4 tracker. No SDK dependency, input capture, polling or replay. */
(function () {
  'use strict';
  var sites = { 'abelai.app': 'abel', 'www.abelai.app': 'abel', 'promptvault.abelai.app': 'promptvault', 'bridge.abelai.app': 'bridge', 'ucard.abelai.app': 'ucard', 'capymark.abelai.app': 'capymark' };
  var site = sites[location.hostname];
  if (!site || window.__abelAnalytics || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  try { if (localStorage.getItem('abel.analytics.optout') === '1') return; } catch (_) {}
  window.__abelAnalytics = true;
  var id = 'G-1R18KQ7KVH';
  var events = new Set(['page_view','navigation_click','project_click','outbound_click','social_click','article_read','feature_use','feature_result','search_used','prompt_copy','prompt_save','prompt_delete','library_change','compare_change','card_apply','filter_change','wallet_connect_click','bridge_start','bridge_complete','bridge_error','claim_complete','claim_error','login','sign_up','logout','share_click','preferences_change']);
  var keys = new Set(['feature','action','result','placement','target_site','target_domain','content_type','method','item_count','duration_ms']);
  var pending = window.abelAnalyticsQueue || [];
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  function path() {
    var p = location.pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id');
    if (site === 'capymark') return p.replace(/\/(p|invite|invitations)\/[^/]+/g, '/$1/:id');
    if (site === 'promptvault') return p.replace(/\/(prompt|edit|library|libraries)\/[^/]+/g, '/$1/:id');
    return p;
  }
  function pageUrl(initial) {
    var u = new URL(location.origin + path());
    if (initial) {
      var query = new URLSearchParams(location.search);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_id'].forEach(function (k) {
        var v = query.get(k);
        if (v && /^[a-z0-9_. -]{1,100}$/i.test(v)) u.searchParams.set(k, v);
      });
    }
    return u.href;
  }
  function referrer() {
    try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; } catch (_) { return ''; }
  }
  function track(name, params) {
    try {
      if (!events.has(name)) return;
      var clean = { site_name: site, page_location: pageUrl(false), page_title: site + ' · ' + path(), page_path: path() };
      Object.keys(params || {}).forEach(function (k) {
        var v = params[k];
        if (!keys.has(k)) return;
        if (typeof v === 'number' && Number.isFinite(v)) clean[k] = Math.max(0, Math.min(v, 3600000));
        else if (typeof v === 'string' && /^[a-z0-9_.:-]{1,80}$/i.test(v)) clean[k] = v;
      });
      gtag('event', name, clean);
    } catch (_) { /* Analytics must never affect product operations. */ }
  }
  window.abelTrack = track;
  gtag('js', new Date());
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  // All sites share the registrable domain, so the _ga cookie on .abelai.app already
  // identifies the visitor everywhere. A linker would only append _gl to every
  // cross-project link (URL noise and cache-key fragmentation).
  gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: 'abelai.app', page_location: pageUrl(true), page_referrer: referrer(), page_title: site + ' · ' + path(), site_name: site });
  var previous = '', previousUrl = referrer(), articleTimer;
  function view(initial) {
    var current = path();
    if (location.pathname === previous) return;
    previous = location.pathname;
    var url = pageUrl(initial);
    gtag('event', 'page_view', { page_location: url, page_referrer: previousUrl, page_title: site + ' · ' + current, site_name: site });
    previousUrl = url;
    clearTimeout(articleTimer);
    if (/\/(blog|guide)(\/|$)/.test(current)) articleTimer = setTimeout(function () {
      if (!document.hidden && path() === current) track('article_read', { content_type: 'article' });
    }, 30000);
  }
  view(true);
  ['pushState','replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () { var result = original.apply(this, arguments); queueMicrotask(function () { view(false); }); return result; };
  });
  window.addEventListener('popstate', function () { view(false); });
  document.addEventListener('click', function (event) {
    try {
      var node = event.target instanceof Element ? event.target.closest('[data-analytics-event],a[href]') : null;
      if (!node) return;
      var placement = node.closest('header,footer,nav,main');
      var p = { placement: placement ? placement.tagName.toLowerCase() : 'content' };
      if (node.dataset.analyticsEvent) {
        p.feature = node.dataset.analyticsFeature || 'control';
        track(node.dataset.analyticsEvent, p);
        return;
      }
      var target = new URL(node.href, location.href);
      if (!/^https?:$/.test(target.protocol)) return;
      if (sites[target.hostname] && target.hostname !== location.hostname) {
        p.target_site = sites[target.hostname];
        track('project_click', p);
      } else if (target.hostname === location.hostname) {
        if (target.pathname !== location.pathname) track('navigation_click', p);
      } else if (site === 'abel' || site === 'ucard') {
        p.target_domain = target.hostname;
        track(/(^|\.)(x\.com|twitter\.com|reddit\.com|t\.me|github\.com|youtube\.com|bilibili\.com)$/.test(target.hostname) ? 'social_click' : 'outbound_click', p);
      }
    } catch (_) {}
  }, { passive: true });
  pending.slice(0,100).forEach(function (entry) { track(entry[0], entry[1]); });
  window.abelAnalyticsQueue = [];
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(script);
})();
