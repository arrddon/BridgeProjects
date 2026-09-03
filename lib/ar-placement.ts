import * as THREE from 'three';

export function forwardPlacement(camera: THREE.PerspectiveCamera, groundY: number, distance = 2.2) {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  forward.y = 0;
  // Looking straight down has no stable forward heading: wait for a slight tilt.
  if (forward.lengthSq() < .04) return null;
  return camera.getWorldPosition(new THREE.Vector3()).add(forward.normalize().multiplyScalar(distance)).setY(groundY);
}

export function initialARScale(camera: THREE.PerspectiveCamera, anchor: THREE.Vector3, diameter: number) {
  camera.updateMatrixWorld();
  const depth = Math.max(.1, -anchor.clone().applyMatrix4(camera.matrixWorldInverse).z);
  const projection = camera.projectionMatrix.elements;
  const visibleSpan = Math.min(2 * depth / Math.abs(projection[0]), 2 * depth / Math.abs(projection[5]));
  // Normalize once at placement, then keep the object anchored in world space.
  return .55 * visibleSpan / Math.max(diameter, .001);
}

export function pinchARScale(initial: number, startScale: number, startDistance: number, distance: number) {
  return THREE.MathUtils.clamp(startScale * distance / Math.max(startDistance, 1), initial * .3, initial * 3.5);
}
