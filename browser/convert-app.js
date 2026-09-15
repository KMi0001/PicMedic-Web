/*
 * convert-app.js
 *
 * convert.html 화면 배선 — diagnose.html 결과 화면에 있던 "다른 형식으로
 * 저장" 기능(app.js::renderConvert 등)을 진단 없이 바로 쓸 수 있는 독립
 * 페이지로 분리한 것(2026-09-16, 사용자 요청). 형식 판별/디코딩은
 * diagnose.js의 detectFormat·decodeToCanvas·readHeadBytes·
 * BROWSER_DECODABLE_FORMATS를 그대로 재사용한다 — diagnose.js가 이 페이지에도
 * 먼저 로드돼 있어야 한다.
 */

const pickBtn = document.getElementById("pick-btn");
const fileInput = document.getElementById("file-input");
const pickerSection = document.getElementById("picker");
const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");
const previewEl = document.getElementById("result-preview");
const filenameEl = document.getElementById("result-filename");
const formatEl = document.getElementById("convert-format");
const qualityWrapEl = document.getElementById("convert-quality-wrap");
const qualityEl = document.getElementById("convert-quality");
const qualityValueEl = document.getElementById("convert-quality-value");
const convertBtn = document.getElementById("convert-btn");
const retryBtn = document.getElementById("retry-btn");

const CONVERT_MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const CONVERT_EXT = { jpeg: "jpg", png: "png", webp: "webp" };

let currentCanvas = null;
let currentBaseName = "picmedic";

function showSection(section) {
  for (const el of [pickerSection, loadingSection, resultSection]) {
    el.classList.toggle("hidden", el !== section);
  }
}

function updateQualityVisibility() {
  qualityWrapEl.classList.toggle("hidden", formatEl.value === "png");
}

async function handleFile(file) {
  if (!file) return;
  showSection(loadingSection);
  try {
    const head = await readHeadBytes(file);
    const detectedFormat = detectFormat(head);
    if (!detectedFormat || !BROWSER_DECODABLE_FORMATS.has(detectedFormat)) {
      throw new Error("지원하지 않는 형식이거나 손상된 파일이에요.");
    }
    const canvas = await decodeToCanvas(file, detectedFormat);
    currentCanvas = canvas;
    currentBaseName = file.name.replace(/\.[^./\\]+$/, "") || "picmedic";
    previewEl.src = canvas.toDataURL("image/jpeg", 0.85);
    filenameEl.textContent = file.name;
    updateQualityVisibility();
    showSection(resultSection);
  } catch (err) {
    console.error("변환용 사진 불러오기 실패", err);
    showSection(pickerSection);
  } finally {
    fileInput.value = "";
  }
}

pickBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

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
  handleFile(file);
});

formatEl.addEventListener("change", updateQualityVisibility);
qualityEl.addEventListener("input", () => {
  qualityValueEl.textContent = qualityEl.value;
});

convertBtn.addEventListener("click", () => {
  if (!currentCanvas) return;
  const format = formatEl.value;
  const mime = CONVERT_MIME[format];
  const ext = CONVERT_EXT[format];
  const quality = format === "png" ? undefined : Number(qualityEl.value) / 100;

  currentCanvas.toBlob(
    (blob) => {
      if (!blob) {
        console.error("변환 실패: 캔버스를 이미지로 인코딩하지 못했습니다.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentBaseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    mime,
    quality
  );
});

retryBtn.addEventListener("click", () => {
  currentCanvas = null;
  fileInput.value = "";
  showSection(pickerSection);
});
