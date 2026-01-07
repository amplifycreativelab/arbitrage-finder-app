# Arbitrage Finder App - UX Design Specification

**Project:** Arbitrage Finder App (Signal Generator)
**Type:** Windows 11 Desktop Application (Electron)
**Date:** November 20, 2025
**Status:** Ready for Architecture/Development

---

## 1. Executive Summary

The Arbitrage Finder App is a high-frequency "Signal Generator" designed for efficiency-focused bettors. Unlike traditional betting tools that encourage browsing, this application acts as a command center to monitor, verify, and instantaneously **copy** arbitrage opportunities as formatted text payloads for Telegram channels.

**Core Philosophy:** "Utility over Beauty." The interface prioritizes data density, scan speed, and keyboard-only execution.

---

## 2. Core User Experience

### 2.1 Defining Experience: "The Rapid-Fire Signal Hunt"
The user does not "browse" bets; they **process** them. The core loop is a linear, keyboard-driven workflow designed to minimize the time between spotting an opportunity and broadcasting it.

### 2.2 Key Principles
* **Speed:** Instant recognition of "Side A vs Side B" signals.
* **Clarity:** Data > Chrome. No decorative elements; only Odds, Teams, and ROI matter.
* **Zero Friction:** No mouse required. The "Copy" action is the primary interaction.
* **Trust:** Visual indicators for data freshness are mandatory to prevent sending "stale" signals.

---

## 3. Visual Foundation

### 3.1 Design System
**System:** **shadcn/ui**
* **Rationale:** Provides a modern, lightweight, and highly customizable foundation using Tailwind CSS. Allows for the creation of high-density data lists without the bloat of enterprise frameworks like Ant Design.

### 3.2 Color Theme: "The Orange Terminal"
A high-contrast Dark Mode theme designed for alertness and readability.
* **Background:** Deep Charcoal / Near Black (`#0F172A`).
* **Primary Accent:** **Vibrant Orange** (`#F97316`). Used exclusively for "Value" (ROI) and "Action" (Copy).
* **Text:** Off-White (`#F8FAFC`) for reduced eye strain.
* **Staleness Indicator:** Muted Slate Grey (`#64748B`).

---

## 4. Design Direction & Layout

### 4.1 Layout Strategy: "The Hybrid Dashboard"
A split-pane interface optimized for scanning and verification.
* **Window constraints:** Minimum width **900px**. Optimized for Windows 11 Snap Layouts.

#### Left Pane (The Feed) - Fixed Width (~400px)
* A vertical, sortable list of opportunities.
* **Row Content:**
    * **Status:** Copied Indicator (Green `✓`) or Empty.
    * **Header:** Time + Event Name.
    * **Value:** ROI % (Bold Orange).
* **Staleness Logic:** If `timestamp > 5 mins`, the row opacity drops to 50% (Visual Decay).

#### Right Pane (The Signal Preview) - Fluid Width
* A static "Staging Area" showing exactly what will be sent to Telegram.
* **Content:** A large `Card` containing the formatted text payload.
* **Typography:** Monospace font to ensure alignment matches the destination platform.

---

## 5. Interaction Model

### 5.1 Keyboard-Centric Workflow
The app is designed to be used 100% without a mouse.

| Key | Action | Logic |
| :--- | :--- | :--- |
| **Arrow Up/Down** | Navigate List | Instantly updates Right Pane preview. |
| **Enter** | **Copy & Advance** | 1. Copies Right Pane text to Clipboard.<br>2. Flashes "Copied!" success state.<br>3. Marks row as "Processed".<br>4. **Automatically moves selection to next row.** |
| **Esc** | Reset Focus | Returns focus to the top of the list or clears filters. |

### 5.2 Feedback Patterns
* **Success:** Upon copying, the large "Copy" button briefly turns **Green** with text "COPIED", then reverts to Orange.
* **History:** Processed rows are not removed (to maintain context) but are dimmed and marked with a checkmark to prevent duplicate sending.
* **Empty State:** "Scanning markets..." with a subtle pulse animation when no arbs are found.

---

## 6. Component Strategy (shadcn/ui)

### 6.1 Master List (Left Pane)
* **Component:** `ScrollArea` + `Table`.
* **State Handling:** Requires `data-state="selected"` styling for the active keyboard focus row.

### 6.2 Signal Preview (Right Pane)
* **Component:** `Card` + `Pre/Code` block.
* **Formatting Standard:**
    ```text
    Bet365 (Full)
    Calcio 21/11
    21:00 Preston – Blackburn
    England Championship Rigori: Sì
    4.50
    ○
    Staryes (IT)
    Calcio 21/11
    21:00 Preston – Blackburn
    Inghilterra - Championship Rigori: No
    1.32
    ```

### 6.3 Action Button
* **Component:** `Button` (Size: `lg`, Width: `full`).
* **Label:** "COPY SIGNAL [Enter]".

---

## 7. Implementation Notes
* **No Browser Integration:** The app strictly generates text. No deep links to bookmakers are required in the primary view.
* **Local Logic:** The "Staleness" check must run locally on a timer (e.g., every 30s) to update row opacity without re-fetching API data.