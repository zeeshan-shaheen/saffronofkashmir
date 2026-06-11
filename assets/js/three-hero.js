/* ═══════════════════════════════════════════════════════════
   SAFFRON OF KASHMIR — three-hero.js
   Three.js hero: saffron threads + gold dust particles
   Chromatic aberration post-processing (manual shader)
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;

  // ─── RENDERER ───
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x000000, 0);

  // ─── SCENE + CAMERA ───
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
  camera.position.set(0, 0, 18);

  // ─── CLOCK ───
  const clock = new THREE.Clock();

  // ─── GOLD SAFFRON THREADS ───
  const THREAD_COUNT = 18;
  const threads = [];

  const threadMat = new THREE.MeshBasicMaterial({
    color: 0xC9A84C,
    transparent: true,
    opacity: 0.55
  });

  for (let i = 0; i < THREAD_COUNT; i++) {
    const points  = [];
    const seg     = 40;
    const offsetX = (Math.random() - 0.5) * 24;
    const offsetY = (Math.random() - 0.5) * 14;
    const freq    = 0.3 + Math.random() * 0.6;
    const amp     = 0.5 + Math.random() * 1.5;
    const phase   = Math.random() * Math.PI * 2;
    const len     = 4 + Math.random() * 8;

    for (let j = 0; j <= seg; j++) {
      const t = j / seg;
      const x = offsetX + Math.sin(t * Math.PI * freq + phase) * amp;
      const y = offsetY + (t - 0.5) * len;
      const z = (Math.random() - 0.5) * 2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve  = new THREE.CatmullRomCurve3(points);
    const geo    = new THREE.TubeGeometry(curve, seg, 0.025, 4, false);
    const mesh   = new THREE.Mesh(geo, threadMat.clone());
    mesh.userData = { freq, amp, phase, offsetX, offsetY, len, basePhase: phase };
    scene.add(mesh);
    threads.push(mesh);
  }

  // ─── GOLD DUST PARTICLES ───
  const PARTICLE_COUNT = 800;
  const positions      = new Float32Array(PARTICLE_COUNT * 3);
  const velocities     = new Float32Array(PARTICLE_COUNT * 3);
  const sizes          = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20 - 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    velocities[i * 3]     = (Math.random() - 0.5) * 0.003;
    velocities[i * 3 + 1] = 0.008 + Math.random() * 0.012;
    velocities[i * 3 + 2] = 0;
    sizes[i]              = 0.5 + Math.random() * 2;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.PointsMaterial({
    color: 0xE8A23D,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ─── AMBIENT GLOW SPHERE ───
  const glowGeo = new THREE.SphereGeometry(3, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xC9A84C,
    transparent: true,
    opacity: 0.03
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glow);

  // ─── CHROMATIC ABERRATION (post-process plane) ───
  // Rendered as a full-screen overlay that samples from a render target
  // Using WebGL1-compatible approach: render scene to RT, then draw with offset UVs
  const rtW = Math.floor(canvas.clientWidth  * Math.min(window.devicePixelRatio, 1.5));
  const rtH = Math.floor(canvas.clientHeight * Math.min(window.devicePixelRatio, 1.5));
  const renderTarget = new THREE.WebGLRenderTarget(rtW, rtH, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });

  const chromaVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const chromaFrag = `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir) * strength;
      vec2 offset = normalize(dir) * dist;
      float r = texture2D(tDiffuse, vUv + offset * 0.5).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset * 0.5).b;
      float a = texture2D(tDiffuse, vUv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `;

  const chromaGeo  = new THREE.PlaneGeometry(2, 2);
  const chromaMat  = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      strength:  { value: 0.004 }
    },
    vertexShader:   chromaVert,
    fragmentShader: chromaFrag,
    transparent: true,
    depthTest: false
  });

  const chromaScene  = new THREE.Scene();
  const chromaCam    = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const chromaScreen = new THREE.Mesh(chromaGeo, chromaMat);
  chromaScene.add(chromaScreen);

  // ─── ANIMATE ───
  let animId;
  let cameraAngle = 0;

  function animate() {
    animId = requestAnimationFrame(animate);
    window.__threeHeroAnimId = animId;

    const t = clock.getElapsedTime();

    // Slow camera orbit
    cameraAngle += 0.0003;
    camera.position.x = Math.sin(cameraAngle) * 1.5;
    camera.position.y = Math.cos(cameraAngle * 0.7) * 0.8;
    camera.lookAt(0, 0, 0);

    // Animate threads (sinusoidal wave)
    threads.forEach((mesh, i) => {
      const { freq, amp, phase: ph, offsetX, offsetY, len, basePhase } = mesh.userData;
      const points = [];
      const seg    = 40;
      const wave   = t * 0.35;

      for (let j = 0; j <= seg; j++) {
        const s = j / seg;
        const x = offsetX + Math.sin(s * Math.PI * freq + basePhase + wave) * amp;
        const y = offsetY + (s - 0.5) * len;
        const z = Math.sin(s * Math.PI * 1.5 + basePhase + wave * 0.5) * 0.4;
        points.push(new THREE.Vector3(x, y, z));
      }

      const curve     = new THREE.CatmullRomCurve3(points);
      const positions = mesh.geometry.attributes.position;

      if (positions && mesh.geometry.parameters) {
        const newGeo = new THREE.TubeGeometry(curve, seg, 0.025, 4, false);
        mesh.geometry.dispose();
        mesh.geometry = newGeo;
      }
    });

    // Animate particles (drift upward, reset when out)
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArr[i * 3]     += velocities[i * 3] * Math.sin(t * 0.5 + i);
      posArr[i * 3 + 1] += velocities[i * 3 + 1];
      if (posArr[i * 3 + 1] > 12) {
        posArr[i * 3 + 1] = -12;
        posArr[i * 3]     = (Math.random() - 0.5) * 30;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Glow pulse
    glowMat.opacity = 0.02 + Math.sin(t * 0.8) * 0.015;

    // Render to RT, then chromatic aberration pass
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(chromaScene, chromaCam);
  }

  animate();

  // Resume function for visibility API
  window.__threeHeroResume = () => { animate(); };

  // ─── RESIZE ───
  function onResize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderTarget.setSize(
      Math.floor(w * Math.min(window.devicePixelRatio, 1.5)),
      Math.floor(h * Math.min(window.devicePixelRatio, 1.5))
    );
  }

  window.addEventListener('resize', onResize, { passive: true });
})();
