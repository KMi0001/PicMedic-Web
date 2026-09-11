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
    "contactEmail": "TODO@example.com"
  };

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

  window.PICMEDIC_SITE_CONTENT = CONTENT;
  window.PICMEDIC_RENDER_BIZINFO = renderBizinfo;
  window.PICMEDIC_RENDER_FOOTLINKS = renderFootlinks;
})();
