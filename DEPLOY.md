# 배포 가이드

## 이 앱의 구조

빌드 결과물은 **정적 파일 덩어리**입니다. 백엔드도 DB도 필요 없습니다.

```
서버가 주는 것 :  HTML, JS, wasm, 글꼴, 사운드폰트   ← 모든 방문자에게 동일
각자 갖는 것   :  게임 ZIP/JAR, 세이브, 라이브러리    ← 브라우저 안에만 존재
```

게임 파일과 세이브는 방문자의 브라우저 IndexedDB에만 저장되고 서버로 올라가지 않습니다.
서버는 에뮬레이터 프로그램만 배달하고, 방문자가 각자 자기 게임 파일을 넣습니다.

> **중요**: 이 때문에 서버에 게임 파일을 올려 배포하면 안 됩니다. 상용 게임의 배포자가 됩니다.

빌드 결과물 크기는 약 32MB입니다.

| 파일 | 크기 | gzip |
|---|---|---|
| `wie_web_bg-*.wasm` | 18.7 MB | 4.7 MB |
| `GeneralUser.sf3` (MIDI 사운드폰트) | 10.3 MB | — |
| `neodgm-*.ttf` (비트맵 글꼴) | 650 KB | — |
| `spessasynth_processor.min-*.js` | 393 KB | — |
| `index-*.js` | 468 KB | 167 KB |
| `index-*.css` | 11 KB | 3 KB |

---

## 1. 빌드 환경 준비

빌드에는 **Rust 툴체인이 필요합니다.** 에뮬레이터 코어를 wasm으로 컴파일해야 하기 때문입니다.
서버에는 필요 없습니다 — 빌드 PC와 서버를 분리하는 것을 권장합니다.

### 필요한 것

- **Node.js 20 이상**
- **Rust** + `wasm32-unknown-unknown` 타겟
- **wasm-pack**

### 설치

```bash
# Rust (https://rustup.rs)
curl https://sh.rustup.rs -sSf | sh
rustup target add wasm32-unknown-unknown

# wasm-pack
cargo install wasm-pack
```

**Windows에 Visual Studio가 없다면** rustup 설치 시 GNU 툴체인을 고르세요.
MSVC 링커 없이 빌드할 수 있고, wasm 빌드 경로에는 C 의존성이 없어 문제되지 않습니다.

```powershell
rustup-init.exe --default-host x86_64-pc-windows-gnu --target wasm32-unknown-unknown
```

