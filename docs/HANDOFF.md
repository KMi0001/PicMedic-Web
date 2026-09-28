# 인수인계서 (HANDOFF)

> 작성일: 2026-09-28 · 대상: 이 프로젝트를 이어받는 AI/개발자
> 이 문서 하나만 읽어도 "지금 어디까지 됐고, 뭘 챙겨야 하고, 뭘 조심해야 하는지" 알 수 있게 쓴 것.

---

## 0. 30초 요약

- **제품**: 아이폰 사진이 PC에서 안 열릴 때 원인(손상 vs HEIC 형식 문제)을 알려주는 **무료 웹 진단 도구**. 부가로 확장자 변환, 라이브 포토 짝 영상 찾기/MP4 변환.
- **핵심 약속**: 사진은 절대 서버로 안 간다. 백엔드 없음. 모든 처리는 브라우저 JS.
- **사업 구조**: 웹 = 무료 유입 창구 → 복구·일괄 정리는 **PicMedic 데스크톱**(별도 저장소, MS 스토어 유료 판매 예정)으로 안내.
- **실제 코드의 중심**: `browser/` 폴더 (정적 사이트, 빌드 없음). `main` push 시 GitHub Pages 자동 배포.
- **파이썬 쪽(`main.py`, `web/`, `core/` 등)**: 초기 프로토타입. 현재 개발은 거의 `browser/`에서만 일어남.

---

## 1. 현재 상태

### 완성된 기능 (`browser/`)

| 기능 | 페이지 | 상태 |
|---|---|---|
| 랜딩 | `index.html` | ✅ 완료. SEO용 title/description 작성됨 |
| 사진 진단 | `diagnose.html` + `app.js` + `diagnose.js` | ✅ 형식 판별, 확장자 불일치, 손상, 해상도, 블러/노출/대비/노이즈, 인화 사이즈별 적합성, 화질 인증 배지, 라이브포토 흔적 힌트, 결과 화면에서 JPEG/PNG/WEBP 저장 |
| 라이브포토 진단 | `live-photo.html` + `live-photo-app.js` + `live-photo-core.js` + `live-photo-mp4.js` | ✅ 사진 1장 먼저 → 짝 영상 있을지 안내 → MOV 선택 시 짝 대조 → MOV 다운로드 / **MP4 변환(재인코딩 없음)**. 폴더 통째로 일괄 매칭 + 개별 다운로드 |
| 확장자 변환 | `convert.html` + `convert-app.js` | ✅ 진단 없이 바로 변환 (한 장씩) |
| FAQ | `faq.html` | ✅ `site-content.js`의 FAQ 배열로 렌더 + FAQPage JSON-LD 자동 생성 |
| 사용방법 | `guide.html` | ✅ (진입점은 우하단 떠 있는 "사용방법" 버튼 — **임시 배치**) |
| 개인정보처리방침 | `privacy-policy.html` | ⚠️ 본문 완료, **시행일·사업자정보 미기입** |
| 다크/라이트, 한/영 | 모든 페이지 | ✅ localStorage에 기억 |

### 미완성 / 보류

- **데스크톱 소개 페이지**: 랜딩의 4번째 카드 "PicMedic 데스크톱 — 준비 중"(링크 없음). 데스크톱 출시 시 페이지 만들고 카드 연결.
- **사진 진단 페이지 하단 안내문**: `site-content.js` → `pageNotes.diagnose`를 일부러 빈 문자열로 둠(2026-09-16 결정). 데스크톱 나오면 채울 것.
- **사진 복구 기능**: 웹에서는 안 함(의도적). 데스크톱 전용.
- **TIFF**: 브라우저가 못 그려서 미지원.
- **EXIF 기반 기능**(촬영기기/일시, PNG+EXIF없음 스크린샷 신호): 브라우저판 미구현.
- **파이썬판(②)**: 1차 프로토타입에서 멈춤. 계속 쓸지 정해지지 않음.

---

## 2. 가져가야 할 것 체크리스트

### ✅ 저장소 안에 이미 있는 것 (git clone이면 끝)

- [x] `browser/` 전체 — 실서비스 코드
- [x] `.github/workflows/deploy-pages.yml` — Pages 자동 배포
- [x] `.claude/launch.json` — 로컬 정적 서버 실행 설정 (`python -m http.server 8000 --directory browser`)
- [x] `main.py`, `web/`, `core/`, `models/`, `utils/`, `tests/`, `requirements.txt` — 파이썬판
- [x] 이 문서들 (`README.md`, `docs/*`, `AGENTS.md`)

