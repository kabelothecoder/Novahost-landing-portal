# NovaHost Architecture & Claude Code Onboarding Brief

This document serves as the master technical blueprint and context brief for NovaHost. It onboards Claude Code as an autonomous Lead Engineer for this repository.

## 1. Executive Summary & Core Value Proposition

### What is NovaHost?
NovaHost is a mobile-first cloud VPS and automated algorithmic trading management platform ("Silent Precision"). It allows retail forex and crypto traders to connect their MetaTrader 4 (MT4) or MetaTrader 5 (MT5) accounts, execute automated trading strategies (Expert Advisors / EAs) 24/7 in the cloud without draining phone battery, scan chart patterns using Claude 3.5 Sonnet AI, and execute remote trade signals broadcast instantly from mentors or trading desks.

### Target Users
- **Retail Traders**: Users seeking zero-latency, 24/7 cloud execution for automated trading strategies directly from their iOS or Android smartphones.
- **Mentors & Signal Providers**: Trading educators who broadcast high-probability trade setups to student accounts and manage subscriber fleets.

### Key Business Goals
NovaHost Direct-to-Consumer: A unified mobile application and platform offering premium cloud hosting, AI chart scanning, and risk management exclusively under the proprietary NovaHost brand.

## 2. Architecture & Tech Stack Breakdown

```
                                  ┌─────────────────────────────────────────┐
                                  │           ADMIN / MENTOR PORTAL         │
                                  │     (Vue.js / React Web Dashboard)      │
                                  └────────────────────┬────────────────────┘
                                                       │
                                                       │ Pushes Signals & Resets Hardware UUIDs
                                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           SUPABASE BACKEND                                             │
│  ┌───────────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────────────────┐  │
│  │   PostgreSQL Database     │   │     Realtime WebSockets   │   │        Deno Edge Functions       │  │
│  │ (bot_states, subscriptions│   │     ('signals_channel')   │   │  (/functions/v1/analyze-chart    │  │
│  │   symbol_preferences)     │   │                           │   │   /generate-payfast-checkout)    │  │
│  └───────────────────────────┘   └───────────────────────────┘   └──────────────────────────────────┘  │
└──────────────────────────────┬─────────────────────────────────────────────────┬───────────────────────┘
                               │                                                 │
          Listens to Signals & │ Verifies Device UUID           Executes Trades  │ Reads Saved Lot Size
          Updates Bot State    │                                                 │ & Symbol Parameters
                               ▼                                                 ▼
┌─────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
│                      MOBILE CLIENTS                         │   │            METAAPI ENGINE            │
│  ┌────────────────────────┐     ┌────────────────────────┐  │   │      (MT4 / MT5 Broker Bridge)       │
│  │   Android Native App   │     │      iOS Hybrid App    │  │   └──────────────────┬───────────────────┘
│  │ (Kotlin/Compose, M3,   │     │  (Vue.js, Capacitor,   │  │                      │
│  │ NovaHostPulseService)  │     │   Apple HIG, Pinia)    │  │                      │ Opens Orders Instantly
│  └────────────────────────┘     └────────────────────────┘  │                      ▼
└─────────────────────────────────────────────────────────────┘   ┌──────────────────────────────────────┐
                                                                  │         BROKER INFRASTRUCTURE        │
                                                                  │    (Exness, Deriv, XM, IC Markets)   │
                                                                  └──────────────────────────────────────┘
```

### Mobile Applications
- **Android Application**: Native Kotlin built with Jetpack Compose (Material 3 tokens customized for the Premium Light theme). Uses `NovaHostPulseService` (a foreground service) to maintain persistent WebSocket connections to Supabase Realtime without system-level background process throttling.
- **iOS Application**: Vue.js combined with Capacitor for cross-platform native runtime, styled according to Apple Human Interface Guidelines (HIG). Uses `@capacitor/device` for hardware-level fingerprinting and Pinia/Vuex for state management.

