import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const MODEL_PATH = './assets/models/bmw_m4.glb';
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const CAMERA_PRESETS = {
  hero: {
    pos: new THREE.Vector3(4.35, 1.32, 4.65),
    target: new THREE.Vector3(0.0, 0.62, 0.15),
    fov: 38
  },
  threeQuarter: {
    pos: new THREE.Vector3(4.1, 1.48, 4.35),
    target: new THREE.Vector3(0, 0.58, 0),
    fov: 40
  },
  front: {
    pos: new THREE.Vector3(0.0, 1.15, 5.25),
    target: new THREE.Vector3(0, 0.62, 0.4),
    fov: 38
  },
  side: {
    pos: new THREE.Vector3(5.6, 1.18, 0.0),
    target: new THREE.Vector3(0, 0.58, 0),
    fov: 36
  },
  rear: {
    pos: new THREE.Vector3(-3.6, 1.38, -4.45),
    target: new THREE.Vector3(0, 0.62, -0.2),
    fov: 40
  },
  low: {
    pos: new THREE.Vector3(3.65, 0.62, 3.85),
    target: new THREE.Vector3(0, 0.65, 0.2),
    fov: 42
  },
  design: {
    pos: new THREE.Vector3(-4.2, 2.25, 3.6),
    target: new THREE.Vector3(-0.3, 0.65, 0),
    fov: 38
  },
  final: {
    pos: new THREE.Vector3(0.0, 1.05, 5.65),
    target: new THREE.Vector3(0, 0.72, 0),
    fov: 36
  }
};

const HOTSPOTS = [
  {
    id: 'headlights',
    code: 'COMP // 01',
    name: 'HEADLIGHTS',
    tag: 'EXTERIOR OPTICS',
    description: 'Distinctive BMW M lighting design featuring sharp angular daytime running light signatures engineered for immediate visual presence.',
    anchor: new THREE.Vector3(0.76, 0.73, 2.08),
    camPos: new THREE.Vector3(1.95, 1.02, 3.35),
    camTarget: new THREE.Vector3(0.65, 0.7, 1.95)
  },
  {
    id: 'grille',
    code: 'COMP // 02',
    name: 'FRONT GRILLE',
    tag: 'THERMAL AIRFLOW',
    description: 'Vertical frameless M kidney grille with horizontal slats designed to channel direct cooling airflow to high-load heat exchangers.',
    anchor: new THREE.Vector3(0.0, 0.64, 2.34),
    camPos: new THREE.Vector3(0.85, 0.92, 3.55),
    camTarget: new THREE.Vector3(0.0, 0.64, 2.2)
  },
  {
    id: 'wheels',
    code: 'COMP // 03',
    name: 'WHEELS & BRAKES',
    tag: 'UNSPRUNG MASS & STOPPING',
    description: 'Performance-designed multi-spoke alloy wheel configuration paired with high-capacity M compound brake rotors and multi-piston calipers.',
    anchor: new THREE.Vector3(0.96, 0.37, 1.42),
    camPos: new THREE.Vector3(2.35, 0.68, 2.05),
    camTarget: new THREE.Vector3(0.92, 0.38, 1.42)
  },
  {
    id: 'hood',
    code: 'COMP // 04',
    name: 'SCULPTED HOOD',
    tag: 'AERODYNAMIC CONTOUR',
    description: 'Contoured power dome and crisp longitudinal creases channel air smoothly over the coupe silhouette toward the windshield.',
    anchor: new THREE.Vector3(0.0, 0.97, 1.25),
    camPos: new THREE.Vector3(1.85, 1.65, 2.55),
    camTarget: new THREE.Vector3(0.0, 0.88, 1.15)
  },
  {
    id: 'mirrors',
    code: 'COMP // 05',
    name: 'M EXTERIOR MIRRORS',
    tag: 'AERO HOUSING',
    description: 'Signature twin-stalk aerodynamic mirror housings shaped to minimize wind turbulence along the side glass.',
    anchor: new THREE.Vector3(1.04, 0.98, 0.56),
    camPos: new THREE.Vector3(2.25, 1.22, 1.35),
    camTarget: new THREE.Vector3(0.98, 0.95, 0.55)
  },
  {
    id: 'glass',
    code: 'COMP // 06',
    name: 'SIDE GLASS',
    tag: 'COUPE PROPORTION',
    description: 'A refined detail of the vehicle’s exterior design, framing the pillarless coupe profile and signature Hofmeister kink.',
    anchor: new THREE.Vector3(0.84, 1.12, -0.25),
    camPos: new THREE.Vector3(2.55, 1.32, -0.2),
    camTarget: new THREE.Vector3(0.8, 1.05, -0.25)
  },
  {
    id: 'diffuser',
    code: 'COMP // 07',
    name: 'REAR DIFFUSER',
    tag: 'UNDERBODY AIRFLOW',
    description: 'Sculpted lower rear apron housing quad exhaust tailpipes and vertical aero strakes to manage underbody wake.',
    anchor: new THREE.Vector3(0.0, 0.42, -2.32),
    camPos: new THREE.Vector3(-1.65, 0.85, -3.65),
    camTarget: new THREE.Vector3(0.0, 0.48, -2.2)
  }
];

