/*
 * diagnose.js
 *
 * "사진이 이상해요" 브라우저판 진단 로직. core/diagnosis.py + core/detector.py를
 * 서버 없이 브라우저 안에서 돌아가도록 자바스크립트로 이식한 것.
 *
 * 파이썬판과의 주요 차이 (README 참고):
 * - EXIF(촬영기기/촬영일시)는 이번 1차에 포함 안 함 → 스크린샷 감지는
 *   파일명 패턴만 사용(PNG+EXIF없음 신호는 없음).
 * - CMYK 색공간 감지, 압축폭탄 안전장치 재분류는 Pillow 전용 개념이라 미포함.
 * - 손상 판정이 파이썬판보다 거칠 수 있음 — 브라우저는 Pillow의 "손상 허용
 *   모드"처럼 부분 디코딩을 세밀하게 구분하지 못하고, 디코딩 성공/실패
 *   둘 중 하나로만 판단됨.
 */

// ---------------------------------------------------------------------------
// 1. 형식 판별 (core/detector.py 이식)
// ---------------------------------------------------------------------------

const HEIF_BRANDS = {
  heic: "HEIC", heix: "HEIC", heim: "HEIC", heis: "HEIC",
  hevc: "HEIC", hevx: "HEIC",
  hevm: "HEIF", hevs: "HEIF", mif1: "HEIF", msf1: "HEIF",
  avif: "AVIF", avis: "AVIF",
};

const SIMPLE_SIGNATURES = [
  { bytes: [0xff, 0xd8, 0xff], format: "JPEG" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], format: "PNG" },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], format: "GIF" },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], format: "GIF" },
  { bytes: [0x42, 0x4d], format: "BMP" },
  { bytes: [0x49, 0x49, 0x2a, 0x00], format: "TIFF" },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], format: "TIFF" },
];

const EXPECTED_FORMAT_BY_EXTENSION = {
  ".jpg": ["JPEG"], ".jpeg": ["JPEG"], ".png": ["PNG"],
  ".heic": ["HEIC"], ".heif": ["HEIF", "HEIC"],
  ".webp": ["WEBP"], ".gif": ["GIF"],
  ".tiff": ["TIFF"], ".tif": ["TIFF"], ".bmp": ["BMP"],
};

// 이 브라우저(Canvas/<img>)가 실제로 그릴 수 있는 형식. TIFF는 Pillow는
// 지원하지만 대부분의 브라우저가 <img>로 못 그려서 여기선 미지원 처리.
const BROWSER_DECODABLE_FORMATS = new Set(["JPEG", "PNG", "GIF", "BMP", "WEBP", "HEIC", "HEIF"]);

function bytesToAscii(bytes, start, end) {
  let s = "";
  for (let i = start; i < end && i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function bytesStartWith(bytes, prefix) {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

function detectHeifBrand(bytes) {
  if (bytes.length < 12) return null;
  if (bytesToAscii(bytes, 4, 8) !== "ftyp") return null;
  const brand = bytesToAscii(bytes, 8, 12).toLowerCase().trim();
  return HEIF_BRANDS[brand] || null;
}

function detectFormat(bytes) {
  const heif = detectHeifBrand(bytes);
  if (heif) return heif;

  if (bytesToAscii(bytes, 0, 4) === "RIFF" && bytesToAscii(bytes, 8, 12) === "WEBP") {
    return "WEBP";
  }

  for (const sig of SIMPLE_SIGNATURES) {
    if (bytesStartWith(bytes, sig.bytes)) return sig.format;
  }
  return null;
}

function extensionOf(filename) {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function isSupportedExtension(extension) {
  return Object.prototype.hasOwnProperty.call(EXPECTED_FORMAT_BY_EXTENSION, extension);
}

function extensionMatchesFormat(extension, detectedFormat) {
  if (!detectedFormat) return false;
  const expected = EXPECTED_FORMAT_BY_EXTENSION[extension];
  return !!expected && expected.includes(detectedFormat);
}

// 확장자만 이미지처럼 보이는데 시그니처가 없을 때, 텍스트 파일인지 추정.
// (core/analyzer.py::_looks_like_non_image 이식 — 인코딩별 디코딩 대신
// 출력 가능 ASCII 비율로 단순화)
function looksLikeNonImage(bytes) {
  if (bytes.length === 0) return true;
  let printable = 0;
  for (const b of bytes) {
    if ((b >= 32 && b < 127) || b === 9 || b === 10 || b === 13) printable++;
  }
  return printable / bytes.length > 0.9;
}

// ---------------------------------------------------------------------------
// 2. 파일 → Canvas 디코딩
// ---------------------------------------------------------------------------

async function readHeadBytes(file, n = 64) {
  const buf = await file.slice(0, n).arrayBuffer();
  return new Uint8Array(buf);
}

function decodeStandardToCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 디코딩할 수 없습니다."));
    };
    img.src = url;
  });
}

