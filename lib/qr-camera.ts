type CameraDevice = Pick<MediaDeviceInfo, 'deviceId' | 'kind' | 'label'>;

// Lens types have no standard browser field. Only switch when a labelled
// physical rear camera can be identified; never guess from device order.
export function preferredQRcamera(devices: CameraDevice[], currentId?: string) {
  const candidates = devices.filter(device => device.kind === 'videoinput' && device.deviceId
    && /back|rear|environment|후면|뒤쪽|arrière|rück/i.test(device.label)
    && !/front|user facing|전면|ultra|초광각|tele|망원|dual|triple|듀얼|트리플|depth|virtual/i.test(device.label));
  const score = (device: CameraDevice) => /wide|main|standard|광각|기본|일반/i.test(device.label) ? 2 : 1;
  candidates.sort((a, b) => score(b) - score(a) || Number(b.deviceId === currentId) - Number(a.deviceId === currentId));
  return candidates[0]?.deviceId;
}