const state = {
  activeScene: 0,
  isUserInteracting: false,
  userOverrodeCamera: false,
  isReplayingOpening: false,
  autoRotate: !PREFERS_REDUCED_MOTION,
  autoRotateBeforeHotspot: null,
  darkStudioMode: false,
  selectedHotspotId: null,
  loadedRealGLB: false
};

let openingTimeline = null;

const dom = {
  stage: document.getElementById('stage'),
  canvas: document.getElementById('webgl-canvas'),
  hotspotsLayer: document.getElementById('hotspots-layer'),
  hotspotPills: document.getElementById('hotspot-pills'),
  inspectorPanel: document.getElementById('inspector-panel'),
  inspectorCode: document.getElementById('inspector-code'),
  inspectorTitle: document.getElementById('inspector-title'),
  inspectorDesc: document.getElementById('inspector-desc'),
  inspectorTag: document.getElementById('inspector-tag'),
  inspectorClose: document.getElementById('inspector-close'),
  inspectorPrev: document.getElementById('inspector-prev'),
  inspectorNext: document.getElementById('inspector-next'),
  modelStatus: document.getElementById('model-status'),
  modelStatusText: document.getElementById('model-status-text'),
  loader: document.getElementById('loader'),
  loaderCounter: document.getElementById('loader-counter'),
  loaderBar: document.getElementById('loader-bar'),
  loaderStatus: document.getElementById('loader-status'),
  progressIndex: document.getElementById('progress-index'),
  progressFill: document.getElementById('progress-fill'),
  navLinks: document.querySelectorAll('.hud-nav__link'),
  menuToggle: document.getElementById('menu-toggle'),
  navDrawer: document.getElementById('nav-drawer')
};

const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: false,
  powerPreference: 'high-performance',
  alpha: true
});
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050608, 0.042);

