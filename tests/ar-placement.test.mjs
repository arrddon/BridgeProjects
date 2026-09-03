import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { forwardPlacement, initialARScale, pinchARScale } from '../lib/ar-placement.ts';

test('initial placement stays ahead at ground height, independent of camera pitch', () => {
  const camera = new THREE.PerspectiveCamera(60, .5, .01, 100);
  camera.position.set(3, 1.5, 4);
  camera.lookAt(3, 0, 1);
  const anchor = forwardPlacement(camera, 0);
  assert.ok(anchor);
  assert.ok(Math.abs(anchor.x - 3) < 1e-8);
  assert.ok(Math.abs(anchor.z - 1.8) < 1e-8);
  assert.equal(anchor.y, 0);
  camera.lookAt(3, -10, 4);
  assert.equal(forwardPlacement(camera, 0), null);
});

test('different camera fields of view receive the same initial projected size', () => {
  for (const fov of [40, 60, 85]) {
    for (const aspect of [.46, .75, 1.6]) {
      const camera = new THREE.PerspectiveCamera(fov, aspect, .01, 100);
      const anchor = new THREE.Vector3(0, 0, -2.2);
      const scale = initialARScale(camera, anchor, .8);
      const fraction = .8 * scale * Math.max(camera.projectionMatrix.elements[0], camera.projectionMatrix.elements[5]) / (2 * 2.2);
      assert.ok(Math.abs(fraction - .55) < 1e-8);
    }
  }
});

test('AR pinch scales proportionally and remains within usable bounds', () => {
  assert.equal(pinchARScale(2, 2, 100, 150), 3);
  assert.equal(pinchARScale(2, 2, 100, 0), .6);
  assert.equal(pinchARScale(2, 2, 100, 10000), 7);
});
