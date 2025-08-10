// home-bg.js — HOME plein écran, fond transparent + background.jpeg en arrière-plan
// - Utilise <canvas id="bgCanvas"> présent dans home.html
// - Même fond que index : body::before avec /img/background.jpeg (on NE le supprime plus)
// - Texte "#ff5f01", ON NE / VEUT / PLUS (2 lignes desktop, 3 lignes mobile)
// - Remplit 100% de la hauteur, anti-crop (slicing + overscan)
// - Perspective évolutive au scroll (fort en haut → plus plate en bas)
// - Grain visible UNIQUEMENT dans les lettres (pas de voile), aucun blur

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // ---------- Inject CSS : fond image + canvas transparent plein écran ----------
    (function injectHardCSS() {
      const s = document.createElement('style');
      s.id = 'home-hard-override';
      s.textContent = `
        html, body { margin:0!important; padding:0!important; background:transparent!important; height:100%; }
        /* HOME : même fond fixe que sur index (on force même si d'autres règles l'annulent) */
        body.home::before {
          content: "" !important;
          position: fixed;
          inset: 0;
          z-index: -1;
          background: url('/img/background.jpeg') center/cover no-repeat fixed;
          will-change: transform;
        }
        /* Fallback si la classe .home a été oubliée : (ce JS ne tourne que sur HOME) */
        body:not(.home)::before {
          content: "" !important;
          position: fixed;
          inset: 0;
          z-index: -1;
          background: url('/img/background.jpeg') center/cover no-repeat fixed;
          will-change: transform;
        }
        /* Canvas HOME : plein écran + vraiment transparent (écrase canvas { background:white; ... }) */
        #bgCanvas, canvas#bgCanvas {
          position: fixed !important;
          inset: 0 !important;
          z-index: -1 !important;
          width: 100vw !important;
          height: 100vh !important;
          display: block !important;
          background: transparent !important;
          margin: 0 !important;
          max-width: none !important;
          max-height: none !important;
          border: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(s);
    })();

    // ---------- Perf / DPI ----------
    const DPR = 1; // 1 = fluide (le rendu typographique géant + grain n’a pas besoin de plus)

    // ---------- Canvas existant ----------
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) { console.error('Ajoute <canvas id="bgCanvas"> dans le HTML.'); return; }
    const ctx = canvas.getContext('2d');
    canvas.style.setProperty('background', 'transparent', 'important');

    // ---------- State ----------
    let scrollPercent = 0;             // 0 top → 1 bottom
    const ORANGE = '#ff5f01';

    // ---------- Viewport → canvas ----------
    function fitCanvasToViewport() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width  = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // coordonnées en px CSS
    }

    // ---------- Lignes : 2 desktop / 3 mobile ----------
    function getSloganLines() {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      return isMobile ? ['ON NE', 'VEUT', 'PLUS'] : ['ON NE VEUT', 'PLUS'];
    }

    // ---------- Perspective qui évolue avec le scroll ----------
    function computePerspectiveDepth(p) {
      const MAX = 0.42; // top de page
      const MIN = 0.06; // bas de page
      return MAX + (MIN - MAX) * p;
    }

    // ---------- Grain uniquement dans les lettres ----------
    function hexToRGB(hex) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 95, b: 1 };
    }
    const ORANGE_RGB = hexToRGB(ORANGE);

    let NOISE_TILE = null;
    function makeAlphaNoiseTile(size = 256, rgb = ORANGE_RGB, density = 0.75) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      const img = x.createImageData(size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const on = Math.random() < density;
        const a = on ? (120 + Math.random() * 135) : 0; // alpha dense 120–255
        d[i]   = rgb.r;
        d[i+1] = rgb.g;
        d[i+2] = rgb.b;
        d[i+3] = a;
      }
      x.putImageData(img, 0, 0);
      return c;
    }
    function ensureNoiseTile() {
      if (!NOISE_TILE) NOISE_TILE = makeAlphaNoiseTile(256, ORANGE_RGB, 0.75);
    }

    function paintNoiseInsideText(layers = 6) {
      ensureNoiseTile();
      const tile = NOISE_TILE;

      ctx.save();
      // ne peint que là où le texte est déjà dessiné → pas de voile sur le fond
      ctx.globalCompositeOperation = 'source-atop';

      for (let i = 0; i < layers; i++) {
        ctx.globalAlpha = 0.45; // suffisamment visible
        const dx = (Math.random() - 0.5) * 48;
        const dy = (Math.random() - 0.5) * 48;
        const rot = (Math.random() - 0.5) * 0.08; // ±4.5°

        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);

        const pattern = ctx.createPattern(tile, 'repeat');
        ctx.fillStyle = pattern;
        // couvre large pour éviter les bords visibles
        ctx.fillRect(-canvas.width, -canvas.height, canvas.width * 3, canvas.height * 3);

        ctx.restore();
      }

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------- Texte trapézoïdal anti-crop (slicing + overscan) ----------
    function drawTrapezoidText(text, y, h, direction, color, depth) {
      const OVERSCAN_Y = 1.35;                         // colle visuellement aux bords
      const PAD = Math.max(8, Math.floor(h * 0.10));   // sécurité interne

      const fullW = Math.max(1, Math.floor(canvas.width)); // px CSS
      const tmpH  = Math.max(1, Math.floor(h * OVERSCAN_Y)) + PAD * 2;

      const tmp = document.createElement('canvas');
      tmp.width  = fullW;
      tmp.height = tmpH;
      const tctx = tmp.getContext('2d');

      tctx.fillStyle = color;
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';

      const baseSize = Math.max(40, Math.floor(h * 0.92));
      tctx.font = `900 ${baseSize}px Aspekta, sans-serif`;

      const textWidth  = Math.max(1, tctx.measureText(text).width);
      const textHeight = baseSize;

      const scaleX = fullW / textWidth;               // largeur pleine
      const scaleY = (h * OVERSCAN_Y) / textHeight;   // overscan vertical

      tctx.save();
      tctx.translate(fullW / 2, tmpH / 2);
      tctx.scale(scaleX, scaleY);
      tctx.fillText(text, 0, 0);
      tctx.restore();

      // géométrie trapèze
      let topWidth, bottomWidth;
      if (direction === 'haut') {
        topWidth = fullW * (1 - depth);
        bottomWidth = fullW;
      } else if (direction === 'bas') {
        topWidth = fullW;
        bottomWidth = fullW * (1 - depth);
      } else {
        topWidth = bottomWidth = fullW;
      }
      const topX = (fullW - topWidth) / 2;
      const bottomX = (fullW - bottomWidth) / 2;

      // prélève exactement h lignes au centre → colle aux bords, pas de crop
      const srcStartY = Math.max(0, Math.floor(tmpH / 2 - h / 2));
      const bands = Math.max(1, Math.floor(h));
      for (let i = 0; i < bands; i++) {
        const t = i / bands;
        const currentWidth = topWidth + (bottomWidth - topWidth) * t;
        const currentX = topX + (bottomX - topX) * t;
        const srcY = srcStartY + i;
        ctx.drawImage(tmp, 0, srcY, fullW, 1, currentX, y + i, currentWidth, 1);
      }
    }

    // ---------- Rendu plein écran (zéro marge), bornes exactes 0 → h ----------
    function drawFullBleed() {
      const w = Math.floor(canvas.width / DPR);
      const h = Math.floor(canvas.height / DPR);
      ctx.clearRect(0, 0, w, h);

      const lines = getSloganLines();
      const n = lines.length;

      // découpe exacte (évite les fissures entre bandes)
      const yBounds = [];
      for (let i = 0; i <= n; i++) yBounds.push(Math.round((i * h) / n));

      const dirs = ['haut', 'bas', 'haut'];
      const depth = computePerspectiveDepth(scrollPercent);

      ctx.fillStyle = ORANGE;
      for (let i = 0; i < n; i++) {
        const yTop  = yBounds[i];
        const bandH = yBounds[i + 1] - yTop;
        if (bandH <= 0) continue;
        drawTrapezoidText(lines[i], yTop, bandH, dirs[i % dirs.length], ORANGE, depth);
      }

      // grain dans les lettres uniquement
      paintNoiseInsideText(6);
    }

    // ---------- rAF coalescing ----------
    let rafPending = false;
    function scheduleRender() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        drawFullBleed();
      });
    }

    // ---------- Scroll / Resize ----------
    function onScroll() {
      const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const next = Math.min(1, Math.max(0, window.scrollY / docH));
      if (Math.abs(next - scrollPercent) < 0.002) return;
      scrollPercent = next;
      scheduleRender();
    }

    window.addEventListener('resize', () => { fitCanvasToViewport(); scheduleRender(); });
    window.addEventListener('orientationchange', () => { fitCanvasToViewport(); scheduleRender(); });
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---------- Init ----------
    fitCanvasToViewport();
    drawFullBleed();

    // Assure que la police est chargée avant un 2e rendu (sinon mesure fausse)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => scheduleRender());
    }
  });
})();