const camera = new THREE.PerspectiveCamera(
  CAMERA_PRESETS.hero.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.copy(CAMERA_PRESETS.hero.pos);

const controls = new OrbitControls(camera, dom.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 2.4;
controls.maxDistance = 8.5;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minPolarAngle = 0.18;
controls.target.copy(CAMERA_PRESETS.hero.target);
controls.enabled = false;

function cancelActiveCameraTweens() {
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);
}

controls.addEventListener('start', () => {
  state.isUserInteracting = true;
  state.userOverrodeCamera = true;
  cancelActiveCameraTweens();
  if (state.autoRotate) {
    setAutoRotate(false);
  }
});

controls.addEventListener('end', () => {
  state.isUserInteracting = false;
});

function initMobileTouchGestures() {
  if (!IS_TOUCH_DEVICE) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchY = 0;
  let gestureMode = null;
  let suspendedControlsForScroll = false;

  dom.canvas.addEventListener('touchstart', (e) => {
    if (!controls.enabled || e.touches.length !== 1) {
      gestureMode = 'orbit';
      return;
    }
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastTouchY = t.clientY;
    gestureMode = 'undecided';
    suspendedControlsForScroll = false;
  }, { passive: true });

  dom.canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) {
      if (suspendedControlsForScroll) {
        controls.enabled = true;
        suspendedControlsForScroll = false;
      }
      gestureMode = 'orbit';
      return;
    }

    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (gestureMode === 'undecided') {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX > 12 || absY > 12) {
        if (absY > absX * 1.45 && controls.enabled) {
          gestureMode = 'scroll';
          suspendedControlsForScroll = true;
          controls.enabled = false;
          state.isUserInteracting = false;
          cancelActiveCameraTweens();
        } else {
          gestureMode = 'orbit';
        }
      }
    }

    if (gestureMode === 'scroll' && suspendedControlsForScroll) {
      const stepDeltaY = t.clientY - lastTouchY;
      window.scrollBy({ top: -stepDeltaY, left: 0, behavior: 'auto' });
    }

    lastTouchY = t.clientY;
  }, { passive: true });

  const finishTouchGesture = () => {
    if (suspendedControlsForScroll) {
      const stillInteractiveScene = state.activeScene === 1 || state.activeScene === 2;
      controls.enabled = stillInteractiveScene;
      suspendedControlsForScroll = false;
    }
    gestureMode = null;
  };

  dom.canvas.addEventListener('touchend', finishTouchGesture, { passive: true });
  dom.canvas.addEventListener('touchcancel', finishTouchGesture, { passive: true });
}

const lights = {
  ambient: new THREE.AmbientLight(0xdbe8ff, 0.75),
  keySpot: new THREE.SpotLight(0xffffff, 58, 25, Math.PI * 0.24, 0.65, 1.4),
  rimBlue: new THREE.SpotLight(0x1c69d4, 46, 22, Math.PI * 0.28, 0.7, 1.3),
  rimSilver: new THREE.DirectionalLight(0xe6eefc, 1.9),
  underGlow: new THREE.PointLight(0x009ada, 2.2, 6)
};

lights.keySpot.position.set(4.5, 6.8, 5.2);
lights.rimBlue.position.set(-5.2, 3.6, -4.8);
lights.rimSilver.position.set(-3.5, 4.2, 3.0);
lights.underGlow.position.set(0, 0.25, 0);

scene.add(lights.ambient, lights.keySpot, lights.rimBlue, lights.rimSilver, lights.underGlow);

const floorMesh = new THREE.Mesh(
  new THREE.CircleGeometry(20, 36),
  new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.35, metalness: 0.5 })
);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

