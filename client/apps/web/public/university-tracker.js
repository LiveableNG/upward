/**
 * Upward University Traffic & Referral Tracking System
 * GA-level anti-reload deduplication & source attribution
 */
(function() {
  'use strict';

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  // Persistent Visitor ID (1 year)
  function getOrCreateVisitorId() {
    var vid = null;
    try {
      vid = localStorage.getItem('upward_vid');
    } catch (e) {}
    if (!vid) {
      vid = getCookie('upward_vid');
    }
    if (!vid) {
      vid = 'vid_' + generateUUID();
      try {
        localStorage.setItem('upward_vid', vid);
      } catch (e) {}
      setCookie('upward_vid', vid, 365);
    }
    return vid;
  }

  // Session ID (persists across page reloads in same browser tab, expires when tab is closed)
  function getOrCreateSessionId() {
    var sid = null;
    try {
      sid = sessionStorage.getItem('upward_sid');
      if (!sid) {
        sid = 'sid_' + generateUUID();
        sessionStorage.setItem('upward_sid', sid);
      }
    } catch (e) {
      sid = 'sid_' + generateUUID();
    }
    return sid;
  }

  // Extract Identifier from URL path or query params
  function extractIdentifier() {
    var pathname = window.location.pathname || '';
    var search = window.location.search || '';
    var params = new URLSearchParams(search);

    // 1. Check query parameters (?ref=, ?src=, ?utm_source=)
    var queryRef = params.get('ref') || params.get('src') || params.get('utm_source');
    if (queryRef && queryRef.trim()) {
      return queryRef.trim().toLowerCase();
    }

    // 2. Check path: /academy/:identifier or /university/:identifier
    var reserved = ['apply', 'landlord', 'programme', 'scholarships', 'scholarship', 'thank-you', 'faq'];
    if (pathname.startsWith('/academy/apply/')) {
      var applySlug = pathname.replace('/academy/apply/', '').split('/')[0];
      if (applySlug && reserved.indexOf(applySlug) === -1) {
        return applySlug.trim().toLowerCase();
      }
    } else if (pathname.startsWith('/academy/')) {
      var slug = pathname.replace('/academy/', '').split('/')[0];
      if (slug && reserved.indexOf(slug) === -1) {
        return slug.trim().toLowerCase();
      }
    } else if (pathname.startsWith('/university/apply/')) {
      var applySlug = pathname.replace('/university/apply/', '').split('/')[0];
      if (applySlug && reserved.indexOf(applySlug) === -1) {
        return applySlug.trim().toLowerCase();
      }
    } else if (pathname.startsWith('/university/')) {
      var slug = pathname.replace('/university/', '').split('/')[0];
      if (slug && reserved.indexOf(slug) === -1) {
        return slug.trim().toLowerCase();
      }
    }

    return null;
  }

  // A/B Variant Assignment ('A' = Upfront Pricing, 'B' = Post-Registration Pricing)
  function getOrCreateAbVariant() {
    var search = window.location.search || '';
    var params = new URLSearchParams(search);
    var forced = params.get('variant') || params.get('v');
    if (forced) {
      var norm = forced.trim().toUpperCase();
      if (norm === 'A' || norm === 'B') {
        try {
          localStorage.setItem('upward_uni_ab_variant', norm);
        } catch (e) {}
        setCookie('upward_uni_ab_variant', norm, 30);
        return norm;
      }
    }

    var variant = null;
    try {
      variant = localStorage.getItem('upward_uni_ab_variant');
    } catch (e) {}
    if (!variant) {
      variant = getCookie('upward_uni_ab_variant');
    }
    if (variant && (variant === 'A' || variant === 'B')) {
      return variant;
    }

    // 50/50 Random Split
    variant = Math.random() < 0.5 ? 'A' : 'B';
    try {
      localStorage.setItem('upward_uni_ab_variant', variant);
    } catch (e) {}
    setCookie('upward_uni_ab_variant', variant, 30);
    return variant;
  }

  // Retrieve assigned A/B variant ('A' or 'B')
  window.getUniversityAbVariant = function() {
    return getOrCreateAbVariant();
  };

  // Retrieve stored attribution identifier
  window.getUniversitySource = function() {
    var activeSource = extractIdentifier();
    if (activeSource) return activeSource;

    try {
      var stored = localStorage.getItem('upward_university_source');
      if (stored) return stored;
    } catch (e) {}

    return getCookie('upward_university_source') || '';
  };

  // Main Tracking Execution
  function trackPageVisit() {
    var identifier = extractIdentifier() || 'direct';
    var abVariant = getOrCreateAbVariant();

    // Save attribution for 30 days
    if (identifier !== 'direct') {
      try {
        localStorage.setItem('upward_university_source', identifier);
      } catch (e) {}
      setCookie('upward_university_source', identifier, 30);
    }

    var visitorId = getOrCreateVisitorId();
    var sessionId = getOrCreateSessionId();

    // GA-Level Deduplication on Client (prevent sending rapid duplicate hits on page reload in same tab)
    var sessionViewKey = 'upw_pv_' + identifier + '_' + abVariant + '_' + window.location.pathname;
    try {
      var lastViewTimestamp = sessionStorage.getItem(sessionViewKey);
      var now = Date.now();
      if (lastViewTimestamp && now - parseInt(lastViewTimestamp, 10) < 30 * 60 * 1000) {
        // Already recorded in this tab session within 30 minutes
        return;
      }
      sessionStorage.setItem(sessionViewKey, String(now));
    } catch (e) {}

    var payload = {
      identifier: identifier,
      visitorId: visitorId,
      sessionId: sessionId,
      abVariant: abVariant,
      path: window.location.pathname,
      referer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    };

    // Send tracking ping non-blockingly
    try {
      if (typeof fetch !== 'undefined') {
        fetch('/api/v1/university/traffic/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function() {});
      } else if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/v1/university/traffic/track', blob);
      }
    } catch (err) {}
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    trackPageVisit();
  } else {
    document.addEventListener('DOMContentLoaded', trackPageVisit);
  }
})();
