'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readGoldenFixture(relativePath) {
  const fullPath = path.join(__dirname, '..', 'fixtures', 'arbitrage', relativePath);
  const text = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error(`Expected array of snapshots in ${relativePath}`);
  }

  return data;
}

function loadGoldenSnapshotsForOddsApiIo() {
  return readGoldenFixture('golden-odds-odds-api-io.json');
}

function loadGoldenSnapshotsForTheOddsApi() {
  return readGoldenFixture('golden-odds-the-odds-api.json');
}

function loadGoldenSnapshotsForNoSurebets() {
  return readGoldenFixture('golden-odds-no-surebets.json');
}

function loadGoldenSnapshotsForBtts() {
  return readGoldenFixture('golden-btts-arbs.json');
}

function loadGoldenSnapshotsForHandicap() {
  return readGoldenFixture('golden-handicap-arbs.json');
}

function buildOddsApiIoArbitrageBets() {
  const snapshots = loadGoldenSnapshotsForOddsApiIo();
  const { calculateTwoLegArbitrageRoi } = require('../../out-tests/src/main/services/calculator.js');

  return snapshots.map((snapshot) => {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);

    return {
      id: snapshot.id,
      sport: snapshot.sport,
      event: {
        name: snapshot.eventName,
        date: snapshot.eventDate,
        league: snapshot.league
      },
      legs: [
        {
          bookmaker: snapshot.homeBookmaker,
          market: snapshot.market,
          odds: snapshot.homeOdds,
          outcome: 'home'
        },
        {
          bookmaker: snapshot.awayBookmaker,
          market: snapshot.market,
          odds: snapshot.awayOdds,
          outcome: 'away'
        }
      ],
      roi
    };
  });
}

function buildTheOddsApiRawEvents() {
  const snapshots = loadGoldenSnapshotsForTheOddsApi();

  return snapshots.map((snapshot) => {
    const [homeTeam, awayTeam] = snapshot.eventName.split(' vs ');

    return {
      id: snapshot.id,
      sport_key: snapshot.sport,
      sport_title: snapshot.league,
      commence_time: snapshot.eventDate,
      home_team: homeTeam,
      away_team: awayTeam,
      bookmakers: [
        {
          key: snapshot.homeBookmaker,
          title: snapshot.homeBookmaker,
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: homeTeam, price: snapshot.homeOdds },
                { name: awayTeam, price: snapshot.awayOdds }
              ]
            }
          ]
        },
        {
          key: snapshot.awayBookmaker,
          title: snapshot.awayBookmaker,
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: homeTeam, price: snapshot.homeOdds },
                { name: awayTeam, price: snapshot.awayOdds }
              ]
            }
          ]
        }
      ]
    };
  });
}

function buildBttsOpportunities() {
  const snapshots = loadGoldenSnapshotsForBtts();
  const { calculateTwoLegArbitrageRoi } = require('../../out-tests/src/main/services/calculator.js');

  return snapshots.map((snapshot) => {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);

    return {
      id: snapshot.id,
      sport: snapshot.sport,
      event: {
        name: snapshot.eventName,
        date: snapshot.eventDate,
        league: snapshot.league
      },
      legs: [
        {
          bookmaker: snapshot.homeBookmaker,
          market: snapshot.market,
          odds: snapshot.homeOdds,
          outcome: 'yes'
        },
        {
          bookmaker: snapshot.awayBookmaker,
          market: snapshot.market,
          odds: snapshot.awayOdds,
          outcome: 'no'
        }
      ],
      roi
    };
  });
}

function buildHandicapOpportunities() {
  const snapshots = loadGoldenSnapshotsForHandicap();
  const { calculateTwoLegArbitrageRoi } = require('../../out-tests/src/main/services/calculator.js');

  return snapshots.map((snapshot) => {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);

    return {
      id: snapshot.id,
      sport: snapshot.sport,
      event: {
        name: snapshot.eventName,
        date: snapshot.eventDate,
        league: snapshot.league
      },
      legs: [
        {
          bookmaker: snapshot.homeBookmaker,
          market: snapshot.market,
          odds: snapshot.homeOdds,
          outcome: 'home'
        },
        {
          bookmaker: snapshot.awayBookmaker,
          market: snapshot.market,
          odds: snapshot.awayOdds,
          outcome: 'away'
        }
      ],
      roi
    };
  });
}

module.exports = {
  readGoldenFixture,
  loadGoldenSnapshotsForOddsApiIo,
  loadGoldenSnapshotsForTheOddsApi,
  loadGoldenSnapshotsForNoSurebets,
  loadGoldenSnapshotsForBtts,
  loadGoldenSnapshotsForHandicap,
  buildOddsApiIoArbitrageBets,
  buildTheOddsApiRawEvents,
  buildBttsOpportunities,
  buildHandicapOpportunities
};
