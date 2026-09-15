/*
 * live-photo-app.js
 *
 * live-photo.html 화면 배선 — live-photo-core.js의 checkLivePhotoPair()를
 * 호출하고 결과를 그려준다. browser/app.js(diagnose.html용)와 같은 역할 분담.
 */

const imageInput = document.getElementById("image-input");
const videoInput = document.getElementById("video-input");
const pickImageBtn = document.getElementById("pick-image-btn");
const pickVideoBtn = document.getElementById("pick-video-btn");
const imageFilenameEl = document.getElementById("image-filename");
const videoFilenameEl = document.getElementById("video-filename");
const checkBtn = document.getElementById("check-btn");
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

function updateSlotLabels() {
  imageFilenameEl.textContent = selectedImage ? selectedImage.name : "아직 선택 안 함";
  imageFilenameEl.classList.toggle("lp-slot__filename--filled", !!selectedImage);
  videoFilenameEl.textContent = selectedVideo ? selectedVideo.name : "아직 선택 안 함";
  videoFilenameEl.classList.toggle("lp-slot__filename--filled", !!selectedVideo);
  checkBtn.disabled = !(selectedImage && selectedVideo);
}

function setImageFile(file) {
  if (!file) return;
  selectedImage = file;
  updateSlotLabels();
}

function setVideoFile(file) {
  if (!file) return;
  selectedVideo = file;
  updateSlotLabels();
}

// 드래그로 두 파일을 한꺼번에 놓으면 확장자로 사진/동영상 슬롯에 자동으로 나눠 넣는다.
function assignDroppedFiles(files) {
  for (const file of files) {
    const ext = extensionOf(file.name);
    if (VIDEO_EXTENSIONS.has(ext)) setVideoFile(file);
    else setImageFile(file);
  }
}

pickImageBtn.addEventListener("click", () => imageInput.click());
pickVideoBtn.addEventListener("click", () => videoInput.click());
imageInput.addEventListener("change", () => setImageFile(imageInput.files[0]));
videoInput.addEventListener("change", () => setVideoFile(videoInput.files[0]));

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

function suggestedDownloadName(imageFile, videoFile) {
  const stem = imageFile.name.slice(0, imageFile.name.length - extensionOf(imageFile.name).length);
  const ext = extensionOf(videoFile.name) || ".mov";
  return `${stem}_motion${ext}`;
}

function renderResult(check, imageFile, videoFile) {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }

  filenameEl.textContent = `${imageFile.name}  ↔  ${videoFile.name}`;

  if (check.matched) {
    badgeEl.textContent = "확인됨";
    badgeEl.className = "result__badge result__badge--정상";
    messageEl.textContent = "두 파일이 같은 식별자를 공유하는 걸 확인했어요 — 원래 짝이었던 라이브 포토가 맞아요.";

    downloadUrl = URL.createObjectURL(videoFile);
    downloadBtn.href = downloadUrl;
    downloadBtn.download = suggestedDownloadName(imageFile, videoFile);
    downloadBtn.classList.remove("hidden");
  } else {
    badgeEl.textContent = "확인 안 됨";
    badgeEl.className = "result__badge result__badge--안내";
    const reasonParts = [];
    if (!check.imageHadMetadata) reasonParts.push("사진에서 식별자를 못 찾았어요(이미 다른 형식으로 변환됐을 수 있어요)");
    if (!check.videoHadMetadata) reasonParts.push("동영상에서 식별자를 못 찾았어요");
    const reason = reasonParts.length > 0 ? ` (${reasonParts.join(", ")})` : "";
    messageEl.textContent = `두 파일이 같은 식별자를 공유하지 않아서, 원래 짝인지 확인하지 못했어요.${reason}`;
    downloadBtn.classList.add("hidden");
  }

  showSection(resultSection);
}

checkBtn.addEventListener("click", async () => {
  if (!selectedImage || !selectedVideo) return;
  showSection(loadingSection);
  try {
    const check = await checkLivePhotoPair(selectedImage, selectedVideo);
    renderResult(check, selectedImage, selectedVideo);
  } catch (err) {
    console.error("라이브 포토 확인 실패", err);
    showSection(pickerSection);
  }
});

retryBtn.addEventListener("click", () => {
  selectedImage = null;
  selectedVideo = null;
  imageInput.value = "";
  videoInput.value = "";
  updateSlotLabels();
  showSection(pickerSection);
});

updateSlotLabels();