### Web Mentor Portal
- **Tech Stack**: Vue.js / React Web Application.
- **Core Responsibilities**: Central command dashboard allowing mentors to broadcast trade signals to connected student accounts, monitor active subscriber counts, manage license keys, and perform 1-tap "Reset Device UUID" actions when users change physical devices.

### Core Data Models & Schema
- **subscriptions / licenses**: Stores `email`, `status` (active/expired), `license_key`, `device_id` (hardware UUID), and `created_at`.
- **bot_states**: Stores `account_id`, `is_active` (boolean), `selected_pair`, and `last_heartbeat`.
- **signals**: Stores `symbol`, `action` (BUY/SELL), `stop_loss`, `take_profit`, and `timestamp`.
- **symbol_preferences**: Stores `user_id`, `symbol` (XAUUSD, US30, etc.), `custom_lot_size`, `risk_percentage`, and `max_open_trades`.

### API Endpoints & External Integrations
- `POST /functions/v1/analyze-chart`: Supabase Edge Function accepting a base64 image string + `trading_mode`. Invokes Anthropic API (`claude-3-5-sonnet-latest`) to perform visual analysis and return structured JSON.
- `POST /functions/v1/generate-payfast-checkout`: Serverless payment gateway bridge generating secure PayFast checkout URLs.
- **MetaAPI Cloud SDK**: Remote API connecting the client app to MetaTrader broker terminals (Trade245, Exness, Deriv, etc.).

### Authentication & Security Engine ("The Vault")
- **Device Fingerprinting**: Every subscription is bound to One Email, One Device. The app reads the physical device hardware identifier (`Device.getId()` via Capacitor on iOS, Android Hardware ID on Android).
- **Un-bypassable Route Guards**: Global navigation guards (`router.beforeEach` on iOS, NavHost state check on Android) query Supabase directly on boot. Client-side storage tampering (localStorage / SharedPreferences) cannot bypass the security gate.

## 3. Comprehensive Feature Matrix

### Mobile Features (Android & iOS)

| Feature | Primary Purpose | Tech Implementation |
|---|---|---|
| System Setup Onboarding | 5-step setup wizard introducing value, capturing display name, simulating server allocation, and verifying activation. | `HorizontalPager` (Compose) / 5-step Touch Slider (Vue). |
| Device-Locked Activation | Validates user license/email and binds physical device UUID to Supabase database. | `@capacitor/device` + Supabase `subscriptions` table. |
| Home Dashboard | Minimalist command center featuring user greeting, glassmorphic status badge, and central ignition button. | Jetpack Compose / Vue, reactive `is_active` state. |
| Robot Ignition (START/STOP) | Toggles cloud trading engine status, spins up local logging service, and joins Realtime socket. | `NovaHostPulseService` / WebSocket connection. |
| AI Chart Scanner | Analyzes uploaded chart screenshots to extract patterns, signals, Stop Loss, and Take Profit levels. | Camera/Picker -> base64 -> Claude 3.5 Sonnet Edge Function. |
| Smart Risk Calculator | Computes lot sizes dynamically based on account balance, risk percentage, asset pip value, and SL pips. | `riskCalculator.js` / Kotlin Math Utility. |
| Trading Symbols Hub | Lists active asset pairs (XAUUSD, US30, etc.) with gear icons opening per-symbol lot size configuration sheets. | Modal Bottom Sheet + Supabase `symbol_preferences` upsert. |
| Agnostic Broker Setup | Secure form collecting MT4/MT5 Server, Account ID, and Password without hardcoded broker strings. | Material 3 / HIG Outlined Inputs + MetaAPI SDK. |

### Mentor Portal Features

| Feature | Primary Purpose | Tech Implementation |
|---|---|---|
| Signal Broadcast Engine | Sends instant trade orders (Symbol, Action, Entry, SL, TP) to all active subscriber accounts. | Web form pushing to Supabase `signals` table / Realtime broadcast. |
| Student Fleet Monitor | Displays live count of active online trading robots and subscriber subscription health. | Realtime PostgreSQL channel query. |
| License Management | Generates new license keys, checks payment statuses, and manages user accounts. | Supabase Admin SDK. |
| 1-Tap Hardware Reset | Unbinds a user's `device_id` in Supabase when they upgrade or replace their phone. | PostgreSQL `UPDATE subscriptions SET device_id = NULL`. |

