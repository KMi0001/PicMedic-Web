"""
core/diagnosis.py

"사진이 이상해요" 웹버전 1차 기능. core/analyzer.py의 파일 진단 결과에
심각도(심각/경미/정상) 분류와 저해상도 판정을 얹어, 화면(JS)이 그대로
쓸 수 있는 JSON-직렬화 가능한 dict를 만든다.

기준: 사진이_이상해요_기획.md
"""

from __future__ import annotations

from pathlib import Path

from core.analyzer import analyze_file
from models.file_info import FileInfo, FileStatus

# 사진이_이상해요_기획.md "저해상도" 기준: 총 픽셀수(가로x세로) 30만 px 미만.
# 실제 폰 사진(보통 수백만~1천만 px)은 안 걸리고, 옛 안드로이드 썸네일 캐시
# (보통 100x100~320x240대)만 걸러지도록 잡은 값.
LOW_RESOLUTION_PIXEL_THRESHOLD = 300_000

# 사진이_이상해요_기획.md "🔴 심각" 표에 속하는 상태들.
_SEVERE_STATUSES = {
    FileStatus.CORRUPTED,
    FileStatus.PARTIAL_CORRUPTION,
    FileStatus.NOT_AN_IMAGE,
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
    FileStatus.NOT_AN_IMAGE: "이미지 파일로 보이지 않습니다.",
    FileStatus.UNKNOWN: "파일을 확인할 수 없습니다.",
    FileStatus.RECOVERED: "복구가 완료된 파일입니다.",
}


def is_low_resolution(info: FileInfo) -> bool:
    if not info.width or not info.height:
        return False
    return info.width * info.height < LOW_RESOLUTION_PIXEL_THRESHOLD


def classify_severity(info: FileInfo) -> str:
    if info.status in _SEVERE_STATUSES:
        return "심각"
    if is_low_resolution(info):
        return "경미"
    return "정상"


def diagnose(path: str | Path) -> dict:
    info = analyze_file(path)
    severity = classify_severity(info)
    low_res = is_low_resolution(info)

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
        "width": info.width,
        "height": info.height,
        "file_size": info.file_size,
        "error_message": info.error_message,
    }
