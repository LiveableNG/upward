

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

  // Schedule slot sync with select input
  const slotItems = document.querySelectorAll('.slot-item');
  const sessionSelect = document.getElementById('ea_session_time');

  slotItems.forEach((slot) => {
    slot.addEventListener('click', () => {
      if (slot.classList.contains('concluded') || slot.classList.contains('disabled')) {
        return;
      }
      // Ensure registration tab is active
      switchTab('register');

      slotItems.forEach((s) => s.classList.remove('selected'));
      slot.classList.add('selected');
      const timeVal = slot.getAttribute('data-time');
      if (sessionSelect && timeVal) {
        sessionSelect.value = timeVal;
      }

      // Smoothly scroll to the form
      const formCard = document.getElementById('formCard');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const nameInput = document.getElementById('ea_name');
      if (nameInput) {
        setTimeout(() => nameInput.focus({ preventScroll: true }), 350);
      }
    });
  });

  if (sessionSelect) {
    sessionSelect.addEventListener('change', () => {
      const current = sessionSelect.value;
      slotItems.forEach((s) => {
        if (s.getAttribute('data-time') === current) {
          s.classList.add('selected');
        } else {
          s.classList.remove('selected');
        }
      });
    });
  }

  // ==========================================
  // TRACK PICKER SELECTION & PRE-FILL
  // ==========================================
  const trackCards = document.querySelectorAll('.track-picker-card');
  const trackInput = document.getElementById('ea_track');

  function setTrack(trackKey) {
    const isTrack2 = trackKey === 'track2' || trackKey === '2' || trackKey.toLowerCase().includes('started');
    const targetKey = isTrack2 ? 'track2' : 'track1';
    const trackLabel = isTrack2 ? 'Track 2' : 'Track 1';

    if (trackInput) {
      trackInput.value = trackLabel;
    }

    trackCards.forEach((card) => {
      const match = card.getAttribute('data-track') === targetKey;
      card.classList.toggle('selected', match);
      card.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    const trackField = document.getElementById('field_track');
    if (trackField) {
      trackField.classList.remove('error');
    }
  }

  trackCards.forEach((card) => {
    card.addEventListener('click', () => {
      const trackVal = card.getAttribute('data-track');
      setTrack(trackVal);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const trackVal = card.getAttribute('data-track');
        setTrack(trackVal);
      }
    });
  });

  // Check URL param for prefilling track in session booking
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialTrack = urlParams.get('track');
    if (initialTrack) {
      setTrack(initialTrack);
      if (typeof switchTab === 'function') {
        switchTab('register');
      }
      setTimeout(() => {
        const formCard = document.getElementById('formCard');
        if (formCard) {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
    }
  } catch (e) {
    // Graceful fallback
  }

  // ==========================================
  // ALL WORLD COUNTRIES DATASET & SEARCHABLE PICKER
  // ==========================================
  const ALL_COUNTRIES = [
    { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
    { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
    { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
    { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
    { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
    { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
    { code: 'AI', name: 'Anguilla', dial: '+1264', flag: '🇦🇮' },
    { code: 'AG', name: 'Antigua & Barbuda', dial: '+1268', flag: '🇦🇬' },
    { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
    { code: 'AM', name: 'Armenia', dial: '+374', flag: '🇦🇲' },
    { code: 'AW', name: 'Aruba', dial: '+297', flag: '🇦🇼' },
    { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
    { code: 'AZ', name: 'Azerbaijan', dial: '+994', flag: '🇦🇿' },
    { code: 'BS', name: 'Bahamas', dial: '+1242', flag: '🇧🇸' },
    { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
    { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
    { code: 'BB', name: 'Barbados', dial: '+1246', flag: '🇧🇧' },
    { code: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
    { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
    { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
    { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
    { code: 'BM', name: 'Bermuda', dial: '+1441', flag: '🇧🇲' },
    { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
    { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
    { code: 'BA', name: 'Bosnia', dial: '+387', flag: '🇧🇦' },
    { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
    { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
    { code: 'VG', name: 'British Virgin Islands', dial: '+1284', flag: '🇻🇬' },
    { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
    { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
    { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
    { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
    { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭' },
    { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
    { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { code: 'CV', name: 'Cape Verde', dial: '+238', flag: '🇨🇻' },
    { code: 'KY', name: 'Cayman Islands', dial: '+1345', flag: '🇰🇾' },
    { code: 'CF', name: 'Central African Rep.', dial: '+236', flag: '🇨🇫' },
    { code: 'TD', name: 'Chad', dial: '+235', flag: '🇹🇩' },
    { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
    { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
    { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
    { code: 'KM', name: 'Comoros', dial: '+269', flag: '🇰🇲' },
    { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬' },
    { code: 'CD', name: 'Congo (DRC)', dial: '+243', flag: '🇨🇩' },
    { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
    { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
    { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
    { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
    { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
    { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
    { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
    { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
    { code: 'DM', name: 'Dominica', dial: '+1767', flag: '🇩🇲' },
    { code: 'DO', name: 'Dominican Republic', dial: '+1809', flag: '🇩🇴' },
    { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
    { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
    { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
    { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', flag: '🇬🇶' },
    { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
    { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
    { code: 'SZ', name: 'Eswatini', dial: '+268', flag: '🇸🇿' },
    { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
    { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
    { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
    { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
    { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
    { code: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
    { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
    { code: 'GI', name: 'Gibraltar', dial: '+350', flag: '🇬🇮' },
    { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
    { code: 'GD', name: 'Grenada', dial: '+1473', flag: '🇬🇩' },
    { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
    { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳' },
    { code: 'GW', name: 'Guinea-Bissau', dial: '+245', flag: '🇬🇼' },
    { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
    { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
    { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
    { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
    { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
    { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
    { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
    { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
    { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
    { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
    { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
    { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
    { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
    { code: 'JM', name: 'Jamaica', dial: '+1876', flag: '🇯🇲' },
    { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
    { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
    { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
    { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
    { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
    { code: 'KG', name: 'Kyrgyzstan', dial: '+996', flag: '🇰🇬' },
    { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
    { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
    { code: 'LY', name: 'Libya', dial: '+218', flag: '🇱🇾' },
    { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
    { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
    { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
    { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
    { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
    { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺' },
    { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
    { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
    { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
    { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
    { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
    { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
    { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
    { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
    { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
    { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
    { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
    { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
    { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
    { code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸' },
    { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
    { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
    { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
    { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
    { code: 'PR', name: 'Puerto Rico', dial: '+1787', flag: '🇵🇷' },
    { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
    { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
    { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
    { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
    { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
    { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
    { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
    { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
    { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
    { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
    { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
    { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸' },
    { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
    { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
    { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩' },
    { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
    { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
    { code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾' },
    { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
    { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
    { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
    { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
    { code: 'TT', name: 'Trinidad & Tobago', dial: '+1868', flag: '🇹🇹' },
    { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
    { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
    { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
    { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
    { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
    { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
    { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
    { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
    { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
    { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
    { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
    { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
  ];

  function setupSearchableCountryPicker(containerEl, defaultCode = '+234') {
    if (!containerEl) return;
    const btn = containerEl.querySelector('.country-picker-btn');
    const popover = containerEl.querySelector('.country-dropdown-popover');
    const searchInput = containerEl.querySelector('.country-search-input');
    const listEl = containerEl.querySelector('.country-options-list');
    const hiddenInput = containerEl.querySelector('input[type="hidden"]');
    const phoneInput = containerEl.querySelector('input[type="tel"]');
    const flagSpan = btn ? btn.querySelector('.country-flag') : null;
    const dialSpan = btn ? btn.querySelector('.country-dial') : null;

    if (!btn || !popover || !searchInput || !listEl) return;

    let activeCode = defaultCode;

    function renderList(query = '') {
      const q = query.trim().toLowerCase();
      const filtered = ALL_COUNTRIES.filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.dial.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
        );
      });

      listEl.innerHTML = '';
      if (filtered.length === 0) {
        listEl.innerHTML = `<li style="padding:14px; text-align:center; color:var(--ink-soft); font-size:12.5px;">No country found</li>`;
        return;
      }

      filtered.forEach((c) => {
        const li = document.createElement('li');
        li.className = 'country-option-item' + (c.dial === activeCode ? ' selected' : '');
        li.setAttribute('role', 'option');
        li.innerHTML = `
          <div class="country-opt-left">
            <span class="country-opt-flag">${c.flag}</span>
            <span class="country-opt-name">${c.name}</span>
          </div>
          <span class="country-opt-dial">${c.dial}</span>
        `;
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          selectCountry(c);
        });
        listEl.appendChild(li);
      });
    }

    function selectCountry(c) {
      activeCode = c.dial;
      if (hiddenInput) hiddenInput.value = c.dial;
      if (flagSpan) flagSpan.textContent = c.flag;
      if (dialSpan) dialSpan.textContent = c.dial;
      closePopover();
      if (phoneInput) {
        phoneInput.focus();
      }
    }

    function openPopover() {
      document
        .querySelectorAll('.country-dropdown-popover.open')
        .forEach((p) => {
          if (p !== popover) p.classList.remove('open');
        });
      document
        .querySelectorAll('.country-picker-btn.open')
        .forEach((b) => {
          if (b !== btn) b.classList.remove('open');
        });

      popover.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      renderList('');
      setTimeout(() => searchInput.focus(), 60);
    }

    function closePopover() {
      popover.classList.remove('open');
      btn.classList.remove('open');
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

    searchInput.addEventListener('input', (e) => {
      renderList(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePopover();
        btn.focus();
      }
    });

    popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    renderList('');
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.country-dropdown-popover.open').forEach((p) => p.classList.remove('open'));
    document.querySelectorAll('.country-picker-btn.open').forEach((b) => b.classList.remove('open'));
  });

  // Initialize pickers on load
  document.querySelectorAll('.phone-input-wrap').forEach((wrap) => {
    setupSearchableCountryPicker(wrap);
  });

  // ==========================================
  // PHONE & EMAIL NORMALIZATION HELPERS
  // ==========================================
  function normalizeClientPhone(raw, countryCode) {
    if (!raw) return '';
    let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');
    const code = countryCode || '+234';

    if (cleaned.startsWith('+')) {
      if (cleaned.startsWith('+2340') && cleaned.length === 15) {
        return '+234' + cleaned.substring(5);
      }
      return cleaned;
    }
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
    if (code === '+234') {
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        return '+234' + cleaned.substring(1);
      }
      if (cleaned.length === 10 && /^[789]\d{9}$/.test(cleaned)) {
        return '+234' + cleaned;
      }
      if (cleaned.startsWith('234') && cleaned.length === 13) {
        return '+' + cleaned;
      }
      if (cleaned.startsWith('0')) {
        return '+234' + cleaned.substring(1);
      }
      return '+234' + cleaned;
    } else {
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      return code + cleaned;
    }
  }

  function normalizeClientEmail(raw) {
    return raw ? raw.trim().toLowerCase() : '';
  }

  // ==========================================
  // TAB / MODE SWITCHER (REGISTER vs DIRECT REFER)
  // ==========================================
  const tabBtnRegister = document.getElementById('tabBtnRegister');
  const tabBtnRefer = document.getElementById('tabBtnRefer');
  const tabContentRegister = document.getElementById('tabContentRegister');
  const tabContentRefer = document.getElementById('tabContentRefer');

  function switchTab(mode) {
    if (mode === 'refer') {
      tabBtnRegister?.classList.remove('active');
      tabBtnRefer?.classList.add('active');
      tabContentRegister?.classList.remove('active');
      tabContentRefer?.classList.add('active');
      if (tabContentRegister) tabContentRegister.style.display = 'none';
      if (tabContentRefer) tabContentRefer.style.display = 'block';

      // Update URL hash without reload
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#refer');
      }
    } else {
      tabBtnRefer?.classList.remove('active');
      tabBtnRegister?.classList.add('active');
      tabContentRefer?.classList.remove('active');
      tabContentRegister?.classList.add('active');
      if (tabContentRefer) tabContentRefer.style.display = 'none';
      if (tabContentRegister) tabContentRegister.style.display = 'block';

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#register');
      }
    }
  }

  tabBtnRegister?.addEventListener('click', () => switchTab('register'));
  tabBtnRefer?.addEventListener('click', () => switchTab('refer'));

  // Quick switch links / buttons
  document.querySelectorAll('[data-switch-tab]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const targetMode = el.getAttribute('data-switch-tab');
      switchTab(targetMode);
      const formCard = document.getElementById('formCard');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Check initial URL hash or query param
  const urlParams = new URLSearchParams(window.location.search);
  if (
    window.location.hash === '#refer' ||
    window.location.hash === '#referrals' ||
    urlParams.get('mode') === 'refer' ||
    urlParams.get('tab') === 'refer'
  ) {
    switchTab('refer');
  }

  // ==========================================
  // SESSION REGISTRATION FORM SUBMISSION
  // ==========================================
  let currentRegistrant = null;
  const regForm = document.getElementById('sessionRegistrationForm');
  const regSubmitBtn = document.getElementById('submitBtn');
  const successBox = document.getElementById('sessionSuccess');

  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      let hasError = false;

      const nameInput = document.getElementById('ea_name');
      const countryCodeInput = document.getElementById('ea_country_code');
      const whatsappInput = document.getElementById('ea_whatsapp');
      const emailInput = document.getElementById('ea_email');
      const citySelect = document.getElementById('ea_city');
      const ageSelect = document.getElementById('ea_age');
      const expSelect = document.getElementById('ea_exp');
      const sessionSelect = document.getElementById('ea_session_time');
      const interestInput = document.getElementById('ea_interest');

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
      const rawPhone = whatsappInput ? whatsappInput.value.trim() : '';
      const normPhone = normalizeClientPhone(rawPhone, selectedCode);
      const normEmail = emailInput ? normalizeClientEmail(emailInput.value) : '';

      validateField(nameInput, 'field_name', nameInput && nameInput.value.trim().length >= 2);
      validateField(whatsappInput, 'field_whatsapp', normPhone.replace(/\D/g, '').length >= 7);
      validateField(emailInput, 'field_email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail));
      validateField(citySelect, 'field_city', citySelect && citySelect.value.trim() !== '');
      validateField(ageSelect, 'field_age', ageSelect && ageSelect.value.trim() !== '');
      validateField(expSelect, 'field_exp', expSelect && expSelect.value.trim() !== '');
      const trackVal = trackInput ? trackInput.value : 'Track 1';
      validateField(trackInput, 'field_track', Boolean(trackVal));
      validateField(sessionSelect, 'field_session_time', sessionSelect && sessionSelect.value.trim() !== '');

      function showFormError(msg) {
        const banner = document.getElementById('formErrorBanner');
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
        const banner = document.getElementById('formErrorBanner');
        if (banner) banner.style.display = 'none';
      }

      hideFormError();

      if (hasError) {
        const firstError = document.querySelector('#sessionRegistrationForm .field.error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (regSubmitBtn) {
        regSubmitBtn.disabled = true;
        regSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Reserving Seat...';
      }

      const userInterest = interestInput ? interestInput.value.trim() : '';
      const formattedInterest = userInterest
        ? `[${trackVal}] ${userInterest}`
        : `[${trackVal}] Info Session Attendee`;

      const payload = {
        name: nameInput.value.trim(),
        whatsapp: normPhone,
        email: normEmail,
        city: citySelect.value.trim(),
        ageBracket: ageSelect.value.trim(),
        experienceLevel: expSelect.value.trim(),
        track: trackVal,
        interest: formattedInterest,
        sessionTime: sessionSelect.value.trim(),
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
        const res = await fetch('/api/v1/early-access/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          showFormError(errData.message || 'Submission failed. Please check your details and try again.');
          if (regSubmitBtn) {
            regSubmitBtn.disabled = false;
            regSubmitBtn.innerHTML = '<span>Confirm My Free Seat →</span>';
          }
          return;
        }

        const resData = await res.json().catch(() => ({}));
        const registrantId = resData?.data?.id || null;

        currentRegistrant = {
          id: registrantId,
          name: payload.name,
          phone: payload.whatsapp,
          email: payload.email,
        };

        // Analytics conversion events
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Subscribe', { content_name: 'Info & QA Session Registration' });
          window.fbq('track', 'Lead', { content_name: 'Upward Academy Info Session' });
        }
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: 'AW-18414957187/iJ36CIv2lO4cEIPl98xE',
            value: 1.0,
            currency: 'USD',
          });
        }

        // Hide tab switcher and form, show Success UI
        const tabSwitcher = document.getElementById('sessionModeTabs');
        if (tabSwitcher) tabSwitcher.style.display = 'none';

        regForm.style.display = 'none';
        const firstName = payload.name.split(' ')[0];
        const successTitle = document.getElementById('successTitle');
        if (successTitle && firstName) {
          successTitle.textContent = `Thank You, ${firstName}!`;
        }
        const successSessionTime = document.getElementById('successSessionTime');
        if (successSessionTime) {
          successSessionTime.innerHTML = `<i class="fa-solid fa-calendar-check" style="color:var(--rust); margin-right:6px;"></i> ${payload.sessionTime}`;
        }
        if (successBox) {
          successBox.classList.add('show');
        }

        // Initialize Referral System inside success screen
        initReferralWidget({
          containerId: 'postSuccessReferralContainer',
          listId: 'postSuccessReferralList',
          addBtnId: 'postSuccessBtnAddRef',
          counterId: 'postSuccessRefCounter',
          submitBtnId: 'postSuccessBtnSubmit',
          skipBtnId: 'postSuccessBtnSkip',
          resultsId: 'postSuccessRefResults',
          resultsListId: 'postSuccessRefResultsList',
          whatsappShareId: 'postSuccessBtnWhatsappShare',
          errorBannerId: 'postSuccessRefErrorBanner',
          getRegistrant: () => currentRegistrant,
        });
      } catch (err) {
        console.error('Network error during session registration:', err);
        showFormError('Network error. Please check your internet connection and try again.');
        if (regSubmitBtn) {
          regSubmitBtn.disabled = false;
          regSubmitBtn.innerHTML = '<span>Confirm My Free Seat →</span>';
        }
      }
    });
  }

  // ==========================================
  // REUSABLE REFERRAL WIDGET ENGINE
  // ==========================================
  function initReferralWidget(config) {
    const listEl = document.getElementById(config.listId);
    const addBtn = document.getElementById(config.addBtnId);
    const counterEl = document.getElementById(config.counterId);
    const submitBtn = document.getElementById(config.submitBtnId);
    const skipBtn = document.getElementById(config.skipBtnId);
    const formContainer = document.getElementById(config.containerId);
    const resultsContainer = document.getElementById(config.resultsId);
    const resultsList = document.getElementById(config.resultsListId);
    const whatsappShareBtn = document.getElementById(config.whatsappShareId);
    const errorBanner = document.getElementById(config.errorBannerId);

    if (!listEl) return;

    const MAX_REFERRALS = 5;

    function updateCounter() {
      const items = listEl.querySelectorAll('.referral-item');
      const count = items.length;
      if (counterEl) {
        counterEl.textContent = `${count} of ${MAX_REFERRALS} recommended`;
      }
      if (addBtn) {
        addBtn.style.display = count >= MAX_REFERRALS ? 'none' : 'inline-flex';
      }

      items.forEach((item, idx) => {
        item.setAttribute('data-index', idx);
        const numSpan = item.querySelector('.referral-item-num');
        if (numSpan) {
          numSpan.innerHTML = `<i class="fa-solid fa-user-plus"></i> Friend ${idx + 1}`;
        }

        let removeBtn = item.querySelector('.btn-remove-ref');
        if (count > 1) {
          if (!removeBtn) {
            const header = item.querySelector('.referral-item-header');
            removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-ref';
            removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove';
            removeBtn.addEventListener('click', () => {
              item.remove();
              updateCounter();
            });
            header?.appendChild(removeBtn);
          }
        } else if (removeBtn) {
          removeBtn.remove();
        }
      });
    }

    function createReferralRow(index) {
      const item = document.createElement('div');
      item.className = 'referral-item';
      item.setAttribute('data-index', index);
      item.innerHTML = `
        <div class="referral-item-header">
          <span class="referral-item-num"><i class="fa-solid fa-user-plus"></i> Friend ${index + 1}</span>
          <button type="button" class="btn-remove-ref"><i class="fa-solid fa-trash-can"></i> Remove</button>
        </div>
        <div class="referral-item-fields">
          <div class="ref-field">
            <input type="text" class="ref-input-name" placeholder="Full name (optional)">
          </div>
          <div class="ref-field">
            <div class="phone-input-wrap ref-phone-wrap">
              <input type="hidden" class="ref-input-code" value="+234">
              <button type="button" class="country-picker-btn" aria-haspopup="listbox" aria-expanded="false" title="Select Country Code">
                <span class="country-flag">🇳🇬</span>
                <span class="country-dial">+234</span>
                <span class="arrow"><i class="fa-solid fa-chevron-down"></i></span>
              </button>
              <div class="country-dropdown-popover">
                <div class="country-search-bar">
                  <input type="text" class="country-search-input" placeholder="Search country or code..." autocomplete="off">
                </div>
                <ul class="country-options-list" role="listbox"></ul>
              </div>
              <input type="tel" class="ref-input-phone" placeholder="Phone e.g. 08124618329">
            </div>
          </div>
          <div class="ref-field">
            <input type="email" class="ref-input-email" placeholder="Email address">
          </div>
        </div>
      `;

      const removeBtn = item.querySelector('.btn-remove-ref');
      removeBtn?.addEventListener('click', () => {
        item.remove();
        updateCounter();
      });

      const phoneWrap = item.querySelector('.ref-phone-wrap');
      if (phoneWrap) {
        setupSearchableCountryPicker(phoneWrap);
      }

      return item;
    }

    // Initialize existing phone wrappers in list
    listEl.querySelectorAll('.ref-phone-wrap').forEach((el) => setupSearchableCountryPicker(el));

    addBtn?.addEventListener('click', () => {
      const currentCount = listEl.querySelectorAll('.referral-item').length;
      if (currentCount < MAX_REFERRALS) {
        const newRow = createReferralRow(currentCount);
        listEl.appendChild(newRow);
        updateCounter();
        const firstInput = newRow.querySelector('.ref-input-name');
        if (firstInput) firstInput.focus();
      }
    });

    updateCounter();

    function showError(msg) {
      if (errorBanner) {
        errorBanner.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span style="flex:1;">${msg}</span>
          <button type="button" class="ref-error-close" onclick="this.parentElement.style.display='none'" title="Dismiss">&times;</button>
        `;
        errorBanner.style.display = 'flex';
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function hideError() {
      if (errorBanner) errorBanner.style.display = 'none';
    }

    submitBtn?.addEventListener('click', async () => {
      hideError();

      // Retrieve referrer info
      const registrant = config.getRegistrant ? config.getRegistrant() : null;
      if (!registrant || !registrant.name || !registrant.phone) {
        showError('Please provide your name and phone number so we can credit your 10% referral fee.');
        return;
      }

      const items = listEl.querySelectorAll('.referral-item');
      const referrals = [];

      items.forEach((item) => {
        const nameVal = item.querySelector('.ref-input-name')?.value.trim() || '';
        const codeVal = item.querySelector('.ref-input-code')?.value || '+234';
        const rawPhone = item.querySelector('.ref-input-phone')?.value.trim() || '';
        const rawEmail = item.querySelector('.ref-input-email')?.value.trim() || '';

        const normPhone = rawPhone ? normalizeClientPhone(rawPhone, codeVal) : '';
        const normEmail = rawEmail ? normalizeClientEmail(rawEmail) : '';

        if (normPhone || normEmail) {
          referrals.push({
            name: nameVal || undefined,
            phone: normPhone || undefined,
            email: normEmail || undefined,
          });
        }
      });

      if (referrals.length === 0) {
        showError('Please enter at least one friend’s phone number or email address before submitting.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting Recommendations...';

      try {
        const payload = {
          referrerEarlyAccessId: registrant.id || undefined,
          referrerName: registrant.name,
          referrerPhone: registrant.phone,
          referrerEmail: registrant.email || undefined,
          referrals,
        };

        const res = await fetch('/api/v1/university/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          showError(data.message || 'We could not submit recommendations right now. Please check details and try again.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Send Invites &amp; Claim 10% →</span>';
          return;
        }

        // Show Results View
        if (formContainer) formContainer.style.display = 'none';
        if (resultsContainer) resultsContainer.style.display = 'block';

        const results = data?.data?.results || [];
        if (resultsList) {
          resultsList.innerHTML = '';
          results.forEach((r) => {
            const row = document.createElement('div');
            row.className = `ref-result-item ${r.isEligible ? 'eligible' : 'ineligible'}`;
            const displayName = r.name || r.phone || r.email;
            const contactDetail = [r.phone, r.email].filter(Boolean).join(' · ');

            row.innerHTML = `
              <div class="ref-result-info">
                <strong>${displayName}</strong>
                <span>${contactDetail}</span>
              </div>
              <div>
                ${
                  r.isEligible
                    ? `<span class="ref-result-badge badge-success"><i class="fa-solid fa-check"></i> Invited · 10% Active</span>`
                    : `<span class="ref-result-badge badge-warning"><i class="fa-solid fa-info-circle"></i> Already in System</span>`
                }
              </div>
            `;
            resultsList.appendChild(row);
          });
        }

        // Setup WhatsApp Share Link
        if (whatsappShareBtn) {
          const origin = (typeof window !== 'undefined' && window.location && window.location.origin) 
            ? window.location.origin 
            : 'https://upward.goodtenants.io';
          const shareUrl = `${origin}/academy/sessions?ref=${encodeURIComponent(registrant.phone || '')}`;
          const shareText = `Hey! I wanted to recommend Upward Academy (10-Week Real Estate Business Course & Mentorship). Check it out and reserve a free seat for the upcoming session: ${shareUrl}`;
          whatsappShareBtn.href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        }
      } catch (err) {
        console.error('Error submitting referrals:', err);
        showError('Network error while submitting recommendations. Please check your internet connection.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Invites &amp; Claim 10% →</span>';
      }
    });

    skipBtn?.addEventListener('click', () => {
      const refBox = document.getElementById('referralBox');
      if (refBox) {
        refBox.style.display = 'none';
      }
    });
  }

  // ==========================================
  // DIRECT REFERRAL TAB ENGINE (NO SESSION REG REQUIRED)
  // ==========================================
  const directReferralForm = document.getElementById('directReferralForm');
  if (directReferralForm) {
    initReferralWidget({
      containerId: 'directReferralFormContainer',
      listId: 'directReferralList',
      addBtnId: 'directBtnAddRef',
      counterId: 'directRefCounter',
      submitBtnId: 'directBtnSubmitReferrals',
      skipBtnId: null,
      resultsId: 'directReferralResults',
      resultsListId: 'directRefResultsList',
      whatsappShareId: 'directBtnWhatsappShare',
      errorBannerId: 'directRefErrorBanner',
      getRegistrant: () => {
        const nameInput = document.getElementById('direct_referrer_name');
        const codeInput = document.getElementById('direct_referrer_code');
        const phoneInput = document.getElementById('direct_referrer_phone');
        const emailInput = document.getElementById('direct_referrer_email');

        const nameVal = nameInput ? nameInput.value.trim() : '';
        const codeVal = codeInput ? codeInput.value : '+234';
        const rawPhone = phoneInput ? phoneInput.value.trim() : '';
        const rawEmail = emailInput ? emailInput.value.trim() : '';

        const normPhone = rawPhone ? normalizeClientPhone(rawPhone, codeVal) : '';
        const normEmail = rawEmail ? normalizeClientEmail(rawEmail) : '';

        if (!nameVal || nameVal.length < 2) {
          const parent = document.getElementById('field_direct_referrer_name');
          parent?.classList.add('error');
          return null;
        } else {
          document.getElementById('field_direct_referrer_name')?.classList.remove('error');
        }

        if (!normPhone || normPhone.replace(/\D/g, '').length < 7) {
          const parent = document.getElementById('field_direct_referrer_phone');
          parent?.classList.add('error');
          return null;
        } else {
          document.getElementById('field_direct_referrer_phone')?.classList.remove('error');
        }

        return {
          name: nameVal,
          phone: normPhone,
          email: normEmail || undefined,
        };
      },
    });

    // Reset direct referral form for "Refer More Friends"
    document.getElementById('directBtnReferMore')?.addEventListener('click', () => {
      const container = document.getElementById('directReferralFormContainer');
      const results = document.getElementById('directReferralResults');
      const list = document.getElementById('directReferralList');
      const submitBtn = document.getElementById('directBtnSubmitReferrals');

      if (container) container.style.display = 'block';
      if (results) results.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Invites &amp; Claim 10% →</span>';
      }

      // Clear friends inputs
      if (list) {
        list.querySelectorAll('.ref-input-name').forEach((i) => (i.value = ''));
        list.querySelectorAll('.ref-input-phone').forEach((i) => (i.value = ''));
        list.querySelectorAll('.ref-input-email').forEach((i) => (i.value = ''));
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
