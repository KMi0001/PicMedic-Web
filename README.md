# PicMedic Web

PicMedic 데스크톱 앱(PySide6)의 웹버전. 방향/의사결정 배경은 원본 저장소의
[PLATFORM_EXPANSION.md](../PicMedic/PLATFORM_EXPANSION.md) 참고.

## 채택된 방향

서버 없는 **pywebview 기반 "로컬 상주 + 웹 UI"**. OS 내장 웹뷰(Windows
WebView2 / macOS WebKit)를 파이썬이 띄우고, 화면은 HTML/CSS/JS로 새로
작성한다. 진단·복구 로직(`core/`, `models/`, `utils/`)은 원본 앱에서 그대로
가져왔다 — Qt 의존성이 없는 순수 Python이라 수정 없이 재사용.

## core/ 동기화

지금은 원본 저장소(`../PicMedic`)의 `core/`, `models/`, `utils/`를 복사해온
상태(단일 소스 아님). 두 프로젝트 중 하나에서 로직을 고치면 다른 쪽에는
수동으로 반영해야 한다. 웹버전이 자리 잡으면 git submodule 또는 별도
pip 패키지로 전환 검토.

## 실행

```
pip install -r requirements.txt
python main.py
```

## 테스트

```
python tests/test_diagnosis.py
```
모두 [PASS]로 통과해야 합니다. pytest 없이 원본 저장소와 동일한 방식(직접
실행 + PASS/FAIL 출력)으로 작성돼 있음.

## 상태

1차 기능 "사진이 이상해요"(단일 파일 진단) 구현 중. 상세 판정 기준은
[사진이_이상해요_기획.md](사진이_이상해요_기획.md) 참고.