// libheif-js(UMD/전역 스크립트판)는 window.libheif()를 호출하면 Emscripten
// Module 객체를 즉시 돌려주지만, WASM 컴파일이 끝나기 전엔 HeifDecoder 같은
// 고수준 클래스가 아직 안 붙어있다. 별도 ready 프로미스가 없어서 폴링으로 기다린다.
let _libheifModulePromise = null;

function getLibheifModule() {
  if (!_libheifModulePromise) {
    const mod = window.libheif();
    _libheifModulePromise = (async () => {
      const start = Date.now();
      while (typeof mod.HeifDecoder !== "function") {
        if (Date.now() - start > 8000) {
          throw new Error("HEIC 디코더 초기화 시간이 초과되었습니다.");
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return mod;
    })();
  }
  return _libheifModulePromise;
}

async function decodeHeicToCanvas(file) {
  const heif = await getLibheifModule();
  const buf = new Uint8Array(await file.arrayBuffer());
  const decoder = new heif.HeifDecoder();
  const images = decoder.decode(buf);
  if (!images || images.length === 0) {
    throw new Error("HEIC 이미지를 찾을 수 없습니다.");
  }
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  await new Promise((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) {
        reject(new Error("HEIC 디코딩에 실패했습니다."));
        return;
      }
      resolve();
    });
  });
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function decodeToCanvas(file, detectedFormat) {
  if (detectedFormat === "HEIC" || detectedFormat === "HEIF") {
    return decodeHeicToCanvas(file);
  }
  return decodeStandardToCanvas(file);
}

// ---------------------------------------------------------------------------
// 3. 화질 분석 (core/diagnosis.py::assess_quality_issues 이식)
// ---------------------------------------------------------------------------

const QUALITY_ANALYSIS_MAX_SIDE = 512;
const BLUR_EDGE_VARIANCE_THRESHOLD = 400;
const DARK_MEAN_THRESHOLD = 50;
const BRIGHT_MEAN_THRESHOLD = 205;
const LOW_CONTRAST_STDDEV_THRESHOLD = 20;
const NOISE_CROP_SIZE = 400;
const NOISE_RESIDUAL_STDDEV_THRESHOLD = 5.0;

function drawScaled(sourceCanvas, maxSide) {
  const { width, height } = sourceCanvas;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(sourceCanvas, 0, 0, w, h);
  return canvas;
}

function drawCenterCrop(sourceCanvas, size) {
  const { width, height } = sourceCanvas;
  const cw = Math.min(size, width);
  const ch = Math.min(size, height);
  const left = Math.floor((width - cw) / 2);
  const top = Math.floor((height - ch) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext("2d").drawImage(sourceCanvas, left, top, cw, ch, 0, 0, cw, ch);
  return canvas;
}

function toGrayscale(canvas) {
  const { width, height } = canvas;
  const { data } = canvas.getContext("2d").getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { gray, width, height };
}

function meanStddev(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  const mean = sum / arr.length;
  let sq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mean;
    sq += d * d;
  }
  return { mean, variance: sq / arr.length, stddev: Math.sqrt(sq / arr.length) };
}

// Pillow ImageFilter.FIND_EDGES와 동일한 3x3 커널.
function edgeVariance(gray, width, height) {
  if (width < 3 || height < 3) return 0;
  const edges = new Float32Array((width - 2) * (height - 2));
  let p = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = y * width + x;
      const sum =
        -gray[c - width - 1] - gray[c - width] - gray[c - width + 1] +
        -gray[c - 1] + 8 * gray[c] - gray[c + 1] +
        -gray[c + width - 1] - gray[c + width] - gray[c + width + 1];
      edges[p++] = sum;
    }
  }
  return meanStddev(edges).variance;
}

// 3x3 미디언 필터. NOISE_CROP_SIZE가 작아서(최대 400x400) 성능 문제 없음.
function medianFilter3x3(gray, width, height) {
  const out = new Float32Array(width * height);
  const win = new Float32Array(9);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          win[k++] = gray[yy * width + xx];
        }
      }
      win.sort();
      out[y * width + x] = win[4];
    }
  }
  return out;
}

