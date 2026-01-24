/**
 * French translations
 */
import type { TranslationNamespace } from '@/types/i18n';

export const fr: TranslationNamespace = {
  common: {
    // General UI
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    create: 'Créer',
    update: 'Mettre à jour',
    confirm: 'Confirmer',
    yes: 'Oui',
    no: 'Non',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    
    // Time and dates
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    tomorrow: 'Demain',
    now: 'Maintenant',
    
    // Actions
    search: 'Rechercher',
    filter: 'Filtrer',
    sort: 'Trier',
    download: 'Télécharger',
    upload: 'Téléverser',
    share: 'Partager',
    copy: 'Copier',
    paste: 'Coller',
    clear: 'Effacer',
    reset: 'Réinitialiser',
    refresh: 'Actualiser'
  },
  
  navigation: {
    home: 'Accueil',
    patterns: 'Motifs',
    create: 'Créer',
    library: 'Bibliothèque',
    collections: 'Collections',
    settings: 'Paramètres',
    profile: 'Profil',
    help: 'Aide',
    about: 'À propos',
    dashboard: 'Tableau de bord',
    achievements: 'Réussites'
  },
  
  patterns: {
    // Pattern creation
    createPattern: 'Créer un motif',
    newPattern: 'Nouveau motif',
    editPattern: 'Modifier le motif',
    patternName: 'Nom du motif',
    patternDescription: 'Description du motif',
    patternSize: 'Taille du motif',
    patternDifficulty: 'Difficulté',
    patternTags: 'Étiquettes',
    
    // Pattern properties
    theme: 'Thème',
    mood: 'Humeur',
    colors: 'Couleurs',
    complexity: 'Complexité',
    estimatedTime: 'Temps estimé',
    
    // Pattern actions
    savePattern: 'Enregistrer le motif',
    sharePattern: 'Partager le motif',
    duplicatePattern: 'Dupliquer le motif',
    deletePattern: 'Supprimer le motif',
    favoritePattern: 'Ajouter aux favoris',
    unfavoritePattern: 'Retirer des favoris',
    
    // Pattern status
    public: 'Public',
    private: 'Privé',
    shared: 'Partagé',
    draft: 'Brouillon',
    published: 'Publié',
    
    // Themes
    themes: {
      nature: 'Nature',
      emotions: 'Émotions',
      food: 'Nourriture',
      travel: 'Voyage',
      animals: 'Animaux',
      abstract: 'Abstrait',
      seasonal: 'Saisonnier',
      celebration: 'Célébration',
      tech: 'Technologie',
      sports: 'Sports'
    },
    
    // Moods
    moods: {
      happy: 'Joyeux',
      calm: 'Calme',
      energetic: 'Énergique',
      romantic: 'Romantique',
      mysterious: 'Mystérieux',
      playful: 'Joueur',
      elegant: 'Élégant',
      bold: 'Audacieux',
      peaceful: 'Paisible'
    },
    
    // Difficulties
    difficulties: {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
      expert: 'Expert'
    }
  },
  
  ai: {
    // AI generation
    generatePattern: 'Générer un motif',
    aiSuggestion: 'Suggestion IA',
    aiGenerated: 'Généré par IA',
    generateWithAI: 'Générer avec IA',
    customPrompt: 'Commande personnalisée',
    
    // AI features
    smartSuggestions: 'Suggestions intelligentes',
    patternAnalysis: 'Analyse de motif',
    improvementTips: 'Conseils d\'amélioration',
    similarPatterns: 'Motifs similaires',
    
    // AI status
    aiThinking: 'L\'IA réfléchit...',
    aiProcessing: 'L\'IA traite votre demande...',
    aiError: 'Service IA temporairement indisponible',
    aiUnavailable: 'Les fonctionnalités IA sont actuellement indisponibles',
    aiFallback: 'Utilisation de la génération locale à la place',
    
    // AI settings
    aiPreferences: 'Préférences IA',
    aiLanguage: 'Langue de l\'IA',
    aiCreativity: 'Niveau de créativité',
    aiComplexity: 'Préférence de complexité'
  },
  
  voice: {
    // Voice controls
    voiceCommands: 'Commandes vocales',
    startListening: 'Activer les commandes vocales',
    stopListening: 'Désactiver les commandes vocales',
    voiceSettings: 'Paramètres vocaux',
    
    // Voice feedback
    listeningOn: 'Commandes vocales actives',
    listeningOff: 'Commandes vocales désactivées',
    commandRecognized: 'Commande reconnue',
    commandNotRecognized: 'Commande non reconnue',
    
    // Voice help
    voiceHelp: 'Aide vocale',
    availableCommands: 'Commandes disponibles',
    exampleCommands: 'Exemples de commandes',
    
    // Voice commands descriptions
    commands: {
      generatePattern: 'Dites "générer un motif" pour créer un nouveau motif',
      savePattern: 'Dites "sauvegarder le motif" pour enregistrer votre travail',
      clearCanvas: 'Dites "effacer le canvas" pour recommencer',
      changeTheme: 'Dites "changer le thème pour [thème]" pour changer de thème',
      changeMood: 'Dites "changer l\'humeur pour [humeur]" pour définir l\'humeur',
      changeSize: 'Dites "définir la taille [nombre]" pour changer la taille du motif',
      undo: 'Dites "annuler" pour annuler la dernière action',
      redo: 'Dites "rétablir" pour rétablir la dernière action annulée',
      help: 'Dites "aide" pour entendre les commandes disponibles'
    }
  },
  
  accessibility: {
    // General accessibility
    accessibility: 'Accessibilité',
    accessibilitySettings: 'Paramètres d\'accessibilité',
    screenReader: 'Lecteur d\'écran',
    keyboardNavigation: 'Navigation au clavier',
    
    // Visual accessibility
    highContrast: 'Contraste élevé',
    largeText: 'Texte agrandi',
    reducedMotion: 'Mouvement réduit',
    colorBlindness: 'Support daltonisme',
    
    // Motor accessibility
    touchTargets: 'Cibles tactiles agrandies',
    gestureAlternatives: 'Alternatives aux gestes',
    voiceControl: 'Contrôle vocal',
    
    // Audio accessibility
    audioFeedback: 'Retour audio',
    hapticFeedback: 'Retour haptique',
    visualIndicators: 'Indicateurs visuels',
    
    // Accessibility announcements
    announcements: {
      patternCreated: 'Motif créé avec succès',
      patternSaved: 'Motif enregistré dans votre bibliothèque',
      patternDeleted: 'Motif supprimé',
      cellSelected: 'Cellule sélectionnée',
      modeChanged: 'Mode changé',
      pageLoaded: 'Page chargée',
      errorOccurred: 'Une erreur s\'est produite',
      actionCompleted: 'Action terminée'
    }
  },
  
  export: {
    // Export options
    export: 'Exporter',
    exportPattern: 'Exporter le motif',
    exportCollection: 'Exporter la collection',
    exportFormat: 'Format d\'export',
    
    // Export formats
    formats: {
      pdf: 'Document PDF',
      png: 'Image PNG',
      jpg: 'Image JPEG',
      svg: 'Vecteur SVG',
      json: 'Données JSON',
      csv: 'Tableur CSV',
      txt: 'Fichier texte'
    },
    
    // Export settings
    exportSettings: 'Paramètres d\'export',
    resolution: 'Résolution',
    quality: 'Qualité',
    includeMetadata: 'Inclure les métadonnées',
    includeTimestamp: 'Inclure l\'horodatage',
    
    // Export status
    preparing: 'Préparation de l\'export...',
    generating: 'Génération du fichier...',
    downloading: 'Téléchargement...',
    completed: 'Export terminé',
    failed: 'Échec de l\'export'
  },
  
  sharing: {
    // Sharing options
    share: 'Partager',
    sharePattern: 'Partager le motif',
    shareCollection: 'Partager la collection',
    shareLink: 'Lien de partage',
    
    // Sharing platforms
    platforms: {
      email: 'Email',
      socialMedia: 'Réseaux sociaux',
      directLink: 'Lien direct',
      qrCode: 'Code QR',
      embed: 'Code d\'intégration'
    },
    
    // Privacy settings
    privacySettings: 'Paramètres de confidentialité',
    publicShare: 'Partage public',
    privateShare: 'Partage privé',
    linkExpiration: 'Expiration du lien',
    passwordProtected: 'Protégé par mot de passe',
    
    // Sharing status
    linkCopied: 'Lien copié dans le presse-papiers',
    sharePreparing: 'Préparation du partage...',
    shareReady: 'Lien de partage prêt',
    shareError: 'Échec de la création du lien de partage'
  },
  
  errors: {
    // General errors
    error: 'Erreur',
    unknownError: 'Une erreur inconnue s\'est produite',
    networkError: 'Erreur de connexion réseau',
    serverError: 'Erreur serveur',
    
    // Specific errors
    patternNotFound: 'Motif introuvable',
    patternSaveError: 'Échec de l\'enregistrement du motif',
    patternLoadError: 'Échec du chargement du motif',
    invalidPattern: 'Données de motif invalides',
    
    // Permission errors
    permissionDenied: 'Permission refusée',
    unauthorized: 'Accès non autorisé',
    accessRestricted: 'Accès restreint',
    
    // Validation errors
    required: 'Ce champ est obligatoire',
    invalid: 'Saisie invalide',
    tooShort: 'Saisie trop courte',
    tooLong: 'Saisie trop longue',
    invalidFormat: 'Format invalide'
  },
  
  validation: {
    // Field validation
    fieldRequired: (field: string) => `${field} est obligatoire`,
    fieldTooShort: (field: string, min: number) => `${field} doit faire au moins ${min} caractères`,
    fieldTooLong: (field: string, max: number) => `${field} ne doit pas dépasser ${max} caractères`,
    fieldInvalid: (field: string) => `${field} est invalide`,
    
    // Pattern validation
    patternEmpty: 'Le motif ne peut pas être vide',
    patternTooSmall: 'Le motif est trop petit',
    patternTooLarge: 'Le motif est trop grand',
    patternInvalid: 'Les données du motif sont invalides',
    
    // User input validation
    emailInvalid: 'Veuillez saisir une adresse email valide',
    passwordWeak: 'Le mot de passe est trop faible',
    nameInvalid: 'Veuillez saisir un nom valide'
  }
};