/**
 * smooth-tracker
 * ---------------------------------------------------------------------------
 * Componente A-Frame que se coloca en el MISMO entity que
 * [mindar-image-target] y suaviza, EN EL LUGAR, la pose cruda que MindAR
 * escribe ahi cada frame:
 *   - posicion  -> lerp   (interpolacion lineal)
 *   - rotacion  -> slerp  (interpolacion esferica de cuaterniones)
 *   - escala    -> lerp   (MindAR codifica su propio factor de escala en la
 *                          pose; sin suavizarla tambien, el modelo queda del
 *                          tamano incorrecto)
 *
 * Por que "en el lugar" y no copiando a otro entity: MindAR calcula su pose
 * en un espacio de coordenadas propio (no es "1 unidad = 1 metro"), y esa
 * pose solo se interpreta bien cuando se compone exactamente como MindAR
 * espera -el modelo colgado como HIJO de este mismo entity, igual que en la
 * integracion estandar de mindar-image-aframe-. Intentar reconstruir esa
 * pose en otro entity separado (mismo padre, distinto arbol) resulto ser
 * fragil: forzaba a adivinar la convencion exacta de MindAR y termino en
 * un modelo invisible. Suavizando la MISMA matriz que MindAR ya escribio,
 * en el mismo entity, evitamos ese problema por completo.
 *
 * Uso:
 *   <a-entity mindar-image-target="targetIndex: 0" smooth-tracker="lerp: 0.25; slerp: 0.25">
 *     ...modelo aqui, como hijo directo...
 *   </a-entity>
 *
 * Orden de ejecucion: MindAR actualiza la matriz de este entity desde su
 * SYSTEM (mindar-image-system), que corre ANTES que el tick() de los
 * componentes de entity dentro del loop de A-Frame. Por eso, cuando este
 * tick() se ejecuta, la matriz "cruda" de este frame ya esta escrita y
 * podemos leerla y sobreescribirla con la version suavizada antes de que
 * se use para el render.
 */
