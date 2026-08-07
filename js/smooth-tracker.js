/**
 * smooth-tracker
 * ---------------------------------------------------------------------------
 * Componente A-Frame que sigue la pose de OTRO entity ("target") aplicando
 * suavizado por frame:
 *   - posicion  -> lerp   (interpolacion lineal)
 *   - rotacion  -> slerp  (interpolacion esferica de cuaterniones)
 *
 * Por que existe: MindAR escribe una matriz nueva en el entity
 * [mindar-image-target] en CADA frame en que detecta el marcador. Esa pose
 * "cruda" puede saltar/temblar un poco (ruido de tracking). En vez de colgar
 * el modelo directamente de ese entity, lo colgamos de este componente, que
 * lee la pose cruda y se mueve gradualmente hacia ella en lugar de saltar
 * de golpe.
 *
 * Uso:
 *   <a-entity id="raw-target" mindar-image-target="targetIndex: 0"></a-entity>
 *   <a-entity smooth-tracker="target: #raw-target; lerp: 0.25; slerp: 0.25">
 *     ...modelo aqui...
 *   </a-entity>
 *
 * IMPORTANTE: el entity con smooth-tracker debe estar al mismo nivel que el
 * target (mismo padre, normalmente <a-scene>) para que las matrices de mundo
 * sean directamente comparables.
 */
AFRAME.registerComponent('smooth-tracker', {
  schema: {
    target: { type: 'selector' },
    // 0 = nunca se mueve, 1 = sin suavizado (copia exacta cada frame).
    // Valores tipicos: 0.15 (muy suave, algo de "lag") a 0.4 (mas reactivo).
    lerp: { type: 'number', default: 0.25 },
    slerp: { type: 'number', default: 0.25 },
    enabled: { type: 'boolean', default: true },
  },

  init: function () {
    this._targetPos = new THREE.Vector3();
    this._targetQuat = new THREE.Quaternion();
    this._targetScale = new THREE.Vector3();
    this._hasPose = false;
  },

  tick: function (time, deltaMs) {
    if (!this.data.enabled) return;

    const targetEl = this.data.target;
    if (!targetEl || !targetEl.object3D) return;

    const targetObj = targetEl.object3D;
    targetObj.updateMatrixWorld(true);
    targetObj.matrixWorld.decompose(this._targetPos, this._targetQuat, this._targetScale);

    const obj = this.el.object3D;

    if (!this._hasPose) {
      // Primera lectura: "teletransporta" en vez de suavizar, para que el
      // modelo no aparezca volando desde el origen de la escena.
      obj.position.copy(this._targetPos);
      obj.quaternion.copy(this._targetQuat);
      this._hasPose = true;
      return;
    }

    // Factor de suavizado independiente del framerate: a mas dt, se
    // avanza mas hacia el objetivo, para que el resultado se vea igual
    // en un celular a 30fps que en uno a 60fps.
    const dt = Math.min(deltaMs || 16.67, 100) / 1000;
    const posAlpha = 1 - Math.pow(1 - this.data.lerp, dt * 60);
    const rotAlpha = 1 - Math.pow(1 - this.data.slerp, dt * 60);

    obj.position.lerp(this._targetPos, posAlpha);
    obj.quaternion.slerp(this._targetQuat, rotAlpha);
  },

  remove: function () {
    this._hasPose = false;
  },
});