const ring1 = new THREE.Mesh(
  new THREE.RingGeometry(2.68, 2.705, 48),
  new THREE.MeshBasicMaterial({ color: 0x2997ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
);
ring1.rotation.x = -Math.PI / 2;
ring1.position.y = 0.003;

const ring2 = new THREE.Mesh(
  new THREE.RingGeometry(3.35, 3.365, 48),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
);
ring2.rotation.x = -Math.PI / 2;
ring2.position.y = 0.002;
scene.add(ring1, ring2);

const vehicleGroup = new THREE.Group();
scene.add(vehicleGroup);

// Detailed M4 Coupe Sculptural Rig (used when ./assets/models/bmw_m4.glb is not present)
function buildStudioSilhouetteFallback() {
  const rig = new THREE.Group();
  rig.name = 'BMW_M4_Sculpted_Rig';

  const mSilver = new THREE.MeshStandardMaterial({
    color: 0xc5cdd8,
    metalness: 0.82,
    roughness: 0.22
  });

  const mCarbon = new THREE.MeshStandardMaterial({
    color: 0x11151c,
    metalness: 0.45,
    roughness: 0.36
  });

  const mGlass = new THREE.MeshStandardMaterial({
    color: 0x080c12,
    metalness: 0.25,
    roughness: 0.08,
    transparent: true,
    opacity: 0.9
  });

  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xdbefff,
    emissiveIntensity: 3.1
  });

  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff1e38,
    emissive: 0xe31937,
    emissiveIntensity: 2.6
  });

  // Lower chassis & side skirts
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.34, 4.72), mSilver);
  lowerBody.position.set(0, 0.45, 0);
  rig.add(lowerBody);

  const sideSkirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 2.65), mCarbon);
  sideSkirtL.position.set(0.96, 0.28, 0);
  rig.add(sideSkirtL);

  const sideSkirtR = sideSkirtL.clone();
  sideSkirtR.position.x = -0.96;
  rig.add(sideSkirtR);

  // Sculpted hood & front bumper
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 1.55), mSilver);
  hood.position.set(0, 0.84, 1.48);
  hood.rotation.x = 0.12;
  rig.add(hood);

  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.38), mCarbon);
  frontLip.position.set(0, 0.26, 2.26);
  rig.add(frontLip);

  // Vertical M kidney grilles
  [-0.2, 0.2].forEach((gx) => {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.1), mCarbon);
    grille.position.set(gx, 0.58, 2.34);
    grille.rotation.x = -0.14;
    rig.add(grille);
  });

  // Angular headlights & DRL bars
  [-0.74, 0.74].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.24), mCarbon);
    lamp.position.set(hx, 0.72, 2.12);
    lamp.rotation.y = hx > 0 ? -0.22 : 0.22;
    rig.add(lamp);

    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.05), drlMat);
    drl.position.set(hx, 0.71, 2.23);
    drl.rotation.y = hx > 0 ? -0.22 : 0.22;
    rig.add(drl);
  });

  // Coupe greenhouse & fastback roofline
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.38, 1.82), mGlass);
  cabin.position.set(0, 1.08, -0.18);
  rig.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.05, 1.42), mCarbon);
  roof.position.set(0, 1.28, -0.28);
  rig.add(roof);

  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 1.15), mSilver);
  rearDeck.position.set(0, 0.84, -1.65);
  rearDeck.rotation.x = -0.14;
  rig.add(rearDeck);

  // Rear diffuser & taillights
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.22, 0.22), mCarbon);
  diffuser.position.set(0, 0.34, -2.32);
  rig.add(diffuser);

  [-0.72, 0.72].forEach((tx) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.08), tailMat);
    tail.position.set(tx, 0.85, -2.34);
    tail.rotation.y = tx > 0 ? 0.16 : -0.16;
    rig.add(tail);
  });

  // Side mirrors
  [-1.02, 1.02].forEach((mx) => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.16), mCarbon);
    mirror.position.set(mx, 0.96, 0.55);
    rig.add(mirror);
  });

  // Flared arches & wheels
  const wheelCoords = [
    { x: 0.94, y: 0.37, z: 1.44 },
    { x: -0.94, y: 0.37, z: 1.44 },
    { x: 0.96, y: 0.37, z: -1.44 },
    { x: -0.96, y: 0.37, z: -1.44 }
  ];

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.78, metalness: 0.12 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd6dde8, metalness: 0.88, roughness: 0.2 });

  wheelCoords.forEach((wc) => {
    const wheel = new THREE.Group();
    wheel.position.set(wc.x, wc.y, wc.z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.28, 28), tireMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.29, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    rig.add(wheel);
  });

  return rig;
}

function normalizeLoadedModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxAxis = Math.max(size.x, size.y, size.z);
  const targetLength = 4.82;
  const scale = targetLength / maxAxis;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;

  return model;
}

function loadVehicleAsset() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/libs/draco/');
    loader.setDRACOLoader(draco);

    loader.load(
      MODEL_PATH,
      (gltf) => {
        const normalized = normalizeLoadedModel(gltf.scene);
        vehicleGroup.add(normalized);
        state.loadedRealGLB = true;
        dom.modelStatus.classList.add('is-glb');
        dom.modelStatusText.textContent = 'BMW M4 GLB LIVE';
        draco.dispose();
        resolve();
      },
      undefined,
      () => {
        const fallbackRig = buildStudioSilhouetteFallback();
        vehicleGroup.add(fallbackRig);
        state.loadedRealGLB = false;
        dom.modelStatusText.textContent = 'BMW M4 STUDIO RIG';
        draco.dispose();
        resolve();
      }
    );
  });
}

