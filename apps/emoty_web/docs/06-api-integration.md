# Emoty Web App - API Integration Guide

## Overview

This document provides comprehensive guidance for integrating external APIs into the Emoty web application, with special focus on Anthropic Claude API for AI-powered pattern generation, voice processing, and chat functionality.

## Anthropic Claude Integration

### 1. API Setup and Configuration

#### Environment Configuration

```typescript
// lib/config/anthropic.ts
interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

const anthropicConfig: AnthropicConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: 'https://api.anthropic.com',
  model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  timeout: 30000 // 30 seconds
};

export default anthropicConfig;
```

#### API Client Setup

```typescript
// lib/services/anthropic-client.ts
import Anthropic from '@anthropic-ai/sdk';
import { anthropicConfig } from '../config/anthropic';
import { RateLimiter } from '../utils/rate-limiter';
import { CacheService } from '../utils/cache';

class AnthropicClient {
  private client: Anthropic;
  private rateLimiter: RateLimiter;
  private cache: CacheService;

  constructor() {
    this.client = new Anthropic({
      apiKey: anthropicConfig.apiKey,
      timeout: anthropicConfig.timeout
    });
    
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 50, // Adjust based on your tier
      requestsPerHour: 1000
    });
    
    this.cache = new CacheService();
  }

  async createMessage(
    messages: Anthropic.MessageParam[],
    options: Partial<Anthropic.MessageCreateParams> = {}
  ): Promise<Anthropic.Message> {
    // Check rate limits
    await this.rateLimiter.checkLimit('anthropic_api');
    
    // Check cache for identical requests
    const cacheKey = this.generateCacheKey(messages, options);
    const cachedResponse = await this.cache.get(cacheKey);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await this.client.messages.create({
        model: anthropicConfig.model,
        max_tokens: anthropicConfig.maxTokens,
        temperature: anthropicConfig.temperature,
        messages,
        ...options
      });

      // Cache successful responses for 1 hour
      await this.cache.set(cacheKey, response, 3600);
      
      return response;
    } catch (error) {
      this.handleAPIError(error);
      throw error;
    }
  }

  private generateCacheKey(
    messages: Anthropic.MessageParam[], 
    options: any
  ): string {
    const content = JSON.stringify({ messages, options });
    return `anthropic:${this.hashString(content)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private handleAPIError(error: any) {
    if (error.status === 429) {
      console.warn('Rate limit exceeded:', error);
    } else if (error.status === 401) {
      console.error('Invalid API key:', error);
    } else {
      console.error('Anthropic API error:', error);
    }
  }
}

export default new AnthropicClient();
```

### 2. Pattern Generation API

#### API Endpoint Implementation

```typescript
// pages/api/ai/generate-pattern.ts
import { NextApiRequest, NextApiResponse } from 'next';
import anthropicClient from '../../../lib/services/anthropic-client';
import { validatePatternPrompt } from '../../../lib/validators/pattern-validator';
import { PatternGenerationPrompts } from '../../../lib/prompts/pattern-prompts';

interface PatternGenerationRequest {
  prompt: string;
  language: 'en' | 'fr';
  context?: {
    currentSequence?: string[];
    userPreferences?: any;
  };
  options?: {
    complexity?: 'simple' | 'moderate' | 'complex';
    maxEmojis?: number;
    style?: string;
  };
}

interface PatternGenerationResponse {
  patterns: AIPatternSuggestion[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    model: string;
    timestamp: string;
    language: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PatternGenerationResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      language = 'en',
      context = {},
      options = {}
    }: PatternGenerationRequest = req.body;

    // Validate input
    const validation = validatePatternPrompt(prompt);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: `Invalid prompt: ${validation.errors.join(', ')}` 
      });
    }

    // Generate system prompt
    const systemPrompt = PatternGenerationPrompts.generateSystemPrompt(
      language,
      options.complexity || 'moderate'
    );

    // Generate user prompt with context
    const userPrompt = PatternGenerationPrompts.generateUserPrompt(
      prompt,
      context,
      options
    );

    // Call Anthropic API
    const response = await anthropicClient.createMessage([
      { role: 'user', content: userPrompt }
    ], {
      system: systemPrompt
    });

    // Parse and validate response
    const patterns = parsePatternResponse(response.content[0].text);
    
    // Return structured response
    const result: PatternGenerationResponse = {
      patterns,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      metadata: {
        model: response.model,
        timestamp: new Date().toISOString(),
        language
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Pattern generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate patterns. Please try again.' 
    });
  }
}

