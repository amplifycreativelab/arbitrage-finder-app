# Arbitrage Finder App - Product Requirements Document

**Author:** User
**Date:** November 20, 2025
**Version:** 1.0

---

## Executive Summary

The **Arbitrage Finder App** empowers non-technical users to identify risk-free profit opportunities ("surebets") in the sports betting market. By packaging complex data aggregation into a standalone Windows 11 desktop application, it eliminates the need for technical setup or command-line scripts.

### What Makes This Special

The core innovation is the **API-Agnostic Adapter Layer**. Unlike competitors locked into specific data vendors, this app normalizes data from disparate sources (Odds-API.io for production, The-Odds-API.com for testing), allowing users to switch providers seamlessly without breaking the user experience or incurring unnecessary development costs.

---

## Project Classification

**Technical Type:** Desktop Application (Electron/React/Node)
**Domain:** Sports Analytics / Information Aggregation
**Complexity:** High

This project involves high-frequency data aggregation, strict external API rate limit management (5,000 requests/hour), and complex local data normalization logic to ensure a unified user experience across different data providers.

### Domain Context

The application operates in a time-sensitive domain where data freshness is critical. However, it must balance freshness against strict API quotas to prevent user bans. The architecture heavily relies on the **Adapter Pattern** to abstract away the differences between the production feed (pre-calculated arbs) and the test feed (raw odds requiring local calculation).

---

## Success Criteria

1.  **Zero-Config Usability:** A user must be able to paste an API key and see arbitrage opportunities within < 60 seconds of first launch.
2.  **Dynamic Freshness:** System automatically calculates the minimum safe polling interval based on remaining API quota, ensuring data is as current as possible without triggering rate limits.
3.  **Staleness Visibility:** UI clearly indicates the "Time Since Last Update" for every arbitrage opportunity, preventing users from chasing expired bets.
4.  **API Flexibility:** Switching between `Odds-API.io` and `The-Odds-API.com` in settings must update the Data Grid immediately without app restart or errors.

---

## Product Scope

### MVP - Minimum Viable Product

* **Multi-API Support:** Settings panel to toggle providers and securely store API keys.
* **Arbitrage Detection Engine:** Adapter-based logic to fetch pre-calculated bets (Prod) or calculate from raw odds (Test).
* **Data Grid Dashboard:** Sortable table showing Event, Leg 1, Leg 2, and highlighted ROI.
* **Smart Polling:** Automated request throttling based on API limits.
* **Filtering:** Filter by Region (AU, UK, IT, RO), Sport (Soccer, Tennis), and ROI threshold.
* **Quick Actions:** "Copy Details" to clipboard

### Growth Features (Post-MVP)

* **Advanced Sport Support:** Expansion beyond Soccer/Tennis.
* **Historical Analysis:** Tracking past arbitrage opportunities.
* **Alerting:** System tray notifications for high-ROI finds.

### Vision (Future)

* **Automated Betting:** Direct integration with bookmaker accounts (long-term vision).
* **User-defined Adapters:** Community-contributed adapters for additional data sources.

---

## Domain-Specific Requirements

### Data Normalization Strategy
The system must implement a strict internal `ArbitrageOpportunity` model. All incoming data (regardless of source schema) must be transformed into this model before reaching the UI. This ensures the frontend remains decoupled from specific API implementations.

### Calculation Fallback Logic
* **Production Mode:** Trusts the provider's calculated arbs (`/v3/arbitrage-bets`).
* **Test Mode:** Performs arbitrage calculation logic locally on raw odds (`1/oddsA + 1/oddsB < 1`) to identify discrepancies.

---

## Desktop & Platform Requirements

### Platform Support
* **Target OS:** Windows 11.
* **Framework:** Electron (ensures cross-platform foundation for future portability).

### Device Capabilities
* **Local Storage:** Secure storage (e.g., Electron `safeStorage`) for API keys.


---

## User Experience Principles

**Speed & Efficiency:** The core loop is "Scan -> Identify -> Bet." The UI must minimize friction between spotting an arb and opening the bookmaker site.

**Transparency:** Users must trust the data. Visual indicators for "Staleness" (time since last update) are mandatory to manage expectations regarding bet availability.

### Key Interactions
* **One-Click Copy:** Clicking a row or action button copies all bet details (Bookmakers, Teams, Odds, Stakes) to the clipboard for easy record-keeping.


---

## Functional Requirements

**Configuration & Settings**
* **FR1:** Users can select the Active Data Provider (Production vs. Test) via a dropdown menu.
* **FR2:** Users can input and securely save API keys for each specific provider.
* **FR3:** Users can filter Bookmakers by region (AU, UK, IT, RO) to ensure relevance.
* **FR4:** Users can toggle specific sports (Soccer, Tennis) for scanning.

