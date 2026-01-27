# react-ts

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## Odds-API.io bookmakers (free plan)

Odds-API.io free plans include access to 2 bookmakers. The provider selects bookmakers automatically once you start making requests, but you can choose them manually (and swap them later).

- In-app: `Settings → Provider Configuration → Odds-API.io` then use the “Odds-API.io bookmaker selection” panel to view/add/clear your selected bookmakers.
- API (direct):

```bash
# List supported bookmakers
curl -X GET "https://api.odds-api.io/v3/bookmakers"

# Add bookmakers to your account selection
curl -X PUT "https://api.odds-api.io/v3/bookmakers/selected/select?apiKey=$ODDS_API_IO_API_KEY&bookmakers=Bet365,SingBet"

# Clear your account selection (Odds-API.io limits this to once every 12 hours)
curl -X PUT "https://api.odds-api.io/v3/bookmakers/selected/clear?apiKey=$ODDS_API_IO_API_KEY"
```
