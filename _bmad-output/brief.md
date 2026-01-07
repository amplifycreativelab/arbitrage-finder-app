# Project Brief: Arbitrage Finder App

| **Project Name** | Arbitrage Finder App |
| :--- | :--- |
| **Target Platform** | Windows 11 (Desktop) |
| **Tech Stack** | Electron, React, Node.js |
| **Primary Data Source** | [Odds-API.io](https://odds-api.io/) |
| **Secondary (Test) Data Source** | [The-Odds-API.com](https://the-odds-api.com/) |
| **Date** | November 20, 2025 |

---

## 1. Executive Summary
The **Arbitrage Finder App** is a standalone, web-based desktop application designed for Windows 11. It empowers non-technical users to identify "surebets" (arbitrage opportunities) in the sports betting market. The application is architected to be **API-agnostic**, featuring a normalization layer that allows users to switch between data providers (using `odds-api.io` for production and `the-odds-api.com` for low-cost testing). It aggregates real-time odds to calculate and present risk-free profit opportunities in a unified, user-friendly interface without requiring technical setup or command-line knowledge.

## 2. Problem Statement
* **Manual Calculation:** analyzing thousands of odds across multiple bookmakers in real-time is impossible for humans.
* **Vendor Lock-in:** Relying on a single API hardcodes the application to specific data structures and pricing models.
* **Development Costs:** Testing with premium APIs burns expensive credits; a free-tier friendly option is needed for development cycles.
* **Usability Gap:** Existing solutions are either expensive SaaS subscriptions or complex Python scripts requiring technical expertise.

## 3. Goals & Success Metrics
* **Flexibility:** Users can seamlessly switch between APIs via a "Settings" menu without breaking the UI.
* **Usability:** A "Zero-Config" experience—users simply enter an API key and click "Start."
* **Performance:** Efficient caching strategies to respect the 5,000 requests/hour limit (Primary API) and equivalent limits for the Test API.
* **Accuracy:** Reliable detection and display of arbitrage opportunities with positive ROI (>0%).

## 4. Functional Requirements

### 4.1 Multi-API Support & Configuration
* **Settings Panel:**
    * Dropdown to select Active Provider (e.g., "Odds-API.io" vs. "The-Odds-API.com").
    * Input fields to securely store API Keys for each provider locally.
* **Bookmaker Selection:** Users can filter bookmakers based on their region (Focus: Australia, UK, Italy, Romania).
* **Sport Selection:** Initially focus on Soccer and Tennis, with extensibility for others.

### 4.2 Arbitrage Detection & Normalization
* **Production Mode (Odds-API.io):** Utilize the `/v3/arbitrage-bets` endpoint to fetch pre-calculated surebets.
* **Test/Dev Mode (The-Odds-API.com):** Fetch raw odds and utilize an internal calculation engine to identify price discrepancies (if the arbitrage endpoint is unavailable/costly) or normalize their specific arbitrage feed.
* **Data Normalization:** Regardless of the source, all data is converted into a single internal `ArbitrageOpportunity` model before reaching the UI.

### 4.3 User Interface (Dashboard)
* **Data Grid:** A sortable table displaying:
    * **Event:** Team A vs Team B (Start Time).
    * **Leg 1:** Bookmaker A | Market | Odds.
    * **Leg 2:** Bookmaker B | Market | Odds.
    * **ROI:** Profit margin percentage (highlighted).
* **Filtering:**
    * Hide low ROI opportunities (e.g., < 1%).
    * Filter by Market Type (2-way markets: Moneyline, Draw No Bet, Totals).
    * Sorting by ROI and other metrics.
* **Quick Actions:**
    * **Copy Details:** One-click button to copy the bet details to clipboard.
    

## 5. Technical Architecture

### 5.1 Technology Stack
* **Wrapper:** Electron (ensures cross-platform compatibility and easy "double-click" launch).
* **Frontend:** React.js (for a responsive, state-driven UI).
* **Backend Logic:** Node.js (running within the Electron Main Process).

### 5.2 The Adapter Pattern (Normalization Layer)
To ensure the "Same Experience" regardless of the API, the backend will implement an Adapter design pattern:

1.  **`IDataProvider` (Interface):** Defines the contract (e.g., `fetchArbs()`, `getSports()`).
2.  **`OddsApiIoAdapter`:** Implements `IDataProvider`. Maps `odds-api.io` JSON responses to the App's internal model.
3.  **`TheOddsApiComAdapter`:** Implements `IDataProvider`. Maps `the-odds-api.com` JSON responses to the App's internal model.
4.  **`ArbitrageService`:** The central controller that calls the active Adapter and passes normalized data to the React Frontend.

### 5.3 Data Flow
1.  **User** sets filters and clicks "Scan".
2.  **React** sends a request to **Electron Main Process**.
3.  **ArbitrageService** checks which Adapter is active.
4.  **Adapter** calls the external API (handling rate limits/headers).
5.  **Adapter** normalizes the response (renaming fields, calculating missing ROI if necessary).
6.  **Electron** sends the clean list to **React** for rendering.

## 6. Constraints & Risks
* **Rate Limits:** The app must strictly adhere to API rate limits to avoid key banning.
* **Data Latency:** Arbitrage windows are short (seconds to minutes). The UI must visually indicate if data is "stale."
* **Bookmaker Accounts:** Users face the risk of account limitation ("gubbing") by bookmakers; the app is a tool, not a guarantee against bookmaker terms of service.