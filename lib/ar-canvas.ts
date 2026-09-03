// XR8 reads the drawing buffer dimensions and updates both the camera texture
// viewport and Three.js renderer on its next frame. Do not resize its renderer
// independently using CSS pixels: those are smaller on Retina displays.
export function resizeARCanvas(canvas: Pick<HTMLCanvasElement, 'clientWidth' | 'clientHeight' | 'width' | 'height'>, pixelRatio: number) {
  if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
  const ratio = Math.min(Math.max(pixelRatio, 1), 2);
  const width = Math.round(canvas.clientWidth * ratio);
  const height = Math.round(canvas.clientHeight * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}
