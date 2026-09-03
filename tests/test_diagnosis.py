import random
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image, ImageFilter

from core import diagnosis


def _save_exif_jpeg(path: Path, size=(1200, 900), color=(80, 120, 160), make=None, model=None, dt=None):
    img = Image.new("RGB", size, color=color)
    exif = Image.Exif()
    if make is not None:
        exif[271] = make
    if model is not None:
        exif[272] = model
    if dt is not None:
        exif[306] = dt
    img.save(path, exif=exif.tobytes())


def _save_checkerboard(path: Path, size=(800, 600), cell=20):
    img = Image.new("RGB", size)
    rng = random.Random(0)
    pixels = img.load()
    for y in range(size[1]):
        for x in range(size[0]):
            if (x // cell + y // cell) % 2 == 0:
                pixels[x, y] = (rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255))
            else:
                pixels[x, y] = (0, 0, 0)
    img.save(path, quality=95)


def _save_random_noise(path: Path, size=(300, 300)):
    rng = random.Random(1)
    img = Image.new("L", size)
    img.putdata([rng.randint(0, 255) for _ in range(size[0] * size[1])])
    img.convert("RGB").save(path, quality=95)


def run():
    passed = failed = 0

    def check(label, cond, extra=""):
        nonlocal passed, failed
        print(f"[{'PASS' if cond else 'FAIL'}] {label} {extra}")
        if cond:
            passed += 1
        else:
            failed += 1

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        # 1) 정상 파일 — 촬영기기/촬영일시 EXIF 왕복
        normal_path = tmp / "IMG_0001.jpg"
        _save_exif_jpeg(normal_path, make="Apple", model="iPhone 13 mini", dt="2025:12:31 10:20:30")
        r = diagnosis.diagnose(normal_path)
        check("정상 파일 severity=정상", r["severity"] == "정상", f"실제={r['severity']}")
        check("정상 파일 status=정상", r["status"] == "정상", f"실제={r['status']}")
        check("촬영기기 조합(Make startswith 아님)", r["camera"] == "Apple iPhone 13 mini", f"실제={r['camera']}")
        check("촬영일시 포맷 변환", r["captured_at"] == "2025-12-31 10:20", f"실제={r['captured_at']}")
        check("일반 카메라 사진은 스크린샷 아님", r["is_probable_screenshot"] is False)
        check("색공간 경고 없음(RGB)", r["color_space_warning"] is None)

        # Make만 있고 Model이 Make로 시작하는 경우 중복 방지
        prefixed_path = tmp / "IMG_0002.jpg"
        _save_exif_jpeg(prefixed_path, make="Canon", model="Canon EOS 5D")
        r = diagnosis.diagnose(prefixed_path)
        check("기기명 중복 방지(Model이 Make로 시작)", r["camera"] == "Canon EOS 5D", f"실제={r['camera']}")

        # EXIF 없는 파일은 촬영기기/일시가 None
        no_exif_path = tmp / "no_exif.jpg"
        Image.new("RGB", (800, 600), color=(10, 10, 10)).save(no_exif_path)
        r = diagnosis.diagnose(no_exif_path)
        check("EXIF 없으면 촬영기기 None", r["camera"] is None)
        check("EXIF 없으면 촬영일시 None", r["captured_at"] is None)

        # 2) 확장자 불일치 — PNG를 .jpg로 저장
        mismatch_path = tmp / "fake.jpg"
        Image.new("RGB", (800, 600), color=(0, 100, 200)).save(mismatch_path, format="PNG")
        r = diagnosis.diagnose(mismatch_path)
        check("확장자 불일치 severity=의심", r["severity"] == "의심", f"실제={r['severity']}")
        check("확장자 불일치 status=형식_불일치", r["status"] == "형식_불일치", f"실제={r['status']}")
        check("is_mismatched=True", r["is_mismatched"] is True)

        # 3) 손상 파일 — 정상 JPEG를 잘라냄
        good_path = tmp / "good.jpg"
        Image.new("RGB", (800, 600), color=(0, 200, 0)).save(good_path, format="JPEG")
        corrupted_path = tmp / "corrupted.jpg"
        data = good_path.read_bytes()
        corrupted_path.write_bytes(data[: len(data) // 3])
        r = diagnosis.diagnose(corrupted_path)
        check("손상 파일 severity=손상", r["severity"] == "손상", f"실제={r['severity']}")

        # 4) 이미지가 아닌 파일
        not_image_path = tmp / "note.txt"
        not_image_path.write_text("이것은 사진이 아니라 그냥 텍스트 파일입니다. " * 5, encoding="utf-8")
        r = diagnosis.diagnose(not_image_path)
        check("이미지 아닌 파일 severity=안내", r["severity"] == "안내", f"실제={r['severity']}")
        check("이미지 아닌 파일 메시지", r["message"] == "사진이 아닙니다.", f"실제={r['message']}")
        check("이미지 아닌 파일은 상세 오류를 숨김 대상", r["error_message"] is not None)

        # 5) 저해상도
        thumb_path = tmp / "thumb.jpg"
        Image.new("RGB", (150, 150), color=(200, 0, 0)).save(thumb_path)
        r = diagnosis.diagnose(thumb_path)
        check("저해상도 플래그", r["is_low_resolution"] is True)
        check("저해상도라도 severity는 정상", r["severity"] == "정상", f"실제={r['severity']}")

        # 6) 스크린샷 추정 — 파일명 패턴
        for name in ["스크린샷 2025-12-31 오후 3.12.45.png", "Screenshot_20251231-151245.jpg", "캡쳐.png"]:
            p = tmp / name
            Image.new("RGB", (800, 600), color=(90, 90, 90)).save(p)
            r = diagnosis.diagnose(p)
            check(f"파일명 패턴으로 스크린샷 감지: {name}", r["is_probable_screenshot"] is True)

        # 6-1) 스크린샷 추정 — PNG + EXIF 촬영기기 없음(아이폰 스크린샷 시뮬레이션)
        iphone_shot_path = tmp / "IMG_9999.PNG"
        Image.new("RGB", (1170, 2532), color=(240, 240, 245)).save(iphone_shot_path)
        r = diagnosis.diagnose(iphone_shot_path)
        check("PNG+EXIF없음 조합으로 스크린샷 감지", r["is_probable_screenshot"] is True)
        check("스크린샷은 화질 검사를 건너뜀", r["quality_issues"] == [], f"실제={r['quality_issues']}")

        # 7) 화질 — 블러
        sharp_path = tmp / "sharp.jpg"
        _save_checkerboard(sharp_path)
        r = diagnosis.diagnose(sharp_path)
        check("선명한 사진은 블러 미감지", "블러 추정" not in r["quality_issues"], f"실제={r['quality_issues']}")

        blurry_path = tmp / "blurry.jpg"
        with Image.open(sharp_path) as img:
            img.filter(ImageFilter.GaussianBlur(radius=8)).save(blurry_path, quality=95)
        r = diagnosis.diagnose(blurry_path)
        check("블러 처리된 사진은 블러 감지", "블러 추정" in r["quality_issues"], f"실제={r['quality_issues']}")

        # 7-1) 화질 — 노출 부족/과다, 저대비
        dark_path = tmp / "dark.jpg"
        Image.new("RGB", (800, 600), color=(10, 10, 12)).save(dark_path)
        r = diagnosis.diagnose(dark_path)
        check("어두운 사진은 노출 부족 감지", "노출 부족 추정" in r["quality_issues"], f"실제={r['quality_issues']}")
        check("어두운 사진은 저대비도 감지", "저대비 추정" in r["quality_issues"], f"실제={r['quality_issues']}")

        bright_path = tmp / "bright.jpg"
        Image.new("RGB", (800, 600), color=(250, 250, 248)).save(bright_path)
        r = diagnosis.diagnose(bright_path)
        check("밝은 사진은 노출 과다 감지", "노출 과다 추정" in r["quality_issues"], f"실제={r['quality_issues']}")

        # 7-2) 화질 — 노이즈
        noisy_path = tmp / "noisy.jpg"
        _save_random_noise(noisy_path)
        r = diagnosis.diagnose(noisy_path)
        check("무작위 노이즈 이미지는 노이즈 감지", "노이즈 추정" in r["quality_issues"], f"실제={r['quality_issues']}")

        # 8) 압축폭탄 안전장치 — 오탐이면 손상이 아니라 의심으로 분류
        bomb_path = tmp / "bomb.png"
        Image.new("RGB", (200, 200), color=(50, 60, 70)).save(bomb_path)
        original_limit = Image.MAX_IMAGE_PIXELS
        try:
            Image.MAX_IMAGE_PIXELS = 10_000  # 200*200=40,000 > 2배 한도 → DecompressionBombError
            r = diagnosis.diagnose(bomb_path)
        finally:
            Image.MAX_IMAGE_PIXELS = original_limit
        check("압축폭탄 오탐 severity=의심", r["severity"] == "의심", f"실제={r['severity']}")
        check("압축폭탄 오탐이어도 status는 손상 그대로", r["status"] == "손상", f"실제={r['status']}")

        # 9) 색공간 — CMYK
        cmyk_path = tmp / "cmyk.jpg"
        Image.new("CMYK", (400, 300), color=(10, 10, 10, 0)).save(cmyk_path, format="JPEG")
        r = diagnosis.diagnose(cmyk_path)
        check("CMYK severity=의심", r["severity"] == "의심", f"실제={r['severity']}")
        check("CMYK color_space_warning", r["color_space_warning"] == "CMYK", f"실제={r['color_space_warning']}")

        # 10) 인화 적합성 — 고해상도(12MP급)는 4개 사이즈 전부 고품질
        highres_path = tmp / "highres.jpg"
        Image.new("RGB", (3024, 4032), color=(90, 140, 180)).save(highres_path)
        r = diagnosis.diagnose(highres_path)
        sizes_by_label = {s["size"]: s["level"] for s in r["print_sizes"]}
        check(
            "고해상도는 4개 사이즈 전부 고품질",
            all(level == "고품질" for level in sizes_by_label.values()),
            f"실제={sizes_by_label}",
        )

        # 저해상도(150x150)는 어떤 사이즈도 권장 못 함
        r_thumb = diagnosis.diagnose(thumb_path)
        thumb_sizes = {s["size"]: s["level"] for s in r_thumb["print_sizes"]}
        check(
            "저해상도는 4개 사이즈 전부 권장안함",
            all(level == "권장안함" for level in thumb_sizes.values()),
            f"실제={thumb_sizes}",
        )

        # 화질 이슈(블러) 감지된 파일은 인화 경고도 같이 뜸
        r_blurry = diagnosis.diagnose(blurry_path)
        check(
            "블러 감지되면 인화 경고도 있음",
            r_blurry["print_quality_warning"] is True,
            f"quality_issues={r_blurry['quality_issues']}",
        )

        # 읽을 수 없는 파일(이미지가 아님)은 인화 정보 자체가 없음(None)
        r_not_image = diagnosis.diagnose(not_image_path)
        check("이미지 아닌 파일은 print_sizes가 None", r_not_image["print_sizes"] is None)

        # 10-1) 품질 인증 배지 — 실제 이미지로는 화질 추정 자체(블러/노이즈 등)가
        # 합성 이미지에서 오탐되기 쉬워(예: 단색 이미지는 edge_variance가 0이라
        # 오히려 "블러"로 잡힘), 등급 매핑 로직만 입력을 직접 통제해 독립적으로
        # 검증한다. 화질 추정 정확도 자체는 위 7~7-2번에서 이미 검증됨.
        _sizes = lambda level: [{"size": s, "level": level} for s in ("3x5", "4x6", "5x7", "8x10")]

        cert = diagnosis.certify_quality("정상", False, [], False, _sizes("고품질"))
        check("화질 이슈 없음+4x6 고품질 → 인증 '우수'(인화 적합)", cert is not None and cert["tier"] == "우수", f"실제={cert}")

        cert = diagnosis.certify_quality("정상", False, [], False, _sizes("허용가능"))
        check("화질 이슈 없음+4x6 허용가능 → 인증 '양호'", cert is not None and cert["tier"] == "양호", f"실제={cert}")

        cert = diagnosis.certify_quality("정상", False, ["블러 추정"], False, _sizes("고품질"))
        check("화질 이슈 있으면 해상도 좋아도 인증 '주의'", cert is not None and cert["tier"] == "주의", f"실제={cert}")

        cert = diagnosis.certify_quality("정상", False, [], True, _sizes("고품질"))
        check("저해상도 플래그면 인증 '주의'", cert is not None and cert["tier"] == "주의", f"실제={cert}")

        cert = diagnosis.certify_quality("정상", False, [], False, _sizes("권장안함"))
        check("4x6 권장안함이면 인증 '주의'", cert is not None and cert["tier"] == "주의", f"실제={cert}")

        check("의심(확장자 불일치 등)이어도 화질 이슈 없으면 인증됨", diagnosis.certify_quality("의심", False, [], False, _sizes("고품질")) is not None)
        check("손상(부분손상 포함)이면 readable이어도 인증 없음(None)", diagnosis.certify_quality("손상", False, [], False, _sizes("고품질")) is None)
        check("스크린샷은 인증 없음(None)", diagnosis.certify_quality("정상", True, [], False, _sizes("고품질")) is None)
        check("print_sizes 없으면 인증 없음(None)", diagnosis.certify_quality("정상", False, [], False, None) is None)

        # 실제 diagnose() 파이프라인 결과에서도 손상/읽기불가/스크린샷은 인증이 안 붙는지 확인
        check("읽을 수 없는 파일은 인증 자체가 없음(None)", r_not_image["certification"] is None)
        r_screenshot = diagnosis.diagnose(iphone_shot_path)
        check("스크린샷은 인증 대상이 아님(None)", r_screenshot["certification"] is None)

        # 11) 미리보기 — 정상/부분손상 파일은 data URI, 읽을 수 없는 파일은 None
        check(
            "정상 파일은 미리보기 data URI가 있음",
            r["preview"] is not None and r["preview"].startswith("data:image/jpeg;base64,"),
            f"실제 접두={r['preview'][:30] if r['preview'] else None}",
        )
        r_corrupted_preview = diagnosis.diagnose(corrupted_path)
        check(
            "부분손상 파일도 깨진 부분 그대로 미리보기가 있음",
            r_corrupted_preview["preview"] is not None,
        )
        check(
            "부분손상 파일은 미리보기가 있어도(readable) 인증은 없음(severity=손상)",
            r_corrupted_preview["certification"] is None,
            f"severity={r_corrupted_preview['severity']}",
        )
        check("이미지 아닌 파일은 미리보기가 없음(None)", r_not_image["preview"] is None)

    print(f"\n총 {passed + failed}개 중 {passed}개 통과, {failed}개 실패")
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
