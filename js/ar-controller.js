/**
 * ar-controller
 * ---------------------------------------------------------------------------
 * Conecta los eventos "crudos" de MindAR (targetFound / targetLost sobre
 * #raw-target) con el resto de la app, sin que ni ui.js ni
 * model-controller.js necesiten saber nada de MindAR directamente.
 *
 * Emite eventos propios en `window`:
 *   statware:ar-ready      -> la escena empezo a renderizar
 *   statware:target-found  -> el marcador fue detectado
 *   statware:target-lost   -> el marcador se perdio
 *
 * Tambien decide cuando mostrar/ocultar #model-root. La suavizacion de la
 * pose (smooth-tracker.js) sigue corriendo siempre en segundo plano aunque
 * el modelo este oculto, para que al reaparecer no "salte".
 */
(function () {
  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function initARController() {
    const sceneEl = document.querySelector('a-scene');
    const rawTarget = document.getElementById('raw-target');
    const modelRoot = document.getElementById('model-root');

    if (!sceneEl || !rawTarget || !modelRoot) {
      console.warn('[ar-controller] No se encontraron los entities esperados (raw-target / model-root).');
      return;
    }

    sceneEl.addEventListener('renderstart', () => emit('statware:ar-ready'));

    rawTarget.addEventListener('targetFound', () => {
      modelRoot.setAttribute('visible', true);
      emit('statware:target-found');
    });

    rawTarget.addEventListener('targetLost', () => {
      modelRoot.setAttribute('visible', false);
      emit('statware:target-lost');
    });
  }

  if (document.readyState === 'complete') {
    initARController();
  } else {
    window.addEventListener('load', initARController);
  }
})();
