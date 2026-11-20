    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        const open = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }));
    }

    const form = document.getElementById('universityApplyForm');
    if (form) {
      let currentStage = 1;

      // 48-Hour Webinar Cohort Deadline (Monday Nov 23, 2026 11:59:59 PM WAT)
      const WEBINAR_48HR_DEADLINE = new Date('2026-11-23T23:59:59+01:00');

      // Default selected offer per track: 'full' or 'deposit'
      let selectedTrackOffers = {
        'Track A - Foundation': 'full',
        'Track B - Career Development': 'full',
        'Track C - Practical Experience': 'full'
      };

      // State recognition storage for returning applicants
      let currentApplicantState = null; // 'PAID_FULL' | 'DEPOSIT_PAID' | 'PREVIOUS_5K_PAID' | 'APPLICATION_PENDING' | 'EARLY_ACCESS_WEBINAR' | null
      let currentApplicantData = null;

      function getOfferAvailability(now = new Date()) {
        const ts = now.getTime();
        const isWithin48Hr = ts <= WEBINAR_48HR_DEADLINE.getTime();
        return { isWithin48Hr };
      }

      function renderTrackCOfferUI() {
        const trackEl = document.getElementById('track');
        const offerBox = document.getElementById('trackCOfferBox');
        const offerGrid = document.getElementById('trackCOfferGrid');
        const deadlineLabel = document.getElementById('trackCOfferDeadlineLabel');
        const optTrackC = document.getElementById('opt-track-c');
        const compareTrackCPrice = document.getElementById('compare-track-c-price');
        const promoBanner = document.getElementById('track-c-promo-banner');

        const { isWithin48Hr } = getOfferAvailability();
        const trackVal = trackEl ? trackEl.value : '';

        // Update Track C dropdown label and comparison popover
        if (optTrackC) {
          optTrackC.textContent = isWithin48Hr
            ? 'Track C · Practical Experience & Networking — ₦135,000 (48-Hr Offer · Save ₦65k)'
            : 'Track C · Practical Experience & Networking — Learn It. Experience It. (From ₦160,000)';
        }

        if (compareTrackCPrice) {
          compareTrackCPrice.innerHTML = isWithin48Hr
            ? '₦135,000 <span class="old-price">₦200,000</span>'
            : '₦160,000 <span class="old-price">₦200,000</span>';
        }

        if (!offerBox || !offerGrid) return;

        if (!trackVal) {
          offerBox.style.display = 'none';
          return;
        }

        if (deadlineLabel) {
          deadlineLabel.textContent = isWithin48Hr
            ? '48-Hour Webinar Offers Active'
            : 'Cohort Offers Active';
        }

        const credit5k = (currentApplicantState === 'PREVIOUS_5K_PAID') ? 5000 : 0;
        let cardsHtml = '';

        // If user already paid deposit and is viewing their deposited track, show verified balance checkout card
        if (currentApplicantState === 'DEPOSIT_PAID' && currentApplicantData) {
          const depositedTrack = currentApplicantData.track || 'Track C - Practical Experience';
          if (trackVal === depositedTrack) {
            const depAmount = currentApplicantData.depositAmount || 70000;
            const balDue = currentApplicantData.balanceDue || 80000;
            offerGrid.innerHTML = `
              <div class="track-offer-card selected" style="grid-column: 1 / -1; cursor: default;">
                <div class="track-offer-top">
                  <span class="track-offer-badge" style="background:#DCFCE7; color:#15803D;">Deposit Verified (₦${depAmount.toLocaleString()} Paid)</span>
                  <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
                </div>
                <div class="track-offer-name">${trackVal} · Remaining Balance</div>
                <div class="track-offer-price">₦${balDue.toLocaleString()}</div>
                <div class="track-offer-sub">Your spot is secured. Complete your ₦${balDue.toLocaleString()} remaining balance to finalize kickoff admission.</div>
              </div>
            `;
            offerGrid.style.gridTemplateColumns = '1fr';
            offerBox.style.display = 'block';
            return;
          }
        }

        const activeChoice = selectedTrackOffers[trackVal] || 'full';

        // TRACK A OFFERS
        if (trackVal === 'Track A - Foundation') {
          const fullPrice = isWithin48Hr ? 50000 : 60000;
          const fullDue = Math.max(0, fullPrice - credit5k);
          const downDue = Math.max(0, 30000 - credit5k);
          const creditNotice = credit5k > 0 ? '<div class="track-offer-credit-tag">₦5,000 credit applied</div>' : '';

          const isFullSel = activeChoice === 'full';
          const isDownSel = activeChoice === 'deposit';

          cardsHtml = `
            <label class="track-offer-card ${isFullSel ? 'selected' : ''}" data-offer="full">
              <input type="radio" name="trackOption" value="full" ${isFullSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge">${isWithin48Hr ? 'Save ₦10,000 · 48-Hr Offer' : 'Full Payment'}</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Pay in Full</div>
              <div class="track-offer-price">₦${fullDue.toLocaleString()} ${isWithin48Hr ? '<span class="old">₦60,000</span>' : ''}</div>
              <div class="track-offer-sub">Pay once today. Zero outstanding balance.</div>
              ${creditNotice}
            </label>

            <label class="track-offer-card ${isDownSel ? 'selected' : ''}" data-offer="deposit">
              <input type="radio" name="trackOption" value="deposit" ${isDownSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge subtle">Installment Plan</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Down Payment</div>
              <div class="track-offer-price">₦${downDue.toLocaleString()}</div>
              <div class="track-offer-plan-breakdown">
                <div><strong>Total tuition:</strong> ₦60,000 (down payment due by Nov 28)</div>
                <div><strong>Remaining balance:</strong> ₦30,000 due by Dec 24</div>
              </div>
              ${creditNotice}
            </label>
          `;
        }

        // TRACK B OFFERS
        else if (trackVal === 'Track B - Career Development') {
          const fullPrice = isWithin48Hr ? 100000 : 120000;
          const fullDue = Math.max(0, fullPrice - credit5k);
          const depDue = Math.max(0, 50000 - credit5k);
          const balanceDue = isWithin48Hr ? 60000 : 70000;
          const totalPkg = isWithin48Hr ? 110000 : 120000;
          const creditNotice = credit5k > 0 ? '<div class="track-offer-credit-tag">₦5,000 credit applied</div>' : '';

          const isFullSel = activeChoice === 'full';
          const isDepSel = activeChoice === 'deposit';

          cardsHtml = `
            <label class="track-offer-card ${isFullSel ? 'selected' : ''}" data-offer="full">
              <input type="radio" name="trackOption" value="full" ${isFullSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge">${isWithin48Hr ? 'Save ₦20,000 · 48-Hr Offer' : 'Full Payment'}</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Pay in Full</div>
              <div class="track-offer-price">₦${fullDue.toLocaleString()} <span class="old">₦120,000</span></div>
              <div class="track-offer-sub">Pay once today. Zero outstanding balance.</div>
              ${creditNotice}
            </label>

            <label class="track-offer-card ${isDepSel ? 'selected' : ''}" data-offer="deposit">
              <input type="radio" name="trackOption" value="deposit" ${isDepSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge subtle">${isWithin48Hr ? 'Guarantees ₦110k Offer' : 'Standard Deposit'}</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Flexible Deposit</div>
              <div class="track-offer-price">₦${depDue.toLocaleString()}</div>
              <div class="track-offer-plan-breakdown">
                <div><strong>Total package:</strong> ₦${totalPkg.toLocaleString()}${isWithin48Hr ? ' (guaranteed 48-hr offer)' : ''}</div>
                <div><strong>Remaining balance:</strong> ₦${balanceDue.toLocaleString()} due by Dec 24</div>
              </div>
              ${creditNotice}
            </label>
          `;
        }

        // TRACK C OFFERS
        else if (trackVal === 'Track C - Practical Experience') {
          const fullPrice = isWithin48Hr ? 135000 : 160000;
          const fullDue = Math.max(0, fullPrice - credit5k);
          const depDue = Math.max(0, 70000 - credit5k);
          const balanceDue = isWithin48Hr ? 80000 : 90000;
          const totalPkg = isWithin48Hr ? 150000 : 160000;
          const creditNotice = credit5k > 0 ? '<div class="track-offer-credit-tag">₦5,000 credit applied</div>' : '';

          const isFullSel = activeChoice === 'full';
          const isDepSel = activeChoice === 'deposit';

          cardsHtml = `
            <label class="track-offer-card ${isFullSel ? 'selected' : ''}" data-offer="full">
              <input type="radio" name="trackOption" value="full" ${isFullSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge">${isWithin48Hr ? 'Save ₦65,000 · 48-Hr Offer' : 'Full Payment'}</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Pay in Full</div>
              <div class="track-offer-price">₦${fullDue.toLocaleString()} <span class="old">₦200,000</span></div>
              <div class="track-offer-sub">Pay once today. Zero outstanding balance.</div>
              ${creditNotice}
            </label>

            <label class="track-offer-card ${isDepSel ? 'selected' : ''}" data-offer="deposit">
              <input type="radio" name="trackOption" value="deposit" ${isDepSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge subtle">${isWithin48Hr ? 'Guarantees ₦150k Offer' : 'Standard Deposit'}</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Flexible Deposit</div>
              <div class="track-offer-price">₦${depDue.toLocaleString()}</div>
              <div class="track-offer-plan-breakdown">
                <div><strong>Total package:</strong> ₦${totalPkg.toLocaleString()}${isWithin48Hr ? ' (guaranteed 48-hr offer)' : ''}</div>
                <div><strong>Remaining balance:</strong> ₦${balanceDue.toLocaleString()} due by Dec 24</div>
              </div>
              ${creditNotice}
            </label>
          `;
        }

        offerGrid.innerHTML = cardsHtml;
        offerGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
        offerBox.style.display = 'block';

        offerGrid.querySelectorAll('.track-offer-card').forEach(card => {
          card.addEventListener('click', () => {
            const offerKey = card.getAttribute('data-offer');
            if (!offerKey) return;
            selectedTrackOffers[trackVal] = offerKey;
            offerGrid.querySelectorAll('.track-offer-card').forEach(c => {
              const match = c.getAttribute('data-offer') === offerKey;
              c.classList.toggle('selected', match);
              const r = c.querySelector('input[type="radio"]');
              if (r) r.checked = match;
            });
          });
        });
      }

      window.selectTrackAndScroll = function(trackName) {
        const isLegacyTrack = currentApplicantData?.track && (currentApplicantData.track.includes('Track 1') || currentApplicantData.track.includes('Track 2'));
        const isTrueDeposit = currentApplicantState === 'DEPOSIT_PAID' && !isLegacyTrack && currentApplicantData && (currentApplicantData.track?.includes('Track A') || currentApplicantData.track?.includes('Track B') || currentApplicantData.track?.includes('Track C'));

        if (isTrueDeposit && currentApplicantData.track !== trackName) {
          alert(`You have an active deposit verified for ${currentApplicantData.track}. Track switching is not permitted for active deposit holders.`);
          return;
        }
        const trackSelect = document.getElementById('track');
        if (trackSelect) {
          trackSelect.value = trackName;
          trackSelect.dispatchEvent(new Event('change'));
        }
        const formBox = document.getElementById('applyFormBox') || document.getElementById('universityApplyForm');
        if (formBox) {
          formBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => {
          document.getElementById('name')?.focus();
        }, 400);
      };

      function getSelectedPricing() {
        const trackVal = document.getElementById('track')?.value || '';
        const { isWithin48Hr } = getOfferAvailability();
        const credit5k = (currentApplicantState === 'PREVIOUS_5K_PAID') ? 5000 : 0;
        const activeChoice = selectedTrackOffers[trackVal] || 'full';

        // TRACK A
        if (trackVal === 'Track A - Foundation') {
          // Returning deposit applicant
          if (currentApplicantState === 'DEPOSIT_PAID' && currentApplicantData) {
            if (currentApplicantData.track === trackVal) {
              const bal = currentApplicantData.balanceDue || 30000;
              return {
                amountNaira: bal,
                planLabel: `Track A Tuition Balance (₦${bal.toLocaleString()} remaining)`,
                balanceNote: '',
                buttonLabel: `Pay ₦${bal.toLocaleString()} Remaining Balance →`,
                appliedCredit: currentApplicantData.depositAmount || 30000,
              };
            }
            // Switched to Track A
            const depCred = currentApplicantData.depositAmount || 25000;
            const fullTarget = isWithin48Hr ? 50000 : 60000;
            const due = Math.max(0, fullTarget - depCred);
            return {
              amountNaira: due,
              planLabel: `Track A Full Fee (₦${due.toLocaleString()} with ₦${depCred.toLocaleString()} deposit credited)`,
              balanceNote: '',
              buttonLabel: `Pay ₦${due.toLocaleString()} →`,
              appliedCredit: depCred,
            };
          }

          if (activeChoice === 'deposit') {
            const due = Math.max(0, 30000 - credit5k);
            return {
              amountNaira: due,
              planLabel: credit5k > 0
                ? `Track A Down Payment — ₦${due.toLocaleString()} now (₦5k credit applied · ₦30,000 balance by Dec 24)`
                : 'Track A Down Payment — ₦30,000 now (₦60,000 total · ₦30,000 balance by Dec 24)',
              balanceNote: '₦30,000 completed by December 24, 2026',
              buttonLabel: `Pay ₦${due.toLocaleString()} Down Payment →`,
              appliedCredit: credit5k,
            };
          }

          const fullTarget = isWithin48Hr ? 50000 : 60000;
          const due = Math.max(0, fullTarget - credit5k);
          return {
            amountNaira: due,
            planLabel: isWithin48Hr
              ? (credit5k > 0 ? `Track A 48-Hour Full Offer (₦${due.toLocaleString()} after ₦5k credit)` : 'Track A 48-Hour Full Offer (₦50,000 — Save ₦10,000)')
              : (credit5k > 0 ? `Track A Full Fee (₦${due.toLocaleString()} after ₦5k credit)` : 'Track A Full Fee (₦60,000)'),
            balanceNote: '',
            buttonLabel: `Pay ₦${due.toLocaleString()} in Full →`,
            appliedCredit: credit5k,
          };
        }

        // TRACK B
        if (trackVal === 'Track B - Career Development') {
          // Returning deposit applicant
          if (currentApplicantState === 'DEPOSIT_PAID' && currentApplicantData) {
            if (currentApplicantData.track === trackVal) {
              const bal = currentApplicantData.balanceDue || 60000;
              return {
                amountNaira: bal,
                planLabel: `Track B Tuition Balance (₦${bal.toLocaleString()} remaining)`,
                balanceNote: '',
                buttonLabel: `Pay ₦${bal.toLocaleString()} Remaining Balance →`,
                appliedCredit: currentApplicantData.depositAmount || 50000,
              };
            }
            // Switched to Track B
            const depCred = currentApplicantData.depositAmount || 25000;
            const fullTarget = isWithin48Hr ? 100000 : 120000;
            const due = Math.max(0, fullTarget - depCred);
            return {
              amountNaira: due,
              planLabel: `Track B Full Fee (₦${due.toLocaleString()} with ₦${depCred.toLocaleString()} deposit credited)`,
              balanceNote: '',
              buttonLabel: `Pay ₦${due.toLocaleString()} →`,
              appliedCredit: depCred,
            };
          }

          if (activeChoice === 'deposit') {
            const due = Math.max(0, 50000 - credit5k);
            const balDue = isWithin48Hr ? 60000 : 70000;
            const totalPkg = isWithin48Hr ? 110000 : 120000;
            return {
              amountNaira: due,
              planLabel: isWithin48Hr
                ? `Track B 48-Hour Deposit — ₦${due.toLocaleString()} now (₦${totalPkg.toLocaleString()} total package · ₦${balDue.toLocaleString()} balance by Dec 24)`
                : `Track B Deposit — ₦${due.toLocaleString()} now (₦${totalPkg.toLocaleString()} total package · ₦${balDue.toLocaleString()} balance by Dec 24)`,
              balanceNote: `₦${balDue.toLocaleString()} completed by December 24, 2026 (Total ₦${totalPkg.toLocaleString()})`,
              buttonLabel: `Pay ₦${due.toLocaleString()} Deposit →`,
              appliedCredit: credit5k,
            };
          }

          const fullTarget = isWithin48Hr ? 100000 : 120000;
          const due = Math.max(0, fullTarget - credit5k);
          return {
            amountNaira: due,
            planLabel: isWithin48Hr
              ? (credit5k > 0 ? `Track B 48-Hour Full Offer (₦${due.toLocaleString()} after ₦5k credit)` : 'Track B 48-Hour Full Offer (₦100,000 — Save ₦20,000)')
              : (credit5k > 0 ? `Track B Full Fee (₦${due.toLocaleString()} after ₦5k credit)` : 'Track B Full Fee (₦120,000)'),
            balanceNote: '',
            buttonLabel: `Pay ₦${due.toLocaleString()} in Full →`,
            appliedCredit: credit5k,
          };
        }

        // TRACK C
        if (trackVal === 'Track C - Practical Experience') {
          // Returning deposit applicant
          if (currentApplicantState === 'DEPOSIT_PAID' && currentApplicantData) {
            if (currentApplicantData.track === trackVal || !currentApplicantData.track || currentApplicantData.track.includes('Track C')) {
              const bal = currentApplicantData.balanceDue || 80000;
              return {
                amountNaira: bal,
                planLabel: `Track C Tuition Balance (₦${bal.toLocaleString()} remaining)`,
                balanceNote: '',
                buttonLabel: `Pay ₦${bal.toLocaleString()} Remaining Balance →`,
                appliedCredit: currentApplicantData.depositAmount || 70000,
              };
            }
            // Switched to Track C from another track
            const depCred = currentApplicantData.depositAmount || 30000;
            const fullTarget = isWithin48Hr ? 135000 : 160000;
            const due = Math.max(0, fullTarget - depCred);
            return {
              amountNaira: due,
              planLabel: `Track C Full Fee (₦${due.toLocaleString()} with ₦${depCred.toLocaleString()} deposit credited)`,
              balanceNote: '',
              buttonLabel: `Pay ₦${due.toLocaleString()} →`,
              appliedCredit: depCred,
            };
          }

          if (activeChoice === 'deposit') {
            const due = Math.max(0, 70000 - credit5k);
            const balDue = isWithin48Hr ? 80000 : 90000;
            const totalPkg = isWithin48Hr ? 150000 : 160000;
            return {
              amountNaira: due,
              planLabel: isWithin48Hr
                ? `Track C 48-Hour Deposit — ₦${due.toLocaleString()} now (₦${totalPkg.toLocaleString()} total package · ₦${balDue.toLocaleString()} balance by Dec 24)`
                : `Track C Deposit — ₦${due.toLocaleString()} now (₦${totalPkg.toLocaleString()} total package · ₦${balDue.toLocaleString()} balance by Dec 24)`,
              balanceNote: `₦${balDue.toLocaleString()} completed by December 24, 2026 (Total ₦${totalPkg.toLocaleString()})`,
              buttonLabel: `Pay ₦${due.toLocaleString()} Deposit →`,
              appliedCredit: credit5k,
            };
          }

          const fullTarget = isWithin48Hr ? 135000 : 160000;
          const due = Math.max(0, fullTarget - credit5k);
          return {
            amountNaira: due,
            planLabel: isWithin48Hr
              ? (credit5k > 0 ? `Track C 48-Hour Full Offer (₦${due.toLocaleString()} after ₦5k credit)` : 'Track C 48-Hour Full Offer (₦135,000 — Save ₦65,000)')
              : (credit5k > 0 ? `Track C Full Fee (₦${due.toLocaleString()} after ₦5k credit)` : 'Track C Full Fee (₦160,000)'),
            balanceNote: '',
            buttonLabel: `Pay ₦${due.toLocaleString()} in Full →`,
            appliedCredit: credit5k,
          };
        }

        const defaultAmount = Math.max(0, 50000 - credit5k);
        return {
          amountNaira: defaultAmount,
          planLabel: 'Track Fee',
          balanceNote: '',
          buttonLabel: 'Complete Payment →',
          appliedCredit: credit5k,
        };
      }

      const stage1Fields = [
        { id: 'name', fieldId: 'field-name', validate: val => val.trim().length > 0 },
        { id: 'whatsapp', fieldId: 'field-whatsapp', validate: val => val.trim().length >= 6 },
        { id: 'email', fieldId: 'field-email', validate: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) },
        { id: 'city', fieldId: 'field-city', validate: val => val.trim().length > 0 },
        { id: 'age', fieldId: 'field-age', validate: val => val !== '' },
        { id: 'track', fieldId: 'field-track', validate: val => val !== '' }
      ];

      // Clear error style on input
      [...stage1Fields, { id: 'termsCheck', fieldId: 'field-terms' }].forEach(cfg => {
        const el = document.getElementById(cfg.id);
        const container = document.getElementById(cfg.fieldId);
        if (el && container) {
          const clearErr = () => container.classList.remove('has-error');
          el.addEventListener('input', clearErr);
          el.addEventListener('change', clearErr);
        }
      });

      function updateTrackSwitchWarning() {
        const switchWarningEl = document.getElementById('deposit-switch-warning');
        if (!switchWarningEl) return;
        const trackVal = document.getElementById('track')?.value || '';
        if (currentApplicantState === 'DEPOSIT_PAID') {
          if (trackVal && trackVal !== 'Track C - Practical Experience') {
            switchWarningEl.style.display = 'block';
          } else {
            switchWarningEl.style.display = 'none';
          }
        } else {
          switchWarningEl.style.display = 'none';
        }
      }

      const trackSelectEl = document.getElementById('track');
      if (trackSelectEl) {
        trackSelectEl.addEventListener('change', () => {
          renderTrackCOfferUI();
          updateTrackSwitchWarning();
        });
      }

      function updateStageUI(stage) {
        currentStage = stage;
        document.getElementById('stage-1').style.display = stage === 1 ? 'block' : 'none';
        document.getElementById('stage-2').style.display = stage === 2 ? 'block' : 'none';

        [1, 2].forEach(stepNum => {
          const pill = document.getElementById(`step-pill-${stepNum}`);
          if (pill) {
            pill.classList.remove('active', 'completed');
            if (stepNum === stage) pill.classList.add('active');
            else if (stepNum < stage) pill.classList.add('completed');
          }
        });

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Track Info Popover Toggle
      const trackInfoBtn = document.getElementById('trackInfoBtn');
      const trackInfoBox = document.getElementById('trackInfoBox');
      const trackInfoCloseBtn = document.getElementById('trackInfoCloseBtn');

      if (trackInfoBtn && trackInfoBox) {
        trackInfoBtn.addEventListener('click', () => {
          const isHidden = trackInfoBox.style.display === 'none';
          trackInfoBox.style.display = isHidden ? 'block' : 'none';
          trackInfoBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
      }
      if (trackInfoCloseBtn && trackInfoBox && trackInfoBtn) {
        trackInfoCloseBtn.addEventListener('click', () => {
          trackInfoBox.style.display = 'none';
          trackInfoBtn.setAttribute('aria-expanded', 'false');
        });
      }

      // Pre-fill Track Selection from URL parameter (e.g. ?track=track-a, track-b, track-c, track-d)
      let currentBalanceData = null;

      async function loadBalanceView(query) {
        try {
          const qs = query.ref
            ? `ref=${encodeURIComponent(query.ref)}`
            : `email=${encodeURIComponent(query.email || '')}`;
          const res = await fetch(`/api/v1/university/application/lookup?${qs}`);
          const json = await res.json();
          if (!json || !json.found || !json.data) return false;
          const data = json.data;

          if (data.isFullyCleared) {
            window.location.href = `/academy/thank-you?ref=${encodeURIComponent(data.paymentRef || '')}&balancePaid=true`;
            return true;
          }

          if (data.isDeposit && data.balanceDue > 0) {
            currentBalanceData = data;
            const stage1 = document.getElementById('stage-1');
            const stage2 = document.getElementById('stage-2');
            const stageBal = document.getElementById('stage-balance');
            const stepsBar = document.querySelector('.apply-steps-bar');

            if (stage1) stage1.style.display = 'none';
            if (stage2) stage2.style.display = 'none';
            if (stepsBar) stepsBar.style.display = 'none';
            if (stageBal) stageBal.style.display = 'block';

            const nameEl = document.getElementById('balance-applicant-name');
            const emailEl = document.getElementById('balance-applicant-email');
            const phoneEl = document.getElementById('balance-applicant-phone');
            const refEl = document.getElementById('balance-applicant-ref');
            const trackEl = document.getElementById('balance-track-name');
            const totalEl = document.getElementById('balance-total-package');
            const depEl = document.getElementById('balance-deposit-paid');
            const dueEl = document.getElementById('balance-due-price');
            const btnEl = document.getElementById('btn-pay-balance');

            const depAmount = data.depositAmount || 70000;
            const balDue = data.balanceDue || 80000;
            const totalPkg = depAmount + balDue;

            if (nameEl) nameEl.textContent = data.name || 'Applicant';
            if (emailEl) emailEl.textContent = data.email || '';
            if (phoneEl) phoneEl.textContent = data.whatsapp || '';
            if (refEl) refEl.textContent = data.paymentRef || 'N/A';
            if (trackEl) trackEl.textContent = data.track || 'Track C · Practical Experience';
            if (totalEl) totalEl.textContent = `₦${totalPkg.toLocaleString()}`;
            if (depEl) depEl.textContent = `- ₦${depAmount.toLocaleString()}`;
            if (dueEl) dueEl.textContent = `₦${balDue.toLocaleString()}`;
            if (btnEl) btnEl.textContent = `Pay ₦${balDue.toLocaleString()} Remaining Balance →`;

            stageBal.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
          }
        } catch (err) {
          console.error('Balance lookup error:', err);
        }
        return false;
      }

      function handleApplicantRecognition(json) {
        if (!json || !json.found || !json.data) return;
        const state = json.state;
        const data = json.data;
        currentApplicantState = state;
        currentApplicantData = data;

        const noticeEl = document.getElementById('returning-balance-notice');
        const noticeTitle = document.getElementById('returning-notice-title');
        const noticeText = document.getElementById('returning-notice-text');
        const noticeActions = document.getElementById('returning-notice-actions');

        if (state === 'PAID_FULL') {
          if (noticeEl) {
            noticeEl.style.display = 'block';
            noticeEl.style.background = '#F0FDF4';
            noticeEl.style.border = '1.5px solid #86EFAC';
            noticeEl.style.color = '#166534';
          }
          if (noticeTitle) noticeTitle.textContent = 'Tuition Paid in Full';
          if (noticeText) {
            noticeText.textContent = data.hasSubmittedVideo
              ? `Welcome, ${data.name}! You are fully enrolled in ${data.track || 'Upward Academy'}. Your tuition is cleared in full and intro video is confirmed.`
              : `Welcome, ${data.name}! Your tuition for ${data.track || 'Upward Academy'} is fully paid and verified. Your next step is to submit your short intro video to complete onboarding.`;
          }
          if (noticeActions) {
            if (!data.hasSubmittedVideo) {
              noticeActions.innerHTML = `
                <a href="/academy/submit-video?ref=${encodeURIComponent(data.paymentRef || '')}&name=${encodeURIComponent(data.name || '')}" class="btn btn-primary" style="font-size:12.5px; padding:8px 16px; white-space:nowrap; text-decoration:none;">
                  Submit Intro Video →
                </a>
              `;
            } else {
              noticeActions.innerHTML = `
                <a href="/academy/thank-you?ref=${encodeURIComponent(data.paymentRef || '')}&name=${encodeURIComponent(data.name || '')}" class="btn btn-primary" style="font-size:12.5px; padding:8px 16px; white-space:nowrap; text-decoration:none;">
                  View Confirmation →
                </a>
              `;
            }
          }
        } else if (state === 'DEPOSIT_PAID') {
          currentBalanceData = data;
          if (noticeEl) {
            noticeEl.style.display = 'block';
            noticeEl.style.background = '#FEFCE8';
            noticeEl.style.border = '1.5px solid #FDE047';
            noticeEl.style.color = '#854D0E';
          }
          const depAmt = data.depositAmount || 30000;
          const balAmt = data.balanceDue || 30000;
          const userTrack = data.track || 'Track C - Practical Experience';
          if (noticeTitle) noticeTitle.textContent = `${userTrack} Deposit Verified (₦${depAmt.toLocaleString()} Paid)`;
          if (noticeText) {
            noticeText.textContent = `Welcome back, ${data.name.split(' ')[0]}! You have an active deposit of ₦${depAmt.toLocaleString()} paid for ${userTrack}. Track switching is not permitted for active deposit holders. Please complete your remaining balance of ₦${balAmt.toLocaleString()} below.`;
          }
          if (noticeActions) {
            noticeActions.innerHTML = `
              <button type="button" class="btn btn-primary" id="btn-quick-balance" style="font-size: 12.5px; padding: 8px 16px; white-space: nowrap;">
                Pay ₦${balAmt.toLocaleString()} Balance →
              </button>
            `;
            document.getElementById('btn-quick-balance')?.addEventListener('click', () => {
              loadBalanceView({ email: data.email, ref: data.paymentRef });
            });
          }
        } else if (state === 'PREVIOUS_5K_PAID') {
          if (noticeEl) {
            noticeEl.style.display = 'block';
            noticeEl.style.background = '#F0FDF4';
            noticeEl.style.border = '1.5px solid #86EFAC';
            noticeEl.style.color = '#166534';
          }
          if (noticeTitle) noticeTitle.textContent = 'Previous ₦5,000 Registration Fee Credited';
          if (noticeText) {
            noticeText.textContent = `Welcome back, ${data.name.split(' ')[0]}! We verified your previous ₦5,000 registration fee. Your ₦5,000 credit is applied to whichever track you select below.`;
          }
          if (noticeActions) {
            noticeActions.innerHTML = `
              <span style="font-size:12px; font-weight:700; color:#15803D; background:#DCFCE7; padding:6px 12px; border-radius:20px; white-space:nowrap;">
                ₦5,000 Credited
              </span>
            `;
          }
        } else if (state === 'APPLICATION_PENDING') {
          if (noticeEl) {
            noticeEl.style.display = 'block';
            noticeEl.style.background = '#EFF6FF';
            noticeEl.style.border = '1.5px solid #93C5FD';
            noticeEl.style.color = '#1E40AF';
          }
          if (noticeTitle) noticeTitle.textContent = 'Application On File';
          if (noticeText) {
            noticeText.textContent = `Welcome back, ${data.name.split(' ')[0]}! We have your registration details on file. Select your preferred track below to proceed to payment.`;
          }
          if (noticeActions) {
            noticeActions.innerHTML = `
              <span style="font-size:12px; font-weight:700; color:#1E40AF; background:#DBEAFE; padding:6px 12px; border-radius:20px; white-space:nowrap;">
                Profile Loaded
              </span>
            `;
          }
        } else if (state === 'EARLY_ACCESS_WEBINAR') {
          if (noticeEl) {
            noticeEl.style.display = 'block';
            noticeEl.style.background = '#F5F3FF';
            noticeEl.style.border = '1.5px solid #DDD6FE';
            noticeEl.style.color = '#5B21B6';
          }
          if (noticeTitle) noticeTitle.textContent = 'Webinar / Info Session Details Found';
          if (noticeText) {
            noticeText.textContent = `Welcome, ${data.name.split(' ')[0]}! We found your contact details from your webinar/info session registration. We've pre-filled your info — select your preferred track below to complete your admission.`;
          }
          if (noticeActions) {
            noticeActions.innerHTML = `
              <span style="font-size:12px; font-weight:700; color:#5B21B6; background:#EDE9FE; padding:6px 12px; border-radius:20px; white-space:nowrap;">
                Details Pre-filled
              </span>
            `;
          }
        }

        // Pre-fill inputs if empty
        const nameInput = document.getElementById('name');
        const whatsappInput = document.getElementById('whatsapp');
        const cityInput = document.getElementById('city');
        const ageSelect = document.getElementById('age');
        const occInput = document.getElementById('occupation');
        const trackSelect = document.getElementById('track');

        if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
          if (data.name) nameInput.value = data.name;
        }
        if (whatsappInput && (!whatsappInput.value || whatsappInput.value.trim() === '')) {
          if (data.whatsapp) {
            whatsappInput.value = data.whatsapp;
            const badgeEl = document.getElementById('whatsapp-verified-badge');
            if (badgeEl && (data.whatsapp.includes('•') || data.whatsapp.includes('*'))) {
              badgeEl.style.display = 'inline-flex';
            }
          }
        }
        if (whatsappInput) {
          whatsappInput.addEventListener('input', () => {
            const badgeEl = document.getElementById('whatsapp-verified-badge');
            if (badgeEl && !whatsappInput.value.includes('•') && !whatsappInput.value.includes('*')) {
              badgeEl.style.display = 'none';
            }
          });
        }
        if (cityInput && (!cityInput.value || cityInput.value.trim() === '')) {
          if (data.city) cityInput.value = data.city;
        }
        if (ageSelect && (!ageSelect.value || ageSelect.value.trim() === '')) {
          if (data.ageBracket) ageSelect.value = data.ageBracket;
        }
        if (occInput && (!occInput.value || occInput.value.trim() === '')) {
          if (data.occupation) occInput.value = data.occupation;
        }
        const isLegacyTrack = data.track && (data.track.includes('Track 1') || data.track.includes('Track 2'));
        if (trackSelect && (!trackSelect.value || trackSelect.value.trim() === '')) {
          if (data.track && !isLegacyTrack) {
            trackSelect.value = data.track;
          } else if (data.interest) {
            const intLower = data.interest.toLowerCase();
            if (intLower.includes('track c') || intLower.includes('practical') || intLower.includes('network') || intLower.includes('premium')) {
              trackSelect.value = 'Track C - Practical Experience';
            } else if (intLower.includes('track b') || intLower.includes('career') || intLower.includes('started')) {
              trackSelect.value = 'Track B - Career Development';
            } else if (intLower.includes('track a') || intLower.includes('foundation') || intLower.includes('zero')) {
              trackSelect.value = 'Track A - Foundation';
            }
          }
        }

        const isTrueDeposit = state === 'DEPOSIT_PAID' && !isLegacyTrack && (data.track?.includes('Track A') || data.track?.includes('Track B') || data.track?.includes('Track C'));

        if (isTrueDeposit) {
          if (trackSelect) {
            trackSelect.value = data.track;
            trackSelect.style.pointerEvents = 'none';
            trackSelect.style.background = 'var(--paper-dim, #F7F5F0)';
          }
          const trackLockedBadge = document.getElementById('track-deposit-locked-badge');
          if (trackLockedBadge) trackLockedBadge.style.display = 'inline-flex';
          const switchWarningEl = document.getElementById('deposit-switch-warning');
          if (switchWarningEl) switchWarningEl.style.display = 'none';
        } else {
          if (trackSelect) {
            trackSelect.style.pointerEvents = 'auto';
            trackSelect.style.background = '';
          }
          const trackLockedBadge = document.getElementById('track-deposit-locked-badge');
          if (trackLockedBadge) trackLockedBadge.style.display = 'none';
        }

        renderTrackCOfferUI();
        updateTrackSwitchWarning();
      }

      function setFieldsLockedState(mode) {
        const subsequentEl = document.getElementById('subsequent-fields');
        const lockNoticeEl = document.getElementById('fields-locked-notice');
        const unlockBtn = document.getElementById('btn-unlock-details');
        const personalInputs = ['name', 'whatsapp', 'city', 'age', 'occupation'];

        if (mode === 'gated') {
          if (subsequentEl) {
            subsequentEl.classList.add('is-locked');
            subsequentEl.classList.remove('is-verified-locked');
          }
          if (lockNoticeEl) lockNoticeEl.style.display = 'block';
          if (unlockBtn) unlockBtn.style.display = 'none';
        } else if (mode === 'verified_locked') {
          if (subsequentEl) {
            subsequentEl.classList.remove('is-locked');
            subsequentEl.classList.add('is-verified-locked');
          }
          if (lockNoticeEl) lockNoticeEl.style.display = 'none';
          personalInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.setAttribute('readonly', 'true');
              if (el.tagName === 'SELECT') el.style.pointerEvents = 'none';
            }
          });
          if (unlockBtn) unlockBtn.style.display = 'inline-block';
        } else { // 'unlocked'
          if (subsequentEl) {
            subsequentEl.classList.remove('is-locked');
            subsequentEl.classList.remove('is-verified-locked');
          }
          if (lockNoticeEl) lockNoticeEl.style.display = 'none';
          personalInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.removeAttribute('readonly');
              if (el.tagName === 'SELECT') el.style.pointerEvents = 'auto';
            }
          });
          if (unlockBtn) unlockBtn.style.display = 'none';
        }
      }

      document.getElementById('btn-unlock-details')?.addEventListener('click', () => {
        setFieldsLockedState('unlocked');
        document.getElementById('name')?.focus();
      });

      let isApplicantLookupActive = false;
      async function checkReturningApplicant() {
        const emailInput = document.getElementById('email');
        const statusBox = document.getElementById('email-status-box');
        if (!emailInput) return;
        const val = (emailInput.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setFieldsLockedState('gated');
          if (statusBox) {
            statusBox.innerHTML = '<i class="fa-solid fa-shield-check" style="color:var(--rust);"></i> Enter your email — we automatically check your eligibility for webinar discounts, prior credits, or existing registrations.';
          }
          return;
        }
        if (isApplicantLookupActive) return;

        isApplicantLookupActive = true;
        if (statusBox) {
          statusBox.innerHTML = '<span class="email-status-indicator loading"><i class="fa-solid fa-spinner fa-spin"></i> Checking registration record...</span>';
        }

        try {
          const res = await fetch(`/api/v1/university/application/lookup?email=${encodeURIComponent(val)}`);
          if (!res.ok) {
            isApplicantLookupActive = false;
            setFieldsLockedState('unlocked');
            return;
          }
          const json = await res.json();
          if (json && json.found && json.data) {
            handleApplicantRecognition(json);
            setFieldsLockedState('verified_locked');
            if (statusBox) {
              statusBox.innerHTML = '<span class="email-status-indicator verified"><i class="fa-solid fa-circle-check"></i> Verified record on file · Details loaded &amp; locked</span>';
            }
          } else {
            currentApplicantState = null;
            currentApplicantData = null;
            const noticeEl = document.getElementById('returning-balance-notice');
            if (noticeEl) noticeEl.style.display = 'none';
            const switchWarningEl = document.getElementById('deposit-switch-warning');
            if (switchWarningEl) switchWarningEl.style.display = 'none';
            setFieldsLockedState('unlocked');
            if (statusBox) {
              statusBox.innerHTML = '<span class="email-status-indicator new"><i class="fa-solid fa-user-plus"></i> New applicant · Fill your details below to continue</span>';
            }
            renderTrackCOfferUI();
          }
        } catch (err) {
          console.error('Silent applicant lookup error:', err);
          setFieldsLockedState('unlocked');
        } finally {
          isApplicantLookupActive = false;
        }
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const actionParam = urlParams.get('action');
        const trackParam = (urlParams.get('track') || '').toLowerCase().trim();
        const emailParam = (urlParams.get('email') || '').trim();
        const refParam = (urlParams.get('ref') || '').trim();

        if (actionParam === 'balance' && (refParam || emailParam)) {
          loadBalanceView({ ref: refParam, email: emailParam });
        }

        if (emailParam && document.getElementById('email')) {
          document.getElementById('email').value = emailParam;
          checkReturningApplicant();
        }
        if (trackSelectEl && trackParam) {
          if (trackParam === 'track-c' || trackParam === 'track-d' || trackParam === 'c' || trackParam === 'd' || trackParam === '3' || trackParam === '4' || trackParam.includes('practical') || trackParam.includes('network') || trackParam.includes('premium')) {
            trackSelectEl.value = 'Track C - Practical Experience';
          } else if (trackParam === 'track-b' || trackParam === 'b' || trackParam === 'track2' || trackParam === '2' || trackParam.includes('career') || trackParam.includes('started')) {
            trackSelectEl.value = 'Track B - Career Development';
          } else if (trackParam === 'track-a' || trackParam === 'a' || trackParam === 'track1' || trackParam === '1' || trackParam.includes('foundation') || trackParam.includes('zero')) {
            trackSelectEl.value = 'Track A - Foundation';
          }
          renderTrackCOfferUI();
        }
      } catch (err) {
        // Fallback
      }

      // Email Recognition on Application Form
      const emailInputEl = document.getElementById('email');
      if (emailInputEl) {
        let emailDebounceTimer = null;
        emailInputEl.addEventListener('blur', checkReturningApplicant);
        emailInputEl.addEventListener('input', () => {
          clearTimeout(emailDebounceTimer);
          emailDebounceTimer = setTimeout(checkReturningApplicant, 600);
        });
      }

      document.getElementById('btn-goto-balance')?.addEventListener('click', () => {
        if (currentBalanceData) {
          loadBalanceView({ email: currentBalanceData.email });
        }
      });

      document.getElementById('btn-switch-to-full-form')?.addEventListener('click', () => {
        const stage1 = document.getElementById('stage-1');
        const stageBal = document.getElementById('stage-balance');
        const stepsBar = document.querySelector('.apply-steps-bar');
        if (stageBal) stageBal.style.display = 'none';
        if (stepsBar) stepsBar.style.display = 'flex';
        if (stage1) stage1.style.display = 'block';
        const noticeEl = document.getElementById('returning-balance-notice');
        if (noticeEl) noticeEl.style.display = 'none';
      });

      // Pay Balance Button Handler
      document.getElementById('btn-pay-balance')?.addEventListener('click', async function () {
        if (!currentBalanceData) return;
        const btn = document.getElementById('btn-pay-balance');
        const balDue = currentBalanceData.balanceDue || 80000;
        btn.disabled = true;
        btn.textContent = 'Opening Secure Checkout...';

        try {
          let paystackKey = 'pk_live_d8434237191295b92e3428d0fc65a7d7675685cb';
          try {
            const cfg = await (await fetch('/api/v1/university/application/config')).json();
            if (cfg?.paystackPublicKey) paystackKey = cfg.paystackPublicKey;
          } catch (e) { }

          const startBalancePayment = () => {
            if (typeof window.PaystackPop !== 'undefined') {
              const handler = new window.PaystackPop();
              handler.newTransaction({
                key: paystackKey,
                email: currentBalanceData.email,
                amount: balDue * 100, // in kobo
                currency: 'NGN',
                channels: ['bank_transfer'],
                ref: 'UPW_BAL_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                  paymentKind: 'ACADEMY_TUITION_BALANCE',
                  type: 'ACADEMY_TUITION_BALANCE',
                  track: currentBalanceData.track,
                  custom_fields: [
                    { display_name: "Applicant Name", variable_name: "applicant_name", value: currentBalanceData.name },
                    { display_name: "Original Deposit Ref", variable_name: "original_deposit_ref", value: currentBalanceData.paymentRef },
                    { display_name: "Balance Payment", variable_name: "balance_payment", value: `₦${balDue.toLocaleString()}` }
                  ]
                },
                onSuccess: async function (response) {
                  try {
                    await fetch('/api/v1/university/application/pay-balance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        paymentRef: currentBalanceData.paymentRef,
                        email: currentBalanceData.email,
                        balancePaymentRef: response.reference,
                        amountPaid: balDue
                      })
                    });
                  } catch (e) { }
                  const firstName = encodeURIComponent((currentBalanceData.name || '').split(' ')[0] || '');
                  window.location.href = `/academy/thank-you?ref=${encodeURIComponent(response.reference)}&name=${firstName}&balancePaid=true&amount=${balDue}`;
                },
                onCancel: function () {
                  btn.disabled = false;
                  btn.textContent = `Pay ₦${balDue.toLocaleString()} Remaining Balance →`;
                }
              });
            }
          };

          if (typeof window.PaystackPop === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.onload = startBalancePayment;
            script.onerror = () => {
              btn.disabled = false;
              btn.textContent = `Pay ₦${balDue.toLocaleString()} Remaining Balance →`;
            };
            document.body.appendChild(script);
          } else {
            startBalancePayment();
          }
        } catch (err) {
          console.error('Balance payment error:', err);
          btn.disabled = false;
          btn.textContent = `Pay ₦${balDue.toLocaleString()} Remaining Balance →`;
        }
      });

      // Initial render of Track C time-gated offers
      renderTrackCOfferUI();

      // STAGE 1 NEXT BUTTON (Instant Partial Lead Capture -> Review & Payment)
      document.getElementById('btn-stage-1-next')?.addEventListener('click', async function () {
        let hasError = false;
        let firstErrorEl = null;

        stage1Fields.forEach(cfg => {
          const el = document.getElementById(cfg.id);
          const container = document.getElementById(cfg.fieldId);
          if (el && container) {
            const isValid = cfg.validate(el.value);
            if (!isValid) {
              hasError = true;
              container.classList.add('has-error');
              if (!firstErrorEl) firstErrorEl = container;
            } else {
              container.classList.remove('has-error');
            }
          }
        });

        if (hasError) {
          if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const btnStage1 = document.getElementById('btn-stage-1-next');
        if (btnStage1) {
          btnStage1.disabled = true;
          btnStage1.textContent = 'Please wait...';
        }

        const nameVal = document.getElementById('name').value.trim();
        const whatsappVal = document.getElementById('whatsapp').value.trim();
        const emailVal = document.getElementById('email').value.trim();
        const cityVal = document.getElementById('city').value.trim();
        const ageVal = document.getElementById('age').value;
        const occVal = document.getElementById('occupation').value.trim();
        const trackVal = document.getElementById('track').value;
        const pricing = getSelectedPricing();

        // Populate Stage 2 Summary Card
        document.getElementById('sum-name').textContent = nameVal;
        document.getElementById('sum-whatsapp').textContent = whatsappVal;
        document.getElementById('sum-email').textContent = emailVal;
        document.getElementById('sum-city').textContent = cityVal;
        document.getElementById('sum-track').textContent = trackVal;
        document.getElementById('sum-payment-plan').textContent = pricing.planLabel;
        document.getElementById('sum-amount-due').textContent = `₦${pricing.amountNaira.toLocaleString()}`;

        const creditRow = document.getElementById('sum-credit-row');
        const creditEl = document.getElementById('sum-credit');
        if (creditRow && creditEl) {
          if (pricing.appliedCredit > 0) {
            creditRow.style.display = 'block';
            creditEl.textContent = `-₦${pricing.appliedCredit.toLocaleString()}`;
          } else {
            creditRow.style.display = 'none';
          }
        }

        const balanceRow = document.getElementById('sum-balance-row');
        const balanceEl = document.getElementById('sum-balance');
        if (balanceRow && balanceEl) {
          if (pricing.balanceNote) {
            balanceEl.textContent = pricing.balanceNote;
            balanceRow.style.display = 'block';
          } else {
            balanceRow.style.display = 'none';
          }
        }

        const finalBtn = document.getElementById('btn-final-submit');
        if (finalBtn) {
          finalBtn.textContent = pricing.buttonLabel;
        }

        const srcIdent = (window.UpwardTracker && typeof window.UpwardTracker.getSourceIdentifier === 'function')
          ? window.UpwardTracker.getSourceIdentifier()
          : (typeof window.getUniversitySource === 'function' ? window.getUniversitySource() : null);

        const appStage1Payload = {
          name: nameVal,
          whatsapp: whatsappVal,
          email: emailVal,
          city: cityVal,
          ageBracket: ageVal,
          occupation: occVal || undefined,
          track: trackVal,
          paymentPlan: pricing.planLabel,
          amountPaid: pricing.amountNaira,
          sourceIdentifier: srcIdent || undefined,
          experienceLevel: `[${trackVal}] Registration Started`,
          commitment: 'Confirmed',
          why: 'Direct Track Registration'
        };

        try {
          await fetch('/api/v1/university/application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appStage1Payload)
          });
        } catch (e) {
          console.warn('Stage 1 application sync error:', e);
        } finally {
          if (btnStage1) {
            btnStage1.disabled = false;
            btnStage1.textContent = 'Continue to Payment →';
          }
        }

        updateStageUI(2);
      });

      // STAGE 2 BACK BUTTON
      document.getElementById('btn-stage-2-back')?.addEventListener('click', () => updateStageUI(1));

      // STAGE 2 FINAL PAYSTACK SUBMIT
      const submitBtn = document.getElementById('btn-final-submit');
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const termsEl = document.getElementById('termsCheck');
        const termsContainer = document.getElementById('field-terms');
        if (!termsEl.checked) {
          termsContainer.classList.add('has-error');
          termsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        termsContainer.classList.remove('has-error');

        const pricing = getSelectedPricing();
        const payload = {
          name: document.getElementById('name').value.trim(),
          whatsapp: document.getElementById('whatsapp').value.trim(),
          email: document.getElementById('email').value.trim(),
          city: document.getElementById('city').value.trim(),
          ageBracket: document.getElementById('age').value,
          occupation: document.getElementById('occupation').value.trim() || undefined,
          track: document.getElementById('track').value,
          paymentPlan: pricing.planLabel,
          amountPaid: pricing.amountNaira,
          experienceLevel: `[${document.getElementById('track').value}] Direct Registration`,
          goals: `Track: ${document.getElementById('track').value}`,
          commitment: 'Confirmed',
          why: 'Direct Track Registration',
          isScholarshipApplicant: false,
          sourceIdentifier: (window.UpwardTracker && typeof window.UpwardTracker.getSourceIdentifier === 'function')
            ? window.UpwardTracker.getSourceIdentifier()
            : (typeof window.getUniversitySource === 'function' ? window.getUniversitySource() : ''),
          abVariant: (typeof window.getUniversityAbVariant === 'function') ? window.getUniversityAbVariant() : 'A'
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Opening Checkout...';

        try {
          const res = await fetch('/api/v1/university/application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.warn('Application submission returned error:', errData);
            alert(errData.message || 'Registration submission failed. Please check your details and try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = pricing.buttonLabel;
            return;
          }

          const serverData = await res.json().catch(() => ({}));

          if (serverData && serverData.isAlreadyPaid && serverData.data?.paymentRef) {
            const firstName = encodeURIComponent(payload.name.split(' ')[0] || '');
            const existingRef = encodeURIComponent(serverData.data.paymentRef);
            window.location.href = `/academy/thank-you?ref=${existingRef}&name=${firstName}&amount=${pricing.amountNaira}`;
            return;
          }

          let paystackKey = window.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
          if (!paystackKey) {
            try {
              const configRes = await fetch('/api/v1/university/application/config');
              const configData = await configRes.json();
              if (configData && configData.paystackPublicKey) {
                paystackKey = configData.paystackPublicKey;
              }
            } catch (err) { }
          }
          if (!paystackKey) {
            paystackKey = 'pk_test_94085bb9372f06603b4ed07b88a69383e4206f3c';
          }

          const startPaystackPayment = () => {
            if (typeof window.PaystackPop !== 'undefined') {
              const handler = new window.PaystackPop();
              handler.newTransaction({
                key: paystackKey,
                email: payload.email,
                amount: pricing.amountNaira * 100,
                currency: 'NGN',
                channels: ['bank_transfer'],
                ref: 'UPW_APP_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                  paymentKind: 'ACADEMY_APPLICATION',
                  type: 'ACADEMY_APPLICATION',
                  paymentPlan: pricing.planLabel,
                  amountNaira: pricing.amountNaira,
                  creditedAmount: pricing.appliedCredit || 0,
                  applicantState: currentApplicantState || 'NEW',
                  existingRef: currentApplicantData?.paymentRef || '',
                  custom_fields: [
                    { display_name: "Applicant Name", variable_name: "applicant_name", value: payload.name },
                    { display_name: "Track", variable_name: "track", value: payload.track },
                    { display_name: "Payment Option", variable_name: "payment_plan", value: pricing.planLabel },
                    { display_name: "WhatsApp Number", variable_name: "whatsapp_number", value: payload.whatsapp },
                    { display_name: "City", variable_name: "city", value: payload.city },
                    { display_name: "Credited Previous Payment", variable_name: "credited_amount", value: pricing.appliedCredit ? `₦${pricing.appliedCredit.toLocaleString()}` : 'None' }
                  ]
                },
                onSuccess: async function (response) {
                  try {
                    await fetch('/api/v1/university/application', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...payload,
                        feeStatus: 'PAID',
                        paymentRef: response.reference
                      })
                    });
                  } catch (e) { }

                  const firstName = encodeURIComponent(payload.name.split(' ')[0] || '');
                  const ref = encodeURIComponent(response.reference || '');
                  window.location.href = `/academy/thank-you?ref=${ref}&name=${firstName}&amount=${pricing.amountNaira}`;
                },
                onCancel: async function () {
                  submitBtn.disabled = false;
                  submitBtn.textContent = pricing.buttonLabel;

                  try {
                    await fetch('/api/v1/university/application', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...payload, sendEmail: true })
                    });
                  } catch (e) { }

                  form.style.display = 'none';
                  const successEl = document.getElementById('formSuccess');
                  const firstName = payload.name.split(' ')[0];
                  if (firstName) {
                    successEl.querySelector('h3').textContent = `Registration Saved, ${firstName}!`;
                  }
                  successEl.querySelector('p').textContent = `Your registration profile has been saved. Please check your email inbox (${payload.email}) to complete your ₦${pricing.amountNaira.toLocaleString()} payment when ready.`;
                  successEl.classList.add('show');
                }
              });
            } else {
              fetch('/api/v1/university/application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, sendEmail: true })
              }).catch(() => { });

              form.style.display = 'none';
              const successEl = document.getElementById('formSuccess');
              const firstName = payload.name.split(' ')[0];
              if (firstName) {
                successEl.querySelector('h3').textContent = `Registration Saved, ${firstName}!`;
              }
              successEl.querySelector('p').textContent = `Your registration profile has been saved. Please check your email inbox (${payload.email}) to complete your ₦${pricing.amountNaira.toLocaleString()} payment when ready.`;
              successEl.classList.add('show');
            }
          };

          if (typeof window.PaystackPop === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v2/inline.js';
            script.onload = startPaystackPayment;
            script.onerror = () => startPaystackPayment();
            document.body.appendChild(script);
          } else {
            startPaystackPayment();
          }
        } catch (err) {
          console.error('Network error during submission:', err);
          submitBtn.disabled = false;
          submitBtn.textContent = pricing.buttonLabel;
        }
      });
    }

    // A/B Variant Adaptations on Application Page
    (function initAbVariantApply() {
      // Track fees and active promos are rendered directly in #apply-fees-grid
    })();
