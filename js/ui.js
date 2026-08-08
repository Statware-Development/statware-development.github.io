/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Todo lo que toca el DOM de la interfaz (el badge #estado). No sabe nada
 * de MindAR ni de A-Frame: solo escucha los eventos que emite
 * ar-controller.js.
 */
(function () {
  const ESTADOS = {
    buscando: { text: 'Buscando marcador...', bg: 'rgba(5, 75, 115, 0.92)' },
    detectado: { text: 'Marcador detectado', bg: 'rgba(25, 110, 159, 0.95)' },
  };

  function initUI() {
    const estado = document.getElementById('estado');
    if (!estado) return;

    function setEstado(key) {
      const cfg = ESTADOS[key];
      if (!cfg) return;
      estado.textContent = cfg.text;
      estado.style.background = cfg.bg;
    }

    window.addEventListener('statware:ar-ready', () => setEstado('buscando'));
    window.addEventListener('statware:target-found', () => setEstado('detectado'));
    window.addEventListener('statware:target-lost', () => setEstado('buscando'));
  }

  if (document.readyState === 'complete') {
    initUI();
  } else {
    window.addEventListener('load', initUI);
  }
})();