**Arbitrage Detection Engine**
* **FR5:** System retrieves pre-calculated arbitrage bets when connected to the Production API.
* **FR6:** System calculates arbitrage opportunities locally from raw odds when connected to the Test API.
* **FR7:** System normalizes all API responses into a unified data model (`ArbitrageOpportunity`).
* **FR8:** System manages API request frequency to strictly adhere to the 5,000 req/hour limit.

**Dashboard & Visualization**
* **FR9:** Users can view a sortable Data Grid displaying Event, Leg 1, Leg 2, and ROI.
* **FR10:** Users can filter the Data Grid to hide opportunities below a specific ROI threshold.
* **FR11:** Users can filter the Data Grid by Market Type (Moneyline, Draw No Bet, Totals).
* **FR12:** System visually highlights the ROI percentage for quick scanning.
* **FR13:** UI displays a "Staleness Indicator" showing time elapsed since the last data fetch.

**Actions**
* **FR14:** Users can copy complete bet details to the clipboard with a single click.


---

## Non-Functional Requirements

### Performance
* **NFR1 (Rate Limiting):** System must effectively cache data and throttle requests to prevent API bans (Zero 429 errors under normal use).
* **NFR2 (Responsiveness):** UI must remain responsive during data fetching; scanning should happen asynchronously without blocking the main thread.

### Usability
* **NFR3 (Zero-Config):** Application must require no external dependencies (Python, Docker, etc.) to run on a standard Windows 11 machine.

### Security
* **NFR4 (Data Privacy):** API Keys are stored locally using secure storage methods and never transmitted to third-party servers (other than the API provider itself).

---

## Architecture & Epics Alignment

This section maps PRD requirements to the architecture (`_bmad-output/architecture.md`) and epics (`_bmad-output/epics.md`).

### Functional Requirements → Architecture

- **FR1–FR4 (Configuration & Settings)**  
  - `renderer/src/features/settings/**` – provider selection, region/sport filters, API key forms  
  - `src/main/credentials.ts` and `src/main/services/storage.ts` – secure key handling and persisted preferences  
  - `preload/index.ts` and `electron-trpc` routes – typed settings/credentials IPC bridge

- **FR5–FR7 (Arbitrage Detection Engine)**  
  - Provider adapters: `src/main/adapters/odds-api-io.ts`, `src/main/adapters/the-odds-api.ts`  
  - Shared model: `shared/types.ts` (`ArbitrageOpportunity`) and `shared/schemas.ts` (validation)  
  - Calculation: `src/main/services/calculator.ts` (local arb engine in Test mode)

- **FR8 (Smart Polling & Rate Limiting)**  
  - Polling: `src/main/services/poller.ts` (quota-aware schedules, freshness)  
  - Rate limiting: `bottleneck` configuration and `RateLimiterConfig` in main (see “High-Risk Domain Patterns – Rate Limiting (R-001)”)

- **FR9–FR13 (Dashboard & Visualization)**  
  - Dashboard UI: `renderer/src/features/dashboard/FeedTable.tsx`, `SignalPreview.tsx`  
  - Status & staleness: Zustand stores + `SystemStatus` / `ProviderStatus` (see “UX Error and Degraded States”)  
  - Observability: heartbeats and staleness indicators wired from `poller.ts` (see “Error Handling, Logging, and Observability”)

- **FR14 (Actions / Copy)**  
  - Interaction patterns: `renderer/src/features/dashboard/**` and future `renderer/src/features/interaction/**` for copy-and-advance flows

### Non-Functional Requirements → Architecture

- **NFR1 (Rate Limiting):** “High-Risk Domain Patterns – Rate Limiting (R-001)” and `poller.ts` + `bottleneck`.  
- **NFR2 (Responsiveness):** Electron main/renderer split, async `electron-trpc` IPC, and explicit loading states in Implementation Patterns.  
- **NFR3 (Zero-Config):** “Project Initialization” and “Development Commands” sections.  
- **NFR4 (Data Privacy):** “Security and API Credential Handling” (safeStorage, credentials module, log hygiene).  

### PRD ↔ Epics

- **Epic 1 – Foundation & Secure Configuration** → FR1, FR2, NFR3, NFR4.  
- **Epic 2 – Data Engine** → FR5–FR8, NFR1, NFR2.  
- **Epic 3 – Dashboard** → FR3, FR4, FR9–FR13.  
- **Epic 4 – Interaction** → FR14 and keyboard-first workflows.  

Any new requirement added to this PRD must be linked to:
- One or more architecture touchpoints (files/patterns in `_bmad-output/architecture.md`), and  
- One or more epics/stories in `_bmad-output/epics.md`.  

---

_This PRD captures the essence of the Arbitrage Finder App - a powerful, user-friendly tool for identifying sports betting opportunities without technical barriers._
