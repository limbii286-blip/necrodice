// ============================================================
// NECRODICE 3D ENGINE (Inscryption & Buckshot Roulette Aesthetic)
// Gritty underground gambling room with interactive 3D table & cards
// ============================================================

(function() {
  let scene, camera, renderer;
  let tableMesh, lampMesh, ceilingWire, pointLight, spotLight;
  let cardMeshes = []; // { id, mesh, isClosed, targetPos, targetRot, p }
  let opponentMesh = null;
  let is3DActive = false;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = new THREE.Clock();
  let textureCache = {};

  // Check if 3D should be active
  function init3DSetting() {
    const pref = localStorage.getItem('mode_3d');
    is3DActive = pref === null ? true : pref === '1'; // Default to 3D active!
    document.body.classList.toggle('view-3d', is3DActive);
  }

  // Create procedural textures for tabletop and card back
  function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark stained, weathered oak
    ctx.fillStyle = '#1c130d';
    ctx.fillRect(0, 0, 1024, 1024);

    // Wood grain lines
    for (let i = 0; i < 600; i++) {
      const y = Math.random() * 1024;
      const h = 1 + Math.random() * 3;
      ctx.fillStyle = `rgba(10, 6, 3, ${0.15 + Math.random() * 0.25})`;
      ctx.fillRect(0, y, 1024, h);
    }

    // Scratches and cigarette burn marks
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const len = 10 + Math.random() * 40;
      const ang = Math.random() * Math.PI;
      ctx.strokeStyle = 'rgba(5, 3, 2, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Vignette / burnt edges
    const grad = ctx.createRadialGradient(512, 512, 200, 512, 512, 700);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Procedural dark concrete / dirty wall texture
  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const v = (Math.random() * 20) | 0;
      ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 2}, 0.25)`;
      ctx.fillRect(x, y, 2, 2);
    }
    return new THREE.CanvasTexture(canvas);
  }

  function initScene() {
    const container = document.getElementById('scene3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040305, 0.12);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    // Inscryption style: seated directly in front of the table looking across
    camera.position.set(0, 2.2, 3.4);
    camera.rotation.x = -0.52;

    fitFov();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);

    // --- ROOM GEOMETRY ---
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
      metalness: 0.1
    });

    // Back wall behind opponent
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMat);
    backWall.position.set(0, 3, -5);
    scene.add(backWall);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallMat);
    floor.position.set(0, -1.2, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- HEAVY WOODEN GAMBLING TABLE ---
    const woodTex = createWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.75,
      metalness: 0.08
    });

    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 3.0), tableMat);
    tableMesh.position.set(0, 0.45, 0.2);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    scene.add(tableMesh);

    // Table legs
    const legGeo = new THREE.BoxGeometry(0.18, 1.7, 0.18);
    const legPositions = [
      [-1.9, -0.4, 1.4],
      [1.9, -0.4, 1.4],
      [-1.9, -0.4, -1.0],
      [1.9, -0.4, -1.0]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      scene.add(leg);
    });

    // --- HANGING SWAYING VINTAGE LAMP (The iconic Buckshot / Inscryption feel) ---
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 3.8, 0.2);

    // Ceiling wire
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    ceilingWire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6), wireMat);
    ceilingWire.position.y = -0.8;
    lampGroup.add(ceilingWire);

    // Conical metal lampshade
    const shadeGeo = new THREE.ConeGeometry(0.42, 0.35, 16, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2618,
      roughness: 0.6,
      metalness: 0.7,
      side: THREE.DoubleSide
    });
    lampMesh = new THREE.Mesh(shadeGeo, shadeMat);
    lampMesh.position.y = -1.6;
    lampGroup.add(lampMesh);

    // Exposed light bulb inside shade
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8aa });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), bulbMat);
    bulb.position.y = -1.65;
    lampGroup.add(bulb);

    scene.add(lampGroup);

    // Spotlight aiming directly down onto the card table
    spotLight = new THREE.SpotLight(0xffdf99, 4.2, 8, Math.PI / 3.4, 0.5, 1.2);
    spotLight.position.set(0, 2.1, 0.2);
    spotLight.target.position.set(0, 0.5, 0.2);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Warm ambient point light for the flickering bulb
    pointLight = new THREE.PointLight(0xffb84d, 1.8, 5, 2);
    pointLight.position.set(0, 2.1, 0.2);
    scene.add(pointLight);

    // Cold subtle fill light from behind player
    const fillLight = new THREE.DirectionalLight(0x1a2830, 0.6);
    fillLight.position.set(0, 4, 6);
    scene.add(fillLight);

    // --- OPPONENT SILHOUETTE (Inscryption "Leshy" Shadow Across the Table) ---
    createOpponentSilhouette();

    // Mouse parallax tracking
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
  }

  // Atmospheric shadowy opponent sitting across the table
  function createOpponentSilhouette() {
    const oppGroup = new THREE.Group();
    oppGroup.position.set(0, 0.9, -1.8);

    // Torso / trench coat
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.65, 1.3, 12);
    const darkClothMat = new THREE.MeshStandardMaterial({
      color: 0x070609,
      roughness: 0.95,
      metalness: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, darkClothMat);
    body.position.y = 0.2;
    oppGroup.add(body);

    // Hood / Head silhouette
    const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const head = new THREE.Mesh(headGeo, darkClothMat);
    head.position.y = 1.05;
    oppGroup.add(head);

    // Glowing eyes deep in the shadows (Inscryption signature)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2d3d });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
    leftEye.position.set(-0.09, 1.04, 0.28);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
    rightEye.position.set(0.09, 1.04, 0.28);
    oppGroup.add(leftEye);
    oppGroup.add(rightEye);

    // Small eye glow light
    const eyeLight = new THREE.PointLight(0xff2d3d, 0.8, 1.5);
    eyeLight.position.set(0, 1.04, 0.35);
    oppGroup.add(eyeLight);

    opponentMesh = oppGroup;
    scene.add(oppGroup);
  }

  function onMouseMove(e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  // Dar (dikey) ekranlarda yatay görüş açısını koru: masa ve kartlar kenara taşmasın
  function fitFov() {
    const a = window.innerWidth / window.innerHeight;
    camera.aspect = a;
    camera.fov = Math.min(100, Math.max(48, 2 * Math.atan(Math.tan(0.62) / a) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- CARD TEXTURE & MESH CREATION ---
  function getCardTexture(src) {
    if (textureCache[src]) return textureCache[src];
    const loader = new THREE.TextureLoader();
    const tex = loader.load(src);
    tex.anisotropy = 4;
    textureCache[src] = tex;
    return tex;
  }

  function create3DCardMesh(card, isBack, isPlayer) {
    // Standard playing card dimensions: ~0.42 x 0.63
    const cardW = 0.44, cardH = 0.64, cardThickness = 0.006;
    const geom = new THREE.BoxGeometry(cardW, cardThickness, cardH);

    const frontSrc = (isBack || card.n === 0) ? (typeof HDBK !== 'undefined' ? HDBK : IMG.bn) : (typeof HDN !== 'undefined' && HDN[card.n] ? HDN[card.n] : IMG.n[card.n]);
    const backSrc = typeof HDBK !== 'undefined' ? HDBK : IMG.bn;

    const frontTex = getCardTexture(frontSrc);
    const backTex = getCardTexture(backSrc);

    // Box faces: [right, left, top(front), bottom(back), front_edge, back_edge]
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.8 });
    const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.65, metalness: 0.08 });
    const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.65, metalness: 0.08 });

    const materials = [
      edgeMat, // right
      edgeMat, // left
      frontMat, // top (+Y, face up)
      backMat,  // bottom (-Y, face down)
      edgeMat, // front
      edgeMat  // back
    ];

    const mesh = new THREE.Mesh(geom, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // --- SYNC 3D TABLE WITH GAME STATE ---
  function sync3DTable(S) {
    if (!scene || !is3DActive || !S) return;

    // Clear existing cards from table
    cardMeshes.forEach(item => {
      scene.remove(item.mesh);
    });
    cardMeshes = [];

    // Table coordinates:
    // Center of table is z = 0.2, table surface y = 0.53
    const tableSurfaceY = 0.53;

    // 1. PLAYER OPEN & CLOSED CARDS (Near the player, z = 0.95)
    const pOpen = S.pl[0].open || [];
    const pClosed = S.pl[0].closed || [];
    const totalP = pOpen.length + pClosed.length;
    const spacing = 0.48;
    const startX_P = -((totalP - 1) * spacing) / 2;

    let idx = 0;
    // Open cards
    pOpen.forEach((c) => {
      const mesh = create3DCardMesh(c, false, true);
      const targetX = startX_P + (idx++) * spacing;
      mesh.position.set(targetX, tableSurfaceY, 1.5);
      mesh.rotation.set(0, 0, 0); // Face up
      scene.add(mesh);
      cardMeshes.push({ id: c.id, mesh, p: 0 });
    });
    // Closed cards
    pClosed.forEach((c) => {
      const isRevealed = S.rev || (typeof peek !== 'undefined' && peek.has(c.id));
      const mesh = create3DCardMesh(c, !isRevealed, true);
      const targetX = startX_P + (idx++) * spacing;
      mesh.position.set(targetX, tableSurfaceY, 1.5);
      // If closed, flipped face down (-PI on Z or rotated)
      if (!isRevealed) {
        mesh.rotation.set(0, 0, Math.PI);
      } else {
        mesh.rotation.set(0, 0, 0);
      }
      scene.add(mesh);
      cardMeshes.push({ id: c.id, mesh, p: 0 });
    });

    // 2. OPPONENT OPEN & CLOSED CARDS (Across the table, z = -0.55)
    const oppOpen = S.pl[1].open || [];
    const oppClosed = S.pl[1].closed || [];
    const totalOpp = oppOpen.length + oppClosed.length;
    const startX_Opp = -((totalOpp - 1) * spacing) / 2;

    let oppIdx = 0;
    oppOpen.forEach((c) => {
      const mesh = create3DCardMesh(c, false, false);
      const targetX = startX_Opp + (oppIdx++) * spacing;
      mesh.position.set(targetX, tableSurfaceY, -0.55);
      mesh.rotation.set(0, Math.PI, 0); // Angled towards opponent
      scene.add(mesh);
      cardMeshes.push({ id: c.id, mesh, p: 1 });
    });
    oppClosed.forEach((c) => {
      const isRevealed = S.rev;
      const mesh = create3DCardMesh(c, !isRevealed, false);
      const targetX = startX_Opp + (oppIdx++) * spacing;
      mesh.position.set(targetX, tableSurfaceY, -0.55);
      if (!isRevealed) {
        mesh.rotation.set(0, 0, Math.PI);
      } else {
        mesh.rotation.set(0, Math.PI, 0);
      }
      scene.add(mesh);
      cardMeshes.push({ id: c.id, mesh, p: 1 });
    });

    // 3. DECK OF CARDS ON THE TABLE
    if (S.deck && S.deck.length > 0) {
      const deckCount = Math.min(S.deck.length, 11);
      for (let i = 0; i < deckCount; i++) {
        const dMesh = create3DCardMesh({ n: 0 }, true, false);
        dMesh.position.set(-1.8, tableSurfaceY + i * 0.007, 0.4);
        dMesh.rotation.set(0, 0.05 * i, Math.PI);
        scene.add(dMesh);
        cardMeshes.push({ id: 'deck_' + i, mesh: dMesh });
      }
    }
  }

  // --- ANIMATION & RENDER LOOP ---
  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !is3DActive) return;

    const time = clock.getElapsedTime();

    // 1. Subtle camera breathing / head-sway (First Person Immersive)
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    camera.position.x = mouse.x * 0.25;
    camera.position.y = 2.2 + Math.sin(time * 1.5) * 0.015 - mouse.y * 0.15;
    camera.rotation.y = -mouse.x * 0.08;
    camera.rotation.x = -0.52 - mouse.y * 0.06;

    // 2. Realistic flickering lamp light (Unstable generator / candle feel)
    const flicker = 1.0 + (Math.sin(time * 12.0) * 0.04) + (Math.random() * 0.03 - 0.015);
    if (pointLight) pointLight.intensity = 1.8 * flicker;
    if (spotLight) spotLight.intensity = 4.2 * flicker;

    // 3. Gentle swaying lamp
    if (lampMesh && ceilingWire) {
      const swayAngle = Math.sin(time * 1.2) * 0.04;
      lampMesh.rotation.z = swayAngle;
      ceilingWire.rotation.z = swayAngle * 0.5;
    }

    // 4. Opponent subtle eerie breathing
    if (opponentMesh) {
      opponentMesh.position.y = 0.9 + Math.sin(time * 1.8) * 0.012;
    }

    renderer.render(scene, camera);
  }

  // 3D kart tıklaması: ilgili DOM kartına yönlendir (oyun mantığı değişmez)
  function initPicking() {
    const ray = new THREE.Raycaster(), v = new THREE.Vector2();
    document.addEventListener('click', function(e) {
      if (!is3DActive || !camera || !e.isTrusted) return;
      if (e.target.closest && e.target.closest('button,input,label,#menu,#m,#hand,[data-e],[data-j],[data-s],[data-x],[data-g],[data-av]')) return;
      v.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(v, camera);
      const hits = ray.intersectObjects(cardMeshes.filter(c => !String(c.id).startsWith('deck_')).map(c => c.mesh), true);
      if (!hits.length) return;
      let o = hits[0].object;
      const item = cardMeshes.find(c => c.mesh === o || c.mesh.children.includes(o));
      if (!item) return;
      const el = document.querySelector('[data-c="' + item.id + '"]');
      if (el) el.click();
    });
  }

  // Global hooks for game.js
  window.Necro3D = {
    init: function() {
      init3DSetting();
      try {
        initScene();
        initPicking();
      } catch (err) {
        console.warn('3D başlatılamadı, 2D moda dönülüyor', err);
        is3DActive = false;
        document.body.classList.remove('view-3d');
      }
    },
    sync: function(S) {
      sync3DTable(S);
    },
    toggle: function(active) {
      is3DActive = (active !== undefined) ? active : !is3DActive;
      localStorage.setItem('mode_3d', is3DActive ? '1' : '0');
      document.body.classList.toggle('view-3d', is3DActive);
      if (is3DActive && G) sync3DTable(G);
    },
    isActive: function() {
      return is3DActive;
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.Necro3D.init);
  } else {
    window.Necro3D.init();
  }
})();
