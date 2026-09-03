import { cp, mkdir } from 'node:fs/promises';
await mkdir('public/vendor/8thwall', { recursive: true });
await cp('node_modules/@8thwall/engine-binary/dist', 'public/vendor/8thwall', { recursive: true });
await mkdir('public/assets/content', { recursive: true });
for (const file of ['A01_model.glb', 'A01_audio.wav', 'A02.mp4']) {
  await cp(`Assets/Assets_AB/${file}`, `public/assets/content/${file}`);
}
console.log('Local XR engine and A01/A02 assets prepared.');
