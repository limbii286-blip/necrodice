// Baldur's Gate 3 Style True 3D D20 Canvas Renderer
(function() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const rawV = [
    [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
    [0, -1,  phi], [0,  1,  phi], [0, -1, -phi], [0,  1, -phi],
    [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
  ];
  const V = rawV.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  });
  
  // 20 faces of regular icosahedron
  const F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  // Face number mappings (20 on face 0, rest distributed like a real D20)
  const FACE_NUMS = [
    20, 14, 2, 18, 9,
    10, 12, 16, 4, 6,
    1, 7, 19, 3, 15,
    11, 17, 5, 13, 8
  ];

  window.draw3DD20 = function(cv, rx, ry, rz, targetNum, isRolling, isCrit, isFail, scaleMult, textPopMult) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const baseScale = (w * 0.40) * (scaleMult || 1.0);
    const textPop = textPopMult || 1.0;

    const cx_r = Math.cos(rx), sx_r = Math.sin(rx);
    const cy_r = Math.cos(ry), sy_r = Math.sin(ry);
    const cz_r = Math.cos(rz), sz_r = Math.sin(rz);

    const rot = ([x, y, z]) => {
      // Rotate Y
      const x1 = x * cy_r + z * sy_r, y1 = y, z1 = -x * sy_r + z * cy_r;
      // Rotate X
      const x2 = x1, y2 = y1 * cx_r - z1 * sx_r, z2 = y1 * sx_r + z1 * cx_r;
      // Rotate Z
      const x3 = x2 * cz_r - y2 * sz_r, y3 = x2 * sz_r + y2 * cz_r, z3 = z2;
      return [x3, y3, z3];
    };

    const rv = V.map(rot);

    // Light source: top left front
    const lx = -0.4, ly = -0.5, lz = 1.0;
    const ll = Math.hypot(lx, ly, lz);
    const ldir = [lx / ll, ly / ll, lz / ll];

    const faceData = F.map((face, fi) => {
      const p0 = rv[face[0]], p1 = rv[face[1]], p2 = rv[face[2]];
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const nl = Math.hypot(nx, ny, nz);
      const norm = [nx / nl, ny / nl, nz / nl];
      const zDepth = (p0[2] + p1[2] + p2[2]) / 3;
      return { fi, face, norm, zDepth, p0, p1, p2 };
    });

    // Painter's algorithm: sort by depth
    faceData.sort((a, b) => a.zDepth - b.zDepth);

    // Ambient shadow under die
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + baseScale * 0.95, baseScale * 0.75, baseScale * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.filter = 'blur(10px)';
    ctx.fill();
    ctx.restore();

    faceData.forEach(fd => {
      // Backface culling
      if (fd.norm[2] <= 0.0) return;

      const { p0, p1, p2, norm, fi } = fd;
      // Mat / saten yakut dokusu: parlama yumuşatıldı, diff dengelendi
      const diff = Math.max(0.25, norm[0] * ldir[0] + norm[1] * ldir[1] + norm[2] * ldir[2]);
      
      // Specular reflection (yumuşak mat yansıma)
      const rx_l = 2 * diff * norm[0] - ldir[0];
      const ry_l = 2 * diff * norm[1] - ldir[1];
      const rz_l = 2 * diff * norm[2] - ldir[2];
      const spec = Math.pow(Math.max(0, rz_l), 6) * 0.12;

      const s0 = [cx + p0[0] * baseScale, cy - p0[1] * baseScale];
      const s1 = [cx + p1[0] * baseScale, cy - p1[1] * baseScale];
      const s2 = [cx + p2[0] * baseScale, cy - p2[1] * baseScale];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s0[0], s0[1]);
      ctx.lineTo(s1[0], s1[1]);
      ctx.lineTo(s2[0], s2[1]);
      ctx.closePath();

      // Mat bordo/yakut reçine tonları
      const grad = ctx.createLinearGradient(s0[0], s0[1], (s1[0]+s2[0])/2, (s1[1]+s2[1])/2);
      
      if (isCrit) {
        grad.addColorStop(0, `rgb(${Math.min(255, (220 * diff + spec * 120)|0)}, ${Math.min(255, (170 * diff + spec * 100)|0)}, 35)`);
        grad.addColorStop(1, `rgb(${Math.min(255, (140 * diff)|0)}, ${Math.min(255, (80 * diff)|0)}, 10)`);
      } else if (isFail) {
        grad.addColorStop(0, `rgb(${Math.min(255, (95 * diff + spec * 90)|0)}, 18, 22)`);
        grad.addColorStop(1, `rgb(${Math.min(255, (40 * diff)|0)}, 5, 8)`);
      } else {
        // Mat kadife bordo / koyu kızıl ton
        grad.addColorStop(0, `rgb(${Math.min(255, (190 * diff + spec * 130)|0)}, ${Math.min(255, (22 * diff)|0)}, 36)`);
        grad.addColorStop(1, `rgb(${Math.min(255, (90 * diff)|0)}, 8, 14)`);
      }

      ctx.fillStyle = grad;
      ctx.fill();

      // Mat antika pirinç çerçeve kenarları
      ctx.strokeStyle = isCrit ? 'rgba(235, 210, 120, 0.9)' : 'rgba(195, 150, 65, 0.65)';
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // İç çerçeve (hafif gölge)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Draw number on facet if facing camera
      if (norm[2] > 0.42) {
        const f_cx = (s0[0] + s1[0] + s2[0]) / 3;
        const f_cy = (s0[1] + s1[1] + s2[1]) / 3;
        const numStr = (fi === 0) ? String(targetNum) : String(FACE_NUMS[fi]);

        ctx.save();
        ctx.translate(f_cx, f_cy);
        
        // Calculate facet orientation angle to orient number right side up
        const upX = (s0[0] - (s1[0] + s2[0])/2);
        const upY = (s0[1] - (s1[1] + s2[1])/2);
        const ang = Math.atan2(upY, upX) + Math.PI / 2;
        ctx.rotate(ang * 0.3); // subtle natural perspective tilt

        const fontSz = Math.max(16, baseScale * (numStr.length > 1 ? 0.36 : 0.42) * norm[2] * (fi === 0 ? textPop : 1.0));
        ctx.font = `900 ${fontSz|0}px 'Cinzel', 'Times New Roman', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Gold relief text with engraving shadow & subtle burst glow when popping
        if (fi === 0 && textPop > 1.05) {
          ctx.shadowColor = isCrit ? 'rgba(255, 235, 120, 0.95)' : isFail ? 'rgba(255, 60, 60, 0.85)' : 'rgba(255, 215, 90, 0.85)';
          ctx.shadowBlur = 10 * textPop;
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 4;
        }
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = isCrit ? '#ffffff' : (fi === 0 && textPop > 1.05) ? '#fff8db' : '#ffea9f';
        ctx.fillText(numStr, 0, 0);

        if (isCrit || (fi === 0 && textPop > 1.05)) {
          ctx.strokeStyle = isCrit ? '#ffd700' : 'rgba(255, 215, 120, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.strokeText(numStr, 0, 0);
        }
        ctx.restore();
      }

      ctx.restore();
    });
  };
})();