const hotspotElements = new Map();

function initHotspots() {
  HOTSPOTS.forEach((spot) => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'hotspot-pin';
    pin.dataset.hotspotId = spot.id;
    pin.setAttribute('aria-label', `Inspect ${spot.name}`);
    pin.innerHTML = `
      <span class="hotspot-pin__pulse"></span>
      <span class="hotspot-pin__tag">${spot.name}</span>
    `;
    pin.addEventListener('click', () => selectHotspot(spot.id));
    dom.hotspotsLayer.appendChild(pin);

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'hotspot-pill';
    pill.dataset.hotspotId = spot.id;
    pill.textContent = spot.name;
    pill.addEventListener('click', () => selectHotspot(spot.id));
    dom.hotspotPills.appendChild(pill);

    hotspotElements.set(spot.id, { pin, pill, data: spot });
  });

  dom.inspectorClose.addEventListener('click', () => clearHotspotSelection(true));

  dom.inspectorPrev.addEventListener('click', () => {
    const idx = HOTSPOTS.findIndex((h) => h.id === state.selectedHotspotId);
    const prevIdx = (idx - 1 + HOTSPOTS.length) % HOTSPOTS.length;
    selectHotspot(HOTSPOTS[prevIdx].id);
  });

  dom.inspectorNext.addEventListener('click', () => {
    const idx = HOTSPOTS.findIndex((h) => h.id === state.selectedHotspotId);
    const nextIdx = (idx + 1) % HOTSPOTS.length;
    selectHotspot(HOTSPOTS[nextIdx].id);
  });
}

function selectHotspot(id) {
  const entry = hotspotElements.get(id);
  if (!entry) return;

  if (state.autoRotateBeforeHotspot === null) {
    state.autoRotateBeforeHotspot = state.autoRotate;
  }

  state.selectedHotspotId = id;
  state.userOverrodeCamera = false;
  setAutoRotate(false);

  hotspotElements.forEach(({ pin, pill }, key) => {
    const active = key === id;
    pin.classList.toggle('is-selected', active);
    pill.classList.toggle('is-selected', active);
  });

  const { code, name, tag, description, camPos, camTarget } = entry.data;
  dom.inspectorCode.textContent = code;
  dom.inspectorTitle.textContent = name;
  dom.inspectorTag.textContent = tag;
  dom.inspectorDesc.textContent = description;
  dom.inspectorPanel.classList.add('is-open');
  dom.inspectorPanel.setAttribute('aria-hidden', 'false');

  transitionCameraTo(camPos, camTarget, 34, 1.0);
}

function clearHotspotSelection(shouldReturnCamera = false) {
  const hadSelection = state.selectedHotspotId !== null;
  const savedAutoRotate = state.autoRotateBeforeHotspot;

  state.selectedHotspotId = null;
  state.autoRotateBeforeHotspot = null;

  hotspotElements.forEach(({ pin, pill }) => {
    pin.classList.remove('is-selected');
    pill.classList.remove('is-selected');
  });

  dom.inspectorPanel.classList.remove('is-open');
  dom.inspectorPanel.setAttribute('aria-hidden', 'true');

  if (savedAutoRotate !== null) {
    setAutoRotate(savedAutoRotate);
  }

  if (shouldReturnCamera && hadSelection) {
    state.userOverrodeCamera = false;
    const preset = state.activeScene === 2 ? CAMERA_PRESETS.low : CAMERA_PRESETS.threeQuarter;
    transitionCameraTo(preset.pos, preset.target, preset.fov, 1.0);
  }
}

const tempVec = new THREE.Vector3();
const camToAnchor = new THREE.Vector3();
const camForward = new THREE.Vector3();
const anchorOffset = new THREE.Vector3();
const camOffset = new THREE.Vector3();

