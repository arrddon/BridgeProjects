import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bridges } from '../lib/bridge-config.ts';
import { completionKey, readCompletion, writeCompletion } from '../lib/completion-storage.ts';

test('all ten destinations resolve to their bridge and spot', () => {
  assert.equal(bridges.length, 2);
  const urls = new Set();
  for (const bridge of bridges) {
    assert.equal(bridge.spots.length, 5);
    for (const spot of bridge.spots) {
      assert.equal(spot.destination, `/${bridge.id}/${spot.id}`);
      assert.equal(spot.bridgeId, bridge.id);
      assert.ok(spot.position.x > 0 && spot.position.x < 1);
      assert.ok(spot.position.y > 0 && spot.position.y < 1);
      urls.add(spot.destination);
    }
  }
  assert.equal(urls.size, 10);
});

test('completion persists and never crosses bridges or spots', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readCompletion(storage, 'bridge-a', 'spot-01'), false);
  assert.equal(writeCompletion(storage, 'bridge-a', 'spot-01'), true);
  assert.equal(readCompletion(storage, 'bridge-a', 'spot-01'), true);
  assert.equal(readCompletion(storage, 'bridge-b', 'spot-01'), false);
  assert.equal(readCompletion(storage, 'bridge-a', 'spot-02'), false);
  assert.notEqual(completionKey('bridge-a', 'spot-01'), completionKey('bridge-b', 'spot-01'));
});

test('blocked or corrupt storage does not crash the experience', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.equal(readCompletion(blocked, 'a', 's'), false);
  assert.equal(writeCompletion(blocked, 'a', 's'), false);
  assert.equal(readCompletion({ getItem: () => '{corrupted}' }, 'a', 's'), false);
});
