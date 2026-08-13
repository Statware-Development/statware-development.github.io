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
  let _locked = false;
  let _savedLocal = null;

  function initUI() {
    const estado = document.getElementById('estado');
    const lockBtn = document.getElementById('lock-btn');
    if (!estado) return;

    function setEstado(key) {
      const cfg = ESTADOS[key];
      if (!cfg) return;
      estado.textContent = cfg.text;
      estado.style.background = cfg.bg;
    }

    window.addEventListener('statware:ar-ready', () => setEstado('buscando'));
    window.addEventListener('statware:target-found', () => {
      setEstado('detectado');
      if (lockBtn && !_locked) lockBtn.style.display = 'block';
    });
    window.addEventListener('statware:target-lost', () => {
      setEstado('buscando');
      if (lockBtn && !_locked) lockBtn.style.display = 'none';
    });

    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        const model = document.getElementById('transformador-model');
        const sceneEl = document.querySelector('a-scene');
        const anchor = document.getElementById('target-anchor');
        if (!model || !sceneEl || !anchor) return;

        if (!_locked) {
          // Save local transform and parent so we can restore on unlock
          _savedLocal = {
            parent: model.parentElement,
            position: model.getAttribute('position'),
            rotation: model.getAttribute('rotation'),
            scale: model.getAttribute('scale'),
          };

          // Compute world transform
          const obj = model.object3D;
          obj.updateMatrixWorld(true);
          const worldPos = new AFRAME.THREE.Vector3();
          const worldQuat = new AFRAME.THREE.Quaternion();
          const worldScale = new AFRAME.THREE.Vector3();
          obj.getWorldPosition(worldPos);
          obj.getWorldQuaternion(worldQuat);
          obj.getWorldScale(worldScale);

          // Detach from anchor and attach to scene root so it stays put
          sceneEl.appendChild(model);
          model.object3D.position.copy(worldPos);
          model.object3D.quaternion.copy(worldQuat);
          model.object3D.scale.copy(worldScale);
          model.object3D.updateMatrix();

          _locked = true;
          lockBtn.textContent = 'Desbloquear posición';
          lockBtn.classList.add('locked');
          window.dispatchEvent(new CustomEvent('statware:model-locked'));
        } else {
          // Reattach to anchor and restore saved local transform
          _savedLocal.parent.appendChild(model);
          if (_savedLocal) {
            model.setAttribute('position', _savedLocal.position);
            model.setAttribute('rotation', _savedLocal.rotation);
            model.setAttribute('scale', _savedLocal.scale);
          }

          _locked = false;
          lockBtn.textContent = 'Bloquear posición';
          lockBtn.classList.remove('locked');
          lockBtn.style.display = 'none';
          window.dispatchEvent(new CustomEvent('statware:model-unlocked'));
        }
      });
    }
  }

  if (document.readyState === 'complete') {
    initUI();
  } else {
    window.addEventListener('load', initUI);
  }
})();