function updateHotspotProjections() {
  if (!dom.hotspotsLayer.classList.contains('is-active')) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.getWorldDirection(camForward);
  camOffset.subVectors(camera.position, vehicleGroup.position);

  hotspotElements.forEach(({ pin, data }) => {
    tempVec.copy(data.anchor).applyMatrix4(vehicleGroup.matrixWorld);
    anchorOffset.subVectors(tempVec, vehicleGroup.position);
    camToAnchor.subVectors(tempVec, camera.position);
    const inFront = camToAnchor.dot(camForward) > 0;

    tempVec.project(camera);
    const x = (tempVec.x * 0.5 + 0.5) * width;
    const y = (-(tempVec.y * 0.5) + 0.5) * height;

    if (!inFront || x < -40 || x > width + 40 || y < -40 || y > height + 40) {
      pin.style.opacity = '0';
      pin.style.pointerEvents = 'none';
      return;
    }

    pin.style.opacity = '';
    pin.style.pointerEvents = 'auto';
    pin.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;

    const facingCamera = anchorOffset.dot(camOffset) > -0.25;
    pin.classList.toggle('is-occluded', !facingCamera);
  });
}

function transitionCameraTo(targetPos, targetLookAt, targetFov = 40, duration = 1.0) {
  cancelActiveCameraTweens();

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration,
    ease: 'power2.out'
  });

  gsap.to(controls.target, {
    x: targetLookAt.x,
    y: targetLookAt.y,
    z: targetLookAt.z,
    duration,
    ease: 'power2.out'
  });

  if (Math.abs(camera.fov - targetFov) > 0.1) {
    gsap.to(camera, {
      fov: targetFov,
      duration,
      ease: 'power2.out',
      onUpdate: () => camera.updateProjectionMatrix()
    });
  }
}

function setAutoRotate(enabled) {
  state.autoRotate = enabled;
  const btn = document.getElementById('btn-auto-rotate');
  if (btn) {
    btn.setAttribute('aria-pressed', String(enabled));
  }
}

function initConfiguratorUI() {
  const presetBtns = document.querySelectorAll('[data-cam-preset]');
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.camPreset;
      const preset = CAMERA_PRESETS[presetKey];
      if (!preset) return;

      presetBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.userOverrodeCamera = false;
      setAutoRotate(false);
      transitionCameraTo(preset.pos, preset.target, preset.fov, 1.0);
    });
  });

  const autoRotateBtn = document.getElementById('btn-auto-rotate');
  autoRotateBtn?.addEventListener('click', () => {
    const nextState = !state.autoRotate;
    setAutoRotate(nextState);
    if (nextState) {
      state.userOverrodeCamera = false;
    }
  });

  const lightBtn = document.getElementById('btn-studio-light');
  const lightLabel = document.getElementById('light-mode-label');

  lightBtn?.addEventListener('click', () => {
    state.darkStudioMode = !state.darkStudioMode;
    lightBtn.setAttribute('aria-pressed', String(state.darkStudioMode));

    if (state.darkStudioMode) {
      if (lightLabel) lightLabel.textContent = 'M-BLUE NIGHT';
      lights.keySpot.intensity = 25;
      lights.rimBlue.intensity = 85;
      lights.underGlow.intensity = 5.0;
    } else {
      if (lightLabel) lightLabel.textContent = 'SILVER STUDIO';
      lights.keySpot.intensity = 58;
      lights.rimBlue.intensity = 46;
      lights.underGlow.intensity = 2.2;
    }
  });

  const resetBtn = document.getElementById('btn-reset-cam');
  resetBtn?.addEventListener('click', () => {
    presetBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.camPreset === 'threeQuarter'));
    clearHotspotSelection(false);
    state.userOverrodeCamera = false;
    setAutoRotate(!PREFERS_REDUCED_MOTION);
    const hero34 = CAMERA_PRESETS.threeQuarter;
    transitionCameraTo(hero34.pos, hero34.target, hero34.fov, 1.0);
  });
}

