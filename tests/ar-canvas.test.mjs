import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeARCanvas } from '../lib/ar-canvas.ts';

test('Retina AR buffer follows the viewport through iPad rotation and split view', () => {
  const canvas = { clientWidth: 820, clientHeight: 1180, width: 300, height: 150 };
  for (const [width, height] of [[820, 1180], [1180, 820], [590, 820]]) {
    canvas.clientWidth = width;
    canvas.clientHeight = height;
    resizeARCanvas(canvas, 2);
    assert.equal(canvas.width, width * 2);
    assert.equal(canvas.height, height * 2);
    assert.equal(canvas.width / canvas.height, width / height);
  }
});

test('unchanged or hidden viewport does not reset the WebGL buffer', () => {
  const canvas = {
    clientWidth: 820, clientHeight: 1180,
    get width() { return 1640; },
    set width(_) { assert.fail('unexpected buffer reset'); },
    get height() { return 2360; },
    set height(_) { assert.fail('unexpected buffer reset'); },
  };
  resizeARCanvas(canvas, 2);
  canvas.clientWidth = 0;
  resizeARCanvas(canvas, 2);
});

test('standard and high density displays retain the existing resolution cap', () => {
  for (const ratio of [1, 1.5, 2, 3]) {
    const canvas = { clientWidth: 390, clientHeight: 844, width: 0, height: 0 };
    resizeARCanvas(canvas, ratio);
    assert.equal(canvas.width, Math.round(390 * Math.min(ratio, 2)));
    assert.equal(canvas.height, Math.round(844 * Math.min(ratio, 2)));
  }
});