function parsePatternResponse(content: string): AIPatternSuggestion[] {
  try {
    // Parse JSON response from Claude
    const parsed = JSON.parse(content);
    
    if (!parsed.patterns || !Array.isArray(parsed.patterns)) {
      throw new Error('Invalid response format');
    }
    
    return parsed.patterns.map((pattern: any) => ({
      sequence: pattern.sequence || [],
      rationale: pattern.rationale || '',
      confidence: pattern.confidence || 0.8,
      name: pattern.name || 'Untitled Pattern',
      tags: pattern.tags || []
    }));
    
  } catch (error) {
    console.error('Failed to parse pattern response:', error);
    // Return fallback pattern
    return [{
      sequence: ['🌟'],
      rationale: 'Generated a simple star pattern as a fallback.',
      confidence: 0.5,
      name: 'Simple Star',
      tags: ['simple', 'fallback']
    }];
  }
}
```

#### Pattern Generation Prompts

```typescript
// lib/prompts/pattern-prompts.ts
export class PatternGenerationPrompts {
  static generateSystemPrompt(language: 'en' | 'fr', complexity: string): string {
    const prompts = {
      en: {
        simple: `You are an expert emoji pattern creator for the Emoty app. Create 3 concentric square emoji patterns from user prompts.

RULES:
- Use 1-3 emojis maximum for simple patterns
- Patterns grow from outside to center (outermost emoji first)
- Only use standard Unicode emojis
- Respond in JSON format only
- Provide creative rationale for each pattern
- Focus on visual harmony and meaning

RESPONSE FORMAT:
{
  "patterns": [
    {
      "sequence": ["🌊", "💙"],
      "rationale": "Ocean waves flow from deep blue center outward",
      "confidence": 0.9,
      "name": "Ocean Waves",
      "tags": ["nature", "water", "calm"]
    }
  ]
}`,
        moderate: `You are an expert emoji pattern creator for the Emoty app. Create 3 concentric square emoji patterns from user prompts.

RULES:
- Use 2-4 emojis for moderate complexity
- Patterns grow from outside to center (outermost emoji first)
- Only use standard Unicode emojis
- Consider emotional context and visual metaphors
- Respond in JSON format only
- Provide detailed creative rationale

RESPONSE FORMAT:
{
  "patterns": [
    {
      "sequence": ["🌅", "☀️", "💭", "🧘‍♂️"],
      "rationale": "Sunrise meditation flows from dawn emergence through illumination to peaceful contemplation",
      "confidence": 0.95,
      "name": "Dawn Meditation",
      "tags": ["peaceful", "mindfulness", "morning"]
    }
  ]
}`,
        complex: `You are an expert emoji pattern creator for the Emoty app. Create 3 concentric square emoji patterns from user prompts.

RULES:
- Use 3-5 emojis for complex patterns
- Patterns grow from outside to center (outermost emoji first)
- Only use standard Unicode emojis
- Create sophisticated visual narratives
- Consider cultural symbolism and deep meaning
- Respond in JSON format only
- Provide comprehensive creative rationale

RESPONSE FORMAT:
{
  "patterns": [
    {
      "sequence": ["🌌", "🌙", "✨", "💭", "💤"],
      "rationale": "Night dreams journey from cosmic vastness through lunar cycles to sparkling thoughts culminating in peaceful sleep",
      "confidence": 0.92,
      "name": "Cosmic Dreams",
      "tags": ["night", "dreams", "cosmic", "peaceful", "sleep"]
    }
  ]
}`
      },
      fr: {
        // French versions of the prompts...
        simple: `Vous êtes un expert créateur de motifs emoji pour l'application Emoty. Créez 3 motifs de carrés concentriques à partir des demandes des utilisateurs.

RÈGLES:
- Utilisez 1-3 emojis maximum pour les motifs simples
- Les motifs croissent de l'extérieur vers le centre (emoji extérieur en premier)
- Utilisez uniquement des emojis Unicode standard
- Répondez uniquement en format JSON
- Fournissez une justification créative pour chaque motif
- Concentrez-vous sur l'harmonie visuelle et la signification

FORMAT DE RÉPONSE:
{
  "patterns": [
    {
      "sequence": ["🌊", "💙"],
      "rationale": "Les vagues océaniques s'écoulent du centre bleu profond vers l'extérieur",
      "confidence": 0.9,
      "name": "Vagues Océaniques",
      "tags": ["nature", "eau", "calme"]
    }
  ]
}`
      }
    };
    
    return prompts[language][complexity];
  }

