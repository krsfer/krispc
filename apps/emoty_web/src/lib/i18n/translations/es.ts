/**
 * Spanish translations
 */
import type { TranslationNamespace } from '@/types/i18n';

export const es: TranslationNamespace = {
  common: {
    // General UI
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    update: 'Actualizar',
    confirm: 'Confirmar',
    yes: 'Sí',
    no: 'No',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    
    // Time and dates
    today: 'Hoy',
    yesterday: 'Ayer',
    tomorrow: 'Mañana',
    now: 'Ahora',
    
    // Actions
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    download: 'Descargar',
    upload: 'Subir',
    share: 'Compartir',
    copy: 'Copiar',
    paste: 'Pegar',
    clear: 'Limpiar',
    reset: 'Restablecer',
    refresh: 'Actualizar'
  },
  
  navigation: {
    home: 'Inicio',
    patterns: 'Patrones',
    create: 'Crear',
    library: 'Biblioteca',
    collections: 'Colecciones',
    settings: 'Configuración',
    profile: 'Perfil',
    help: 'Ayuda',
    about: 'Acerca de',
    dashboard: 'Panel',
    achievements: 'Logros'
  },
  
  patterns: {
    // Pattern creation
    createPattern: 'Crear patrón',
    newPattern: 'Nuevo patrón',
    editPattern: 'Editar patrón',
    patternName: 'Nombre del patrón',
    patternDescription: 'Descripción del patrón',
    patternSize: 'Tamaño del patrón',
    patternDifficulty: 'Dificultad',
    patternTags: 'Etiquetas',
    
    // Pattern properties
    theme: 'Tema',
    mood: 'Estado de ánimo',
    colors: 'Colores',
    complexity: 'Complejidad',
    estimatedTime: 'Tiempo estimado',
    
    // Pattern actions
    savePattern: 'Guardar patrón',
    sharePattern: 'Compartir patrón',
    duplicatePattern: 'Duplicar patrón',
    deletePattern: 'Eliminar patrón',
    favoritePattern: 'Añadir a favoritos',
    unfavoritePattern: 'Quitar de favoritos',
    
    // Pattern status
    public: 'Público',
    private: 'Privado',
    shared: 'Compartido',
    draft: 'Borrador',
    published: 'Publicado',
    
    // Themes
    themes: {
      nature: 'Naturaleza',
      emotions: 'Emociones',
      food: 'Comida',
      travel: 'Viaje',
      animals: 'Animales',
      abstract: 'Abstracto',
      seasonal: 'Estacional',
      celebration: 'Celebración',
      tech: 'Tecnología',
      sports: 'Deportes'
    },
    
    // Moods
    moods: {
      happy: 'Feliz',
      calm: 'Tranquilo',
      energetic: 'Enérgico',
      romantic: 'Romántico',
      mysterious: 'Misterioso',
      playful: 'Juguetón',
      elegant: 'Elegante',
      bold: 'Audaz',
      peaceful: 'Pacífico'
    },
    
    // Difficulties
    difficulties: {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
      expert: 'Experto'
    }
  },
  
  ai: {
    // AI generation
    generatePattern: 'Generar patrón',
    aiSuggestion: 'Sugerencia IA',
    aiGenerated: 'Generado por IA',
    generateWithAI: 'Generar con IA',
    customPrompt: 'Comando personalizado',
    
    // AI features
    smartSuggestions: 'Sugerencias inteligentes',
    patternAnalysis: 'Análisis de patrón',
    improvementTips: 'Consejos de mejora',
    similarPatterns: 'Patrones similares',
    
    // AI status
    aiThinking: 'La IA está pensando...',
    aiProcessing: 'La IA está procesando tu solicitud...',
    aiError: 'Servicio IA temporalmente no disponible',
    aiUnavailable: 'Las funciones de IA no están disponibles actualmente',
    aiFallback: 'Usando generación local en su lugar',
    
    // AI settings
    aiPreferences: 'Preferencias de IA',
    aiLanguage: 'Idioma de la IA',
    aiCreativity: 'Nivel de creatividad',
    aiComplexity: 'Preferencia de complejidad'
  },
  
  voice: {
    // Voice controls
    voiceCommands: 'Comandos de voz',
    startListening: 'Activar comandos de voz',
    stopListening: 'Desactivar comandos de voz',
    voiceSettings: 'Configuración de voz',
    
    // Voice feedback
    listeningOn: 'Comandos de voz activos',
    listeningOff: 'Comandos de voz desactivados',
    commandRecognized: 'Comando reconocido',
    commandNotRecognized: 'Comando no reconocido',
    
    // Voice help
    voiceHelp: 'Ayuda de voz',
    availableCommands: 'Comandos disponibles',
    exampleCommands: 'Comandos de ejemplo',
    
    // Voice commands descriptions
    commands: {
      generatePattern: 'Di "generar patrón" para crear un nuevo patrón',
      savePattern: 'Di "guardar patrón" para guardar tu trabajo',
      clearCanvas: 'Di "limpiar lienzo" para empezar de nuevo',
      changeTheme: 'Di "cambiar tema a [tema]" para cambiar temas',
      changeMood: 'Di "cambiar estado de ánimo a [ánimo]" para establecer el ánimo',
      changeSize: 'Di "establecer tamaño [número]" para cambiar el tamaño del patrón',
      undo: 'Di "deshacer" para deshacer la última acción',
      redo: 'Di "rehacer" para rehacer la última acción deshecha',
      help: 'Di "ayuda" para escuchar los comandos disponibles'
    }
  },
  
  accessibility: {
    // General accessibility
    accessibility: 'Accesibilidad',
    accessibilitySettings: 'Configuración de accesibilidad',
    screenReader: 'Lector de pantalla',
    keyboardNavigation: 'Navegación por teclado',
    
    // Visual accessibility
    highContrast: 'Alto contraste',
    largeText: 'Texto grande',
    reducedMotion: 'Movimiento reducido',
    colorBlindness: 'Soporte para daltonismo',
    
    // Motor accessibility
    touchTargets: 'Objetivos táctiles grandes',
    gestureAlternatives: 'Alternativas a gestos',
    voiceControl: 'Control por voz',
    
    // Audio accessibility
    audioFeedback: 'Retroalimentación de audio',
    hapticFeedback: 'Retroalimentación háptica',
    visualIndicators: 'Indicadores visuales',
    
    // Accessibility announcements
    announcements: {
      patternCreated: 'Patrón creado exitosamente',
      patternSaved: 'Patrón guardado en tu biblioteca',
      patternDeleted: 'Patrón eliminado',
      cellSelected: 'Celda seleccionada',
      modeChanged: 'Modo cambiado',
      pageLoaded: 'Página cargada',
      errorOccurred: 'Ocurrió un error',
      actionCompleted: 'Acción completada'
    }
  },
  
  export: {
    // Export options
    export: 'Exportar',
    exportPattern: 'Exportar patrón',
    exportCollection: 'Exportar colección',
    exportFormat: 'Formato de exportación',
    
    // Export formats
    formats: {
      pdf: 'Documento PDF',
      png: 'Imagen PNG',
      jpg: 'Imagen JPEG',
      svg: 'Vector SVG',
      json: 'Datos JSON',
      csv: 'Hoja de cálculo CSV',
      txt: 'Archivo de texto'
    },
    
    // Export settings
    exportSettings: 'Configuración de exportación',
    resolution: 'Resolución',
    quality: 'Calidad',
    includeMetadata: 'Incluir metadatos',
    includeTimestamp: 'Incluir marca de tiempo',
    
    // Export status
    preparing: 'Preparando exportación...',
    generating: 'Generando archivo...',
    downloading: 'Descargando...',
    completed: 'Exportación completada',
    failed: 'Exportación fallida'
  },
  
  sharing: {
    // Sharing options
    share: 'Compartir',
    sharePattern: 'Compartir patrón',
    shareCollection: 'Compartir colección',
    shareLink: 'Enlace para compartir',
    
    // Sharing platforms
    platforms: {
      email: 'Correo electrónico',
      socialMedia: 'Redes sociales',
      directLink: 'Enlace directo',
      qrCode: 'Código QR',
      embed: 'Código de inserción'
    },
    
    // Privacy settings
    privacySettings: 'Configuración de privacidad',
    publicShare: 'Compartir público',
    privateShare: 'Compartir privado',
    linkExpiration: 'Expiración del enlace',
    passwordProtected: 'Protegido con contraseña',
    
    // Sharing status
    linkCopied: 'Enlace copiado al portapapeles',
    sharePreparing: 'Preparando para compartir...',
    shareReady: 'Enlace para compartir listo',
    shareError: 'Error al crear enlace para compartir'
  },
  
  errors: {
    // General errors
    error: 'Error',
    unknownError: 'Ocurrió un error desconocido',
    networkError: 'Error de conexión de red',
    serverError: 'Error del servidor',
    
    // Specific errors
    patternNotFound: 'Patrón no encontrado',
    patternSaveError: 'Error al guardar patrón',
    patternLoadError: 'Error al cargar patrón',
    invalidPattern: 'Datos de patrón inválidos',
    
    // Permission errors
    permissionDenied: 'Permiso denegado',
    unauthorized: 'Acceso no autorizado',
    accessRestricted: 'Acceso restringido',
    
    // Validation errors
    required: 'Este campo es obligatorio',
    invalid: 'Entrada inválida',
    tooShort: 'Entrada demasiado corta',
    tooLong: 'Entrada demasiado larga',
    invalidFormat: 'Formato inválido'
  },
  
  validation: {
    // Field validation
    fieldRequired: (field: string) => `${field} es obligatorio`,
    fieldTooShort: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
    fieldTooLong: (field: string, max: number) => `${field} no debe exceder ${max} caracteres`,
    fieldInvalid: (field: string) => `${field} es inválido`,
    
    // Pattern validation
    patternEmpty: 'El patrón no puede estar vacío',
    patternTooSmall: 'El patrón es demasiado pequeño',
    patternTooLarge: 'El patrón es demasiado grande',
    patternInvalid: 'Los datos del patrón son inválidos',
    
    // User input validation
    emailInvalid: 'Por favor introduce una dirección de correo válida',
    passwordWeak: 'La contraseña es demasiado débil',
    nameInvalid: 'Por favor introduce un nombre válido'
  }
};