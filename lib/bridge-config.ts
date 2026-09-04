export type Spot = {
  id: string; bridgeId: string; title: string; description: string;
  pinId: string; assetType: '3d' | 'video' | 'image';
  sourceAssets: { model: string | null; audio: string | null; video: string | null; image: string | null };
  contentDurationSeconds: number | null;
  position: { x: number; y: number };
  destination: string; modelPath: string | null; audioPath: string | null; videoPath: string | null; imagePath: string | null;
  modelSizeMeters: number; videoWidthMeters: number;
  scale: number; rotation: [number, number, number];
};
export type Bridge = { id: string; title: string; mapPath: string; mapWidth: number; mapHeight: number; mapFocusY: number; landscapeAngle: number; spots: Spot[] };
// Normalized image coordinates (0–1). Positions remain provisional.
const positions = [{ x: .275, y: .235 }, { x: .40, y: .31 }, { x: .52, y: .38 }, { x: .65, y: .455 }, { x: .775, y: .53 }];
const albertPositions = [{ x: .405, y: .25 }, { x: .465, y: .375 }, { x: .525, y: .50 }, { x: .585, y: .625 }, { x: .645, y: .75 }];
const content: Record<string, { title: string; description: string }[]> = {
  AlbertBridge: [
    { title: 'The Damaged Rocker', description: '(A01 description text)' },
    { title: 'Bazalgette', description: '(A02 description text)' },
    { title: 'Timber and Ashphalt', description: '(A03 description text)' },
    { title: 'Stop Marching Sign', description: '(A04 description text)' },
    { title: 'Lights on the Bridge', description: '(A05 description text)' },
  ],
  HammersmithBridge: [
    { title: 'The Pedestal Crack', description: 'Examine the cracks identified around the bridge pedestal through inspection imagery taken from the structure.' },
    // The supplied table ends at “restoring”; retain its supplied wording.
    { title: 'The Engineering Challenge', description: 'Explore how the damaged pedestal and surrounding bridge structure became part of the wider engineering challenge of restoring' },
  ],
};
export const bridges: Bridge[] = [
  { id: 'AlbertBridge', title: 'Albert Bridge', mapPath: '/Assets/Maps/map_AB_v3.png', mapWidth: 941, mapHeight: 1672, mapFocusY: .5, landscapeAngle: 0 },
  { id: 'HammersmithBridge', title: 'Hammersmith Bridge', mapPath: '/Assets/Maps/map_HB_v3.png', mapWidth: 941, mapHeight: 1672, mapFocusY: .5, landscapeAngle: 0 },
].map(bridge => ({ ...bridge, spots: (bridge.id === 'AlbertBridge' ? albertPositions : positions).map((position, i) => ({
  id: `spot-${String(i + 1).padStart(2, '0')}`, bridgeId: bridge.id,
  pinId: `${bridge.id === 'AlbertBridge' ? 'A' : 'H'}${String(i + 1).padStart(2, '0')}`,
  assetType: (i === 0 || i === 2 ? '3d' : i === 1 ? 'video' : 'image') as Spot['assetType'],
  sourceAssets: {
    model: null,
    audio: null,
    video: null,
    image: null,
  },
  contentDurationSeconds: null,
  title: content[bridge.id]?.[i]?.title ?? `Point ${String(i + 1).padStart(2, '0')}`,
  description: content[bridge.id]?.[i]?.description ?? '', position,
  destination: `/${bridge.id}/spot-${String(i + 1).padStart(2, '0')}`,
  modelPath: bridge.id === 'AlbertBridge' ? [
    'https://res.cloudinary.com/douz9wtb2/image/upload/v1788518406/A01_model_edited_fp20pa.glb', null,
    'https://res.cloudinary.com/douz9wtb2/image/upload/v1788516011/A03_model_dlwovo.glb', null, null,
  ][i] : null,
  audioPath: bridge.id === 'AlbertBridge' ? [
    'https://res.cloudinary.com/douz9wtb2/video/upload/v1788516562/A01_audio_normalized_cuby8v.mp3', null,
    'https://res.cloudinary.com/douz9wtb2/video/upload/v1788516558/A03_audio_normalized_fglgg5.mp3',
    'https://res.cloudinary.com/douz9wtb2/video/upload/v1788516561/A04_audio_normalized_c8xjrc.mp3',
    'https://res.cloudinary.com/douz9wtb2/video/upload/v1788516561/A05_audio_normalized_j4utxo.mp3',
  ][i] : null,
  videoPath: bridge.id === 'AlbertBridge' && i === 1 ? 'https://res.cloudinary.com/douz9wtb2/video/upload/v1788516032/A02_u2pcbc.mp4' : null,
  imagePath: bridge.id === 'AlbertBridge' ? [null, null, null,
    'https://res.cloudinary.com/douz9wtb2/image/upload/v1788516012/A04_image_hxkco3.jpg',
    'https://res.cloudinary.com/douz9wtb2/image/upload/v1788516004/A05_image_xorlon.jpg',
  ][i] : null,
  modelSizeMeters: .8, videoWidthMeters: 1.2,
  scale: 1, rotation: [0, 0, 0] as [number, number, number],
})) }));
