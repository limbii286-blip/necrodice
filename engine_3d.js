// ============================================================
// NECRODICE 3D ENGINE (Buckshot Roulette & Inscryption Aesthetic)
// Dinamik FPS Kamera:
// - Sıra sendeyken: Kamera masaya ve kartlarına doğru eğilir (net oynanış)
// - Hamleni yapıp sırayı devrettiğinde: Kamera karşıya, karanlığın içindeki
//   iki parlayan kızıl göze ve rakibin hamlelerine doğru kalkar.
// ============================================================

(function() {
  let scene, camera, renderer;
  let tableMesh, lampMesh, ceilingWire, pointLight, spotLight, handLight;
  let wallLights = [];
  let opponentMesh = null;
  let is3DActive = false;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = new THREE.Clock();
  let textureCache = {};

  // Dinamik Kamera Durumu (Buckshot Roulette tarzı masa <-> rakip geçişi)
  let camMode = 'table'; // 'table' | 'opponent' | 'die' | 'inspect'
  let camCurPos = new THREE.Vector3(0, 2.22, 2.68);
  let camCurPitch = -0.60;
  let camCurYaw = 0;

  // Masa aksesuarları etkileşim listesi
  let propsList = [];
  let candleFlames = [], candleLight = null, candleLit = true;
  let bellSwing = 0, bellVel = 0, bellMesh = null;
  let lampSwingBoost = 0, lampBoostVel = 0;
  let propToastTimer = null;

  function init3DSetting() {
    const pref = localStorage.getItem('mode_3d');
    is3DActive = pref === null ? true : pref === '1';
    document.body.classList.toggle('view-3d', is3DActive);
  }

  function playPropSfx(type) {
    try {
      if (typeof VS !== 'undefined' && VS <= 0) return;
      if (typeof tone !== 'function') return;
      if (type === 'bell') {
        tone(1180, 0.9, 'sine', 0.16);
        tone(1770, 0.6, 'triangle', 0.08, 0.02);
        if (typeof snd === 'function') snd('turn');
      } else if (type === 'candle_off') {
        if (typeof noise === 'function') noise(0.22, 0.18, 800);
        tone(140, 0.2, 'sine', 0.1, 0, -50);
      } else if (type === 'candle_on') {
        if (typeof noise === 'function') noise(0.15, 0.14, 1500);
        tone(320, 0.18, 'triangle', 0.1, 0, 180);
      } else if (type === 'lamp') {
        tone(210, 0.25, 'sawtooth', 0.08, 0, -60);
      }
    } catch (e) {}
  }

  function propReact(msg) {
    try {
      const sr = document.querySelector('#opp .sayrow');
      if (!sr) return;
      sr.innerHTML = `<span class="say">${msg}</span>`;
      clearTimeout(propToastTimer);
      propToastTimer = setTimeout(() => {
        if (typeof R === 'function' && typeof G !== 'undefined' && G) R();
      }, 2800);
    } catch (e) {}
  }

  // ============================================================
  // 1) DOKU ÜRETİCİLERİ (Masif Kütük Masa, Karanlık Tuğla Mahzen, Parlayan Gözler)
  // ============================================================
  function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Koyu, zengin, parlamayan mat ceviz/meşe masa yüzeyi (kartların net okunması için)
    ctx.fillStyle = '#24150b';
    ctx.fillRect(0, 0, 1024, 1024);

    const planks = 5;
    const pw = 1024 / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * pw;
      ctx.fillStyle = (p % 2 === 0) ? 'rgba(54, 32, 16, 0.34)' : 'rgba(18, 10, 4, 0.38)';
      ctx.fillRect(0, y0, 1024, pw);

      // Kalas birleşim derzi
      ctx.fillStyle = 'rgba(4, 2, 1, 0.92)';
      ctx.fillRect(0, y0, 1024, 6);
      ctx.fillStyle = 'rgba(85, 52, 26, 0.25)';
      ctx.fillRect(0, y0 + 6, 1024, 2);

      // Doğal ahşap damarları
      for (let i = 0; i < 150; i++) {
        const y = y0 + 8 + Math.random() * (pw - 14);
        const h = 1 + Math.random() * 2.2;
        ctx.fillStyle = Math.random() > 0.35
          ? `rgba(10, 5, 2, ${0.16 + Math.random() * 0.22})`
          : `rgba(76, 46, 22, ${0.08 + Math.random() * 0.14})`;
        ctx.fillRect(0, y, 1024, h);
      }

      // Budak halkaları
      const kx = 180 + ((p * 270) % 680);
      const ky = y0 + pw * 0.48;
      for (let r = 22; r > 3; r -= 3.5) {
        ctx.strokeStyle = r < 8 ? 'rgba(8, 3, 1, 0.72)' : 'rgba(22, 11, 4, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 2.0, r * 0.58, 0.05, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Masanın ortasında silik ritüel/kumar çizgileri (Buckshot Roulette masa çizgileri gibi)
    ctx.strokeStyle = 'rgba(180, 135, 75, 0.11)';
    ctx.lineWidth = 4;
    ctx.strokeRect(90, 90, 844, 844);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 512);
    ctx.lineTo(934, 512);
    ctx.stroke();

    // Kenar karartması (vignette)
    const grad = ctx.createRadialGradient(512, 512, 180, 512, 512, 700);
    grad.addColorStop(0, 'rgba(255, 190, 120, 0.04)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(4, 2, 1, 0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#09080b';
    ctx.fillRect(0, 0, 1024, 1024);

    const rows = 20, cols = 10;
    const bh = 1024 / rows, bw = 1024 / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off, y = r * bh;
        const seed = (r * 17 + c * 31) & 255;
        const baseR = 22 + (seed % 14);
        const baseG = 16 + ((seed >> 2) % 10);
        const baseB = 18 + ((seed >> 3) % 10);
        ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        ctx.fillRect(x + 4, y + 4, bw - 8, bh - 8);

        ctx.fillStyle = 'rgba(255, 200, 150, 0.05)';
        ctx.fillRect(x + 4, y + 4, bw - 8, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 1.8);
    return tex;
  }

  // Karanlığın içindeki hipnotik kızıl göz dokusu (Leshy / Buckshot tarzı keskin parlayan iris)
  function createGlowingEyeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);

    // Dış kızıl aura
    const g = x.createRadialGradient(128, 128, 8, 128, 128, 120);
    g.addColorStop(0, 'rgba(255, 230, 190, 1)');
    g.addColorStop(0.16, 'rgba(255, 60, 50, 0.98)');
    g.addColorStop(0.42, 'rgba(210, 15, 28, 0.78)');
    g.addColorStop(0.72, 'rgba(110, 5, 12, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);

    // Hipnotik konsantrik halka çizgileri
    x.strokeStyle = 'rgba(40, 0, 5, 0.75)';
    x.lineWidth = 3.5;
    [34, 54, 72].forEach(r => {
      x.beginPath();
      x.arc(128, 128, r, 0, Math.PI * 2);
      x.stroke();
    });

    // Dikey karanlık göz bebeği yarığı
    x.fillStyle = '#140003';
    x.beginPath();
    x.ellipse(128, 128, 8, 28, 0, 0, Math.PI * 2);
    x.fill();

    // Parlak kıvılcım yansıması
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(116, 114, 5, 0, Math.PI * 2);
    x.fill();

    return new THREE.CanvasTexture(c);
  }

  // Kart altında yumuşak temas gölgesi (contact shadow) dokusu
  let cardShadowTex = null;
  function getCardShadowTexture() {
    if (cardShadowTex) return cardShadowTex;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 192;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 96, 18, 64, 96, 86);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    g.addColorStop(0.7, 'rgba(0, 0, 0, 0.38)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 192);
    cardShadowTex = new THREE.CanvasTexture(c);
    return cardShadowTex;
  }

  // ============================================================
  // 2) SAHNE, MASİF MASA, IŞIKLANDIRMA & KARANLIKTAKİ KIZIL GÖZLER
  // ============================================================
  function initScene() {
    const container = document.getElementById('scene3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040306);
    scene.fog = new THREE.FogExp2(0x040306, 0.055);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.copy(camCurPos);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = camCurPitch;

    fitFov();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Kartların aşırı parlamasını (washout) önlemek için dengeli ton haritalama
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    container.appendChild(renderer.domElement);

    // --- BODRUM KATI ODASI ---
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      bumpMap: wallTex,
      bumpScale: 0.025,
      roughness: 0.92,
      metalness: 0.05
    });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.48, metalness: 0.82 });
    const rustyIronMat = new THREE.MeshStandardMaterial({ color: 0x2e2019, roughness: 0.65, metalness: 0.72 });
    const darkBeamMat = new THREE.MeshStandardMaterial({ color: 0x1a1109, roughness: 0.88, metalness: 0.05 });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
    backWall.position.set(0, 2.2, -3.85);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    leftWall.position.set(-4.5, 2.2, 0.2);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    rightWall.position.set(4.5, 2.2, 0.2);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), wallMat);
    floor.position.set(0, -1.18, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Arka duvarda taş sütunlar ve rakibin arkasında zifiri karanlık niş
    [-2.85, -1.25, 1.25, 2.85].forEach(px => {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.2, 0.26), darkBeamMat);
      pilaster.position.set(px, 1.3, -3.72);
      scene.add(pilaster);
    });

    // Rakibin arkasındaki zifiri karanlık boşluk (kızıl gözlerin tam kontrastla parlaması için)
    const abyssBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.6),
      new THREE.MeshBasicMaterial({ color: 0x010102, fog: false })
    );
    abyssBackdrop.position.set(0, 1.25, -3.76);
    scene.add(abyssBackdrop);

    // Yanlarda loş endüstriyel bodrum aplikleri (sadece yan duvarları hafif aydınlatır, ortadaki karanlığı bozmaz)
    [-2.35, 2.35].forEach((sx, idx) => {
      const sconceGrp = new THREE.Group();
      sconceGrp.position.set(sx, 2.1, -3.66);

      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.15, 8, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x221a14, wireframe: true }));
      sconceGrp.add(cage);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xff9933, fog: false }));
      sconceGrp.add(bulb);
      scene.add(sconceGrp);

      const wLight = new THREE.PointLight(0xff7722, 0.95, 4.5, 1.8);
      wLight.position.set(sx, 2.0, -3.25);
      scene.add(wLight);
      wallLights.push({ light: wLight, phase: idx * 2.1 });
    });

    // Tavan kirişleri ve borular
    [-2.8, -1.2, 0.4, 2.0].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 0.28), darkBeamMat);
      beam.position.set(0, 3.25, z);
      scene.add(beam);
    });

    const pipeH = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 9.0, 12), rustyIronMat);
    pipeH.rotation.z = Math.PI / 2;
    pipeH.position.set(0, 2.58, -3.68);
    scene.add(pipeH);

    // Sağ arkada demir parmaklıklı bodrum penceresi
    const winGroup = new THREE.Group();
    winGroup.position.set(2.35, 2.62, -3.78);
    winGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.48), new THREE.MeshBasicMaterial({ color: 0x182c44 })));
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.50, 8), darkIronMat);
      bar.position.set(i * 0.18, 0, 0.02);
      winGroup.add(bar);
    }
    scene.add(winGroup);

    // --- MASİF KÜTÜK MASA & DÖVME DEMİR U-AYAKLAR ---
    const woodTex = createWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      bumpMap: woodTex,
      bumpScale: 0.012,
      roughness: 0.82, // Yüksek pürüzlülük: masa yüzeyinde çirkin beyaz ışık patlaması olmaz
      metalness: 0.04
    });

    const tableGroup = new THREE.Group();
    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(4.56, 0.28, 3.08), tableMat);
    tableMesh.position.set(0, 0.39, 0.2);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    tableGroup.add(tableMesh);

    [-1, 1].forEach(side => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 3.10), darkIronMat);
      strap.position.set(side * 2.285, 0.39, 0.2);
      tableGroup.add(strap);

      [-1, 1].forEach(zSide => {
        const cornerFront = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.20, 0.05), darkIronMat);
        cornerFront.position.set(side * 2.08, 0.39, 0.2 + zSide * 1.545);
        tableGroup.add(cornerFront);

        for (let r = 0; r < 3; r++) {
          const riv = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), rustyIronMat);
          riv.position.set(side * 2.31, 0.39, 0.2 + zSide * (1.35 - r * 0.22));
          tableGroup.add(riv);
        }
      });

      const xLeg = side * 1.82;
      const postF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.48, 0.22), darkIronMat);
      postF.position.set(xLeg, -0.45, 1.38);
      postF.rotation.z = -side * 0.06;
      tableGroup.add(postF);

      const postB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.48, 0.22), darkIronMat);
      postB.position.set(xLeg, -0.45, -0.98);
      postB.rotation.z = -side * 0.06;
      tableGroup.add(postB);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 2.58), darkIronMat);
      botBar.position.set(xLeg, -1.16, 0.2);
      tableGroup.add(botBar);

      const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.75, 8), darkIronMat);
      rod1.position.set(xLeg, -0.45, 0.2);
      rod1.rotation.x = 0.52;
      tableGroup.add(rod1);

      const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.75, 8), darkIronMat);
      rod2.position.set(xLeg, -0.45, 0.2);
      rod2.rotation.x = -0.52;
      tableGroup.add(rod2);
    });

    scene.add(tableGroup);

    // --- TAVAN LAMBASI & DENGELİ CHIAROSCURO MASA IŞIĞI ---
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 3.85, 0.25);

    ceilingWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3), new THREE.MeshBasicMaterial({ color: 0x0d0d0d }));
    ceilingWire.position.y = -0.65;
    lampGroup.add(ceilingWire);

    const shadeGeo = new THREE.ConeGeometry(0.40, 0.28, 20, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x162015,
      roughness: 0.55,
      metalness: 0.78,
      side: THREE.DoubleSide
    });
    lampMesh = new THREE.Mesh(shadeGeo, shadeMat);
    lampMesh.position.y = -1.32;
    lampGroup.add(lampMesh);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffdfa0, fog: false }));
    bulb.position.y = -1.36;
    lampGroup.add(bulb);
    scene.add(lampGroup);

    propsList.push({
      key: 'prop_lamp',
      mesh: lampMesh,
      onClick: function() {
        lampBoostVel += (Math.random() > 0.5 ? 1 : -1) * 0.20;
        playPropSfx('lamp');
        propReact('*Tavan lambası gıcırdayarak sallanıyor...*');
      }
    });

    // Kontrollü sıcak masa spot ışığı: kartları patlatmadan net ve dramatik biçimde aydınlatır
    spotLight = new THREE.SpotLight(0xffe0a8, 2.65, 8.5, Math.PI / 2.8, 0.78, 1.35);
    spotLight.position.set(0, 2.48, 0.28);
    spotLight.target.position.set(0, 0.53, 0.35);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.0008;
    scene.add(spotLight);
    scene.add(spotLight.target);

    pointLight = new THREE.PointLight(0xffb85c, 0.95, 5.2, 1.8);
    pointLight.position.set(0, 2.15, 0.30);
    scene.add(pointLight);

    // Yumuşak ortam dolgusu (kartların gölgede kalan kısımlarının net okunması için)
    const ambLight = new THREE.AmbientLight(0x2a2430, 0.55);
    scene.add(ambLight);

    // Oyuncunun elindeki kartlar için yumuşak sıcak aydınlatma
    handLight = new THREE.PointLight(0xffe2b0, 1.15, 3.2, 1.6);
    handLight.position.set(0, 1.55, 2.45);
    scene.add(handLight);

    // --- RAKİP: KARANLIĞIN İÇİNDEKİ İKİ KIZIL GÖZ (Leshy / Buckshot Dealer Stilinde) ---
    createOpponentInDarkness();

    // --- MASA KENARI ZARİF METAL/MUM OBJELERİ ---
    createRefinedTableProps();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
  }

  // ============================================================
  // 3) KARANLIĞIN İÇİNDEKİ RAKİP: ZİFİRİ GÖLGE VE İKİ PARLAYAN KIZIL GÖZ
  //    Ucuz duran aydınlatılmış küre/koni yüz yerine; masanın karşı
  //    tarafındaki zifiri karanlığın içinden oyuncuyu izleyen iki
  //    keskin, canlı, kısılıp açılan kızıl göz!
  // ============================================================
  function createOpponentInDarkness() {
    const g = new THREE.Group();
    g.position.set(0, 0.55, -1.58);

    // Işığı tamamen yutan zifiri gölge silüeti (hiçbir plastik 3D poligon parlaması yapmaz)
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x020103, fog: false });

    const shadowBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.62, 1.15, 20), voidMat);
    shadowBody.scale.set(1.15, 1, 0.55);
    shadowBody.position.set(0, 0.35, -0.05);
    g.add(shadowBody);

    const head = new THREE.Group();
    head.position.set(0, 0.96, 0.06);

    // Karanlık kukuleta/baş silüeti (arka plandan sadece koyu gölge olarak ayrılır)
    const shadowHood = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), voidMat);
    shadowHood.scale.set(1.05, 1.18, 0.72);
    head.add(shadowHood);

    // İki Parlayan Kızıl Göz (Inscryption / Buckshot tarzı)
    const eyeTex = createGlowingEyeTexture();
    const eyeSpriteMat = new THREE.MeshBasicMaterial({
      map: eyeTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });

    // Göz kapakları (gözlerin kısılması, öfkeli eğilmesi ve göz kırpması için zifiri siyah örtüler)
    const lidMat = new THREE.MeshBasicMaterial({ color: 0x020103, fog: false });
    const eyes = [];

    [-1, 1].forEach(s => {
      const eyeHolder = new THREE.Group();
      eyeHolder.position.set(s * 0.095, 0.04, 0.25);

      // Ana parlayan kızıl iris düzlemi
      const eyePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.072), eyeSpriteMat.clone());
      eyeHolder.add(eyePlane);

      // Çekirdek kor parıltısı
      const coreDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.011, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false })
      );
      coreDot.position.z = 0.002;
      eyeHolder.add(coreDot);

      // Üst göz kapağı (ifade ve kırpma için)
      const upperLid = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.055), lidMat);
      upperLid.position.set(0, 0.038, 0.004);
      upperLid.rotation.z = -s * 0.16; // Hafif çatık, tehditkâr bakış açısı
      eyeHolder.add(upperLid);

      // Alt göz kapağı
      const lowerLid = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.055), lidMat);
      lowerLid.position.set(0, -0.038, 0.004);
      lowerLid.rotation.z = s * 0.08;
      eyeHolder.add(lowerLid);

      head.add(eyeHolder);
      eyes.push({ holder: eyeHolder, plane: eyePlane, core: coreDot, upperLid, lowerLid, side: s });
    });

    g.add(head);

    g.userData = {
      head,
      eyes,
      lean: 0,
      squint: 0,
      blink: -10,
      nextBlink: 2.5
    };
    opponentMesh = g;
    scene.add(g);
  }

  function animateOpponent(time, dt) {
    if (!opponentMesh) return;
    const o = opponentMesh.userData;
    const turnOp = !!(arrowItem && arrowItem.mode === 'op');
    const isThinking = (typeof thinkOn !== 'undefined' && thinkOn) || turnOp;

    // Sıra rakipteyken karanlığın içinden masaya doğru hafifçe yaklaşır
    o.lean += ((turnOp ? 1 : 0) - o.lean) * Math.min(1, dt * 3.2);
    o.squint += ((isThinking ? 1 : 0) - o.squint) * Math.min(1, dt * 4.0);

    o.head.position.z = 0.06 + o.lean * 0.22;
    o.head.position.y = 0.96 - o.lean * 0.04 + Math.sin(time * 1.5) * 0.012;
    o.head.rotation.y = mouse.x * 0.18 + Math.sin(time * 0.7) * 0.04;
    o.head.rotation.x = 0.05 + o.lean * 0.08;

    // Doğal göz kırpma (bazen çift kırpma)
    if (time > o.nextBlink) {
      o.blink = time;
      o.nextBlink = time + (Math.random() < 0.22 ? 0.32 : 2.6 + Math.random() * 4.2);
    }
    const bl = time - o.blink;
    const blinkClose = (bl >= 0 && bl < 0.13) ? Math.sin((bl / 0.13) * Math.PI) : 0;

    // Göz bebeklerinin hafif mikro-takibi ve kapakların kısılması
    const lookX = mouse.x * 0.010 + Math.sin(time * 1.9) * 0.003;
    const lookY = -mouse.y * 0.006 + Math.cos(time * 1.4) * 0.002;
    const pulse = 0.92 + 0.14 * Math.sin(time * (turnOp ? 6.0 : 2.8));

    o.eyes.forEach(e => {
      e.core.position.x = lookX;
      e.core.position.y = lookY;
      e.plane.scale.setScalar(pulse * (1 + o.lean * 0.12));

      // Kısılma ve göz kırpma hesabı
      const closeAmt = Math.min(0.032, blinkClose * 0.032 + o.squint * 0.010);
      e.upperLid.position.y = 0.038 - closeAmt;
      e.lowerLid.position.y = -0.038 + closeAmt * 0.85;
      e.upperLid.rotation.z = -e.side * (0.16 + o.squint * 0.12);
    });
  }

  // ============================================================
  // 4) SADE VE AĞIRBAŞLI MASA KENARI OBJELERİ (Şamdan ve Pirinç Çan)
  // ============================================================
  function createRefinedTableProps() {
    const TABLE_Y = 0.53;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x9c7a36, roughness: 0.34, metalness: 0.86 });
    const darkBrass = new THREE.MeshStandardMaterial({ color: 0x3d2e14, roughness: 0.50, metalness: 0.78 });
    const wroughtIron = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.48, metalness: 0.82 });

    // 1. SOL ARKA KÖŞE: PİRİNÇ ŞAMDAN & TİTREYEN MUMLAR (Tıklayınca söner / yanar)
    const candleGrp = new THREE.Group();
    candleGrp.position.set(-1.88, TABLE_Y, -0.86);

    const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.028, 24), darkBrass);
    cBase.position.y = 0.014;
    candleGrp.add(cBase);

    const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.22, 16), brassMat);
    cStem.position.y = 0.14;
    candleGrp.add(cStem);

    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.32, 12), brassMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.y = 0.22;
    candleGrp.add(crossBar);

    const waxMat = new THREE.MeshStandardMaterial({ color: 0xd0c2a4, roughness: 0.82 });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa, fog: false });
    const haloFlameMat = new THREE.MeshBasicMaterial({ color: 0xff7711, transparent: true, opacity: 0.72, fog: false });

    candleFlames = [];
    [[-0.15, 0.23, 0.14], [0, 0.25, 0.20], [0.15, 0.23, 0.13]].forEach(([cx, cupY, wH]) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.030, 0.024, 16), brassMat);
      cup.position.set(cx, cupY, 0);
      candleGrp.add(cup);

      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, wH, 16), waxMat);
      wax.position.set(cx, cupY + 0.01 + wH / 2, 0);
       wax.castShadow = true;
      candleGrp.add(wax);

      const flGrp = new THREE.Group();
      flGrp.position.set(cx, cupY + wH + 0.046, 0);
      flGrp.add(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.058, 10), coreFlameMat));
      const outerFl = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.085, 10), haloFlameMat);
      outerFl.position.y = 0.005;
      flGrp.add(outerFl);
      candleGrp.add(flGrp);
      candleFlames.push(flGrp);
    });

    candleLight = new THREE.PointLight(0xff8828, 0.95, 2.8, 1.8);
    candleLight.position.set(-1.88, TABLE_Y + 0.52, -0.86);
    scene.add(candleLight);
    scene.add(candleGrp);

    propsList.push({
      key: 'prop_candle',
      mesh: candleGrp,
      onClick: function() {
        candleLit = !candleLit;
        candleFlames.forEach(f => { f.visible = candleLit; });
        candleLight.intensity = candleLit ? 0.95 : 0;
        playPropSfx(candleLit ? 'candle_on' : 'candle_off');
        propReact(candleLit ? 'Şamdanın alevleri yeniden parladı...' : 'Şamdanı üfledin. Gölgeler masaya çöktü.');
      }
    });

    // 2. SAĞ ORTA KENAR: ANTİKA PİRİNÇ KUMARHANE ÇANI (Tıklayınca çınlar)
    const bellGrp = new THREE.Group();
    bellGrp.position.set(1.85, TABLE_Y, 0.05);

    const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 24), wroughtIron);
    bellBase.position.y = 0.015;
    bellGrp.add(bellBase);

    const bellProf = [
      [0.128, 0.0],
      [0.120, 0.024],
      [0.100, 0.062],
      [0.068, 0.098],
      [0.030, 0.118],
      [0.0, 0.122]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    bellMesh = new THREE.Mesh(new THREE.LatheGeometry(bellProf, 28), brassMat);
    bellMesh.position.y = 0.030;
    bellMesh.castShadow = true;
    bellGrp.add(bellMesh);

    const bellPin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.020, 0.02, 16), brassMat);
    bellPin.position.y = 0.168;
    bellGrp.add(bellPin);
    scene.add(bellGrp);

    propsList.push({
      key: 'prop_bell',
      mesh: bellGrp,
      onClick: function() {
        bellVel = 0.42;
        playPropSfx('bell');
        propReact('*Pirinç masa çanı karanlık mahzende çınladı.*');
      }
    });
  }

  function animateProps(time, dt) {
    wallLights.forEach(w => {
      const fl = 1.0 + Math.sin(time * 10 + w.phase) * 0.05;
      w.light.intensity = 0.95 * fl;
    });

    if (candleLit && candleLight) {
      const f = 1.0 + Math.sin(time * 16) * 0.08 + Math.cos(time * 27) * 0.06;
      candleFlames.forEach((fl, i) => {
        const fi = 1.0 + Math.sin(time * 18 + i * 1.7) * 0.12;
        fl.scale.set(1, fi, 1);
        fl.rotation.z = Math.sin(time * 8 + i) * 0.08;
      });
      candleLight.intensity = 0.95 * f;
    }

    if (bellMesh) {
      bellVel += (-bellSwing * 45 - bellVel * 5) * dt;
      bellSwing += bellVel * dt;
      bellMesh.rotation.z = bellSwing;
    }
  }

  function onMouseMove(e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function fitFov() {
    const a = window.innerWidth / window.innerHeight;
    camera.aspect = a;
    camera.fov = Math.min(92, Math.max(46, 2 * Math.atan(Math.tan(0.64) / a) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================================================
  // 5) YÜKSEK KALİTELİ KART DOKULARI, TEMAS GÖLGESİ VE MASA DÜZENİ
  // ============================================================
  const CARD_W = 0.45, CARD_H = 0.65, CARD_T = 0.012, TABLE_Y = 0.53;
  const DECK_POS = new THREE.Vector3(-1.52, TABLE_Y, 0.52);
  const items = new Map();
  let sealItem = null, arrowItem = null;
  let hovered = null, hoveredProp = null;
  const V3 = THREE.Vector3;

  // Kart görselini koyu çerçeveli, eskitilmiş parşömen kenarlı ve yüksek kontrastlı tarot kartı dokusuna dönüştürür
  function frameCardImageOnCanvas(img, cv) {
    const x = cv.getContext('2d');
    const W = cv.width, H = cv.height;

    // Koyu eskitilmiş kart dış bordürü
    x.fillStyle = '#140e0a';
    x.fillRect(0, 0, W, H);

    // Kart görselini çiz
    if (img) {
      x.drawImage(img, 10, 10, W - 20, H - 20);
    }

    // Kart kenarlarında hafif parşömen/eskitme gölgesi (parlamayı ve çiğ görünümü engeller)
    const g = x.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(0.78, 'rgba(18, 10, 4, 0.12)');
    g.addColorStop(1, 'rgba(10, 5, 2, 0.48)');
    x.fillStyle = g;
    x.fillRect(10, 10, W - 20, H - 20);

    // İnce antik altın/bronz iç çerçeve
    x.strokeStyle = 'rgba(168, 130, 68, 0.55)';
    x.lineWidth = 4;
    x.strokeRect(12, 12, W - 24, H - 24);

    // Dış koyu kontur
    x.strokeStyle = '#090604';
    x.lineWidth = 10;
    x.strokeRect(5, 5, W - 10, H - 10);
  }

  function getCardTexture(src) {
    if (textureCache[src]) return textureCache[src];
    const c = document.createElement('canvas');
    c.width = 512; c.height = 744;
    const x = c.getContext('2d');

    if (String(src).indexOf('num:') === 0) {
      const v = String(src).slice(4);
      x.fillStyle = '#bfb6a4'; x.fillRect(0, 0, 512, 744);
      x.strokeStyle = '#5c1810'; x.lineWidth = 14; x.strokeRect(24, 24, 464, 696);
      x.fillStyle = '#9e2616'; x.font = 'bold 310px "Pirata One", serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(v, 256, 380);
      frameCardImageOnCanvas(null, c);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      textureCache[src] = tex;
      return tex;
    }

    // Başlangıçta koyu parşömen zemin, görsel yüklenince çerçeveli olarak güncellenir
    x.fillStyle = '#241b14';
    x.fillRect(0, 0, 512, 744);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    textureCache[src] = tex;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      frameCardImageOnCanvas(img, c);
      tex.needsUpdate = true;
    };
    img.src = src;
    return tex;
  }

  function createCard(frontSrc, backSrc, w, h, withShadow) {
    w = w || CARD_W; h = h || CARD_H;
    const geom = new THREE.BoxGeometry(w, CARD_T, h);
    // Kalın koyu altın/eskitilmiş kağıt kenar
    const edge = new THREE.MeshStandardMaterial({ color: 0x3b2c1e, roughness: 0.78, metalness: 0.15 });
    // Mat yüzey (roughness: 0.85) sayesinde spot ışığı altında bembeyaz parlama yapmaz
    const front = new THREE.MeshStandardMaterial({ map: getCardTexture(frontSrc), roughness: 0.85, metalness: 0.04 });
    const back = new THREE.MeshStandardMaterial({ map: getCardTexture(backSrc), roughness: 0.85, metalness: 0.04 });
    const mesh = new THREE.Mesh(geom, [edge, edge, front, back, edge, edge]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Kartın masaya tam oturmasını sağlayan yumuşak temas gölgesi (contact shadow)
    if (withShadow !== false) {
      const shPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.24, h * 1.20),
        new THREE.MeshBasicMaterial({
          map: getCardShadowTexture(),
          transparent: true,
          opacity: 0.75,
          depthWrite: false
        })
      );
      shPlane.rotation.x = -Math.PI / 2;
      shPlane.position.y = -CARD_T * 0.46;
      mesh.add(shPlane);
      mesh.userData.shadowPlane = shPlane;
    }

    mesh.userData.front = front;
    mesh.userData.back = back;
    return mesh;
  }

  function labelTexture(text, bg, fg, rim) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');

    x.fillStyle = bg || '#1b1410';
    x.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1600; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,220,170,0.05)';
      x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    const g = x.createRadialGradient(256, 240, 30, 256, 256, 250);
    g.addColorStop(0, 'rgba(255, 220, 160, 0.14)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.84)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);

    const rimCol = rim || '#b08a3e';
    x.strokeStyle = rimCol;
    x.lineWidth = 12;
    x.beginPath();
    x.arc(256, 256, 224, 0, Math.PI * 2);
    x.stroke();

    x.strokeStyle = rimCol;
    x.globalAlpha = 0.55;
    x.lineWidth = 3;
    x.beginPath();
    x.arc(256, 256, 196, 0, Math.PI * 2);
    x.stroke();

    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const rx = 256 + Math.cos(ang) * 211;
      const ry = 256 + Math.sin(ang) * 211;
      x.fillStyle = '#0d0806';
      x.globalAlpha = 0.85;
      x.beginPath();
      x.arc(rx, ry, 6.5, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = rimCol;
      x.beginPath();
      x.arc(rx - 1, ry - 1, 4, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;

    text = String(text);
    if (text.indexOf('\n') < 0 && text.length > 8 && text.indexOf(' ') > 0) {
      const ls = []; let cur = '';
      text.split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > 9) { ls.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
      ls.push(cur); text = ls.join('\n');
    }
    const lines = text.split('\n');
    let fs = lines.length > 2 ? 96 : lines.length > 1 ? 128 : (/^\d+$/.test(text) ? 235 : 165);
    const ff = '"Pirata One", "Cinzel", serif';
    do { x.font = 'bold ' + fs + 'px ' + ff; fs -= 6; }
    while (fs > 32 && Math.max.apply(null, lines.map(l => x.measureText(l).width)) > 340);

    const lh = fs * 1.08;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const py = 262 + (i - (lines.length - 1) / 2) * lh;
      x.fillStyle = 'rgba(0, 0, 0, 0.88)';
      x.fillText(l, 260, py + 6);
      x.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      x.lineWidth = 6;
      x.strokeText(l, 256, py);
      x.fillStyle = fg || '#f0dca8';
      x.fillText(l, 256, py);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function createPlate(radius, height, text, bg, fg, rimColor) {
    const g = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: rimColor || 0x241911,
      roughness: 0.48,
      metalness: 0.78
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.02, radius * 1.12, height, 16),
      baseMat
    );
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.96, height * 0.24, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x9c7834, roughness: 0.38, metalness: 0.85 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.y = height / 2;
    g.add(bezel);

    const topMat = new THREE.MeshStandardMaterial({
      map: labelTexture(text, bg, fg),
      roughness: 0.65,
      metalness: 0.20
    });
    const top = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 32), topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = height / 2 + 0.002;
    g.add(top);

    g.userData.top = top;
    g.userData.topMat = topMat;
    g.userData.body = base;
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
        it.spawned = true; it.arc = 0.48;
        mesh.position.copy(spawnFrom).add(new V3(0, 0.03, 0));
        mesh.rotation.set(0, 0.20, Math.PI);
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
  function numSrc(c) {
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

    // BUCKSHOT ROULETTE KAMERA HEDEFİ BELİRLEME:
    // - Sıra bizdeyken (S.turn === 0 && !S.wait && !S.over): Masaya ve kendi kartlarımıza bakarız ('table')
    // - Oynadıktan / pas dedikten sonra sıra rakipteyken (S.turn === 1 veya S.wait): Rakibe ve kızıl gözlere doğru kalkar ('opponent')
    const castOpen = !!document.getElementById('cast');
    if (S.over || S.rev) {
      camMode = 'opponent';
    } else if (S.turn === 1 || S.wait || castOpen) {
      camMode = 'opponent';
    } else {
      camMode = 'table';
    }

    // 1) KART SIRALARI (rakip: -z, biz: +z) — hafif doğal el dağıtımı açısıyla
    const rows = [[1, -0.48], [0, 1.05]];
    rows.forEach(([p, z]) => {
      const pl = S.pl[p];
      const list = pl.open.map(c => ({ c, closed: false })).concat(pl.closed.map(c => ({ c, closed: true })));
      const a = pl.open.length, b = pl.closed.length, n = list.length;
      const gap = (a > 0 && b > 0) ? 0.30 : 0;
      const sp = Math.min(0.50, 3.4 / Math.max(n + gap, 1));
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
        // Her kartın masaya elle atılmış gibi çok hafif organik açısı
        const jitterYaw = (((c.id * 37) % 11) - 5) * 0.007;
        placeItem(it, x, TABLE_Y + 0.006 + (it.hl ? 0.07 : 0), z, 0, jitterYaw, down ? Math.PI : 0, 1);
      });
    });

    // 2) BİZİM JOKER ELİMİZ (kamera masaya bakarken tam karşıda, net ve okunaklı)
    if (!isSpec) {
      const hand = S.hand[0] || [], n = hand.length, cnt = {};
      const sp = Math.min(0.47, 3.1 / Math.max(n, 1));
      const oppTurn = (camMode === 'opponent');
      hand.forEach((id, i) => {
        cnt[id] = (cnt[id] || 0) + 1;
        const key = 'h' + id + '_' + cnt[id];
        const mid = i - (n - 1) / 2;
        const it = ensureItem(key, 'hand', () => createCard(jokerSrc(id), jokerSrc(id), CARD_W, CARD_H, false), DECK_POS);
        it.dom = '#hand img[data-j="' + id + '"]';
        const el = document.querySelector(it.dom);
        it.dim = !!(el && el.classList.contains('dim'));
        // Sıra rakipteyken elimizdeki kartlar biraz aşağı inip masanın önünü açar, sıra bizdeyken rahat seçilir
        const hy = oppTurn ? (TABLE_Y + 0.08) : (TABLE_Y + 0.34);
        const hz = oppTurn ? (1.88 + Math.abs(mid) * 0.03) : (1.82 + Math.abs(mid) * 0.04);
        const hPitch = oppTurn ? 0.42 : 0.86;
        placeItem(it, mid * sp, hy, hz, hPitch, -mid * 0.05, 0, 0.88);
      });
    }

    // 3) RAKİBİN JOKER ELİ (kapalı, masanın sağ-üst köşesinde)
    (S.hand[1] || []).forEach((_, i) => {
      const it = ensureItem('oh' + i, 'static', () => createCard(IMG.bj, IMG.bj), DECK_POS);
      placeItem(it, 0.92 + i * 0.15, TABLE_Y + 0.006 + 0.004 * i, -0.96, 0, 0.08 * (i % 2 ? 1 : -1), Math.PI, 0.50);
    });

    // 4) OYNANMIŞ ANLIK/KALICI JOKER ETKİLERİ (ortada, iki yanda)
    const sideCnt = { 0: 0, 1: 0 };
    (S.pj || []).forEach(x => {
      const e = S.eff.find(y => y.uid == x.uid) || x;
      const side = x.o == 1 ? 1 : 0;
      const i = sideCnt[side]++;
      const it = ensureItem('e' + x.uid, 'chip', () => createCard(jokerSrc(e.id), jokerSrc(e.id)), side ? new V3(0.92, TABLE_Y, -0.96) : new V3(0, TABLE_Y + 0.2, 1.85));
      it.dom = '[data-e="' + x.uid + '"]';
      it.hl = kind === 'eff' && cn.includes(e.uid);
      it.mod = !!e.neg;
      const sx = side ? -1 : 1;
      placeItem(it, sx * (0.76 + i * 0.30), TABLE_Y + 0.006 + (it.hl ? 0.07 : 0), 0.24 + (side ? -0.1 : 0.1), 0, sx * 0.05, 0, 0.58);
    });

    // 5) DESTE (tıkla = kart çek)
    const dc = Math.min((S.deck || []).length, 11);
    for (let i = 0; i < 12; i++) {
      const key = 'd' + i;
      if (i < dc) {
        const it = ensureItem(key, 'deck', () => createCard(backSrc(), backSrc(), CARD_W, CARD_H, i === 0));
        it.dom = '#draw';
        placeItem(it, DECK_POS.x, TABLE_Y + 0.006 + i * 0.009, DECK_POS.z, 0, 0.03 * i, Math.PI, 1);
      } else if (items.has(key)) {
        items.get(key).seen = false;
      }
    }

    // 6) HEDEF KAN MÜHÜRÜ (masanın ortasında)
    const T = tg(S), low = lowW(S);
    const label = low ? 'EN AZ' : String(T);
    const alt = (T != 21 || low);
    const skey = label + '|' + alt;
    const sealBg = alt ? '#2e200d' : '#420910';
    const sealFg = alt ? '#f5d58c' : '#f0d8b0';
    if (!sealItem) {
      const g = createPlate(0.35, 0.044, label, sealBg, sealFg, 0x26120c);
      g.position.set(0, TABLE_Y + 0.024, 0.24);
      g.userData.item = { kind: 'static', dying: false };
      scene.add(g);
      sealItem = { mesh: g, key: skey, pulse: -9 };
    } else if (sealItem.key !== skey) {
      setPlateText(sealItem.mesh, label, sealBg, sealFg);
      sealItem.key = skey; sealItem.pulse = clock.getElapsedTime();
    }

    // 7) SIRA OKU
    if (!arrowItem) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.20, 4),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x5c4210, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.7 }));
      m.castShadow = true;
      scene.add(m);
      arrowItem = { mesh: m, mode: 'off' };
    }
    arrowItem.mode = (S.wait || S.over) ? 'off' : (S.turn === 0 ? 'me' : 'op');

    // 8) PAS / TURU BİTİR MÜHRÜ
    const passEl = document.getElementById('pass');
    const passTxt = passEl ? passEl.textContent : 'Pas';
    const ends = passTxt.toLowerCase().indexOf('bitir') >= 0;
    const passKey = 'pass';
    const pText = ends ? 'TURU\nBİTİR' : 'PAS';
    const passBg = ends ? '#42140e' : '#1f1914';
    const passFg = ends ? '#f5cf82' : '#e6d0a2';
    const pit = ensureItem(passKey, 'plate', () => createPlate(0.27, 0.075, pText, passBg, passFg, 0x241a12));
    if (pit.label !== pText) { setPlateText(pit.mesh, pText, passBg, passFg); pit.label = pText; }
    pit.dom = '#pass';
    pit.dim = !passEl || passEl.disabled;
    pit.mesh.visible = !isSpec && !modalOpen() && !(passEl && passEl.style.display === 'none');
    placeItem(pit, 1.32, TABLE_Y + 0.048, 0.66, 0, 0, 0, 1);

    // 9) DERİ CİLTLİ KARA KİTAP ("MENÜ")
    const bit = ensureItem('book', 'book', () => createGrimoireBook());
    bit.dom = '[data-g]';
    placeItem(bit, -1.52, TABLE_Y + 0.038, 1.15, 0, 0.26, 0, 1);

    // 10) SEÇİM JETONLARI (joker hedef seçerken)
    const tokenDefs = [];
    if (document.querySelector('#prompt [data-x]')) {
      if (document.querySelector('#prompt [data-s]')) {
        tokenDefs.push({ k: 'tkp', t: '+', dom: '#prompt [data-s="1"]', x: -0.5, bg: '#1e2b1c' });
        tokenDefs.push({ k: 'tkm', t: '−', dom: '#prompt [data-s="-1"]', x: 0.0, bg: '#3d0c12' });
      }
      tokenDefs.push({ k: 'tkx', t: 'VAZ\nGEÇ', dom: '#prompt [data-x]', x: 0.5, bg: '#1d1916' });
    }
    const wantTok = {};
    tokenDefs.forEach(d => {
      wantTok[d.k] = 1;
      const it = ensureItem(d.k, 'token', () => createPlate(0.2, 0.065, d.t, d.bg, '#e6d2a8', 0x1e1813), new V3(0, TABLE_Y + 0.3, 0.9));
      it.dom = d.dom;
      placeItem(it, d.x, TABLE_Y + 0.05, 0.62, 0, 0, 0, 1);
    });
    ['tkp', 'tkm', 'tkx'].forEach(k => { if (!wantTok[k] && items.has(k)) items.get(k).seen = false; });

    // 11) DİEGETİK SKOR KADRANLARI
    const myTot = total(S, 0), opTot = total(S, 1, false);
    const bust = !low && myTot > T, exact = !low && myTot === T;
    const myJLeft = Math.max(0, 2 - S.jUsed[0]);
    const myTxt = 'SEN: ' + myTot + '\nJOKER: ' + '◆'.repeat(myJLeft) + '◇'.repeat(2 - myJLeft);
    const myBg = bust ? '#470b10' : exact ? '#16381e' : '#1b1410';
    const myFg = bust ? '#ff9999' : exact ? '#a8ffbe' : '#f0dca8';
    const stMe = ensureItem('slab_me', 'static', () => createSlate(0.66, 0.042, 0.32, myTxt, myBg, myFg));
    if (stMe.label !== myTxt + myBg) {
      setSlateText(stMe.mesh, myTxt, myBg, myFg);
      stMe.label = myTxt + myBg;
    }
    placeItem(stMe, 1.32, TABLE_Y + 0.024, 1.18, 0, -0.18, 0, 1);

    const opName = (typeof MODE !== 'undefined' && MODE === 'bot' && typeof oppName === 'function') ? oppName().toLocaleUpperCase('tr') : 'RAKİP';
    const opScoreStr = S.rev ? String(total(S, 1, true)) : (opTot + ' + ?');
    const opTxt = opName + '\nSKOR: ' + opScoreStr;
    const stOp = ensureItem('slab_op', 'static', () => createSlate(0.72, 0.042, 0.32, opTxt, '#1f1214', '#ebd0a4'));
    if (stOp.label !== opTxt) {
      setSlateText(stOp.mesh, opTxt, '#1f1214', '#ebd0a4');
      stOp.label = opTxt;
    }
    placeItem(stOp, -1.24, TABLE_Y + 0.024, -0.48, 0, 0.16, 0, 1);

    // 12) DÜELLO SKORU & ÖLÜM EŞİĞİ ÇETELESİ
    const res = S.res || [];
    const dcVal = (typeof TH !== 'undefined') ? TH[Math.min(S.bo, 3)] : 4;
    const pipsKey = [0, 1, 2].map(i => res[i] == null ? (i == S.rounds ? 'N' : 'E') : res[i] > 0 ? 'W' : res[i] < 0 ? 'L' : 'D').join('');
    const duelTxt = 'DÜELLO ' + (S.bo + 1) + '  ·  EŞİK ' + dcVal + '+';
    const stDu = ensureItem('slab_duel', 'static', () => createDuelCounterBoard(duelTxt));
    if (stDu.label !== duelTxt + pipsKey) {
      updateDuelCounterBoard(stDu.mesh, duelTxt, res, S.rounds);
      stDu.label = duelTxt + pipsKey;
    }
    placeItem(stDu, -0.58, TABLE_Y + 0.024, -0.96, 0, 0.06, 0, 1);

    items.forEach(it => {
      if (!it.seen && it.key !== 'pass' && it.key !== 'book' && !/^m_/.test(it.key) && !/^slab_/.test(it.key)) it.dying = true;
    });
  }

  function slateTexture(text, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = bg || '#1b1410';
    x.fillRect(0, 0, 512, 256);

    for (let i = 0; i < 900; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.20)' : 'rgba(255,215,155,0.05)';
      x.fillRect(Math.random() * 512, Math.random() * 256, 3, 2);
    }

    const g = x.createRadialGradient(256, 128, 30, 256, 128, 260);
    g.addColorStop(0, 'rgba(255, 220, 160, 0.12)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 256);

    x.strokeStyle = '#a88438';
    x.lineWidth = 10;
    x.strokeRect(10, 10, 492, 236);
    x.strokeStyle = 'rgba(235, 195, 115, 0.42)';
    x.lineWidth = 3;
    x.strokeRect(22, 22, 468, 212);

    [[28, 28], [484, 28], [28, 228], [484, 228]].forEach(([rx, ry]) => {
      x.fillStyle = '#0d0806';
      x.beginPath(); x.arc(rx, ry, 8, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#b89242';
      x.beginPath(); x.arc(rx - 1, ry - 1, 5.5, 0, Math.PI * 2); x.fill();
    });

    const lines = String(text).split('\n');
    let fs = lines.length > 2 ? 44 : lines.length > 1 ? 58 : 68;
    const ff = '"Pirata One", "Cinzel", serif';
    do { x.font = 'bold ' + fs + 'px ' + ff; fs -= 3; }
    while (fs > 22 && Math.max.apply(null, lines.map(l => x.measureText(l).width)) > 436);
    const lh = fs * 1.15;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const py = 128 + (i - (lines.length - 1) / 2) * lh;
      x.fillStyle = 'rgba(0,0,0,0.88)';
      x.fillText(l, 260, py + 5);
      x.fillStyle = fg || '#f0dca8';
      x.fillText(l, 256, py);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function createSlate(w, h, d, text, bg, fg) {
    const grp = new THREE.Group();
    const brassFrameMat = new THREE.MeshStandardMaterial({ color: 0x6e5222, roughness: 0.42, metalness: 0.80 });
    const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.68, metalness: 0.42 });
    const topMat = new THREE.MeshStandardMaterial({ map: slateTexture(text, bg, fg), roughness: 0.62, metalness: 0.20 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, h * 0.65, d * 1.06), darkBaseMat);
    base.position.y = -h * 0.18;
    base.castShadow = true; base.receiveShadow = true;
    grp.add(base);

    const topBox = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.7, d),
      [brassFrameMat, brassFrameMat, topMat, brassFrameMat, brassFrameMat, brassFrameMat]
    );
    topBox.position.y = h * 0.16;
    topBox.castShadow = true; topBox.receiveShadow = true;
    grp.add(topBox);

    const studGeo = new THREE.SphereGeometry(0.016, 8, 8);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const st = new THREE.Mesh(studGeo, brassFrameMat);
      st.position.set(sx * (w * 0.45), h * 0.50, sz * (d * 0.42));
      grp.add(st);
    });

    grp.userData.topMat = topMat;
    return grp;
  }

  function setSlateText(grp, text, bg, fg) {
    const m = grp.userData.topMat;
    if (!m) return;
    if (m.map) m.map.dispose();
    m.map = slateTexture(text, bg, fg);
    m.needsUpdate = true;
  }

  function createDuelCounterBoard(text) {
    const grp = createSlate(0.84, 0.045, 0.34, text, '#1a140e', '#e5c478');
    const gems = [];
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x9c7834, roughness: 0.35, metalness: 0.85 });
    for (let i = 0; i < 3; i++) {
      const gx = (i - 1) * 0.16;
      const gz = -0.19;
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.028, 14), ringMat);
      socket.position.set(gx, 0.015, gz);
      grp.add(socket);

      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x2a2420,
        roughness: 0.25,
        metalness: 0.2,
        emissive: 0x000000,
        emissiveIntensity: 0.6
      });
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), gemMat);
      gem.scale.set(1, 0.7, 1);
      gem.position.set(gx, 0.032, gz);
      grp.add(gem);
      gems.push(gem);
    }
    grp.userData.gems = gems;
    return grp;
  }

  function updateDuelCounterBoard(grp, text, res, curRound) {
    setSlateText(grp, text, '#1a140e', '#e5c478');
    const gems = grp.userData.gems || [];
    gems.forEach((gem, i) => {
      const r = res[i];
      if (r == null) {
        if (i === curRound) {
          gem.material.color.setHex(0xe6a832);
          gem.material.emissive.setHex(0x8c5808);
        } else {
          gem.material.color.setHex(0x26201c);
          gem.material.emissive.setHex(0x000000);
        }
      } else if (r > 0) {
        gem.material.color.setHex(0x28cc55);
        gem.material.emissive.setHex(0x0e6b28);
      } else if (r < 0) {
        gem.material.color.setHex(0xd92232);
        gem.material.emissive.setHex(0x7a0812);
      } else {
        gem.material.color.setHex(0x9988aa);
        gem.material.emissive.setHex(0x332244);
      }
    });
  }

  function createGrimoireBook() {
    const grp = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x2e160d, roughness: 0.78, metalness: 0.12 });
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xcab892, roughness: 0.85, metalness: 0.02 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xa68238, roughness: 0.35, metalness: 0.86 });
    const topCoverMat = new THREE.MeshStandardMaterial({ map: bookTexture(), roughness: 0.68, metalness: 0.18 });

    const botCover = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.014, 0.36), leatherMat);
    botCover.position.y = -0.028;
    botCover.castShadow = true; botCover.receiveShadow = true;
    grp.add(botCover);

    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.048, 0.335), pagesMat);
    pages.position.set(0.01, 0.0, 0);
    grp.add(pages);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.36, 12), leatherMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.set(-0.23, 0, 0);
    grp.add(spine);

    [-0.12, -0.04, 0.04, 0.12].forEach(sz => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.006, 8, 14), brassMat);
      rib.position.set(-0.23, 0, sz);
      grp.add(rib);
    });

    const topCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.016, 0.36),
      [leatherMat, leatherMat, topCoverMat, leatherMat, leatherMat, leatherMat]
    );
    topCover.position.y = 0.028;
    topCover.castShadow = true; topCover.receiveShadow = true;
    grp.add(topCover);

    return grp;
  }

  function bookTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 384;
    const x = c.getContext('2d');
    x.fillStyle = '#2b140b'; x.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 650; i++) {
      x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.22) + ')';
      x.fillRect(Math.random() * 512, Math.random() * 384, 3 + Math.random() * 6, 2);
    }
    x.strokeStyle = '#b08838'; x.lineWidth = 8; x.strokeRect(20, 20, 472, 344);
    x.strokeStyle = '#755620'; x.lineWidth = 3; x.strokeRect(32, 32, 448, 320);

    x.strokeStyle = 'rgba(190, 145, 65, 0.38)';
    x.lineWidth = 3;
    x.beginPath(); x.arc(256, 192, 118, 0, Math.PI * 2); x.stroke();

    x.fillStyle = '#ebd094'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 88px "Pirata One", serif';
    x.fillText('MENÜ', 256, 196);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  // --- ETKİLEŞİM (üzerine gelme + tıklama) ---
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function interactive(it) {
    if (it.dying || !it.dom || !it.mesh.visible) return false;
    return domOK(it.dom);
  }

  function pickProp(cx, cy) {
    if (!camera || !propsList.length) return null;
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = propsList.map(p => p.mesh);
    const hits = ray.intersectObjects(meshes, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o) {
      const found = propsList.find(p => p.mesh === o);
      if (found) return found;
      o = o.parent;
    }
    return null;
  }

  function pickItem(cx, cy) {
    if (!camera) return null;
    const dh = pickDie(cx, cy);
    if (dh) return dh;
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

  function initPicking() {
    document.addEventListener('click', function(e) {
      if (!is3DActive || !e.isTrusted || overlayOpen(e.target)) return;
      const it = pickItem(e.clientX, e.clientY);
      if (it) {
        const el = document.querySelector(it.dom);
        if (el && !el.disabled) el.click();
        return;
      }
      const pr = pickProp(e.clientX, e.clientY);
      if (pr && pr.onClick) pr.onClick();
    });
    document.addEventListener('mousemove', function(e) {
      if (!is3DActive) return;
      if (overlayOpen(e.target)) {
        hovered = null; hoveredProp = null;
        document.body.style.cursor = '';
        return;
      }
      hovered = pickItem(e.clientX, e.clientY);
      hoveredProp = hovered ? null : pickProp(e.clientX, e.clientY);
      document.body.style.cursor = (hovered || hoveredProp) ? 'pointer' : '';
    });
  }

  // ============================================================
  // 6) MASADA D20 ÖLÜM ZARI + MODAL PLAKALARI
  // ============================================================
  const DPHI = (1 + Math.sqrt(5)) / 2;
  const DV = [[-1, DPHI, 0], [1, DPHI, 0], [-1, -DPHI, 0], [1, -DPHI, 0], [0, -1, DPHI], [0, 1, DPHI],
              [0, -1, -DPHI], [0, 1, -DPHI], [DPHI, 0, -1], [DPHI, 0, 1], [-DPHI, 0, -1], [-DPHI, 0, 1]]
    .map(v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; });
  const DF = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
              [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const DNUMS = [20, 14, 2, 18, 9, 10, 12, 16, 4, 6, 1, 7, 19, 3, 15, 11, 17, 5, 13, 8];
  const DIE_BASE = new THREE.Vector3(0, TABLE_Y + 0.7, 0.5);
  const die = { group: null, mesh: null, mat: null, tex: null, cv: null, ctx: null, shadow: null, ring: null, light: null,
                p: { rx: Math.atan(1 / Math.sqrt(2)), ry: Math.PI / 4, rz: 0, num: '?', rolling: false, crit: false, fail: false, scale: 1, pop: 1 },
                drawn: '', rot0: 0 };

  (function() {
    const rx = Math.atan(1 / Math.sqrt(2)), ry = Math.PI / 4;
    const rot = ([x, y, z]) => {
      const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      return [x1, y * Math.cos(rx) - z1 * Math.sin(rx), y * Math.sin(rx) + z1 * Math.cos(rx)];
    };
    const f = DF[0].map(i => rot(DV[i]));
    const upX = f[0][0] - (f[1][0] + f[2][0]) / 2, upY = -(f[0][1] - (f[1][1] + f[2][1]) / 2);
    die.rot0 = Math.atan2(upX, -upY);
  })();

  function drawDieAtlas() {
    const p = die.p, key = p.num + '|' + p.crit + '|' + p.fail;
    if (die.drawn === key) return;
    die.drawn = key;
    const x = die.ctx, C = 256;
    for (let fi = 0; fi < 20; fi++) {
      const ox = (fi % 5) * C, oy = Math.floor(fi / 5) * C;
      const g = x.createLinearGradient(ox, oy, ox + C, oy + C);
      if (p.crit) { g.addColorStop(0, '#d9a52b'); g.addColorStop(1, '#7a5208'); }
      else if (p.fail) { g.addColorStop(0, '#5a1018'); g.addColorStop(1, '#210408'); }
      else { g.addColorStop(0, '#b01426'); g.addColorStop(1, '#4a0610'); }
      x.fillStyle = g; x.fillRect(ox, oy, C, C);
      const s = (fi === 0) ? String(p.num) : String(DNUMS[fi]);
      x.save();
      x.translate(ox + 128, oy + 150);
      if (fi === 0) x.rotate(-die.rot0);
      x.fillStyle = p.crit ? '#ffffff' : '#ffea9f';
      x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 6;
      x.font = '900 ' + (s.length > 1 ? 92 : 112) + 'px Cinzel, "Times New Roman", serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeText(s, 0, 0); x.fillText(s, 0, 0);
      x.restore();
    }
    die.tex.needsUpdate = true;
  }

  function buildDie() {
    const cv = document.createElement('canvas');
    cv.width = 1280; cv.height = 1024;
    die.cv = cv; die.ctx = cv.getContext('2d');
    die.tex = new THREE.CanvasTexture(cv);
    die.tex.anisotropy = 4;
    const pos = [], uv = [];
    const A = [[0.5, 0.1], [0.08, 0.88], [0.92, 0.88]];
    DF.forEach((f, fi) => {
      const col = fi % 5, row = Math.floor(fi / 5);
      f.forEach((vi, k) => {
        pos.push(DV[vi][0], DV[vi][1], DV[vi][2]);
        uv.push((col + A[k][0]) / 5, 1 - (row + A[k][1]) / 4);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    die.mat = new THREE.MeshStandardMaterial({ map: die.tex, roughness: 0.42, metalness: 0.25, flatShading: true });
    die.mesh = new THREE.Mesh(geo, die.mat);
    die.mesh.castShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0xc39a41 }));
    die.mesh.add(edges);
    die.mesh.scale.setScalar(0.42);
    const grp = new THREE.Group();
    grp.add(die.mesh);
    die.light = new THREE.PointLight(0xff2a3a, 1.2, 3.2);
    die.light.position.set(0, 0.3, 0.4);
    grp.add(die.light);
    die.group = grp;
    grp.visible = false;
    scene.add(grp);
    die.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
    die.shadow.rotation.x = -Math.PI / 2;
    die.shadow.position.set(DIE_BASE.x, TABLE_Y + 0.004, DIE_BASE.z);
    die.shadow.visible = false;
    scene.add(die.shadow);
    die.ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.52, 40),
      new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    die.ring.rotation.x = -Math.PI / 2;
    die.ring.position.set(DIE_BASE.x, TABLE_Y + 0.006, DIE_BASE.z);
    die.ring.visible = false;
    scene.add(die.ring);
  }

  function updateDie(time) {
    const grp = die.group;
    if (!grp || !grp.visible) { if (die.shadow) { die.shadow.visible = false; die.ring.visible = false; } return; }
    const p = die.p;
    drawDieAtlas();
    const M = new THREE.Matrix4().makeRotationZ(p.rz)
      .multiply(new THREE.Matrix4().makeRotationX(p.rx))
      .multiply(new THREE.Matrix4().makeRotationY(p.ry));
    const q = new THREE.Quaternion().setFromRotationMatrix(M);
    grp.quaternion.copy(camera.quaternion).multiply(q);
    const t = Math.max(0, Math.min(1, (p.ry - Math.PI / 4) / (6 * Math.PI)));
    const hop = p.rolling ? 0.34 * Math.pow(1 - t, 1.3) * Math.abs(Math.sin(t * 26)) : 0;
    const bob = p.rolling ? 0 : Math.sin(time * 2) * 0.02;
    const pos = DIE_BASE.clone();
    pos.y += hop + bob;
    const toCam = camera.position.clone().sub(pos).normalize();
    pos.addScaledVector(toCam, (p.scale - 1) * 1.4);
    grp.position.copy(pos);
    grp.scale.setScalar(p.scale);
    die.light.position.copy(new THREE.Vector3(0, 0.35, 0.5).applyQuaternion(grp.quaternion.clone().invert()));
    die.mat.emissive.setHex(p.crit ? 0xffb020 : p.fail ? 0x300000 : 0x240006);
    die.mat.emissiveIntensity = p.crit ? 0.6 : 0.35 + 0.15 * Math.sin(time * 3);
    die.shadow.visible = true;
    die.shadow.material.opacity = Math.max(0.15, 0.5 - hop * 1.1);
    die.shadow.scale.setScalar(1 - hop * 0.6);
    const canRoll = !!document.getElementById('rl');
    die.ring.visible = canRoll && !p.rolling;
    if (die.ring.visible) die.ring.material.opacity = 0.35 + 0.3 * Math.sin(time * 4);
  }

  function modalOpen() { const m = document.getElementById('m'); return !!m && !m.hidden; }
  function is2DSettingsDialogOpen() {
    const m = document.getElementById('m');
    if (!m || m.hidden) return false;
    return !!m.querySelector('#sm,.cdx,.gd');
  }
  const overlayOpen = t => !!(t.closest && (t.closest('#menu') || (is2DSettingsDialogOpen() && t.closest('#m'))));

  function updateModal() {
    const open = modalOpen();
    const is2DModal = is2DSettingsDialogOpen();
    const box = (open && !is2DModal) ? document.querySelector('#mb .d20-box') : null;
    if (box && !die.group) buildDie();
    if (die.group) die.group.visible = !!box;

    const wants = {};
    if (open && !is2DModal) {
      ['mo', 'mx'].forEach(id => {
        const el = document.getElementById(id);
        if (el && getComputedStyle(el).visibility !== 'hidden') wants[id] = el.textContent.trim();
      });
    }
    [['mo', 1.3, '#2d1c10'], ['mx', 0.55, '#1a1715']].forEach(([id, x, bg]) => {
      const key = 'm_' + id;
      if (wants[id]) {
        const txt = wants[id].toLocaleUpperCase('tr');
        const it = ensureItem(key, 'plate', () => createPlate(0.34, 0.08, txt, bg, '#ecd8ad', 0x221811), new V3(0, TABLE_Y + 0.8, 0.5));
        if (it.label !== txt) { setPlateText(it.mesh, txt, bg, '#ecd8ad'); it.label = txt; }
        it.dom = '#' + id;
        placeItem(it, x, TABLE_Y + 0.06, 0.85, 0, 0, 0, 1);
      } else if (items.has(key)) {
        items.get(key).dying = true;
      }
    });

    const mb = document.getElementById('mb');
    const bigImg = (open && !is2DModal) ? document.querySelector('#mb img.big') : null;
    if (open && !is2DModal && !bigImg && mb) {
      let raw = '';
      if (box) {
        const aft = mb.querySelector('.after');
        const fin = box.classList.contains('finished');
        raw = fin && aft ? aft.innerText.trim() : ('ÖLÜM ZARI (HEDEF ' + box.dataset.dc + '+)\n' + (document.getElementById('rl') ? 'ZARA DOKUNARAK AT' : 'RAKİP ZAR ATIYOR...'));
      } else {
        const clone = mb.cloneNode(true);
        clone.querySelectorAll('button, .d20-box').forEach(e => e.remove());
        raw = clone.innerText.trim();
      }
      if (raw) {
        const scTxt = raw.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3).join('\n');
        const it = ensureItem('m_scroll', 'static', () => createSlate(1.42, 0.035, 0.52, scTxt, '#291d12', '#f5e2ba'), new V3(0, TABLE_Y + 0.7, 0.2));
        if (it.label !== scTxt) { setSlateText(it.mesh, scTxt, '#291d12', '#f5e2ba'); it.label = scTxt; }
        placeItem(it, -0.15, TABLE_Y + 0.055, box ? 1.02 : 0.58, 0, 0, 0, 1);
      }
    } else if (items.has('m_scroll')) {
      items.get('m_scroll').dying = true;
    }

    if (box) {
      const dc = box.dataset.dc, txt = 'HEDEF\n' + dc;
      const it = ensureItem('m_dc', 'plate', () => createPlate(0.3, 0.07, txt, '#3a0c12', '#f0cf85', 0x24120c), new V3(-0.9, TABLE_Y + 0.8, 0.6));
      if (it.label !== txt) { setPlateText(it.mesh, txt, '#3a0c12', '#f0cf85'); it.label = txt; }
      it.dom = null;
      placeItem(it, -1.0, TABLE_Y + 0.05, 0.62, 0, 0, 0, 1);
    } else if (items.has('m_dc')) {
      items.get('m_dc').dying = true;
    }

    const zmEl = document.getElementById('zm');
    const castEl = document.getElementById('cast');
    const inspectSrc = bigImg ? bigImg.getAttribute('src')
      : zmEl && zmEl.querySelector('img') ? zmEl.querySelector('img').getAttribute('src')
      : castEl && castEl.querySelector('img') ? castEl.querySelector('img').getAttribute('src') : null;

    if (inspectSrc) {
      const it = ensureItem('m_inspect', 'card', () => createCard(inspectSrc, backSrc(), CARD_W, CARD_H, false), new V3(0, TABLE_Y + 0.2, 1.2));
      setFront(it, inspectSrc);
      it.dom = bigImg ? '#pc' : (zmEl ? '[data-zc]' : '#cast button');
      // Kart inceleme kameraya göre dik ve net açıda durur
      const onOpp = (castEl && castEl.querySelector('img'));
      placeItem(it, 0, TABLE_Y + (onOpp ? 0.58 : 0.82), onOpp ? 1.05 : 1.38, onOpp ? 0.35 : 0.88, 0, 0, 1.52);

      const actSel = bigImg && document.getElementById('pu') ? '#pu'
        : (zmEl && zmEl.querySelector('[data-zb]') ? '[data-zb]' : null);
      if (actSel) {
        const actEl = document.querySelector(actSel);
        const actTxt = (actEl ? actEl.textContent.trim() : 'KULLAN').toLocaleUpperCase('tr');
        const ait = ensureItem('m_iact', 'plate', () => createPlate(0.26, 0.07, actTxt, '#3b1510', '#f5dca8', 0x24120c), new V3(-0.6, TABLE_Y + 0.5, 1.3));
        if (ait.label !== actTxt) { setPlateText(ait.mesh, actTxt, '#3b1510', '#f5dca8'); ait.label = actTxt; }
        ait.dom = actSel;
        placeItem(ait, -0.68, TABLE_Y + 0.06, 1.24, 0, 0, 0, 1);
      } else if (items.has('m_iact')) {
        items.get('m_iact').dying = true;
      }

      const clsSel = bigImg ? '#pc' : (zmEl ? '[data-zc]' : '#cast button');
      const cit = ensureItem('m_icls', 'plate', () => createPlate(0.24, 0.065, 'BIRAK', '#1c1814', '#dec89a', 0x1e1813), new V3(0.6, TABLE_Y + 0.5, 1.3));
      cit.dom = clsSel;
      placeItem(cit, 0.68, TABLE_Y + 0.06, 1.24, 0, 0, 0, 1);
    } else {
      ['m_inspect', 'm_iact', 'm_icls'].forEach(k => { if (items.has(k)) items.get(k).dying = true; });
    }

    // Kamera durumunu güncelle (D20 zarı veya tur sonu açıkken / rakip kart oynarken)
    if (box) {
      camMode = 'die';
    } else if (castEl || (open && !is2DModal && !bigImg)) {
      camMode = 'opponent';
    } else if (typeof G !== 'undefined' && G) {
      camMode = (G.turn === 1 || G.wait || G.over || G.rev) ? 'opponent' : 'table';
    }

    const pit = items.get('pass');
    if (pit) {
      const passEl = document.getElementById('pass');
      const isSpec = typeof MODE !== 'undefined' && MODE === 'spectator';
      pit.mesh.visible = !isSpec && !open && !inspectSrc && !(passEl && passEl.style.display === 'none');
    }
  }

  function pickDie(cx, cy) {
    if (!die.group || !die.group.visible || !document.getElementById('rl')) return null;
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(die.mesh, true).length ? { key: 'die', dom: '#rl', dying: false } : null;
  }

  (function() {
    const orig = window.draw3DD20;
    window.draw3DD20 = function(cv, rx, ry, rz, num, rolling, isCrit, isFail, scale, pop) {
      if (is3DActive && renderer) {
        die.p = { rx: rx, ry: ry, rz: rz, num: String(num), rolling: !!rolling, crit: !!isCrit, fail: !!isFail, scale: scale || 1, pop: pop || 1 };
        if (cv && cv.getContext) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
        return;
      }
      return orig ? orig.apply(this, arguments) : undefined;
    };
  })();

  // --- ANİMASYON & BUCKSHOT ROULETTE DİNAMİK KAMERA GEÇİŞİ ---
  let lastT = 0, frameN = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !is3DActive) return;

    const time = clock.getElapsedTime();
    const dt = Math.min(0.05, time - lastT); lastT = time;
    const k = 1 - Math.exp(-dt * 10);
    const camSmooth = 1 - Math.exp(-dt * 4.2); // Buckshot tarzı ağır, sinematik kafa/kamera dönüşü

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    // Kamera hedef pozisyon ve açısı:
    // 1) 'table' (Sıra sende): Masaya, kendi kartlarına ve eline doğru eğilirsin
    // 2) 'opponent' (Oynadıktan sonra / Rakibin sırası): Başını kaldırıp karşıdaki karanlığa, kızıl gözlere ve rakibin hamlesine bakarsın
    // 3) 'die' (Ölüm zarı): Masanın ortasındaki D20 zarına ve karşıdaki gözlere odaklanırsın
    let targetY = 2.24, targetZ = 2.66, targetPitch = -0.60;
    if (camMode === 'opponent') {
      targetY = 1.62;
      targetZ = 3.02;
      targetPitch = -0.22;
    } else if (camMode === 'die') {
      targetY = 1.94;
      targetZ = 2.84;
      targetPitch = -0.44;
    } else {
      // Sıra bizdeyken fareyi ekranın en üst kısmına götürürsek rakibe doğru hafifçe göz ucuyla bakabiliriz
      const glanceUp = mouse.y < -0.65 ? (-mouse.y - 0.65) * 0.45 : 0;
      targetPitch = -0.60 + glanceUp;
      targetY = 2.24 - glanceUp * 0.55;
    }

    const targetX = mouse.x * 0.16;
    const targetYaw = -mouse.x * 0.055;

    camCurPos.x += (targetX - camCurPos.x) * camSmooth;
    camCurPos.y += (targetY - camCurPos.y) * camSmooth;
    camCurPos.z += (targetZ - camCurPos.z) * camSmooth;
    camCurPitch += ((targetPitch - mouse.y * 0.035) - camCurPitch) * camSmooth;
    camCurYaw += (targetYaw - camCurYaw) * camSmooth;

    camera.position.set(
      camCurPos.x,
      camCurPos.y + Math.sin(time * 1.5) * 0.008,
      camCurPos.z
    );
    camera.rotation.y = camCurYaw;
    camera.rotation.x = camCurPitch;

    // Lamba titremesi & tıklama salınımı
    lampBoostVel += (-lampSwingBoost * 18 - lampBoostVel * 2.5) * dt;
    lampSwingBoost += lampBoostVel * dt;
    const flicker = 1.0 + (Math.sin(time * 12.0) * 0.03) + (Math.random() * 0.02 - 0.01);
    if (pointLight) pointLight.intensity = 0.95 * flicker;
    if (spotLight) spotLight.intensity = 2.65 * flicker;
    if (lampMesh && ceilingWire) {
      const sw = Math.sin(time * 1.1) * 0.025 + lampSwingBoost;
      lampMesh.rotation.z = sw; ceilingWire.rotation.z = sw * 0.5;
      if (spotLight) spotLight.target.position.x = Math.sin(sw) * 0.85;
    }
    animateOpponent(time, dt);
    animateProps(time, dt);

    // Nesneleri hedeflerine kaydır
    const dead = [];
    items.forEach(it => {
      const m = it.mesh;
      const hov = (hovered === it);
      let ty = it.tp.y + (hov ? (it.kind === 'hand' ? 0.10 : 0.045) : 0);
      let tz = it.tp.z + (hov && it.kind === 'hand' ? 0.08 : 0);
      if (it.dying) { it.ts = 0; }
      let yoff = 0;
      if (it.arc) {
        const u = (time - it.t0) / 0.72;
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

      const ud = m.userData;
      if (ud.front) {
        // Kartların kendi renklerini bozan çamurlu emissive tonları kaldırıldı; sadece seçili/hover kartlarda temiz vurgu var
        let ec = 0x000000, ei = 0;
        if (it.hl) { ec = 0xd98a26; ei = 0.28 + 0.16 * Math.sin(time * 6); }
        else if (it.mod) { ec = it.kind === 'chip' ? 0x550000 : 0x3a1ca8; ei = 0.25; }
        else if (hov) { ec = 0x3d2b16; ei = 0.22; }
        ud.front.emissive.setHex(ec); ud.front.emissiveIntensity = ei;
        ud.back.emissive.setHex(ec); ud.back.emissiveIntensity = ei;
        const col = it.dim ? 0x78726a : 0xffffff;
        ud.front.color.setHex(col); ud.back.color.setHex(col);
      } else if (ud.plate) {
        const on = !it.dim;
        const glow = on ? (hov ? 0.42 : 0.15 + 0.10 * Math.sin(time * 3.5)) : 0;
        ud.topMat.emissive.setHex(on ? 0x5a3a18 : 0x000000);
        ud.topMat.emissiveIntensity = glow;
        ud.topMat.color.setHex(on ? 0xffffff : 0x666666);
      }
    });
    dead.forEach(it => { scene.remove(it.mesh); items.delete(it.key); });

    if (sealItem) {
      const u = (time - sealItem.pulse) / 0.55;
      const sc = u < 1 ? 1 + 0.4 * (1 - u) * (1 - u) : 1;
      sealItem.mesh.scale.setScalar(sc);
      sealItem.mesh.position.y = TABLE_Y + 0.024 + (u < 1 ? 0.15 * (1 - u) : 0);
    }

    if (arrowItem) {
      const a = arrowItem;
      const dirZ = a.mode === 'me' ? 1 : -1;
      a.mesh.visible = a.mode !== 'off';
      if (a.mesh.visible) {
        a.mesh.rotation.set(dirZ * Math.PI / 2, 0, 0);
        a.mesh.position.set(0, TABLE_Y + 0.10, 0.24 + dirZ * (0.27 + 0.03 * Math.sin(time * 4)));
        const mat = a.mesh.material;
        mat.color.setHex(a.mode === 'me' ? 0xd4af37 : 0xc4302b);
        mat.emissive.setHex(a.mode === 'me' ? 0x6e5211 : 0x7a1414);
      }
    }

    frameN = (frameN + 1) % 6;
    if (frameN === 0) updateModal();
    updateDie(time);
    renderer.render(scene, camera);
  }

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
    debug: function() {
      return {
        camMode: camMode,
        project: function(k) {
          const it = items.get(k);
          if (it) {
            const v = it.mesh.position.clone().project(camera);
            return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
          }
          const pr = propsList.find(p => p.key === k);
          if (pr) {
            const pos = new THREE.Vector3();
            pr.mesh.getWorldPosition(pos);
            const v = pos.project(camera);
            return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)];
          }
          return null;
        },
        vp: [innerWidth, innerHeight, devicePixelRatio],
        items: Array.from(items.keys()),
        props: propsList.map(p => p.key),
        pick: function(x, y) {
          const it = pickItem(x, y);
          if (it) return it.key + ' ' + it.dom;
          const pr = pickProp(x, y);
          return pr ? pr.key : null;
        },
        dom: function(k) { const it = items.get(k); return it ? [it.dom, !!document.querySelector(it.dom), interactive(it)] : null; }
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.Necro3D.init);
  } else {
    window.Necro3D.init();
  }
})();