function playOpeningSequence() {
  if (openingTimeline) openingTimeline.kill();
  cancelActiveCameraTweens();

  state.isReplayingOpening = true;
  state.userOverrodeCamera = false;

  gsap.set('#hero-built', { yPercent: 115, xPercent: 0 });
  gsap.set('#hero-different', { yPercent: 115, xPercent: 0 });
  gsap.set('.hero-kicker, .hero-footer', { opacity: 0, y: 18 });
  gsap.set('#hud-header', { opacity: 0, y: -16 });

  camera.position.set(5.4, 1.75, 5.9);
  controls.target.copy(CAMERA_PRESETS.hero.target);

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      state.isReplayingOpening = false;
    }
  });
  openingTimeline = tl;

  tl.to(dom.loader, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      dom.loader.style.display = 'none';
      document.body.classList.remove('is-loading');
      ScrollTrigger.refresh();
    }
  })
    .to(camera.position, {
      x: CAMERA_PRESETS.hero.pos.x,
      y: CAMERA_PRESETS.hero.pos.y,
      z: CAMERA_PRESETS.hero.pos.z,
      duration: 1.4
    }, '-=0.2')
    .to('#hero-built', { yPercent: 0, duration: 0.9 }, '-=1.1')
    .to('#hero-different', { yPercent: 0, duration: 0.9 }, '-=0.7')
    .to('#hud-header, .hero-kicker, .hero-footer', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.08
    }, '-=0.6');
}

function replayOpeningSequence() {
  if (openingTimeline) openingTimeline.kill();
  cancelActiveCameraTweens();
  clearHotspotSelection(false);

  state.isReplayingOpening = true;
  state.userOverrodeCamera = false;

  gsap.set('#hero-built', { yPercent: 115, xPercent: 0 });
  gsap.set('#hero-different', { yPercent: 115, xPercent: 0 });
  gsap.set('.hero-kicker, .hero-footer', { opacity: 0, y: 18 });

  camera.position.set(5.4, 1.75, 5.9);
  controls.target.copy(CAMERA_PRESETS.hero.target);

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      state.isReplayingOpening = false;
    }
  });
  openingTimeline = tl;

  tl.to(camera.position, {
    x: CAMERA_PRESETS.hero.pos.x,
    y: CAMERA_PRESETS.hero.pos.y,
    z: CAMERA_PRESETS.hero.pos.z,
    duration: 1.3
  })
    .to('#hero-built', { yPercent: 0, duration: 0.9 }, '-=1.0')
    .to('#hero-different', { yPercent: 0, duration: 0.9 }, '-=0.7')
    .to('.hero-kicker, .hero-footer', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.08
    }, '-=0.6');
}

function initScrollChoreography() {
  ScrollTrigger.create({
    trigger: '#smooth-content',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      dom.progressFill.style.height = `${(self.progress * 100).toFixed(1)}%`;
    }
  });

  if (!PREFERS_REDUCED_MOTION) {
    gsap.to('#hero-built', {
      xPercent: -8,
      ease: 'none',
      scrollTrigger: { trigger: '#scene-01', start: 'top top', end: 'bottom top', scrub: true }
    });

    gsap.to('#hero-different', {
      xPercent: 10,
      ease: 'none',
      scrollTrigger: { trigger: '#scene-01', start: 'top top', end: 'bottom top', scrub: true }
    });

    gsap.to('#marquee-track', {
      xPercent: -25,
      ease: 'none',
      scrollTrigger: { trigger: '#scene-04', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  document.querySelectorAll('.scene').forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => activateScene(index),
      onEnterBack: () => activateScene(index)
    });
  });

  document.querySelectorAll('.metric-num').forEach((el) => {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const counter = { val: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = counter.val.toFixed(decimals);
          }
        });
      }
    });
  });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });
}

