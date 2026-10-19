import * as THREE from 'three';

// Decorative globe: NASA Blue Marble imagery, local textures, no runtime API.
const host = document.querySelector('.earth-stage');
const fallback = document.querySelector('.earth');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
} catch {
  // Keep the CSS globe when WebGL is unavailable.
}
if (renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  camera.position.z = 4.3;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const globe = new THREE.Group();
  globe.rotation.z = THREE.MathUtils.degToRad(16);
  scene.add(globe);
  const geometry = new THREE.SphereGeometry(1, 80, 64);
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const day = loader.load(`${base}textures/earth-day.jpg`, () => {
    host.classList.add('loaded');
    fallback.classList.add('webgl-ready');
    draw();
  });
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const surface = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    map: day, shininess: 9, specular: new THREE.Color('#294b64'),
  }));
  surface.rotation.y = -1.6;
  globe.add(surface);
  const cloudTexture = loader.load(`${base}textures/earth-clouds.jpg`, () => draw());
  const clouds = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    color: '#f1f8ff', alphaMap: cloudTexture, transparent: true,
    opacity: .66, depthWrite: false, shininess: 0,
  }));
  clouds.scale.setScalar(1.012);
  clouds.rotation.y = surface.rotation.y;
  globe.add(clouds);
  const atmosphere = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { glowColor: { value: new THREE.Color('#399dff') } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vView;
      void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),3.8);gl_FragColor=vec4(glowColor,rim*.8);}`,
  }));
  atmosphere.scale.setScalar(1.045);
  globe.add(atmosphere);
  scene.add(new THREE.AmbientLight('#7095c4', .43));
  const sunlight = new THREE.DirectionalLight('#eaf4ff', 2.1);
  sunlight.position.set(-3, 4, 5);
  scene.add(sunlight);

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  let previous = 0;
  let lastDraw = 0;
  function draw() { renderer.render(scene, camera); }
  function animate(time) {
    frame = requestAnimationFrame(animate);
    if (time - lastDraw < 32) return; // Cap at 30fps for a quiet background.
    const dt = previous ? Math.min((time - previous) / 1000, .1) : 0;
    previous = lastDraw = time;
    surface.rotation.y += dt * .026;
    clouds.rotation.y += dt * .032;
    draw();
  }
  function sync() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = 0;
    if (!document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
    else draw();
  }
  function resize() {
    const size = host.getBoundingClientRect();
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    draw();
  }
  new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  resize();
  sync();
}
