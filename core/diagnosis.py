"""
core/diagnosis.py

"사진이 이상해요" 웹버전 1차 기능. core/analyzer.py의 파일 진단 결과에
심각도(손상/의심/정상/안내) 분류와 저해상도·화질 판정을 얹어, 화면(JS)이
그대로 쓸 수 있는 JSON-직렬화 가능한 dict를 만든다.

기준: 사진이_이상해요_기획.md
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

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

# severity 배지는 파일 상태(열리는지/손상됐는지)만 반영한다 — 화질(블러/노출/
# 대비)이나 저해상도는 "화질 확인"/"저해상도" 항목에서 별도로 보여주므로
# 배지 판정에는 관여하지 않는다.
#
# "손상" — 실제로 못 열리거나 확인 불가한 상태.
_DAMAGE_STATUSES = {
    FileStatus.CORRUPTED,
    FileStatus.PARTIAL_CORRUPTION,
    FileStatus.UNSUPPORTED,
    FileStatus.UNKNOWN,
}

# "의심" — 열리긴 하지만 확장자가 실제 형식과 달라 "이 파일이 맞는지 의심되는" 상태.
_SUSPECT_STATUSES = {
    FileStatus.MISMATCH,
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


# 아래 세 기준(블러/노출/저대비)은 전부 임계값 기반 휴리스틱 — 오탐(의도적
# 보케를 블러로, 야경을 노출부족으로 오판 등)이 있을 수 있음. 그래서 항상
# "추정"을 붙여 표시한다.
QUALITY_ANALYSIS_MAX_SIDE = 512  # 분석용으로 축소하는 한 변 최대 길이(속도용, 정확도 영향 적음)

# 실제 아이폰 사진(선명) 기준 edge_var≈2100, 가우시안 블러 radius=1(살짝 흐림)
# 적용 시 ≈450, radius=2 이상은 ≈180~200으로 수렴하는 걸 실측해 400으로 잡음.
BLUR_EDGE_VARIANCE_THRESHOLD = 400.0
DARK_MEAN_THRESHOLD = 50.0       # 0~255 밝기 스케일
BRIGHT_MEAN_THRESHOLD = 205.0
LOW_CONTRAST_STDDEV_THRESHOLD = 20.0

# 미디언 필터(잡음 제거에 강하고 실제 경계선은 비교적 보존)로 노이즈를 제거한
# 뒤, 원본과의 차이(잔차)가 크면 노이즈로 추정한다. 다른 세 기준과 달리
# QUALITY_ANALYSIS_MAX_SIDE로 축소된 이미지가 아니라 원본에서 뽑은 중앙
# 크롭으로 계산한다 — 리사이즈용 리샘플링 필터가 픽셀 단위 노이즈를 뭉개버려서
# (실측: 노이즈를 강하게 주입해도 축소 후엔 거의 그대로였음) 축소본으로는
# 감지가 안 됐음. 실측(실제 사진 + 가우시안 노이즈 주입, sigma=표준편차):
# 원본(노이즈 없음)≈2.7, sigma=5(약함)≈3.4, sigma=10(중간)≈5.1, sigma=20(강함)≈8.9.
NOISE_CROP_SIZE = 400
NOISE_RESIDUAL_STDDEV_THRESHOLD = 5.0


def _center_crop(img: Image.Image, size: int) -> Image.Image:
    w, h = img.size
    cw, ch = min(size, w), min(size, h)
    left = (w - cw) // 2
    top = (h - ch) // 2
    return img.crop((left, top, left + cw, top + ch))


def assess_quality_issues(path: Path) -> list[str]:
    """블러/노출/저대비/노이즈를 그레이스케일 통계로 추정. 실패하면 조용히 빈 목록."""
    issues: list[str] = []
    try:
        with Image.open(path) as img:
            full_gray = img.convert("L")

            noise_sample = _center_crop(full_gray, NOISE_CROP_SIZE)
            denoised = noise_sample.filter(ImageFilter.MedianFilter(size=3))
            residual = ImageChops.difference(noise_sample, denoised)
            noise_stddev = ImageStat.Stat(residual).stddev[0]

            gray = full_gray.copy()
            gray.thumbnail((QUALITY_ANALYSIS_MAX_SIDE, QUALITY_ANALYSIS_MAX_SIDE))

            brightness = ImageStat.Stat(gray)
            mean = brightness.mean[0]
            stddev = brightness.stddev[0]

            edges = gray.filter(ImageFilter.FIND_EDGES)
            edge_variance = ImageStat.Stat(edges).var[0]

            if edge_variance < BLUR_EDGE_VARIANCE_THRESHOLD:
                issues.append("블러 추정")
            if mean < DARK_MEAN_THRESHOLD:
                issues.append("노출 부족 추정")
            elif mean > BRIGHT_MEAN_THRESHOLD:
                issues.append("노출 과다 추정")
            if stddev < LOW_CONTRAST_STDDEV_THRESHOLD:
                issues.append("저대비 추정")
            if noise_stddev > NOISE_RESIDUAL_STDDEV_THRESHOLD:
                issues.append("노이즈 추정")
    except Exception:
        pass
    return issues


# "추정"일 뿐, 정확한 판별이 아니다 — PHASE2_사진정리_기획.md "스크린샷 따로
# 묶기"와 같은 한계. 두 가지 신호를 OR로 조합한다:
# 1) 파일명 패턴 — 안드로이드/윈도우/맥의 기본 캡처 파일명 규칙.
#    아이폰은 카메라 사진도 스크린샷도 똑같이 IMG_XXXX라 이 신호가 안 먹힘.
# 2) PNG 형식 + 촬영기기(EXIF Make/Model) 없음 — 아이폰은 스크린샷이 항상 PNG고
#    카메라로 찍은 게 아니라서 EXIF에 기기 정보가 없음(반면 카메라 사진은
#    HEIC/JPEG + 기기 정보 있음). 다만 인터넷에서 받은 PNG(짤방 등)도 이
#    조건에 걸려 오탐될 수 있고, 안드로이드는 스크린샷도 JPG인 경우가 많아
#    이 신호가 덜 유효함.
_SCREENSHOT_FILENAME_PATTERNS = [
    re.compile(r"screenshot", re.IGNORECASE),
    re.compile(r"screen[\s_-]?shot", re.IGNORECASE),
    re.compile(r"스크린샷"),
    re.compile(r"캡[처쳐]"),
]


def is_probable_screenshot(info: FileInfo) -> bool:
    if any(pattern.search(info.filename) for pattern in _SCREENSHOT_FILENAME_PATTERNS):
        return True
    return info.detected_format == "PNG" and camera_label(info) is None


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
    if info.status in _DAMAGE_STATUSES:
        return "손상"
    if info.status in _SUSPECT_STATUSES:
        return "의심"
    return "정상"


def diagnose(path: str | Path) -> dict:
    path = Path(path)
    info = analyze_file(path)
    low_res = is_low_resolution(info)
    severity = classify_severity(info)
    screenshot = is_probable_screenshot(info) if info.status != FileStatus.UNKNOWN else False
    # 손상/미지원 등으로 애초에 안 열리는 파일은 품질 분석할 대상이 없고,
    # 스크린샷은 "사진 화질"이라는 개념 자체가 안 맞아 예외로 둔다(화면 캡처
    # 특유의 안티앨리어싱/UI 배색이 블러·노출·대비 판정을 왜곡하기도 함).
    quality_issues = assess_quality_issues(path) if info.readable and not screenshot else []

    message = _STATUS_MESSAGES.get(info.status, info.status.value)

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
        "quality_issues": quality_issues,
        "camera": camera_label(info),
        "captured_at": captured_at(info),
        "width": info.width,
        "height": info.height,
        "file_size": info.file_size,
        "error_message": info.error_message,
    }
