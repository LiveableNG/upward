# React Native vs. Capacitor: Architectural & Performance Comparison

A rigorous comparative evaluation of mobile runtimes for Upward Pay, detailing rendering bottlenecks, touch responsiveness, memory constraints on West African Android devices, and long-term maintainability.

> **Target App**: `upward-pay` (Tenant Client)  
> **Date**: October 2026  
> **Author**: Mobile Architecture Team  
> **Decision**: Approved for React Native (Expo)  
> **Primary Hardware**: Android (Tecno/Infinix) & iOS  
> **API Monolith**: NestJS 11 Clean Arch / DDD  

---

### Executive Summary & Core Finding

While Capacitor allowed rapid initial market entry by wrapping the Next.js web application inside a native WebView, it introduces unavoidable responsiveness bottlenecks on entry-to-mid-range Android smartphones. For a proptech/fintech platform managing high-trust operations (verified Rent Passport™ scoring, real-time Dedicated Virtual Account bank transfers, and biometric logins), **React Native provides true 60–120fps native widgets, zero-latency touch physics, and precompiled Hermes bytecode**, eliminating web hydration penalties, DOM scroll friction, and soft-keyboard layout reflows.

---

## 1. Core Architectural Divergence: How They Work Under the Hood

The fundamental divergence between Capacitor and React Native lies in the rendering layer and how code communicates with the device hardware:

| Architectural Dimension | Capacitor (Hybrid WebView) | React Native (Native UI Bridge) |
| :--- | :--- | :--- |
| **Rendering Engine** | Sandboxed browser WebView (`WKWebView` on iOS, Android System WebView). Renders standard HTML, CSS, and DOM elements. | Instantiates real native platform widgets (`UIView` / `android.view.View`). Zero browser engine involved. |
| **JavaScript Execution** | Runs inside the browser environment, sharing the thread with DOM reflows, CSS style recalculations, and layout passes. | Runs on dedicated Hermes engine with ahead-of-time (AOT) bytecode compilation directly communicating via JSI (C++). |
| **Native Communication** | Asynchronous message-passing serialized through `postMessage` bridge injected into the WebView window. | Synchronous and asynchronous C++ bindings via JSI (JavaScript Interface), offering near-zero communication overhead. |
| **App Startup Pipeline** | 1. Load WebView → 2. Parse HTML → 3. Compile CSS → 4. Execute JS → 5. Hydrate React → 6. Paint DOM. | 1. Initialize Hermes engine → 2. Execute precompiled bytecode → 3. Mount native views directly. |
| **Offline Caching** | Service workers or static file export (`out/`) loaded over custom local scheme (`http://localhost` or `capacitor://`). | Native bundle stored on device filesystem; SQLite / MMKV / TanStack Query persistent disk caching. |

---

## 2. Performance & Responsiveness Deep-Dive

A technical breakdown of why responsiveness issues manifest on WebViews and how native primitives eliminate them:

### A. Touch & Gesture Recognition Latency
- **Capacitor:** Browser touch events traverse the DOM bubbling chain. Without extensive CSS overrides (e.g., `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent`), mobile WebViews exhibit a 100ms–300ms tap recognition delay. Interactive feedback (`:active` states) frequently lags behind user touch.
- **React Native:** Binds directly to OS gesture recognizers via `react-native-gesture-handler`. Touches are captured and acknowledged on the UI thread in the same frame, providing instantaneous button presses and haptics.

### B. Scrolling Physics & Native View Recycling
- **Capacitor:** When rendering long lists (such as ledger transactions, visitor logs, or rental listings), the WebView instantiates every DOM node in memory. Fast scrolling causes checkerboarding, frame drops, and severe memory spikes.
- **React Native:** Uses native view recycling via `@shopify/flash-list`. As items leave the viewport, their underlying native view containers are immediately repurposed, guaranteeing smooth 60fps/120fps scrolling.

### C. Viewport Resizing & Keyboard Behavior
- **Capacitor:** On Android devices, soft-keyboard activations trigger DOM viewport recalculations (`100dvh` / `100vh`). This frequently causes layout reflow jank, obscured submission buttons, and jumpy input focus.
- **React Native:** Handles keyboard transitions natively via `KeyboardAvoidingView` or `react-native-keyboard-controller`, smoothly adjusting window insets at the operating system level.

