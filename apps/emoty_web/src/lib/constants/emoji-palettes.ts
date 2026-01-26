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
    emojis: ['🌊', '💙', '💎', '🔵', '🟦', '🐋', '🐟', '🐠', '🦈', '🌀', '💧', '❄️', '🐚', '🦀', '🐳', '🐬', '🐙', '🦑', '🐡', '🦞', '⚓'],
    orderIndex: 2,
    isCustom: false,
    description: { en: 'Blues of the ocean and sea life', fr: 'Bleus de l\'océan et vie marine' },
    tags: ['ocean', 'blue', 'water', 'sea']
  },
  {
    id: 'forest-green',
    name: { en: 'Forest Green', fr: 'Vert Forêt' },
    category: PaletteCategory.COLOR,
    emojis: ['🌲', '🌳', '🌿', '🍀', '🌱', '🥒', '🥬', '🥝', '💚', '✅', '🟢', '🔋', '🐸', '🐢', '🐊', '🦎', '🐍', '🐲', '🌵', '🎄', '🎋'],
    orderIndex: 3,
    isCustom: false,
    description: { en: 'Rich greens of nature and growth', fr: 'Verts riches de la nature et croissance' },
    tags: ['nature', 'green', 'forest', 'growth']
  },
  {
    id: 'sunset-orange',
    name: { en: 'Sunset Orange', fr: 'Orange Coucher' },
    category: PaletteCategory.COLOR,
    emojis: ['🧡', '🔥', '🌅', '🌄', '🍊', '🥕', '🎃', '🦊', '🟠', '⚡', '☄️', '🏀', '🦁', '🐯', '🐱', '🔸', '🔶', '✴️', '🉑', '☢️', '☣️'],
    orderIndex: 4,
    isCustom: false,
    description: { en: 'Warm oranges of sunset and energy', fr: 'Oranges chauds du coucher de soleil et énergie' },
    tags: ['sunset', 'orange', 'warm', 'energy']
  },
  {
    id: 'royal-purple',
    name: { en: 'Royal Purple', fr: 'Violet Royal' },
    category: PaletteCategory.COLOR,
    emojis: ['💜', '🔮', '🍇', '🍆', '🟣', '⚗️', '🎆', '👑', '🦄', '🌸', '☂️', '🎭', '😈', '👾', '👿', '🌂', '🕎', '☮️', '🔯', '⚛️', '🛐'],
    orderIndex: 5,
    isCustom: false,
    description: { en: 'Majestic purples and magical items', fr: 'Violets majestueux et objets magiques' },
    tags: ['purple', 'royal', 'magic', 'fantasy']
  },
  {
    id: 'sunshine-yellow',
    name: { en: 'Sunshine Yellow', fr: 'Jaune Soleil' },
    category: PaletteCategory.COLOR,
    emojis: ['💛', '☀️', '🌟', '⭐', '🌞', '🌝', '🍋', '🌻', '🟡', '⚡', '🔆', '💡', '🐥', '🐣', '🐤', '🐝', '🧀', '🍌', '📒', '⚠️', '🔱'],
    orderIndex: 6,
    isCustom: false,
    description: { en: 'Bright yellows of sunshine and happiness', fr: 'Jaunes brillants du soleil et bonheur' },
    tags: ['yellow', 'sunshine', 'bright', 'happy']
  },
  
  // Themed palettes
  {
    id: 'food-party',
    name: { en: 'Food Party', fr: 'Fête Nourriture' },
    category: PaletteCategory.COLOR,
    emojis: ['🍕', '🍔', '🍟', '🌮', '🍩', '🍰', '🍪', '🧁', '🍎', '🍌', '🍓', '🥳', '🥞', '🥨', '🥐', '🥯', '🥖', '🌭', '🥪', '🍖', '🍗'],
    orderIndex: 7,
    isCustom: false,
    description: { en: 'Delicious foods and party vibes', fr: 'Nourritures délicieuses et ambiance fête' },
    tags: ['food', 'party', 'celebration', 'fun']
  },
  {
    id: 'space-galaxy',
    name: { en: 'Space Galaxy', fr: 'Galaxie Espace' },
    category: PaletteCategory.COLOR,
    emojis: ['🚀', '🛸', '🌌', '🌠', '⭐', '🌟', '🪐', '🌕', '🌙', '☄️', '🛰️', '👽', '🌑', '🌒', '🌓', '🌔', '🌖', '🌗', '🌘', '🌎', '🌍'],
    orderIndex: 8,
    isCustom: false,
    description: { en: 'Cosmic wonders and space exploration', fr: 'Merveilles cosmiques et exploration spatiale' },
    tags: ['space', 'galaxy', 'cosmic', 'exploration']
  },
  {
    id: 'animals-cute',
    name: { en: 'Cute Animals', fr: 'Animaux Mignons' },
    category: PaletteCategory.COLOR,
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐥', '🦄', '🐯', '🦁', '🐮', '🐷', '🐵', '🐒', '🐔', '🐧', '🐦'],
    orderIndex: 9,
    isCustom: false,
    description: { en: 'Adorable animals and creatures', fr: 'Animaux et créatures adorables' },
    tags: ['animals', 'cute', 'pets', 'creatures']
  },
  {
    id: 'sports-games',
    name: { en: 'Sports & Games', fr: 'Sports & Jeux' },
    category: PaletteCategory.COLOR,
    emojis: ['⚽', '🏀', '🏈', '🎾', '🏓', '🎯', '🎮', '🎲', '🏆', '🥇', '🎪', '🎨', '🏐', '🏸', '🥊', '🎿', '⛷️', '🏂', '🚴‍♀️', '🏃‍♂️', '🏊‍♀️'],
    orderIndex: 10,
    isCustom: false,
    description: { en: 'Sports equipment and gaming fun', fr: 'Équipement sportif et jeux amusants' },
    tags: ['sports', 'games', 'competition', 'fun']
  },
  {
    id: 'music-dance',
    name: { en: 'Music & Dance', fr: 'Musique & Danse' },
    category: PaletteCategory.COLOR,
    emojis: ['🎵', '🎶', '🎤', '🎸', '🥁', '🎹', '🎺', '🎷', '💃', '🕺', '🎭', '🎪', '🎧', '🎼', '🎻', '🪕', '🎬', '🖼️', '📷', '🎯', '🎲'],
    orderIndex: 11,
    isCustom: false,
    description: { en: 'Musical instruments and dance', fr: 'Instruments de musique et danse' },
    tags: ['music', 'dance', 'instruments', 'performance']
  },
  {
    id: 'travel-world',
    name: { en: 'Travel World', fr: 'Voyage Monde' },
    category: PaletteCategory.COLOR,
    emojis: ['✈️', '🚗', '🚢', '🗺️', '🧳', '📷', '🏖️', '🏔️', '🗽', '🗼', '🎒', '🌍', '🚆', '🚇', '🚍', '🚔', '🚘', '🚖', '🚲', '🛴', '🛵'],
    orderIndex: 12,
    isCustom: false,
    description: { en: 'Travel and world exploration', fr: 'Voyage et exploration mondiale' },
    tags: ['travel', 'world', 'exploration', 'adventure']
  },
  {
    id: 'weather-seasons',
    name: { en: 'Weather & Seasons', fr: 'Météo & Saisons' },
    category: PaletteCategory.COLOR,
    emojis: ['☀️', '⛅', '🌧️', '❄️', '🌈', '⛄', '🌸', '🍂', '🌊', '🌪️', '⚡', '🌙', '⛈️', '🌤️', '☁️', '🌨️', '💧', '🔥', '🌡️', '🌬️', '🌦️'],
    orderIndex: 13,
    isCustom: false,
    description: { en: 'Weather patterns and seasonal changes', fr: 'Conditions météo et changements saisonniers' },
    tags: ['weather', 'seasons', 'nature', 'climate']
  },
  {
    id: 'celebration-party',
    name: { en: 'Celebration Party', fr: 'Fête Célébration' },
    category: PaletteCategory.COLOR,
    emojis: ['🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥳', '🍾', '🎆', '🎇', '🎀', '🎪', '🥂', '🎗️', '🥇', '🎯', '🎭', '🎨', '🎸', '🎵', '🎼'],
    orderIndex: 14,
    isCustom: false,
    description: { en: 'Party decorations and celebrations', fr: 'Décorations de fête et célébrations' },
    tags: ['celebration', 'party', 'decorations', 'festive']
  },
  {
    id: 'tech-modern',
    name: { en: 'Tech Modern', fr: 'Technologie Moderne' },
    category: PaletteCategory.COLOR,
    emojis: ['📱', '💻', '⌚', '🎮', '📷', '🎧', '⚡', '🔋', '💾', '🖥️', '🔌', '📡', '🔧', '🚀', '💡', '🔊', '📀', '⚙️', '🖨️', '📟', '🛰️'],
    orderIndex: 15,
    isCustom: false,
    description: { en: 'Modern technology and gadgets', fr: 'Technologie moderne et gadgets' },
    tags: ['technology', 'modern', 'gadgets', 'digital']
  },
  {
    id: 'facial-expressions',
    name: { en: 'Facial Expressions', fr: 'Expressions Faciales' },
    category: PaletteCategory.COLOR,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '😋'],
    orderIndex: 16,
    isCustom: false,
    description: { en: 'Happy facial expressions and smiles', fr: 'Expressions faciales heureuses et sourires' },
    tags: ['emotions', 'faces', 'happy', 'expressions']
  },
  {
    id: 'rainbow-hearts',
    name: { en: 'Rainbow Hearts', fr: 'Cœurs Arc-en-ciel' },
    category: PaletteCategory.COLOR,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯'],
    orderIndex: 17,
    isCustom: false,
    description: { en: 'Colorful hearts in every shade', fr: 'Cœurs colorés dans toutes les nuances' },
    tags: ['hearts', 'rainbow', 'colors', 'love']
  },
  {
    id: 'text-typography',
    name: { en: 'Text & Typography', fr: 'Texte & Typographie' },
    category: PaletteCategory.COLOR,
    emojis: ['🅰️', '🅱️', '🆎', '🆑', '🅾️', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '❗', '❓', '‼️', '⁉️', '✅', '❌'],
    orderIndex: 18,
    isCustom: false,
    description: { en: 'Letters, numbers, and text symbols', fr: 'Lettres, nombres et symboles de texte' },
    tags: ['text', 'letters', 'numbers', 'symbols']
  },

  // Monochrome palettes (Ported from Android)
  {
    id: 'black-white-symbols',
    name: { en: 'Black & White Symbols', fr: 'Symboles Noir & Blanc' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['⚫', '⚪', '◼️', '◻️', '▪️', '▫️', '⬛', '⬜', '◾', '◽', '❌', '✖️', '➕', '➖', '✔️', '☑️', '✅', '❎', '⭕', '🔘', '🔳'],
    orderIndex: 19,
    isCustom: false,
    description: { en: 'Pure monochrome symbols', fr: 'Symboles monochromes purs' },
    tags: ['monochrome', 'symbols', 'black', 'white']
  },
  {
    id: 'basic-shapes',
    name: { en: 'Basic Shapes', fr: 'Formes de Base' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['⬛', '⬜', '◼️', '◻️', '▪️', '▫️', '◾', '◽', '⚫', '⚪', '◆', '◇', '◈', '○', '●', '◐', '◑', '◒', '◓', '◔', '◕'],
    orderIndex: 20,
    isCustom: false,
    description: { en: 'Simple geometric shapes', fr: 'Formes géométriques simples' },
    tags: ['shapes', 'geometric', 'simple']
  },
  {
    id: 'simple-arrows',
    name: { en: 'Simple Arrows', fr: 'Flèches Simples' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['⬆️', '⬇️', '⬅️', '➡️', '↖️', '↗️', '↘️', '↙️', '↩️', '↪️', '⤴️', '⤵️', '🔄', '🔃', '🔂', '🔁', '⏪', '⏫', '⏬', '⏩', '🔀'],
    orderIndex: 21,
    isCustom: false,
    description: { en: 'Basic directional arrows', fr: 'Flèches directionnelles de base' },
    tags: ['arrows', 'direction', 'navigation']
  },
  {
    id: 'check-marks',
    name: { en: 'Check Marks', fr: 'Coches & Signes' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['✔️', '✅', '☑️', '❌', '❎', '✖️', '➕', '➖', '➗', '➰', '➿', '❓', '❗', '‼️', '⁉️', '❕', '❔', '☢️', '☣️', '⚠️', '⛔'],
    orderIndex: 22,
    isCustom: false,
    description: { en: 'Checkmarks and basic symbols', fr: 'Coches et symboles de base' },
    tags: ['check', 'marks', 'symbols', 'sign']
  },
  {
    id: 'card-suits',
    name: { en: 'Card Suits', fr: 'Enseignes de Cartes' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['♠️', '♥️', '♦️', '♣️', '♠', '♥', '♦', '♣', '♟️', '♞', '♝', '♜', '♛', '♚', '♙', '♘', '♗', '♖', '♕', '♔', '⚪'],
    orderIndex: 23,
    isCustom: false,
    description: { en: 'Playing card suit symbols', fr: 'Symboles de cartes à jouer' },
    tags: ['cards', 'games', 'suits', 'poker']
  },
  {
    id: 'office-symbols',
    name: { en: 'Office Symbols', fr: 'Symboles de Bureau' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['✏️', '✒️', '✂️', '🔍', '🔎', '🔗', '📎', '📏', '⛓️', '⚙️', '⛏️', '⛑️', '⚒️', '⚰️', '⚱️', '⚖️', '⚡', '✨', '✴️', '✳️', '©️'],
    orderIndex: 24,
    isCustom: false,
    description: { en: 'Basic office and utility symbols', fr: 'Symboles de bureau et utilitaires' },
    tags: ['office', 'utility', 'work', 'tools']
  },
  {
    id: 'math-symbols',
    name: { en: 'Math Symbols', fr: 'Symboles Maths' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['➕', '➖', '✖️', '♾️', '➗', '=', '<', '>', '±', '×', '÷', '∞', '∑', '∆', '∇', '∈', '∉', '∋', '∌', '−', '¬'],
    orderIndex: 25,
    isCustom: false,
    description: { en: 'Basic mathematical operators', fr: 'Opérateurs mathématiques de base' },
    tags: ['math', 'numbers', 'calculation']
  },
  {
    id: 'punctuation',
    name: { en: 'Punctuation', fr: 'Ponctuation' },
    category: PaletteCategory.MONOCHROME,
    emojis: ['.', ',', ';', ':', '!', '?', '-', '_', '(', ')', '[', ']', '{', '}', '"', "'", '`', '~', '@', '#', '&'],
    orderIndex: 26,
    isCustom: false,
    description: { en: 'Basic punctuation symbols', fr: 'Symboles de ponctuation' },
    tags: ['punctuation', 'text', 'grammar']
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
