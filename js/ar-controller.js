/**
 * ar-controller
 * ---------------------------------------------------------------------------
 * Conecta los eventos "crudos" de MindAR (targetFound / targetLost sobre
 * los anclajes de los targets con el resto de la app, sin que ni ui.js ni
 * model-controller.js necesiten saber nada de MindAR directamente.
 *
 * Emite eventos propios en `window`:
 *   statware:ar-ready      -> la escena empezo a renderizar
 *   statware:target-found  -> el marcador fue detectado
 *   statware:target-lost   -> el marcador se perdio
 *
 * MindAR ya se encarga de mostrar/ocultar cada anclaje (y por lo tanto el
 * modelo, que cuelga de ahi) segun el tracking; este archivo NO toca esa
 * visibilidad, solo escucha y retransmite.
 */
(function () {
  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function initARController() {
    const sceneEl = document.querySelector('a-scene');
    const targetAnchors = document.querySelectorAll('[mindar-image-target]');

    if (!sceneEl || targetAnchors.length === 0) {
      console.warn('[ar-controller] No se encontraron anclajes de targets.');
      return;
    }

    sceneEl.addEventListener('renderstart', () => emit('statware:ar-ready'));

    const activeTargets = new Set();
    targetAnchors.forEach((targetAnchor) => {
      targetAnchor.addEventListener('targetFound', () => {
        const wasEmpty = activeTargets.size === 0;
        activeTargets.add(targetAnchor);
        if (wasEmpty) emit('statware:target-found');
      });
      targetAnchor.addEventListener('targetLost', () => {
        activeTargets.delete(targetAnchor);
        if (activeTargets.size === 0) emit('statware:target-lost');
      });
    });
  }

  if (document.readyState === 'complete') {
    initARController();
  } else {
    window.addEventListener('load', initARController);
  }
})();