  static generateUserPrompt(
    userInput: string,
    context: any,
    options: any
  ): string {
    let prompt = `Create emoji patterns for: "${userInput}"`;
    
    if (context.currentSequence && context.currentSequence.length > 0) {
      prompt += `\n\nCurrent pattern context: ${context.currentSequence.join(' ')}`;
    }
    
    if (options.style) {
      prompt += `\n\nDesired style: ${options.style}`;
    }
    
    prompt += '\n\nGenerate 3 unique pattern variations with creative rationales.';
    
    return prompt;
  }
}
```

### 3. AI Chat Integration

#### Chat API Endpoint

```typescript
// pages/api/ai/chat.ts
import { NextApiRequest, NextApiResponse } from 'next';
import anthropicClient from '../../../lib/services/anthropic-client';
import { ChatPrompts } from '../../../lib/prompts/chat-prompts';

interface ChatRequest {
  message: string;
  conversationId?: string;
  context: {
    currentPattern?: PatternState;
    userPreferences: any;
  };
}

interface ChatResponse {
  response: string;
  suggestions?: PatternSuggestion[];
  conversationId: string;
  usage: TokenUsage;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationId, context }: ChatRequest = req.body;

    // Generate conversation context
    const systemPrompt = ChatPrompts.generateSystemPrompt(
      context.userPreferences.language || 'en'
    );

    // Build conversation history
    const conversationHistory = await getConversationHistory(conversationId);
    
    // Add current context
    const contextualPrompt = ChatPrompts.generateContextualPrompt(
      message,
      context.currentPattern,
      context.userPreferences
    );

    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: contextualPrompt }
    ];

    // Call Anthropic API
    const response = await anthropicClient.createMessage(messages, {
      system: systemPrompt
    });

    // Parse response for pattern suggestions
    const { chatResponse, suggestions } = parseChatResponse(
      response.content[0].text
    );

    // Save conversation
    const newConversationId = conversationId || generateConversationId();
    await saveConversationMessage(
      newConversationId,
      message,
      chatResponse,
      context
    );

    const result: ChatResponse = {
      response: chatResponse,
      suggestions,
      conversationId: newConversationId,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message. Please try again.' 
    });
  }
}
```

#### Chat Prompts

```typescript
// lib/prompts/chat-prompts.ts
export class ChatPrompts {
  static generateSystemPrompt(language: 'en' | 'fr'): string {
    const prompts = {
      en: `You are EmotyBot, a friendly AI assistant for the Emoty emoji pattern app. Help users create amazing emoji patterns through conversation.

CAPABILITIES:
- Suggest emoji patterns based on user requests
- Improve existing patterns
- Explain pattern meanings and symbolism
- Help with creative inspiration
- Provide emoji suggestions for themes

RESPONSE RULES:
- Be friendly, creative, and encouraging
- Keep responses concise but helpful
- Include clickable emoji suggestions when relevant
- Format suggestions as: [🌟⭐✨] for easy clicking
- Ask clarifying questions when needed

CURRENT CONTEXT: User is creating emoji patterns in a web app`,

      fr: `Vous êtes EmotyBot, un assistant IA amical pour l'application de motifs emoji Emoty. Aidez les utilisateurs à créer d'incroyables motifs emoji à travers la conversation.

CAPACITÉS:
- Suggérer des motifs emoji basés sur les demandes des utilisateurs
- Améliorer les motifs existants
- Expliquer les significations et le symbolisme des motifs
- Aider avec l'inspiration créative
- Fournir des suggestions d'emoji pour les thèmes

RÈGLES DE RÉPONSE:
- Soyez amical, créatif et encourageant
- Gardez les réponses concises mais utiles
- Incluez des suggestions d'emoji cliquables quand c'est pertinent
- Formatez les suggestions comme: [🌟⭐✨] pour un clic facile
- Posez des questions de clarification quand nécessaire

CONTEXTE ACTUEL: L'utilisateur crée des motifs emoji dans une application web`
    };
    
    return prompts[language];
  }

  static generateContextualPrompt(
    userMessage: string,
    currentPattern?: PatternState,
    preferences?: any
  ): string {
    let prompt = `User message: "${userMessage}"`;
    
    if (currentPattern && currentPattern.sequence.length > 0) {
      prompt += `\n\nCurrent pattern: ${currentPattern.sequence.join(' ')}`;
      prompt += `\nPattern name: ${currentPattern.name || 'Unnamed'}`;
    }
    
    if (preferences?.theme) {
      prompt += `\nUser prefers: ${preferences.theme} themes`;
    }
    
    return prompt;
  }
}
```

### 4. Voice Processing Integration

#### Voice API Endpoint

```typescript
// pages/api/voice/process.ts
import { NextApiRequest, NextApiResponse } from 'next';
import anthropicClient from '../../../lib/services/anthropic-client';
import { VoicePrompts } from '../../../lib/prompts/voice-prompts';

