;(function () {
  if (window.API_BASE) return
  var host = location.hostname
  var isProduction =
    host === 'rishuntang.com' ||
    host.endsWith('.rishuntang.com') ||
    host.endsWith('github.io')
  window.API_BASE = isProduction ? 'https://rishuntang-ziwei-api.onrender.com' : ''
})()
