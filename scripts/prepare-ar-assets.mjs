import { cp, mkdir } from 'node:fs/promises';
await mkdir('public/vendor/8thwall', { recursive: true });
await cp('node_modules/@8thwall/engine-binary/dist', 'public/vendor/8thwall', { recursive: true, force: false });
console.log('Local XR engine prepared. Bridge content is delivered by Cloudinary.');