function assessQualityIssues(fullCanvas) {
  const issues = [];

  // 노이즈 — 축소본이 아니라 원본 중앙 크롭으로 계산 (리샘플링이 픽셀
  // 노이즈를 지워버리는 문제, core/diagnosis.py에서 실측으로 확인된 것과 동일).
  const noiseCrop = drawCenterCrop(fullCanvas, NOISE_CROP_SIZE);
  const { gray: noiseGray, width: nw, height: nh } = toGrayscale(noiseCrop);
  const denoised = medianFilter3x3(noiseGray, nw, nh);
  let residualSq = 0;
  for (let i = 0; i < noiseGray.length; i++) {
    const d = Math.abs(noiseGray[i] - denoised[i]);
    residualSq += d * d;
  }
  const noiseStddev = Math.sqrt(residualSq / noiseGray.length);

  const scaled = drawScaled(fullCanvas, QUALITY_ANALYSIS_MAX_SIDE);
  const { gray, width, height } = toGrayscale(scaled);
  const { mean, stddev } = meanStddev(gray);
  const edgeVar = edgeVariance(gray, width, height);

  if (edgeVar < BLUR_EDGE_VARIANCE_THRESHOLD) issues.push("블러 추정");
  if (mean < DARK_MEAN_THRESHOLD) issues.push("노출 부족 추정");
  else if (mean > BRIGHT_MEAN_THRESHOLD) issues.push("노출 과다 추정");
  if (stddev < LOW_CONTRAST_STDDEV_THRESHOLD) issues.push("저대비 추정");
  if (noiseStddev > NOISE_RESIDUAL_STDDEV_THRESHOLD) issues.push("노이즈 추정");

  return issues;
}

// ---------------------------------------------------------------------------
// 4. 스크린샷 추정 (파일명 패턴만 — EXIF 미포함이라 core/diagnosis.py보다 약함)
// ---------------------------------------------------------------------------

const SCREENSHOT_FILENAME_PATTERNS = [
  /screenshot/i,
  /screen[\s_-]?shot/i,
  /스크린샷/,
  /캡[처쳐]/,
];

function isProbableScreenshot(filename) {
  return SCREENSHOT_FILENAME_PATTERNS.some((re) => re.test(filename));
}

// ---------------------------------------------------------------------------
// 5. 저해상도 / 인화 적합성 (core/diagnosis.py 이식, 로직 동일)
// ---------------------------------------------------------------------------

const LOW_RESOLUTION_PIXEL_THRESHOLD = 300_000;

function isLowResolution(width, height) {
  if (!width || !height) return false;
  return width * height < LOW_RESOLUTION_PIXEL_THRESHOLD;
}

const PRINT_SIZES_INCHES = [
  ["3x5", 3, 5],
  ["4x6", 4, 6],
  ["5x7", 5, 7],
  ["8x10", 8, 10],
];
const PRINT_DPI_HIGH = 300;
const PRINT_DPI_MIN = 150;

function printSuitability(width, height) {
  if (!width || !height) return null;
  const imgLong = Math.max(width, height);
  const imgShort = Math.min(width, height);

  return PRINT_SIZES_INCHES.map(([label, a, b]) => {
    const sizeLong = Math.max(a, b);
    const sizeShort = Math.min(a, b);
    let level;
    if (imgLong >= sizeLong * PRINT_DPI_HIGH && imgShort >= sizeShort * PRINT_DPI_HIGH) {
      level = "고품질";
    } else if (imgLong >= sizeLong * PRINT_DPI_MIN && imgShort >= sizeShort * PRINT_DPI_MIN) {
      level = "허용가능";
    } else {
      level = "권장안함";
    }
    return { size: label, level };
  });
}

// ---------------------------------------------------------------------------
// 5-1. 화질 인증 배지 (core/diagnosis.py::certify_quality 이식)
// ---------------------------------------------------------------------------

const CERT_TIERS = {
  우수: { label: "인화 적합", icon: "🏅" },
  양호: { label: "양호", icon: "✅" },
  주의: { label: "주의 필요", icon: "⚠️" },
};

function certifyQuality(readable, screenshot, qualityIssues, lowRes, printSizes) {
  if (!readable || screenshot || !printSizes) return null;

  const standard = printSizes.find((s) => s.size === "4x6") || null;
  const hasIssues = qualityIssues.length > 0;

  let tier;
  if (hasIssues || lowRes || !standard || standard.level === "권장안함") {
    tier = "주의";
  } else if (standard.level === "고품질") {
    tier = "우수";
  } else {
    tier = "양호";
  }

  return { tier, ...CERT_TIERS[tier] };
}