### ⚠️ 저장소에 **없어서** 따로 챙겨야 하는 것

| 항목 | 어디 있나 | 왜 저장소에 없나 | 할 일 |
|---|---|---|---|
| **`browser/admin.html`** | 기존 작업자 PC의 로컬 `browser/` 폴더 | 공개 저장소라 "관리자 페이지"가 노출되면 안 됨 → `.gitignore` 처리, `robots.txt`에서도 Disallow | 파일을 직접 복사해 오거나, 없으면 새로 만들어도 됨 (기능: `site-content.js`의 `CONTENT` 객체를 폼으로 편집 → 새 `site-content.js` 다운로드). **절대 커밋 금지** |
| **`sample_photos/`** | 기존 작업자 PC | 바이너리라 `.gitignore` | 수동 테스트용. 특히 `03_손상된_파일.jpg`(잘린 JPEG)는 파이썬판=손상/브라우저판=정상으로 갈리는 대표 샘플 |
| **`PicMedic` 원본 저장소** | GitHub `PicMedic` 저장소 | 별도 프로젝트 | `core/` 원본, `PLATFORM_EXPANSION.md`(웹버전 방향 결정 배경), `사진이_이상해요_기획_web.md`(판정 기준 기획서), 기타 PRD, `gui/theme.py`(색상 팔레트 원본), `core/live_photo_finder.py`(라이브포토 알고리즘 원본) |
| **GitHub Pages 설정** | 저장소 Settings → Pages | 저장소 설정이라 코드에 없음 | Source = **GitHub Actions** 확인. 커스텀 도메인 쓰면 Settings에서 설정(현재 `CNAME` 파일 없음) |

### 🔑 외부 서비스 / 의존성 (계정·키 불필요)

| 의존성 | 쓰는 곳 | 비고 |
|---|---|---|
| `libheif-js@1.19.8` (jsDelivr CDN) | `diagnose.html`, `convert.html` | HEIC 디코딩(WASM). 버전 고정됨. CDN 죽으면 HEIC 진단/변환 불가 |
| Google Fonts (IBM Plex Sans KR / IBM Plex Mono) | 모든 HTML | 폰트만 |
| GitHub Pages | 호스팅 | 무료 |

- API 키, 시크릿, DB, 분석 도구, 쿠키 **없음** (개인정보처리방침에도 "없다"고 명시돼 있으니 추가하면 방침부터 수정해야 함).
- npm/package.json **없음**. 빌드 도구 없음.

---

## 3. 오픈(정식 게시) 전 남은 일

- [ ] **사업자정보 채우기** — `browser/site-content.js`의 `bizinfo` (상호명, 대표자, 사업자등록번호, 주소, 통신판매업신고번호, 연락처). 지금은 `[상호명]` 같은 자리표시자.
  - 통신판매업신고번호는 이 사이트에서 직접 결제받을 때만 필요할 수 있음 (결제는 MS 스토어 예정) → **법률 검토 필요**.
- [ ] **개인정보처리방침 시행일** — `privacy-policy.html` 상단 `20XX년 X월 X일` 교체, 하단 `.todo` 박스 삭제.
- [ ] **호스팅 접속 기록 처리 방식 확인** 후 방침 문구 검토.
- [ ] 각 HTML 푸터에 하드코딩된 `mailto:TODO@example.com`은 `site-content.js`가 런타임에 `contactEmail`(현재 `jenn@try-cat.com`)로 덮어씀 → 동작엔 문제없지만 JS 꺼진 환경/크롤러용으로 HTML 기본값도 실제 주소로 바꾸면 좋음.
- [ ] "사용방법" 버튼(`.guide-fab`)은 임시 배치 — 정식 도움말 진입점(내비 메뉴 등) 정하기.
- [ ] `sitemap.xml` 없음 — SEO 원하면 추가 (`robots.txt`에 Sitemap 줄도).

---

## 4. 반드시 알아야 할 주의사항 (함정)

1. **HTML마다 공통 부분이 복붙돼 있다.** 내비바, 푸터, 테마 토글 스크립트, 언어 토글 스크립트가 7개 HTML에 각각 들어 있음(빌드/템플릿 없음). 메뉴 하나 추가하려면 **모든 HTML을 같이 고쳐야** 한다. 게다가 두 계열로 나뉨:
   - 소개 계열(`index.html`·`faq.html`·`guide.html`·`privacy-policy.html`): CSS 전부 인라인 `<style>`, 내비 클래스 `nav.top`
   - 도구 계열(`diagnose.html`·`live-photo.html`·`convert.html`): `style.css` 공유 + 페이지별 인라인 `<style>`, 내비 클래스 `nav.site-nav`
   - 색상 변수 이름도 계열마다 다름(소개 계열 `--accent`/`--hairline`, `style.css`는 `--primary`/`--border`). 값은 같은 팔레트.
