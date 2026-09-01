"""
core/diagnosis.py

"사진이 이상해요" 웹버전 1차 기능. core/analyzer.py의 파일 진단 결과에
심각도(심각/경미/정상) 분류와 저해상도 판정을 얹어, 화면(JS)이 그대로
쓸 수 있는 JSON-직렬화 가능한 dict를 만든다.

기준: 사진이_이상해요_기획.md
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from core.analyzer import analyze_file
from models.file_info import FileInfo, FileStatus

# EXIF IFD0 태그 ID(analyzer.py가 img.getexif()로 뽑아 문자열 키로 저장한 것).
# DateTimeOriginal(36867)은 Exif SubIFD에 있어 지금 추출 방식(플랫 IFD0)으로는
# 안 잡히므로, IFD0의 "DateTime"(파일 변경일시) 태그로 대신한다 — 카메라가 찍은
# 원본 파일은 보통 둘이 같아서 실용적으로는 충분하다.
_EXIF_TAG_MAKE = "271"
_EXIF_TAG_MODEL = "272"
_EXIF_TAG_DATETIME = "306"

# 사진이_이상해요_기획.md "저해상도" 기준: 총 픽셀수(가로x세로) 30만 px 미만.
# 실제 폰 사진(보통 수백만~1천만 px)은 안 걸리고, 옛 안드로이드 썸네일 캐시
# (보통 100x100~320x240대)만 걸러지도록 잡은 값.
LOW_RESOLUTION_PIXEL_THRESHOLD = 300_000

# 사진이_이상해요_기획.md "🔴 심각" 표에 속하는 상태들.
# NOT_AN_IMAGE는 제외 — "사진에 문제가 있음"이 아니라 "애초에 사진을 고르지
# 않음"이라 성격이 달라서 별도 severity("안내")로 뺀다.
_SEVERE_STATUSES = {
    FileStatus.CORRUPTED,
    FileStatus.PARTIAL_CORRUPTION,
    FileStatus.UNSUPPORTED,
    FileStatus.UNKNOWN,
    FileStatus.MISMATCH,  # 열리긴 하지만 "확장자 때문에 안 열린다"는 오해를 부르는 케이스라 심각 쪽에 둠
}

_STATUS_MESSAGES = {
    FileStatus.NORMAL: "정상적으로 열리는 사진입니다.",
    FileStatus.MISMATCH: "확장자가 실제 형식과 다릅니다. 확장자만 바꾸면 정상적으로 열립니다.",
    FileStatus.PARTIAL_CORRUPTION: "파일 일부가 손상되어 이미지의 일부만 보입니다.",
    FileStatus.CORRUPTED: "파일이 손상되어 열 수 없습니다.",
    FileStatus.UNSUPPORTED: "PicMedic이 아직 지원하지 않는 형식입니다.",
    FileStatus.NOT_AN_IMAGE: "사진이 아닙니다.",
    FileStatus.UNKNOWN: "파일을 확인할 수 없습니다.",
    FileStatus.RECOVERED: "복구가 완료된 파일입니다.",
}


def is_low_resolution(info: FileInfo) -> bool:
    if not info.width or not info.height:
        return False
    return info.width * info.height < LOW_RESOLUTION_PIXEL_THRESHOLD


# 파일명 패턴 기반 "추정"일 뿐, 정확한 판별이 아니다 — PHASE2_사진정리_기획.md
# "스크린샷 따로 묶기"와 같은 한계: 아이폰은 카메라 사진도 스크린샷도 똑같이
# IMG_XXXX라 파일명만으로는 구분 신호가 없음. 안드로이드/윈도우/맥의 기본
# 캡처 파일명 규칙만 잡는다.
_SCREENSHOT_FILENAME_PATTERNS = [
    re.compile(r"screenshot", re.IGNORECASE),
    re.compile(r"screen[\s_-]?shot", re.IGNORECASE),
    re.compile(r"스크린샷"),
    re.compile(r"캡[처쳐]"),
]


def is_probable_screenshot(info: FileInfo) -> bool:
    return any(pattern.search(info.filename) for pattern in _SCREENSHOT_FILENAME_PATTERNS)


def camera_label(info: FileInfo) -> str | None:
    """"촬영 기기" 한 줄 요약. 둘 다 없으면 None(스크린샷/다운로드 파일 등 흔함)."""
    make = str(info.metadata.get(_EXIF_TAG_MAKE, "")).strip()
    model = str(info.metadata.get(_EXIF_TAG_MODEL, "")).strip()
    if make and model:
        return model if model.lower().startswith(make.lower()) else f"{make} {model}"
    return make or model or None


def captured_at(info: FileInfo) -> str | None:
    """"촬영 일시". EXIF DateTime 포맷(YYYY:MM:DD HH:MM:SS)을 사람이 읽기 쉽게 변환."""
    raw = info.metadata.get(_EXIF_TAG_DATETIME)
    if not raw:
        return None
    try:
        parsed = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    return parsed.strftime("%Y-%m-%d %H:%M")


def classify_severity(info: FileInfo) -> str:
    if info.status == FileStatus.NOT_AN_IMAGE:
        return "안내"
    if info.status in _SEVERE_STATUSES:
        return "심각"
    if is_low_resolution(info):
        return "경미"
    return "정상"


def diagnose(path: str | Path) -> dict:
    info = analyze_file(path)
    severity = classify_severity(info)
    low_res = is_low_resolution(info)
    screenshot = is_probable_screenshot(info) if info.status != FileStatus.UNKNOWN else False

    message = _STATUS_MESSAGES.get(info.status, info.status.value)
    if severity == "경미" and info.status == FileStatus.NORMAL:
        message = "정상적으로 열리지만 해상도가 낮습니다."

    return {
        "filename": info.filename,
        "path": info.path,
        "extension": info.extension,
        "detected_format": info.detected_format,
        "status": info.status.value,
        "severity": severity,
        "message": message,
        "readable": info.readable,
        "is_mismatched": info.is_mismatched,
        "is_low_resolution": low_res,
        "is_probable_screenshot": screenshot,
        "camera": camera_label(info),
        "captured_at": captured_at(info),
        "width": info.width,
        "height": info.height,
        "file_size": info.file_size,
        "error_message": info.error_message,
    }