// ---------------------------------------------------------------------------
// 6. 총평 문구 조립 (core/diagnosis.py::_extra_notes / _append_notes 이식)
// ---------------------------------------------------------------------------

function extraNotes(lowRes, qualityIssues, screenshot) {
  const notes = [];
  if (screenshot) notes.push("스크린샷");
  if (lowRes) notes.push("저해상도");
  notes.push(...qualityIssues);
  return notes;
}

function appendNotes(baseMessage, notes) {
  if (notes.length === 0) return baseMessage;
  return `${baseMessage} ${notes.join(", ")} 특징도 함께 보여요.`;
}

// ---------------------------------------------------------------------------
// 7. 메인 진단 함수
// ---------------------------------------------------------------------------

const MIN_PLAUSIBLE_IMAGE_BYTES = 16;

async function diagnose(file) {
  const filename = file.name;
  const extension = extensionOf(filename);
  const head = await readHeadBytes(file);
  const detectedFormat = detectFormat(head);

  // 케이스 1: 시그니처로 형식을 전혀 판별하지 못함 → 사진이 아닌 파일 취급.
  if (!detectedFormat) {
    if (file.size < MIN_PLAUSIBLE_IMAGE_BYTES || looksLikeNonImage(head) || !isSupportedExtension(extension)) {
      return {
        filename,
        extension,
        detectedFormat: null,
        severity: "안내",
        message: "사진이 아닙니다.",
        readable: false,
        isMismatched: false,
        isLowResolution: false,
        isProbableScreenshot: false,
        qualityIssues: [],
        printSizes: null,
        certification: null,
        preview: null,
        width: null,
        height: null,
        fileSize: file.size,
        errorMessage: null,
      };
    }
    // 확장자는 이미지처럼 보이는데 시그니처가 없음 → 헤더 손상 가능성. 그래도 디코딩 시도.
  }

  const isMismatched = detectedFormat ? !extensionMatchesFormat(extension, detectedFormat) : false;

  if (detectedFormat && !BROWSER_DECODABLE_FORMATS.has(detectedFormat)) {
    return {
      filename,
      extension,
      detectedFormat,
      severity: "손상",
      message: `'${detectedFormat}' 형식은 이 브라우저에서 지원하지 않습니다.`,
      readable: false,
      isMismatched,
      isLowResolution: false,
      isProbableScreenshot: false,
      qualityIssues: [],
      printSizes: null,
      certification: null,
      preview: null,
      width: null,
      height: null,
      fileSize: file.size,
      errorMessage: null,
    };
  }

  let canvas;
  try {
    canvas = await decodeToCanvas(file, detectedFormat);
  } catch (err) {
    return {
      filename,
      extension,
      detectedFormat,
      severity: "손상",
      message: "파일이 손상되어 열 수 없습니다.",
      readable: false,
      isMismatched,
      isLowResolution: false,
      isProbableScreenshot: false,
      qualityIssues: [],
      printSizes: null,
      certification: null,
      preview: null,
      width: null,
      height: null,
      fileSize: file.size,
      errorMessage: err.message || String(err),
    };
  }

  const { width, height } = canvas;
  const lowRes = isLowResolution(width, height);
  const screenshot = isProbableScreenshot(filename);
  const qualityIssues = screenshot ? [] : assessQualityIssues(canvas);

  let severity = isMismatched ? "의심" : "정상";
  let message = isMismatched
    ? "확장자가 실제 형식과 다릅니다. 확장자만 바꾸면 정상적으로 열립니다."
    : "정상적으로 열리는 사진입니다.";
  message = appendNotes(message, extraNotes(lowRes, qualityIssues, screenshot));

  const previewCanvas = drawScaled(canvas, 640);
  const printSizes = printSuitability(width, height);
  const certification = certifyQuality(true, screenshot, qualityIssues, lowRes, printSizes);

  return {
    filename,
    extension,
    detectedFormat,
    severity,
    message,
    readable: true,
    isMismatched,
    isLowResolution: lowRes,
    isProbableScreenshot: screenshot,
    qualityIssues,
    printSizes,
    certification,
    preview: previewCanvas.toDataURL("image/jpeg", 0.82),
    width,
    height,
    fileSize: file.size,
    errorMessage: null,
    // 형식 변환용 원본 해상도 캔버스. preview는 640px로 축소된 별도 캔버스라
    // 변환 결과물로 못 쓴다(app.js의 "다른 형식으로 저장" 기능이 사용).
    canvas,
  };
}
