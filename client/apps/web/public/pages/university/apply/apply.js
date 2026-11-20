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

    // Active Webinar / Info Session Population (21st November 2026)
    function initApplySessionTimes() {
      const sessionSelect = document.getElementById('session_time');
      if (!sessionSelect) return;

      sessionSelect.innerHTML = '';

      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = 'Select session option';
      sessionSelect.appendChild(placeholderOpt);

      const webinarOpt = document.createElement('option');
      webinarOpt.value = 'Saturday 21st November 2026 (Online Webinar)';
      webinarOpt.textContent = 'Online Webinar / Info Session — Saturday, 21st November 2026 (Open Nationwide)';
      sessionSelect.appendChild(webinarOpt);

      const noSessionOpt = document.createElement('option');
      noSessionOpt.value = "I don't need an info session";
      noSessionOpt.textContent = "I don't need an info session";
      sessionSelect.appendChild(noSessionOpt);
    }

    initApplySessionTimes();

    const form = document.getElementById('universityApplyForm');
    if (form) {
      let currentStage = 1;

      // Time-Limited Track C Promo Deadlines (WAT / UTC+1)
      // - Weekend Lock-In Deposit (₦25k now -> ₦50k off -> ₦150k total): ends Sunday Nov 22, 2026 11:59 PM WAT
      // - 48-Hour Full-Pay Offer (₦135k now): ends Monday Nov 23, 2026 11:59 PM WAT
      // - After Monday 11:59 PM WAT: Track C returns to ₦200,000
      const WEEKEND_LOCKIN_DEADLINE = new Date('2026-11-22T23:59:59+01:00');
      const FULL_PAY_OFFER_DEADLINE = new Date('2026-11-23T23:59:59+01:00');

      let selectedTrackCOffer = 'lockin_25k';

      function getTrackCOfferAvailability(now = new Date()) {
        const ts = now.getTime();
        const hasWeekendLockIn = ts <= WEEKEND_LOCKIN_DEADLINE.getTime();
        const has48HrFullPay = ts <= FULL_PAY_OFFER_DEADLINE.getTime();
        return { hasWeekendLockIn, has48HrFullPay };
      }

      function renderTrackCOfferUI() {
        const trackEl = document.getElementById('track');
        const offerBox = document.getElementById('trackCOfferBox');
        const offerGrid = document.getElementById('trackCOfferGrid');
        const deadlineLabel = document.getElementById('trackCOfferDeadlineLabel');
        const optTrackC = document.getElementById('opt-track-c');
        const compareTrackCPrice = document.getElementById('compare-track-c-price');
        const promoBanner = document.getElementById('track-c-promo-banner');

        const { hasWeekendLockIn, has48HrFullPay } = getTrackCOfferAvailability();

        // Update Track C label in dropdown, comparison popover, and top banner
        if (optTrackC) {
          if (hasWeekendLockIn) {
            optTrackC.textContent = 'Track C · Practical Experience — ₦25k Lock-In or ₦135k Full (Was ₦200k)';
          } else if (has48HrFullPay) {
            optTrackC.textContent = 'Track C · Practical Experience — ₦135,000 48-Hr Offer (Was ₦200k)';
          } else {
            optTrackC.textContent = 'Track C · Practical Experience — Learn It. Experience It. (₦200,000)';
          }
        }

        if (compareTrackCPrice) {
          if (hasWeekendLockIn) {
            compareTrackCPrice.innerHTML = '₦25k deposit <span style="font-weight:400;color:var(--ink-muted);">or</span> ₦135k full <span class="old-price">₦200,000</span>';
          } else if (has48HrFullPay) {
            compareTrackCPrice.innerHTML = '₦135,000 <span class="old-price">₦200,000</span>';
          } else {
            compareTrackCPrice.textContent = '₦200,000';
          }
        }

        if (promoBanner) {
          if (hasWeekendLockIn) {
            promoBanner.style.display = '';
            promoBanner.className = 'fee-card featured offer-deal-card';
            promoBanner.innerHTML = `
              <div class="offer-deal-top">
                <div class="offer-deal-label-wrap">
                  <span class="offer-deal-pill">Special Cohort Offer</span>
                  <span class="offer-deal-track">Track C · Practical Experience</span>
                </div>
                <div class="offer-deal-standard-fee">
                  <span class="standard-fee-label">Standard Fee</span>
                  <span class="standard-fee-amount">₦200,000</span>
                </div>
              </div>

              <div class="offer-choices-container">
                <!-- OPTION 1 -->
                <div class="offer-choice-block">
                  <div class="offer-choice-left">
                    <span class="offer-choice-badge">Option 1 · Weekend Lock-In</span>
                    <div class="offer-choice-val">
                      <strong>₦25,000</strong> deposit today
                    </div>
                    <div class="offer-choice-details">
                      Lock in <strong>₦50,000 off</strong> (₦150,000 total · balance before kickoff).
                    </div>
                  </div>
                  <div class="offer-choice-right">
                    <span class="offer-choice-deadline">Ends Sunday 11:59 PM</span>
                  </div>
                </div>

                <!-- OR DIVIDER -->
                <div class="offer-or-row">
                  <span class="offer-or-badge">or</span>
                </div>

                <!-- OPTION 2 -->
                <div class="offer-choice-block highlight">
                  <div class="offer-choice-left">
                    <span class="offer-choice-badge accent">Option 2 · 48-Hour Full Pay</span>
                    <div class="offer-choice-val">
                      <strong>₦135,000</strong> upfront
                    </div>
                    <div class="offer-choice-details">
                      Pay in full within 48 hours to <strong>save ₦65,000</strong> off ₦200,000.
                    </div>
                  </div>
                  <div class="offer-choice-right">
                    <span class="offer-choice-deadline">Ends Monday 11:59 PM</span>
                  </div>
                </div>
              </div>

              <div class="offer-deal-foot">
                Select Track C in Step 1 below to choose your payment option at checkout.
              </div>
            `;
          } else if (has48HrFullPay) {
            promoBanner.style.display = '';
            promoBanner.className = 'fee-card featured offer-deal-card';
            promoBanner.innerHTML = `
              <div class="offer-deal-top">
                <div class="offer-deal-label-wrap">
                  <span class="offer-deal-pill">48-Hour Full Payment Offer</span>
                  <span class="offer-deal-track">Track C · Practical Experience</span>
                </div>
                <div class="offer-deal-standard-fee">
                  <span class="standard-fee-label">Standard Fee</span>
                  <span class="standard-fee-amount">₦200,000</span>
                </div>
              </div>

              <div class="offer-choices-container">
                <div class="offer-choice-block highlight" style="width: 100%;">
                  <div class="offer-choice-left">
                    <span class="offer-choice-badge accent">Save ₦65,000 Instantly</span>
                    <div class="offer-choice-val">
                      <strong>₦135,000</strong> one-time payment
                    </div>
                    <div class="offer-choice-details">
                      Pay upfront in full before Monday 11:59 PM WAT to get Option C. Fee returns to ₦200,000 after midnight.
                    </div>
                  </div>
                  <div class="offer-choice-right">
                    <span class="offer-choice-deadline">Ends Tonight (Mon 11:59 PM)</span>
                  </div>
                </div>
              </div>

              <div class="offer-deal-foot">
                Select Track C in Step 1 below to claim the ₦65,000 discount at checkout.
              </div>
            `;
          } else {
            promoBanner.className = 'fee-card';
            promoBanner.innerHTML = `
              <div class="tracks-card-top">
                <span class="eyebrow">Cohort Kickoff</span>
                <span class="tracks-card-tag">December 5, 2026</span>
              </div>
              <div class="fee-price-range">₦200,000</div>
              <p style="font-size:13px; color:var(--ink-soft); line-height:1.45; margin-top:8px;">
                Track C: Practical Experience provides hands-on property management operations, mentorship, and on-site practical exposure.
              </p>
            `;
          }
        }

        const isTrackC = trackEl && trackEl.value === 'Track C - Practical Experience';
        if (!offerBox || !offerGrid) return;

        if (!isTrackC || (!hasWeekendLockIn && !has48HrFullPay)) {
          offerBox.style.display = 'none';
          selectedTrackCOffer = 'standard_200k';
          return;
        }

        // Ensure valid default selection
        if (selectedTrackCOffer === 'lockin_25k' && !hasWeekendLockIn) {
          selectedTrackCOffer = 'full_135k';
        } else if (selectedTrackCOffer === 'standard_200k') {
          selectedTrackCOffer = hasWeekendLockIn ? 'lockin_25k' : 'full_135k';
        }

        if (deadlineLabel) {
          deadlineLabel.textContent = hasWeekendLockIn
            ? 'Weekend & 48-Hr Offers Active'
            : 'Ends Monday 11:59 PM';
        }

        let cardsHtml = '';

        if (hasWeekendLockIn) {
          const isSel = selectedTrackCOffer === 'lockin_25k';
          cardsHtml += `
            <label class="track-offer-card ${isSel ? 'selected' : ''}" data-offer="lockin_25k">
              <input type="radio" name="trackCOffer" value="lockin_25k" ${isSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge">Save ₦50,000 · Ends Sunday</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">Weekend Lock-In Deposit</div>
              <div class="track-offer-price">₦25,000 <span class="old">₦200,000</span></div>
              <div class="track-offer-sub">Pay ₦25,000 now to lock in ₦50,000 off Track C (<strong>₦150,000 total</strong> · ₦125,000 balance later).</div>
            </label>
          `;
        }

        if (has48HrFullPay) {
          const isSel = selectedTrackCOffer === 'full_135k';
          cardsHtml += `
            <label class="track-offer-card ${isSel ? 'selected' : ''}" data-offer="full_135k">
              <input type="radio" name="trackCOffer" value="full_135k" ${isSel ? 'checked' : ''}>
              <div class="track-offer-top">
                <span class="track-offer-badge">Save ₦65,000 · Ends Mon 11:59 PM</span>
                <span class="track-offer-check"><i class="fa-solid fa-circle-check"></i></span>
              </div>
              <div class="track-offer-name">48-Hour Full Payment</div>
              <div class="track-offer-price">₦135,000 <span class="old">₦200,000</span></div>
              <div class="track-offer-sub">Pay ₦135,000 upfront in full within 48 hours and save ₦65,000 off Track C.</div>
            </label>
          `;
        }

        offerGrid.innerHTML = cardsHtml;
        offerGrid.style.gridTemplateColumns = hasWeekendLockIn && has48HrFullPay ? '' : '1fr';
        offerBox.style.display = 'block';

        offerGrid.querySelectorAll('.track-offer-card').forEach(card => {
          card.addEventListener('click', () => {
            const offerKey = card.getAttribute('data-offer');
            if (!offerKey) return;
            selectedTrackCOffer = offerKey;
            offerGrid.querySelectorAll('.track-offer-card').forEach(c => {
              const match = c.getAttribute('data-offer') === offerKey;
              c.classList.toggle('selected', match);
              const r = c.querySelector('input[type="radio"]');
              if (r) r.checked = match;
            });
          });
        });
      }

      function getSelectedPricing() {
        const trackVal = document.getElementById('track')?.value || '';
        const { hasWeekendLockIn, has48HrFullPay } = getTrackCOfferAvailability();

        if (trackVal === 'Track A - Foundation') {
          return {
            amountNaira: 60000,
            planLabel: 'Track A Full Fee (₦60,000)',
            balanceNote: '',
            buttonLabel: 'Pay ₦60,000 →',
          };
        }
        if (trackVal === 'Track B - Career Development') {
          return {
            amountNaira: 100000,
            planLabel: 'Track B Full Fee (₦100,000)',
            balanceNote: '',
            buttonLabel: 'Pay ₦100,000 →',
          };
        }
        if (trackVal === 'Track C - Practical Experience') {
          if (selectedTrackCOffer === 'lockin_25k' && hasWeekendLockIn) {
            return {
              amountNaira: 25000,
              planLabel: 'Track C Weekend Lock-In Deposit — ₦25,000 now (₦150,000 total · ₦125,000 balance later)',
              balanceNote: '₦125,000 (Total ₦150,000 — ₦50,000 off)',
              buttonLabel: 'Pay ₦25,000 Lock-In Deposit →',
            };
          }
          if (selectedTrackCOffer === 'full_135k' && has48HrFullPay) {
            return {
              amountNaira: 135000,
              planLabel: 'Track C 48-Hour Full Offer (₦135,000 — Save ₦65,000)',
              balanceNote: '',
              buttonLabel: 'Pay ₦135,000 (48-Hr Offer) →',
            };
          }
          return {
            amountNaira: 200000,
            planLabel: 'Track C Full Fee (₦200,000)',
            balanceNote: '',
            buttonLabel: 'Pay ₦200,000 →',
          };
        }
        if (trackVal === 'Track D - Premium Networking') {
          return {
            amountNaira: 200000,
            planLabel: 'Track D Full Fee (₦200,000)',
            balanceNote: '',
            buttonLabel: 'Pay ₦200,000 →',
          };
        }
        return {
          amountNaira: 60000,
          planLabel: 'Track Fee',
          balanceNote: '',
          buttonLabel: 'Complete Payment →',
        };
      }

      const stage1Fields = [
        { id: 'name', fieldId: 'field-name', validate: val => val.trim().length > 0 },
        { id: 'whatsapp', fieldId: 'field-whatsapp', validate: val => val.trim().length >= 6 },
        { id: 'email', fieldId: 'field-email', validate: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) },
        { id: 'city', fieldId: 'field-city', validate: val => val.trim().length > 0 },
        { id: 'age', fieldId: 'field-age', validate: val => val !== '' },
        { id: 'track', fieldId: 'field-track', validate: val => val !== '' },
        { id: 'session_time', fieldId: 'field-session-time', validate: val => val !== '' }
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

      const trackSelectEl = document.getElementById('track');
      if (trackSelectEl) {
        trackSelectEl.addEventListener('change', renderTrackCOfferUI);
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

            if (nameEl) nameEl.textContent = data.name || 'Applicant';
            if (emailEl) emailEl.textContent = data.email || '';
            if (phoneEl) phoneEl.textContent = data.whatsapp || '';
            if (refEl) refEl.textContent = data.paymentRef || 'N/A';

            stageBal.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
          }
        } catch (err) {
          console.error('Balance lookup error:', err);
        }
        return false;
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
        }
        if (trackSelectEl && trackParam) {
          if (trackParam === 'track-d' || trackParam === 'd' || trackParam === '4' || trackParam.includes('network') || trackParam.includes('premium')) {
            trackSelectEl.value = 'Track D - Premium Networking';
          } else if (trackParam === 'track-c' || trackParam === 'c' || trackParam === '3' || trackParam.includes('practical')) {
            trackSelectEl.value = 'Track C - Practical Experience';
          } else if (trackParam === 'track-b' || trackParam === 'b' || trackParam === 'track2' || trackParam === '2' || trackParam.includes('career') || trackParam.includes('started')) {
            trackSelectEl.value = 'Track B - Career Development';
          } else if (trackParam === 'track-a' || trackParam === 'a' || trackParam === 'track1' || trackParam === '1' || trackParam.includes('foundation') || trackParam.includes('zero')) {
            trackSelectEl.value = 'Track A - Foundation';
          }
        }
      } catch (err) {
        // Fallback
      }

      // Email Recognition on Application Form
      const emailInputEl = document.getElementById('email');
      if (emailInputEl) {
        let emailDebounceTimer = null;
        const checkReturningDeposit = async () => {
          const val = (emailInputEl.value || '').trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
          try {
            const res = await fetch(`/api/v1/university/application/lookup?email=${encodeURIComponent(val)}`);
            const json = await res.json();
            const noticeEl = document.getElementById('returning-balance-notice');
            if (json && json.found && json.data && json.data.isDeposit && !json.data.isFullyCleared) {
              currentBalanceData = json.data;
              if (noticeEl) {
                noticeEl.style.display = 'block';
                const textEl = document.getElementById('returning-notice-text');
                if (textEl) {
                  textEl.textContent = `Welcome back, ${json.data.name.split(' ')[0]}! You have an active Track C deposit (₦25,000 paid). You can clear your remaining ₦125,000 balance anytime without re-filling this form.`;
                }
              }
            } else if (noticeEl) {
              noticeEl.style.display = 'none';
            }
          } catch (e) { }
        };

        emailInputEl.addEventListener('blur', checkReturningDeposit);
        emailInputEl.addEventListener('input', () => {
          clearTimeout(emailDebounceTimer);
          emailDebounceTimer = setTimeout(checkReturningDeposit, 800);
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
                amount: 125000 * 100, // ₦125,000 in kobo
                currency: 'NGN',
                ref: 'UPW_BAL_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                  paymentKind: 'ACADEMY_TUITION_BALANCE',
                  type: 'ACADEMY_TUITION_BALANCE',
                  track: currentBalanceData.track,
                  custom_fields: [
                    { display_name: "Applicant Name", variable_name: "applicant_name", value: currentBalanceData.name },
                    { display_name: "Original Deposit Ref", variable_name: "original_deposit_ref", value: currentBalanceData.paymentRef },
                    { display_name: "Balance Payment", variable_name: "balance_payment", value: "₦125,000" }
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
                        amountPaid: 125000
                      })
                    });
                  } catch (e) { }
                  const firstName = encodeURIComponent((currentBalanceData.name || '').split(' ')[0] || '');
                  window.location.href = `/academy/thank-you?ref=${encodeURIComponent(response.reference)}&name=${firstName}&balancePaid=true&amount=125000`;
                },
                onCancel: function () {
                  btn.disabled = false;
                  btn.textContent = 'Pay ₦125,000 Remaining Balance →';
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
              btn.textContent = 'Pay ₦125,000 Remaining Balance →';
            };
            document.body.appendChild(script);
          } else {
            startBalancePayment();
          }
        } catch (err) {
          console.error('Balance payment error:', err);
          btn.disabled = false;
          btn.textContent = 'Pay ₦125,000 Remaining Balance →';
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
        const sessionVal = document.getElementById('session_time').value;
        const pricing = getSelectedPricing();

        // Populate Stage 2 Summary Card
        document.getElementById('sum-name').textContent = nameVal;
        document.getElementById('sum-whatsapp').textContent = whatsappVal;
        document.getElementById('sum-email').textContent = emailVal;
        document.getElementById('sum-city').textContent = cityVal;
        document.getElementById('sum-track').textContent = trackVal;
        document.getElementById('sum-payment-plan').textContent = pricing.planLabel;
        document.getElementById('sum-amount-due').textContent = `₦${pricing.amountNaira.toLocaleString()}`;
        document.getElementById('sum-session').textContent = sessionVal || '-';

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
          sessionTime: sessionVal,
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
          sessionTime: document.getElementById('session_time').value,
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
                ref: 'UPW_APP_' + Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                  paymentKind: 'ACADEMY_APPLICATION',
                  type: 'ACADEMY_APPLICATION',
                  paymentPlan: pricing.planLabel,
                  amountNaira: pricing.amountNaira,
                  custom_fields: [
                    { display_name: "Applicant Name", variable_name: "applicant_name", value: payload.name },
                    { display_name: "Track", variable_name: "track", value: payload.track },
                    { display_name: "Payment Option", variable_name: "payment_plan", value: pricing.planLabel },
                    { display_name: "WhatsApp Number", variable_name: "whatsapp_number", value: payload.whatsapp },
                    { display_name: "City", variable_name: "city", value: payload.city },
                    { display_name: "Info Session", variable_name: "info_session", value: payload.sessionTime || '' }
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
