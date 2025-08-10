// Déclarations globales
const formats = {
  twitter: { w: 1200, h: 675 },
  facebook_square: { w: 1080, h: 1080 },
  facebook_vertical: { w: 1080, h: 1350 },
  instagram_vertical: { w: 1080, h: 1350 }
};

let offsetXUser = 0;
let offsetYUser = 0;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let perspectiveDepth = 0.3;

let currentFormat = 'instagram_vertical';
let currentLayout = null;
let currentTexts = [];
let currentImages = [];

// Change le format du canvas
function setCanvasFormat(formatName) {
  if (!formats[formatName]) {
    console.warn('Format inconnu:', formatName);
    return;
  }
  currentFormat = formatName;
  const { w, h } = formats[formatName];
  canvas.width = w;
  canvas.height = h;

  if (currentLayout) {
    drawLayout(currentLayout, currentTexts, currentImages);
  }
}

// Ajoute un bruit léger avec un léger shake horizontal
function addLightNoise(intensity = 15, shake = 0.5, alpha = 0.1) {
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let i = (y * w + x) * 4;

      const offsetX = Math.floor((Math.random() - 0.5) * shake);
      let srcX = Math.min(w - 1, Math.max(0, x + offsetX));
      let srcI = (y * w + srcX) * 4;

      for (let c = 0; c < 3; c++) {
        let noise = (Math.random() - 0.5) * intensity;
        let original = data[srcI + c];
        data[i + c] = original * (1 - alpha) + (original + noise) * alpha;
      }
      // alpha inchangé
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Traitement image : Noir & Blanc + filtre orange en mode multiply
function processImageBWOrange(img, width, height) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.drawImage(img, 0, 0, width, height);

  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299*r + 0.587*g + 0.114*b;
    data[i] = data[i+1] = data[i+2] = lum;
  }
  tempCtx.putImageData(imageData, 0, 0);

  tempCtx.globalCompositeOperation = 'multiply';
  tempCtx.fillStyle = 'rgba(255, 102, 0, 1)';
  tempCtx.fillRect(0, 0, width, height);

  tempCtx.globalCompositeOperation = 'source-over';

  return tempCanvas;
}

// Traitement image : Calque noir mode color + calque orange mode multiply
function processImageColorOrange(img, width, height) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctxTemp = tempCanvas.getContext('2d');

  ctxTemp.drawImage(img, 0, 0, width, height);

  ctxTemp.globalCompositeOperation = 'color';
  ctxTemp.fillStyle = 'black';
  ctxTemp.fillRect(0, 0, width, height);

  ctxTemp.globalCompositeOperation = 'multiply';
  ctxTemp.fillStyle = 'rgba(255, 102, 0, 1)';
  ctxTemp.fillRect(0, 0, width, height);

  ctxTemp.globalCompositeOperation = 'source-over';

  return tempCanvas;
}

// Fonction dessin du layout complet
function drawLayout(layout, texts, images) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let y = 0;
  layout.blocks.forEach((block, i) => {
    const h = canvas.height * block.height;
    const bgColor = i % 2 === 0 ? '#ff5f00' : '#1d1d1b';
    const textColor = i % 2 === 0 ? '#1d1d1b' : '#ff5f00';

    // Fond
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, y, canvas.width, h);
    if (texts[i]) {
    const persp = block.perspective;
    if (layout.plainTextBlock && i === layout.blocks.length - 1) {
        // Texte normal bloc bas, taille fixe 36px, retours à la ligne
        ctx.fillStyle = textColor;
        ctx.font = '36px Aspekta, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        drawMultilineText(ctx, texts[i], canvas.width / 2, y + h / 2, canvas.width * 0.9, 40);
    } else if (persp === 'haut') {
        drawTrapezoidText(texts[i], y, h, 'haut', textColor);
    } else if (persp === 'bas') {
        drawTrapezoidText(texts[i], y, h, 'bas', textColor);
    } else if (persp === 'deforme') {
        drawStretchedText(texts[i], y, h, textColor);
    } else {
        drawStretchedText(texts[i], y, h, textColor);
    }
    }


    // Image traitée si type image
    if (block.type === 'image' && images[i]) {
      const processedImage = processImageColorOrange(images[i], images[i].width, images[i].height);
      const scale = Math.max(canvas.width / images[i].width, h / images[i].height);
      const drawWidth = images[i].width * scale;
      const drawHeight = images[i].height * scale;
      const offsetX = (canvas.width - drawWidth) / 2 + offsetXUser;
      const offsetY = y + (h - drawHeight) / 2 + offsetYUser;
      ctx.drawImage(processedImage, offsetX, offsetY, drawWidth, drawHeight);
    }

    // Texte
    if (texts[i]) {
  if (layout.plainTextBlock && i === layout.blocks.length - 1) {
    // Texte normal taille 36, retour à la ligne, centré
    ctx.fillStyle = textColor;
    ctx.font = '36px Aspekta, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawMultilineText(ctx, texts[i], canvas.width / 2, y + h / 2, canvas.width * 0.9, 40);
  } else if (block.perspective) {
    drawTrapezoidText(texts[i], y, h, block.perspective, textColor);
  } else {
    drawStretchedText(texts[i], y, h, textColor);
  }
}

    y += h;
  });

  // Bande décorative au-dessus du deuxième tiers
  if (layout.blocks.length >= 3) {
    const firstBlockHeight = canvas.height * layout.blocks[0].height;
    const bandHeight = 70;

    ctx.fillRect(0, firstBlockHeight - bandHeight, canvas.width, bandHeight);

    ctx.strokeStyle = '#1d1d1b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, firstBlockHeight - bandHeight);
    ctx.lineTo(canvas.width, firstBlockHeight - bandHeight);
    ctx.stroke();

    ctx.fillStyle = '#1d1d1b';
    ctx.font = 'bold 50px Aspekta, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10 SEPTEMBRE', canvas.width / 2, firstBlockHeight - bandHeight / 2);
  }

  drawRedGradientOverlay();
  addLightNoise(0, 0.01, 0.1);
}