### D. Emerging Market Hardware Constraints (West Africa)
Upward's primary customer base operates in Nigeria, Ghana, and broader West Africa, where a large market share belongs to budget-to-mid-range Android smartphones (Tecno Spark, Infinix Hot, itel, Samsung Galaxy A-series with 2GB–4GB RAM). While flagship iPhones possess sufficient CPU power to brute-force smooth WebView rendering, budget Android chips struggle heavily with concurrent JavaScript execution, DOM tree mutations, and CSS layout recalculations.

---

## 3. Developer Experience & Code Reusability Reality

Evaluating engineering overhead, shared logic, and long-term development velocity:

| Factor | Capacitor Workflow | React Native (Expo) Workflow |
| :--- | :--- | :--- |
| **Code Reusability** | **90% – 95% shared.** Uses the exact same Next.js components, CSS styles, and DOM structures across Web and Mobile. | **25% – 40% shared.** Business logic, TanStack Query hooks, Zod validation schemas, and types are reused; UI must use native primitives. |
| **Team Specialization** | Standard Web Developers (React, CSS, HTML) can maintain the entire stack without mobile expertise. | Requires developers familiar with mobile navigation stacks, mobile lifecycles, and native layout rules. |
| **Build Pipeline** | `next build` export to `out/`, followed by `npx cap sync` and manual Xcode / Android Studio compiles. | Modern Expo Application Services (EAS) handles cloud builds, over-the-air (OTA) updates, and automated store submissions. |
| **Debugging & Profiling** | Chrome DevTools / Safari Web Inspector inspects WebView DOM and console logs. | React Native DevTools, Hermes CPU sampling, and Flipper for deep native frame and memory profiling. |

---

## 4. Master Comparison Matrix: Feature by Feature

Head-to-head architectural comparison across all operational criteria:

| Feature / Capability | Capacitor (Current) | React Native (Proposed) | Winner |
| :--- | :--- | :--- | :--- |
| **App Startup Speed** | Moderate to slow. Requires WebView bootstrap and full React hydration. | Instant. Pre-compiled Hermes bytecode executes directly on native threads. | **React Native** |
| **60–120fps UI Fluidity** | Inconsistent. Susceptible to frame drops during complex animations. | Reliable. Off-thread UI animations powered by Reanimated. | **React Native** |
| **List Recycling Performance** | Poor. Renders hundreds of heavy DOM nodes, causing scroll lag. | Excellent. Uses FlashList view recycling with native cells. | **React Native** |
| **Biometric Auth & Secure Store** | Capacitor Native Biometric plugin; stores credentials in browser/keychain. | Hardware-backed Keychain & Keystore via `expo-secure-store`. | **React Native** |
| **Real-time SSE & Sockets** | Browser EventSource. Sockets frequently drop silently in background. | Robust background state lifecycle management with AppState listeners. | **React Native** |
| **Time-to-Market (Initial)** | Extremely fast. Reuses web codebase with zero UI redesign. | Slower initially. Requires dedicated mobile screen development. | **Capacitor** |
| **Single Team Maintenance** | 1 codebase for Web, iOS, and Android. Minimal overhead. | Requires maintaining Web client and Mobile client separately. | **Capacitor** |
| **App Store Feel & Credibility** | Feels like a wrapped website. Users notice subtle web frictions. | Indistinguishable from high-end banking apps (Revolut, Monzo, Kuda). | **React Native** |

---

## 5. Strategic Verdict & Recommendation for Upward Pay

### Implementation Recommendation & Verdict:
Capacitor served as an effective minimum viable wrapper for proving early product traction. However, Upward Pay is evolving into a core financial utility where users pay large rent sums, build their shareable Rent Passport™, and manage gate security access. The responsiveness penalties of WebViews directly degrade user confidence and product perception.

**Migrating to React Native (Expo SDK 52+) is the strongly recommended strategic move.** By retaining shared business logic (TypeScript types, Zod schemas, TanStack Query hooks in the monorepo) while implementing high-performance native UI widgets, Upward Pay will deliver the instant responsiveness, fluid gestures, and biometric reliability expected of a premier financial application.

| Architecture Approval | Target Framework | Specification |
| :--- | :--- | :--- |
| **Ready for Execution** | Expo SDK 52 (New Architecture) | [React_Native_Migration_Specification.md](file:///Users/debelistic/upward/React_Native_Migration_Specification.md) |
