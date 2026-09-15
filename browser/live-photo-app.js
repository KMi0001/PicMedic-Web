/*
 * live-photo-app.js
 *
 * live-photo.html 화면 배선. 2단계 흐름이다 —
 *   1) 사진만 먼저 골라서 live-photo-core.js::extractUuidsFromImage()로 그
 *      사진 혼자만 분석한다. 라이브 포토 식별자가 있으면 "짝 동영상이
 *      있을 거예요" 안내와 함께 동영상 선택 버튼을 보여준다(2026-09-15,
 *      사용자 요청 — 사진만 올려도 짝이 있는지부터 알려달라).
 *   2) 동영상까지 고르면 checkLivePhotoPair()로 둘이 진짜 짝인지 대조해서
 *      최종 확인/다운로드를 보여준다.
 * 사진+동영상을 한꺼번에 끌어다 놓으면 1단계를 건너뛰고 바로 2단계로 간다.
 */

const imageInput = document.getElementById("image-input");
const videoInput = document.getElementById("video-input");
const pickImageBtn = document.getElementById("pick-image-btn");
const pickVideoBtn = document.getElementById("pick-video-btn");
const videoStepEl = document.getElementById("video-step");
const videoFilenameEl = document.getElementById("video-filename");
const pickerSection = document.getElementById("picker");
const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");
const badgeEl = document.getElementById("result-badge");
const filenameEl = document.getElementById("result-filename");
const messageEl = document.getElementById("result-message");
const downloadBtn = document.getElementById("download-btn");
const retryBtn = document.getElementById("retry-btn");

const VIDEO_EXTENSIONS = new Set([".mov", ".mp4", ".m4v"]);

let selectedImage = null;
let selectedVideo = null;
let downloadUrl = null; // URL.createObjectURL로 만든 것 — 새로 만들 때마다 이전 것은 해제해야 메모리가 안 샌다.

function extensionOf(filename) {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function showSection(section) {
  for (const el of [pickerSection, loadingSection, resultSection]) {
    el.classList.toggle("hidden", el !== section);
  }
}

function suggestedDownloadName(imageFile, videoFile) {
  const stem = imageFile.name.slice(0, imageFile.name.length - extensionOf(imageFile.name).length);
  const ext = extensionOf(videoFile.name) || ".mov";
  return `${stem}_motion${ext}`;
}

function clearDownloadUrl() {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  downloadBtn.classList.add("hidden");
}

// 1단계 결과 — 사진 혼자만 보고 라이브 포토였을 가능성을 안내한다.
function renderImageOnlyResult(imageFile, uuids) {
  clearDownloadUrl();
  filenameEl.textContent = imageFile.name;
  videoStepEl.classList.remove("hidden");
  videoFilenameEl.textContent = "아직 선택 안 함";
  videoFilenameEl.classList.remove("lp-slot__filename--filled");

  if (uuids.size > 0) {
    badgeEl.textContent = "라이브 포토였을 가능성 있음";
    badgeEl.className = "result__badge result__badge--의심";
    messageEl.textContent = "이 사진에 라이브 포토 식별자가 남아있어요. 원래 짝이었던 동영상(.MOV) 파일이 있다면 아래에서 골라 진짜 짝이 맞는지 확인해보세요.";
  } else {
    badgeEl.textContent = "라이브 포토 흔적 없음";
    badgeEl.className = "result__badge result__badge--안내";
    messageEl.textContent = "이 사진에서는 라이브 포토였다는 흔적을 찾지 못했어요. 이미 다른 형식으로 변환됐거나, 원래 라이브 포토가 아니었을 수 있어요. 그래도 짝이라고 생각되는 동영상이 있다면 골라서 확인해볼 수 있어요.";
  }

  showSection(resultSection);
}

// 2단계 결과 — 사진+동영상을 실제로 대조한 최종 확인.
function renderFinalResult(check, imageFile, videoFile) {
  clearDownloadUrl();
  filenameEl.textContent = `${imageFile.name}  ↔  ${videoFile.name}`;
  videoStepEl.classList.remove("hidden");
  videoFilenameEl.textContent = videoFile.name;
  videoFilenameEl.classList.add("lp-slot__filename--filled");

  if (check.matched) {
    badgeEl.textContent = "확인됨";
    badgeEl.className = "result__badge result__badge--정상";
    messageEl.textContent = "두 파일이 같은 식별자를 공유하는 걸 확인했어요 — 원래 짝이었던 라이브 포토가 맞아요.";

    downloadUrl = URL.createObjectURL(videoFile);
    downloadBtn.href = downloadUrl;
    downloadBtn.download = suggestedDownloadName(imageFile, videoFile);
    downloadBtn.classList.remove("hidden");
  } else {
    badgeEl.textContent = "짝이 아님";
    badgeEl.className = "result__badge result__badge--안내";
    messageEl.textContent = "두 파일이 같은 식별자를 공유하지 않아요 — 이 사진과 이 동영상은 원래 짝이 아닌 것 같아요.";
  }

  showSection(resultSection);
}

async function handleImageSelected(file) {
  if (!file) return;
  selectedImage = file;
  selectedVideo = null; // 새 사진을 고르면 이전에 골랐던 동영상은 초기화(다른 사진과 섞이지 않게)
  showSection(loadingSection);
  try {
    const uuids = await extractUuidsFromImage(file);
    renderImageOnlyResult(file, uuids);
  } catch (err) {
    console.error("사진 분석 실패", err);
    showSection(pickerSection);
  }
}

async function handleVideoSelected(file) {
  if (!file || !selectedImage) return;
  selectedVideo = file;
  showSection(loadingSection);
  try {
    const check = await checkLivePhotoPair(selectedImage, selectedVideo);
    renderFinalResult(check, selectedImage, selectedVideo);
  } catch (err) {
    console.error("라이브 포토 확인 실패", err);
    showSection(pickerSection);
  }
}

// 사진과 동영상을 한꺼번에 끌어다 놓으면 1단계를 건너뛰고 바로 최종 확인으로 간다.
async function handleBothSelected(imageFile, videoFile) {
  selectedImage = imageFile;
  showSection(loadingSection);
  try {
    const check = await checkLivePhotoPair(imageFile, videoFile);
    selectedVideo = videoFile;
    renderFinalResult(check, imageFile, videoFile);
  } catch (err) {
    console.error("라이브 포토 확인 실패", err);
    showSection(pickerSection);
  }
}

function assignDroppedFiles(files) {
  let img = null;
  let vid = null;
  for (const file of files) {
    const ext = extensionOf(file.name);
    if (VIDEO_EXTENSIONS.has(ext)) vid = file;
    else img = file;
  }
  if (img && vid) handleBothSelected(img, vid);
  else if (img) handleImageSelected(img);
  else if (vid) handleVideoSelected(vid);
}

pickImageBtn.addEventListener("click", () => imageInput.click());
pickVideoBtn.addEventListener("click", () => videoInput.click());
imageInput.addEventListener("change", () => handleImageSelected(imageInput.files[0]));
videoInput.addEventListener("change", () => handleVideoSelected(videoInput.files[0]));

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
  const files = e.dataTransfer.files;
  if (files && files.length > 0) assignDroppedFiles(files);
});

retryBtn.addEventListener("click", () => {
  selectedImage = null;
  selectedVideo = null;
  imageInput.value = "";
  videoInput.value = "";
  clearDownloadUrl();
  videoStepEl.classList.add("hidden");
  showSection(pickerSection);
});
