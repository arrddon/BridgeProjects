# Between Bridges — Phase 2

React + TypeScript + Vite/Vinext 기반의 모바일 AR 프로토타입입니다. 이 저장소는 현재 로컬 프로젝트의 소스와 콘텐츠를 포함합니다.

## 실행

Node.js 22 LTS. VS Code 터미널:

```powershell
npm.cmd install
npm.cmd run dev
```

- `http://localhost:5173/AlbertBridge`
- `http://localhost:5173/HammersmithBridge`
- `/`는 Albert Bridge로 이동합니다. 이전 `/bridge-a`, `/bridge-b`는 새 경로로 리다이렉트합니다.
- VS Code의 Terminal → Run Task → Start local prototype으로 실행할 수도 있습니다.
- Live Server 대신 이 개발 서버를 사용합니다. 종료는 Ctrl+C입니다.

`predev`와 `prebuild`에서 공식 8th Wall 바이너리 원본과 콘텐츠를 `public/`에 복사합니다. 생성된 파일은 Git 제외 대상이며, 원본은 `node_modules/@8thwall/engine-binary/dist`와 `Assets/Assets_AB`입니다.

## AR과 콘텐츠 미리보기

1. 포인트 → Enter AR → Start AR.
2. 카메라 권한을 허용하고 바닥을 향해 천천히 움직입니다.
3. SLAM이 정상 추적 중일 때 화면 하단의 특징점 hit test로 낮은 표면 위치를 추정해 자동 배치합니다. 물리적인 바닥 평면을 확정하는 방식이 아니므로 실기기에서 배치 높이를 검증해야 합니다.
4. 콘텐츠를 한 손가락/마우스로 드래그해 같은 수평면에서 위치를 변경합니다. 크기·회전 변경 제스처는 없습니다.
5. Play → 실제 오디오/영상 끝까지 재생 → Replay 또는 Map.

**A02 영상은 Three.js VideoTexture를 적용한 AR 장면 안의 수직 평면입니다.** 화면을 덮는 HTML 영상 플레이어가 아닙니다. 영상 비율은 16:9이고, 평면 하단을 배치 지점에 맞춥니다. 위치만 이동할 수 있습니다.

A01은 정적 GLB입니다. 내장 애니메이션이 없으므로 임의의 움직임을 추가하지 않고 70.36초 오디오를 재생합니다. 미래 GLB에 애니메이션이 있으면 미디어 시간을 기준으로 갱신하는 구조입니다.

**Preview content**는 카메라 없는 3D 장면에서 동일 모델/영상·오디오를 확인합니다. 위치와 거리를 고정한 채 드래그로 주변을 회전해서 볼 수 있습니다. 이 모드에서는 완료 기록을 저장하지 않습니다. 미리보기는 실제 SLAM 검증을 대신하지 않습니다.

현재 검증: TypeScript·빌드·기존 테스트, A02 1280×720/26.28초 메타데이터와 3D 평면 로딩 확인. 브라우저 도구 연결이 끊겨 전체 재생/Replay 자동 검증은 완료하지 못했습니다. 휴대폰 카메라·바닥 배치·추적 안정성·이동·재진입·전체 재생은 실기기 확인이 남아 있습니다.

## 휴대폰과 HTTPS

```powershell
npm.cmd run dev -- --hostname 0.0.0.0
```

동일 Wi-Fi에서 PC IPv4 주소와 출력된 포트로 지도와 콘텐츠 프리뷰를 확인할 수 있습니다. AR과 인앱 QR 스캐너는 HTTPS가 필요합니다. 그러나 **휴대폰의 `http://PC-IP`는 AR 카메라를 사용할 수 있는 보안 컨텍스트가 아닙니다.** 휴대폰 AR 테스트에는 신뢰할 수 있는 HTTPS 주소가 필요합니다. 이 작업에서는 터널 생성, 인증서 설치, 외부 공개를 하지 않았습니다.

QR은 현재 origin + `/AlbertBridge/spot-01` 같은 경로입니다. localhost QR은 휴대폰에서 PC를 가리키지 않습니다. 인앱 SCAN QR은 등록된 Spot 경로만 현재 origin에서 열며, 종료 시 카메라를 해제합니다.

## 파일과 콘텐츠

| Pin | 제목 | 유형 | 원본 | 시간 |
| --- | --- | --- | --- | --- |
| A01 | The Damaged Rocker | 3D + audio | `Assets/Assets_AB/A01_model.glb`, `A01_audio.wav` | 70.36초 |
| A02 | The Crack | AR video | `Assets/Assets_AB/A02.mp4` | 26.28초 |
| A03 | The Damaged Rocker | 3D + audio | A01 재사용 (더미) | 70.36초 |
| A04, A05 | The Crack | AR video | A02 재사용 (더미) | 26.28초 |
| H01 | The Pedestal Crack | 3D | 미제공 | 미정 |
| H02 | The Engineering Challenge | AR video | 미제공 | 미정 |
| H03 | 미정 | 3D | 미제공 | 미정 |
| H04, H05 | 미정 | AR video | 미제공 | 미정 |

