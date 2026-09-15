const pickBtn = document.getElementById("pick-btn");
const retryBtn = document.getElementById("retry-btn");
const fileInput = document.getElementById("file-input");
const scenariosSection = document.getElementById("scenarios");
const pickerSection = document.getElementById("picker");
const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");
const badgeEl = document.getElementById("result-badge");
const filenameEl = document.getElementById("result-filename");
const messageEl = document.getElementById("result-message");
const detailsEl = document.getElementById("result-details");
const privacyNoteEl = document.querySelector(".privacy-note");
const printSuitabilityEl = document.getElementById("print-suitability");
const printSuitabilityGridEl = document.getElementById("print-suitability-grid");
const printSuitabilityNoteEl = document.getElementById("print-suitability-note");
const previewWrapEl = document.getElementById("result-preview-wrap");
const previewEl = document.getElementById("result-preview");
const certEl = document.getElementById("cert");
const certIconEl = document.getElementById("cert-icon");
const certLabelEl = document.getElementById("cert-label");
const convertEl = document.getElementById("convert");
const convertFormatEl = document.getElementById("convert-format");
const convertQualityWrapEl = document.getElementById("convert-quality-wrap");
const convertQualityEl = document.getElementById("convert-quality");
const convertQualityValueEl = document.getElementById("convert-quality-value");
const convertBtnEl = document.getElementById("convert-btn");

// "다른 형식으로 저장" 버튼이 쓸, 지금 결과 화면에 떠 있는 파일의 원본
// 해상도 캔버스/파일명. 새 파일을 진단할 때마다 renderResult()에서 갱신된다.
let currentConvertCanvas = null;
let currentConvertBaseName = "picmedic";

const CONVERT_MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const CONVERT_EXT = { jpeg: "jpg", png: "png", webp: "webp" };

function showSection(section) {
  for (const el of [pickerSection, loadingSection, resultSection]) {
    el.classList.toggle("hidden", el !== section);
  }
  scenariosSection.classList.toggle("hidden", section !== pickerSection);
  privacyNoteEl.classList.toggle("privacy-note--emphasis", section === resultSection);
}

function formatBytes(bytes) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function addDetailRow(label, value) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  row.append(dt, dd);
  detailsEl.appendChild(row);
}

function renderPrintSuitability(result) {
  if (!result.printSizes) {
    printSuitabilityEl.classList.add("hidden");
    return;
  }

  printSuitabilityGridEl.innerHTML = "";
  for (const { size, level } of result.printSizes) {
    const cell = document.createElement("div");
    cell.className = "print-size";

    const sizeLabel = document.createElement("span");
    sizeLabel.className = "print-size__label";
    sizeLabel.textContent = `${size}"`;

    const levelBadge = document.createElement("span");
    levelBadge.className = `print-size__level print-size__level--${level}`;
    levelBadge.textContent = level;

    cell.append(sizeLabel, levelBadge);
    printSuitabilityGridEl.appendChild(cell);
  }

  printSuitabilityNoteEl.classList.toggle("hidden", result.qualityIssues.length === 0);
  printSuitabilityEl.classList.remove("hidden");
}

function renderCertification(result) {
  if (!result.certification) {
    certEl.classList.add("hidden");
    return;
  }
  const { tier, label, icon } = result.certification;
  certEl.className = `cert cert--${tier}`;
  certIconEl.textContent = icon;
  certLabelEl.textContent = label;
}

function renderConvert(result) {
  if (!result.canvas) {
    convertEl.classList.add("hidden");
    currentConvertCanvas = null;
    return;
  }
  currentConvertCanvas = result.canvas;
  currentConvertBaseName = result.filename.replace(/\.[^./\\]+$/, "") || "picmedic";
  convertEl.classList.remove("hidden");
}

function updateConvertQualityVisibility() {
  convertQualityWrapEl.classList.toggle("hidden", convertFormatEl.value === "png");
}

function renderResult(result) {
  if (result.preview) {
    previewEl.src = result.preview;
    previewWrapEl.classList.remove("hidden");
  } else {
    previewEl.src = "";
    previewWrapEl.classList.add("hidden");
  }

  badgeEl.textContent = result.severity;
  badgeEl.className = `result__badge result__badge--${result.severity}`;

  const screenshotTag = document.getElementById("result-screenshot-tag");
  screenshotTag.classList.toggle("hidden", !result.isProbableScreenshot);

  const livePhotoTag = document.getElementById("result-live-photo-tag");
  livePhotoTag.classList.toggle("hidden", !result.isProbableLivePhoto);

  filenameEl.textContent = result.filename;
  messageEl.textContent = result.message;

  renderCertification(result);

  detailsEl.innerHTML = "";
  addDetailRow("확장자", result.extension || "-");
  addDetailRow("실제 형식", result.detectedFormat || "알 수 없음");
  if (result.width && result.height) {
    const resolutionNote = result.isLowResolution ? " (낮음)" : "";
    addDetailRow("해상도", `${result.width} x ${result.height}${resolutionNote}`);
  }
  addDetailRow("파일 크기", formatBytes(result.fileSize));
  if (result.isMismatched) {
    addDetailRow("확장자 불일치", "불일치");
  }
  if (result.qualityIssues && result.qualityIssues.length > 0) {
    addDetailRow("화질 확인", result.qualityIssues.join(", "));
  }
  if (result.errorMessage && result.severity !== "안내") {
    addDetailRow("상세 오류", result.errorMessage);
  }

  renderPrintSuitability(result);
  renderConvert(result);

  showSection(resultSection);
}

async function diagnoseFile(file) {
  if (!file) return;
  showSection(loadingSection);
  try {
    const result = await diagnose(file);
    renderResult(result);
  } catch (err) {
    showSection(pickerSection);
    console.error("진단 실패", err);
  } finally {
    fileInput.value = "";
  }
}

convertFormatEl.addEventListener("change", updateConvertQualityVisibility);
convertQualityEl.addEventListener("input", () => {
  convertQualityValueEl.textContent = convertQualityEl.value;
});
convertBtnEl.addEventListener("click", () => {
  if (!currentConvertCanvas) return;
  const format = convertFormatEl.value;
  const mime = CONVERT_MIME[format];
  const ext = CONVERT_EXT[format];
  const quality = format === "png" ? undefined : Number(convertQualityEl.value) / 100;

  currentConvertCanvas.toBlob(
    (blob) => {
      if (!blob) {
        console.error("변환 실패: 캔버스를 이미지로 인코딩하지 못했습니다.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentConvertBaseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    mime,
    quality
  );
});

pickBtn.addEventListener("click", () => fileInput.click());
retryBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => diagnoseFile(fileInput.files[0]));

for (const eventName of ["dragenter", "dragover"]) {
  pickerSection.addEventListener(eventName, (e) => {
    e.preventDefault();
    pickerSection.classList.add("picker--dragover");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  pickerSection.addEventListener(eventName, (e) => {
    e.preventDefault();
    pickerSection.classList.remove("picker--dragover");
  });
}
pickerSection.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  diagnoseFile(file);
});