AFRAME.registerComponent('smooth-tracker', {
  schema: {
    // 0 = nunca se mueve, 1 = sin suavizado (copia exacta cada frame).
    // Valores tipicos: 0.15 (muy suave, algo de "lag") a 0.4 (mas reactivo).
    lerp: { type: 'number', default: 0.25 },
    slerp: { type: 'number', default: 0.25 },
    enabled: { type: 'boolean', default: true },
    // One Euro filter toggle and params (aplica si `oneEuro` es true)
    oneEuro: { type: 'boolean', default: false },
    oneEuroMinCutoff: { type: 'number', default: 1.0 },
    oneEuroBeta: { type: 'number', default: 0.01 },
    oneEuroDCutoff: { type: 'number', default: 1.0 },
  },

  init: function () {
    this._rawPos = new THREE.Vector3();
    this._rawQuat = new THREE.Quaternion();
    this._rawScale = new THREE.Vector3();

    this._smoothPos = new THREE.Vector3();
    this._smoothQuat = new THREE.Quaternion();
    this._smoothScale = new THREE.Vector3();

    this._hasPose = false;

    // One Euro filters (created lazily on first tick when enabled)
    this._oneEuroFilters = null;
  },

  /** Simple low-pass used by OneEuro */
  _LowPass: function () {
    this.s = 0;
    this.initialized = false;
  },

  /** One Euro scalar filter implementation */
  _OneEuro: function (minCutoff, beta, dCutoff) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new (this._LowPass)();
    this.dx = new (this._LowPass)();
    this.lastTime = null;
  },

  tick: function (time, deltaMs) {
    if (!this.data.enabled) return;

    const obj = this.el.object3D;

    // Sin marcador visible no hay pose nueva que leer. Ademas, al perderse
    // el marcador reseteamos _hasPose para que, al reaparecer, hagamos
    // "snap" en vez de interpolar desde una pose vieja/obsoleta.
    if (!obj.visible) {
      this._hasPose = false;
      return;
    }

    // MindAR ya escribio la pose cruda de ESTE frame en obj.matrix
    // (matrixAutoUpdate esta en false, asi que nadie mas la toca).
    obj.matrix.decompose(this._rawPos, this._rawQuat, this._rawScale);

    if (!this._hasPose) {
      this._smoothPos.copy(this._rawPos);
      this._smoothQuat.copy(this._rawQuat);
      this._smoothScale.copy(this._rawScale);
      this._hasPose = true;
      // Initialize OneEuro filters when first pose arrives if enabled
      if (this.data.oneEuro && !this._oneEuroFilters) {
        const minCutoff = this.data.oneEuroMinCutoff;
        const beta = this.data.oneEuroBeta;
        const dCutoff = this.data.oneEuroDCutoff;
        // Helper to create instance with bound prototypes
        const OneEuroCtor = this._OneEuro.bind(this);
        // position x,y,z
        this._oneEuroFilters = {
          px: new OneEuroCtor(minCutoff, beta, dCutoff),
          py: new OneEuroCtor(minCutoff, beta, dCutoff),
          pz: new OneEuroCtor(minCutoff, beta, dCutoff),
          qx: new OneEuroCtor(minCutoff, beta, dCutoff),
          qy: new OneEuroCtor(minCutoff, beta, dCutoff),
          qz: new OneEuroCtor(minCutoff, beta, dCutoff),
          qw: new OneEuroCtor(minCutoff, beta, dCutoff),
          sx: new OneEuroCtor(minCutoff, beta, dCutoff),
          sy: new OneEuroCtor(minCutoff, beta, dCutoff),
          sz: new OneEuroCtor(minCutoff, beta, dCutoff),
        };
      }
    } else {
      // Factor de suavizado independiente del framerate: a mas dt, se
      // avanza mas hacia el objetivo, para que el resultado se vea igual
      // en un celular a 30fps que en uno a 60fps.
      const dt = Math.min(deltaMs || 16.67, 100) / 1000;

      if (this.data.oneEuro) {
        // One Euro per-component filtering. Use dt (s) as sampling period.
        const f = this._oneEuroFilters;
        const filterStep = (fe) => {
          // initialize lastTime if needed (we use dt so lastTime not required)
          if (!fe.x.initialized) {
            fe.x.s = 0; fe.x.initialized = false;
            fe.dx.s = 0; fe.dx.initialized = false;
          }
        };

        // Helper funcs for lowpass inside OneEuro prototype
        const alpha = (cutoff, te) => {
          const tau = 1.0 / (2 * Math.PI * cutoff);
          return 1.0 / (1.0 + tau / te);
        };

        // Define local lowpass filter behavior
        const lowpassFilter = (lp, value, a) => {
          if (!lp.initialized) {
            lp.s = value;
            lp.initialized = true;
            return value;
          }
          lp.s = a * value + (1 - a) * lp.s;
          return lp.s;
        };

        const applyOneEuro = (fe, value, dtSec) => {
          // derivative
          const dx = (value - (fe.x.initialized ? fe.x.s : value)) / Math.max(dtSec, 1e-6);
          // filtered derivative
          const a_d = alpha(fe.dCutoff, dtSec);
          const edx = lowpassFilter(fe.dx, dx, a_d);
          // adaptive cutoff
          const cutoff = fe.minCutoff + fe.beta * Math.abs(edx);
          const a = alpha(cutoff, dtSec);
          const xf = lowpassFilter(fe.x, value, a);
          return xf;
        };

        // Position
        this._smoothPos.x = applyOneEuro(f.px, this._rawPos.x, dt);
        this._smoothPos.y = applyOneEuro(f.py, this._rawPos.y, dt);
        this._smoothPos.z = applyOneEuro(f.pz, this._rawPos.z, dt);

        // Rotation - filter quaternion components then normalize
        const qx = applyOneEuro(f.qx, this._rawQuat.x, dt);
        const qy = applyOneEuro(f.qy, this._rawQuat.y, dt);
        const qz = applyOneEuro(f.qz, this._rawQuat.z, dt);
        const qw = applyOneEuro(f.qw, this._rawQuat.w, dt);
        this._smoothQuat.set(qx, qy, qz, qw).normalize();

        // Scale
        this._smoothScale.x = applyOneEuro(f.sx, this._rawScale.x, dt);
        this._smoothScale.y = applyOneEuro(f.sy, this._rawScale.y, dt);
        this._smoothScale.z = applyOneEuro(f.sz, this._rawScale.z, dt);
      } else {
        const posAlpha = 1 - Math.pow(1 - this.data.lerp, dt * 60);
        const rotAlpha = 1 - Math.pow(1 - this.data.slerp, dt * 60);

        this._smoothPos.lerp(this._rawPos, posAlpha);
        this._smoothQuat.slerp(this._rawQuat, rotAlpha);
        this._smoothScale.lerp(this._rawScale, posAlpha);
      }
    }

    obj.matrix.compose(this._smoothPos, this._smoothQuat, this._smoothScale);
    obj.matrixWorldNeedsUpdate = true;
  },

  remove: function () {
    this._hasPose = false;
  },
});