H02 설명은 제공 표에서 `restoring`으로 끝나는 원문을 그대로 유지했습니다. 없는 콘텐츠는 재생한 것처럼 처리하지 않고 미제공 안내를 표시합니다.

- `lib/bridge-config.ts`: 제목·설명·Pin ID·콘텐츠 유형·경로·고정 크기/회전.
- `components/ar-experience.tsx`: 진입·로딩·권한·배치·재생·완료·오류 UI.
- `lib/ar-session.ts`: 모델/영상 평면, 추적, 위치 이동, 미디어 timeline, 해제.
- `lib/xr-engine.ts`: 공식 로컬 엔진 로딩. 모델·지도는 엔진 로드와 분리됩니다.
- `scripts/prepare-ar-assets.mjs`: 엔진/미디어 원본 복사.
- `lib/completion-storage.ts`: `between-bridges:ar:v1:`의 실제 AR 완료 기록. Phase 1 테스트 기록과 분리됩니다.

A01 모델은 중심과 바닥을 정렬한 뒤 최대 치수를 설정값 0.8로 정규화합니다. A02 평면 폭 기본값은 1.2입니다. SLAM responsive 좌표계이므로 정확한 실제 미터 크기는 실기기에서 확인/조정하세요.

## 지도와 디자인

Albert Bridge는 `Assets/Maps/map_AB_v3.png`, Hammersmith Bridge는 `Assets/Maps/map_HB_v3.png`를 직접 import합니다. 두 이미지 모두 941×1672입니다. 원본 교체는 개발 서버에 반영됩니다. 포인트 정규화 좌표는 설정에서 관리하며 아직 임시 위치입니다. 지도는 회전하지 않으며 최대 4:5 영역을 넘는 화면에는 좌우 여백을 표시합니다.

한 손가락 또는 마우스 드래그로 이동하고, 휠 또는 두 손가락 핀치로 확대/축소합니다. 경계 밖의 빈 공간이 드러나지 않도록 제한합니다. 문자 선택과 이미지 기본 드래그는 막습니다. 포인트 선택 시 850ms 자동 확대/이동과 제목·설명·QR 카드를 표시합니다. OS/브라우저가 `prefers-reduced-motion: reduce`를 요청하면 애니메이션은 생략됩니다.

프리텐다드, 큰 제목/공통 UI 텍스트 두 단계, 평평한 원형 포인트, 흰색 글래스와 검은 글씨를 사용합니다.

## 검증 명령

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

실기기 체크: A01/A02 Start AR → 권한 허용/거부 → 바닥 감지 → 드래그 → Play → 끝까지 → Replay → Map의 완료 표시. 재생 중 Map/브라우저 Back 시 미디어와 카메라 종료, 미완료 기록 없음도 확인하세요.

## 엔진 출처 및 라이선스

공식 npm 패키지 `@8thwall/engine-binary@1.0.0`를 사용합니다. SLAM이 없는 MIT 엔진으로 대체하지 않았습니다. 공식 배포 파일을 수정하지 않고 원본 저작권 고지와 라이선스를 함께 제공합니다.

This product includes the XR Engine software developed by Niantic Spatial, Inc. Copyright © 2026 Niantic Spatial, Inc. All rights reserved. Distributed under the XR Engine License Agreement, including its warranty disclaimer. Local license: `/vendor/8thwall/LICENSE`.

- [8th Wall 엔진 설치](https://8thwall.org/docs/engine/overview)
- [공식 엔진 저장소와 라이선스](https://github.com/8thwall/engine)
- [엔진 배포/고지 안내](https://8thwall.org/docs/open-source)
- [hitTest API](https://8thwall.org/docs/api/engine/xrcontroller/hittest)
- [Three.js VideoTexture](https://threejs.org/docs/pages/VideoTexture.html)

다음 단계는 휴대폰 HTTPS에서 실제 추적과 콘텐츠를 검증한 뒤 Supabase Spot별 Broadcast 반응을 연결하는 것입니다. 현재 Supabase·사용자 계정·DB는 연결하지 않았습니다.

## Vercel 배포

`vercel.json`은 Vite 프리셋, `npm run build:web`, 출력 `dist/web`를 지정합니다. 기존 Next.js 프리셋을 덮어씁니다. 정적 배포는 `web/main.tsx` 진입점에서 동일한 지도·AR 컴포넌트를 사용하며, 브라우저 History API로 이동합니다. 모든 페이지 경로를 `index.html`로 연결하므로 Spot QR 직접 진입과 새로고침이 가능합니다. 실제 이미지·미디어·엔진 파일은 정적 파일로 제공됩니다. 로컬 개발은 기존 `npm run dev`를 사용합니다.
