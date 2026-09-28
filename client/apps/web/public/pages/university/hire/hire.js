(function () {
  'use strict';

  // ==========================================
  // MOBILE NAVIGATION & ACCORDIONS
  // ==========================================
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }),
    );
  }

  // FAQ Accordion Toggle
  document.querySelectorAll('.faq-q').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      if (item) {
        item.classList.toggle('open');
      }
    });
  });

  // ==========================================
  // ALL WORLD COUNTRIES DATASET & SEARCHABLE PICKER
  // ==========================================
  const ALL_COUNTRIES = [
    { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
    { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
    { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
    { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
    { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
    { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
    { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
    { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
    { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
    { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
    { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
    { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
    { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
    { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
    { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
    { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
    { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
    { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
    { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
    { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
    { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
    { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
    { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
    { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
    { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
    { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
    { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
    { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
    { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
    { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
    { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
    { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
    { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
    { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
    { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
    { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
    { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  ];

  function setupCountryPicker(wrapId) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    const btn = wrap.querySelector('.country-picker-btn');
    const popover = wrap.querySelector('.country-dropdown-popover');
    const searchInput = wrap.querySelector('.country-search-input');
    const list = wrap.querySelector('.country-options-list');
    const hiddenCode = wrap.querySelector('input[type="hidden"]');
    const telInput = wrap.querySelector('input[type="tel"]');

    if (!btn || !popover || !list || !hiddenCode) return;

    function renderOptions(filterText = '') {
      list.innerHTML = '';
      const query = filterText.toLowerCase().trim();
      const currentSelected = hiddenCode.value;

      const filtered = ALL_COUNTRIES.filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          c.dial.includes(query) ||
          c.code.toLowerCase().includes(query)
        );
      });

      if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.style.padding = '12px 14px';
        empty.style.fontSize = '12px';
        empty.style.color = '#7A7A92';
        empty.style.textAlign = 'center';
        empty.textContent = 'No matching country';
        list.appendChild(empty);
        return;
      }

      filtered.forEach((c) => {
        const item = document.createElement('li');
        item.className = 'country-option' + (c.dial === currentSelected ? ' selected' : '');
        item.setAttribute('role', 'option');
        item.innerHTML = `
          <div class="country-opt-left">
            <span class="country-opt-flag">${c.flag}</span>
            <span>${c.name}</span>
          </div>
          <span class="country-opt-dial">${c.dial}</span>
        `;

        item.addEventListener('click', () => {
          hiddenCode.value = c.dial;
          btn.querySelector('.country-flag').textContent = c.flag;
          btn.querySelector('.country-dial').textContent = c.dial;
          closePopover();
          telInput?.focus();
        });

        list.appendChild(item);
      });
    }

    function openPopover() {
      popover.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      if (searchInput) {
        searchInput.value = '';
        renderOptions();
        setTimeout(() => searchInput.focus(), 50);
      }
    }

    function closePopover() {
      popover.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover.classList.contains('open')) {
        closePopover();
      } else {
        openPopover();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderOptions(e.target.value);
      });
      searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        closePopover();
      }
    });
  }

  setupCountryPicker('hire_phone_wrap');

  // ==========================================
  // INTERACTIVE ROLE CHIPS SELECTION
  // ==========================================
  const roleChips = document.querySelectorAll('.role-chip');
  roleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  function getSelectedRoles() {
    const selected = [];
    document.querySelectorAll('.role-chip.selected').forEach((chip) => {
      const val = chip.getAttribute('data-role');
      if (val) selected.push(val);
    });
    return selected;
  }

  // ==========================================
  // PHONE & EMAIL NORMALIZATION HELPERS
  // ==========================================
  function normalizeClientPhone(phoneStr, countryCode = '+234') {
    if (!phoneStr) return '';
    let digits = phoneStr.replace(/\D/g, '');
    const cleanCode = countryCode.replace(/\D/g, '');

    if (digits.startsWith('0') && cleanCode === '234') {
      digits = digits.substring(1);
    }
    if (digits.startsWith(cleanCode)) {
      return '+' + digits;
    }
    return '+' + cleanCode + digits;
  }

  function normalizeClientEmail(emailStr) {
    if (!emailStr) return '';
    return emailStr.trim().toLowerCase();
  }

  // ==========================================
  // HIRE REQUEST FORM SUBMISSION
  // ==========================================
  const hireForm = document.getElementById('hireTalentForm');
  const hireSubmitBtn = document.getElementById('hireSubmitBtn');
  const hireSuccessCard = document.getElementById('hireSuccessCard');

  if (hireForm) {
    hireForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      let hasError = false;

      const companyInput = document.getElementById('h_company');
      const contactNameInput = document.getElementById('h_contact_name');
      const contactRoleInput = document.getElementById('h_contact_role');
      const emailInput = document.getElementById('h_email');
      const countryCodeInput = document.getElementById('h_country_code');
      const phoneInput = document.getElementById('h_phone');
      const industrySelect = document.getElementById('h_industry');
      const citySelect = document.getElementById('h_city');
      const placementTypeSelect = document.getElementById('h_placement_type');
      const openingsSelect = document.getElementById('h_openings');
      const compensationSelect = document.getElementById('h_compensation');
      const timelineSelect = document.getElementById('h_timeline');
      const jobDescInput = document.getElementById('h_job_desc');

      function validateField(input, fieldId, condition) {
        const parent = document.getElementById(fieldId);
        if (!condition) {
          parent?.classList.add('error');
          hasError = true;
        } else {
          parent?.classList.remove('error');
        }
      }

      const selectedCode = countryCodeInput ? countryCodeInput.value : '+234';
      const rawPhone = phoneInput ? phoneInput.value.trim() : '';
      const normPhone = normalizeClientPhone(rawPhone, selectedCode);
      const normEmail = emailInput ? normalizeClientEmail(emailInput.value) : '';
      const selectedRoles = getSelectedRoles();

      validateField(companyInput, 'field_h_company', companyInput && companyInput.value.trim().length >= 2);
      validateField(contactNameInput, 'field_h_contact_name', contactNameInput && contactNameInput.value.trim().length >= 2);
      validateField(emailInput, 'field_h_email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail));
      validateField(phoneInput, 'field_h_phone', normPhone.replace(/\D/g, '').length >= 7);
      validateField(industrySelect, 'field_h_industry', industrySelect && industrySelect.value.trim() !== '');
      validateField(citySelect, 'field_h_city', citySelect && citySelect.value.trim() !== '');
      validateField(placementTypeSelect, 'field_h_placement_type', placementTypeSelect && placementTypeSelect.value.trim() !== '');

      function showFormError(msg) {
        const banner = document.getElementById('hireFormErrorBanner');
        if (banner) {
          banner.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span style="flex:1;">${msg}</span>
            <button type="button" class="form-error-close" onclick="this.parentElement.style.display='none'" title="Dismiss">&times;</button>
          `;
          banner.style.display = 'flex';
          banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      function hideFormError() {
        const banner = document.getElementById('hireFormErrorBanner');
        if (banner) banner.style.display = 'none';
      }

      hideFormError();

      if (hasError) {
        const firstError = document.querySelector('#hireTalentForm .field.error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (hireSubmitBtn) {
        hireSubmitBtn.disabled = true;
        hireSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting Request...';
      }

      const payload = {
        companyName: companyInput.value.trim(),
        contactName: contactNameInput.value.trim(),
        contactRole: contactRoleInput ? contactRoleInput.value.trim() || undefined : undefined,
        email: normEmail,
        phone: normPhone,
        industry: industrySelect.value.trim(),
        city: citySelect.value.trim(),
        placementType: placementTypeSelect.value.trim(),
        rolesNeeded: selectedRoles.length > 0 ? selectedRoles : undefined,
        openingsCount: openingsSelect ? openingsSelect.value.trim() : '1',
        compensationType: compensationSelect ? compensationSelect.value.trim() || undefined : undefined,
        startDate: timelineSelect ? timelineSelect.value.trim() || undefined : undefined,
        jobDescription: jobDescInput ? jobDescInput.value.trim() || undefined : undefined,
        sourceIdentifier:
          typeof window.getAcademySource === 'function'
            ? window.getAcademySource()
            : typeof window.getUniversitySource === 'function'
              ? window.getUniversitySource()
              : '',
        abVariant:
          typeof window.getAcademyAbVariant === 'function' ? window.getAcademyAbVariant() : 'A',
      };

      try {
        const res = await fetch('/api/v1/university/hire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          showFormError(errData.message || 'Submission failed. Please verify your details and try again.');
          if (hireSubmitBtn) {
            hireSubmitBtn.disabled = false;
            hireSubmitBtn.innerHTML = '<span>Submit Talent Request →</span>';
          }
          return;
        }

        const resData = await res.json().catch(() => ({}));

        // Analytics Track
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', {
            content_name: 'Employer Talent Request',
            content_category: payload.industry,
            value: 0.0,
            currency: 'NGN',
          });
        }
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', {
            event_category: 'Academy Hire Request',
            event_label: payload.companyName,
          });
        }

        // Show Success View
        hireForm.style.display = 'none';
        if (hireSuccessCard) {
          const rolesStr = selectedRoles.length > 0 ? selectedRoles.join(', ') : 'Property Management / Brokerage';
          const detailsEl = document.getElementById('successDetailsSummary');
          if (detailsEl) {
            detailsEl.innerHTML = `
              <div><strong>Company:</strong> ${payload.companyName}</div>
              <div><strong>Contact:</strong> ${payload.contactName} (${payload.email})</div>
              <div><strong>Track:</strong> ${payload.placementType} · ${payload.openingsCount} opening(s)</div>
              <div><strong>Target Roles:</strong> ${rolesStr}</div>
              <div><strong>Location:</strong> ${payload.city}</div>
            `;
          }

          const whatsappDirectBtn = document.getElementById('whatsappDirectBtn');
          if (whatsappDirectBtn) {
            const waMsg = encodeURIComponent(
              `Hello Upward Academy Placement Team, I just submitted a talent request for ${payload.companyName} (${payload.placementType}, ${payload.openingsCount} openings in ${payload.city}). I would like to connect with your placement desk.`
            );
            whatsappDirectBtn.href = `https://wa.me/2347069008282?text=${waMsg}`;
          }

          hireSuccessCard.style.display = 'block';
          const cardWrap = document.getElementById('hireFormCard');
          if (cardWrap) {
            cardWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } catch (err) {
        console.error('Hire request submit error:', err);
        showFormError('Network connection error. Please check your connection and try again.');
        if (hireSubmitBtn) {
          hireSubmitBtn.disabled = false;
          hireSubmitBtn.innerHTML = '<span>Submit Talent Request →</span>';
        }
      }
    });
  }

  // ==========================================
  // FLOATING CONTACT DRAWER
  // ==========================================
  const contactUsBtn = document.getElementById('contact-us-btn');
  const contactDrawer = document.getElementById('contact-drawer');
  const contactDrawerOverlay = document.getElementById('contact-drawer-overlay');
  const contactDrawerClose = document.getElementById('contact-drawer-close');

  function setContactDrawerOpen(open) {
    if (!contactDrawer || !contactDrawerOverlay) return;
    contactDrawer.classList.toggle('is-open', open);
    contactDrawerOverlay.classList.toggle('is-open', open);
    contactDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    contactDrawerOverlay.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  contactUsBtn?.addEventListener('click', () => setContactDrawerOpen(true));
  contactDrawerClose?.addEventListener('click', () => setContactDrawerOpen(false));
  contactDrawerOverlay?.addEventListener('click', () => setContactDrawerOpen(false));
})();
