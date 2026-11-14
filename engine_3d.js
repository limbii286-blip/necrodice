// ============================================================
// NECRODICE 3D ENGINE (Inscryption & Buckshot Roulette Aesthetic)
// Atmosferik bodrum katı, masif kalın ahşap & dövme demir masa,
// "Zarların Bekçisi" detaylı rakip karakter, diegetik skor/düello
// sayaçları ve yüksek detaylı tıklanabilir masa objeleri.
// ============================================================

(function() {
  let scene, camera, renderer;
  let tableMesh, lampMesh, ceilingWire, pointLight, spotLight;
  let wallLights = [];
  let opponentMesh = null;
  let is3DActive = false;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = new THREE.Clock();
  let textureCache = {};

  // Etkileşimli masa/oda aksesuarları (şamdan, kafatası, çan, kum saati, puro, kadeh, tavan lambası)
  let propsList = [];
  let candleFlames = [], candleLight = null, candleLit = true;
  let bellSwing = 0, bellVel = 0, bellMesh = null;
  let skullJaw = null, skullJawOpen = 0, skullEyes = [];
  let hourglassGroup = null, hgTargetRotZ = 0, hgCurRotZ = 0;
  let gobletGroup = null, gobletTilt = 0;
  let smokeParticles = [], cigarEmber = null;
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
  // 1) DOKU ÜRETİCİLERİ (Masif Kalın Kütük Masa, Bodrum Tuğla Duvarı, Kemik & Maske)
  // ============================================================
  function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Zengin sıcak ceviz/meşe taban
    ctx.fillStyle = '#362112';
    ctx.fillRect(0, 0, 1024, 1024);

    // 5 adet kalın masif ahşap kalas (plank) birleşimi
    const planks = 5;
    const pw = 1024 / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * pw;
      const shade = (p % 2 === 0) ? 'rgba(78, 48, 24, 0.36)' : 'rgba(28, 15, 7, 0.38)';
      ctx.fillStyle = shade;
      ctx.fillRect(0, y0, 1024, pw);

      // Kalas birleşim derzi (derin koyu yarık + sıcak kenar pahı)
      ctx.fillStyle = 'rgba(6, 3, 1, 0.92)';
      ctx.fillRect(0, y0, 1024, 6);
      ctx.fillStyle = 'rgba(115, 74, 38, 0.32)';
      ctx.fillRect(0, y0 + 6, 1024, 3);

      // Kalas içi doğal damarlar
      for (let i = 0; i < 160; i++) {
        const y = y0 + 8 + Math.random() * (pw - 14);
        const h = 1 + Math.random() * 2.5;
        ctx.fillStyle = Math.random() > 0.35
          ? `rgba(16, 8, 3, ${0.15 + Math.random() * 0.25})`
          : `rgba(104, 66, 34, ${0.10 + Math.random() * 0.16})`;
        ctx.fillRect(0, y, 1024, h);
      }

      // Organik budak halkaları
      const knotCount = 1 + (p % 2);
      for (let k = 0; k < knotCount; k++) {
        const kx = 150 + ((p * 250 + k * 390) % 740);
        const ky = y0 + pw * (0.34 + 0.34 * k);
        for (let r = 26; r > 3; r -= 3.5) {
          ctx.strokeStyle = r < 9 ? 'rgba(10, 4, 1, 0.78)' : 'rgba(28, 14, 6, 0.34)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(kx, ky, r * 2.1, r * 0.62, 0.06, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Kalas uçlarında demir perçin/saplama izleri
      [38, 986].forEach(bx => {
        ctx.fillStyle = '#120d0a';
        ctx.beginPath();
        ctx.arc(bx, y0 + pw * 0.5, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 90, 50, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // Masanın ortasına soluk kazınmış okült düello çemberi / zar sembolleri
    ctx.save();
    ctx.translate(512, 512);
    ctx.strokeStyle = 'rgba(18, 9, 4, 0.42)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 192, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Yaşanmışlık izleri: bıçak çizikleri ve zar darbeleri
    for (let i = 0; i < 110; i++) {
      const x = Math.random() * 1024, y = Math.random() * 1024;
      const len = 14 + Math.random() * 48;
      const ang = (Math.random() - 0.5) * 0.65;
      ctx.strokeStyle = 'rgba(8, 4, 1, 0.48)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Masa kenarlarında doğal eskitme
    const grad = ctx.createRadialGradient(512, 512, 240, 512, 512, 720);
    grad.addColorStop(0, 'rgba(255, 200, 130, 0.08)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(8, 4, 1, 0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  // Bodrum katı taş/tuğla duvar dokusu (aplik ışığında net görünen derin derzli eski mahzen tuğlası)
  function createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Derin harç (mortar) tabanı
    ctx.fillStyle = '#120f12';
    ctx.fillRect(0, 0, 1024, 1024);

    const rows = 20, cols = 10;
    const bh = 1024 / rows, bw = 1024 / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off, y = r * bh;
        const seed = (r * 17 + c * 31) & 255;
        const baseR = 34 + (seed % 22);
        const baseG = 24 + ((seed >> 2) % 14);
        const baseB = 22 + ((seed >> 3) % 12);

        // Tuğla gövdesi
        ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        ctx.fillRect(x + 4, y + 4, bw - 8, bh - 8);

        // Tuğla üst aydınlık kenar (aplik ışığını yakalaması için)
        ctx.fillStyle = `rgba(255, 210, 170, 0.08)`;
        ctx.fillRect(x + 4, y + 4, bw - 8, 5);

        // Tuğla alt gölge kenarı
        ctx.fillStyle = `rgba(0, 0, 0, 0.42)`;
        ctx.fillRect(x + 4, y + bh - 10, bw - 8, 6);

        // Tuğla içi çatlak/pürüz
        for (let k = 0; k < 12; k++) {
          ctx.fillStyle = (k % 2 === 0) ? 'rgba(0,0,0,0.22)' : 'rgba(180,140,110,0.06)';
          ctx.fillRect(x + 6 + Math.random() * (bw - 14), y + 6 + Math.random() * (bh - 14), 6, 3);
        }
      }
    }

    // Rutubet ve mahzen isi lekeleri
    for (let i = 0; i < 60; i++) {
      const rx = Math.random() * 1024, ry = Math.random() * 1024;
      const rad = 30 + Math.random() * 90;
      const g = ctx.createRadialGradient(rx, ry, 4, rx, ry, rad);
      g.addColorStop(0, 'rgba(6, 5, 8, 0.36)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rad, ry - rad, rad * 2, rad * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 1.8);
    tex.anisotropy = 4;
    return tex;
  }

  // Rakibin porselen/kemik veba-tüccar maskesi ve kafatası için eskitilmiş kemik dokusu
  function createBoneTexture(isMask) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = isMask ? '#d8ccb2' : '#cbbca0';
    x.fillRect(0, 0, 512, 512);

    // Organik kemik gözenekleri ve eskitme
    for (let i = 0; i < 2400; i++) {
      x.fillStyle = (i % 3 === 0) ? 'rgba(40, 26, 14, 0.14)' : 'rgba(255, 245, 220, 0.08)';
      x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    // Kılcal çatlaklar
    x.strokeStyle = 'rgba(28, 16, 8, 0.55)';
    x.lineWidth = 1.8;
    for (let i = 0; i < 18; i++) {
      let cx = 100 + Math.random() * 312, cy = 80 + Math.random() * 350;
      x.beginPath();
      x.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 36;
        cy += 10 + Math.random() * 24;
        x.lineTo(cx, cy);
      }
      x.stroke();
    }

    if (isMask) {
      // Alın ve yanaklarda altın/kızıl okült rün işlemeleri
      x.strokeStyle = 'rgba(140, 25, 25, 0.65)';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(256, 60); x.lineTo(256, 175);
      x.moveTo(215, 110); x.lineTo(297, 110);
      x.stroke();
    }

    const g = x.createRadialGradient(256, 256, 80, 256, 256, 280);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(20, 12, 6, 0.65)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Yumuşak duman partikülü dokusu (küp/küre görünümü yerine gerçekçi yumuşak duman bulutu)
  function createSmokeTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 60);
    g.addColorStop(0, 'rgba(210, 205, 198, 0.65)');
    g.addColorStop(0.45, 'rgba(160, 155, 150, 0.28)');
    g.addColorStop(1, 'rgba(100, 95, 90, 0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  // ============================================================
  // 2) SAHNE, MASİF MASA & DETAYLI BODRUM KATI ODASI
  // ============================================================
  function initScene() {
    const container = document.getElementById('scene3d');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060508);
    // Sis yoğunluğu düşürüldü: arka duvar, aplikler, borular ve rakip net biçimde seçilir
    scene.fog = new THREE.FogExp2(0x060509, 0.042);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    // Kamera açısı: hem masanın tamamını hem de karşıdaki rakibi ve bodrum odasını kadraja alır
    camera.position.set(0, 1.85, 3.38);
    camera.rotation.x = -0.37;

    fitFov();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.appendChild(renderer.domElement);

    // --- BODRUM KATI ODASI (GÖRÜNÜR MİMARİ, KEMERLER, APLİKLER, BORULAR, RAFLAR) ---
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      bumpMap: wallTex,
      bumpScale: 0.028,
      roughness: 0.88,
      metalness: 0.06
    });
    const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.46, metalness: 0.84 });
    const rustyIronMat = new THREE.MeshStandardMaterial({ color: 0x38261e, roughness: 0.62, metalness: 0.72 });
    const darkBeamMat = new THREE.MeshStandardMaterial({ color: 0x24160c, roughness: 0.84, metalness: 0.06 });
    const stoneArchMat = new THREE.MeshStandardMaterial({ color: 0x2b2528, bumpMap: wallTex, bumpScale: 0.02, roughness: 0.85, metalness: 0.08 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x9e7b36, roughness: 0.35, metalness: 0.85 });

    // Arka duvar (daha yakın ve aplik ışıklarını doğrudan alacak konumda)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
    backWall.position.set(0, 2.2, -3.75);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Yan duvarlar
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    leftWall.position.set(-4.6, 2.2, 0.2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMat);
    rightWall.position.set(4.6, 2.2, 0.2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Zemin
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), wallMat);
    floor.position.set(0, -1.18, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Arka duvarda taş payandalar (sütunlar) ve Rakibin arkasında demir parmaklıklı mahzen kemeri
    [-3.15, -1.35, 1.35, 3.15].forEach(px => {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.38, 5.2, 0.28), stoneArchMat);
      pilaster.position.set(px, 1.3, -3.62);
      pilaster.castShadow = true;
      pilaster.receiveShadow = true;
      scene.add(pilaster);
    });

    // Rakibin tam arkasında karanlık zindan hücresi / demir parmaklıklı niş
    const alcoveBack = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 3.4),
      new THREE.MeshBasicMaterial({ color: 0x050307 })
    );
    alcoveBack.position.set(0, 1.15, -3.72);
    scene.add(alcoveBack);

    const archHeader = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.36, 0.34), stoneArchMat);
    archHeader.position.set(0, 2.75, -3.58);
    scene.add(archHeader);

    // Zindan demir parmaklıkları (rakibin arkasında silüet olarak parlar)
    for (let i = -4; i <= 4; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.1, 8), darkIronMat);
      bar.position.set(i * 0.24, 1.15, -3.58);
      scene.add(bar);
    }
    [0.4, 1.35, 2.25].forEach(by => {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.045, 0.05), darkIronMat);
      hBar.position.set(0, by, -3.58);
      scene.add(hBar);
    });

    // Zindan nişinin içinden süzülen kızıl/kehribar derinlik ışığı (rakibin silüetini arka duvardan ayırır)
    const alcoveLight = new THREE.PointLight(0x9e2418, 1.5, 4.8, 1.6);
    alcoveLight.position.set(0, 1.55, -3.35);
    scene.add(alcoveLight);

    // --- DUVARDA İKİ ADET ENDÜSTRİYEL KAFESLİ BODRUM APLİĞİ (Odayı görünür kılan sıcak ışıklar) ---
    [-2.25, 2.25].forEach((sx, idx) => {
      const sconceGrp = new THREE.Group();
      sconceGrp.position.set(sx, 2.05, -3.56);

      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), darkIronMat);
      plate.rotation.x = Math.PI / 2;
      sconceGrp.add(plate);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), darkIronMat);
      arm.position.set(0, 0.02, 0.09);
      sconceGrp.add(arm);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.05, 12), rustyIronMat);
      cap.position.set(0, 0.02, 0.16);
      sconceGrp.add(cap);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffb855, fog: false })
      );
      bulb.position.set(0, -0.05, 0.16);
      sconceGrp.add(bulb);

      const cage = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.07, 0.16, 8, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x221a14, wireframe: true })
      );
      cage.position.set(0, -0.06, 0.16);
      sconceGrp.add(cage);

      scene.add(sconceGrp);

      const wLight = new THREE.PointLight(0xff8c3a, 1.75, 6.2, 1.6);
      wLight.position.set(sx, 1.95, -3.15);
      scene.add(wLight);
      wallLights.push({ light: wLight, bulb, phase: idx * 2.1 });
    });

    // Bodrum tavan kirişleri
    [-3.1, -1.6, -0.1, 1.4].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.24, 0.28), darkBeamMat);
      beam.position.set(0, 3.18, z);
      scene.add(beam);
    });

    // Arka duvarda kalın paslı buhar boruları + basınç manometresi + kırmızı vana
    const pipeH1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.2, 12), rustyIronMat);
    pipeH1.rotation.z = Math.PI / 2;
    pipeH1.position.set(0, 2.52, -3.56);
    scene.add(pipeH1);

    const pipeH2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 9.2, 12), darkIronMat);
    pipeH2.rotation.z = Math.PI / 2;
    pipeH2.position.set(0, 2.34, -3.58);
    scene.add(pipeH2);

    const pipeV = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 4.2, 12), rustyIronMat);
    pipeV.position.set(-2.72, 1.1, -3.55);
    scene.add(pipeV);

    // Kırmızı döküm vana tekerleği
    const valve = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.024, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x8f1d18, roughness: 0.45, metalness: 0.55 })
    );
    valve.position.set(-2.72, 1.52, -3.44);
    scene.add(valve);

    // Basınç manometresi (parlak kadran)
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 16), brassMat);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(-2.72, 1.84, -3.46);
    scene.add(gauge);
    const gaugeFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 16),
      new THREE.MeshBasicMaterial({ color: 0xd8ceb8 })
    );
    gaugeFace.position.set(-2.72, 1.84, -3.435);
    scene.add(gaugeFace);

    // Sol arkada iki katlı ahşap mahzen rafı, iksir şişeleri, kavanozlar ve meşe fıçı
    [1.42, 0.92].forEach((sy, rIdx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.055, 0.34), darkBeamMat);
      shelf.position.set(-2.05, sy, -3.52);
      scene.add(shelf);

      // Raf üstü renkli cam şişeler
      [-0.38, -0.14, 0.12, 0.35].forEach((ox, bIdx) => {
        if (rIdx === 1 && bIdx === 2) return;
        const bCol = (bIdx + rIdx) % 3 === 0 ? 0x7a161e : (bIdx % 2 === 0 ? 0x1b4d32 : 0x7d5618);
        const h = 0.19 + ((bIdx + rIdx) % 2) * 0.06;
        const btl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.048, h, 10),
          new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.2, metalness: 0.25, emissive: bCol, emissiveIntensity: 0.22 })
        );
        btl.position.set(-2.05 + ox, sy + 0.03 + h / 2, -3.50);
        scene.add(btl);
      });
    });

    // Sol köşede demir çemberli meşe fıçı
    const barrelGrp = new THREE.Group();
    barrelGrp.position.set(-2.45, -0.55, -3.15);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.95, 16), darkBeamMat);
    barrelGrp.add(barrel);
    [-0.28, 0, 0.28].forEach(hy => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.016, 8, 20), darkIronMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = hy;
      barrelGrp.add(hoop);
    });
    scene.add(barrelGrp);

    // Sağ arkada yüksek demir parmaklıklı bodrum penceresi ve içeri süzülen soğuk ay ışığı
    const winGroup = new THREE.Group();
    winGroup.position.set(2.32, 2.55, -3.68);
    const winBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.56),
      new THREE.MeshBasicMaterial({ color: 0x244266, fog: false })
    );
    winGroup.add(winBacking);
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.64, 0.08), darkIronMat);
    winFrame.position.z = -0.02;
    winGroup.add(winFrame);
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.60, 8), darkIronMat);
      bar.position.set(i * 0.20, 0, 0.02);
      winGroup.add(bar);
    }
    scene.add(winGroup);

    // Pencereden süzülen hacimsel ay ışığı huzmesi
    const beamGeo = new THREE.ConeGeometry(0.65, 2.6, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x4d88cc,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const moonBeam = new THREE.Mesh(beamGeo, beamMat);
    moonBeam.position.set(2.15, 1.65, -3.15);
    moonBeam.rotation.z = 0.32;
    moonBeam.rotation.x = 0.28;
    scene.add(moonBeam);

    const moonLight = new THREE.PointLight(0x4a80bd, 0.95, 5.2);
    moonLight.position.set(2.15, 2.35, -3.1);
    scene.add(moonLight);

    // Sağ duvarda eski demir şalter panosu + kırmızı sinyal lambası ve tavandan sarkan zincirler
    const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.14), darkIronMat);
    panelBox.position.set(2.25, 1.25, -3.58);
    scene.add(panelBox);
    const panelLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222, fog: false })
    );
    panelLed.position.set(2.16, 1.40, -3.50);
    scene.add(panelLed);

    // --- MASİF KÜTÜK MASA & DÖVME DEMİR U-AYAKLAR ---
    const woodTex = createWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      bumpMap: woodTex,
      bumpScale: 0.016,
      roughness: 0.62,
      metalness: 0.08
    });

    const tableGroup = new THREE.Group();
    tableMesh = new THREE.Mesh(new THREE.BoxGeometry(4.56, 0.28, 3.08), tableMat);
    tableMesh.position.set(0, 0.39, 0.2);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    tableGroup.add(tableMesh);

    // Yanlarda siyah dövme demir kuşak/köşebent plakaları ve perçin çivileri
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

    // --- SALLANAN ENDÜSTRİYEL TAVAN LAMBASI (Rakibin yüzünü kapatmayacak yükseklikte) ---
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 3.65, 0.25);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    ceilingWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4), wireMat);
    ceilingWire.position.y = -0.7;
    lampGroup.add(ceilingWire);

    const shadeGeo = new THREE.ConeGeometry(0.42, 0.30, 20, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2618,
      roughness: 0.48,
      metalness: 0.78,
      side: THREE.DoubleSide
    });
    lampMesh = new THREE.Mesh(shadeGeo, shadeMat);
    lampMesh.position.y = -1.42;
    lampGroup.add(lampMesh);

    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe8aa, fog: false });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), bulbMat);
    bulb.position.y = -1.48;
    lampGroup.add(bulb);

    scene.add(lampGroup);

    propsList.push({
      key: 'prop_lamp',
      mesh: lampMesh,
      onClick: function() {
        lampBoostVel += (Math.random() > 0.5 ? 1 : -1) * 0.22;
        playPropSfx('lamp');
        propReact('*Tavan lambası gıcırdayarak sallanıyor...*');
      }
    });

    // Ana masa spot ışığı (daha geniş açılı, hem masayı hem de rakibin önünü aydınlatır)
    spotLight = new THREE.SpotLight(0xffdf99, 4.4, 9.5, Math.PI / 2.6, 0.58, 1.15);
    spotLight.position.set(0, 2.15, 0.25);
    spotLight.target.position.set(0, 0.5, 0.0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.001;
    scene.add(spotLight);
    scene.add(spotLight.target);

    pointLight = new THREE.PointLight(0xffb84d, 1.9, 6.2, 1.8);
    pointLight.position.set(0, 2.1, 0.25);
    scene.add(pointLight);

    // Odayı ve masa çevresini yumuşatan genel ortam ışığı
    const hemiLight = new THREE.HemisphereLight(0x3a4963, 0x24160e, 0.52);
    scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0x2d3f52, 0.62);
    fillLight.position.set(0, 3.8, 5.5);
    scene.add(fillLight);

    // Oyuncunun elindeki joker kartlarını aydınlatan sıcak ön mum/masa yansıması
    const handLight = new THREE.PointLight(0xffcf88, 1.35, 3.4, 1.8);
    handLight.position.set(0, 1.25, 2.55);
    scene.add(handLight);

    // --- RAKİP KARAKTER ("Zarların Bekçisi") ---
    createOpponentSilhouette();

    // --- MASADAKİ TIKLANABİLİR ATMOSFERİK OBJELER ---
    createInteractiveTableProps();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);

    animate();
  }

  // ============================================================
  // 3) YÜKSEK DETAYLI TIKLANABİLİR MASA OBJELERİ
  //    (Gotik 3 Kollu Şamdan, Anatomik Kurukafa, Oymalı Kum Saati,
  //     Pirinç Resepsiyon Çanı, Kristal Küllük & Puro, Kadeh)
  // ============================================================
  function createInteractiveTableProps() {
    const TABLE_Y = 0.53;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xa68238, roughness: 0.32, metalness: 0.86 });
    const darkBrass = new THREE.MeshStandardMaterial({ color: 0x4a3718, roughness: 0.48, metalness: 0.78 });
    const wroughtIron = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.45, metalness: 0.82 });
    const boneTex = createBoneTexture(false);
    const boneMat = new THREE.MeshStandardMaterial({
      map: boneTex,
      bumpMap: boneTex,
      bumpScale: 0.012,
      roughness: 0.68,
      metalness: 0.05
    });

    // 1. GOTİK 3 KOLLU PİRİNÇ ŞAMDAN & KANLI MUMLAR (Sol arka köşe: tıkla = söndür / yak)
    const candleGrp = new THREE.Group();
    candleGrp.position.set(-1.86, TABLE_Y, -0.82);

    // Kademeli döküm kaide
    const cBase1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.028, 24), darkBrass);
    cBase1.position.y = 0.014;
    cBase1.castShadow = true;
    candleGrp.add(cBase1);

    const cBase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.035, 20), brassMat);
    cBase2.position.y = 0.042;
    candleGrp.add(cBase2);

    const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.034, 0.24, 16), brassMat);
    cStem.position.y = 0.16;
    candleGrp.add(cStem);

    const cNode = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 12), brassMat);
    cNode.scale.set(1, 0.65, 1);
    cNode.position.y = 0.16;
    candleGrp.add(cNode);

    // Yan kollar (S-kıvrımlı)
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 12), brassMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.y = 0.24;
    candleGrp.add(crossBar);

    const waxMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.78 });
    const dripMat = new THREE.MeshStandardMaterial({ color: 0x82121a, roughness: 0.45 });
    const coreFlameMat = new THREE.MeshBasicMaterial({ color: 0xfff3aa, fog: false });
    const haloFlameMat = new THREE.MeshBasicMaterial({ color: 0xff7711, transparent: true, opacity: 0.75, fog: false });

    candleFlames = [];
    [[-0.16, 0.25, 0.16], [0, 0.28, 0.22], [0.16, 0.25, 0.15]].forEach(([cx, cupY, wH], idx) => {
      // Mum tabağı
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.032, 0.026, 16), brassMat);
      cup.position.set(cx, cupY, 0);
      candleGrp.add(cup);

      // Mum gövdesi
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, wH, 16), waxMat);
      wax.position.set(cx, cupY + 0.01 + wH / 2, 0);
      wax.castShadow = true;
      candleGrp.add(wax);

      // Erimiş kırmızı mum akıntıları
      for (let d = 0; d < 3; d++) {
        const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 0.06 + d * 0.02, 8), dripMat);
        const a = d * 2.1 + idx;
        dr.position.set(cx + Math.cos(a) * 0.038, cupY + wH - 0.03 - d * 0.02, Math.sin(a) * 0.038);
        candleGrp.add(dr);
      }

      // Fitil
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.022, 6), wroughtIron);
      wick.position.set(cx, cupY + wH + 0.018, 0);
      candleGrp.add(wick);

      // Çift katmanlı alev (iç parlak çekirdek + dış turuncu hale)
      const flGrp = new THREE.Group();
      flGrp.position.set(cx, cupY + wH + 0.052, 0);
      const innerFl = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.065, 10), coreFlameMat);
      const outerFl = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.095, 10), haloFlameMat);
      outerFl.position.y = 0.006;
      flGrp.add(innerFl);
      flGrp.add(outerFl);
      candleGrp.add(flGrp);
      candleFlames.push(flGrp);
    });

    candleLight = new THREE.PointLight(0xff8828, 1.35, 3.2, 1.8);
    candleLight.position.set(-1.86, TABLE_Y + 0.56, -0.82);
    scene.add(candleLight);
    scene.add(candleGrp);

    propsList.push({
      key: 'prop_candle',
      mesh: candleGrp,
      onClick: function() {
        candleLit = !candleLit;
        candleFlames.forEach(f => { f.visible = candleLit; });
        candleLight.intensity = candleLit ? 1.35 : 0;
        playPropSfx(candleLit ? 'candle_on' : 'candle_off');
        propReact(candleLit ? 'Üç kollu şamdanın alevleri yeniden parladı...' : 'Şamdanı üfledin. Gölgeler masaya çöktü.');
      }
    });

    // 2. ANATOMİK MEMENTO MORI KURUKAFA TOTEMİ (Sol orta-arka: tıkla = çenesi takırdar, gözleri parlar)
    const skullGrp = new THREE.Group();
    skullGrp.position.set(-1.82, TABLE_Y, -0.22);
    skullGrp.rotation.y = 0.52;

    // Alt sekizgen kaide
    const skPed = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.032, 8), darkBrass);
    skPed.position.y = 0.016;
    skPed.castShadow = true;
    skullGrp.add(skPed);

    // Kafatası üst kubbesi (cranium)
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 18), boneMat);
    cranium.scale.set(0.92, 1.02, 1.16);
    cranium.position.set(0, 0.175, -0.01);
    cranium.castShadow = true;
    skullGrp.add(cranium);

    // Elmacık kemikleri (zygomatic arch) ve alın kemeri (brow ridge)
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.034, 0.075), boneMat);
    brow.position.set(0, 0.185, 0.095);
    brow.rotation.x = 0.15;
    skullGrp.add(brow);

    [-1, 1].forEach(s => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), boneMat);
      cheek.scale.set(0.9, 0.75, 1.1);
      cheek.position.set(s * 0.072, 0.125, 0.075);
      skullGrp.add(cheek);
    });

    // Üst çene (maxilla) ve üst diş dizisi
    const maxilla = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.055, 12), boneMat);
    maxilla.position.set(0, 0.10, 0.065);
    skullGrp.add(maxilla);

    // Derin göz çukurları + parlayan yakut/kor göz bebekleri
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x090406 });
    const skEyeMat = new THREE.MeshBasicMaterial({ color: 0x520910, fog: false });
    [-1, 1].forEach(s => {
      const sock = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), socketMat);
      sock.scale.set(1.05, 0.88, 0.65);
      sock.position.set(s * 0.046, 0.155, 0.108);
      skullGrp.add(sock);

      const se = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), skEyeMat.clone());
      se.position.set(s * 0.046, 0.155, 0.122);
      skullGrp.add(se);
      skullEyes.push(se);
    });

    // Üçgen burun boşluğu
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.042, 3), socketMat);
    nose.position.set(0, 0.132, 0.122);
    nose.rotation.x = 0.2;
    skullGrp.add(nose);

    // Hareketli alt çene (mandible) + tek tek dişler
    skullJaw = new THREE.Group();
    skullJaw.position.set(0, 0.062, 0.045);
    const jawBone = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.048, 0.044, 10), boneMat);
    jawBone.scale.set(1.1, 1, 1.25);
    jawBone.castShadow = true;
    skullJaw.add(jawBone);

    for (let t = -2; t <= 2; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.014), boneMat);
      tooth.position.set(t * 0.019, 0.024, 0.055 - Math.abs(t) * 0.006);
      skullJaw.add(tooth);
    }
    skullGrp.add(skullJaw);
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

    // 3. ANTİKA PİRİNÇ RESEPSİYON / KUMARHANE ÇANI (Sağ orta: tıkla = çınlar ve sallanır)
    const bellGrp = new THREE.Group();
    bellGrp.position.set(1.82, TABLE_Y, -0.05);

    const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.032, 24), wroughtIron);
    bellBase.position.y = 0.016;
    bellBase.castShadow = true;
    bellGrp.add(bellBase);

    const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.012, 10, 24), brassMat);
    bellRim.rotation.x = Math.PI / 2;
    bellRim.position.y = 0.032;
    bellGrp.add(bellRim);

    // Gerçek kavisli kubbe profili (LatheGeometry)
    const bellProf = [
      [0.132, 0.0],
      [0.125, 0.025],
      [0.105, 0.065],
      [0.072, 0.102],
      [0.032, 0.122],
      [0.0, 0.126]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    bellMesh = new THREE.Mesh(new THREE.LatheGeometry(bellProf, 28), brassMat);
    bellMesh.position.y = 0.032;
    bellMesh.castShadow = true;
    bellGrp.add(bellMesh);

    const bellStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.035, 12), brassMat);
    bellStem.position.y = 0.165;
    bellGrp.add(bellStem);

    const bellPin = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.018, 16), brassMat);
    bellPin.position.y = 0.185;
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

    // 4. OYMALI AHŞAP & PİRİNÇ SÜTUNLU KAN KUM SAATİ (Sağ arka: tıkla = 180 derece döner)
    hourglassGroup = new THREE.Group();
    hourglassGroup.position.set(1.76, TABLE_Y + 0.19, -0.74);

    // Alt ve üst altıgen ahşap/pirinç başlıklar
    [-1, 1].forEach(s => {
      const capWood = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.024, 6), darkBrass);
      capWood.position.y = s * 0.168;
      capWood.castShadow = true;
      hourglassGroup.add(capWood);

      const capRing = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 18), brassMat);
      capRing.position.y = s * 0.152;
      hourglassGroup.add(capRing);
    });

    // 3 adet torna işçilikli pirinç sütun
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + 0.3;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.32, 10), brassMat);
      col.position.set(Math.cos(ang) * 0.098, 0, Math.sin(ang) * 0.098);
      hourglassGroup.add(col);
    }

    // Kavisli cam hazneler + içindeki kızıl kum yığınları
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xd8e8f0,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.38
    });
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xa81822,
      roughness: 0.75,
      emissive: 0x3a0508,
      emissiveIntensity: 0.35
    });

    const bulbProf = [
      [0.014, 0.0],
      [0.048, 0.035],
      [0.078, 0.085],
      [0.072, 0.135],
      [0.0, 0.145]
    ].map(p => new THREE.Vector2(p[0], p[1]));

    const bulbTop = new THREE.Mesh(new THREE.LatheGeometry(bulbProf, 20), glassMat);
    hourglassGroup.add(bulbTop);
    const bulbBot = new THREE.Mesh(new THREE.LatheGeometry(bulbProf, 20), glassMat);
    bulbBot.rotation.x = Math.PI;
    hourglassGroup.add(bulbBot);

    const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.095, 16), sandMat);
    sandBot.position.y = -0.095;
    hourglassGroup.add(sandBot);

    const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.075, 16), sandMat);
    sandTop.rotation.x = Math.PI;
    sandTop.position.y = 0.06;
    hourglassGroup.add(sandTop);

    const sandStream = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), sandMat);
    sandStream.position.y = -0.04;
    hourglassGroup.add(sandStream);

    // Orta pirinç boğum bileziği
    const midCollar = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 16), brassMat);
    midCollar.rotation.x = Math.PI / 2;
    hourglassGroup.add(midCollar);

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

    // 5. İŞLEMELİ PİRİNÇ KÜLLÜK & TÜTEN PURO (Sağ orta-ön, skor levhasından ayrı konumda)
    const ashGrp = new THREE.Group();
    ashGrp.position.set(1.88, TABLE_Y, 0.48);

    // Çukur küllük gövdesi (dış çember + koyu kül tabanı + 4 çentik)
    const trayOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.135, 0.042, 24), darkBrass);
    trayOuter.position.y = 0.021;
    trayOuter.castShadow = true;
    ashGrp.add(trayOuter);

    const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.016, 10, 24), brassMat);
    trayRim.rotation.x = Math.PI / 2;
    trayRim.position.y = 0.042;
    ashGrp.add(trayRim);

    const ashBed = new THREE.Mesh(
      new THREE.CircleGeometry(0.125, 20),
      new THREE.MeshStandardMaterial({ color: 0x222022, roughness: 0.95 })
    );
    ashBed.rotation.x = -Math.PI / 2;
    ashBed.position.y = 0.036;
    ashGrp.add(ashBed);

    // Sarılı puro + altın yüzük bandı + gri kül ucu + parlayan kor
    const cigarGrp = new THREE.Group();
    cigarGrp.position.set(-0.02, 0.054, 0.01);
    cigarGrp.rotation.y = 0.45;
    cigarGrp.rotation.z = 0.12;

    const cigarBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.022, 0.22, 14),
      new THREE.MeshStandardMaterial({ color: 0x522c14, roughness: 0.78 })
    );
    cigarBody.rotation.z = Math.PI / 2;
    cigarBody.castShadow = true;
    cigarGrp.add(cigarBody);

    const cigarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0228, 0.0228, 0.032, 14),
      new THREE.MeshStandardMaterial({ color: 0xc99e38, roughness: 0.3, metalness: 0.8 })
    );
    cigarBand.rotation.z = Math.PI / 2;
    cigarBand.position.x = 0.045;
    cigarGrp.add(cigarBand);

    const ashTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.020, 0.021, 0.035, 12),
      new THREE.MeshStandardMaterial({ color: 0x8c8884, roughness: 0.92 })
    );
    ashTip.rotation.z = Math.PI / 2;
    ashTip.position.x = -0.115;
    cigarGrp.add(ashTip);

    cigarEmber = new THREE.Mesh(
      new THREE.SphereGeometry(0.020, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff4814, fog: false })
    );
    cigarEmber.position.x = -0.132;
    cigarGrp.add(cigarEmber);

    ashGrp.add(cigarGrp);
    scene.add(ashGrp);

    // Yumuşak duman bulutu partikülleri (Sprite)
    const smokeTex = createSmokeTexture();
    for (let i = 0; i < 7; i++) {
      const smMat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: 0xc8c2b8,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      });
      const sm = new THREE.Sprite(smMat);
      sm.position.set(1.76, TABLE_Y + 0.10 + i * 0.08, 0.44);
      sm.scale.setScalar(0.12);
      scene.add(sm);
      smokeParticles.push({ mesh: sm, phase: i * 0.95, boost: 0 });
    }

    propsList.push({
      key: 'prop_cigar',
      mesh: ashGrp,
      onClick: function() {
        if (cigarEmber) {
          cigarEmber.scale.setScalar(1.65);
          setTimeout(() => cigarEmber && cigarEmber.scale.setScalar(1.0), 450);
        }
        smokeParticles.forEach(p => { p.boost = 1.0; });
        playPropSfx('cigar');
        propReact('*Küllükteki puronun koru parladı, acı bir duman yükseldi.*');
      }
    });

    // 6. İŞLEMELİ KIZIL İKSİR KADEHİ (Sol orta: tıkla = kadeh sallanır ve çınlar)
    gobletGroup = new THREE.Group();
    gobletGroup.position.set(-1.84, TABLE_Y, 0.26);

    const gProf = [
      [0.095, 0.0],
      [0.085, 0.018],
      [0.024, 0.045],
      [0.020, 0.115],
      [0.036, 0.132],
      [0.022, 0.148],
      [0.088, 0.195],
      [0.105, 0.265],
      [0.098, 0.265],
      [0.078, 0.195],
      [0.0, 0.165]
    ].map(p => new THREE.Vector2(p[0], p[1]));

    const gMesh = new THREE.Mesh(new THREE.LatheGeometry(gProf, 24), brassMat);
    gMesh.castShadow = true;
    gobletGroup.add(gMesh);

    // Kadeh üzerinde yakut taşlar
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x990f1b, roughness: 0.2, emissive: 0x3a0408 })
      );
      gem.position.set(Math.cos(a) * 0.094, 0.22, Math.sin(a) * 0.094);
      gobletGroup.add(gem);
    }

    const wine = new THREE.Mesh(
      new THREE.CircleGeometry(0.092, 20),
      new THREE.MeshStandardMaterial({ color: 0x6e0812, roughness: 0.12, metalness: 0.35 })
    );
    wine.rotation.x = -Math.PI / 2;
    wine.position.y = 0.248;
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
    // Duvar apliklerinin hafif titremesi
    wallLights.forEach(w => {
      const fl = 1.0 + Math.sin(time * 11 + w.phase) * 0.06 + Math.cos(time * 23 + w.phase) * 0.04;
      w.light.intensity = 1.75 * fl;
    });

    // 1. Şamdan mum alevleri titremesi
    if (candleLit && candleLight) {
      const f = 1.0 + Math.sin(time * 17) * 0.10 + Math.cos(time * 29) * 0.07;
      candleFlames.forEach((fl, i) => {
        const fi = 1.0 + Math.sin(time * 19 + i * 1.7) * 0.14;
        fl.scale.set(1, fi, 1);
        fl.rotation.z = Math.sin(time * 8 + i) * 0.09;
      });
      candleLight.intensity = 1.35 * f;
    }

    // 2. Kurukafa çene ve göz parlaması
    if (skullJaw) {
      skullJawOpen = Math.max(0, skullJawOpen - dt * 2.2);
      const ch = skullJawOpen > 0 ? Math.abs(Math.sin(time * 28)) * 0.045 * skullJawOpen : 0;
      skullJaw.position.y = 0.062 - ch;
      skullJaw.rotation.x = ch * 4.5;
      skullEyes.forEach(e => {
        e.material.color.setHex(skullJawOpen > 0.05 ? 0xff2a38 : 0x520910);
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

    // 5. Puro dumanı (yumuşak genişleyen duman bulutu)
    smokeParticles.forEach((sp, i) => {
      sp.boost = Math.max(0, sp.boost - dt * 0.6);
      const u = (time * (0.28 + sp.boost * 0.35) + sp.phase) % 1.0;
      sp.mesh.position.y = 0.62 + u * 0.72;
      sp.mesh.position.x = 1.76 + Math.sin(time * 1.6 + i) * 0.07 * u;
      sp.mesh.scale.setScalar(0.10 + u * (0.26 + sp.boost * 0.16));
      sp.mesh.material.opacity = Math.sin(u * Math.PI) * (0.22 + sp.boost * 0.25);
    });

    // 6. Kadeh salınımı
    if (gobletGroup) {
      gobletTilt *= Math.max(0, 1 - dt * 4);
      gobletGroup.rotation.z = Math.sin(time * 18) * gobletTilt;
    }
  }

  // ============================================================
  // 4) RAKİP KARAKTER: "ZARLARIN BEKÇİSİ" (Inscryption / Buckshot Dealer)
  //    Oymalı porselen/kemik maske, hipnotik kızıl göz halkaları,
  //    yüksek yakalı kadife/deri pelerin, omuz zırhları, madalyon ve
  //    masanın kenarına dayanan eklemli kemik/eldivenli eller.
  // ============================================================
  function limb(a, b, r1, r2, mat) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 12), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true;
    return m;
  }

  function createArticulatedHand(side, boneMat, darkCloth, brassMat, fingers) {
    const h = new THREE.Group();

    // Bilek manşeti ve pirinç düğme
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.11, 12), darkCloth);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0.02, -0.08);
    h.add(cuff);

    const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.008, 8, 16), brassMat);
    cuffRing.position.set(0, 0.02, -0.03);
    h.add(cuffRing);

    // Tarak kemiği / el sırtı
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.034, 0.135), boneMat);
    palm.scale.set(1, 0.85, 1.08);
    palm.castShadow = true;
    h.add(palm);

    // 4 eklemli kemik parmak + pençe uçları + yüzük
    const fLens = [0.072, 0.086, 0.080, 0.064];
    for (let i = 0; i < 4; i++) {
      const piv = new THREE.Group();
      const spread = (i - 1.5) * 0.032;
      piv.position.set(spread, 0.002, 0.064);
      piv.rotation.y = (i - 1.5) * -0.06;

      // Boğum eklemi
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), boneMat);
      piv.add(knuckle);

      const len1 = fLens[i];
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0115, len1, 8), boneMat);
      f1.rotation.x = Math.PI / 2;
      f1.position.z = len1 / 2;
      f1.castShadow = true;
      piv.add(f1);

      // Yüzük parmağında altın mühür yüzüğü
      if (i === 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0125, 0.0035, 8, 12), brassMat);
        ring.position.z = len1 * 0.45;
        piv.add(ring);
      }

      const piv2 = new THREE.Group();
      piv2.position.z = len1;
      const len2 = len1 * 0.78;
      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0095, len2, 8), boneMat);
      f2.rotation.x = Math.PI / 2;
      f2.position.z = len2 / 2;
      f2.castShadow = true;
      piv2.add(f2);

      // Sivri koyu pençe/tırnak ucu
      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.0065, 0.026, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.4 })
      );
      claw.rotation.x = Math.PI / 2 + 0.15;
      claw.position.z = len2 + 0.01;
      piv2.add(claw);

      piv.add(piv2);
      h.add(piv);
      fingers.push({ piv, piv2, ph: i * 0.85 + (side > 0 ? 0.5 : 0) });
    }

    // Başparmak
    const thGrp = new THREE.Group();
    thGrp.position.set(side * 0.072, -0.004, 0.018);
    thGrp.rotation.y = side * 0.58;
    const th1 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.012, 0.068, 8), boneMat);
    th1.rotation.x = Math.PI / 2;
    th1.position.z = 0.034;
    thGrp.add(th1);
    h.add(thGrp);

    return h;
  }

  function createOpponentSilhouette() {
    const g = new THREE.Group();
    // Masanın hemen arkasında, kameranın tam karşısında ve boydan boya kadrajda
    g.position.set(0, 0.55, -1.52);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x16111a, roughness: 0.82, metalness: 0.12 });
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x261219, roughness: 0.75, metalness: 0.15 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1e1510, roughness: 0.62, metalness: 0.22 });
    const maskTex = createBoneTexture(true);
    const maskMat = new THREE.MeshStandardMaterial({
      map: maskTex,
      bumpMap: maskTex,
      bumpScale: 0.018,
      roughness: 0.52,
      metalness: 0.12,
      emissive: 0x1c140c,
      emissiveIntensity: 0.25
    });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.32, metalness: 0.86 });

    // 1. GÖVDE, OMUZ ZIRHLARI, YÜKSEK YAKA VE GÖĞÜS MADALYONU
    const torsoProf = [
      [0.0, -0.55],
      [0.68, -0.55],
      [0.62, -0.15],
      [0.54, 0.22],
      [0.46, 0.52],
      [0.32, 0.68],
      [0.0, 0.72]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const body = new THREE.Mesh(new THREE.LatheGeometry(torsoProf, 24), coatMat);
    body.castShadow = true;
    g.add(body);

    // Çapraz kadife/altın işlemeli pelerin yakaları (lapels)
    [-1, 1].forEach(s => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.06), velvetMat);
      lapel.position.set(s * 0.14, 0.36, 0.42);
      lapel.rotation.z = s * 0.22;
      lapel.rotation.x = -0.22;
      g.add(lapel);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.56, 0.065), brass);
      trim.position.set(s * 0.06, 0.36, 0.43);
      trim.rotation.z = s * 0.22;
      trim.rotation.x = -0.22;
      g.add(trim);

      // Katmanlı omuz zırhları (pauldrons) + pirinç perçinler
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), leatherMat);
      sh.scale.set(1.22, 0.68, 0.96);
      sh.position.set(s * 0.48, 0.54, 0.04);
      sh.rotation.z = -s * 0.25;
      sh.castShadow = true;
      g.add(sh);

      const shRim = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.015, 8, 20), brass);
      shRim.rotation.y = Math.PI / 2;
      shRim.position.set(s * 0.36, 0.55, 0.04);
      g.add(shRim);
    });

    // Yüksek gotik dik yaka
    const highCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.26, 0.22, 20, 1, true, -Math.PI * 0.72, Math.PI * 1.44),
      velvetMat
    );
    highCollar.material.side = THREE.DoubleSide;
    highCollar.position.set(0, 0.72, -0.02);
    g.add(highCollar);

    // Göğüste zincirli parlayan ruh madalyonu
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.010, 8, 24), brass);
    chain.rotation.x = 1.15;
    chain.position.set(0, 0.54, 0.32);
    g.add(chain);

    const amuletFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 8), brass);
    amuletFrame.rotation.x = Math.PI / 2 - 0.2;
    amuletFrame.position.set(0, 0.42, 0.48);
    g.add(amuletFrame);

    const amuletGem = new THREE.Mesh(
      new THREE.SphereGeometry(0.046, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xd92638, fog: false })
    );
    amuletGem.scale.set(1, 1, 0.45);
    amuletGem.position.set(0, 0.42, 0.495);
    g.add(amuletGem);

    // 2. BAŞ, OYMA KEMİK MASKE, HİPNOTİK GÖZLER, BOYNUZLAR VE ŞAPKA/KUKULETA
    const head = new THREE.Group();
    head.position.set(0, 0.88, 0.08);

    // Kukuleta dış örtüsü
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), coatMat);
    hood.scale.set(1.04, 1.12, 1.12);
    hood.position.set(0, 0.06, -0.04);
    hood.castShadow = true;
    head.add(hood);

    // İç karanlık boşluk
    const voidM = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 14),
      new THREE.MeshBasicMaterial({ color: 0x030204 })
    );
    voidM.scale.set(0.95, 1.05, 0.75);
    voidM.position.set(0, 0.04, 0.12);
    head.add(voidM);

    // Heykelsi Kemik/Porselen Maske (Elmacık kemikleri, alın, burun kemeri, çene)
    const maskFace = new THREE.Mesh(new THREE.SphereGeometry(0.205, 22, 18), maskMat);
    maskFace.scale.set(0.86, 1.08, 0.68);
    maskFace.position.set(0, 0.05, 0.16);
    maskFace.castShadow = true;
    head.add(maskFace);

    // Keskin kaş kemerleri (scowling brow ridges)
    [-1, 1].forEach(s => {
      const browBar = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.026, 0.06), maskMat);
      browBar.position.set(s * 0.068, 0.118, 0.275);
      browBar.rotation.z = -s * 0.26;
      browBar.rotation.y = s * 0.22;
      head.add(browBar);

      const cheekBone = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), maskMat);
      cheekBone.scale.set(1.1, 0.68, 0.85);
      cheekBone.position.set(s * 0.095, 0.015, 0.255);
      head.add(cheekBone);
    });

    // Kemerli burun sırtı
    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.13, 4), maskMat);
    noseBridge.position.set(0, 0.045, 0.295);
    noseBridge.rotation.x = 0.28;
    noseBridge.rotation.y = Math.PI / 4;
    head.add(noseBridge);

    // Maske alnında altın üçüncü göz / mühür kabartması
    const foreheadSigil = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.038, 6), brass);
    foreheadSigil.position.set(0, 0.168, 0.278);
    foreheadSigil.rotation.x = -0.18;
    head.add(foreheadSigil);

    // Derin göz çukurları + çift halkalı hipnotik parlayan gözler (Inscryption Leshy tarzı)
    const eyeSocketMat = new THREE.MeshBasicMaterial({ color: 0x050204 });
    const eyeRingMat = new THREE.MeshBasicMaterial({ color: 0xff2838, fog: false });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffdf88, fog: false });
    const eyes = [];
    [-1, 1].forEach(s => {
      const sock = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), eyeSocketMat);
      sock.position.set(s * 0.074, 0.078, 0.282);
      sock.rotation.y = s * 0.18;
      head.add(sock);

      const eyeGrp = new THREE.Group();
      eyeGrp.position.set(s * 0.074, 0.078, 0.288);
      eyeGrp.rotation.y = s * 0.18;

      const irisRing = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055, 8, 20), eyeRingMat);
      eyeGrp.add(irisRing);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), pupilMat);
      eyeGrp.add(pupil);

      head.add(eyeGrp);
      eyes.push(eyeGrp);
    });

    // Oymalı alt çene ve metalik diş ızgarası
    const jawPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.068, 0.10, 8), maskMat);
    jawPlate.scale.set(1.0, 1.0, 0.78);
    jawPlate.position.set(0, -0.075, 0.22);
    head.add(jawPlate);

    for (let i = -3; i <= 3; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.018), brass);
      const u = i / 3;
      t.position.set(u * 0.078, -0.065 + u * u * 0.012, 0.278 - u * u * 0.025);
      head.add(t);
    }

    // Geniş kenarlı gotik okült tüccar şapkası + pirinç tokalı şerit
    const hatGrp = new THREE.Group();
    hatGrp.position.set(0, 0.22, -0.02);
    hatGrp.rotation.x = -0.10;

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.022, 28), leatherMat);
    brim.scale.set(1.05, 1, 0.92);
    brim.castShadow = true;
    hatGrp.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.26, 0.26, 20), leatherMat);
    crown.position.y = 0.13;
    crown.castShadow = true;
    hatGrp.add(crown);

    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.252, 0.262, 0.042, 20), velvetMat);
    hatBand.position.y = 0.03;
    hatGrp.add(hatBand);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, 0.02), brass);
    buckle.position.set(0, 0.032, 0.258);
    hatGrp.add(buckle);

    head.add(hatGrp);
    g.add(head);

    // 3. KOLLAR VE MASAYA DAYANAN EKLEMLİ KEMİK ELLER
    const fingers = [], hands = [];
    [-1, 1].forEach(s => {
      const shPos = new THREE.Vector3(s * 0.46, 0.48, 0.06);
      const elbowPos = new THREE.Vector3(s * 0.62, 0.08, 0.22);
      const wristPos = new THREE.Vector3(s * 0.48, -0.01, 0.44);

      g.add(limb(shPos, elbowPos, 0.095, 0.082, coatMat));
      g.add(limb(elbowPos, wristPos, 0.080, 0.068, coatMat));

      const hnd = createArticulatedHand(s, maskMat, velvetMat, brass, fingers);
      hnd.position.set(s * 0.48, -0.005, 0.50);
      hnd.rotation.y = -s * 0.18;
      g.add(hnd);
      hands.push(hnd);
    });

    // Rakibin maskesini ve omuzlarını belirginleştiren özel karakter ışıkları
    const faceKeyLight = new THREE.PointLight(0xffbb77, 1.15, 2.6, 1.8);
    faceKeyLight.position.set(0, 1.05, 0.78);
    g.add(faceKeyLight);

    const eyeLight = new THREE.PointLight(0xff2838, 0.95, 1.8);
    eyeLight.position.set(0, 0.96, 0.52);
    g.add(eyeLight);

    g.userData = {
      head,
      eyes,
      eyeRingMat,
      eyeLight,
      amuletGem,
      fingers,
      hands,
      lean: 0,
      blink: 0,
      nextBlink: 3
    };
    opponentMesh = g;
    scene.add(g);
  }

  function animateOpponent(time, dt) {
    if (!opponentMesh) return;
    const o = opponentMesh.userData;
    const turnOp = !!(arrowItem && arrowItem.mode === 'op');
    o.lean += ((turnOp ? 1 : 0) - o.lean) * Math.min(1, dt * 3);

    // Baş hareketi: oyuncuyu ve fareyi sinsi biçimde takip eder, sırası gelince öne eğilir
    o.head.rotation.x = 0.04 * Math.sin(time * 1.2) + o.lean * 0.16;
    o.head.rotation.y = mouse.x * 0.28 + Math.sin(time * 0.7) * 0.04;
    o.head.rotation.z = Math.sin(time * 0.9) * 0.025;
    o.head.position.z = 0.08 + o.lean * 0.14;

    if (time > o.nextBlink) {
      o.blink = time;
      o.nextBlink = time + 2.8 + Math.random() * 3.8;
    }
    const bl = time - o.blink;
    const sy = bl < 0.14 ? 0.12 : 1;
    o.eyes.forEach(e => {
      e.scale.y = sy;
      e.rotation.z = time * 0.8;
    });
    o.eyeRingMat.color.setHex(turnOp ? 0xff4830 : 0xd91828);
    o.eyeLight.intensity = 0.85 + o.lean * 1.15 + 0.15 * Math.sin(time * 5);
    if (o.amuletGem) {
      o.amuletGem.scale.setScalar(0.95 + 0.12 * Math.sin(time * 3.5));
    }

    // Parmakların masada sabırsızca tempo tutması
    o.fingers.forEach(f => {
      const tap = Math.max(0, Math.sin(time * (turnOp ? 6.5 : 3.2) + f.ph));
      f.piv.rotation.x = 0.12 - tap * (turnOp ? 0.34 : 0.14);
      f.piv2.rotation.x = 0.28 + tap * 0.25;
    });
  }

  function onMouseMove(e) {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function fitFov() {
    const a = window.innerWidth / window.innerHeight;
    camera.aspect = a;
    camera.fov = Math.min(96, Math.max(50, 2 * Math.atan(Math.tan(0.68) / a) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================================================
  // 5) MASA NESNELERİ, DİEGETİK SKOR SAYAÇLARI & DÜELLO KAFATASI RAF SİSTEMİ
  // ============================================================
  const CARD_W = 0.44, CARD_H = 0.64, CARD_T = 0.006, TABLE_Y = 0.53;
  const DECK_POS = new THREE.Vector3(-1.55, TABLE_Y, 0.52);
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

    x.fillStyle = bg || '#1b1410';
    x.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 1800; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.16)' : 'rgba(255,220,170,0.05)';
      x.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    const g = x.createRadialGradient(256, 240, 30, 256, 256, 250);
    g.addColorStop(0, 'rgba(255, 220, 160, 0.16)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.25)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
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

  // Konsepte uygun sekizgen/perçinli ağır madalyon plaka
  function createPlate(radius, height, text, bg, fg, rimColor) {
    const g = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: rimColor || 0x241911,
      roughness: 0.42,
      metalness: 0.82
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
      new THREE.MeshStandardMaterial({ color: 0x9c7834, roughness: 0.34, metalness: 0.88 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.y = height / 2;
    g.add(bezel);

    const topMat = new THREE.MeshStandardMaterial({
      map: labelTexture(text, bg, fg),
      roughness: 0.48,
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
    const rows = [[1, -0.52], [0, 1.08]];
    rows.forEach(([p, z]) => {
      const pl = S.pl[p];
      const list = pl.open.map(c => ({ c, closed: false })).concat(pl.closed.map(c => ({ c, closed: true })));
      const a = pl.open.length, b = pl.closed.length, n = list.length;
      const gap = (a > 0 && b > 0) ? 0.32 : 0;
      const sp = Math.min(0.48, 3.4 / Math.max(n + gap, 1));
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
      const sp = Math.min(0.48, 3.2 / Math.max(n, 1));
      hand.forEach((id, i) => {
        cnt[id] = (cnt[id] || 0) + 1;
        const key = 'h' + id + '_' + cnt[id];
        const mid = i - (n - 1) / 2;
        const it = ensureItem(key, 'hand', () => createCard(jokerSrc(id), jokerSrc(id)), DECK_POS);
        it.dom = '#hand img[data-j="' + id + '"]';
        const el = document.querySelector(it.dom);
        it.dim = !!(el && el.classList.contains('dim'));
        placeItem(it, mid * sp, TABLE_Y + 0.16, 1.98 + Math.abs(mid) * 0.04, 0.58, -mid * 0.06, 0, 0.88);
      });
    }

    // 3) RAKİBİN JOKER ELİ (kapalı, masanın sağ-üst köşesinde düzenli dizili)
    (S.hand[1] || []).forEach((_, i) => {
      const it = ensureItem('oh' + i, 'static', () => createCard(IMG.bj, IMG.bj), DECK_POS);
      placeItem(it, 0.92 + i * 0.15, TABLE_Y + 0.003 * i, -0.98, 0, 0.10 * (i % 2 ? 1 : -1), Math.PI, 0.50);
    });

    // 4) OYNANMIŞ ANLIK/KALICI JOKER ETKİLERİ (ortada, iki yanda)
    const sideCnt = { 0: 0, 1: 0 };
    (S.pj || []).forEach(x => {
      const e = S.eff.find(y => y.uid == x.uid) || x;
      const side = x.o == 1 ? 1 : 0;
      const i = sideCnt[side]++;
      const it = ensureItem('e' + x.uid, 'chip', () => createCard(jokerSrc(e.id), jokerSrc(e.id)), side ? new V3(0.92, TABLE_Y, -0.98) : new V3(0, TABLE_Y + 0.2, 1.98));
      it.dom = '[data-e="' + x.uid + '"]';
      it.hl = kind === 'eff' && cn.includes(e.uid);
      it.mod = !!e.neg;
      const sx = side ? -1 : 1;
      placeItem(it, sx * (0.76 + i * 0.30), TABLE_Y + (it.hl ? 0.07 : 0), 0.22 + (side ? -0.1 : 0.1), 0, sx * 0.05, 0, 0.58);
    });

    // 5) DESTE (tıkla = kart çek; üstünde zarif pirinç köşe çerçevesi)
    const dc = Math.min((S.deck || []).length, 11);
    for (let i = 0; i < 12; i++) {
      const key = 'd' + i;
      if (i < dc) {
        const it = ensureItem(key, 'deck', () => createCard(backSrc(), backSrc()));
        it.dom = '#draw';
        placeItem(it, DECK_POS.x, TABLE_Y + i * 0.007, DECK_POS.z, 0, 0.04 * i, Math.PI, 1);
      } else if (items.has(key)) {
        items.get(key).seen = false;
      }
    }

    // 6) HEDEF KAN MÜHÜRÜ (masanın ortasında koyu kızıl/antik altın gotik mühür)
    const T = tg(S), low = lowW(S);
    const label = low ? 'EN AZ' : String(T);
    const alt = (T != 21 || low);
    const skey = label + '|' + alt;
    const sealBg = alt ? '#2e200d' : '#420910';
    const sealFg = alt ? '#f5d58c' : '#f0d8b0';
    if (!sealItem) {
      const g = createPlate(0.36, 0.046, label, sealBg, sealFg, 0x26120c);
      g.position.set(0, TABLE_Y + 0.026, 0.22);
      g.userData.item = { kind: 'static', dying: false };
      scene.add(g);
      sealItem = { mesh: g, key: skey, pulse: -9 };
    } else if (sealItem.key !== skey) {
      setPlateText(sealItem.mesh, label, sealBg, sealFg);
      sealItem.key = skey; sealItem.pulse = clock.getElapsedTime();
    }

    // 7) SIRA OKU (antik altın/kızıl hançer ucu)
    if (!arrowItem) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.21, 4),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x5c4210, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.7 }));
      m.castShadow = true;
      scene.add(m);
      arrowItem = { mesh: m, mode: 'off' };
    }
    arrowItem.mode = (S.wait || S.over) ? 'off' : (S.turn === 0 ? 'me' : 'op');

    // 8) PAS / TURU BİTİR (sağ tarafta ağır pirinç/kan mührü butonu)
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
    placeItem(pit, 1.32, TABLE_Y + 0.048, 0.68, 0, 0, 0, 1);

    // 9) DERİ CİLTLİ KARA KİTAP / GRİMOİRE ("MENÜ" - sol ön köşede çok parçalı detaylı kitap)
    const bit = ensureItem('book', 'book', () => createGrimoireBook());
    bit.dom = '[data-g]';
    placeItem(bit, -1.55, TABLE_Y + 0.038, 1.16, 0, 0.28, 0, 1);

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

    // 11) DİEGETİK SKOR KADRANLARI (Kompakt pirinç çerçeveli masa sayaçları)
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
    placeItem(stMe, 1.32, TABLE_Y + 0.024, 1.22, 0, -0.20, 0, 1);

    const opName = (typeof MODE !== 'undefined' && MODE === 'bot' && typeof oppName === 'function') ? oppName().toLocaleUpperCase('tr') : 'RAKİP';
    const opScoreStr = S.rev ? String(total(S, 1, true)) : (opTot + ' + ?');
    const opTxt = opName + '\nSKOR: ' + opScoreStr;
    const stOp = ensureItem('slab_op', 'static', () => createSlate(0.72, 0.042, 0.32, opTxt, '#1f1214', '#ebd0a4'));
    if (stOp.label !== opTxt) {
      setSlateText(stOp.mesh, opTxt, '#1f1214', '#ebd0a4');
      stOp.label = opTxt;
    }
    placeItem(stOp, -1.24, TABLE_Y + 0.024, -0.52, 0, 0.18, 0, 1);

    // 12) DÜELLO SKORU & ÖLÜM EŞİĞİ ÇETELESİ (3 boyutlu parlayan tur taşlarıyla birlikte)
    const res = S.res || [];
    const dcVal = (typeof TH !== 'undefined') ? TH[Math.min(S.bo, 3)] : 4;
    const pipsKey = [0, 1, 2].map(i => res[i] == null ? (i == S.rounds ? 'N' : 'E') : res[i] > 0 ? 'W' : res[i] < 0 ? 'L' : 'D').join('');
    const duelTxt = 'DÜELLO ' + (S.bo + 1) + '  ·  EŞİK ' + dcVal + '+';
    const stDu = ensureItem('slab_duel', 'static', () => createDuelCounterBoard(duelTxt));
    if (stDu.label !== duelTxt + pipsKey) {
      updateDuelCounterBoard(stDu.mesh, duelTxt, res, S.rounds);
      stDu.label = duelTxt + pipsKey;
    }
    placeItem(stDu, -0.58, TABLE_Y + 0.024, -0.98, 0, 0.06, 0, 1);

    items.forEach(it => {
      if (!it.seen && it.key !== 'pass' && it.key !== 'book' && !/^m_/.test(it.key) && !/^slab_/.test(it.key)) it.dying = true;
    });
  }

  // Pirinç köşe perçinli, kabartma çerçeveli diegetik masa üstü kadran/levha
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

    // Köşe perçinleri
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
    const brassFrameMat = new THREE.MeshStandardMaterial({ color: 0x6e5222, roughness: 0.38, metalness: 0.82 });
    const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.65, metalness: 0.45 });
    const topMat = new THREE.MeshStandardMaterial({ map: slateTexture(text, bg, fg), roughness: 0.46, metalness: 0.25 });

    // Alt abanoz/demir kaide
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, h * 0.65, d * 1.06), darkBaseMat);
    base.position.y = -h * 0.18;
    base.castShadow = true; base.receiveShadow = true;
    grp.add(base);

    // Üst pirinç çerçeveli kadran
    const topBox = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.7, d),
      [brassFrameMat, brassFrameMat, topMat, brassFrameMat, brassFrameMat, brassFrameMat]
    );
    topBox.position.y = h * 0.16;
    topBox.castShadow = true; topBox.receiveShadow = true;
    grp.add(topBox);

    // 4 köşede 3B pirinç perçin babaları
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

  // 3B Fiziksel Tur Taşlı Düello & Ölüm Eşiği Sayacı
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

  // Çok parçalı deri ciltli, altın köşebentli ve sayfa bloklu Kara Kitap (MENÜ)
  function createGrimoireBook() {
    const grp = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x2e160d, roughness: 0.76, metalness: 0.12 });
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xcab892, roughness: 0.85, metalness: 0.02 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xa68238, roughness: 0.35, metalness: 0.86 });
    const topCoverMat = new THREE.MeshStandardMaterial({ map: bookTexture(), roughness: 0.65, metalness: 0.18 });

    // Alt kapak
    const botCover = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.014, 0.36), leatherMat);
    botCover.position.y = -0.028;
    botCover.castShadow = true; botCover.receiveShadow = true;
    grp.add(botCover);

    // Sayfa bloğu (kapaklardan hafif içeride)
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.048, 0.335), pagesMat);
    pages.position.set(0.01, 0.0, 0);
    grp.add(pages);

    // Sırt (spine) ve kabartma boğumları
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.36, 12), leatherMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.set(-0.23, 0, 0);
    grp.add(spine);

    [-0.12, -0.04, 0.04, 0.12].forEach(sz => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.006, 8, 14), brassMat);
      rib.position.set(-0.23, 0, sz);
      grp.add(rib);
    });

    // Üst kapak
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

    // Okült çember süslemesi
    x.strokeStyle = 'rgba(190, 145, 65, 0.38)';
    x.lineWidth = 3;
    x.beginPath(); x.arc(256, 192, 118, 0, Math.PI * 2); x.stroke();

    x.fillStyle = '#ebd094'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 88px "Pirata One", serif';
    x.fillText('MENÜ', 256, 196);
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
      placeItem(it, 0, TABLE_Y + 0.72, 1.42, 0.76, 0, 0, 1.55);

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

  // --- ANİMASYON & RENDER ---
  let lastT = 0, frameN = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera || !is3DActive) return;

    const time = clock.getElapsedTime();
    const dt = Math.min(0.05, time - lastT); lastT = time;
    const k = 1 - Math.exp(-dt * 10);

    // Kamera: hafif nefes alma + fare paralaksı (hem masayı hem rakibi hem odayı kadrajda tutar)
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    camera.position.x = mouse.x * 0.22;
    camera.position.y = 1.85 + Math.sin(time * 1.5) * 0.012 - mouse.y * 0.12;
    camera.rotation.y = -mouse.x * 0.07;
    camera.rotation.x = -0.37 - mouse.y * 0.05;

    // Lamba titremesi & tıklama salınımı
    lampBoostVel += (-lampSwingBoost * 18 - lampBoostVel * 2.5) * dt;
    lampSwingBoost += lampBoostVel * dt;
    const flicker = 1.0 + (Math.sin(time * 12.0) * 0.04) + (Math.random() * 0.03 - 0.015);
    if (pointLight) pointLight.intensity = 1.9 * flicker;
    if (spotLight) spotLight.intensity = 4.4 * flicker;
    if (lampMesh && ceilingWire) {
      const sw = Math.sin(time * 1.2) * 0.035 + lampSwingBoost;
      lampMesh.rotation.z = sw; ceilingWire.rotation.z = sw * 0.5;
      if (spotLight) spotLight.target.position.x = Math.sin(sw) * 1.1;
    }
    if (opponentMesh) opponentMesh.position.y = 0.55 + Math.sin(time * 1.8) * 0.012;
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
        const glow = on ? (hov ? 0.48 : 0.20 + 0.12 * Math.sin(time * 3.5)) : 0;
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
      sealItem.mesh.position.y = TABLE_Y + 0.026 + (u < 1 ? 0.15 * (1 - u) : 0);
    }
    // Sıra oku
    if (arrowItem) {
      const a = arrowItem;
      const dirZ = a.mode === 'me' ? 1 : -1;
      a.mesh.visible = a.mode !== 'off';
      if (a.mesh.visible) {
        a.mesh.rotation.set(dirZ * Math.PI / 2, 0, 0);
        a.mesh.position.set(0, TABLE_Y + 0.10, 0.22 + dirZ * (0.27 + 0.03 * Math.sin(time * 4)));
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
