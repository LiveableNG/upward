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
    googleMeetUrl: 'https://meet.google.com/quk-vgxu-wvd',
    youtubeUrl: 'https://youtube.com/live/ldY3QzmSORo',
    // 21st November 2026: Countdown stops at 8:30 AM WAT (UTC+1 = 07:30 UTC)
    targetYear: 2026,
    targetMonth: 10, // 0-indexed: 10 is November
    targetDay: 21,
    targetHourWat: 8,
    targetMinuteWat: 30,
    /**
     * TEST SWITCH:
     * Set this to true (or append ?status=live in the URL) to turn the countdown
     * OFF and immediately test the live stream and check-in experience!
     */
    FORCE_LIVE_TEST: false
  };

  const STORAGE_KEY = 'upward_webinar_attendee_v1';

  function getTargetDate() {
    const params = new URLSearchParams(window.location.search);
    const customTarget = params.get('target');
    if (customTarget) {
      const parsed = new Date(customTarget);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 8:30 AM WAT (UTC+1) corresponds to 07:30 AM UTC on 21st November 2026
    return new Date(Date.UTC(WEBINAR_CONFIG.targetYear, WEBINAR_CONFIG.targetMonth, WEBINAR_CONFIG.targetDay, 7, 30, 0));
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

  // Modal Elements
  const elModal = document.getElementById('checkinModal');
  const elModalClose = document.getElementById('modalClose');
  const elCheckinForm = document.getElementById('checkinForm');
  const elCheckinEmail = document.getElementById('checkinEmail');
  const elCheckinPhone = document.getElementById('checkinPhone');
  const elEmailError = document.getElementById('emailError');
  const elPhoneError = document.getElementById('phoneError');
  const elBtnCheckin = document.getElementById('btnSubmitCheckin');
  const elBtnCheckinText = document.getElementById('btnCheckinText');
  const elModalTitle = document.getElementById('modalTitle');
  const elModalDesc = document.getElementById('modalDesc');

  let pendingPlatform = 'meet'; // 'meet' | 'youtube'
  let isLive = false;

  const urlParams = new URLSearchParams(window.location.search);
  const forceLive = WEBINAR_CONFIG.FORCE_LIVE_TEST ||
                    urlParams.get('status') === 'live' ||
                    urlParams.get('preview') === 'live' ||
                    urlParams.has('live');

  // Check URL query parameters for pre-filling email/phone
  function seedAttendeeFromUrlOrStorage() {
    const qEmail = urlParams.get('email') || '';
    const qPhone = urlParams.get('phone') || urlParams.get('whatsapp') || '';

    try {
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      const stored = storedRaw ? JSON.parse(storedRaw) : {};

      const email = qEmail || stored.email || '';
      const phone = qPhone || stored.phone || '';

      if (elCheckinEmail && email) elCheckinEmail.value = email;
      if (elCheckinPhone && phone) elCheckinPhone.value = phone;

      if (qEmail || qPhone) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          email: email,
          phone: phone,
          verified: stored.verified || false
        }));
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  function getStoredAttendee() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setLive() {
    if (isLive) return;
    isLive = true;

    if (elStatusPill) elStatusPill.classList.add('is-live');
    if (elStatusText) elStatusText.textContent = 'Webinar Access Open';

    if (elCountdownCard) elCountdownCard.classList.add('is-live');

    if (elMeetBtn) {
      elMeetBtn.classList.remove('is-disabled');
      elMeetBtn.classList.add('is-active');
      elMeetBtn.removeAttribute('aria-disabled');
      elMeetBtn.textContent = 'Join Google Meet →';
    }

    if (elYoutubeBtn) {
      elYoutubeBtn.classList.remove('is-disabled');
      elYoutubeBtn.classList.add('is-active');
      elYoutubeBtn.removeAttribute('aria-disabled');
      elYoutubeBtn.textContent = 'Watch on YouTube →';
    }

    if (elNotice) {
      elNotice.textContent = 'Webinar access is open. Join now to settle in and check audio before the session starts.';
    }
  }

  function setWaiting() {
    isLive = false;
    if (elStatusPill) elStatusPill.classList.remove('is-live');
    if (elStatusText) elStatusText.textContent = 'Links Open at 8:30 AM WAT (Session at 9:00 AM)';
    if (elCountdownCard) elCountdownCard.classList.remove('is-live');

    if (elMeetBtn) {
      elMeetBtn.classList.add('is-disabled');
      elMeetBtn.classList.remove('is-active');
      elMeetBtn.setAttribute('aria-disabled', 'true');
      elMeetBtn.textContent = 'Opens at 8:30 AM WAT';
    }

    if (elYoutubeBtn) {
      elYoutubeBtn.classList.add('is-disabled');
      elYoutubeBtn.classList.remove('is-active');
      elYoutubeBtn.setAttribute('aria-disabled', 'true');
      elYoutubeBtn.textContent = 'Opens at 8:30 AM WAT';
    }

    if (elNotice) {
      elNotice.textContent = 'Webinar links unlock automatically at 8:30 AM WAT for early check-in before the 9:00 AM session.';
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

  // Attendance Submission API Call
  async function trackAttendance(email, phone, platform) {
    const platformLabel = platform === 'youtube' ? 'YouTube Live' : 'Google Meet';
    const payload = {
      email: email.trim().toLowerCase(),
      whatsapp: phone.trim(),
      track: `Webinar Attended - ${platformLabel}`,
      sessionTime: 'Saturday 21st November 2026',
      sourceIdentifier: `webinar_join_${platform}`,
      platform: platformLabel
    };

    try {
      await fetch('/api/v1/early-access/webinar-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Fail gracefully so user is never blocked from joining
      console.warn('Attendance ping failed:', err);
    }
  }

  function openStreamDirectly(platform) {
    const targetUrl = platform === 'youtube' ? WEBINAR_CONFIG.youtubeUrl : WEBINAR_CONFIG.googleMeetUrl;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  // Open Check-in Modal
  function openCheckinModal(platform) {
    pendingPlatform = platform;
    const platformName = platform === 'youtube' ? 'YouTube Live' : 'Google Meet';

    if (elModalTitle) elModalTitle.textContent = `Check-In for ${platformName}`;
    if (elModalDesc) elModalDesc.textContent = `Please enter your details to verify your seat and proceed directly to ${platformName}.`;
    if (elBtnCheckinText) elBtnCheckinText.textContent = `Continue to ${platformName}`;

    // Populate with any known values
    const stored = getStoredAttendee();
    if (stored) {
      if (elCheckinEmail && stored.email) elCheckinEmail.value = stored.email;
      if (elCheckinPhone && stored.phone) elCheckinPhone.value = stored.phone;
    }

    if (elEmailError) elEmailError.style.display = 'none';
    if (elPhoneError) elPhoneError.style.display = 'none';

    if (elModal) {
      elModal.classList.add('is-open');
      elModal.setAttribute('aria-hidden', 'false');
    }

    // Auto focus
    setTimeout(() => {
      if (elCheckinEmail && !elCheckinEmail.value) {
        elCheckinEmail.focus();
      } else if (elCheckinPhone && !elCheckinPhone.value) {
        elCheckinPhone.focus();
      }
    }, 100);
  }

  function closeCheckinModal() {
    if (elModal) {
      elModal.classList.remove('is-open');
      elModal.setAttribute('aria-hidden', 'true');
    }
  }

  // Stream button click handlers
  function setupStreamButtons() {
    if (elMeetBtn) {
      elMeetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!isLive) {
          showToast('Google Meet access opens at 8:30 AM WAT for early check-in.');
          return;
        }

        const stored = getStoredAttendee();
        if (stored && stored.verified && stored.email && stored.phone) {
          trackAttendance(stored.email, stored.phone, 'meet');
          openStreamDirectly('meet');
        } else {
          openCheckinModal('meet');
        }
      });
    }

    if (elYoutubeBtn) {
      elYoutubeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (!isLive) {
          showToast('YouTube Live access opens at 8:30 AM WAT for early check-in.');
          return;
        }

        const stored = getStoredAttendee();
        if (stored && stored.verified && stored.email && stored.phone) {
          trackAttendance(stored.email, stored.phone, 'youtube');
          openStreamDirectly('youtube');
        } else {
          openCheckinModal('youtube');
        }
      });
    }

    // Close Modal Events
    if (elModalClose) {
      elModalClose.addEventListener('click', closeCheckinModal);
    }
    if (elModal) {
      elModal.addEventListener('click', function (e) {
        if (e.target === elModal) closeCheckinModal();
      });
    }

    // Modal Form Submit
    if (elCheckinForm) {
      elCheckinForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = elCheckinEmail ? elCheckinEmail.value.trim() : '';
        const phone = elCheckinPhone ? elCheckinPhone.value.trim() : '';

        let hasError = false;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          if (elEmailError) elEmailError.style.display = 'block';
          hasError = true;
        } else {
          if (elEmailError) elEmailError.style.display = 'none';
        }

        if (!phone || phone.length < 7) {
          if (elPhoneError) elPhoneError.style.display = 'block';
          hasError = true;
        } else {
          if (elPhoneError) elPhoneError.style.display = 'none';
        }

        if (hasError) return;

        // Button loading
        if (elBtnCheckin) elBtnCheckin.disabled = true;
        if (elBtnCheckinText) elBtnCheckinText.textContent = 'Verifying...';

        try {
          // Record attendance
          await trackAttendance(email, phone, pendingPlatform);

          // Save verification state
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              email: email,
              phone: phone,
              verified: true,
              lastJoinedAt: new Date().toISOString()
            }));
          } catch (e) { }

          closeCheckinModal();
          showToast('Checked in successfully! Opening session...');
          openStreamDirectly(pendingPlatform);
        } finally {
          if (elBtnCheckin) elBtnCheckin.disabled = false;
          if (elBtnCheckinText) elBtnCheckinText.textContent = 'Continue to Stream';
        }
      });
    }
  }

  // Calendar setup
  function setupCalendars() {
    function formatUtc(d) {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }

    const joinUrl = `${window.location.origin}${window.location.pathname}`;

    const gCalBtn = document.getElementById('btnGoogleCal');
    if (gCalBtn) {
      const gcalUrl = new URL('https://calendar.google.com/calendar/render');
      gcalUrl.searchParams.set('action', 'TEMPLATE');
      gcalUrl.searchParams.set('text', WEBINAR_CONFIG.title);
      gcalUrl.searchParams.set('details', `${WEBINAR_CONFIG.description}\n\nJoin Live Webinar: ${joinUrl}`);
      gcalUrl.searchParams.set('location', joinUrl);
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
          `DESCRIPTION:${WEBINAR_CONFIG.description}\\n\\nJoin Live Webinar: ${joinUrl}`,
          `LOCATION:${joinUrl}`,
          `URL:${joinUrl}`,
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

  function init() {
    seedAttendeeFromUrlOrStorage();
    setupStreamButtons();
    setupCalendars();
    setupCopy();
    update();
    setInterval(update, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
