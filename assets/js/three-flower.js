/* ═══════════════════════════════════════════════════════════
   SAFFRON OF KASHMIR — three-flower.js
   Three.js saffron crocus flower — auto-rotating, muted rose
   Used in "Story of Mongra" section
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('three-flower-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  // ─── LIGHTING ───
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.6);
  scene.add(ambient);

  const pointLight = new THREE.PointLight(0xE8841A, 2, 30);
  pointLight.position.set(3, 5, 5);
  scene.add(pointLight);

  const rimLight = new THREE.PointLight(0x8B4A52, 1.5, 20);
  rimLight.position.set(-4, -2, 3);
  scene.add(rimLight);

  // ─── PETALS ───
  const petalMat = new THREE.MeshPhongMaterial({
    color: 0x8B4A52,
    emissive: 0x3A1020,
    emissiveIntensity: 0.2,
    shininess: 30,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });

  const flowerGroup = new THREE.Group();
  scene.add(flowerGroup);

  const PETAL_COUNT = 6;
  for (let i = 0; i < PETAL_COUNT; i++) {
    const petalGeo = new THREE.ConeGeometry(0.7, 3.2, 6, 1, true);
    petalGeo.translate(0, 1.6, 0);

    const petal = new THREE.Mesh(petalGeo, petalMat.clone());
    petal.rotation.z = (Math.PI / PETAL_COUNT * 2 * i) + Math.PI;
    petal.rotation.x = -0.25;

    const pivot = new THREE.Object3D();
    pivot.rotation.y = (Math.PI * 2 / PETAL_COUNT) * i;
    pivot.add(petal);
    flowerGroup.add(pivot);
  }

  // ─── STAMENS (saffron stigma) ───
  const stamenGroup = new THREE.Group();
  flowerGroup.add(stamenGroup);

  const stamenMat = new THREE.MeshPhongMaterial({
    color: 0xC9A84C,
    emissive: 0x7A5A00,
    emissiveIntensity: 0.4,
    shininess: 80
  });

  const STAMEN_COUNT = 3;
  for (let i = 0; i < STAMEN_COUNT; i++) {
    // Stalk
    const stalkGeo  = new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6);
    const stalk     = new THREE.Mesh(stalkGeo, stamenMat);
    stalk.position.set(
      Math.sin((Math.PI * 2 / STAMEN_COUNT) * i) * 0.25,
      1.2,
      Math.cos((Math.PI * 2 / STAMEN_COUNT) * i) * 0.25
    );
    stamenGroup.add(stalk);

    // Stigma tip (the red part — actual saffron)
    const tipMat = new THREE.MeshPhongMaterial({
      color: 0xC0392B,
      emissive: 0x6B0000,
      emissiveIntensity: 0.5,
      shininess: 20
    });
    const tipGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const tip    = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(
      Math.sin((Math.PI * 2 / STAMEN_COUNT) * i) * 0.28,
      2.95,
      Math.cos((Math.PI * 2 / STAMEN_COUNT) * i) * 0.28
    );
    stamenGroup.add(tip);
  }

  // ─── BASE STEM ───
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.14, 2, 8);
  const stemMat = new THREE.MeshPhongMaterial({ color: 0x2D5A1B, shininess: 20 });
  const stem    = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = -2;
  flowerGroup.add(stem);

  // ─── GROUND PARTICLES ───
  const gpGeo = new THREE.BufferGeometry();
  const gpPos = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    gpPos[i*3]   = (Math.random() - 0.5) * 10;
    gpPos[i*3+1] = -3.5 + Math.random() * 0.5;
    gpPos[i*3+2] = (Math.random() - 0.5) * 10;
  }
  gpGeo.setAttribute('position', new THREE.BufferAttribute(gpPos, 3));
  const gpMat = new THREE.PointsMaterial({
    color: 0xC9A84C,
    size: 0.06,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(gpGeo, gpMat));

  // ─── ANIMATE ───
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    flowerGroup.rotation.y = t * 0.25;
    flowerGroup.position.y = Math.sin(t * 0.6) * 0.15;

    // Subtle petal breathing
    flowerGroup.children.forEach((child, i) => {
      if (child.children.length > 0) {
        const petal = child.children[0];
        if (petal && petal.rotation !== undefined) {
          petal.rotation.x = -0.25 + Math.sin(t * 0.8 + i) * 0.05;
        }
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // ─── RESIZE ───
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }, { passive: true });
})();
