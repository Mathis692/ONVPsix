const layoutsData = [
  {
    name: "1/3 - 1/3 - 1/3",
    allowImages: false,
    blocks: [
      { height: 1 / 3, perspective: null, defaultText: "TEXTE BABACACA" },
      { height: 1 / 3, perspective: "bas" },
      { height: 1 / 3, perspective: "haut" }
    ]
  },
  {
    name: "Image (1/2) + Texte noir fond orange (1/4) + Texte orange fond noir (1/4)",
    allowImages: true,
    blocks: [
      { height: 0.5, perspective: null, type: "image" },
      { height: 0.25, perspective: "haut", bgColor: '#ff5f00', textColor: '#1d1d1b', type: "text" },
      { height: 0.25, perspective: "bas", bgColor: '#1d1d1b', textColor: '#ff5f00', type: "text" }
    ]
  },
  {
    name: "Deux blocs (texte en haut, fuite vers le bas)",
    allowImages: false,
    blocks: [
      { height: 0.5, perspective: "bas" },
      { height: 0.5, perspective: null }
    ]
  },
  {
    name: "Deux blocs (2/3 texte déformé + 1/3 texte normal)",
    allowImages: false,
    plainTextBlock: true,
    blocks: [
      { height: 2 / 3, perspective: "haut", type: "text" },
      { height: 1 / 3, perspective: null, type: "text" }
    ]
  }
];
