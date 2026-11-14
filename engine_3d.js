// ============================================================
// NECRODICE 3D ENGINE (Inscryption & Buckshot Roulette Aesthetic)
// Gritty underground gambling room with interactive 3D table & cards
// ============================================================

(function() {
  let scene, camera, renderer;
  let tableMesh, lampMesh, ceilingWire, pointLight, spotLight;
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
    camera.fov = Math.min(100, Math.max(48, 2 * Math.atan(Math.tan(0.7) / a) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================================================
  // MASA NESNELERİ: kartlar, deste, jokerler, mühür, ok, PAS, menü
  // Oyun mantığına dokunulmaz: tıklamalar ilgili DOM öğesine yönlendirilir.
  // ============================================================
  const CARD_W = 0.44, CARD_H = 0.64, CARD_T = 0.006, TABLE_Y = 0.53;
  const DECK_POS = new THREE.Vector3(-1.8, TABLE_Y, 0.4);
  const items = new Map();
  let sealItem = null, arrowItem = null;
  let hovered = null;
  const V3 = THREE.Vector3;

  function getCardTexture(src) {
    if (textureCache[src]) return textureCache[src];
    let tex;
    if (String(src).indexOf('num:') === 0) {
      const v = String(src).slice(4);
      const c = document.createElement('canvas');
      c.width = 256; c.height = 372;
      const x = c.getContext('2d');
      x.fillStyle = '#c9c4b8'; x.fillRect(0, 0, 256, 372);
      x.strokeStyle = '#6b1d12'; x.lineWidth = 8; x.strokeRect(10, 10, 236, 352);
      x.fillStyle = '#b8381f'; x.font = 'bold 170px serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(v, 128, 190);
      tex = new THREE.CanvasTexture(c);
    } else {
      tex = new THREE.TextureLoader().load(src);
    }
    tex.anisotropy = 4;
    textureCache[src] = tex;
    return tex;
  }

  function createCard(frontSrc, backSrc, w, h) {
    w = w || CARD_W; h = h || CARD_H;
    const geom = new THREE.BoxGeometry(w, CARD_T, h);
    const edge = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.8 });
    const front = new THREE.MeshStandardMaterial({ map: getCardTexture(frontSrc), roughness: 0.65, metalness: 0.08 });
    const back = new THREE.MeshStandardMaterial({ map: getCardTexture(backSrc), roughness: 0.65, metalness: 0.08 });
    const mesh = new THREE.Mesh(geom, [edge, edge, front, back, edge, edge]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.front = front; mesh.userData.back = back;
    return mesh;
  }

  // Yazılı yuvarlak plaka dokusu (PAS, +, −, mühür sayısı...)
  function labelTexture(text, bg, fg, rim) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
    const g = x.createRadialGradient(128, 110, 20, 128, 128, 140);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = rim || fg; x.globalAlpha = 0.55; x.lineWidth = 5;
    x.beginPath(); x.arc(128, 128, 108, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = 1;
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = String(text).split('\n');
    let fs = lines.length > 1 ? 70 : 110;
    const ff = '"Pirata One", "Pixelify Sans", serif';
    do { x.font = 'bold ' + fs + 'px ' + ff; fs -= 4; }
    while (fs > 18 && Math.max.apply(null, lines.map(l => x.measureText(l).width)) > 184);
    const lh = fs * 1.15;
    lines.forEach((l, i) => x.fillText(l, 128, 132 + (i - (lines.length - 1) / 2) * lh));
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Masaya oturan yuvarlak plaka (silindir + üstte yazı düzlemi)
  function createPlate(radius, height, text, bg, fg, rimColor) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.04, height, 40),
      new THREE.MeshStandardMaterial({ color: rimColor || 0x2a1a10, roughness: 0.5, metalness: 0.5 }));
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const topMat = new THREE.MeshStandardMaterial({ map: labelTexture(text, bg, fg), roughness: 0.55, metalness: 0.2 });
    const top = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.96, 40), topMat);
    top.rotation.x = -Math.PI / 2; top.position.y = height / 2 + 0.001;
    g.add(top);
    g.userData.top = top; g.userData.topMat = topMat; g.userData.body = body;
    g.userData.plate = true;
    return g;
  }

  function setPlateText(group, text, bg, fg) {
    const m = group.userData.topMat;
    if (m.map) m.map.dispose();
    m.map = labelTexture(text, bg, fg);
    m.needsUpdate = true;
  }

  function placeItem(it, x, y, z, rx, ry, rz, s) {
    it.tp.set(x, y, z); it.tr.set(rx, ry, rz); it.ts = (s == null ? 1 : s);
    if (!it.placed) {
      it.placed = true;
      if (!it.spawned) {
        it.mesh.position.copy(it.tp); it.mesh.rotation.copy(it.tr); it.mesh.scale.setScalar(it.ts);
      }
    }
  }

  function ensureItem(key, kind, build, spawnFrom) {
    let it = items.get(key);
    if (!it) {
      const mesh = build();
      it = { key, kind, mesh, tp: new V3(), tr: new THREE.Euler(), ts: 1, dying: false, placed: false,
             spawned: false, t0: clock.getElapsedTime(), arc: 0, dom: null, hl: false, dim: false, mod: false, seen: true, frontSrc: null };
      mesh.userData.item = it;
      if (spawnFrom) {
        it.spawned = true; it.arc = 0.5;
        mesh.position.copy(spawnFrom).add(new V3(0, 0.03, 0));
        mesh.rotation.set(0, 0.25, Math.PI);
        mesh.scale.setScalar(0.92);
      }
      scene.add(mesh);
      items.set(key, it);
    }
    it.seen = true; it.dying = false;
    return it;
  }

  function setFront(it, src) {
    if (it.frontSrc === src) return;
    it.frontSrc = src;
    const m = it.mesh.userData.front;
    m.map = getCardTexture(src); m.needsUpdate = true;
  }

  const backSrc = () => (typeof HDBK !== 'undefined' && HDBK) ? HDBK : IMG.bn;
  function numSrc(c) { // kartın yüzü: sayı varsa onun görseli
    const v = (c.o != null) ? c.o : c.n;
    if (v == null || (v === 0 && c.o == null)) return null;
    if (typeof HDN !== 'undefined' && HDN[v]) return HDN[v];
    if (IMG.n && IMG.n[v]) return IMG.n[v];
    return 'num:' + v;
  }

  function jokerSrc(id) { return IMG.j[id]; }

  function domOK(sel) { const el = document.querySelector(sel); return !!el && !el.disabled; }

  // --- MASAYI OYUN DURUMUYLA EŞLE ---
  function sync3DTable(S) {
    if (!scene || !is3DActive || !S) return;
    items.forEach(it => { it.seen = false; });

    const isSpec = typeof MODE !== 'undefined' && MODE === 'spectator';
    const askP = (typeof P !== 'undefined') ? P : null;
    const kind = askP ? askP.ks[askP.pk.length] : null;
    const cn = askP ? cand() : [];

    // 1) KART SIRALARI (rakip: -z, biz: +z)
    const rows = [[1, -0.55], [0, 1.15]];
    rows.forEach(([p, z]) => {
      const pl = S.pl[p];
      const list = pl.open.map(c => ({ c, closed: false })).concat(pl.closed.map(c => ({ c, closed: true })));
      const a = pl.open.length, b = pl.closed.length, n = list.length;
      const gap = (a > 0 && b > 0) ? 0.35 : 0;
      const sp = Math.min(0.5, 3.8 / Math.max(n + gap, 1));
      const span = (n - 1 + gap) * sp;
      list.forEach((o, i) => {
        const c = o.c;
        const x = (i + (i >= a ? gap : 0)) * sp - span / 2;
        const down = o.closed && !(p === 0 ? (S.rev || peek.has(c.id)) : S.rev);
        const known = numSrc(c);
        const it = ensureItem('c' + c.id, 'card', () => createCard(known || backSrc(), backSrc()), DECK_POS);
        setFront(it, known || backSrc());
        it.dom = '[data-c="' + c.id + '"]';
        it.hl = kind !== 'eff' && cn.includes(c.id);
        it.mod = c.o != null;
        placeItem(it, x, TABLE_Y + (it.hl ? 0.07 : 0), z, 0, 0, down ? Math.PI : 0, 1);
      });
    });

    // 2) BİZİM JOKER ELİMİZ (masanın ön kenarında yelpaze)
    const keepIds = {};
    if (!isSpec) {
      const hand = S.hand[0] || [], n = hand.length, cnt = {};
      const sp = Math.min(0.5, 3.4 / Math.max(n, 1));
      hand.forEach((id, i) => {
        cnt[id] = (cnt[id] || 0) + 1;
        const key = 'h' + id + '_' + cnt[id];
        const mid = i - (n - 1) / 2;
        const it = ensureItem(key, 'hand', () => createCard(jokerSrc(id), jokerSrc(id)), DECK_POS);
        it.dom = '#hand img[data-j="' + id + '"]';
        const el = document.querySelector(it.dom);
        it.dim = !!(el && el.classList.contains('dim'));
        placeItem(it, mid * sp, TABLE_Y + 0.2, 2.05 + Math.abs(mid) * 0.05, 0.7, -mid * 0.07, 0, 0.9);
      });
    }

    // 3) RAKİBİN JOKER ELİ (kapalı, masanın uzak köşesinde)
    (S.hand[1] || []).forEach((_, i) => {
      const it = ensureItem('oh' + i, 'static', () => createCard(IMG.bj, IMG.bj), DECK_POS);
      placeItem(it, 1.15 + i * 0.2, TABLE_Y + 0.003 * i, -1.0, 0, 0.12 * (i % 2 ? 1 : -1), Math.PI, 0.55);
    });

    // 4) OYNANMIŞ ANLIK/KALICI JOKER ETKİLERİ (ortada, iki yanda)
    const sideCnt = { 0: 0, 1: 0 };
    (S.pj || []).forEach(x => {
      const e = S.eff.find(y => y.uid == x.uid) || x;
      const side = x.o == 1 ? 1 : 0;
      const i = sideCnt[side]++;
      const it = ensureItem('e' + x.uid, 'chip', () => createCard(jokerSrc(e.id), jokerSrc(e.id)), side ? new V3(1.15, TABLE_Y, -1.0) : new V3(0, TABLE_Y + 0.2, 2.05));
      it.dom = '[data-e="' + x.uid + '"]';
      it.hl = kind === 'eff' && cn.includes(e.uid);
      it.mod = !!e.neg;
      const sx = side ? -1 : 1;
      placeItem(it, sx * (0.85 + i * 0.33), TABLE_Y + (it.hl ? 0.07 : 0), 0.2 + (side ? -0.1 : 0.1), 0, sx * 0.05, 0, 0.62);
    });

    // 5) DESTE (tıkla = kart çek)
    const dc = Math.min((S.deck || []).length, 11);
    for (let i = 0; i < 12; i++) {
      const key = 'd' + i;
      if (i < dc) {
        const it = ensureItem(key, 'deck', () => createCard(backSrc(), backSrc()));
        it.dom = '#draw';
        placeItem(it, DECK_POS.x, TABLE_Y + i * 0.007, DECK_POS.z, 0, 0.05 * i, Math.PI, 1);
      } else if (items.has(key)) {
        items.get(key).seen = false;
      }
    }

    // 6) HEDEF MÜHÜRÜ (masanın ortasında)
    const T = tg(S), low = lowW(S);
    const label = low ? 'EN AZ' : String(T);
    const alt = (T != 21 || low);
    const skey = label + '|' + alt;
    if (!sealItem) {
      const g = createPlate(0.4, 0.05, label, alt ? '#7a5a12' : '#8e1020', '#f3e3c3', 0x3a0a10);
      g.position.set(0, TABLE_Y + 0.03, 0.2);
      g.userData.item = { kind: 'static', dying: false };
      scene.add(g);
      sealItem = { mesh: g, key: skey, pulse: -9 };
    } else if (sealItem.key !== skey) {
      setPlateText(sealItem.mesh, label, alt ? '#7a5a12' : '#8e1020', '#f3e3c3');
      sealItem.key = skey; sealItem.pulse = clock.getElapsedTime();
    }

    // 7) SIRA OKU
    if (!arrowItem) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 3),
        new THREE.MeshStandardMaterial({ color: 0x66ff88, emissive: 0x33aa55, emissiveIntensity: 0.9, roughness: 0.4 }));
      m.castShadow = true;
      scene.add(m);
      arrowItem = { mesh: m, mode: 'off' };
    }
    arrowItem.mode = (S.wait || S.over) ? 'off' : (S.turn === 0 ? 'me' : 'op');

    // 8) PAS / TURU BİTİR (masadaki pirinç plaka)
    const passEl = document.getElementById('pass');
    const passTxt = passEl ? passEl.textContent : 'Pas';
    const ends = passTxt.toLowerCase().indexOf('bitir') >= 0;
    const passKey = 'pass';
    const pText = ends ? 'TURU\nBİTİR' : 'PAS';
    let pit = items.get(passKey);
    if (!pit) {
      pit = ensureItem(passKey, 'plate', () => createPlate(0.27, 0.09, pText, '#1f5c33', '#e9ffe9', 0x15361f));
      pit.label = pText;
    }
    if (pit.label !== pText) { setPlateText(pit.mesh, pText, ends ? '#7a5a12' : '#1f5c33', '#f6ffe9'); pit.label = pText; }
    pit.dom = '#pass';
    pit.dim = !passEl || passEl.disabled;
    pit.mesh.visible = !isSpec && !(passEl && passEl.style.display === 'none');
    placeItem(pit, 1.3, TABLE_Y + 0.06, 0.8, 0, 0, 0, 1);

    // 9) MENÜ DEFTERİ (sol ön köşe)
    let bit = items.get('book');
    if (!bit) {
      bit = ensureItem('book', 'book', () => {
        const top = new THREE.MeshStandardMaterial({ map: bookTexture(), roughness: 0.8 });
        const side = new THREE.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.9 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.36), [side, side, top, side, side, side]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        return mesh;
      });
    }
    bit.dom = '[data-g]';
    placeItem(bit, -1.55, TABLE_Y + 0.045, 1.0, 0, 0.3, 0, 1);

    // 10) SEÇİM JETONLARI (joker hedef seçerken: Ekle / Çıkar / Vazgeç)
    const tokenDefs = [];
    if (document.querySelector('#prompt [data-x]')) {
      if (document.querySelector('#prompt [data-s]')) {
        tokenDefs.push({ k: 'tkp', t: '+', dom: '#prompt [data-s="1"]', x: -0.5, bg: '#1f5c33' });
        tokenDefs.push({ k: 'tkm', t: '−', dom: '#prompt [data-s="-1"]', x: 0.0, bg: '#8e1020' });
      }
      tokenDefs.push({ k: 'tkx', t: 'VAZ\nGEÇ', dom: '#prompt [data-x]', x: 0.5, bg: '#3a3a3a' });
    }
    const wantTok = {};
    tokenDefs.forEach(d => {
      wantTok[d.k] = 1;
      const it = ensureItem(d.k, 'token', () => createPlate(0.2, 0.07, d.t, d.bg, '#ffeccc', 0x222222), new V3(0, TABLE_Y + 0.3, 0.9));
      it.dom = d.dom;
      placeItem(it, d.x, TABLE_Y + 0.05, 0.62, 0, 0, 0, 1);
    });
    ['tkp', 'tkm', 'tkx'].forEach(k => { if (!wantTok[k] && items.has(k)) items.get(k).seen = false; });

    // Görülmeyenleri söndür
    items.forEach(it => {
      if (!it.seen && it.key !== 'pass' && it.key !== 'book') it.dying = true;
    });
  }

  function bookTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 368;
    const x = c.getContext('2d');
    x.fillStyle = '#3a2216'; x.fillRect(0, 0, 512, 368);
    for (let i = 0; i < 400; i++) {
      x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.12) + ')';
      x.fillRect(Math.random() * 512, Math.random() * 368, 2 + Math.random() * 6, 1);
    }
    x.strokeStyle = '#b8903a'; x.lineWidth = 6; x.strokeRect(22, 22, 468, 324);
    x.fillStyle = '#d8b560'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 96px "Pirata One", serif';
    x.fillText('MENÜ', 256, 190);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  // --- ETKİLEŞİM (üzerine gelme + tıklama) ---
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function interactive(it) {
    if (it.dying || !it.dom || !it.mesh.visible) return false;
    return domOK(it.dom);
  }
  function pickItem(cx, cy) {
    if (!camera) return null;
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = [];
    items.forEach(it => { if (interactive(it)) meshes.push(it.mesh); });
    const hits = ray.intersectObjects(meshes, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !(o.userData && o.userData.item)) o = o.parent;
    return o ? o.userData.item : null;
  }
  const overlayOpen = t => !!(t.closest && t.closest('button,input,label,#menu,#m,#zm,#cast,#fl,[data-av]'));

  function initPicking() {
    document.addEventListener('click', function(e) {
      if (!is3DActive || !e.isTrusted || overlayOpen(e.target)) return;
      const it = pickItem(e.clientX, e.clientY);
      if (!it) return;
      const el = document.querySelector(it.dom);
      if (el && !el.disabled) el.click();
    });
    document.addEventListener('mousemove', function(e) {
      if (!is3DActive) return;
      hovered = overlayOpen(e.target) ? null : pickItem(e.clientX, e.clientY);
      document.body.style.cursor = hovered ? 'pointer' : '';
    });
  }

  // --- ANİMASYON & RENDER ---
  let lastT = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !is3DActive) return;

    const time = clock.getElapsedTime();
    const dt = Math.min(0.05, time - lastT); lastT = time;
    const k = 1 - Math.exp(-dt * 10);

    // Kamera: hafif nefes alma + fare paralaksı
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 0.25;
    camera.position.y = 2.2 + Math.sin(time * 1.5) * 0.015 - mouse.y * 0.15;
    camera.rotation.y = -mouse.x * 0.08;
    camera.rotation.x = -0.52 - mouse.y * 0.06;

    // Lamba titremesi
    const flicker = 1.0 + (Math.sin(time * 12.0) * 0.04) + (Math.random() * 0.03 - 0.015);
    if (pointLight) pointLight.intensity = 1.8 * flicker;
    if (spotLight) spotLight.intensity = 4.2 * flicker;
    if (lampMesh && ceilingWire) {
      const sw = Math.sin(time * 1.2) * 0.04;
      lampMesh.rotation.z = sw; ceilingWire.rotation.z = sw * 0.5;
    }
    if (opponentMesh) opponentMesh.position.y = 0.9 + Math.sin(time * 1.8) * 0.012;

    // Nesneleri hedeflerine kaydır
    const dead = [];
    items.forEach(it => {
      const m = it.mesh;
      const hov = (hovered === it);
      let ty = it.tp.y + (hov ? (it.kind === 'hand' ? 0.12 : 0.05) : 0);
      let tz = it.tp.z + (hov && it.kind === 'hand' ? 0.1 : 0);
      if (it.dying) { it.ts = 0; }
      let yoff = 0;
      if (it.arc) {
        const u = (time - it.t0) / 0.75;
        if (u < 1) yoff = Math.sin(Math.PI * Math.max(0, u)) * it.arc; else it.arc = 0;
      }
      m.position.x += (it.tp.x - m.position.x) * k;
      if (it.by === undefined) it.by = m.position.y;
      it.by += (ty - it.by) * k;
      m.position.z += (tz - m.position.z) * k;
      m.position.y = it.by + yoff;
      m.rotation.x += (it.tr.x - m.rotation.x) * k;
      m.rotation.y += (it.tr.y - m.rotation.y) * k;
      m.rotation.z += (it.tr.z - m.rotation.z) * k;
      const s = it.ts * (hov ? 1.06 : 1);
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * k);
      if (it.dying && m.scale.x < 0.04) dead.push(it);

      // Işıltı: seçilebilir aday kartlar / değiştirilmiş kartlar / sönük jokerler
      const ud = m.userData;
      if (ud.front) {
        let ec = 0x000000, ei = 0;
        if (it.hl) { ec = 0xffb830; ei = 0.35 + 0.2 * Math.sin(time * 6); }
        else if (it.mod) { ec = it.kind === 'chip' ? 0x660000 : 0x5a2cff; ei = 0.35; }
        ud.front.emissive.setHex(ec); ud.front.emissiveIntensity = ei;
        ud.back.emissive.setHex(ec); ud.back.emissiveIntensity = ei;
        const col = it.dim ? 0x6a6a6a : 0xffffff;
        ud.front.color.setHex(col); ud.back.color.setHex(col);
      } else if (ud.plate) {
        const on = !it.dim;
        const glow = on ? 0.25 + 0.18 * Math.sin(time * 4) : 0;
        ud.topMat.emissive.setHex(on ? 0x335533 : 0x000000);
        ud.topMat.emissiveIntensity = glow;
        ud.topMat.color.setHex(on ? 0xffffff : 0x666666);
      }
    });
    dead.forEach(it => { scene.remove(it.mesh); items.delete(it.key); });

    // Mühür damgası (sayı değişince)
    if (sealItem) {
      const u = (time - sealItem.pulse) / 0.55;
      const sc = u < 1 ? 1 + 0.4 * (1 - u) * (1 - u) : 1;
      sealItem.mesh.scale.setScalar(sc);
      sealItem.mesh.position.y = TABLE_Y + 0.03 + (u < 1 ? 0.15 * (1 - u) : 0);
    }
    // Sıra oku
    if (arrowItem) {
      const a = arrowItem;
      const dirZ = a.mode === 'me' ? 1 : -1;
      a.mesh.visible = a.mode !== 'off';
      if (a.mesh.visible) {
        a.mesh.rotation.set(dirZ * Math.PI / 2, 0, 0);
        a.mesh.position.set(0, TABLE_Y + 0.11, 0.2 + dirZ * (0.27 + 0.03 * Math.sin(time * 4)));
        const mat = a.mesh.material;
        mat.color.setHex(a.mode === 'me' ? 0x66ff88 : 0xff4455);
        mat.emissive.setHex(a.mode === 'me' ? 0x33aa55 : 0xaa2233);
      }
    }

    renderer.render(scene, camera);
  }

  // Oyun için küresel kancalar
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
    sync: function(S) { sync3DTable(S); },
    toggle: function(active) {
      is3DActive = (active !== undefined) ? active : !is3DActive;
      localStorage.setItem('mode_3d', is3DActive ? '1' : '0');
      document.body.classList.toggle('view-3d', is3DActive);
      document.body.style.cursor = '';
      if (is3DActive && G) sync3DTable(G);
    },
    isActive: function() { return is3DActive; },
    debug: function() { return { project: function(k) { const it = items.get(k); if (!it) return null; const v = it.mesh.position.clone().project(camera); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; }, vp: [innerWidth, innerHeight, devicePixelRatio], items: Array.from(items.keys()), pick: function(x, y) { const it = pickItem(x, y); return it ? it.key + ' ' + it.dom : null; }, dom: function(k) { const it = items.get(k); return it ? [it.dom, !!document.querySelector(it.dom), interactive(it)] : null; } }; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.Necro3D.init);
  } else {
    window.Necro3D.init();
  }
})();
