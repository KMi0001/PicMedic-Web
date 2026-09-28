# 구조 & 동작 원리 (ARCHITECTURE)

> 코드를 열기 전에 전체 그림을 잡기 위한 문서. 세부 이유는 [DECISIONS.md](DECISIONS.md), 인수인계 체크리스트는 [HANDOFF.md](HANDOFF.md).

---

## 폴더 구조

```
PicMedic-Web/
├── browser/                  ⭐ ① 브라우저형 정적 사이트 (실서비스, GitHub Pages로 배포되는 폴더 그 자체)
│   ├── index.html            랜딩
│   ├── diagnose.html         사진 진단 페이지
│   ├── live-photo.html       라이브포토 진단 페이지
│   ├── convert.html          확장자 변환 페이지
│   ├── faq.html              FAQ
│   ├── guide.html            사용방법
│   ├── privacy-policy.html   개인정보처리방침
│   ├── diagnose.js           진단 엔진 (core/diagnosis.py + detector.py의 JS 이식판)
│   ├── app.js                diagnose.html 화면 배선
│   ├── convert-app.js        convert.html 화면 배선 (diagnose.js 함수 재사용)
│   ├── live-photo-core.js    라이브포토 UUID 추출·짝 대조·폴더 일괄 매칭
│   ├── live-photo-mp4.js     MOV → MP4 재포장기 (순수 JS, 외부 라이브러리 없음)
│   ├── live-photo-app.js     live-photo.html 화면 배선
│   ├── site-content.js       사이트 공통 편집 데이터 (사업자정보, 이메일, FAQ, 하단 안내문)
│   ├── style.css             도구 페이지 3개 공용 CSS
│   ├── favicon.png
│   ├── robots.txt            /admin.html 크롤링 차단
│   └── (admin.html)          로컬 전용 편집기 — git 미포함
│
├── main.py                   ② 파이썬판 진입점 (pywebview 창 띄움)
├── web/                      ② 파이썬판 UI (index.html, app.js, style.css)
├── core/                     ② 진단 로직 — 원본 PicMedic 저장소에서 복사
│   ├── diagnosis.py          ★ 단일 파일 진단 (브라우저판의 원본 로직)
│   ├── detector.py           ★ 매직바이트 형식 판별
│   ├── analyzer.py           ★ Pillow 디코딩/메타데이터
│   ├── scanner.py, converter.py, duplicate_resolver.py   (데스크톱에서 딸려온 것, main.py 미사용)
├── models/                   FileInfo, ScanResult 데이터 클래스
├── utils/                    logger, trash, file_utils, assets (대부분 데스크톱용)
├── tests/test_diagnosis.py   파이썬판 테스트 (직접 실행, [PASS]/[FAIL] 출력)
├── requirements.txt          Pillow, pillow-heif, pywebview
├── .github/workflows/deploy-pages.yml   browser/ → GitHub Pages
└── .claude/launch.json       로컬 정적 서버 실행 설정
```

---

## 페이지별 스크립트 로드 순서

모든 JS는 **ES 모듈이 아닌 플레인 `<script>`** 라서 함수·상수가 전역으로 공유된다. 순서가 곧 의존관계다.

| 페이지 | 순서 | 의존 |
|---|---|---|
| `diagnose.html` | `libheif-bundle.js`(CDN, head) → `site-content.js` → `live-photo-core.js` → `diagnose.js` → `app.js` → (인라인 테마/언어 스크립트) | `diagnose.js`가 `extractUuidsFromImage`(live-photo-core) 사용 → 라이브포토 흔적 힌트 |
| `convert.html` | `libheif-bundle.js` → `site-content.js` → `diagnose.js` → `convert-app.js` | `convert-app.js`가 `readHeadBytes`, `detectFormat`, `decodeToCanvas`, `BROWSER_DECODABLE_FORMATS` 사용 |
| `live-photo.html` | `site-content.js` → `live-photo-core.js` → `live-photo-mp4.js` → `live-photo-app.js` | libheif **불필요** (픽셀 안 그리고 메타데이터 바이트만 읽음) |
| `index/faq/guide/privacy-policy.html` | `site-content.js` → 인라인 스크립트 | `faq.html`은 `window.PICMEDIC_SITE_CONTENT.faq`로 JSON-LD 생성 |

