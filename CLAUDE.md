# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sentral Chat** is a browser-based AI chat application that runs large language models locally using WebLLM and WebGPU. Built with Next.js 13 and TypeScript, it provides a private, offline-capable chat interface with support for vision models and document attachments.

Key characteristics:
- All AI inference happens in the browser via WebGPU
- Privacy-first: no data sent to external servers
- Supports both WebLLM (browser-native) and MLC-LLM REST API clients
- Multi-language support (22 languages)
- PWA with service worker for offline use

## Development Commands

```bash
# Install dependencies
yarn install

# Development server
yarn dev

# Production build (standalone mode)
yarn build

# Static export (for GitHub Pages)
yarn export

# Development with static export mode
yarn export:dev

# Start production server
yarn start

# Linting
yarn lint

# Fetch prompt templates from external source
yarn prompts

# Development with proxy (for restricted networks)
yarn proxy-dev
```

## Build Modes

The project supports two build modes controlled by the `BUILD_MODE` environment variable:

- **standalone** (default for `yarn build`): Full Next.js server with API routes and SSR
- **export** (for `yarn export`): Static site generation for hosting on GitHub Pages

The build mode affects:
- Output type in [next.config.mjs](next.config.mjs)
- Image optimization settings
- Header configuration (CSP headers only in standalone mode)

## Architecture

### LLM Client System

The application uses an abstract `LLMApi` interface ([app/client/api.ts](app/client/api.ts)) with two implementations:

1. **WebLLMApi** ([app/client/webllm.ts](app/client/webllm.ts))
   - Runs models locally in the browser using WebGPU
   - Supports two execution modes:
     - **ServiceWorker**: Uses `ServiceWorkerMLCEngine` for better resource management
     - **WebWorker**: Uses `WebWorkerMLCEngine` as fallback
   - Workers located in [app/worker/](app/worker/)
   - Model initialization and preloading handled through progress callbacks

2. **MLCLLMApi** ([app/client/mlcllm.ts](app/client/mlcllm.ts))
   - Connects to external MLC-LLM REST API
   - For custom models hosted locally via MLC-LLM

### State Management

Uses Zustand with persistence middleware. Key stores in [app/store/](app/store/):

- **chat.ts**: Chat sessions, messages, and conversation state
  - `ChatSession`: Contains messages, template, document attachments, statistics
  - `useChatStore`: Main store with session management and message operations
  - Session-level state: `isGenerating`, `lastUpdate`, `stat` (token/word/char counts)

- **config.ts**: Application configuration and user preferences
  - Model selection and configuration
  - UI settings (theme, font size, language)
  - Cache type (memory vs IndexedDB)
  - Client type (WebLLM vs MLC-LLM API)

- **template.ts**: Chat templates for different use cases
- **prompt.ts**: Reusable prompt templates

### Model Configuration

Default models defined in [app/constant.ts](app/constant.ts):

- `DEFAULT_MODEL_BASES`: Full list of model configurations
- `DEFAULT_MODELS`: Filtered list based on size constraints and WebLLM support
- Models are filtered by `MAX_MODEL_SIZE_BILLIONS` (currently 5B)
- Each model includes:
  - Display name, provider, family
  - Size, quantization (extracted from model name)
  - Recommended config (temperature, top_p, etc.)
  - VRAM requirements, context window size
  - File size and benchmark scores

**Qwen Models with Thinking Mode**: Qwen 3.x models support a special "thinking mode" with different parameters (temperature=0.6, top_p=0.95) than their default config. This is handled in the WebLLM client code.

### Component Structure

Key components in [app/components/](app/components/):

- **chat.tsx**: Main chat interface (1,853 lines)
  - Message rendering with markdown, code highlighting, LaTeX
  - Input handling with document attachments
  - Streaming response handling
  - Chat commands (like `/thinking` for Qwen models)

- **home.tsx**: Root application layout with routing
- **sidebar.tsx**: Chat history and navigation
- **model-select.tsx**: Model selection interface
- **model-group-row.tsx**: Groups model variants (different quantizations) together
- **settings.tsx**: Configuration interface (571 lines)
- **markdown.tsx**: Markdown rendering with support for:
  - GitHub Flavored Markdown (remark-gfm)
  - LaTeX math (remark-math, rehype-katex)
  - Code highlighting (rehype-highlight)
  - Mermaid diagrams

