;(function () {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .catch(function () {
        /* 本機 file:// 或舊瀏覽器略過 */
      })
  })
})()