> ⚠️ `extensionOf()`가 `diagnose.js`, `live-photo-core.js`, `live-photo-app.js`에 각각 선언돼 있다. `function` 선언이라 같은 페이지에서 겹쳐도 에러는 안 나지만(나중 것이 이김), `const`로 바꾸면 `diagnose.html`에서 충돌한다.

---

## ① 사진 진단 (`diagnose.js` → `diagnose(file)`)

### 흐름

```
파일 선택
 └ 앞 64바이트 읽기 → detectFormat (매직바이트)
    ├ 형식 판별 실패 + (16바이트 미만 | 텍스트처럼 보임 | 지원 안 하는 확장자) → [안내] "사진이 아닙니다."
    ├ (형식 판별 실패지만 확장자가 이미지 → 헤더 손상일 수 있으니 계속 디코딩 시도)
    ├ extractUuidsFromImage → isProbableLivePhoto (실패해도 무시)
    ├ 브라우저가 못 그리는 형식(TIFF, AVIF) → [손상] "'X' 형식은 이 브라우저에서 지원하지 않습니다."
    ├ decodeToCanvas 실패 → [손상] "파일이 손상되어 열 수 없습니다."
    └ 성공
        ├ 확장자 불일치 → [의심] "확장자만 바꾸면 정상적으로 열립니다."
        ├ 아니면        → [정상]
        └ + 저해상도 / 스크린샷 / 화질 이슈 → 메시지 뒤에 "… 특징도 함께 보여요."
```

### 형식 판별
- HEIF 계열: `ftyp` 박스의 브랜드 (`heic/heix/heim/heis/hevc/hevx` → HEIC, `mif1/msf1/hevm/hevs` → HEIF, `avif/avis` → AVIF)
- WEBP: `RIFF....WEBP`
- JPEG `FF D8 FF`, PNG, GIF87a/89a, BMP `BM`, TIFF `II*\0`/`MM\0*`
- 디코딩: HEIC/HEIF는 **libheif-js**(WASM, `window.libheif()` 후 `HeifDecoder` 붙을 때까지 50ms 폴링, 8초 타임아웃), 나머지는 `<img>` → canvas.

### 화질 분석 임계값 (파이썬판과 동일 값)

| 판정 | 방법 | 임계값 |
|---|---|---|
| 블러 추정 | 긴 변 512px 축소 → 그레이 → 3×3 엣지 커널(Pillow FIND_EDGES) 분산 | `< 400` |
| 노출 부족/과다 추정 | 그레이 평균 | `< 50` / `> 205` |
| 저대비 추정 | 그레이 표준편차 | `< 20` |
| 노이즈 추정 | **원본** 중앙 400×400 크롭 → 3×3 미디언 필터와의 잔차 표준편차 (축소하면 노이즈가 지워져서 원본 사용) | `> 5.0` |
| 저해상도 | 가로×세로 | `< 300,000` px |
| 스크린샷 | 파일명 패턴만 (`screenshot`, `screen shot`, `스크린샷`, `캡처/캡쳐`) | 스크린샷이면 화질 분석 생략 |

### 인화 적합성 & 인증 배지
- 사이즈: 3x5, 4x6, 5x7, 8x10 (인치). 긴 변/짧은 변 각각 **300dpi 이상 = 고품질**, **150dpi 이상 = 허용가능**, 그 밑 = 권장안함.
- 인증 배지(`certifyQuality`) — 4x6 기준:
  - 화질 이슈 or 저해상도 or 4x6 권장안함 → ⚠️ **주의 필요**
  - 4x6 고품질 → 🏅 **인화 적합**
  - 그 외 → ✅ **양호**
  - 못 열거나 스크린샷이면 배지 없음.