## 4. Component & Design System Guidelines

NovaHost strictly adheres to a "Premium Light / Clean Neumorphic" visual aesthetic across all mobile screens.

### Color Tokens

| Token | Value |
|---|---|
| App Background | Soft Icy Off-White (`#F4F7F9`) |
| Cards / Surfaces | Pure White (`#FFFFFF`), 24px Border Radius |
| Ambient Card Shadow | Soft Diffused (`box-shadow: 0 16px 40px rgba(...)`) |
| Primary Action Accent | Soft Light Blue (`#5C9CE6`) |
| Secondary Accent | Soft Light Purple (`#A288E3`) |
| Primary Typography | Deep Charcoal (`#1A1D20`) |
| Muted Subtitles | Soft Slate Grey (`#8A94A6`) |

### Component Rules & Conventions
- **Pill Shapes Only**: Every primary button MUST be pill-shaped (`CircleShape` in Compose, `border-radius: 9999px` in Vue/CSS). Square or rectangular buttons are strictly prohibited.
- **Floating Cards**: Content blocks must be placed inside pure white (`#FFFFFF`) cards with a large border-radius (24px / 24.dp) and soft drop shadows (`box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06)`).
- **Zero Broker Hardcoding**: Never hardcode specific broker names (such as "Trade245") in UI text or placeholders. All server selection fields must use dynamic, searchable inputs.

## 5. Instructions for Claude Code

You are the Lead Engineer working on NovaHost, a mobile-first cloud VPS and automated trading management suite (Android native in Kotlin/Compose, iOS hybrid in Vue.js/Capacitor, Admin Portal in Vue/React, and Supabase backend).

### Mandatory Workflow & Implementation Rules

Before writing or modifying any code in this repository, strictly adhere to the following 5-step execution workflow:

#### 1. Pre-Flight Verification & Skill Check
- Analyze the codebase to understand existing architecture, state management patterns, and design tokens.
- Review necessary core concepts before writing code (e.g., Jetpack Compose state hoisting, Vue 3 Composition API, Supabase Realtime WebSocket subscriptions, Capacitor native plugins, or Deno Edge Function constraints).
- Check that all proposed UI updates maintain absolute compliance with our "Premium Light" theme (Background `#F4F7F9`, pure white floating cards `#FFFFFF` with 24px radius, and pill-shaped Soft Light Blue `#5C9CE6` buttons).

#### 2. Step-by-Step Implementation Plan
- Provide a concise, numbered plan detailing every file you intend to create, modify, or delete.
- Explicitly state how data will flow between the Frontend, Supabase Database, Realtime Channels, and MetaAPI SDK.
- Wait for user confirmation if the task involves database schema changes or architecture shifts.

#### 3. Strategic UI/UX Hacks & Micro-Interactions
- Detail micro-interactions to make the feature feel world-class (e.g., tactile haptic feedback on button presses, smooth CSS/Compose transition animations, debounced inputs, or skeleton loader states).
- Ensure buttons are strictly pill-shaped (`CircleShape` / `border-radius: 9999px`).
- Ensure no hardcoded broker names or static API keys exist in the UI code.

#### 4. Reference Search Terms
- List 2-3 exact YouTube or web search terms for design teardowns and build references related to the feature (e.g., "Jetpack Compose animated modal bottom sheet tutorial", "Vue 3 Capacitor device fingerprinting setup", or "Supabase Edge Functions Anthropic vision API").

#### 5. Execution & Quality Guardrails
- Write clean, production-ready, type-safe code.
- Wrap all network operations and asynchronous API calls in robust `try/catch` blocks that present user-friendly error messages (e.g., Snackbars or Toasts) instead of raw HTTP stack traces.
- Run project build tools (`./gradlew assembleDebug` for Android or `npm run build` for iOS/Vue) to verify zero compilation errors.
