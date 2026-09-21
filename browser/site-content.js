// 사이트 전체에서 공유하는 편집 가능한 텍스트(사업자정보, 문의 이메일).
// admin.html에서 값을 고치고 이 파일을 다시 다운로드해서 통째로 교체하는
// 방식이다 — 정적 사이트(서버 없음)라 실시간 저장이 불가능하고, admin.html은
// 그 교체 작업을 돕는 편집기일 뿐 로그인/인증은 없다(주소를 아는 사람만 접근).
(function () {
  var CONTENT = {
    "bizinfo": {
      "name": { "ko": "[상호명]", "en": "[Business name]" },
      "ceo": { "ko": "[대표자명]", "en": "[CEO name]" },
      "regNo": "[000-00-00000]",
      "address": { "ko": "[사업장 주소]", "en": "[Business address]" },
      "mailOrderNo": { "ko": "[해당 시 기재]", "en": "[if applicable]" },
      "contact": "[이메일 또는 전화번호]"
    },
    "contactEmail": "jenn@try-cat.com",
    "faq": [
      {
        "q": {"ko": "아이폰에서 옮긴 HEIC 사진이 PC에서 안 열려요 (안 보여요)", "en": "HEIC photos moved from my iPhone won't open (or show) on my PC"},
        "a": {"ko": "아이폰은 사진을 HEIC 형식으로 저장하는데, 윈도우 PC는 환경에 따라 이 형식을 못 열거나 미리보기가 안 보일 수 있어요(별도 확장 프로그램이 필요할 때가 있어요). 파일이 손상된 게 아닐 수도 있으니, 먼저 사진 진단으로 형식 문제인지 손상인지 확인해보세요. 형식 문제라면 확장자 변환으로 JPG로 바꾸면 어디서든 열려요.", "en": "iPhones save photos as HEIC, and depending on your setup a Windows PC may not open them or show previews (an extra extension is sometimes needed). The file may not be damaged, so first use Diagnose Photos to tell whether it's a format issue or damage. If it's the format, Convert Extension turns it into a JPG that opens anywhere."}
      },
      {
        "q": {"ko": "확장자만 바꾸면 사진이 열리나요?", "en": "Will renaming the extension make my photo open?"},
        "a": {"ko": "이름의 확장자만 바꿔서 열리는 경우는, 애초에 실제 형식과 확장자가 다르게 저장된 파일일 때뿐이에요. 사진 진단이 이런 '형식 불일치'를 알려줘요. 아이폰 HEIC처럼 형식 자체가 PC와 안 맞는 경우에는 이름만 바꾸면 안 되고, 확장자 변환으로 실제 형식을 JPG·PNG·WEBP로 바꿔야 해요.", "en": "Renaming only works when the file was saved with an extension that doesn't match its real format — Diagnose Photos flags this as a 'format mismatch'. When the format itself doesn't suit your PC (like iPhone HEIC), renaming won't help; use Convert Extension to actually change it to JPG, PNG or WEBP."}
      },
      {
        "q": {"ko": "사진 검사는 뭘 확인해 주나요?", "en": "What does the photo check look at?"},
        "a": {"ko": "파일을 선택하면 실제 형식(확장자와 일치하는지), 손상 여부, 해상도, 블러·노출·노이즈 같은 화질을 브라우저 안에서 한 번에 검사해요. 결과는 정상·의심·손상 배지로 알려드려요.", "en": "Once you pick a file, we check in your browser its real format (and whether it matches the extension), any damage, its resolution, and quality factors like blur, exposure and noise. The result comes as a Normal / Suspect / Damaged badge."}
      },
      {
        "q": {"ko": "인화 맡기기 전에 사진 화질을 확인할 수 있나요?", "en": "Can I check photo quality before ordering prints?"},
        "a": {"ko": "네. 사진 진단은 해상도와 화질을 바탕으로 3x5부터 8x10까지 인화 사이즈별로 충분한지 추정해서 '인화 적합·양호·주의 필요'로 알려드려요. 표준 인화(4x6\") 기준의 추정치예요.", "en": "Yes. Diagnose Photos estimates from resolution and quality whether a photo is good enough for each print size from 3x5 to 8x10, and labels it Print-ready / Good / Needs attention. It's an estimate based on the standard 4x6\" print."}
      },
      {
        "q": { "ko": "제 사진이 서버에 업로드되나요?", "en": "Are my photos uploaded to a server?" },
        "a": { "ko": "아니요. 이 페이지의 진단은 방문자의 브라우저 안에서만 처리되고, 어디로도 전송되지 않아요.", "en": "No. Diagnosis on this page runs entirely inside your browser and is never sent anywhere." }
      },
      {
        "q": { "ko": "복구도 여기서 할 수 있나요?", "en": "Can I repair my photo here too?" },
        "a": { "ko": "아니요, 지금은 진단까지만 무료로 제공돼요. 사진을 직접 복구하는 기능은 PicMedic 데스크톱 버전에서 준비 중이에요.", "en": "Not yet — this page only offers free diagnosis for now. Repairing the file is being prepared for the PicMedic desktop version." }
      },
      {
        "q": { "ko": "어떤 파일까지 지원하나요?", "en": "Which file types are supported?" },
        "a": { "ko": "HEIC를 포함해 JPEG·PNG·GIF·BMP·WEBP 형식을 지원해요. TIFF는 아직 지원하지 않아요.", "en": "HEIC is supported, along with JPEG, PNG, GIF, BMP and WEBP. TIFF isn't supported yet." }
      },
      {
        "q": { "ko": "제 사진을 누가 보관하거나 볼 수 있나요?", "en": "Are my photos ever kept or looked at by anyone?" },
        "a": { "ko": "아니요. 어디에도 업로드되지 않아서 저희 쪽에 남거나 볼 수 있는 사진 자체가 없어요.", "en": "No. Nothing is uploaded, so there's nothing stored on our side to see." }
      },
      {
        "q": { "ko": "라이브포토 진단은 뭘 해주나요?", "en": "What does the Live Photo Check do?" },
        "a": { "ko": "사진(HEIC/JPG)과 동영상(.MOV)이 애플이 촬영 당시 심어둔 같은 식별자를 공유하는지 대조해서, 원래 짝이었던 라이브 포토가 맞는지 확인하고 동영상을 받을 수 있게 해줘요. 폴더째로 올리면 여러 장을 한꺼번에 찾아주지만, 다운로드는 한 번에 하나씩이에요 — 한꺼번에 정리·내보내기는 PicMedic 데스크톱 버전에서 할 수 있어요.", "en": "It checks whether a photo (HEIC/JPG) and a video (.MOV) share the same identifier Apple embeds at capture time, confirming they were originally a Live Photo pair and letting you download the video. Uploading a whole folder finds many at once, but downloads are still one at a time — batch organizing/exporting is available in the PicMedic desktop version." }
      },
      {
        "q": {"ko": "라이브 포토를 PC에서 어떻게 실행하고 영상으로 저장하나요?", "en": "How do I play and save a Live Photo as a video on my PC?"},
        "a": {"ko": "라이브 포토는 사진 파일(HEIC/JPG)과 짝이 되는 짧은 동영상(.MOV) 두 개로 이뤄져 있어요. PC에서는 사진 파일만으로는 움직이지 않고, 함께 옮겨온 .MOV 영상을 재생해야 해요. 라이브포토 진단에서 사진과 .MOV가 원래 짝이 맞는지 확인하면 그 동영상을 바로 저장할 수 있어요. .MOV가 재생되지 않으면 VLC 같은 재생 프로그램을 써보세요.", "en": "A Live Photo is a photo file (HEIC/JPG) plus a short paired video (.MOV). On a PC the photo file alone doesn't move — you play the .MOV that came with it. In Live Photo Check you can confirm the photo and .MOV were originally a pair and save that video right away. If the .MOV won't play, try a player such as VLC."}
      },
      {
        "q": {"ko": "사진 여러 장을 한 번에 바꾸거나 정리할 수 있나요?", "en": "Can I convert or organize many photos at once?"},
        "a": {"ko": "웹 버전은 사진을 한 장씩 바로 처리하는 데 맞춰져 있어요. 여러 장 일괄 변환·이름 일괄 변경, 중복 사진과 날짜·도시별 사진 정리는 PicMedic 데스크톱 버전에서 다뤄요.", "en": "The web version is built for handling one photo at a time. Batch conversion and renaming, plus cleaning up duplicates and organizing by date or city, are handled by the PicMedic desktop version."}
      }
    ],
    // 각 페이지 하단(app__footer)에 뜨는 짧은 안내문구 — admin.html에서 페이지별로
    // 따로 고칠 수 있다. ko가 빈 문자열이면 그 페이지는 안내 문단 자체를 숨긴다
    // (2026-09-16, 사용자 요청 — 사진 진단 페이지는 데스크톱 버전이 나올 때까지
    // 비워두고, 나중에 완성되면 admin.html에서 채워 넣기로 함).
    "pageNotes": {
      "diagnose": { "ko": "", "en": "" },
      "livePhoto": {
        "ko": "손상된 사진을 직접 복구하는 <strong>PicMedic 데스크톱 버전</strong>에는 여러 장을 한 번에 찾아 정리하는 기능도 있어요.",
        "en": "The <strong>PicMedic desktop version</strong> can find and organize many Live Photos at once, and repair damaged ones too."
      },
      "convert": {
        "ko": "여러 장을 한 번에 바꾸거나 손상된 사진을 복구하는 기능은 <strong>PicMedic 데스크톱 버전</strong>에 있어요.",
        "en": "Converting many photos at once, or repairing damaged ones, is available in the <strong>PicMedic desktop version</strong>."
      }
    }
  };

  function escapeHtml(str) {
    return String(str)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;");
  }

  function renderFaqListHtml() {
    return CONTENT.faq.map(function (item) {
      return '<div class="qa">' +
        '<p class="q" data-en="' + escapeHtml(item.q.en) + '">' + escapeHtml(item.q.ko) + '</p>' +
        '<p class="a" data-en="' + escapeHtml(item.a.en) + '">' + escapeHtml(item.a.ko) + '</p>' +
        '</div>';
    }).join("");
  }

  function renderBizinfo(lang) {
    var b = CONTENT.bizinfo;
    if (lang === "en") {
      return "Name: " + b.name.en + " &middot; CEO: " + b.ceo.en +
        " &middot; Registration No.: " + b.regNo +
        " &middot; Address: " + b.address.en +
        " &middot; Mail-order sales No.: " + b.mailOrderNo.en +
        " &middot; Contact: " + b.contact;
    }
    return "상호 " + b.name.ko + " · 대표자 " + b.ceo.ko +
      " · 사업자등록번호 " + b.regNo +
      " · 주소 " + b.address.ko +
      " · 통신판매업신고번호 " + b.mailOrderNo.ko +
      " · 문의 " + b.contact;
  }

  function renderPageNote(key) {
    return (CONTENT.pageNotes && CONTENT.pageNotes[key]) || { ko: "", en: "" };
  }

  function renderFootlinks(lang) {
    if (lang === "en") {
      return '<a href="privacy-policy.html">Privacy Policy</a> &middot; <a href="mailto:' + CONTENT.contactEmail + '">Contact</a>';
    }
    return '<a href="privacy-policy.html">개인정보처리방침</a> · <a href="mailto:' + CONTENT.contactEmail + '">문의하기</a>';
  }

  var bizinfoEl = document.querySelector(".bizinfo");
  if (bizinfoEl) {
    bizinfoEl.setAttribute("data-en", renderBizinfo("en"));
    bizinfoEl.innerHTML = renderBizinfo("ko");
  }

  var footlinksEl = document.querySelector(".footlinks");
  if (footlinksEl) {
    footlinksEl.setAttribute("data-en", renderFootlinks("en"));
    footlinksEl.innerHTML = renderFootlinks("ko");
  }

  var faqListEl = document.getElementById("faq-list");
  if (faqListEl) {
    faqListEl.innerHTML = renderFaqListHtml();
  }

  var pageNoteEl = document.querySelector("[data-page-note]");
  if (pageNoteEl) {
    var note = renderPageNote(pageNoteEl.getAttribute("data-page-note"));
    var pageNoteTextEl = pageNoteEl.querySelector("p");
    if (note.ko) {
      pageNoteTextEl.setAttribute("data-en", note.en);
      pageNoteTextEl.innerHTML = note.ko;
      pageNoteEl.classList.remove("hidden");
    } else {
      pageNoteEl.classList.add("hidden");
    }
  }

  window.PICMEDIC_SITE_CONTENT = CONTENT;
  window.PICMEDIC_RENDER_BIZINFO = renderBizinfo;
  window.PICMEDIC_RENDER_FOOTLINKS = renderFootlinks;
  window.PICMEDIC_RENDER_FAQ_LIST = renderFaqListHtml;
  window.PICMEDIC_RENDER_PAGE_NOTE = renderPageNote;
})();