### 결과 객체 주요 필드
`severity`(정상/의심/손상/안내), `message`, `readable`, `isMismatched`, `isLowResolution`, `isProbableScreenshot`, `isProbableLivePhoto`, `qualityIssues[]`, `printSizes[]`, `certification`, `preview`(640px dataURL), `width`, `height`, `fileSize`, `errorMessage`, `canvas`(원본 해상도 — "다른 형식으로 저장"용).

### 파이썬판 대비 브라우저판이 못 하는 것
- EXIF(촬영기기/일시) 없음 → 스크린샷 감지가 약함
- CMYK 경고, 압축폭탄 재분류 없음
- **부분 손상 감지 불가** — 잘린 JPEG도 `<img>`가 그려버리면 "정상"
- TIFF 미지원

---

## ② 확장자 변환 (`convert-app.js`, `app.js`의 결과 화면)

디코딩한 canvas → `canvas.toBlob(mime, quality)` → `<a download>` 클릭. JPEG/WEBP는 품질 슬라이더(PNG는 숨김). 파일명은 원본 이름 + 새 확장자. 한 장씩만.

---

## ③ 라이브포토 (`live-photo-core.js`)

### 원리
애플은 라이브 포토 촬영 시 **사진의 EXIF(MakerNote)** 와 **짝 MOV의 메타데이터** 양쪽에 같은 **Content Identifier(UUID)** 를 심는다. 원본 바이트에서 UUID 정규식으로 찾아 교집합이 있으면 짝.
- exiftool·libheif 불필요 (픽셀 디코딩 안 함).
- 바이너리를 latin1로 디코딩 후 정규식 → 어떤 바이트든 예외 없음.
- HEIC: ISOBMFF 박스(`meta` → `iinf`/`iloc`)를 직접 파싱해 Exif 아이템 바이트만 추출 후 검색.
- JPEG: 앞 512KB만 검색 (뒤쪽 압축 데이터에서 우연히 UUID 모양이 나오는 것 방지).
- MOV/MP4/M4V: 앞 30MB까지만 읽음.

### 흐름 (`live-photo-app.js`)
1. **사진 먼저** 선택 → 사진에 UUID가 있으면 "짝 동영상이 있을 거예요" + 동영상 선택 버튼.
2. 동영상 선택 → `checkLivePhotoPair` → 짝이면 MOV 미리보기·다운로드·MP4 변환 버튼.
3. 사진+동영상을 동시에 드롭하면 1단계 생략.
4. **폴더 모드**(`webkitdirectory`) → `findLivePhotoMatchesInFiles`:
   - 모든 MOV의 UUID → `uuid → [mov]` 맵
   - 사진마다 후보 MOV 모음 → **같은 크기 MOV는 복사본으로 보고 하나로 합침** → 후보가 **정확히 1개일 때만** 매칭(모호하면 버림) → MOV 하나는 한 번만 사용
   - 15개마다 UI 양보(`setTimeout 0`). 결과는 목록 + 개별 다운로드 (ZIP 없음).

---

## ④ MOV → MP4 (`live-photo-mp4.js`)

외부 라이브러리 없이 QuickTime 박스를 읽어 MP4로 **재포장(remux)**.
- **영상**: 재인코딩 없이 샘플 그대로 복사 (화질 손실 없음). 코덱 유지 → HEVC면 `videoCodec === "hevc"`로 알려서 "PC에서 재생 안 될 수 있음" 안내.
- **소리**: AAC면 그대로. 무압축 PCM(옛 아이폰)이면 **WebCodecs `AudioEncoder`로 AAC 인코딩**. 브라우저가 지원 안 하면 영상만 담음.
- QuickTime 전용 메타데이터 트랙(`mebx` 등)은 버림.
- 출력 구조: `ftyp` + `moov`(원본 mvhd/tkhd/stts/ctts/stss/stsz 재사용, stsc/stco를 청크 1개로 재작성) + `mdat`(영상 샘플 → 오디오 샘플). 4GB 이상은 거부.
- API: `LivePhotoMp4.convertMovToMp4(arrayBuffer, { onProgress })` → `{ blob, videoCodec, hasAudio, audioStatus: "included" | "no-audio-track" | (그 외=브라우저 미지원), durationSec }`
- 실패 시 `err.livePhotoMp4 === true`인 에러의 `message`는 사용자에게 그대로 보여줘도 되는 한국어 문구.
- Node에서도 `require` 가능 (`module.exports`), Blob 없으면 `bytes`로 반환. 내부 함수는 `_internal`로 노출(테스트용).

