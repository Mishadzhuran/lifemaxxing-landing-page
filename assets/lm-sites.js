/**
 * Shared legal/support URLs for static pages on lifemaxxing.io (cPanel).
 * Paths are root-absolute so they work from any nested folder.
 */
window.LM_SITES = {
  home: '/',
  privacy: '/legal/privacy/',
  terms: '/legal/terms/',
  eula: '/legal/eula/',
  community: '/legal/community/',
  dataCollection: '/legal/data-collection/',
  paymentTerms: '/payment-terms.html',
  deleteAccount: '/account/delete/',
  support: '/support/',
};

(function () {
  document.querySelectorAll('[data-lm]').forEach(function (el) {
    var key = el.getAttribute('data-lm');
    var url = window.LM_SITES[key];
    if (url) el.setAttribute('href', url);
  });
})();
