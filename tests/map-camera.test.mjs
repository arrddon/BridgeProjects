import { test } from 'node:test';
import assert from 'node:assert/strict';
import { constrainCamera } from '../lib/map-camera.ts';

test('zoom and pan always keep all viewport corners inside the rotated image', () => {
  for (const [width, height] of [[390,844], [320,568], [1440,900], [844,390]]) {
    for (const angle of [0, -75 * Math.PI / 180, -55 * Math.PI / 180]) {
      for (const zoom of [.1, 1, 1.3, 2.6, 9]) {
        for (const [x,y] of [[-9999,-9999], [512,768], [9999,9999]]) {
          const camera = constrainCamera({ zoom, x, y }, { width, height, imageWidth: 1023, imageHeight: 1537, angle });
          assert.ok(camera.zoom >= 1 && camera.zoom <= 2.6);
          for (const dx of [-width/2, width/2]) for (const dy of [-height/2, height/2]) {
            const px = camera.x + (dx * camera.c + dy * camera.s) / camera.scale;
            const py = camera.y + (-dx * camera.s + dy * camera.c) / camera.scale;
            assert.ok(px >= -1e-8 && px <= 1023 + 1e-8);
            assert.ok(py >= -1e-8 && py <= 1537 + 1e-8);
          }
        }
      }
    }
  }
});
