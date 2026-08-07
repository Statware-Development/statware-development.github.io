/**
 * model-controller
 * ---------------------------------------------------------------------------
 * Componente A-Frame "model-behavior": comportamiento propio del modelo 3D
 * (el gltf-model), separado de la logica de tracking (smooth-tracker.js) y
 * de la logica de deteccion del marcador (ar-controller.js).
 *
 * Ahora mismo hace un pequeno "pop" de escala cuando el marcador se detecta,
 * para que el modelo no aparezca de golpe. Es el lugar donde agregar a
 * futuro cualquier animacion/estado propio del modelo (rotacion idle,
 * highlight de piezas, etc.).
 *
 * -----------------------------------------------------------------------
 * VALORES TUNEABLES DEL MODELO (viven como atributos en index.html, en el
 * <a-gltf-model>):
 *   scale    -> tamano. Si sale gigante baja a 0.2 / 0.1;
 *               si sale chico sube a 1 / 2 / 3.
 *   rotation -> orientacion. Si sale ACOSTADO, cambia a "-90 0 0".
 *               Si sale de espaldas, prueba "0 180 0".
 *   position -> "x y z". El tercer numero (z) lo empuja hacia el
 *               visitante, despegandolo de la lona. Sube y (2do numero)
 *               si quieres levantarlo del centro del marcador.
 * -----------------------------------------------------------------------
 */
AFRAME.registerComponent('model-behavior', {
  schema: {
    popDuration: { type: 'number', default: 180 },
  },

  init: function () {
    const scale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
    this._baseScale = `${scale.x} ${scale.y} ${scale.z}`;

    this._onFound = this._onFound.bind(this);
    window.addEventListener('statware:target-found', this._onFound);
  },

  _onFound: function () {
    this.el.removeAttribute('animation__pop');
    this.el.setAttribute('animation__pop', {
      property: 'scale',
      from: '0.01 0.01 0.01',
      to: this._baseScale,
      dur: this.data.popDuration,
      easing: 'easeOutQuad',
    });
  },

  remove: function () {
    window.removeEventListener('statware:target-found', this._onFound);
  },
});