---

## `site-content.js` — 사이트 공통 데이터

```js
CONTENT = {
  bizinfo:      { name, ceo, regNo, address, mailOrderNo, contact },  // 각각 {ko, en} 또는 문자열
  contactEmail: "jenn@try-cat.com",
  faq:          [ { q: {ko, en}, a: {ko, en} }, ... ],
  pageNotes:    { diagnose: {ko,en}, livePhoto: {ko,en}, convert: {ko,en} }  // ko가 ""면 그 페이지 안내문 숨김
}
```
- 로드되면 `.bizinfo`, `.footlinks`, `#faq-list`, `[data-page-note]` 요소를 채운다 (각 요소의 `data-en`도 같이 세팅 → 언어 토글이 그대로 동작).
- **반드시 언어 토글 스크립트보다 먼저** 로드돼야 함 (토글 스크립트가 로드 시점의 `innerHTML`을 `data-ko`로 저장하기 때문).
- 전역 노출: `PICMEDIC_SITE_CONTENT`, `PICMEDIC_RENDER_BIZINFO`, `PICMEDIC_RENDER_FOOTLINKS`, `PICMEDIC_RENDER_FAQ_LIST`, `PICMEDIC_RENDER_PAGE_NOTE` (로컬 `admin.html` 미리보기용).
- 편집 방식: 서버가 없어서 실시간 저장 불가 → `admin.html`에서 값 수정 → 새 `site-content.js` 다운로드 → 파일 통째로 교체 → 커밋. 직접 텍스트로 편집해도 됨.

---

## 다국어 & 테마

### 언어 (모든 HTML 하단 인라인 스크립트, 페이지마다 복붙)
- 한국어 = 요소 `innerHTML`, 영어 = 같은 요소의 `data-en` 속성.
- 로드 시 모든 `[data-en]`의 현재 `innerHTML`을 `data-ko`에 백업 → 토글 시 교체. `\n` 문자열은 `<br>`로.
- `localStorage['picmedic-lang']` = `ko` | `en` (기본 ko). `<html lang>`도 바꿈.

### 테마
- **다크가 기본**(시스템 설정 무시). `localStorage['picmedic-theme']` = `light` | `dark` → `<html data-theme>`.
- `<head>` 직후 인라인 스크립트로 먼저 적용해 깜빡임 방지.
- 팔레트는 데스크톱 `gui/theme.py`와 동일 (버터·아이보리 + 골드 포인트 `#D9B54A`).

---

## 배포

`.github/workflows/deploy-pages.yml`
- 트리거: `main`에 `browser/**` 또는 워크플로 파일 변경 push, 또는 수동(workflow_dispatch)
- `browser/` 폴더를 그대로 Pages 아티팩트로 업로드 → `deploy-pages@v4`
- 빌드 단계 없음. `browser/`가 곧 사이트 루트.

---

## ② 파이썬판 (`main.py`)

- `pywebview`로 `web/index.html`을 OS 내장 웹뷰(Windows WebView2 / macOS WebKit)로 띄움. 서버 없음.
- JS → `window.pywebview.api.pick_and_diagnose()` / `diagnose_path(path)` → `core.diagnosis.diagnose()` → dict 반환.
- `core/diagnosis.py`가 브라우저판 모든 판정 로직의 원본. Pillow "손상 허용 모드"로 부분 손상까지 판별, EXIF·CMYK·압축폭탄도 처리.
