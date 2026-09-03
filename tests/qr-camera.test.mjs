import test from 'node:test';
import assert from 'node:assert/strict';
import { preferredQRcamera } from '../lib/qr-camera.ts';
const cameras = labels => labels.map((label, i) => ({ label, kind: 'videoinput', deviceId: String(i) }));
test('QR prefers physical wide rear camera over ultra-wide and virtual lenses', () => {
  assert.equal(preferredQRcamera(cameras(['Back Ultra Wide Camera', 'Back Triple Camera', 'Back Wide Camera', 'Front Camera']), '0'), '2');
  assert.equal(preferredQRcamera(cameras(['후면 초광각 카메라', '후면 광각 카메라', '후면 망원 카메라'])), '1');
});
test('QR does not guess lens types from opaque labels or ordering', () => {
  assert.equal(preferredQRcamera(cameras(['camera 0', 'camera 1', ''])), undefined);
  assert.equal(preferredQRcamera(cameras(['Back Ultra Wide Camera', 'Front Camera'])), undefined);
});
test('QR retains current rear camera when multiple generic rear labels tie', () => {
  assert.equal(preferredQRcamera(cameras(['Back Camera', 'Rear Camera']), '1'), '1');
});
