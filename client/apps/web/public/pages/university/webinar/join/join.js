/**
 * Upward Academy — Webinar Waiting & Join Page
 * Target: 9:00 AM, 21st November (Nigeria Time · WAT / UTC+1)
 */
(function () {
  'use strict';

  const WEBINAR_CONFIG = {
    title: 'Upward Academy Webinar: Build a 6 Figure Income Career/Business in Tech-Driven Property Management/Brokerage',
    description: 'Learn how to build a 6-figure income career or business in Tech-Driven Property Management and Brokerage without owning property.',
    location: 'Online Webinar (Google Meet & YouTube Live)',
    googleMeetUrl: 'https://meet.google.com/xyz-upward-webinar',
    youtubeUrl: 'https://www.youtube.com/live/upward-academy',
    // 21st November at 9:00 AM WAT (UTC+1) = 08:00 UTC
    targetMonth: 10, // 0-indexed: 10 is November
    targetDay: 21,
    targetHour: 9
  };

  function getTargetDate() {
    const params = new URLSearchParams(window.location.search);
    const customTarget = params.get('target');
    if (customTarget) {
      const parsed = new Date(customTarget);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const now = new Date();
    let year = now.getFullYear();
    // 9:00 AM WAT is 08:00 AM UTC
    let candidate = new Date(Date.UTC(year, WEBINAR_CONFIG.targetMonth, WEBINAR_CONFIG.targetDay, 8, 0, 0));
    if (now.getTime() > candidate.getTime()) {
      candidate = new Date(Date.UTC(year + 1, WEBINAR_CONFIG.targetMonth, WEBINAR_CONFIG.targetDay, 8, 0, 0));
    }
    return candidate;
  }

  const targetDate = getTargetDate();
  const endDate = new Date(targetDate.getTime() + 90 * 60 * 1000); // 90 mins duration

  // Elements
  const elDays = document.getElementById('cdDays');
  const elHours = document.getElementById('cdHours');
  const elMinutes = document.getElementById('cdMinutes');
  const elSeconds = document.getElementById('cdSeconds');
  const elCountdownCard = document.getElementById('countdownCard');
  const elStatusPill = document.getElementById('headerStatus');
  const elStatusText = document.getElementById('headerStatusText');
  const elMeetBtn = document.getElementById('btnMeet');
  const elYoutubeBtn = document.getElementById('btnYoutube');
  const elNotice = document.getElementById('streamNotice');
  const elToast = document.getElementById('toast');

  const params = new URLSearchParams(window.location.search);
  const forceLive = params.get('status') === 'live' || params.get('preview') === 'live';

  let isLive = false;

  function setLive() {
    if (isLive) return;
    isLive = true;

    if (elStatusPill) elStatusPill.classList.add('is-live');
    if (elStatusText) elStatusText.textContent = 'Webinar is Live';

    if (elCountdownCard) elCountdownCard.classList.add('is-live');

    if (elMeetBtn) {
      elMeetBtn.classList.remove('is-disabled');
      elMeetBtn.classList.add('is-active');
      elMeetBtn.removeAttribute('aria-disabled');
      elMeetBtn.setAttribute('href', WEBINAR_CONFIG.googleMeetUrl);
      elMeetBtn.setAttribute('target', '_blank');
      elMeetBtn.setAttribute('rel', 'noopener noreferrer');
      elMeetBtn.textContent = 'Join Google Meet →';
    }

    if (elYoutubeBtn) {
      elYoutubeBtn.classList.remove('is-disabled');
      elYoutubeBtn.classList.add('is-active');
      elYoutubeBtn.removeAttribute('aria-disabled');
      elYoutubeBtn.setAttribute('href', WEBINAR_CONFIG.youtubeUrl);
      elYoutubeBtn.setAttribute('target', '_blank');
      elYoutubeBtn.setAttribute('rel', 'noopener noreferrer');
      elYoutubeBtn.textContent = 'Watch on YouTube →';
    }

    if (elNotice) {
      elNotice.textContent = 'The webinar is streaming now. Choose your preferred link above to enter.';
    }
  }

  function setWaiting() {
    isLive = false;
    if (elStatusPill) elStatusPill.classList.remove('is-live');
    if (elStatusText) elStatusText.textContent = 'Webinar Starts at 9:00 AM WAT';
    if (elCountdownCard) elCountdownCard.classList.remove('is-live');

    if (elMeetBtn) {
      elMeetBtn.classList.add('is-disabled');
      elMeetBtn.classList.remove('is-active');
      elMeetBtn.setAttribute('aria-disabled', 'true');
      elMeetBtn.removeAttribute('href');
      elMeetBtn.textContent = 'Opens at 9:00 AM WAT';
    }

    if (elYoutubeBtn) {
      elYoutubeBtn.classList.add('is-disabled');
      elYoutubeBtn.classList.remove('is-active');
      elYoutubeBtn.setAttribute('aria-disabled', 'true');
      elYoutubeBtn.removeAttribute('href');
      elYoutubeBtn.textContent = 'Starts at 9:00 AM WAT';
    }

    if (elNotice) {
      elNotice.textContent = 'Webinar links will unlock automatically when the session starts at 9:00 AM WAT.';
    }
  }

  function update() {
    if (forceLive) {
      setLive();
      return;
    }

    const now = Date.now();
    const remaining = targetDate.getTime() - now;

    if (remaining <= 0) {
      setLive();
      return;
    }

    if (isLive) {
      setWaiting();
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    if (elDays) elDays.textContent = pad(days);
    if (elHours) elHours.textContent = pad(hours);
    if (elMinutes) elMinutes.textContent = pad(minutes);
    if (elSeconds) elSeconds.textContent = pad(seconds);
  }

  // Calendar
  function setupCalendars() {
    function formatUtc(d) {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }

    const gCalBtn = document.getElementById('btnGoogleCal');
    if (gCalBtn) {
      const gcalUrl = new URL('https://calendar.google.com/calendar/render');
      gcalUrl.searchParams.set('action', 'TEMPLATE');
      gcalUrl.searchParams.set('text', WEBINAR_CONFIG.title);
      gcalUrl.searchParams.set('details', `${WEBINAR_CONFIG.description}\n\nWebinar link: ${window.location.href}`);
      gcalUrl.searchParams.set('location', WEBINAR_CONFIG.location);
      gcalUrl.searchParams.set('dates', `${formatUtc(targetDate)}/${formatUtc(endDate)}`);
      gCalBtn.href = gcalUrl.toString();
    }

    const icsBtn = document.getElementById('btnIcsCal');
    if (icsBtn) {
      icsBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const icsData = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Upward Academy//Webinar Join//EN',
          'BEGIN:VEVENT',
          `UID:webinar-${targetDate.getTime()}@upward.ng`,
          `DTSTART:${formatUtc(targetDate)}`,
          `DTEND:${formatUtc(endDate)}`,
          `SUMMARY:${WEBINAR_CONFIG.title}`,
          `DESCRIPTION:${WEBINAR_CONFIG.description} Link: ${window.location.href}`,
          `LOCATION:${WEBINAR_CONFIG.location}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'Upward_Academy_Webinar_Nov21.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Calendar event downloaded (.ics)');
      });
    }
  }

  // Copy Link
  function setupCopy() {
    const copyBtn = document.getElementById('btnCopyLink');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const url = window.location.href.split('?')[0];

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url)
          .then(() => showToast('Webinar link copied to clipboard'))
          .catch(() => fallbackCopy(url));
      } else {
        fallbackCopy(url);
      }
    });

    function fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Webinar link copied to clipboard');
      } catch (err) {
        showToast('Please copy the URL from your browser address bar');
      }
      document.body.removeChild(textarea);
    }
  }

  let toastTimer = null;
  function showToast(text) {
    if (!elToast) return;
    elToast.textContent = text;
    elToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elToast.classList.remove('show');
    }, 2800);
  }

  // Tooltips for disabled buttons
  function setupDisabledTooltips() {
    [elMeetBtn, elYoutubeBtn].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        if (btn.classList.contains('is-disabled')) {
          e.preventDefault();
          showToast('Webinar link opens at 9:00 AM WAT when the session begins.');
        }
      });
    });
  }

  function init() {
    setupCalendars();
    setupCopy();
    setupDisabledTooltips();
    update();
    setInterval(update, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
