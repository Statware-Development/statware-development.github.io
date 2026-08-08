/**
 * ar-controller
 * ---------------------------------------------------------------------------
 * Conecta los eventos "crudos" de MindAR (targetFound / targetLost sobre
 * #target-anchor) con el resto de la app, sin que ni ui.js ni
 * model-controller.js necesiten saber nada de MindAR directamente.
 *
 * Emite eventos propios en `window`:
 *   statware:ar-ready      -> la escena empezo a renderizar
 *   statware:target-found  -> el marcador fue detectado
 *   statware:target-lost   -> el marcador se perdio
 *
 * MindAR ya se encarga de mostrar/ocultar #target-anchor (y por lo tanto el
 * modelo, que cuelga de ahi) segun el tracking; este archivo NO toca esa
 * visibilidad, solo escucha y retransmite.
 */
(function () {
  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function initARController() {
    const sceneEl = document.querySelector('a-scene');
    const targetAnchor = document.getElementById('target-anchor');

    if (!sceneEl || !targetAnchor) {
      console.warn('[ar-controller] No se encontro #target-anchor.');
      return;
    }

    sceneEl.addEventListener('renderstart', () => emit('statware:ar-ready'));

    targetAnchor.addEventListener('targetFound', () => emit('statware:target-found'));
    targetAnchor.addEventListener('targetLost', () => emit('statware:target-lost'));
  }

  if (document.readyState === 'complete') {
    initARController();
  } else {
    window.addEventListener('load', initARController);
  }
})();