2. **스크립트는 모듈이 아닌 전역 공유.** `convert.html`은 `diagnose.js`의 함수를, `live-photo-app.js`는 `live-photo-core.js`의 상수를 전역으로 가져다 씀. **로드 순서 바꾸면 깨짐** (순서는 [ARCHITECTURE.md](ARCHITECTURE.md#페이지별-스크립트-로드-순서)).
3. **다국어는 `data-en` 속성.** 한국어는 HTML 본문, 영어는 같은 요소의 `data-en`. 텍스트를 고치면 **둘 다** 고칠 것. `data-en` 안에 HTML을 넣을 땐 이스케이프(`&lt;strong&gt;`) 필요. 줄바꿈은 `\n` 문자열.
   - 단, JS가 동적으로 만드는 결과 문구(`diagnose.js`·`app.js`·`live-photo-app.js`의 진단 메시지, 에러, MP4 상태 안내 등)는 **한국어만** 있음. 영어 모드에서도 결과는 한국어로 나옴.
4. **브라우저판 손상 판정은 파이썬판보다 거칠다.** 브라우저 `<img>` 디코더가 관대해서 잘린 JPEG도 "정상"이 나올 수 있음. 완전히 못 여는 파일만 확실히 잡힘. (알려진 한계, 버그 아님)
5. **파이썬 `core/`는 원본 저장소 복사본.** 단일 소스가 아니라 한쪽 고치면 다른 쪽 수동 반영. `core/scanner.py`, `converter.py`, `duplicate_resolver.py`, `utils/trash.py` 등은 데스크톱에서 통째로 가져온 거라 `main.py`는 안 씀.
6. **색상은 데스크톱 `gui/theme.py`와 같은 값.** 팔레트 바꾸면 데스크톱과 어긋남. 다크가 기본(`:root`), 라이트가 `[data-theme="light"]` 덮어쓰기.
7. **"추정" 표기 원칙.** 화질 판정은 전부 "블러 추정", "노이즈 추정"처럼 단정하지 않음. 문구 추가 시 유지.
8. **사용자 사진을 외부로 보내는 코드 절대 금지.** fetch/XHR로 파일 전송, 분석 스크립트 추가 등은 제품 약속과 개인정보처리방침을 동시에 깨뜨림.
9. **`admin.html` 커밋 금지.** `git add -A` 할 때 특히 주의 (`.gitignore`에 있어서 보통은 안전).

---

## 5. 작업 흐름

```bash
# 로컬 확인
cd browser && python -m http.server 8000     # http://localhost:8000

# 배포
git push origin main                          # browser/** 변경 시 자동 배포
# Actions 탭에서 "Deploy browser/ to GitHub Pages" 수동 실행도 가능(workflow_dispatch)

# 파이썬판 테스트
python tests/test_diagnosis.py
```

- 자동 테스트는 **파이썬판에만** 있음 (`tests/test_diagnosis.py`). 브라우저 JS는 테스트 없음 → 수동 확인.
  - `live-photo-mp4.js`는 `module.exports`를 지원해 Node에서 테스트 가능하게 만들어져 있지만, 테스트 파일은 아직 없음.
- 커밋 메시지는 한국어로 써 왔음.
- 코드 주석에 "왜 이렇게 했는지 + 날짜 + (사용자 요청)"을 남기는 관례가 있음. 이어서 지키면 다음 사람이 편함.

---

## 6. 다음에 하면 좋을 것 (제안, 우선순위 순)

1. 오픈 전 TODO(3절) 처리.
2. 공통 내비/푸터/토글 스크립트를 공용 JS 하나로 빼기 → 7개 파일 복붙 해소.
3. JS 결과 문구 영어화 (지금은 영어 모드에서도 결과 메시지가 한국어).
4. `diagnose.js`/`live-photo-core.js`/`live-photo-mp4.js` Node 단위 테스트 추가.
5. `sitemap.xml`, OG 태그(공유 미리보기) 추가.
6. 데스크톱 출시 시: 소개 페이지 + 랜딩 카드 연결 + `pageNotes.diagnose` 채우기.