interface VoiceProcessRequest {
  transcript: string;
  confidence: number;
  language: 'en' | 'fr';
  context: {
    currentPattern?: PatternState;
    availablePalettes: string[];
  };
}

interface VoiceProcessResponse {
  intent: VoiceIntent;
  parameters: Record<string, any>;
  confidence: number;
  feedback: string;
  actions: VoiceAction[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VoiceProcessResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      transcript, 
      confidence, 
      language, 
      context 
    }: VoiceProcessRequest = req.body;

    // Skip processing if confidence is too low
    if (confidence < 0.7) {
      return res.status(400).json({
        error: 'Voice recognition confidence too low. Please try again.'
      });
    }

    // Generate voice processing prompt
    const systemPrompt = VoicePrompts.generateSystemPrompt(language);
    const userPrompt = VoicePrompts.generateUserPrompt(
      transcript,
      context,
      language
    );

    // Process with Anthropic API
    const response = await anthropicClient.createMessage([
      { role: 'user', content: userPrompt }
    ], {
      system: systemPrompt
    });

    // Parse voice command response
    const voiceResult = parseVoiceResponse(response.content[0].text);

    const result: VoiceProcessResponse = {
      intent: voiceResult.intent,
      parameters: voiceResult.parameters,
      confidence: voiceResult.confidence,
      feedback: voiceResult.feedback,
      actions: voiceResult.actions
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice command. Please try again.' 
    });
  }
}
```

### 5. Error Handling and Fallbacks

#### Graceful Degradation

```typescript
// lib/services/ai-fallback.ts
export class AIFallbackService {
  static async generatePatternFallback(
    prompt: string, 
    language: 'en' | 'fr'
  ): Promise<AIPatternSuggestion[]> {
    // Simple pattern generation without AI
    const keywords = this.extractKeywords(prompt);
    const patterns = this.generatePatternsFromKeywords(keywords, language);
    
    return patterns.map(pattern => ({
      ...pattern,
      rationale: `Generated locally based on keywords: ${keywords.join(', ')}`,
      confidence: 0.6
    }));
  }

  static async processChatFallback(
    message: string,
    language: 'en' | 'fr'
  ): Promise<string> {
    const responses = {
      en: [
        "I'm having trouble connecting to my AI services right now. Try describing what kind of pattern you'd like to create!",
        "My AI brain needs a moment to reboot! In the meantime, try selecting emojis from the palettes above.",
        "Connection issues on my end! Feel free to explore the different emoji themes while I get back online."
      ],
      fr: [
        "J'ai des difficultés à me connecter à mes services IA en ce moment. Essayez de décrire le type de motif que vous aimeriez créer !",
        "Mon cerveau IA a besoin d'un moment pour redémarrer ! En attendant, essayez de sélectionner des emojis dans les palettes ci-dessus.",
        "Problèmes de connexion de mon côté ! N'hésitez pas à explorer les différents thèmes d'emojis pendant que je reviens en ligne."
      ]
    };
    
    const fallbackResponses = responses[language];
    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  private static extractKeywords(prompt: string): string[] {
    // Simple keyword extraction
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return prompt
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 3);
  }

  private static generatePatternsFromKeywords(
    keywords: string[], 
    language: 'en' | 'fr'
  ): Partial<AIPatternSuggestion>[] {
    // Map keywords to emojis (simplified)
    const emojiMap = {
      love: ['❤️', '💕'],
      happy: ['😊', '😃'],
      nature: ['🌿', '🌱'],
      ocean: ['🌊', '💙'],
      sun: ['☀️', '🌞'],
      moon: ['🌙', '✨'],
      flower: ['🌸', '🌺'],
      star: ['⭐', '✨']
    };
    
    const patterns = [];
    
    for (const keyword of keywords) {
      const emojis = emojiMap[keyword] || ['🌟'];
      patterns.push({
        sequence: emojis,
        name: this.generatePatternName(keyword, language),
        tags: [keyword]
      });
    }
    
    return patterns.length > 0 ? patterns : [{
      sequence: ['🌟'],
      name: language === 'en' ? 'Simple Star' : 'Étoile Simple',
      tags: ['simple']
    }];
  }

