# Emoty Web App 🎨

A beautiful emoji pattern creator built with Next.js 15, TypeScript, and Bootstrap 5. Create stunning concentric square patterns with AI assistance, voice commands, and accessibility-first design.

## ✨ Features

### Phase 1 - Core Foundation (Implemented)
- 🎯 **Pattern Creation Engine**: Generate concentric square emoji patterns
- 🎨 **HTML5 Canvas Visualization**: Interactive pattern display with 60fps rendering
- 🎪 **23 Curated Emoji Palettes**: Color-themed and monochrome collections
- 🔄 **Horizontal Palette Carousel**: Smooth navigation between emoji themes
- ♿ **Accessibility-First Design**: WCAG 2.1 AA compliant with screen reader support
- 📱 **Responsive Design**: Bootstrap 5 grid system with mobile optimization

### Coming Soon
- 🤖 **AI Pattern Generation**: Anthropic Claude integration for intelligent suggestions
- 🎤 **Voice Commands**: Multilingual speech recognition (English/French)
- 💾 **Pattern Saving**: Personal collections and favorites
- 🚀 **Real-time Collaboration**: Share patterns with friends

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Railway Deployment

```bash
# Deploy to Railway
railway up

# Or connect GitHub repository for auto-deployment
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.4
- **Styling**: Bootstrap 5.3.2
- **Canvas**: HTML5 Canvas API
- **Deployment**: Railway with PostgreSQL
- **Testing**: Jest + Playwright + Jest-Axe

## 📁 Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx       # Root layout with accessibility setup
│   ├── page.tsx         # Main pattern creation page
│   ├── globals.css      # Global styles and CSS variables
│   └── api/             # API routes
├── components/          # React components
│   ├── PatternCanvas.tsx         # Interactive pattern visualization
│   └── EmojiPaletteCarousel.tsx  # Emoji selection interface
├── lib/                 # Utilities and business logic
│   ├── utils/
│   │   └── pattern-generator.ts  # Core pattern algorithms
│   └── constants/
│       └── emoji-palettes.ts     # 23 curated emoji themes
└── types/              # TypeScript type definitions
    └── pattern.ts      # Core data structures
```

## 🎯 Pattern Creation

1. **Choose a Palette**: Browse 23 themed collections (Hearts & Flowers, Ocean Waves, etc.)
2. **Select Emojis**: Click emojis to add them to your pattern sequence
3. **Watch Magic Happen**: See your concentric square pattern grow automatically
4. **Interact**: Use keyboard navigation and voice commands (coming soon)

## ♿ Accessibility Features

- **Screen Reader Support**: Comprehensive ARIA labels and live announcements
- **Keyboard Navigation**: Full functionality without mouse
- **High Contrast Mode**: Automatic adaptation for visual impairments
- **Reduced Motion**: Respects user preferences for animations
- **Touch Targets**: 44px minimum size for mobile accessibility
- **Semantic HTML**: Proper heading structure and landmarks

## 🎨 Available Palettes

### Color Themes
- ❤️ Hearts & Flowers
- 🌊 Ocean Waves  
- 🌲 Forest Green
- 🧡 Sunset Orange
- 💜 Royal Purple
- ☀️ Sunshine Yellow

### Themed Collections
- 🍕 Food Party
- 🚀 Space Galaxy
- 🐶 Cute Animals
- ⚽ Sports & Games
- 🎵 Music & Dance
- ✈️ Travel World

### Special Collections
- ⚫ Black & White
- 📱 Tech Modern
- 🌈 Rainbow Pride
- 🎄 Christmas Winter

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run type-check

# Accessibility testing
npm run test:accessibility

# End-to-end testing
npm run test:e2e
```

## 🚀 Deployment

### Railway Configuration

The app is configured for Railway deployment with:
- Automatic builds with Nixpacks
- Health check endpoint at `/api/health`
- Environment variables for production
- PostgreSQL database integration (Phase 2)

### Environment Variables

```env
NODE_ENV=production
PORT=3000
# DATABASE_URL (automatically set by Railway)
# ANTHROPIC_API_KEY (for AI features in Phase 2)
```

## 📊 Performance

- **First Contentful Paint**: < 1.5s
- **Pattern Rendering**: < 100ms for 10x10 grids
- **Bundle Size**: 111KB First Load JS
- **Canvas Performance**: 60fps rendering target

## 🔮 Roadmap

### Phase 2 - AI Integration (4 weeks)
- Anthropic Claude API integration
- Natural language pattern generation
- Multi-language support (English/French)
- Pattern export and sharing

### Phase 3 - Advanced Features (4 weeks)
- Voice recognition and commands
- Real-time collaboration
- Pattern templates library
- Advanced animation effects

### Phase 4 - Platform & Community (4 weeks)
- User accounts and authentication
- Pattern marketplace
- Mobile app (React Native)
- Community features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Android Emoty App**: Original inspiration and design patterns
- **Bootstrap Team**: Excellent component library and accessibility standards
- **Next.js Team**: Outstanding React framework with incredible DX
- **Anthropic**: AI partnership for pattern generation features

---

**Built with ❤️ by the Emoty Team**

*Transform your creativity into beautiful emoji patterns - accessible to everyone, everywhere.*