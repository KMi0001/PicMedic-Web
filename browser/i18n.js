/* Shared presentation language for every browser tool. File names and internal
 * diagnosis keys remain unchanged; only explicitly bound UI text is translated. */
(function () {
  const translations = {
    "픽메딕 PicMedic | 아이폰 사진 안 열릴 때 · HEIC JPG 변환": "PicMedic | iPhone photos not opening and HEIC to JPG",
    "아이폰 사진이 PC에서 안 열리나요? 픽메딕에서 사진 형식과 읽기 가능 여부를 확인하고 JPG로 변환하세요. 라이브포토 MP4 저장과 인화 해상도 확인도 무료로 제공합니다. 사진 업로드 없음.": "Check photo formats and readability, convert HEIC to JPG, save Live Photo videos, and check print resolution for free. No photo uploads.",
    "HEIC JPG 변환 무료 | PNG·WEBP 사진 변환 - 픽메딕": "Free HEIC to JPG | PNG and WEBP converter - PicMedic",
    "HEIC를 JPG로, PNG·WEBP를 JPEG로 무료 변환하세요. 설치 없이 사진 한 장을 브라우저에서 처리하고 다운로드합니다. 사진 파일은 서버에 업로드되지 않습니다.": "Convert one HEIC, PNG or WEBP photo to JPEG for free in your browser. No installation or photo uploads.",
    "사진 안 열림 원인 확인 | 손상·해상도 검사 - 픽메딕": "Photos not opening | Damage and resolution check - PicMedic",
    "아이폰 HEIC·JPG 사진이 안 열릴 때 실제 파일 형식과 읽기 가능 여부를 확인하세요. 해상도와 인화 적합도도 추정합니다. 파일 복구 기능은 제공하지 않습니다.": "Check the format and readability of HEIC and JPG photos, and estimate print quality. This tool does not repair files.",
    "라이브포토 동영상 저장 | MOV 짝 찾기·MP4 변환 - 픽메딕": "Save Live Photo videos | MOV pairing and MP4 - PicMedic",
    "아이폰 라이브포토의 사진과 MOV 영상이 원래 짝인지 확인하고 MP4로 저장하세요. 파일은 브라우저 안에서 처리됩니다. 원래 움직임을 저장하려면 MOV 원본이 필요합니다.": "Check whether your iPhone photo and MOV are a Live Photo pair and save as MP4 in your browser. The original MOV is required.",
    "HEIC JPG 변환 · 사진 형식 변환": "HEIC to JPG and photo conversion",
    "사진 안 열림 · 손상·해상도 확인": "Check photo format, damage and resolution",
    "라이브포토 동영상 저장 · MP4 변환": "Save Live Photo videos as MP4",
    "홈": "Home",
    "사진 진단하기": "Diagnose Photos",
    "라이브포토 진단": "Live Photo Check",
    "확장자 변환": "Convert Photos",
    "사진 선택": "Choose a photo",
    "사진 문제 해결 가이드": "Photo troubleshooting guides",
    "HEIC를 JPG로 변환하는 방법": "How to convert HEIC to JPG",
    "라이브 포토를 PC에서 MP4 동영상으로 저장하기": "Save a Live Photo as an MP4 video on your PC",
    "사진 인화 해상도 확인 — 4×6에 필요한 픽셀": "Photo print resolution — pixels needed for a 4×6 print",
    "안 열리거나, 흐릿하거나, 이상하게 찍힌 사진 이유를 알려드려요.": "Find out why a photo won't open, looks blurry, or doesn't look right.",
    "HEIC가 PC에서 안 열릴 때부터 사진 인화 전 화질 확인까지 — 형식·손상·해상도를 한 번에 검사해드려요.": "From HEIC photos that won't open on a PC to checking quality before printing — check format, damage, and resolution together.",
    "사진이 안 열려요": "My photo won't open",
    "흐릿하거나 이상하게 나왔어요": "My photo looks blurry or unusual",
    "인화 맡기기 전에 확인하고 싶어요": "I want to check before printing",
    "카메라 사진부터 캡처본까지, 사진이라면 뭐든요. 여기로 끌어다 놓아도 돼요.": "Choose any photo, from camera shots to screenshots. You can also drag it here.",
    "진단 중...": "Analyzing...",
    "스크린샷": "Screenshot",
    "라이브포토": "Live Photo",
    "화질 · 표준 인화 사이즈(4x6\") 기준 추정이에요": "Quality estimate based on a standard 4×6-inch print",
    "인화 적합성": "Print suitability",
    "화질 이슈가 있어 인화하면 더 도드라져 보일 수 있어요.": "Quality issues may become more noticeable in a print.",
    "다른 형식으로 저장": "Save in another format",
    "품질": "Quality",
    "다운로드": "Download",
    "이 브라우저 탭 안에서 바로 변환돼요 — 어디로도 업로드되지 않아요.": "Converted in this browser tab — nothing is uploaded.",
    "다른 사진 진단하기": "Check another photo",
    "사진은 서버로 전송되지 않고, 이 브라우저 탭 안에서만 분석됩니다.": "Photos are analyzed only in this browser tab and are never sent to a server.",
    "진단 없이, 사진 형식만 바로 바꾸고 싶을 때.": "Convert a photo directly, without running a diagnosis.",
    "HEIC를 포함해 JPEG·PNG·GIF·BMP·WEBP 사진의 확장자를 JPEG/PNG/WEBP로 바꿔서 받을 수 있어요. 아이폰 사진이 PC에서 안 열릴 때 JPG로 바꿔보세요.": "Convert HEIC, JPEG, PNG, GIF, BMP, or WEBP photos to JPEG, PNG, or WEBP and download them. Try JPG if your iPhone photo won't open on a PC.",
    "바꾸고 싶은 사진을 골라주세요. 여기로 끌어다 놓아도 돼요.": "Choose the photo you want to convert, or drag it here.",
    "불러오는 중...": "Loading...",
    "변환해서 다운로드": "Convert and download",
    "다른 사진 변환하기": "Convert another photo",
    "사진은 서버로 전송되지 않고, 이 브라우저 탭 안에서만 처리됩니다.": "Photos are processed only in this browser tab and are never sent to a server.",
    "라이브 포토 확인": "Live Photo Check",
    "사진을 정리하다 라이브 포토였던 것 같은데 확실치 않을 때.": "Check whether a photo you found was originally a Live Photo.",
    "사진과 동영상(.MOV) 파일을 고르면, 원래 짝이 맞는 라이브 포토인지 확인하고 그 영상을 저장할 수 있어요. PC에서는 사진 파일이 아니라 함께 저장된 .MOV 영상을 재생해야 라이브 포토가 움직여요. 그 영상을 MP4로 변환해서 저장할 수도 있어요.": "Choose a photo and a video (.MOV) to check whether they were originally a Live Photo pair, then save the video. On a PC, play the accompanying .MOV to see the motion. You can also save it as MP4.",
    "라이브 포토였는지 확인하고 싶은 사진(HEIC 또는 JPG)을 먼저 골라주세요 — 짝이었던 동영상이 있는지는 사진만 봐도 알 수 있어요. 짝이 있는 걸로 나오면, 그 동영상(.MOV) 파일을 추가로 골라서 진짜 짝이 맞는지까지 확인하고 다운로드할 수 있어요. 여기로 사진과 동영상을 한꺼번에 끌어다 놓아도 돼요.": "First choose a photo (HEIC or JPG) to check for Live Photo metadata. If metadata is found, choose its video (.MOV) to confirm the pair and download it. You can also drag both files here together.",
    "사진이 여러 장이면": "Have several photos?",
    "폴더째로 한꺼번에 확인하기": "Check an entire folder",
    "확인하는 중...": "Checking...",
    "다른 라이브포토 사진 선택": "Choose another Live Photo",
    "동영상 (.MOV)": "Video (.MOV)",
    "동영상 선택": "Choose a video",
    "MP4로 변환해서 저장": "Convert to MP4 and save",
    "동영상 파일 다운로드": "Download the video",
    "다른 사진으로 다시 확인하기": "Check another photo",
    "하나씩 받기 번거로우시면,": "For batch downloads, the",
    "PicMedic 데스크톱 버전": "PicMedic desktop version",
    "에서는 찾은 동영상을 한 번에 정리하거나 내보낼 수 있어요.": "can organize or export the videos together.",
    "다른 폴더로 다시 확인하기": "Check another folder",
    "사진과 동영상은 서버로 전송되지 않고, 이 브라우저 탭 안에서만 대조됩니다.": "Photos and videos are compared only in this browser tab and are never sent to a server.",
    "정상": "Normal", "의심": "Suspect", "손상": "Damaged", "안내": "Information",
    "고품질": "High quality", "허용가능": "Acceptable", "권장안함": "Not recommended",
    "인화 적합": "Print-ready", "양호": "Good", "주의 필요": "Needs attention",
    "확장자": "Extension", "실제 형식": "Actual format", "알 수 없음": "Unknown",
    "해상도": "Resolution", "파일 크기": "File size", "확장자 불일치": "Extension mismatch",
    "불일치": "Mismatch", "화질 확인": "Quality check", "상세 오류": "Error details",
    " (낮음)": " (low)",
    "블러 추정": "Possible blur", "노출 부족 추정": "Possible underexposure",
    "노출 과다 추정": "Possible overexposure", "저대비 추정": "Possible low contrast",
    "노이즈 추정": "Possible noise", "저해상도": "Low resolution",
    "사진이 아닙니다.": "This is not a photo.",
    "파일이 손상되어 열 수 없습니다.": "The file is damaged and cannot be opened.",
    "확장자가 실제 형식과 다릅니다. 확장자만 바꾸면 정상적으로 열립니다.": "The extension does not match the actual format. Correcting the extension should allow it to open.",
    "정상적으로 열리는 사진입니다.": "This photo opens normally.",
    "이미지를 디코딩할 수 없습니다.": "The image could not be decoded.",
    "HEIC 디코더 초기화 시간이 초과되었습니다.": "The HEIC decoder took too long to initialize.",
    "HEIC 이미지를 찾을 수 없습니다.": "No HEIC image was found.",
    "HEIC 디코딩에 실패했습니다.": "HEIC decoding failed.",
    "아직 선택 안 함": "Not selected yet",
    "라이브 포토였을 가능성 있음": "Possible Live Photo",
    "이 사진에 라이브 포토 식별자가 남아있어요. 원래 짝이었던 동영상(.MOV) 파일이 있다면 아래에서 골라 진짜 짝이 맞는지 확인해보세요.": "This photo contains a Live Photo identifier. Choose the original video (.MOV) below to check whether they match.",
    "라이브 포토 흔적 없음": "No Live Photo metadata found",
    "이 사진에서는 라이브 포토였다는 흔적을 찾지 못했어요. 이미 다른 형식으로 변환됐거나, 원래 라이브 포토가 아니었을 수 있어요. 그래도 짝이라고 생각되는 동영상이 있다면 골라서 확인해볼 수 있어요.": "No Live Photo metadata was found. The photo may have been converted or may never have been a Live Photo. You can still choose a video to check for a match.",
    "확인됨": "Confirmed",
    "두 파일이 같은 식별자를 공유하는 걸 확인했어요 — 원래 짝이었던 라이브 포토가 맞아요.": "Both files share the same identifier — they are an original Live Photo pair.",
    "짝이 아님": "Not a match",
    "두 파일이 같은 식별자를 공유하지 않아요 — 이 사진과 이 동영상은 원래 짝이 아닌 것 같아요.": "The files do not share an identifier. This photo and video do not appear to be an original pair.",
    "MP4로 변환해서 저장했어요.": "Converted to MP4 and saved.",
    "소리도 함께 담았어요.": "Audio is included.",
    "원본 동영상에 소리가 없어서 영상만 담겼어요.": "The original has no audio, so only video is included.",
    "이 브라우저에서는 소리를 MP4에 담지 못해 영상만 저장했어요. 다른 브라우저에서 다시 시도하면 소리도 담길 수 있어요.": "This browser could not include audio, so the MP4 contains video only. Try another browser to include audio.",
    "이 동영상은 HEVC(H.265) 방식이라, PC 환경에 따라 재생되지 않을 수 있어요(윈도우는 HEVC 확장 프로그램이 필요할 수 있어요).": "This video uses HEVC (H.265), which may need additional playback support on your PC, such as the HEVC extension on Windows.",
    "변환하는 중...": "Converting...",
    "동영상 파일을 다시 확인해주세요.": "Please check the video file.",
    "사진과 동영상이 같은 식별자를 공유하는 걸 확인해서 찾은 목록이에요. 각 항목의 다운로드 버튼으로 동영상만 받을 수 있어요.": "These photos and videos share matching identifiers. Use each Download button to save its video.",
    "이 폴더에서는 짝이 확인되는 라이브 포토를 찾지 못했어요.": "No matching Live Photo pairs were found in this folder.",
    "사진과 동영상이 정말 같은 폴더 안에 있는지 확인해보세요.": "Check that the photos and videos are in the same folder.",
    "폴더를 훑는 중...": "Scanning the folder...",
    "동영상 파일이 너무 작아요.": "The video file is too small.",
    "동영상 정보(moov)를 찾지 못했어요. 손상됐거나 MOV/MP4 파일이 아닐 수 있어요.": "Video information (moov) was not found. The file may be damaged or may not be a MOV/MP4 file.",
    "동영상 헤더를 찾지 못했어요.": "The video header was not found.",
    "동영상 파일이 중간에 잘린 것 같아요.": "The video file appears to be truncated.",
    "영상 설정 정보를 찾지 못했어요.": "Video configuration was not found.",
    "영상 트랙을 찾지 못했어요.": "No video track was found.",
    "영상 프레임이 비어 있어요.": "The video contains no frames.",
    "동영상이 너무 커서 변환할 수 없어요.": "The video is too large to convert.",
    "PicMedic — 아이폰 사진 안 열릴 때 HEIC 진단·JPG 변환": "PicMedic — Diagnose iPhone photos and convert HEIC to JPG",
    "PicMedic — 사진 검사: HEIC 안 열림 원인·인화 화질": "PicMedic — Photo diagnosis and print quality check",
    "PicMedic — HEIC를 JPG로, 사진 확장자 변환": "PicMedic — Convert HEIC to JPG and other photo formats",
    "PicMedic — 라이브 포토 MOV 찾기·MP4 변환": "PicMedic — Find Live Photo videos and convert to MP4",
    "PicMedic FAQ — HEIC 안 열림·라이브 포토·인화 전 확인": "PicMedic FAQ — HEIC, Live Photos, and print quality",
    "PicMedic 사용방법": "How to use PicMedic",
    "PicMedic 개인정보 처리방침": "PicMedic Privacy Policy",
    "다크 모드 전환": "Toggle dark mode",
    "사진 해결 가이드": "Photo troubleshooting guides"
  };
  const normalize = value => String(value).trim().replace(/\s+/g, " ");
  const bindings = new Map();
  let language = "ko";
  try { language = localStorage.getItem("picmedic-lang") === "en" ? "en" : "ko"; } catch (_) {}

  function english(source) {
    if (translations[source] || translations[normalize(source)]) return translations[source] || translations[normalize(source)];
    // Compound system messages retain their internal Korean values.
    let text = String(source);
    text = text.replace(/^'([^']+)' 형식은 이 브라우저에서 지원하지 않습니다\.$/, "The '$1' format is not supported by this browser.");
    text = text.replace(/^라이브 포토 (\d+)개를 찾았어요$/, "Found $1 Live Photo pairs");
    if (/^확인하는 중\.\.\./.test(text)) return text.replace(/^확인하는 중\.\.\./, "Checking...");
    text = text.replace(/^이 영상 코덱\(([^)]+)\)은 MP4로 바꿀 수 없어요\.$/, "The video codec ($1) cannot be converted to MP4.");
    text = text.replace(/^MP4로 변환하지 못했어요\. /, "Could not convert to MP4. ")
      .replace(/ 위의 동영상 파일 다운로드로는 원본을 그대로 받을 수 있어요\.$/, " You can still download the original video using the button above.");
    const notes = text.match(/^(.*?\.) (.*?) 특징도 함께 보여요\.$/);
    if (notes) return english(notes[1]) + " Also detected: " + notes[2].split(", ").map(english).join(", ") + ".";
    // Only composed system messages reach here, never user file names.
    const keys = Object.keys(translations).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
    return text.replace(pattern, key => translations[key]);
  }

  function setText(element, source) {
    bindings.set(element, { source: String(source), type: "text" });
    element.textContent = language === "en" ? english(source) : source;
  }

  function setUserText(element, value) {
    bindings.delete(element);
    element.textContent = value;
  }

  function applyLanguage(next) {
    language = next === "en" ? "en" : "ko";
    document.documentElement.lang = language;
    document.querySelectorAll("[data-en]").forEach(element => {
      if (!element.hasAttribute("data-ko")) element.setAttribute("data-ko", element.innerHTML);
      element.innerHTML = element.getAttribute(language === "en" ? "data-en" : "data-ko").split("\\n").join("<br>");
    });
    for (const [element, binding] of bindings) {
      if (!element.isConnected) { bindings.delete(element); continue; }
      const value = language === "en" ? english(binding.source) : binding.source;
      if (binding.type === "node") element.nodeValue = language === "en"
        ? binding.source.match(/^\s*/)[0] + value + binding.source.match(/\s*$/)[0]
        : value;
      else if (binding.type === "aria") element.setAttribute("aria-label", value);
      else element.textContent = value;
    }
    const toggle = document.getElementById("lang-toggle");
    if (toggle) {
      toggle.textContent = language === "en" ? "한국어" : "English";
      toggle.setAttribute("aria-label", language === "en" ? "한국어로 보기" : "View in English");
    }
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute("href");
      if (/^(heic-to-jpg|live-photo-to-mp4|photo-print-resolution)(-en)?\.html$/.test(href)) {
        link.setAttribute("href", href.replace(/(-en)?\.html$/, language === "en" ? "-en.html" : ".html"));
      }
    });
    try { localStorage.setItem("picmedic-lang", language); } catch (_) {}
  }

  // Register static text that predates data-en annotations. Do not inspect
  // dynamic user data, script contents, or already-localized HTML subtrees.
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest("script, style, [data-en], #lang-toggle")) continue;
    if (translations[normalize(node.nodeValue)]) bindings.set(node, { source: node.nodeValue, type: "node" });
  }
  document.querySelectorAll("[aria-label]").forEach(element => {
    const source = element.getAttribute("aria-label");
    if (translations[normalize(source)]) bindings.set(element, { source, type: "aria" });
  });
  window.PicMedicI18n = { setText, setUserText, applyLanguage, english, getLanguage: () => language };
  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.addEventListener("click", () => applyLanguage(language === "en" ? "ko" : "en"));
  applyLanguage(language);
})();
