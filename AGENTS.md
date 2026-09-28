# AGENTS.md — 이 저장소에서 작업하는 AI/개발자용 규칙

먼저 읽기: [README.md](README.md) → [docs/HANDOFF.md](docs/HANDOFF.md) → 필요 시 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DECISIONS.md](docs/DECISIONS.md)

## 프로젝트 한 줄
PicMedic Web — 사진 진단/변환/라이브포토 도구. **`browser/`가 실서비스** (정적 사이트, 빌드 없음, GitHub Pages 자동 배포).

## 절대 규칙
1. **사용자 사진·파일을 외부로 전송하는 코드 금지.** 서버 업로드, 분석/추적 스크립트, 쿠키 추가 금지. (추가해야 한다면 `privacy-policy.html`을 먼저 고쳐야 하고 사용자 확인 필수)
2. **`browser/admin.html` 커밋 금지.** `.gitignore`에 있음. 로컬 전용.
3. **`main` push = 즉시 운영 배포.** `browser/**` 변경은 로컬에서 확인 후 push.
4. 비밀값/API 키 없음. 추가하지 말 것.

## 코드 수정 규칙
- **텍스트 수정 시 한국어(`innerHTML`)와 영어(`data-en`) 둘 다** 고친다. `data-en` 안의 HTML은 `&lt;` 등으로 이스케이프.
- **내비/푸터/테마·언어 토글은 7개 HTML에 복붙돼 있다.** 하나 고치면 전부 고친다.
- JS는 ES 모듈이 아니라 전역 공유. **`<script>` 로드 순서 바꾸지 말 것.** 전역 이름 충돌 주의 (ARCHITECTURE.md 참고).
- 사업자정보·문의 이메일·FAQ·페이지 하단 안내문은 HTML이 아니라 **`browser/site-content.js`** 에서 고친다.
- 판정 문구는 단정하지 말고 "~추정" 유지. 배지 체계(정상/의심/손상/안내) 유지.
- 색상은 데스크톱 `gui/theme.py`와 같은 팔레트. 임의로 바꾸지 말 것.
- 진단 임계값을 바꾸면 파이썬판 `core/diagnosis.py`(와 원본 `PicMedic` 저장소)와 어긋난다 → 의도한 거면 DECISIONS.md에 기록.
- 주석 관례: 왜 그렇게 했는지 + 날짜 + (사용자 요청이면 그렇게 표시). 한국어.
- 커밋 메시지: 한국어.

## 확인 방법
```bash
cd browser && python -m http.server 8000     # 브라우저로 http://localhost:8000 확인
python tests/test_diagnosis.py               # 파이썬판 (모두 [PASS])
```
브라우저 JS 자동 테스트는 없음 → 수정한 페이지를 직접 열어 다크/라이트, 한/영 토글까지 확인.

## 결정을 내리면
`docs/DECISIONS.md` 표에 한 줄 추가. 상태가 바뀌면 `docs/HANDOFF.md` 1·3절 갱신.
