import test from 'node:test';
import assert from 'node:assert/strict';
import { excludeDrivers, isExcludedDriverName, isExcludedDriverRecord } from '../tools/exclude-drivers.mjs';

test('excluded driver aliases and stable ID are recognized', () => {
  for (const name of ['Matthew Brown', 'Matthew Brown49', 'Brown49, Matthew', 'matthewbrown']) {
    assert.equal(isExcludedDriverName(name), true, name);
  }
  assert.equal(isExcludedDriverRecord({ driverId: '116507', driver: 'Unformatted Driver' }), true);
  assert.equal(isExcludedDriverRecord({ id: '116507', name: 'Matthew Brown49' }), true);
  assert.equal(isExcludedDriverName('Matthew Graham20'), false);
});

test('exclusion removes rankings, results, team rosters, hosted data and old reports', () => {
  const snapshot = {
    leagues: {
      sunday: {
        drivers: [
          { driverId: '116507', driver: 'Brown49, Matthew', rank: 5 },
          { driverId: '42', driver: 'Matthew Graham20', rank: 6 }
        ],
        results: [
          { driverId: '116507', driver: 'Matthew Brown49', position: 2 },
          { driverId: '42', driver: 'Matthew Graham20', position: 3 }
        ],
        teamRosters: { TWM: [{ driver: 'Brown49, Matthew' }, { driver: 'Other Driver' }] }
      }
    },
    hosted: { sessions: [{ driver: 'Matthew Brown49' }, { driver: 'Other Driver' }],
      driverRatings: { matthewbrown: { driver: 'Matthew Brown49' }, otherdriver: { driver: 'Other Driver' } } },
    reports: [{ top10: [{ name: 'Matthew Brown49', id: '116507' }, { name: 'Other Driver' }],
      raceIntelligence: { fastestLap: { driverId: '116507', driver: 'Matthew Brown49' } } }]
  };
  const filtered = excludeDrivers(snapshot);
  assert.equal(filtered.leagues.sunday.drivers.length, 1);
  assert.equal(filtered.leagues.sunday.drivers[0].driver, 'Matthew Graham20');
  assert.equal(filtered.leagues.sunday.results.length, 1);
  assert.deepEqual(filtered.leagues.sunday.teamRosters.TWM, [{ driver: 'Other Driver' }]);
  assert.equal(filtered.hosted.sessions.length, 1);
  assert.equal(filtered.hosted.driverRatings.matthewbrown, undefined);
  assert.deepEqual(filtered.reports[0].top10, [{ name: 'Other Driver' }]);
  assert.equal(filtered.reports[0].raceIntelligence.fastestLap, undefined);
});
