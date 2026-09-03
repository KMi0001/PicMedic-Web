# PicMedic Web

PicMedic 데스크톱 앱(PySide6)의 웹버전. 방향/의사결정 배경은 원본 저장소의
[PLATFORM_EXPANSION.md](../PicMedic/PLATFORM_EXPANSION.md) 참고. 이 저장소
안에 **서로 다른 두 갈래**가 있다 — 진단 로직은 같은 원칙(손상/의심/정상/안내,
"추정" 표기 등)을 따르지만 구현이 완전히 별개다.

## 갈래 ① 로컬 상주형 (`web/` + `main.py`) — 파이썬

서버 없는 **pywebview 기반 "로컬 상주 + 웹 UI"**. OS 내장 웹뷰(Windows
WebView2 / macOS WebKit)를 파이썬이 띄우고, 화면은 HTML/CSS/JS로 작성한다.
진단 로직(`core/`, `models/`, `utils/`)은 원본 데스크톱 앱에서 그대로
가져왔다 — Qt 의존성이 없는 순수 Python이라 수정 없이 재사용.

**core/ 동기화**: 지금은 원본 저장소(`../PicMedic`)의 `core/`, `models/`,
`utils/`를 복사해온 상태(단일 소스 아님). 두 프로젝트 중 하나에서 로직을
고치면 다른 쪽에는 수동으로 반영해야 한다.

**설치·실행**
```
pip install -r requirements.txt
python main.py
```

**테스트**
```
python tests/test_diagnosis.py
```
모두 [PASS]로 통과해야 합니다. pytest 없이 원본 저장소와 동일한 방식(직접
실행 + PASS/FAIL 출력)으로 작성돼 있음.

## 갈래 ② 브라우저형 (`browser/`) — 순수 자바스크립트, 서버 없음

**진짜 URL로 접속하는 정적 웹사이트.** 백엔드가 아예 없다 — 파일 서빙 말고는
서버가 하는 일이 없고, 사진은 방문자의 브라우저 탭 안에서만 처리된다(어디로도
전송 안 됨). `core/diagnosis.py`의 로직을 자바스크립트(`browser/diagnose.js`)로
새로 이식한 것이라 파이썬/Pillow 의존성이 전혀 없다.

HEIC는 [`libheif-js`](https://github.com/catdad-experiments/libheif-js)
(libheif를 WASM으로 컴파일한 라이브러리, CDN에서 로드)로 디코딩한다. 나머지
형식(JPEG/PNG/GIF/BMP/WEBP)은 브라우저 `<img>` 태그가 원래 지원하는 걸
그대로 씀.

**실행**: 빌드 과정 없음. `browser/index.html`을 정적 파일로 아무 데나
올리면 끝(GitHub Pages, Netlify, 일반 웹호스팅 등). 로컬에서 확인하려면:
```
cd browser
python -m http.server 8000
```
그 뒤 `http://localhost:8000`으로 접속.

**파이썬판과의 차이 (중요)**
- **EXIF 미지원** — 촬영기기/촬영일시가 없고, 스크린샷 감지도 파일명
  패턴만 사용(파이썬판의 "PNG+EXIF없음" 보조 신호 없음).
- **CMYK 색공간 감지, 압축폭탄 안전장치 재분류 없음** — Pillow 전용 개념이라
  이식 안 함.
- **손상 판정이 더 거칠다** — 가장 큰 차이. Pillow는 "일부만 디코딩된
  파일"을 부분 손상으로 세밀하게 잡아내는데, 브라우저의 `<img>` 디코더는
  꽤 관대해서 잘린 JPEG도 에러 없이 "정상"으로 처리하는 경우가 실제로
  확인됨(`03_손상된_파일.jpg` 샘플로 테스트 시 파이썬판은 "손상"으로,
  브라우저판은 "정상"으로 나옴). 완전히 못 여는 파일만 확실히 잡힌다.
- TIFF는 브라우저가 `<img>`로 못 그려서 미지원 처리.

## 상태

1차 기능 "사진이 이상해요"(단일 파일 진단) — 두 갈래 모두 구현. 상세 판정
기준은 [사진이_이상해요_기획.md](사진이_이상해요_기획.md) 참고(주로 ①
기준으로 작성됨, ②는 위 차이점 참고).