// Fonction de dessin du texte en perspective trapézoïdale
function drawTrapezoidText(text, y, h, direction, color) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = canvas.width;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext('2d');

  tmpCtx.fillStyle = color;
  tmpCtx.textAlign = 'center';
  tmpCtx.textBaseline = 'middle';

  const baseSize = 100;
  tmpCtx.font = `900 100px 'Aspekta'`;

  const textWidth = tmpCtx.measureText(text).width;
  const textHeight = baseSize;
  const scaleX = tmpCanvas.width / textWidth;
  const scaleY = (h / textHeight) * 1.15;

  tmpCtx.save();
  const verticalOffset = 50;
  tmpCtx.translate(tmpCanvas.width / 2, h / 2 + verticalOffset);
  tmpCtx.scale(scaleX, scaleY);
  tmpCtx.fillText(text, 0, 0);
  tmpCtx.restore();

  const topWidth = direction === 'haut' ? canvas.width * (1 - perspectiveDepth) : canvas.width;
  const bottomWidth = direction === 'haut' ? canvas.width : canvas.width * (1 - perspectiveDepth);
  const topX = (canvas.width - topWidth) / 2;
  const bottomX = (canvas.width - bottomWidth) / 2;

  const bands = h;
  for (let i = 0; i < bands; i++) {
    const interp = i / bands;
    const currentWidth = topWidth + (bottomWidth - topWidth) * interp;
    const currentX = topX + (bottomX - topX) * interp;

    ctx.drawImage(tmpCanvas, 0, i, tmpCanvas.width, 1, currentX, y + i, currentWidth, 1);
  }
}

// Fonction de dessin du texte étiré
function drawStretchedText(text, y, h, color) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = canvas.width;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext('2d');

  tmpCtx.fillStyle = color;
  tmpCtx.textAlign = 'center';
  tmpCtx.textBaseline = 'middle';

  const baseSize = 100;
  tmpCtx.font = `900 ${baseSize}px 'Aspekta'`;

  const textWidth = tmpCtx.measureText(text).width;
  const textHeight = baseSize;

  const scaleX = tmpCanvas.width / textWidth;
  const scaleY = h / textHeight;

  tmpCtx.save();
  const verticalOffset = 10;
  tmpCtx.translate(tmpCanvas.width / 2, h / 2 + verticalOffset);
  tmpCtx.scale(scaleX, scaleY);
  tmpCtx.fillText(text, 0, 0);
  tmpCtx.restore();

  ctx.drawImage(tmpCanvas, 0, y);
}

// Fonction pour texte multi-ligne avec retours à la ligne automatiques
function drawMultilineText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const totalHeight = lines.length * lineHeight;
  let offsetY = y - totalHeight / 2 + lineHeight / 2;

  for (const l of lines) {
    ctx.fillText(l.trim(), x, offsetY);
    offsetY += lineHeight;
  }
}

// Dégradé rouge en overlay
function drawRedGradientOverlay() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(99, 0, 0, 0.26)');
  gradient.addColorStop(1, 'rgba(99, 0, 0, 0)');

  ctx.globalCompositeOperation = 'lighter';

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'source-over';
}



const settingsModal = document.getElementById('settingsModal');
const header = document.getElementById('settingsHeader');

let isDragging = false;
let dragStartX, dragStartY;
let modalStartX, modalStartY;

header.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const rect = settingsModal.getBoundingClientRect();
  modalStartX = rect.left;
  modalStartY = rect.top;
  header.style.cursor = 'grabbing';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  header.style.cursor = 'grab';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  let dx = e.clientX - dragStartX;
  let dy = e.clientY - dragStartY;
  settingsModal.style.left = modalStartX + dx + 'px';
  settingsModal.style.top = modalStartY + dy + 'px';
});