wasm-pack은 [프리빌트 바이너리](https://github.com/rustwasm/wasm-pack/releases)를 받아
`~/.cargo/bin`에 두는 편이 빠릅니다.

---

## 2. 빌드

```bash
git clone https://github.com/cnksncks0411/picherGame.git
cd picherGame
npm install
npm run build:prod
```

결과물은 `wie-web/dist/`에 생성됩니다.

> **첫 빌드는 10~30분** 걸립니다. Rust 의존성 전체 컴파일 + LTO 링크 + wasm-opt 최적화 때문입니다.
> 이후 빌드는 3~4분이며, 대부분 wasm-opt 시간입니다.

### npm 스크립트

| 명령 | 용도 |
|---|---|
| `npm start` | 개발 서버 (`http://localhost:1140`). 최적화된 wasm을 서빙합니다 |
| `npm run build:prod` | 배포용 빌드 |
| `npm run build:dev` | 빠른 빌드 (wasm 최적화 생략 — 게임이 느립니다) |
| `npm run play` | 배포용 빌드 후 바로 서빙 |
| `npm run preview` | 마지막 빌드 결과물 서빙 |
| `npm run typecheck` | TypeScript 검사 |

에뮬레이터의 Rust 코드를 직접 수정할 때만 `WIE_WASM_DEV=1 npm start`를 쓰세요.
재컴파일이 빨라지는 대신 **게임이 눈에 띄게 느려집니다** — dev 프로파일에서는 JVM과
화면 그리기 코드가 최적화되지 않습니다.

---

## 3. 서버에 올리기

빌드한 PC에서 `wie-web/dist` 폴더 전체를 서버로 복사합니다.

```bash
rsync -avz --delete wie-web/dist/ user@서버:/var/www/picher/
```

`--delete`를 반드시 붙이세요. 파일명에 해시가 붙어 있어서, 없으면 예전 버전 파일이 계속 쌓입니다.

### nginx 설정

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name picher.example.com;

    ssl_certificate     /etc/letsencrypt/live/picher.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/picher.example.com/privkey.pem;

    root /var/www/picher;
    index index.html;

    # wasm MIME 타입. 없으면 브라우저가 스트리밍 컴파일을 못 합니다
    types { application/wasm wasm; }

    # wasm 19MB -> 4.7MB. 반드시 켜세요
    gzip on;
    gzip_types application/wasm application/javascript text/css application/manifest+json;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # 파일명에 해시가 있으므로 영구 캐시해도 안전합니다
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 이 셋은 캐시하면 안 됩니다. 새 버전이 안 내려갑니다
    location = /index.html            { add_header Cache-Control "no-cache"; }
    location = /sw.js                 { add_header Cache-Control "no-cache"; }
    location = /manifest.webmanifest  { add_header Cache-Control "no-cache"; }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# http 접속은 https로 넘깁니다
server {
    listen 80;
    server_name picher.example.com;
    return 301 https://$host$request_uri;
}
```

### Caddy를 쓴다면

인증서를 알아서 발급받아 훨씬 간단합니다.

```caddyfile
picher.example.com {
    root * /var/www/picher
    encode gzip
    file_server

    @immutable path /assets/*
    header @immutable Cache-Control "public, max-age=31536000, immutable"

    @nocache path /index.html /sw.js /manifest.webmanifest
    header @nocache Cache-Control "no-cache"

    try_files {path} /index.html
}
```

---

## 4. HTTPS는 필수입니다

`http://`로 서빙하면 **폰에서 앱 설치가 불가능합니다.**

브라우저는 보안 컨텍스트(HTTPS 또는 localhost)가 아닌 곳에는 `serviceWorker` API 자체를
제공하지 않습니다. API가 없으니 설치도 오프라인도 성립하지 않고, 게임은 그냥 웹페이지로만 돕니다.

실측 결과:

| 접속 주소 | `isSecureContext` | `serviceWorker` | 앱 설치 |
|---|---|---|---|
| `http://localhost:1140` | ✅ | 있음 | 가능 |
| `http://192.168.0.10:1140` | ❌ | **없음** | 불가능 |
| `https://도메인` | ✅ | 있음 | 가능 |

LAN IP로는 안 됩니다. 도메인과 인증서가 필요합니다.

```bash
sudo certbot --nginx -d picher.example.com
```

도메인이 없으면 DuckDNS 같은 무료 DDNS로 하나 잡고 인증서를 받으면 됩니다.

---

## 5. 업데이트 배포

```bash
git pull
npm install               # package.json 이 바뀐 경우만
npm run build:prod
rsync -avz --delete wie-web/dist/ user@서버:/var/www/picher/
```

서비스워커가 `autoUpdate`로 설정되어 있어, 사용자가 앱을 다시 열면 새 버전을 자동으로 받습니다.

---

## 6. 배포 후 확인

폰 크롬에서 순서대로 확인하세요.

1. `https://도메인` 접속 → 라이브러리 화면이 뜨는가
2. 브라우저 메뉴에 **"앱 설치"** 가 보이는가
   - 안 보이면 HTTPS 또는 인증서 문제입니다
3. 설치 후 홈 화면 아이콘으로 실행 → 주소창 없는 전체화면인가
4. 게임 파일(ZIP/JAR)을 추가하고 실행되는가
5. 비행기 모드로 바꾸고 실행 → 그래도 켜지는가
   - 한 번 실행한 뒤부터 됩니다. wasm과 사운드폰트는 첫 사용 시 캐시됩니다

---

## 알아두면 좋은 것

### 저장소는 출처(origin)별로 분리됩니다

게임과 세이브는 `스킴 + 호스트 + 포트`가 같아야 공유됩니다.

- `http://localhost:1140`과 `https://도메인`은 **서로 다른 저장소**입니다
- 도메인이나 프로토콜을 바꾸면 라이브러리가 비어 보입니다. 데이터는 남아 있지만 다른 출처에 있습니다
- 방문자끼리는 어떤 경우에도 공유되지 않습니다. 각자 자기 브라우저에만 저장됩니다

주소를 한 번 정하면 바꾸지 않는 편이 좋습니다.

### 백업 수단이 없습니다

현재 내보내기/가져오기 기능이 없습니다. 브라우저 데이터를 지우면 게임과 세이브가 사라집니다.

### Windows에서 빌드가 `os error 225`로 실패한다면

Windows Defender가 `node_modules` 안의 파일을 오탐으로 차단한 경우입니다.
`package.json`의 `overrides`로 `stb-vorbis`를 0.0.5에 고정해두었는데,
다른 패키지에서 같은 일이 생기면 이렇게 확인하세요.

```powershell
Get-MpThreatDetection | Select-Object -ExpandProperty Resources -Unique
```

먼저 다른 버전으로 우회할 수 있는지 확인하고, 안 되면 해당 파일만 예외 처리하세요.

---

## 라이선스

이 프로젝트는 [Inseok Lee](https://github.com/dlunch)의
[wie 에뮬레이터](https://github.com/dlunch/wie)를 기반으로 합니다 (MIT).

`LICENSE` 파일과 앱 메뉴의 원본 프로젝트 링크는 **반드시 유지해야 합니다.**
MIT 라이선스가 저작권 표기 유지를 의무 조건으로 요구합니다.
