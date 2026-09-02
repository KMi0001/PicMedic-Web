const pickBtn = document.getElementById("pick-btn");
const retryBtn = document.getElementById("retry-btn");
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

function showSection(section) {
  for (const el of [pickerSection, loadingSection, resultSection]) {
    el.classList.toggle("hidden", el !== section);
  }
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

function renderPrintSuitability(diagnosis) {
  if (!diagnosis.print_sizes) {
    printSuitabilityEl.classList.add("hidden");
    return;
  }

  printSuitabilityGridEl.innerHTML = "";
  for (const { size, level } of diagnosis.print_sizes) {
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

  printSuitabilityNoteEl.classList.toggle("hidden", !diagnosis.print_quality_warning);
  printSuitabilityEl.classList.remove("hidden");
}

function renderResult(diagnosis) {
  badgeEl.textContent = diagnosis.severity;
  badgeEl.className = `result__badge result__badge--${diagnosis.severity}`;

  const screenshotTag = document.getElementById("result-screenshot-tag");
  screenshotTag.classList.toggle("hidden", !diagnosis.is_probable_screenshot);

  filenameEl.textContent = diagnosis.filename;
  messageEl.textContent = diagnosis.message;

  detailsEl.innerHTML = "";
  addDetailRow("확장자", diagnosis.extension || "-");
  addDetailRow("실제 형식", diagnosis.detected_format || "알 수 없음");
  if (diagnosis.width && diagnosis.height) {
    const resolutionNote = diagnosis.is_low_resolution ? " (낮음)" : "";
    addDetailRow("해상도", `${diagnosis.width} x ${diagnosis.height}${resolutionNote}`);
  }
  addDetailRow("파일 크기", formatBytes(diagnosis.file_size));
  if (diagnosis.camera) {
    addDetailRow("촬영 기기", diagnosis.camera);
  }
  if (diagnosis.captured_at) {
    addDetailRow("촬영 일시", diagnosis.captured_at);
  }
  if (diagnosis.is_mismatched) {
    addDetailRow("확장자 불일치", "예");
  }
  if (diagnosis.color_space_warning) {
    addDetailRow("색공간", diagnosis.color_space_warning);
  }
  if (diagnosis.quality_issues && diagnosis.quality_issues.length > 0) {
    addDetailRow("화질 확인", diagnosis.quality_issues.join(", "));
  }
  if (diagnosis.error_message && diagnosis.severity !== "안내") {
    addDetailRow("상세 오류", diagnosis.error_message);
  }

  renderPrintSuitability(diagnosis);

  showSection(resultSection);
}

async function pickAndDiagnose() {
  showSection(loadingSection);
  try {
    const diagnosis = await window.pywebview.api.pick_and_diagnose();
    if (!diagnosis) {
      showSection(pickerSection);
      return;
    }
    renderResult(diagnosis);
  } catch (err) {
    showSection(pickerSection);
    console.error("진단 실패", err);
  }
}

pickBtn.addEventListener("click", pickAndDiagnose);
retryBtn.addEventListener("click", pickAndDiagnose);
