"""
main.py

PicMedic 웹버전 진입점. 서버를 띄우지 않고, OS 내장 웹뷰(Windows WebView2 /
macOS WebKit)를 pywebview로 직접 띄운다 — PLATFORM_EXPANSION.md에서 채택한
"로컬 상주 + 웹 UI" 방향.

1차 프로토타입: "사진이 이상해요" — 파일 하나를 선택해 진단 결과를 보여준다.
"""

from __future__ import annotations

from pathlib import Path

import webview

from core.diagnosis import diagnose

WEB_DIR = Path(__file__).resolve().parent / "web"

IMAGE_FILE_TYPES = (
    "이미지 파일 (*.jpg;*.jpeg;*.png;*.heic;*.heif;*.webp;*.gif;*.tiff;*.tif;*.bmp)",
    "모든 파일 (*.*)",
)


class Api:
    """JS에서 window.pywebview.api.<method>()로 호출하는 파이썬 쪽 브릿지."""

    def pick_and_diagnose(self) -> dict | None:
        window = webview.windows[0]
        selected = window.create_file_dialog(webview.OPEN_DIALOG, file_types=IMAGE_FILE_TYPES)
        if not selected:
            return None
        return diagnose(selected[0])

    def diagnose_path(self, path: str) -> dict:
        return diagnose(path)


def main() -> None:
    api = Api()
    webview.create_window(
        "PicMedic Web — 사진이 이상해요",
        str(WEB_DIR / "index.html"),
        js_api=api,
        width=560,
        height=680,
        min_size=(420, 480),
        background_color="#F1F8F5",
    )
    webview.start()


if __name__ == "__main__":
    main()
