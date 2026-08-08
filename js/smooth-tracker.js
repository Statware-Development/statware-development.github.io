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
  },

  init: function () {
    this._rawPos = new THREE.Vector3();
    this._rawQuat = new THREE.Quaternion();
    this._rawScale = new THREE.Vector3();

    this._smoothPos = new THREE.Vector3();
    this._smoothQuat = new THREE.Quaternion();
    this._smoothScale = new THREE.Vector3();

    this._hasPose = false;
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
    } else {
      // Factor de suavizado independiente del framerate: a mas dt, se
      // avanza mas hacia el objetivo, para que el resultado se vea igual
      // en un celular a 30fps que en uno a 60fps.
      const dt = Math.min(deltaMs || 16.67, 100) / 1000;
      const posAlpha = 1 - Math.pow(1 - this.data.lerp, dt * 60);
      const rotAlpha = 1 - Math.pow(1 - this.data.slerp, dt * 60);

      this._smoothPos.lerp(this._rawPos, posAlpha);
      this._smoothQuat.slerp(this._rawQuat, rotAlpha);
      this._smoothScale.lerp(this._rawScale, posAlpha);
    }

    obj.matrix.compose(this._smoothPos, this._smoothQuat, this._smoothScale);
    obj.matrixWorldNeedsUpdate = true;
  },

  remove: function () {
    this._hasPose = false;
  },
});
