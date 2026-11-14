// ============================================================
// NECRODICE 3D ENGINE (Inscryption & Buckshot Roulette Aesthetic)
// Karanlık bodrum katı, masif kalın ahşap & dövme demir masa,
// "Zarların Bekçisi" rakip, gotik mühür/plakalar ve tıklanabilir masa objeleri.
// ============================================================

(function() {
  let scene, camera, renderer;
  let tableMesh, lampMesh, ceilingWire, pointLight, spotLight;
  let opponentMesh = null;
  let is3DActive = false;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = new THREE.Clock();
  let textureCache = {};

  // Etkileşimli masa/oda aksesuarları (mum, çan, kafatası, kum saati, sigara, kadeh)
  let propsList = [];
  let candleFlameMesh = null, candleLight = null, candleLit = true;
  let bellSwing = 0, bellVel = 0, bellMesh = null;
  let skullJaw = null, skullJawOpen = 0, skullEyes = [];
  let hourglassGroup = null, hgTargetRotZ = 0, hgCurRotZ = 0;
  let gobletGroup = null, gobletTilt = 0;
  let smokeParticles = [];
  let lampSwingBoost = 0, lampBoostVel = 0;
  let propToastTimer = null;

  function init3DSetting() {
    const pref = localStorage.getItem('mode_3d');
    is3DActive = pref === null ? true : pref === '1';
    document.body.classList.toggle('view-3d', is3DActive);
  }

  // --- SES EFEKTİ YARDIMCISI (Masa aksesuarları için prosedürel ses) ---
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
      } else if (type === 'skull') {
        tone(95, 0.12, 'square', 0.14, 0, -25);
        tone(130, 0.14, 'sawtooth', 0.12, 0.12, -30);
      } else if (type === 'hourglass') {
        if (typeof noise === 'function') noise(0.35, 0.12, 2400);
        tone(440, 0.15, 'sine', 0.08);
      } else if (type === 'cigar') {
        if (typeof noise === 'function') noise(0.28, 0.15, 1200);
      } else if (type === 'goblet') {
        tone(680, 0.5, 'sine', 0.12);
        tone(1020, 0.35, 'sine', 0.06, 0.03);
      } else if (type === 'lamp') {
        tone(210, 0.25, 'sawtooth', 0.08, 0, -60);
      }
    } catch (e) {}
  }

  // Masa aksesuarına tıklanınca ekranda/rakip satırında kısa atmosferik tepki göster
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
  // 1) DOKU ÜRETİCİLERİ (Masif Kalın Kütük Masa + Bodrum Tuğla Duvarı)
  // ============================================================
  function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Zengin sıcak ceviz/meşe taban (kullanıcının attığı masif kütük masa tonları)
    ctx.fillStyle = '#332012';
    ctx.fillRect(0, 0, 1024, 1024);

    // 5 adet kalın masif ahşap kalas (plank) birleşimi
    const planks = 5;
    const pw = 1024 / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * pw;
      // Her kalasa hafif ton farkı
      const shade = (p % 2 === 0) ? 'rgba(68, 42, 22, 0.35)' : 'rgba(32, 18, 9, 0.35)';
      ctx.fillStyle = shade;
      ctx.fillRect(0, y0, 1024, pw);

      // Kalas birleşim derzi (derin koyu yarık)
      ctx.fillStyle = 'rgba(8, 4, 2, 0.88)';
      ctx.fillRect(0, y0, 1024, 5);
      ctx.fillStyle = 'rgba(95, 62, 34, 0.28)';
      ctx.fillRect(0, y0 + 5, 1024, 2);

      // Kalas içi doğal damarlar ve budaklar (knots)
      for (let i = 0; i < 140; i++) {
        const y = y0 + 6 + Math.random() * (pw - 10);
        const h = 1 + Math.random() * 2.5;
        ctx.fillStyle = Math.random() > 0.35
          ? `rgba(18, 10, 4, ${0.14 + Math.random() * 0.24})`
          : `rgba(92, 58, 30, ${0.10 + Math.random() * 0.16})`;
        ctx.fillRect(0, y, 1024, h);
      }

      // Her kalasta 1-2 organik budak halkası
      const knotCount = 1 + (p % 2);
      for (let k = 0; k < knotCount; k++) {
        const kx = 140 + ((p * 230 + k * 410) % 760);
        const ky = y0 + pw * (0.32 + 0.36 * k);
        for (let r = 28; r > 3; r -= 4) {
          ctx.strokeStyle = r < 10 ? 'rgba(12, 6, 2, 0.7)' : 'rgba(24, 13, 6, 0.32)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(kx, ky, r * 1.8, r * 0.65, 0.08, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Yaşanmışlık izleri: bıçak çizikleri, zar darbeleri ve sigara yanıkları
    for (let i = 0; i < 95; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const len = 12 + Math.random() * 45;
      const ang = (Math.random() - 0.5) * 0.7;
      ctx.strokeStyle = 'rgba(10, 5, 2, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Masa kenarlarında koyu eskitme / vernik aşınması
    const grad = ctx.createRadialGradient(512, 512, 220, 512, 512, 720);
    grad.addColorStop(0, 'rgba(255, 195, 120, 0.06)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(6, 3, 1, 0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  // Bodrum katı taş/tuğla duvar dokusu (rutubetli, karanlık)
  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09080c';
    ctx.fillRect(0, 0, 512, 512);

    // Koyu bodrum tuğla örgü derzleri
    const rows = 16, cols = 8;
    const bh = 512 / rows, bw = 512 / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off, y = r * bh;
        const shade = 11 + ((r * 7 + c * 13) % 10);
        ctx.fillStyle = `rgb(${shade + 3}, ${shade + 1}, ${shade + 4})`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }

    // Rutubet lekeleri ve granül
    for (let i = 0; i < 4500; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const v = (Math.random() * 18) | 0;
      ctx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 4}, 0.24)`;
      ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    return tex;
  }

  // ============================================================
  // 2) SAHNE, MASİF MASA & KARANLIK BODRUM ODASI
  // ============================================================
  function initScene() {
    const container = document.getElementById('scene3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040306, 0.105);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.2, 3.4);
    camera.rotation.x = -0.52;

    fitFov();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.appendChild(renderer.domElement);

    // --- BODRUM KATI ODASI ---
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92, metalness: 0.08 });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.52, metalness: 0.82 });
    const rustyIronMat = new THREE.MeshStandardMaterial({ color: 0x261d18, roughness: 0.68, metalness: 0.72 });
    const darkBeamMat = new THREE.MeshStandardMaterial({ color: 0x160f09, roughness: 0.88, metalness: 0.05 });

    // Arka ve yan bodrum duvarları
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), wallMat);
    backWall.position.set(0, 3, -4.6);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), wallMat);
    leftWall.position.set(-5.6, 3, 0.5);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), wallMat);
    rightWall.position.set(5.6, 3, 0.5);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Zemin
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallMat);
    floor.position.set(0, -1.2, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Bodrum tavan kirişleri
    [-2.2, 0, 2.2].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.28, 0.32), darkBeamMat);
      beam.position.set(0, 4.1, z);
      scene.add(beam);
    });

    // Arka duvarda paslı bodrum boruları + vana
    const pipeH = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 11, 12), rustyIronMat);
    pipeH.rotation.z = Math.PI / 2;
    pipeH.position.set(0, 2.65, -4.45);
    scene.add(pipeH);

    const pipeV = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.5, 12), rustyIronMat);
    pipeV.position.set(-2.9, 1.3, -4.42);
    scene.add(pipeV);

    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16), new THREE.MeshStandardMaterial({ color: 0x6e1d18, roughness: 0.6, metalness: 0.6 }));
    valve.position.set(-2.9, 1.85, -4.32);
    scene.add(valve);

    // Sağ arkada yüksek demir parmaklıklı bodrum penceresi ve soluk ay ışığı
    const winGroup = new THREE.Group();
    winGroup.position.set(2.55, 2.95, -4.52);
    const winBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x162436 })
    );
    winGroup.add(winBacking);
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.7, 0.08), darkIronMat);
    winFrame.position.z = -0.02;
    winGroup.add(winFrame);
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.66, 8), darkIronMat);
      bar.position.set(i * 0.22, 0, 0.02);
      winGroup.add(bar);
    }
    scene.add(winGroup);

    const moonLight = new THREE.PointLight(0x3a6494, 0.65, 5.5);
    moonLight.position.set(2.4, 2.8, -3.9);
    scene.add(moonLight);

    // Sol arkada ahşap raf ve üstünde şişeler / kafatası silüeti / fıçı
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.42), darkBeamMat);
    shelf.position.set(-2.45, 1.85, -4.32);
    scene.add(shelf);
    [-0.5, -0.18, 0.25].forEach((ox, idx) => {
      const btl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.055, 0.24 + (idx % 2) * 0.05, 10),
        new THREE.MeshStandardMaterial({ color: idx === 1 ? 0x3b1714 : 0x162b1e, roughness: 0.25, metalness: 0.3 })
      );
      btl.position.set(-2.45 + ox, 2.0, -4.3);
      scene.add(btl);
    });

    // Köşede eski meşe fıçı
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.05, 16), darkBeamMat);
    barrel.position.set(-3.3, -0.65, -3.6);
    scene.add(barrel);

    // --- MASİF KÜTÜK MASA & DÖVME DEMİR U-AYAKLAR (Görseldeki Tasarım) ---
    const woodTex = createWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.68,
      metalness: 0.06
    });

    // Kalın masif tabla (yüzey yüksekliği TABLE_Y = 0.53 ile birebir uyumlu: 0.39 + 0.28/2 = 0.53)
    const tableGroup = new THREE.Group();
    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(4.56, 0.28, 3.08), tableMat);
    tableMesh.position.set(0, 0.39, 0.2);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    tableGroup.add(tableMesh);

    // Yanlarda siyah dövme demir kuşak/köşebent plakaları ve perçin çivileri (kullanıcının attığı görseldeki gibi)
    [-1, 1].forEach(side => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.19, 3.10), darkIronMat);
      strap.position.set(side * 2.285, 0.39, 0.2);
      tableGroup.add(strap);

      // Ön ve arka köşe demir sarma plakaları
      [-1, 1].forEach(zSide => {
        const cornerFront = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.19, 0.05), darkIronMat);
        cornerFront.position.set(side * 2.08, 0.39, 0.2 + zSide * 1.545);
        tableGroup.add(cornerFront);

        // Metal perçinler (rivets)
        for (let r = 0; r < 3; r++) {
          const riv = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), rustyIronMat);
          riv.position.set(side * 2.31, 0.39, 0.2 + zSide * (1.35 - r * 0.22));
          tableGroup.add(riv);
        }
      });

      // Kalın trapez/U-profil dövme demir masa ayakları
      const xLeg = side * 1.82;
      const postF = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.48, 0.22), darkIronMat);
      postF.position.set(xLeg, -0.45, 1.38);
      postF.rotation.z = -side * 0.06;
      postF.castShadow = true;
      tableGroup.add(postF);

      const postB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.48, 0.22), darkIronMat);
      postB.position.set(xLeg, -0.45, -0.98);
      postB.rotation.z = -side * 0.06;
      postB.castShadow = true;
      tableGroup.add(postB);

      const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 2.58), darkIronMat);
      botBar.position.set(xLeg, -1.16, 0.2);
      tableGroup.add(botBar);

      // Görseldeki çapraz X-gergi demir çubukları
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

    // --- SALLANAN ENDÜSTRİYEL TAVAN LAMBASI ---
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 3.8, 0.2);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    ceilingWire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6), wireMat);
    ceilingWire.position.y = -0.8;
    lampGroup.add(ceilingWire);

    const shadeGeo = new THREE.ConeGeometry(0.44, 0.36, 16, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x182216,
      roughness: 0.55,
      metalness: 0.75,
      side: THREE.DoubleSide
    });
    lampMesh = new THREE.Mesh(shadeGeo, shadeMat);
    lampMesh.position.y = -1.6;
    lampGroup.add(lampMesh);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8aa });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), bulbMat);
    bulb.position.y = -1.65;
    lampGroup.add(bulb);

    scene.add(lampGroup);

    // Tavan lambasını da tıklanabilir aksesuar olarak kaydet (tıklayınca sallanır)
    propsList.push({
      key: 'prop_lamp',
      mesh: lampMesh,
      onClick: function() {
        lampBoostVel += (Math.random() > 0.5 ? 1 : -1) * 0.22;
        playPropSfx('lamp');
        propReact('*Tavan lambası gıcırdayarak sallanıyor...*');
      }
    });

    // Ana spot ışığı
    spotLight = new THREE.SpotLight(0xffdf99, 4.3, 8.5, Math.PI / 3.3, 0.52, 1.2);
    spotLight.position.set(0, 2.1, 0.2);
    spotLight.target.position.set(0, 0.5, 0.2);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);
    scene.add(spotLight.target);

    pointLight = new THREE.PointLight(0xffb84d, 1.85, 5.5, 2);
    pointLight.position.set(0, 2.1, 0.2);
    scene.add(pointLight);

    const fillLight = new THREE.DirectionalLight(0x1e2c38, 0.58);
    fillLight.position.set(0, 4, 6);
    scene.add(fillLight);

    // Oyuncunun elindeki joker kartlarını aydınlatan sıcak ön mum/masa yansıması
    const handLight = new THREE.PointLight(0xffcf88, 1.35, 3.2, 1.8);
    handLight.position.set(0, 1.25, 2.55);
    scene.add(handLight);

    // --- RAKİP SİLÜETİ ("Zarların Bekçisi") ---
    createOpponentSilhouette();

    // --- MASADAKİ TIKLANABİLİR ATMOSFERİK OBJELER ---
    createInteractiveTableProps();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
  }

  // ============================================================
  // 3) MASADAKİ TIKLANABİLİR ATMOSFERİK OBJELER (Mum, Kafatası, Çan, Kum Saati, Sigara)
  // ============================================================
  function createInteractiveTableProps() {
    const TABLE_Y = 0.53;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x8c6d2e, roughness: 0.38, metalness: 0.82 });
    const darkBrass = new THREE.MeshStandardMaterial({ color: 0x3d2e14, roughness: 0.55, metalness: 0.75 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xd4c7a5, roughness: 0.72, metalness: 0.05 });

    // 1. KANLI MUM & PİRİNÇ ŞAMDAN (Sol üst köşe: tıkla = söndür / yak)
    const candleGrp = new THREE.Group();
    candleGrp.position.set(-1.68, TABLE_Y, -0.78);

    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.03, 20), brassMat);
    saucer.position.y = 0.015;
    saucer.castShadow = true;
    candleGrp.add(saucer);

    const waxMat = new THREE.MeshStandardMaterial({ color: 0xc9be9e, roughness: 0.82 });
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.34, 16), waxMat);
    wax.position.y = 0.19;
    wax.castShadow = true;
    candleGrp.add(wax);

    // Kırmızı erimiş mum damlaları
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x7a1118, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const dr = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dripMat);
      dr.scale.set(0.8, 2.4, 0.8);
      const ang = i * 1.5;
      dr.position.set(Math.cos(ang) * 0.068, 0.16 + (i % 2) * 0.08, Math.sin(ang) * 0.068);
      candleGrp.add(dr);
    }

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
    candleFlameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.11, 10), flameMat);
    candleFlameMesh.position.y = 0.41;
    candleGrp.add(candleFlameMesh);

    candleLight = new THREE.PointLight(0xff7722, 1.15, 2.8, 2);
    candleLight.position.set(-1.68, TABLE_Y + 0.45, -0.78);
    scene.add(candleLight);
    scene.add(candleGrp);

    propsList.push({
      key: 'prop_candle',
      mesh: candleGrp,
      onClick: function() {
        candleLit = !candleLit;
        candleFlameMesh.visible = candleLit;
        candleLight.intensity = candleLit ? 1.15 : 0;
        playPropSfx(candleLit ? 'candle_on' : 'candle_off');
        propReact(candleLit ? 'Karanlıkta bir kıvılcım daha yandı...' : 'Mumu üfledin. Gölgeler masaya yaklaştı.');
      }
    });

    // 2. OYULMUŞ KURUKAFASI TOTEMİ (Sol orta-üst: tıkla = çenesi takırdar, gözleri parlar)
    const skullGrp = new THREE.Group();
    skullGrp.position.set(-1.22, TABLE_Y, -0.82);
    skullGrp.rotation.y = 0.42;

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 14), boneMat);
    cranium.scale.set(0.92, 1.04, 1.12);
    cranium.position.y = 0.16;
    cranium.castShadow = true;
    skullGrp.add(cranium);

    skullJaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.14), boneMat);
    skullJaw.position.set(0, 0.045, 0.03);
    skullJaw.castShadow = true;
    skullGrp.add(skullJaw);

    const skEyeMat = new THREE.MeshBasicMaterial({ color: 0x2a0508 });
    [-1, 1].forEach(s => {
      const se = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), skEyeMat.clone());
      se.position.set(s * 0.046, 0.16, 0.125);
      skullGrp.add(se);
      skullEyes.push(se);
    });
    scene.add(skullGrp);

    propsList.push({
      key: 'prop_skull',
      mesh: skullGrp,
      onClick: function() {
        skullJawOpen = 1.0;
        playPropSfx('skull');
        const lines = [
          '*Kurukafa dişlerini takırdattı: "Ölüm zarını bekleyen bir ruh daha..."*',
          '*Kemiklerin arasından soğuk bir fısıltı yükseldi.*',
          '*Eski oyuncunun kafatası sana sırıttı.*'
        ];
        propReact(lines[(Math.random() * lines.length) | 0]);
      }
    });

    // 3. ANTİKA PİRİNÇ MASA ÇANI (Sağ orta: tıkla = çınlar ve sallanır)
    const bellGrp = new THREE.Group();
    bellGrp.position.set(1.78, TABLE_Y, 0.12);

    const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 20), darkBrass);
    bellBase.position.y = 0.015;
    bellGrp.add(bellBase);

    bellMesh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.14, 20), brassMat);
    bellMesh.position.y = 0.095;
    bellMesh.castShadow = true;
    bellGrp.add(bellMesh);

    const bellPin = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), brassMat);
    bellPin.position.y = 0.175;
    bellGrp.add(bellPin);
    scene.add(bellGrp);

    propsList.push({
      key: 'prop_bell',
      mesh: bellGrp,
      onClick: function() {
        bellVel = 0.35;
        playPropSfx('bell');
        propReact('*Masa çanı karanlık bodrumda yankılandı.*');
      }
    });

    // 4. KAN KUM SAATİ (Sağ üst: tıkla = 180 derece döner)
    hourglassGroup = new THREE.Group();
    hourglassGroup.position.set(1.68, TABLE_Y + 0.18, -0.58);

    const hgTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16), brassMat);
    hgTop.position.y = 0.16;
    hourglassGroup.add(hgTop);

    const hgBot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16), brassMat);
    hgBot.position.y = -0.16;
    hourglassGroup.add(hgBot);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x991824,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.78
    });
    const bulb1 = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.15, 14), glassMat);
    bulb1.position.y = -0.075;
    hourglassGroup.add(bulb1);

    const bulb2 = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.15, 14), glassMat);
    bulb2.rotation.z = Math.PI;
    bulb2.position.y = 0.075;
    hourglassGroup.add(bulb2);

    scene.add(hourglassGroup);

    propsList.push({
      key: 'prop_hourglass',
      mesh: hourglassGroup,
      onClick: function() {
        hgTargetRotZ += Math.PI;
        playPropSfx('hourglass');
        propReact('*Kum saatini çevirdin. Kızıl kumlar yeniden akmaya başladı.*');
      }
    });

    // 5. KÜLLÜK & TÜTEN PURO (Sağ orta-ön: tıkla = kor parlar, duman yükselir)
    const ashGrp = new THREE.Group();
    ashGrp.position.set(1.78, TABLE_Y, 0.54);

    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.04, 18), darkBrass);
    tray.position.y = 0.02;
    tray.castShadow = true;
    ashGrp.add(tray);

    const cigar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.022, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.85 })
    );
    cigar.rotation.z = Math.PI / 2 - 0.12;
    cigar.rotation.y = 0.4;
    cigar.position.set(-0.02, 0.048, 0);
    ashGrp.add(cigar);

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4411 });
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), emberMat);
    ember.position.set(-0.12, 0.06, -0.045);
    ashGrp.add(ember);
    scene.add(ashGrp);

    // Duman partikülleri
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.18, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const sm = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), smokeMat.clone());
      sm.position.set(1.66, TABLE_Y + 0.08 + i * 0.08, 0.50);
      scene.add(sm);
      smokeParticles.push({ mesh: sm, phase: i * 1.1, boost: 0 });
    }

    propsList.push({
      key: 'prop_cigar',
      mesh: ashGrp,
      onClick: function() {
        ember.scale.setScalar(1.7);
        setTimeout(() => ember.scale.setScalar(1.0), 450);
        smokeParticles.forEach(p => { p.boost = 1.0; });
        playPropSfx('cigar');
        propReact('*Küllükteki puronun koru parladı, acı bir duman yükseldi.*');
      }
    });

    // 6. KIZIL İKSİR KADEHİ (Sol ön-orta: tıkla = kadeh sallanır ve çınlar)
    gobletGroup = new THREE.Group();
    gobletGroup.position.set(-1.72, TABLE_Y, -0.15);

    const gFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 16), brassMat);
    gFoot.position.y = 0.01;
    gobletGroup.add(gFoot);

    const gStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 12), brassMat);
    gStem.position.y = 0.08;
    gobletGroup.add(gStem);

    const gCup = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.05, 0.14, 18), brassMat);
    gCup.position.y = 0.19;
    gCup.castShadow = true;
    gobletGroup.add(gCup);

    const wine = new THREE.Mesh(
      new THREE.CircleGeometry(0.095, 16),
      new THREE.MeshStandardMaterial({ color: 0x6b0912, roughness: 0.15, metalness: 0.3 })
    );
    wine.rotation.x = -Math.PI / 2;
    wine.position.y = 0.255;
    gobletGroup.add(wine);

    scene.add(gobletGroup);

    propsList.push({
      key: 'prop_goblet',
      mesh: gobletGroup,
      onClick: function() {
        gobletTilt = 0.28;
        playPropSfx('goblet');
        propReact('*Kadehin içindeki koyu sıvı dalgalandı.*');
      }
    });
  }

  function animateProps(time, dt) {
    // 1. Mum alevi titremesi
    if (candleLit && candleFlameMesh && candleLight) {
      const f = 1.0 + Math.sin(time * 17) * 0.12 + Math.cos(time * 29) * 0.08;
      candleFlameMesh.scale.set(1, f, 1);
      candleFlameMesh.rotation.z = Math.sin(time * 9) * 0.08;
      candleLight.intensity = 1.1 * f;
    }

    // 2. Kurukafa çene ve göz parlaması
    if (skullJaw) {
      skullJawOpen = Math.max(0, skullJawOpen - dt * 2.2);
      const ch = skullJawOpen > 0 ? Math.abs(Math.sin(time * 28)) * 0.045 * skullJawOpen : 0;
      skullJaw.position.y = 0.045 - ch;
      skullEyes.forEach(e => {
        e.material.color.setHex(skullJawOpen > 0.05 ? 0xff2233 : 0x2a0508);
      });
    }

    // 3. Masa çanı salınımı
    if (bellMesh) {
      bellVel += (-bellSwing * 45 - bellVel * 5) * dt;
      bellSwing += bellVel * dt;
      bellMesh.rotation.z = bellSwing;
    }

    // 4. Kum saati dönüşü
    if (hourglassGroup) {
      hgCurRotZ += (hgTargetRotZ - hgCurRotZ) * Math.min(1, dt * 7);
      hourglassGroup.rotation.z = hgCurRotZ;
    }

    // 5. Puro dumanı
    smokeParticles.forEach((sp, i) => {
      sp.boost = Math.max(0, sp.boost - dt * 0.6);
      const u = (time * (0.35 + sp.boost * 0.4) + sp.phase) % 1.0;
      sp.mesh.position.y = 0.58 + u * 0.65;
      sp.mesh.position.x = 1.66 + Math.sin(time * 2 + i) * 0.05 * u;
      sp.mesh.scale.setScalar(0.6 + u * (1.2 + sp.boost));
      sp.mesh.material.opacity = (1 - u) * (0.18 + sp.boost * 0.22);
    });

    // 6. Kadeh salınımı
    if (gobletGroup) {
      gobletTilt *= Math.max(0, 1 - dt * 4);
      gobletGroup.rotation.z = Math.sin(time * 18) * gobletTilt;
    }
  }

  // ============================================================
  // 4) RAKİP: "ZARLARIN BEKÇİSİ"
  // ============================================================
  function limb(a, b, r, mat) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, len, 8), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }

  function createBoneHand(side, bone, fingers) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.12), bone);
    palm.castShadow = true;
    h.add(palm);
    for (let i = 0; i < 4; i++) {
      const piv = new THREE.Group();
      piv.position.set(-0.042 + i * 0.028, 0, 0.06);
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0095, 0.075, 6), bone);
      f1.rotation.x = Math.PI / 2; f1.position.z = 0.0375; f1.castShadow = true;
      piv.add(f1);
      const piv2 = new THREE.Group();
      piv2.position.z = 0.075;
      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0085, 0.06, 6), bone);
      f2.rotation.x = Math.PI / 2; f2.position.z = 0.03; f2.castShadow = true;
      piv2.add(f2);
      piv.add(piv2);
      h.add(piv);
      fingers.push({ piv, piv2, ph: i * 0.9 + (side > 0 ? 0.4 : 0) });
    }
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.07, 6), bone);
    th.rotation.z = Math.PI / 2; th.rotation.y = 0.5 * side; th.position.set(side * 0.08, 0, 0.02);
    h.add(th);
    return h;
  }

  function createOpponentSilhouette() {
    const g = new THREE.Group();
    g.position.set(0, 0.9, -1.8);
    const cloth = new THREE.MeshStandardMaterial({ color: 0x0d0a12, roughness: 0.95, metalness: 0.02 });
    const cloth2 = new THREE.MeshStandardMaterial({ color: 0x18111d, roughness: 0.9, metalness: 0.02 });
    const bone = new THREE.MeshStandardMaterial({ color: 0xcfc4a6, roughness: 0.8, metalness: 0.0, emissive: 0x2a2418, emissiveIntensity: 0.4 });
    const brass = new THREE.MeshStandardMaterial({ color: 0x7a5d22, roughness: 0.4, metalness: 0.8 });

    const prof = [[0.0, -1.3], [0.95, -1.3], [0.82, -0.5], [0.64, 0.1], [0.52, 0.5], [0.36, 0.78], [0.0, 0.84]]
      .map(p => new THREE.Vector2(p[0], p[1]));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), cloth);
    body.castShadow = true;
    g.add(body);
    [-1, 1].forEach(s => {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), cloth2);
      sh.scale.set(1.1, 0.7, 0.95); sh.position.set(s * 0.43, 0.64, 0);
      g.add(sh);
    });

    const head = new THREE.Group();
    head.position.set(0, 1.0, 0);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 16), cloth2);
    hood.scale.set(1, 1.12, 1.1); hood.position.y = 0.1; hood.castShadow = true;
    head.add(hood);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.55, 16), cloth2);
    peak.position.set(0, 0.55, -0.13); peak.rotation.x = -0.45;
    head.add(peak);
    const voidM = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    voidM.scale.set(0.9, 1.0, 0.7); voidM.position.set(0, 0.07, 0.2);
    head.add(voidM);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.014, 8, 36), brass);
    rim.scale.set(0.92, 1.0, 1); rim.position.set(0, 0.07, 0.285);
    head.add(rim);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc01828, fog: false });
    const eyes = [];
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeMat);
      e.scale.set(1.9, 0.55, 0.6); e.position.set(s * 0.095, 0.13, 0.3); e.rotation.z = -s * 0.28;
      head.add(e); eyes.push(e);
    });
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xe6dcc0, fog: false });
    for (let i = 0; i < 7; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.02), toothMat);
      const u = (i - 3) / 3;
      t.position.set(u * 0.115, -0.065 + u * u * 0.035, 0.295);
      t.rotation.z = u * 0.3 + 0.4 * (i % 2);
      head.add(t);
    }
    g.add(head);

    const orbit = new THREE.Group();
    orbit.position.set(0, 2.05, 0);
    const dMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: 0.6, emissive: 0x3a1010, emissiveIntensity: 0.5 });
    const dice = [];
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), dMat);
      orbit.add(d); dice.push(d);
    }
    g.add(orbit);

    const fingers = [], hands = [];
    [-1, 1].forEach(s => {
      const wrist = new THREE.Vector3(s * 0.5, -0.31, 0.5);
      g.add(limb(new THREE.Vector3(s * 0.45, 0.6, 0.02), wrist, 0.075, cloth));
      const hnd = createBoneHand(s, bone, fingers);
      hnd.position.set(s * 0.5, -0.345, 0.62);
      hnd.rotation.y = -s * 0.12;
      g.add(hnd); hands.push(hnd);
    });

    const eyeLight = new THREE.PointLight(0xff2d3d, 0.8, 1.6);
    eyeLight.position.set(0, 1.14, 0.55);
    g.add(eyeLight);
    const rimLight = new THREE.PointLight(0x4a2a7a, 0.9, 7);
    rimLight.position.set(0, 1.5, -1.6);
    g.add(rimLight);

    g.userData = { head, eyes, eyeMat, eyeLight, fingers, dice, orbit, lean: 0, blink: 0, nextBlink: 3 };
    opponentMesh = g;
    scene.add(g);
  }

  function animateOpponent(time, dt) {
    if (!opponentMesh) return;
    const o = opponentMesh.userData;
    const turnOp = !!(arrowItem && arrowItem.mode === 'op');
    o.lean += ((turnOp ? 1 : 0) - o.lean) * Math.min(1, dt * 3);
    o.head.rotation.x = 0.03 * Math.sin(time * 1.1) + o.lean * 0.2;
    o.head.rotation.y = mouse.x * 0.25;
    o.head.position.z = o.lean * 0.12;
    if (time > o.nextBlink) { o.blink = time; o.nextBlink = time + 3 + Math.random() * 4; }
    const bl = time - o.blink;
    const sy = bl < 0.14 ? 0.12 : 1;
    o.eyes.forEach(e => { e.scale.y = 0.55 * sy; });
    o.eyeMat.color.setHex(turnOp ? 0xff5040 : 0xc01828);
    o.eyeLight.intensity = 0.7 + o.lean * 1.3 + 0.1 * Math.sin(time * 5);
    o.fingers.forEach((f, i) => {
      const tap = turnOp ? Math.max(0, Math.sin(time * 7 + f.ph)) : 0;
      f.piv.rotation.x = -0.04 - tap * 0.4;
      f.piv2.rotation.x = 0.1 + tap * 0.3;
    });
    o.dice.forEach((d, i) => {
      const a = time * 0.6 + i * (Math.PI * 2 / 3);
      d.position.set(Math.cos(a) * 0.48, Math.sin(time * 1.3 + i) * 0.05, Math.sin(a) * 0.48);
      d.rotation.set(time * 0.7 + i, time * 0.9, i);
    });
  }

  function onMouseMove(e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }

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
  // 5) MASA NESNELERİ & GOTİK MÜHÜR / DÖVME DEMİR PLAKA TASARIMLARI
  // ============================================================
  const CARD_W = 0.44, CARD_H = 0.64, CARD_T = 0.006, TABLE_Y = 0.53;
  const DECK_POS = new THREE.Vector3(-1.8, TABLE_Y, 0.4);
  const items = new Map();
  let sealItem = null, arrowItem = null;
  let hovered = null, hoveredProp = null;
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

  // Konsepte uygun gotik eskitilmiş madalyon / kan mührü / dövme demir plaka dokusu
  function labelTexture(text, bg, fg, rim) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');

    // Arka plan: koyu eskitilmiş metal/mum mühür yüzeyi
    x.fillStyle = bg || '#1b1410';
    x.fillRect(0, 0, 512, 512);

    // Metalik / taş granül dokusu
    for (let i = 0; i < 1800; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.16)' : 'rgba(255,220,170,0.05)';
      x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    // Derin iç karartma (vignette)
    const g = x.createRadialGradient(256, 240, 30, 256, 256, 250);
    g.addColorStop(0, 'rgba(255, 220, 160, 0.14)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);

    // Dış antik pirinç/demir çember
    const rimCol = rim || '#9c7a38';
    x.strokeStyle = rimCol;
    x.lineWidth = 10;
    x.beginPath();
    x.arc(256, 256, 224, 0, Math.PI * 2);
    x.stroke();

    // İç ince oyma halka
    x.strokeStyle = rimCol;
    x.globalAlpha = 0.55;
    x.lineWidth = 3;
    x.beginPath();
    x.arc(256, 256, 198, 0, Math.PI * 2);
    x.stroke();

    // Çember etrafında 12 adet gotik rün / perçin çentikleri
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

    // Yazı yerleşimi
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
      // Kabartma gölgesi
      x.fillStyle = 'rgba(0, 0, 0, 0.88)';
      x.fillText(l, 260, py + 6);
      x.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      x.lineWidth = 6;
      x.strokeText(l, 256, py);
      x.fillStyle = fg || '#e6d2a8';
      x.fillText(l, 256, py);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Konsepte uygun sekizgen/perçinli ağır madalyon plaka
  function createPlate(radius, height, text, bg, fg, rimColor) {
    const g = new THREE.Group();
    // Alt sekizgen döküm demir/tunç kaide
    const baseMat = new THREE.MeshStandardMaterial({
      color: rimColor || 0x241911,
      roughness: 0.46,
      metalness: 0.78
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.02, radius * 1.10, height, 16),
      baseMat
    );
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    // Üst pirinç çerçeve bileziği
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.96, height * 0.22, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0x7d5e28, roughness: 0.38, metalness: 0.85 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.y = height / 2;
    g.add(bezel);

    // Üst işlemeli mühür yüzeyi
    const topMat = new THREE.MeshStandardMaterial({
      map: labelTexture(text, bg, fg),
      roughness: 0.52,
      metalness: 0.28
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
      placeItem(it, 1.05 + i * 0.16, TABLE_Y + 0.003 * i, -1.02, 0, 0.12 * (i % 2 ? 1 : -1), Math.PI, 0.52);
    });

    // 4) OYNANMIŞ ANLIK/KALICI JOKER ETKİLERİ (ortada, iki yanda)
    const sideCnt = { 0: 0, 1: 0 };
    (S.pj || []).forEach(x => {
      const e = S.eff.find(y => y.uid == x.uid) || x;
      const side = x.o == 1 ? 1 : 0;
      const i = sideCnt[side]++;
      const it = ensureItem('e' + x.uid, 'chip', () => createCard(jokerSrc(e.id), jokerSrc(e.id)), side ? new V3(1.05, TABLE_Y, -1.02) : new V3(0, TABLE_Y + 0.2, 2.05));
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

    // 6) HEDEF KAN MÜHÜRÜ (masanın ortasında koyu kızıl/antik altın gotik mühür)
    const T = tg(S), low = lowW(S);
    const label = low ? 'EN AZ' : String(T);
    const alt = (T != 21 || low);
    const skey = label + '|' + alt;
    const sealBg = alt ? '#2e200d' : '#3d090f';
    const sealFg = alt ? '#f0cf85' : '#e8d0a9';
    if (!sealItem) {
      const g = createPlate(0.38, 0.048, label, sealBg, sealFg, 0x26120c);
      g.position.set(0, TABLE_Y + 0.028, 0.2);
      g.userData.item = { kind: 'static', dying: false };
      scene.add(g);
      sealItem = { mesh: g, key: skey, pulse: -9 };
    } else if (sealItem.key !== skey) {
      setPlateText(sealItem.mesh, label, sealBg, sealFg);
      sealItem.key = skey; sealItem.pulse = clock.getElapsedTime();
    }

    // 7) SIRA OKU (antik altın/kızıl hançer ucu)
    if (!arrowItem) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x5c4210, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.7 }));
      m.castShadow = true;
      scene.add(m);
      arrowItem = { mesh: m, mode: 'off' };
    }
    arrowItem.mode = (S.wait || S.over) ? 'off' : (S.turn === 0 ? 'me' : 'op');

    // 8) PAS / TURU BİTİR (dövme demir ve eskitilmiş pirinç mühür taşı)
    const passEl = document.getElementById('pass');
    const passTxt = passEl ? passEl.textContent : 'Pas';
    const ends = passTxt.toLowerCase().indexOf('bitir') >= 0;
    const passKey = 'pass';
    const pText = ends ? 'TURU\nBİTİR' : 'PAS';
    const passBg = ends ? '#3b1510' : '#1c1814';
    const passFg = ends ? '#f2c97d' : '#dec89a';
    let pit = items.get(passKey);
    if (!pit) {
      pit = ensureItem(passKey, 'plate', () => createPlate(0.27, 0.08, pText, passBg, passFg, 0x1e1813));
      pit.label = pText;
    }
    if (pit.label !== pText) { setPlateText(pit.mesh, pText, passBg, passFg); pit.label = pText; }
    pit.dom = '#pass';
    pit.dim = !passEl || passEl.disabled;
    pit.mesh.visible = !isSpec && !modalOpen() && !(passEl && passEl.style.display === 'none');
    placeItem(pit, 1.3, TABLE_Y + 0.055, 0.8, 0, 0, 0, 1);

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

    // 11) MASA ÜZERİ SKOR TABLETLERİ (Havada TOPLAM yazısı yerine masada dövme demir plakalar)
    const myTot = total(S, 0), opTot = total(S, 1, false);
    const bust = !low && myTot > T, exact = !low && myTot === T;
    const myTxt = 'SEN: ' + myTot + '\nJOKER: ' + Math.max(0, 2 - S.jUsed[0]) + '/2';
    const myBg = bust ? '#470b10' : exact ? '#16381e' : '#1b1410';
    const myFg = bust ? '#ff9999' : exact ? '#a8ffbe' : '#ecd8ad';
    let stMe = items.get('slab_me');
    if (!stMe) {
      stMe = ensureItem('slab_me', 'static', () => createSlate(0.76, 0.04, 0.38, myTxt, myBg, myFg));
      stMe.label = myTxt + myBg;
    } else if (stMe.label !== myTxt + myBg) {
      setSlateText(stMe.mesh, myTxt, myBg, myFg);
      stMe.label = myTxt + myBg;
    }
    stMe.seen = true;
    placeItem(stMe, 1.45, TABLE_Y + 0.025, 1.32, 0, -0.18, 0, 1);

    const opName = (typeof MODE !== 'undefined' && MODE === 'bot' && typeof oppName === 'function') ? oppName().toLocaleUpperCase('tr') : 'RAKİP';
    const opScoreStr = S.rev ? String(total(S, 1, true)) : (opTot + ' + ?');
    const opTxt = opName + '\nTOPLAM: ' + opScoreStr;
    let stOp = items.get('slab_op');
    if (!stOp) {
      stOp = ensureItem('slab_op', 'static', () => createSlate(0.84, 0.04, 0.38, opTxt, '#1f1214', '#e6c8a0'));
      stOp.label = opTxt;
    } else if (stOp.label !== opTxt) {
      setSlateText(stOp.mesh, opTxt, '#1f1214', '#e6c8a0');
      stOp.label = opTxt;
    }
    stOp.seen = true;
    placeItem(stOp, -1.35, TABLE_Y + 0.025, -0.45, 0, 0.16, 0, 1);

    // 12) DÜELLO SKORU & ÖLÜM EŞİĞİ TABLETİ (Üst bar yerine masanın sol üstünde pirinç çetele levhası)
    const res = S.res || [];
    const pipsStr = [0, 1, 2].map(i => res[i] == null ? (i == S.rounds ? '◈' : '◇') : res[i] > 0 ? '★' : res[i] < 0 ? '✕' : '◆').join(' ');
    const dcVal = (typeof TH !== 'undefined') ? TH[Math.min(S.bo, 3)] : 4;
    const duelTxt = 'DÜELLO ' + (S.bo + 1) + '  [' + pipsStr + ']\nÖLÜM EŞİĞİ: ' + dcVal + '+';
    let stDu = items.get('slab_duel');
    if (!stDu) {
      stDu = ensureItem('slab_duel', 'static', () => createSlate(0.92, 0.045, 0.38, duelTxt, '#1a1510', '#d8b560'));
      stDu.label = duelTxt;
    } else if (stDu.label !== duelTxt) {
      setSlateText(stDu.mesh, duelTxt, '#1a1510', '#d8b560');
      stDu.label = duelTxt;
    }
    stDu.seen = true;
    placeItem(stDu, -0.58, TABLE_Y + 0.025, -0.98, 0, 0.06, 0, 1);

    items.forEach(it => {
      if (!it.seen && it.key !== 'pass' && it.key !== 'book' && !/^m_/.test(it.key) && !/^slab_/.test(it.key)) it.dying = true;
    });
  }

  // Dikdörtgen dövme demir / ahşap masa üstü bilgi levhası (skor, düello çetelesi ve ferman için)
  function slateTexture(text, bg, fg) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = bg || '#1b1410';
    x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(255,215,155,0.05)';
      x.fillRect(Math.random() * 512, Math.random() * 256, 3, 2);
    }
    x.strokeStyle = '#8c6d2e';
    x.lineWidth = 8;
    x.strokeRect(12, 12, 488, 232);
    x.strokeStyle = 'rgba(220,180,100,0.35)';
    x.lineWidth = 2;
    x.strokeRect(22, 22, 468, 212);
    // Köşe perçinleri
    [[26, 26], [486, 26], [26, 230], [486, 230]].forEach(([rx, ry]) => {
      x.fillStyle = '#9c7a38';
      x.beginPath(); x.arc(rx, ry, 6, 0, Math.PI * 2); x.fill();
    });
    const lines = String(text).split('\n');
    let fs = lines.length > 2 ? 42 : lines.length > 1 ? 56 : 74;
    const ff = '"Pirata One", "Cinzel", serif';
    do { x.font = 'bold ' + fs + 'px ' + ff; fs -= 3; }
    while (fs > 22 && Math.max.apply(null, lines.map(l => x.measureText(l).width)) > 448);
    const lh = fs * 1.18;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const py = 128 + (i - (lines.length - 1) / 2) * lh;
      x.fillStyle = 'rgba(0,0,0,0.85)';
      x.fillText(l, 259, py + 4);
      x.fillStyle = fg || '#ecd8ad';
      x.fillText(l, 256, py);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function createSlate(w, h, d, text, bg, fg) {
    const side = new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 0.55, metalness: 0.72 });
    const top = new THREE.MeshStandardMaterial({ map: slateTexture(text, bg, fg), roughness: 0.52, metalness: 0.25 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.topMat = top;
    return mesh;
  }

  function setSlateText(mesh, text, bg, fg) {
    const m = mesh.userData.topMat;
    if (!m) return;
    if (m.map) m.map.dispose();
    m.map = slateTexture(text, bg, fg);
    m.needsUpdate = true;
  }

  function bookTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 368;
    const x = c.getContext('2d');
    x.fillStyle = '#29150c'; x.fillRect(0, 0, 512, 368);
    for (let i = 0; i < 450; i++) {
      x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.16) + ')';
      x.fillRect(Math.random() * 512, Math.random() * 368, 2 + Math.random() * 6, 1);
    }
    x.strokeStyle = '#9c7832'; x.lineWidth = 6; x.strokeRect(22, 22, 468, 324);
    x.strokeStyle = '#5c4218'; x.lineWidth = 2; x.strokeRect(32, 32, 448, 304);
    x.fillStyle = '#d8b560'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 92px "Pirata One", serif';
    x.fillText('MENÜ', 256, 190);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return t;
  }

  // --- ETKİLEŞİM (üzerine gelme + tıklama: hem oyun mekanikleri hem masa objeleri) ---
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
  // Sadece Ayarlar / Kodeks / Nasıl oynanır pencereleri 2D overlay olarak kalır; kart önizleme ve sonuç pencereleri 3D masadadır
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

    // 1) Sonuç ve D20 plakaları (#mo, #mx) + Tur Sonu Özeti Fermanı (m_scroll)
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

    // Tur / Düello sonuç metni masanın üzerinde parşömen ferman (m_scroll) olarak belirir
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

    // 2) JOKER ÖNİZLEME (#mb img.big) VE KART İNCELEME (#zm) MASADA 3D OLARAK YÜKSELİR
    const zmEl = document.getElementById('zm');
    const castEl = document.getElementById('cast');
    const inspectSrc = bigImg ? bigImg.getAttribute('src')
      : zmEl && zmEl.querySelector('img') ? zmEl.querySelector('img').getAttribute('src')
      : castEl && castEl.querySelector('img') ? castEl.querySelector('img').getAttribute('src') : null;

    if (inspectSrc) {
      const it = ensureItem('m_inspect', 'card', () => createCard(inspectSrc, backSrc()), new V3(0, TABLE_Y + 0.2, 1.2));
      setFront(it, inspectSrc);
      it.dom = bigImg ? '#pc' : (zmEl ? '[data-zc]' : '#cast button');
      placeItem(it, 0, TABLE_Y + 0.78, 1.45, 0.88, 0, 0, 1.65);

      // Kullan / Kartıma Bak aksiyon madalyonu
      const actSel = bigImg && document.getElementById('pu') ? '#pu'
        : (zmEl && zmEl.querySelector('[data-zb]') ? '[data-zb]' : null);
      if (actSel) {
        const actEl = document.querySelector(actSel);
        const actTxt = (actEl ? actEl.textContent.trim() : 'KULLAN').toLocaleUpperCase('tr');
        const ait = ensureItem('m_iact', 'plate', () => createPlate(0.26, 0.07, actTxt, '#3b1510', '#f5dca8', 0x24120c), new V3(-0.6, TABLE_Y + 0.5, 1.3));
        if (ait.label !== actTxt) { setPlateText(ait.mesh, actTxt, '#3b1510', '#f5dca8'); ait.label = actTxt; }
        ait.dom = actSel;
        placeItem(ait, -0.68, TABLE_Y + 0.06, 1.28, 0, 0, 0, 1);
      } else if (items.has('m_iact')) {
        items.get('m_iact').dying = true;
      }

      // Kapat / Bırak madalyonu
      const clsSel = bigImg ? '#pc' : (zmEl ? '[data-zc]' : '#cast button');
      const cit = ensureItem('m_icls', 'plate', () => createPlate(0.24, 0.065, 'BIRAK', '#1c1814', '#dec89a', 0x1e1813), new V3(0.6, TABLE_Y + 0.5, 1.3));
      cit.dom = clsSel;
      placeItem(cit, 0.68, TABLE_Y + 0.06, 1.28, 0, 0, 0, 1);
    } else {
      ['m_inspect', 'm_iact', 'm_icls'].forEach(k => { if (items.has(k)) items.get(k).dying = true; });
    }

    const pit = items.get('pass');
    if (pit && (open || zmEl || castEl)) pit.mesh.visible = false;
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

  // --- ANİMASYON & RENDER ---
  let lastT = 0, frameN = 0;
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

    // Lamba titremesi & tıklama salınımı
    lampBoostVel += (-lampSwingBoost * 18 - lampBoostVel * 2.5) * dt;
    lampSwingBoost += lampBoostVel * dt;
    const flicker = 1.0 + (Math.sin(time * 12.0) * 0.04) + (Math.random() * 0.03 - 0.015);
    if (pointLight) pointLight.intensity = 1.85 * flicker;
    if (spotLight) spotLight.intensity = 4.3 * flicker;
    if (lampMesh && ceilingWire) {
      const sw = Math.sin(time * 1.2) * 0.04 + lampSwingBoost;
      lampMesh.rotation.z = sw; ceilingWire.rotation.z = sw * 0.5;
      if (spotLight) spotLight.target.position.x = Math.sin(sw) * 1.2;
    }
    if (opponentMesh) opponentMesh.position.y = 0.9 + Math.sin(time * 1.8) * 0.012;
    animateOpponent(time, dt);
    animateProps(time, dt);

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

      const ud = m.userData;
      if (ud.front) {
        let ec = 0x000000, ei = 0;
        if (it.hl) { ec = 0xffb830; ei = 0.35 + 0.2 * Math.sin(time * 6); }
        else if (it.mod) { ec = it.kind === 'chip' ? 0x660000 : 0x5a2cff; ei = 0.35; }
        else if (it.kind === 'hand') { ec = it.dim ? 0x050505 : 0x261d12; ei = it.dim ? 0.1 : (hov ? 0.55 : 0.28); }
        ud.front.emissive.setHex(ec); ud.front.emissiveIntensity = ei;
        ud.back.emissive.setHex(ec); ud.back.emissiveIntensity = ei;
        const col = it.dim ? 0x6a6a6a : 0xffffff;
        ud.front.color.setHex(col); ud.back.color.setHex(col);
      } else if (ud.plate) {
        const on = !it.dim;
        const glow = on ? (hov ? 0.45 : 0.18 + 0.12 * Math.sin(time * 3.5)) : 0;
        ud.topMat.emissive.setHex(on ? 0x5a3a18 : 0x000000);
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
      sealItem.mesh.position.y = TABLE_Y + 0.028 + (u < 1 ? 0.15 * (1 - u) : 0);
    }
    // Sıra oku
    if (arrowItem) {
      const a = arrowItem;
      const dirZ = a.mode === 'me' ? 1 : -1;
      a.mesh.visible = a.mode !== 'off';
      if (a.mesh.visible) {
        a.mesh.rotation.set(dirZ * Math.PI / 2, 0, 0);
        a.mesh.position.set(0, TABLE_Y + 0.10, 0.2 + dirZ * (0.27 + 0.03 * Math.sin(time * 4)));
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
    debug: function() {
      return {
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
