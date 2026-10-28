/**
 * Upward Academy — Property Management Webinar Page Script
 * High-performance, self-contained interactivity, form validation & calendar generation
 */
(function () {
  'use strict';

  // 1. Comprehensive Countries Dataset for Phone Code Picker
  const ALL_COUNTRIES = [
    { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
    { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
    { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
    { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
    { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
    { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
    { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
    { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
    { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
    { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
    { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
    { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
    { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
    { code: 'CI', name: 'Ivory Coast', dial: '+225', flag: '🇨🇮' },
    { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' }
  ];



  // 3. Country Code Picker Logic
  function setupCountryPicker() {
    const pickerBtn = document.getElementById('countryPickerBtn');
    const popover = document.getElementById('countryPopover');
    const searchInput = document.getElementById('countrySearchInput');
    const optionsList = document.getElementById('countryOptionsList');
    const hiddenDialInput = document.getElementById('webinar_country_code');
    const flagSpan = pickerBtn ? pickerBtn.querySelector('.country-flag') : null;
    const dialSpan = pickerBtn ? pickerBtn.querySelector('.country-dial') : null;

    if (!pickerBtn || !popover || !optionsList) return;

    function renderOptions(filterText) {
      optionsList.innerHTML = '';
      const query = (filterText || '').toLowerCase().trim();
      const filtered = ALL_COUNTRIES.filter(function (c) {
        return c.name.toLowerCase().includes(query) || c.dial.includes(query) || c.code.toLowerCase().includes(query);
      });

      if (filtered.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.padding = '12px 14px';
        emptyLi.style.fontSize = '13px';
        emptyLi.style.color = 'var(--ink-soft)';
        emptyLi.textContent = 'No matching countries';
        optionsList.appendChild(emptyLi);
        return;
      }

      filtered.forEach(function (country) {
        const li = document.createElement('li');
        li.className = 'country-option';
        li.setAttribute('role', 'option');
        li.innerHTML = '<span class="country-flag">' + country.flag + '</span>' +
          '<span class="country-name">' + country.name + '</span>' +
          '<span class="country-dial">' + country.dial + '</span>';

        li.addEventListener('click', function (e) {
          e.stopPropagation();
          if (hiddenDialInput) hiddenDialInput.value = country.dial;
          if (flagSpan) flagSpan.textContent = country.flag;
          if (dialSpan) dialSpan.textContent = country.dial;
          popover.classList.remove('open');
          pickerBtn.setAttribute('aria-expanded', 'false');
          document.getElementById('webinar_phone')?.focus();
        });

        optionsList.appendChild(li);
      });
    }

    renderOptions('');

    pickerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = popover.classList.toggle('open');
      pickerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen && searchInput) {
        searchInput.value = '';
        renderOptions('');
        setTimeout(function () { searchInput.focus(); }, 50);
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderOptions(searchInput.value);
      });
      searchInput.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    document.addEventListener('click', function (e) {
      if (!popover.contains(e.target) && !pickerBtn.contains(e.target)) {
        popover.classList.remove('open');
        pickerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 4. FAQ Accordion Logic
  function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item) {
      const questionBtn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!questionBtn || !answer) return;

      questionBtn.addEventListener('click', function () {
        const isCurrentlyOpen = item.classList.contains('open');

        // Close other items
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
            const otherBtn = otherItem.querySelector('.faq-question');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
          }
        });

        if (isCurrentlyOpen) {
          item.classList.remove('open');
          questionBtn.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('open');
          questionBtn.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  // 5. Contact Drawer Float
  function setupContactDrawer() {
    const contactUsBtn = document.getElementById('contact-us-btn');
    const contactDrawer = document.getElementById('contact-drawer');
    const contactDrawerOverlay = document.getElementById('contact-drawer-overlay');
    const contactDrawerClose = document.getElementById('contact-drawer-close');

    function setDrawerOpen(open) {
      if (!contactDrawer || !contactDrawerOverlay) return;
      contactDrawer.classList.toggle('is-open', open);
      contactDrawerOverlay.classList.toggle('is-open', open);
      contactDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      contactDrawerOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    contactUsBtn?.addEventListener('click', function () { setDrawerOpen(true); });
    contactDrawerClose?.addEventListener('click', function () { setDrawerOpen(false); });
    contactDrawerOverlay?.addEventListener('click', function () { setDrawerOpen(false); });
  }

  // 6. Calendar Integration Helpers
  function generateGoogleCalendarUrl(title, details, location, startDate, endDate) {
    function formatDate(date) {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: details,
      location: location,
      dates: formatDate(startDate) + '/' + formatDate(endDate),
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function downloadIcsFile(title, details, location, startDate, endDate) {
    function formatDate(date) {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Upward Academy//Webinar Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@upward.ng',
      'DTSTAMP:' + formatDate(new Date()),
      'DTSTART:' + formatDate(startDate),
      'DTEND:' + formatDate(endDate),
      'SUMMARY:' + title,
      'DESCRIPTION:' + details.replace(/\n/g, '\\n'),
      'LOCATION:' + location,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Upward_Academy_Webinar_Oct29.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 7. Form Validation & Submission Logic
  function setupWebinarForm() {
    const form = document.getElementById('webinarRegistrationForm');
    const submitBtn = document.getElementById('webinarSubmitBtn');
    const errorBanner = document.getElementById('formErrorBanner');
    const successBox = document.getElementById('webinarSuccessBox');
    const urgencyCard = document.getElementById('seatUrgencyCard');
    const formHeader = document.querySelector('.form-header');

    if (!form) return;

    function clearFieldErrors() {
      form.querySelectorAll('.field').forEach(function (field) {
        field.classList.remove('has-error');
      });
      if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.textContent = '';
      }
    }

    function markFieldError(fieldId, errorMsg) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.add('has-error');
        const errEl = field.querySelector('.field-error-msg');
        if (errEl && errorMsg) errEl.textContent = errorMsg;
      }
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFieldErrors();

      const nameInput = document.getElementById('webinar_name');
      const countryCodeInput = document.getElementById('webinar_country_code');
      const phoneInput = document.getElementById('webinar_phone');
      const emailInput = document.getElementById('webinar_email');
      const citySelect = document.getElementById('webinar_city');
      const ageSelect = document.getElementById('webinar_age');
      const expSelect = document.getElementById('webinar_exp');

      const name = nameInput ? nameInput.value.trim() : '';
      const dialCode = countryCodeInput ? countryCodeInput.value.trim() : '+234';
      const rawPhone = phoneInput ? phoneInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const city = citySelect ? citySelect.value.trim() : '';
      const ageBracket = ageSelect ? ageSelect.value.trim() : '';
      const experienceLevel = expSelect ? expSelect.value.trim() : '';

      let hasError = false;

      if (!name || name.length < 2) {
        markFieldError('field_webinar_name', 'Please enter your full name (at least 2 characters)');
        hasError = true;
      }

      const cleanedPhone = rawPhone.replace(/\D/g, '');
      if (!rawPhone || cleanedPhone.length < 7) {
        markFieldError('field_webinar_phone', 'Please enter a valid WhatsApp phone number');
        hasError = true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        markFieldError('field_webinar_email', 'Please enter a valid email address');
        hasError = true;
      }

      if (!city) {
        markFieldError('field_webinar_city', 'Please select your current city');
        hasError = true;
      }

      if (!ageBracket) {
        markFieldError('field_webinar_age', 'Please select your age bracket');
        hasError = true;
      }

      if (!experienceLevel) {
        markFieldError('field_webinar_exp', 'Please select your experience level');
        hasError = true;
      }

      if (hasError) return;

      // Construct full normalized phone
      let formattedPhone = rawPhone;
      if (rawPhone.startsWith('0')) {
        formattedPhone = dialCode + rawPhone.slice(1);
      } else if (!rawPhone.startsWith('+')) {
        formattedPhone = dialCode + rawPhone;
      }

      // Gather Attribution and Analytics
      const sourceIdentifier = typeof window.getAcademySource === 'function'
        ? window.getAcademySource()
        : typeof window.getUniversitySource === 'function'
          ? window.getUniversitySource()
          : '';
      const abVariant = typeof window.getAcademyAbVariant === 'function' ? window.getAcademyAbVariant() : 'A';

      const payload = {
        name: name,
        whatsapp: formattedPhone,
        email: email,
        city: city,
        ageBracket: ageBracket,
        experienceLevel: experienceLevel,
        track: 'Property Management Webinar',
        sessionTime: 'Thursday 29th October 2026, 11:00 AM (Online)',
        interest: 'Build a 6 Figure Income Career/Business in Property Management - Live Webinar',
        sourceIdentifier: sourceIdentifier,
        abVariant: abVariant
      };

      // Button loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> <span>Securing Your Free Seat...</span>';
      }

      try {
        const response = await fetch('/api/v1/early-access/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(function () { return {}; });
          throw new Error(errData.message || 'Registration failed. Please check your details and try again.');
        }

        // Fire Pixel & Tracking events
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'CompleteRegistration', {
            content_name: 'Property Management Webinar Oct 29',
            status: 'Confirmed'
          });
        }
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'sign_up', {
            method: 'Webinar Registration',
            event_category: 'Webinar'
          });
        }

        // Smooth transition to Success State
        const firstName = name.split(' ')[0] || 'Friend';
        const successTitle = document.getElementById('successAttendeeName');
        if (successTitle) {
          successTitle.textContent = 'Seat Confirmed, ' + firstName + '! 🎉';
        }

        form.style.display = 'none';
        if (formHeader) formHeader.style.display = 'none';
        if (urgencyCard) urgencyCard.style.display = 'none';
        if (successBox) successBox.classList.add('visible');

        // Setup 1-Click Calendar Links
        // Event Date: Thursday October 29, 2026 at 11:00 AM WAT (UTC+1) -> 10:00 AM UTC
        const webinarStart = new Date(Date.UTC(2026, 9, 29, 10, 0, 0));
        const webinarEnd = new Date(Date.UTC(2026, 9, 29, 11, 30, 0));
        const eventTitle = 'Upward Academy: Property Management Career & Business Webinar';
        const eventDetails = 'FREE Live Webinar: Build a 6 Figure Income Career/Business in Property Management.\n\nJoin link & access details will be sent via WhatsApp & Email before 11:00 AM WAT.';
        const eventLocation = 'Online (Live Stream / Zoom)';

        const googleCalBtn = document.getElementById('btnGoogleCalendar');
        if (googleCalBtn) {
          googleCalBtn.href = generateGoogleCalendarUrl(eventTitle, eventDetails, eventLocation, webinarStart, webinarEnd);
          googleCalBtn.target = '_blank';
        }

        const appleCalBtn = document.getElementById('btnAppleCalendar');
        if (appleCalBtn) {
          appleCalBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            downloadIcsFile(eventTitle, eventDetails, eventLocation, webinarStart, webinarEnd);
          });
        }

        // Setup WhatsApp Waitlist Community Link
        const whatsappCommunityBtn = document.getElementById('btnWebinarWhatsappCommunity');
        if (whatsappCommunityBtn) {
          whatsappCommunityBtn.href = 'https://chat.whatsapp.com/LcFwiekT2UQLUSzrm2zGER?s=cl&p=a&mlu=4&ilr=4&iam=2';
        }

        // Scroll smoothly to success box
        successBox?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      } catch (err) {
        console.error('Registration error:', err);
        if (errorBanner) {
          errorBanner.textContent = err.message || 'Something went wrong. Please check your internet connection or try again.';
          errorBanner.style.display = 'block';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Reserve My Free Spot →</span>';
        }
      }
    });
  }

  // Initialize all interactive modules on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  function initAll() {
    setupCountryPicker();
    setupFaqAccordion();
    setupContactDrawer();
    setupWebinarForm();
  }
})();
