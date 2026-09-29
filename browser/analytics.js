// 구글 애널리틱스(방문자 분석). 측정 ID를 넣으면 켜지고, 비워두면 아무것도 하지 않는다.
// 사진은 브라우저 밖으로 나가지 않는다 — 여기서 보내는 건 페이지 방문 정보뿐이다.
(function () {
  var GA_ID = "G-ZCC1DH9843";
  if (!GA_ID) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
})();
