// Emoji palette definitions - 23 curated themes
// Based on Android app's existing palettes with web optimization

import { EmojiPalette, PaletteCategory } from '@/types/pattern';

export const EMOJI_PALETTES: EmojiPalette[] = [
  // Color-based palettes
  {
    id: 'hearts-flowers',
    name: { en: 'Hearts & Flowers', fr: 'Cœurs & Fleurs' },
    category: PaletteCategory.COLOR,
    emojis: ['❤️', '💕', '💖', '💗', '💝', '🌸', '🌺', '🌻', '🌷', '🌹', '💐', '🌼', '🥀', '🌵', '🪴', '💒', '🏩', '💞', '💘', '💌', '🎀'],
    orderIndex: 1,
    isCustom: false,
    description: { en: 'Romantic hearts and beautiful flowers', fr: 'Cœurs romantiques et belles fleurs' },
    tags: ['love', 'romance', 'flowers', 'nature']
  },
  {
    id: 'ocean-waves',
    name: { en: 'Ocean Waves', fr: 'Vagues Océan' },
    category: PaletteCategory.COLOR,
    emojis: ['🌊', '💙', '💎', '🔵', '🟦', '🐋', '🐟', '🐠', '🦈', '🌀', '💧', '❄️'],
    orderIndex: 2,
    isCustom: false,
    description: { en: 'Blues of the ocean and sea life', fr: 'Bleus de l\'océan et vie marine' },
    tags: ['ocean', 'blue', 'water', 'sea']
  },
  {
    id: 'forest-green',
    name: { en: 'Forest Green', fr: 'Vert Forêt' },
    category: PaletteCategory.COLOR,
    emojis: ['🌲', '🌳', '🌿', '🍀', '🌱', '🥒', '🥬', '🥝', '💚', '✅', '🟢', '🔋'],
    orderIndex: 3,
    isCustom: false,
    description: { en: 'Rich greens of nature and growth', fr: 'Verts riches de la nature et croissance' },
    tags: ['nature', 'green', 'forest', 'growth']
  },
  {
    id: 'sunset-orange',
    name: { en: 'Sunset Orange', fr: 'Orange Coucher' },
    category: PaletteCategory.COLOR,
    emojis: ['🧡', '🔥', '🌅', '🌄', '🍊', '🥕', '🎃', '🦊', '🟠', '⚡', '☄️', '🏀'],
    orderIndex: 4,
    isCustom: false,
    description: { en: 'Warm oranges of sunset and energy', fr: 'Oranges chauds du coucher de soleil et énergie' },
    tags: ['sunset', 'orange', 'warm', 'energy']
  },
  {
    id: 'royal-purple',
    name: { en: 'Royal Purple', fr: 'Violet Royal' },
    category: PaletteCategory.COLOR,
    emojis: ['💜', '🔮', '🍇', '🍆', '🟣', '⚗️', '🎆', '👑', '🦄', '🌸', '☂️', '🎭'],
    orderIndex: 5,
    isCustom: false,
    description: { en: 'Majestic purples and magical items', fr: 'Violets majestueux et objets magiques' },
    tags: ['purple', 'royal', 'magic', 'fantasy']
  },
  {
    id: 'sunshine-yellow',
    name: { en: 'Sunshine Yellow', fr: 'Jaune Soleil' },
    category: PaletteCategory.COLOR,
    emojis: ['💛', '☀️', '🌟', '⭐', '🌞', '🌝', '🍋', '🌻', '🟡', '⚡', '🔆', '💡'],
    orderIndex: 6,
    isCustom: false,
    description: { en: 'Bright yellows of sunshine and happiness', fr: 'Jaunes brillants du soleil et bonheur' },
    tags: ['yellow', 'sunshine', 'bright', 'happy']
  },
  
  // Monochrome palettes
  {
    id: 'black-white',
    name: { en: 'Black & White', fr: 'Noir & Blanc' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['⚫', '⚪', '🖤', '🤍', '◼️', '◻️', '▪️', '▫️', '🔳', '🔲', '🎱', '♠️'],
    orderIndex: 7,
    isCustom: false,
    description: { en: 'Classic black and white contrast', fr: 'Contraste classique noir et blanc' },
    tags: ['monochrome', 'classic', 'contrast']
  },
  {
    id: 'grayscale',
    name: { en: 'Grayscale', fr: 'Nuances Gris' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['⚫', '🔘', '🔴', '🟤', '🟫', '⚪', '🔳', '🔲', '◼️', '◻️', '⬛', '⬜'],
    orderIndex: 8,
    isCustom: false,
    description: { en: 'Subtle shades of gray', fr: 'Nuances subtiles de gris' },
    tags: ['grayscale', 'subtle', 'minimal']
  },
  
  // Themed palettes
  {
    id: 'food-party',
    name: { en: 'Food Party', fr: 'Fête Nourriture' },
    category: PaletteCategory.COLOR,
    emojis: ['🍕', '🍔', '🍟', '🌮', '🍩', '🍰', '🍪', '🧁', '🍎', '🍌', '🍓', '🥳'],
    orderIndex: 9,
    isCustom: false,
    description: { en: 'Delicious foods and party vibes', fr: 'Nourritures délicieuses et ambiance fête' },
    tags: ['food', 'party', 'celebration', 'fun']
  },
  {
    id: 'space-galaxy',
    name: { en: 'Space Galaxy', fr: 'Galaxie Espace' },
    category: PaletteCategory.COLOR,
    emojis: ['🚀', '🛸', '🌌', '🌠', '⭐', '🌟', '🪐', '🌕', '🌙', '☄️', '🛰️', '👽'],
    orderIndex: 10,
    isCustom: false,
    description: { en: 'Cosmic wonders and space exploration', fr: 'Merveilles cosmiques et exploration spatiale' },
    tags: ['space', 'galaxy', 'cosmic', 'exploration']
  },
  {
    id: 'animals-cute',
    name: { en: 'Cute Animals', fr: 'Animaux Mignons' },
    category: PaletteCategory.COLOR,
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐥', '🦄'],
    orderIndex: 11,
    isCustom: false,
    description: { en: 'Adorable animals and creatures', fr: 'Animaux et créatures adorables' },
    tags: ['animals', 'cute', 'pets', 'creatures']
  },
  {
    id: 'sports-games',
    name: { en: 'Sports & Games', fr: 'Sports & Jeux' },
    category: PaletteCategory.COLOR,
    emojis: ['⚽', '🏀', '🏈', '🎾', '🏓', '🎯', '🎮', '🎲', '🏆', '🥇', '🎪', '🎨'],
    orderIndex: 12,
    isCustom: false,
    description: { en: 'Sports equipment and gaming fun', fr: 'Équipement sportif et jeux amusants' },
    tags: ['sports', 'games', 'competition', 'fun']
  },
  {
    id: 'music-dance',
    name: { en: 'Music & Dance', fr: 'Musique & Danse' },
    category: PaletteCategory.COLOR,
    emojis: ['🎵', '🎶', '🎤', '🎸', '🥁', '🎹', '🎺', '🎷', '💃', '🕺', '🎭', '🎪'],
    orderIndex: 13,
    isCustom: false,
    description: { en: 'Musical instruments and dance', fr: 'Instruments de musique et danse' },
    tags: ['music', 'dance', 'instruments', 'performance']
  },
  {
    id: 'travel-world',
    name: { en: 'Travel World', fr: 'Voyage Monde' },
    category: PaletteCategory.COLOR,
    emojis: ['✈️', '🚗', '🚢', '🗺️', '🧳', '📷', '🏖️', '🏔️', '🗽', '🗼', '🎒', '🌍'],
    orderIndex: 14,
    isCustom: false,
    description: { en: 'Travel and world exploration', fr: 'Voyage et exploration mondiale' },
    tags: ['travel', 'world', 'exploration', 'adventure']
  },
  {
    id: 'weather-seasons',
    name: { en: 'Weather & Seasons', fr: 'Météo & Saisons' },
    category: PaletteCategory.COLOR,
    emojis: ['☀️', '⛅', '🌧️', '❄️', '🌈', '⛄', '🌸', '🍂', '🌊', '🌪️', '⚡', '🌙'],
    orderIndex: 15,
    isCustom: false,
    description: { en: 'Weather patterns and seasonal changes', fr: 'Conditions météo et changements saisonniers' },
    tags: ['weather', 'seasons', 'nature', 'climate']
  },
  {
    id: 'celebration-party',
    name: { en: 'Celebration Party', fr: 'Fête Célébration' },
    category: PaletteCategory.COLOR,
    emojis: ['🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥳', '🍾', '🎆', '🎇', '🎀', '🎪'],
    orderIndex: 16,
    isCustom: false,
    description: { en: 'Party decorations and celebrations', fr: 'Décorations de fête et célébrations' },
    tags: ['celebration', 'party', 'decorations', 'festive']
  },
  {
    id: 'tech-modern',
    name: { en: 'Tech Modern', fr: 'Technologie Moderne' },
    category: PaletteCategory.COLOR,
    emojis: ['📱', '💻', '⌚', '🎮', '📷', '🎧', '⚡', '🔋', '💾', '🖥️', '🔌', '📡'],
    orderIndex: 17,
    isCustom: false,
    description: { en: 'Modern technology and gadgets', fr: 'Technologie moderne et gadgets' },
    tags: ['technology', 'modern', 'gadgets', 'digital']
  },
  {
    id: 'facial-expressions',
    name: { en: 'Facial Expressions', fr: 'Expressions Faciales' },
    category: PaletteCategory.COLOR,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉'],
    orderIndex: 18,
    isCustom: false,
    description: { en: 'Happy facial expressions and smiles', fr: 'Expressions faciales heureuses et sourires' },
    tags: ['emotions', 'faces', 'happy', 'expressions']
  },
  {
    id: 'symbols-signs',
    name: { en: 'Symbols & Signs', fr: 'Symboles & Signes' },
    category: PaletteCategory.COLOR,
    emojis: ['❤️', '💯', '✨', '⭐', '🔥', '💫', '🌟', '✅', '❌', '⚠️', '📍', '🎯'],
    orderIndex: 19,
    isCustom: false,
    description: { en: 'Common symbols and signs', fr: 'Symboles et signes communs' },
    tags: ['symbols', 'signs', 'communication', 'meaning']
  },
  {
    id: 'geometric-shapes',
    name: { en: 'Geometric Shapes', fr: 'Formes Géométriques' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🔶', '🔷', '🔸'],
    orderIndex: 20,
    isCustom: false,
    description: { en: 'Basic geometric shapes and forms', fr: 'Formes et figures géométriques de base' },
    tags: ['geometric', 'shapes', 'abstract', 'forms']
  },
  {
    id: 'hand-gestures',
    name: { en: 'Hand Gestures', fr: 'Gestes Main' },
    category: PaletteCategory.COLOR,
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '👐', '🤲', '💪'],
    orderIndex: 21,
    isCustom: false,
    description: { en: 'Hand signs and gestures', fr: 'Signes de main et gestes' },
    tags: ['hands', 'gestures', 'communication', 'signs']
  },
  {
    id: 'rainbow-pride',
    name: { en: 'Rainbow Pride', fr: 'Arc-en-ciel Fierté' },
    category: PaletteCategory.COLOR,
    emojis: ['🌈', '❤️', '🧡', '💛', '💚', '💙', '💜', '🏳️‍🌈', '✨', '🌟', '💖', '🌸'],
    orderIndex: 22,
    isCustom: false,
    description: { en: 'Rainbow colors and pride symbols', fr: 'Couleurs arc-en-ciel et symboles de fierté' },
    tags: ['rainbow', 'pride', 'colors', 'diversity']
  },
  {
    id: 'christmas-winter',
    name: { en: 'Christmas Winter', fr: 'Noël Hiver' },
    category: PaletteCategory.COLOR,
    emojis: ['🎄', '🎅', '🤶', '🦌', '⛄', '❄️', '🎁', '🔔', '⭐', '🕯️', '🍪', '🥛'],
    orderIndex: 23,
    isCustom: false,
    description: { en: 'Christmas and winter holiday themes', fr: 'Thèmes de Noël et fêtes d\'hiver' },
    tags: ['christmas', 'winter', 'holiday', 'festive']
  }
];

/**
 * Gets a palette by ID
 * @param id Palette identifier
 * @returns Palette object or undefined
 */
export function getPaletteById(id: string): EmojiPalette | undefined {
  return EMOJI_PALETTES.find(palette => palette.id === id);
}

/**
 * Gets palettes by category
 * @param category Palette category
 * @returns Array of palettes in category
 */
export function getPalettesByCategory(category: PaletteCategory): EmojiPalette[] {
  return EMOJI_PALETTES.filter(palette => palette.category === category);
}

/**
 * Gets the default palette
 * @returns Default hearts-flowers palette
 */
export function getDefaultPalette(): EmojiPalette {
  return EMOJI_PALETTES[0]; // hearts-flowers
}

/**
 * Searches palettes by name or tags
 * @param query Search query
 * @param language Language for search
 * @returns Matching palettes
 */
export function searchPalettes(query: string, language: 'en' | 'fr' = 'en'): EmojiPalette[] {
  const lowercaseQuery = query.toLowerCase();
  
  return EMOJI_PALETTES.filter(palette => {
    const nameMatch = palette.name[language]?.toLowerCase().includes(lowercaseQuery);
    const tagMatch = palette.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery));
    const descriptionMatch = palette.description?.[language]?.toLowerCase().includes(lowercaseQuery);
    
    return nameMatch || tagMatch || descriptionMatch;
  });
}