export type Camera = { zoom: number; x: number; y: number };
export type MapGeometry = { width: number; height: number; imageWidth: number; imageHeight: number; angle: number };
export function constrainCamera(view: Camera, geometry: MapGeometry) {
  const { width, height, imageWidth, imageHeight, angle } = geometry;
  const c = Math.cos(angle), s = Math.sin(angle);
  const projectedWidth = width * Math.abs(c) + height * Math.abs(s);
  const projectedHeight = width * Math.abs(s) + height * Math.abs(c);
  const zoom = Math.max(1, Math.min(2.6, view.zoom));
  const scale = Math.max(projectedWidth / imageWidth, projectedHeight / imageHeight) * zoom * 1.015;
  const halfX = projectedWidth / (2 * scale), halfY = projectedHeight / (2 * scale);
  return { zoom, x: Math.max(halfX, Math.min(imageWidth - halfX, view.x)), y: Math.max(halfY, Math.min(imageHeight - halfY, view.y)), scale, c, s };
}