### Document Processing

Document support in [app/utils/](app/utils/):

- **pdf.ts**: PDF parsing with pdfjs-dist
- **docx.ts**: DOCX parsing with mammoth
- Constraints defined in [app/constant.ts](app/constant.ts):
  - Max file size: 25 MB
  - Max pages: 50
  - Max characters: 200,000

Document context tracked per chat session with status states: idle, processing, ready, error.

### Utilities

Key utilities in [app/utils/](app/utils/):

- **model.tsx**: Model metadata extraction
  - `getSize()`: Extracts parameter size from model name (e.g., "3B" from "Qwen3-3B-...")
  - `getQuantization()`: Extracts quantization format (e.g., "q4f16_1")
  - `getSizeCategory()`: Maps size to categories (Small, Standard, Medium, Large)
  - `formatModelName()`: Creates display-friendly model names

- **token.ts**: Token estimation for context management
- **format.ts**: Data formatting utilities
- **store.ts**: Persistent store utilities with Zustand

## Webpack and Build Configuration

[next.config.mjs](next.config.mjs) contains critical customizations:

- **SVG Handling**: Uses `@svgr/webpack` to import SVGs as React components
- **Node.js Fallbacks**: Disables Node.js modules for browser compatibility
  - `fs`, `module`, `perf_hooks` disabled for client bundles
  - `child_process` disabled for all bundles
- **Service Worker Integration**: Uses `@serwist/next` for PWA support
  - Source: [app/worker/service-worker.ts](app/worker/service-worker.ts)
  - Output: `public/sw.js`
- **CORS Headers**: Configured for API routes in standalone mode
- **Content Security Policy**: Strict CSP headers (standalone mode only)
  - Allows `unsafe-eval` for WebLLM
  - Allows blob: for Web Workers
  - Allows unsafe-inline for styles (dynamic theming)

## Styling

- SCSS modules for component-scoped styles
- Global styles in [app/styles/](app/styles/):
  - `globals.scss`: Base styles and CSS variables
  - `markdown.scss`: Markdown rendering styles
  - `highlight.scss`: Code syntax highlighting

## Internationalization

Locale files in [app/locales/](app/locales/) for 22 languages. The `getLang()` utility detects browser language. All UI text should use the `Locale` object, never hardcoded strings.

## Common Patterns

### Adding a New Model

1. Add model configuration to `DEFAULT_MODEL_BASES` in [app/constant.ts](app/constant.ts)
2. Ensure model is in WebLLM's prebuilt app config
3. Include: name, display_name, provider, family, recommended_config
4. Optional: file_size, benchmark_score, vram_required_MB

### Model Naming Conventions

Model names follow the pattern: `{Base}-{Size}-{Variant}-{Quantization}-MLC[-ContextSize]`
- Example: `Qwen3-4B-q4f16_1-MLC-1k`
- Quantization formats: `q4f16_1`, `q4f32_1`, `q0f16`, `q0f32`
- Context size suffix: `-1k` for 1024 context window

### Working with Chat State

```typescript
// Access chat store
const chatStore = useChatStore.getState();

// Get current session
const session = chatStore.currentSession();

// Add message
chatStore.onUserInput(message, attachments);

// Update session
chatStore.updateCurrentSession((session) => {
  session.messages.push(newMessage);
});
```

### Adding Document Support

Document processing uses a pipeline:
1. File upload → validation (size, pages, characters)
2. Parse document (PDF/DOCX) → extract text
3. Attach to session as `DocumentContext`
4. Include in chat messages as context

## Important Notes

- **No Testing Infrastructure**: Project currently has no test suite
- **WebGPU Required**: WebLLM client requires WebGPU-capable browser
- **Model Caching**: Uses IndexedDB or memory caching (configurable)
- **Service Worker**: Enables offline mode after initial model download
- **Thinking Mode**: Special feature for Qwen models - prefix messages with `/thinking` command

## Docker Deployment

Multi-stage Dockerfile with proxy support:
- Base: Node.js Alpine
- Stages: deps → builder → runner
- Proxy support via `PROXY_URL` environment variable
- Production port: 3000

## Performance Considerations

- Code splitting via Next.js dynamic imports
- Lazy loading for heavy components (markdown, emoji picker)
- Debounced input handlers
- Token estimation for context window management
- Model preloading with progress tracking
- Web Workers for CPU-intensive operations
