// Récupérations DOM
const layoutThumbnails = document.getElementById('layoutThumbnails');
const textInputsDiv = document.getElementById('textInputs');
const imageInputsDiv = document.getElementById('imageInputs');
const exportBtn = document.getElementById('exportBtn');
const depthSlider = document.getElementById('perspectiveDepth');
const formatSelect = document.getElementById('formatSelect');

let selectedLayoutIndex = 0;
let texts = [];
let images = [];

// Gestion du changement de format
formatSelect.addEventListener('change', e => {
  setCanvasFormat(e.target.value); // redessine si currentLayout/* est synchro
});

// Gestion du slider de profondeur
depthSlider.addEventListener('input', () => {
  perspectiveDepth = parseFloat(depthSlider.value);
  drawLayout(layoutsData[selectedLayoutIndex], texts, images);
});

// Génération des vignettes des layouts
function generateLayoutThumbnails() {
  layoutThumbnails.innerHTML = '';

  const images = [
    'img/layout1.jpg', // image 1/3 - 1/3 - 1/3
    'img/layout2.jpeg', // image image(1/2)+texte(1/4)+texte(1/4)
    'img/layout3.jpeg', // deux blocs (haut bas)
    'img/layout4.jpeg', // deux blocs (2/3 + 1/3)
  ];

  images.forEach((src, idx) => {
    const thumb = document.createElement('div');
    thumb.classList.add('layout-thumb');
    thumb.dataset.idx = idx;

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Layout ${idx+1}`;
    img.style.width = '90px';
    img.style.height = '90px';
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';

    thumb.appendChild(img);

    thumb.addEventListener('click', () => {
      document.querySelectorAll('.layout-thumb.selected').forEach(el => el.classList.remove('selected'));
      thumb.classList.add('selected');
      selectedLayoutIndex = idx;
      updateInputs();
    });

    layoutThumbnails.appendChild(thumb);
  });

  // Sélection par défaut
  const first = layoutThumbnails.querySelector('.layout-thumb');
  if (first) first.classList.add('selected');
}

// Génération des inputs texte et image selon layout sélectionné
function updateInputs() {
  textInputsDiv.innerHTML = '';
  imageInputsDiv.innerHTML = '';
  const layout = layoutsData[selectedLayoutIndex];

  // Préremplissage
  texts = Array(layout.blocks.length).fill('ON NE VEUT PLUS');
  images = Array(layout.blocks.length).fill(null);

  // >>> Sync avec les globals de render.js pour que setCanvasFormat() puisse redessiner
  currentLayout = layout;
  currentTexts = texts;
  currentImages = images;

  layout.blocks.forEach((block, i) => {
    // Création d’un container input-group
    const inputGroup = document.createElement('div');
    inputGroup.classList.add('input-group');

    // Wrapper pour le champ texte
    const textWrapper = document.createElement('div');
    textWrapper.classList.add('text-wrapper');

    const tInput = document.createElement('input');
    tInput.type = 'text';
    tInput.placeholder = `Texte à remplir`;
    tInput.value = texts[i]; // <<< afficher le texte prérempli
    tInput.addEventListener('input', e => {
      texts[i] = e.target.value;
      currentTexts = texts; // <<< garder les globals synchros
      drawLayout(layout, texts, images);
    });
    textWrapper.appendChild(tInput);
    inputGroup.appendChild(textWrapper);

    // Sélecteur de perspective
    const selectPersp = document.createElement('select');
    [
      { value: 'none', label: 'Regular' },
      { value: 'haut', label: 'Haut' },
      { value: 'bas', label: 'Bas' },
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      selectPersp.appendChild(option);
    });

    selectPersp.value = block.perspective || 'none';

    selectPersp.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'none') layout.blocks[i].perspective = null;
      else if (val === 'deforme') layout.blocks[i].perspective = 'deforme';
      else layout.blocks[i].perspective = val;

      currentLayout = layout; // <<< sync
      drawLayout(layout, texts, images);
    });

    inputGroup.appendChild(selectPersp);
    textInputsDiv.appendChild(inputGroup);

    // Input image si autorisé dans le layout
    if (layout.allowImages) {
      const imgInput = document.createElement('input');
      imgInput.type = 'file';
      imgInput.accept = 'image/*';
      imgInput.addEventListener('change', e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            images[i] = img;
            currentImages = images; // <<< sync
            drawLayout(layout, texts, images);
          };
          img.src = ev.target.result;
        };
        if (file) reader.readAsDataURL(file);
      });
      imageInputsDiv.appendChild(imgInput);
    }
  });

  // Sécurité : resync avant premier dessin
  currentLayout = layout;
  currentTexts = texts;
  currentImages = images;

  drawLayout(layout, texts, images);
}

// Export image en JPEG
exportBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'export.jpeg';
  link.href = canvas.toDataURL('image/jpeg', 1.0);
  link.click();
});

// Fonction pour activer le drag-scroll horizontal (vignettes)
function enableDragScroll(container) {
  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    container.classList.add('dragging');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.classList.remove('dragging');
  });
  container.addEventListener('mouseup', () => {
    isDown = false;
    container.classList.remove('dragging');
  });
  container.addEventListener('mousemove', (e) => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2; // vitesse du scroll
    container.scrollLeft = scrollLeft - walk;
  });
}

// Initialisation à l’exécution du script
generateLayoutThumbnails();
enableDragScroll(layoutThumbnails);
updateInputs();

/* ---------- Mobile: réduction/extension des paramètres ---------- */
// ATTENTION: nécessite dans index.html un bouton:
// <div id="settingsHeader" class="floating-header">PARAMÈTRES
//   <button id="toggleSettings" style="display:none;">–</button>
// </div>

const toggleBtn = document.getElementById('toggleSettings');
const settingsWindow = document.getElementById('settingsModal');
const canvasContainer = document.getElementById('canvasContainer');

let settingsCollapsed = false;

// applique les hauteurs en mode mobile (interface en bas, canvas en haut)
function applyMobileHeights(collapsed) {
  if (!settingsWindow || !canvasContainer) return;
  if (collapsed) {
    // interface réduite à une barre
    settingsWindow.style.height = '40px';
    canvasContainer.style.height = 'calc(100vh - 40px)';
  } else {
    // 40% / 60%
    settingsWindow.style.height = '40vh';
    canvasContainer.style.height = '60vh';
  }
}

// montre/cache le bouton et réinitialise les styles hors mobile
function checkMobileMode() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (!toggleBtn) return; // sécurité si le bouton n'existe pas

  if (isMobile) {
    toggleBtn.style.display = 'inline-block';
    applyMobileHeights(settingsCollapsed);
  } else {
    toggleBtn.style.display = 'none';
    // on enlève les styles inline pour laisser le CSS desktop gérer
    if (settingsWindow) settingsWindow.style.height = '';
    if (canvasContainer) canvasContainer.style.height = '';
    settingsCollapsed = false;
    toggleBtn.textContent = '–';
  }
}

// écouteur sur le bouton (uniquement si présent)
if (toggleBtn && settingsWindow && canvasContainer) {
  toggleBtn.addEventListener('click', () => {
    settingsCollapsed = !settingsCollapsed;
    applyMobileHeights(settingsCollapsed);
    toggleBtn.textContent = settingsCollapsed ? '+' : '–';
  });

  window.addEventListener('resize', checkMobileMode);
  checkMobileMode();
}