  private static generatePatternName(keyword: string, language: 'en' | 'fr'): string {
    const templates = {
      en: [`${keyword} Pattern`, `Beautiful ${keyword}`, `${keyword} Design`],
      fr: [`Motif ${keyword}`, `Beau ${keyword}`, `Design ${keyword}`]
    };
    
    const templateList = templates[language];
    return templateList[Math.floor(Math.random() * templateList.length)];
  }
}
```

#### Circuit Breaker Pattern

```typescript
// lib/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }
}
```

### 6. Performance Optimization

#### Request Batching

```typescript
// lib/utils/request-batcher.ts
export class RequestBatcher {
  private batch: Array<{
    request: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  private batchTimeout: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly batchSize = 5,
    private readonly batchDelay = 100 // ms
  ) {}

  async addRequest<T>(request: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batch.push({ request, resolve, reject });
      
      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const currentBatch = this.batch.splice(0);
    
    if (currentBatch.length === 0) return;

    try {
      // Process batch requests
      const results = await this.executeBatch(
        currentBatch.map(item => item.request)
      );
      
      // Resolve individual promises
      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
      
    } catch (error) {
      // Reject all promises in batch
      currentBatch.forEach(item => {
        item.reject(error);
      });
    }
  }

  private async executeBatch(requests: any[]): Promise<any[]> {
    // Implement batch processing logic
    // This would depend on the specific API requirements
    return Promise.all(requests.map(req => this.processSingleRequest(req)));
  }

  private async processSingleRequest(request: any): Promise<any> {
    // Process individual request
    throw new Error('Not implemented');
  }
}
```

### 7. Monitoring and Analytics

#### API Usage Tracking

```typescript
// lib/monitoring/api-usage.ts
export class APIUsageTracker {
  private static instance: APIUsageTracker;
  
  private usage = new Map<string, {
    requests: number;
    tokens: number;
    errors: number;
    lastUsed: Date;
  }>();

  static getInstance(): APIUsageTracker {
    if (!this.instance) {
      this.instance = new APIUsageTracker();
    }
    return this.instance;
  }

  trackRequest(
    endpoint: string, 
    tokens: number, 
    success: boolean = true
  ): void {
    const key = endpoint;
    const current = this.usage.get(key) || {
      requests: 0,
      tokens: 0,
      errors: 0,
      lastUsed: new Date()
    };

    current.requests++;
    current.tokens += tokens;
    if (!success) current.errors++;
    current.lastUsed = new Date();

    this.usage.set(key, current);
  }

  getUsageStats(): Record<string, any> {
    const stats = {};
    
    for (const [endpoint, data] of this.usage.entries()) {
      stats[endpoint] = {
        ...data,
        errorRate: data.requests > 0 ? data.errors / data.requests : 0,
        avgTokensPerRequest: data.requests > 0 ? data.tokens / data.requests : 0
      };
    }

    return stats;
  }

  async exportUsageData(): Promise<void> {
    const stats = this.getUsageStats();
    
    // Send to analytics service or save to database
    try {
      await fetch('/api/analytics/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          usage: stats
        })
      });
    } catch (error) {
      console.error('Failed to export usage data:', error);
    }
  }
}
```

### 8. Testing Strategies

#### API Integration Tests

```typescript
// tests/api/anthropic.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AnthropicClient from '../../lib/services/anthropic-client';

describe('Anthropic API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pattern Generation', () => {
    it('should generate valid patterns from prompt', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            patterns: [{
              sequence: ['🌊', '💙'],
              rationale: 'Ocean theme pattern',
              confidence: 0.9,
              name: 'Ocean Waves',
              tags: ['nature', 'water']
            }]
          })
        }],
        usage: { input_tokens: 50, output_tokens: 100 },
        model: 'claude-3-haiku-20240307'
      };

      jest.spyOn(AnthropicClient, 'createMessage')
        .mockResolvedValue(mockResponse as any);

      const result = await generatePattern('ocean waves', 'en');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].sequence).toEqual(['🌊', '💙']);
      expect(result.patterns[0].confidence).toBeGreaterThan(0.8);
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(AnthropicClient, 'createMessage')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await generatePattern('test prompt', 'en');

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].sequence).toEqual(['🌟']);
      expect(result.patterns[0].rationale).toContain('fallback');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Test rate limiting implementation
      const requests = Array(60).fill(null).map(() => 
        generatePattern('test', 'en')
      );

      const results = await Promise.allSettled(requests);
      const failures = results.filter(r => r.status === 'rejected');

      expect(failures.length).toBeGreaterThan(0);
    });
  });
});
```

---

*This API integration guide provides a comprehensive foundation for integrating Anthropic Claude and other external services into the Emoty web application, ensuring robust error handling, performance optimization, and seamless user experience.*