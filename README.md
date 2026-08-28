# Eight Point AR Prototype

모바일 GPS → 카메라 정렬 → Web AR 흐름을 검증하는 정적 Next.js 프로토타입입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 빌드

저장소가 `https://USER.github.io/REPOSITORY/` 경로에 배포된다면 저장소 이름을 base path로 전달합니다.

```bash
NEXT_PUBLIC_BASE_PATH=/REPOSITORY npm run build
```

Windows PowerShell에서는 다음과 같이 실행합니다.

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/REPOSITORY'; npm run build
```

결과물은 `out` 폴더에 생성됩니다. GPS, 카메라, AR 기능은 HTTPS와 사용자 권한 승인이 필요합니다.
