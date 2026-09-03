// Only completed real AR playback is stored here. Phase 1/preview records are separate.
const prefix = 'between-bridges:ar:v1:';
export const completionKey = (bridgeId: string, spotId: string) => `${prefix}${bridgeId}:${spotId}`;
export function readCompletion(storage: Pick<Storage, 'getItem'>, bridgeId: string, spotId: string) {
  try { return storage.getItem(completionKey(bridgeId, spotId)) === 'completed'; }
  catch { return false; }
}
export function writeCompletion(storage: Pick<Storage, 'setItem'>, bridgeId: string, spotId: string) {
  try { storage.setItem(completionKey(bridgeId, spotId), 'completed'); return true; }
  catch { return false; }
}
