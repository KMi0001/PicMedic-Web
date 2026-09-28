# PicMedic Web

> 아이폰 사진이 PC에서 안 열릴 때 — **손상인지 HEIC 형식 문제인지** 브라우저에서 바로 진단하고,
> JPG로 변환하고, 라이브 포토 짝 영상을 찾아 MP4로 저장하는 **무료 웹 도구**.
> 사진은 **어디에도 업로드되지 않는다** (모든 처리가 방문자 브라우저 탭 안에서 끝남).

PicMedic 데스크톱 앱(PySide6, 별도 저장소 `PicMedic`)의 웹버전이다.
웹은 "무료 진단/간단 변환" 창구, 복구·일괄 정리는 데스크톱(유료, MS 스토어 판매 예정) 담당.

---

## 📚 문서 지도 (처음 오면 이 순서로)

| 문서 | 내용 |
|---|---|
| **[docs/HANDOFF.md](docs/HANDOFF.md)** | **인수인계서** — 현재 상태, 가져가야 할 것 체크리스트, 오픈 전 남은 일, 주의사항 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 폴더/파일 구조, 페이지별 스크립트 로드 순서, 진단·라이브포토·MP4 알고리즘, 임계값 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 지금까지 내린 결정과 그 이유(날짜별) — "왜 이렇게 돼 있지?"의 답 |
| [AGENTS.md](AGENTS.md) | 이 저장소에서 작업하는 AI/개발자가 지켜야 할 규칙 요약 |

---

## 한눈에 보기

이 저장소 안에는 **서로 별개인 두 갈래**가 있다. 진단 원칙(손상/의심/정상/안내 배지, "~추정" 표기)은 같지만 코드는 완전히 따로다.

| | ① 브라우저형 `browser/` ⭐ **주력** | ② 로컬 상주형 `web/` + `main.py` |
|---|---|---|
| 형태 | 정적 웹사이트 (서버 없음) | pywebview 데스크톱 창 + HTML UI |
| 언어 | 순수 JavaScript (빌드 없음, 프레임워크 없음) | Python + HTML/JS |
| 배포 | `main`에 push → GitHub Actions → GitHub Pages 자동 배포 | 로컬 실행만 (배포 없음) |
| 기능 | 사진 진단 · 라이브포토 진단(+MP4 변환) · 확장자 변환 · FAQ · 사용방법 · 개인정보처리방침 | "사진이 이상해요" 단일 파일 진단 프로토타입 |
| 상태 | 실제 서비스 대상. 계속 개발 중 | 1차 프로토타입에서 멈춤 |

## 빠른 실행

**① 브라우저형 (주력)** — 빌드 과정 없음
```bash
cd browser
python -m http.server 8000
# → http://localhost:8000
```
배포: `main` 브랜치에 `browser/**` 변경이 push되면 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)이
`browser/` 폴더 통째로 GitHub Pages에 올린다. (저장소 Settings → Pages → Source = **GitHub Actions** 필요)

**② 로컬 상주형 (파이썬)**
```bash
pip install -r requirements.txt   # Pillow, pillow-heif, pywebview
python main.py
python tests/test_diagnosis.py    # 모두 [PASS] 나와야 함 (pytest 아님, 직접 실행)
```

## 페이지 구성 (`browser/`)

| 파일 | 역할 |
|---|---|
| `index.html` | 랜딩 페이지 (도구 카드 4개, 사용 시나리오, 배지 설명) |
| `diagnose.html` | **사진 진단** — 형식/손상/화질/인화 적합성 + 결과 화면에서 형식 변환 |
| `live-photo.html` | **라이브포토 진단** — 사진↔MOV 짝 확인, MOV 다운로드, MP4 변환, 폴더 일괄 찾기 |
| `convert.html` | **확장자 변환** — 진단 없이 HEIC 등 → JPEG/PNG/WEBP |
| `faq.html` | FAQ (내용은 `site-content.js`에서 생성 + JSON-LD 자동 삽입) |
| `guide.html` | 사용방법 (우하단 "사용방법" 버튼에서 연결) |
| `privacy-policy.html` | 개인정보처리방침 (**시행일 등 게시 전 TODO 남아 있음**) |
| `site-content.js` | 사업자정보·문의 이메일·FAQ·페이지 하단 안내문구 — **사이트 공통 편집 데이터** |

모든 페이지: 다크 모드 기본 + 라이트 토글, 한국어 기본 + English 토글 (`data-en` 속성 방식, [ARCHITECTURE.md](docs/ARCHITECTURE.md#다국어--테마) 참고).

## 관련 외부 자료 (이 저장소 밖에 있음)

- 원본 데스크톱 저장소 **`PicMedic`** — 여기 `core/`, `models/`, `utils/`의 원본, 방향 문서 `PLATFORM_EXPANSION.md`,
  기획 문서 `사진이_이상해요_기획_web.md` (2026-09-03에 이쪽으로 옮김) 및 다른 PRD들.
- 로컬 전용 `browser/admin.html` — `site-content.js` 편집기. **git에 없음** (`.gitignore`). 자세한 건 [HANDOFF.md](docs/HANDOFF.md#2-가져가야-할-것-체크리스트).
