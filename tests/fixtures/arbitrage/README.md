Golden arbitrage fixtures (Story 2.6)
====================================

This directory contains small, reviewable JSON snapshots used as the golden
dataset for arbitrage correctness tests (risk R-002).

- `golden-odds-odds-api-io.json` — Odds-API.io pre-calculated arbitrage snapshot
  for a simple tennis moneyline market with known positive ROI.
- `golden-odds-the-odds-api.json` — The-Odds-API.com raw-odds style snapshot for
  a soccer match where local arbitrage exists between two bookmakers.
- `golden-odds-no-surebets.json` — Control snapshot with balanced odds that
  should never produce a surebet (expected result: zero opportunities).

All fixtures are consumed by a pure calculator entry point that uses
`calculateTwoLegArbitrageRoi` and the canonical `ArbitrageOpportunity` model.