function activateScene(index) {
  const previousScene = state.activeScene;
  state.activeScene = index;
  dom.progressIndex.textContent = String(index + 1).padStart(2, '0');

  if (previousScene !== index) {
    state.userOverrodeCamera = false;
  }

  dom.navLinks.forEach((link, idx) => {
    link.classList.toggle('is-active', idx === index);
  });

  const interactiveMode = index === 1 || index === 2;
  controls.enabled = interactiveMode;
  dom.stage.classList.toggle('is-interactive', interactiveMode);

  const showHotspots = index === 2;
  dom.hotspotsLayer.classList.toggle('is-active', showHotspots);
  dom.hotspotsLayer.setAttribute('aria-hidden', String(!showHotspots));

  if (!showHotspots && state.selectedHotspotId) {
    clearHotspotSelection(false);
  }

  if (state.selectedHotspotId || state.isUserInteracting || state.userOverrodeCamera || state.isReplayingOpening) {
    return;
  }

  switch (index) {
    case 0: transitionCameraTo(CAMERA_PRESETS.hero.pos, CAMERA_PRESETS.hero.target, CAMERA_PRESETS.hero.fov, 1.0); break;
    case 1: transitionCameraTo(CAMERA_PRESETS.threeQuarter.pos, CAMERA_PRESETS.threeQuarter.target, CAMERA_PRESETS.threeQuarter.fov, 1.0); break;
    case 2: transitionCameraTo(CAMERA_PRESETS.low.pos, CAMERA_PRESETS.low.target, CAMERA_PRESETS.low.fov, 1.0); break;
    case 3: transitionCameraTo(CAMERA_PRESETS.side.pos, CAMERA_PRESETS.side.target, CAMERA_PRESETS.side.fov, 1.1); break;
    case 4: transitionCameraTo(CAMERA_PRESETS.design.pos, CAMERA_PRESETS.design.target, CAMERA_PRESETS.design.fov, 1.1); break;
    case 5: transitionCameraTo(CAMERA_PRESETS.final.pos, CAMERA_PRESETS.final.target, CAMERA_PRESETS.final.fov, 1.1); break;
  }
}

function initNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();
      closeMobileDrawer();

      const isReplayAction = targetId === '#scene-01' && anchor.textContent.includes('REPLAY');

      gsap.to(window, {
        duration: 1.0,
        scrollTo: { y: targetEl, offsetY: 0 },
        ease: 'power2.inOut',
        onComplete: () => {
          if (isReplayAction) replayOpeningSequence();
        }
      });
    });
  });

  dom.menuToggle.addEventListener('click', () => {
    const isOpen = dom.navDrawer.classList.toggle('is-open');
    dom.menuToggle.classList.toggle('is-open', isOpen);
    dom.menuToggle.setAttribute('aria-expanded', String(isOpen));
    dom.navDrawer.setAttribute('aria-hidden', String(!isOpen));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.navDrawer.classList.contains('is-open')) {
        closeMobileDrawer();
      } else if (state.selectedHotspotId) {
        clearHotspotSelection(true);
      }
    }
  });
}

function closeMobileDrawer() {
  dom.navDrawer.classList.remove('is-open');
  dom.menuToggle.classList.remove('is-open');
  dom.menuToggle.setAttribute('aria-expanded', 'false');
  dom.navDrawer.setAttribute('aria-hidden', 'true');
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (state.autoRotate && !state.isUserInteracting && !state.selectedHotspotId) {
    if (state.activeScene === 1 || state.activeScene === 2) {
      vehicleGroup.rotation.y += delta * 0.22;
    } else {
      vehicleGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.045;
    }
  }

  controls.update();
  updateHotspotProjections();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1);
});

async function bootstrap() {
  initHotspots();
  initConfiguratorUI();
  initNavigation();
  initMobileTouchGestures();

  const bootProgress = { val: 0 };
  const progressTween = gsap.to(bootProgress, {
    val: 88,
    duration: 0.8,
    ease: 'power2.out',
    onUpdate: () => {
      const pct = Math.round(bootProgress.val);
      dom.loaderCounter.textContent = String(pct).padStart(3, '0');
      dom.loaderBar.style.width = `${pct}%`;
    }
  });

  await loadVehicleAsset();
  progressTween.kill();

  gsap.to(bootProgress, {
    val: 100,
    duration: 0.3,
    ease: 'power2.out',
    onUpdate: () => {
      const pct = Math.round(bootProgress.val);
      dom.loaderCounter.textContent = String(pct).padStart(3, '0');
      dom.loaderBar.style.width = `${pct}%`;
    },
    onComplete: () => {
      dom.loaderStatus.textContent = 'STUDIO READY';
      initScrollChoreography();
      animate();
      playOpeningSequence();
    }
  });
}

bootstrap();