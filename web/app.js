const pickBtn = document.getElementById("pick-btn");
const retryBtn = document.getElementById("retry-btn");
const pickerSection = document.getElementById("picker");
const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");
const badgeEl = document.getElementById("result-badge");
const filenameEl = document.getElementById("result-filename");
const messageEl = document.getElementById("result-message");
const detailsEl = document.getElementById("result-details");

function showSection(section) {
  for (const el of [pickerSection, loadingSection, resultSection]) {
    el.classList.toggle("hidden", el !== section);
  }
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
    addDetailRow("해상도", `${diagnosis.width} x ${diagnosis.height}`);
  }
  addDetailRow("파일 크기", formatBytes(diagnosis.file_size));
  if (diagnosis.is_mismatched) {
    addDetailRow("확장자 불일치", "예");
  }
  if (diagnosis.is_low_resolution) {
    addDetailRow("저해상도", "예");
  }
  if (diagnosis.error_message && diagnosis.severity !== "안내") {
    addDetailRow("상세 오류", diagnosis.error_message);
  }

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
