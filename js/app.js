/**
 * app.js
 * ---------------------------------------------------------------------------
 * Punto de entrada. Une todo lo demas (smooth-tracker, model-controller,
 * ar-controller, ui) y guarda datos globales chiquitos de la app, como la
 * version que se muestra en pantalla.
 *
 * SUBE ESTE NUMERO A MANO CADA VEZ QUE HAGAS UN CAMBIO, asi sabes en el cel
 * si estas viendo tu ultimo cambio o cache.
 */
(function () {
  const APP_VERSION = 'v1.0.2';

  function initApp() {
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = APP_VERSION;
    console.log(`[Statware WebAR] ${APP_VERSION} iniciado`);
  }

  if (document.readyState === 'complete') {
    initApp();
  } else {
    window.addEventListener('load', initApp);
  }
})();
