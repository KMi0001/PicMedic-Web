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
