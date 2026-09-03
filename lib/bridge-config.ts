export type Spot = {
  id: string; bridgeId: string; title: string; description: string;
  pinId: string; assetType: '3d' | 'video';
  sourceAssets: { model: string | null; audio: string | null; video: string | null };
  contentDurationSeconds: number | null;
  position: { x: number; y: number };
  destination: string; modelPath: string | null; audioPath: string | null; videoPath: string | null;
  modelSizeMeters: number; videoWidthMeters: number;
  scale: number; rotation: [number, number, number];
};
export type Bridge = { id: string; title: string; mapPath: string; mapWidth: number; mapHeight: number; mapFocusY: number; landscapeAngle: number; spots: Spot[] };
// Normalized image coordinates (0–1). Positions remain provisional.
const positions = [{ x: .275, y: .235 }, { x: .40, y: .31 }, { x: .52, y: .38 }, { x: .65, y: .455 }, { x: .775, y: .53 }];
const albertPositions = [{ x: .405, y: .25 }, { x: .465, y: .375 }, { x: .525, y: .50 }, { x: .585, y: .625 }, { x: .645, y: .75 }];
const content: Record<string, { title: string; description: string }[]> = {
  AlbertBridge: [
    { title: 'The Damaged Rocker', description: 'Explore the damaged rocker located at the north-east corner of Albert Bridge through a detailed 3D model.' },
    { title: 'The Crack', description: 'Discover the story behind the crack and the structural damage found within Albert Bridge.' },
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
  assetType: i === 0 || i === 2 ? '3d' as const : 'video' as const,
  // Albert A03 reuses A01; A04/A05 reuse A02 as temporary content.
  // Keep each pin, route, position and completion record independent.
  sourceAssets: {
    model: bridge.id === 'AlbertBridge' && (i === 0 || i === 2) ? 'Assets/Assets_AB/A01_model.glb' : null,
    audio: bridge.id === 'AlbertBridge' ? 'Assets/Assets_AB/A01_audio.wav' : null,
    video: bridge.id === 'AlbertBridge' && (i === 1 || i === 3 || i === 4) ? 'Assets/Assets_AB/A02.mp4' : null,
  },
  contentDurationSeconds: bridge.id === 'AlbertBridge' ? (i === 0 || i === 2 ? 70.36 : 26.28) : null,
  title: content[bridge.id]?.[bridge.id === 'AlbertBridge' ? (i === 0 || i === 2 ? 0 : 1) : i]?.title ?? `Point ${String(i + 1).padStart(2, '0')}`,
  description: content[bridge.id]?.[bridge.id === 'AlbertBridge' ? (i === 0 || i === 2 ? 0 : 1) : i]?.description ?? '', position,
  destination: `/${bridge.id}/spot-${String(i + 1).padStart(2, '0')}`,
  modelPath: bridge.id === 'AlbertBridge' && (i === 0 || i === 2) ? '/assets/content/A01_model.glb' : null,
  audioPath: bridge.id === 'AlbertBridge' ? '/assets/content/A01_audio.wav' : null,
  videoPath: bridge.id === 'AlbertBridge' && (i === 1 || i === 3 || i === 4) ? '/assets/content/A02.mp4' : null,
  modelSizeMeters: .8, videoWidthMeters: 1.2,
  scale: 1, rotation: [0, 0, 0] as [number, number, number],
})) }));
