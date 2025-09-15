# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyUI Mini is a mobile-friendly WebUI for running ComfyUI workflows. It consists of:
- **Express.js backend** (TypeScript) that proxies requests to ComfyUI
- **Frontend client** (TypeScript/vanilla JS) served as static files
- **WebSocket integration** for real-time generation progress
- **Workflow management system** that converts ComfyUI API format workflows

## Development Commands

### Core Development
```bash
npm run dev          # Start development mode (client + server watch)
npm run dev:server   # Start server in watch mode only
npm run dev:client   # Start client TypeScript compilation in watch mode
npm start            # Start production server (requires build first)
```

### Build & Quality
```bash
npm run build        # Build client TypeScript to JavaScript
npm run lint         # Run ESLint on all files
npm run format       # Format code with Prettier
```

### Requirements
- Node.js ≥20.0.0
- ComfyUI server running (typically on http://127.0.0.1:8188)

## Architecture Overview

### Directory Structure
```
src/
├── client/          # Frontend TypeScript code
│   ├── public/      # Static assets (CSS, JS, images)
│   └── tsconfig.json
├── server/          # Backend Express.js application
│   ├── index.ts     # Main server entry point
│   ├── routes/      # Express route handlers
│   ├── middleware/  # Express middleware
│   ├── utils/       # Server utilities and ComfyUI API integration
│   └── views/       # EJS templates
├── shared/          # Code shared between client and server
│   ├── types/       # TypeScript type definitions
│   └── classes/     # Shared classes (Workflow management)
└── tsconfig.base.json
```

### Key Components

**Server Architecture:**
- `src/server/index.ts` - Main Express app with route registration
- `src/server/routes/` - Route handlers for main UI, ComfyUI proxy, settings
- `src/server/utils/comfyAPIUtils/` - ComfyUI API integration (generation, WebSocket handling)
- `src/server/middleware/themeMiddleware.ts` - Theme management

**Workflow System:**
- `src/shared/classes/Workflow.ts` - Core `WorkflowInstance` class for workflow validation and manipulation
- `src/shared/types/Workflow.ts` - TypeScript interfaces for workflow data structures
- Workflows must be in ComfyUI API format (not regular ComfyUI save format)
- Metadata system (`_comfyuimini_meta`) adds user-friendly input options

**Client-Server Communication:**
- REST API for workflow management, settings, and file operations
- WebSocket connection for real-time image generation progress
- Static file serving for frontend assets

### Configuration

Configuration uses the `config` package with JSON files:
- `config/default.example.json` - Example configuration template
- Key settings: `app_port`, `comfyui_url`, `comfyui_ws_url`, `output_dir`
- Configuration automatically initialized on first run

### Code Style

**Formatting (Prettier):**
- 4-space indentation
- Single quotes
- Semicolons required
- Line width: 120 characters

**Linting:**
- ESLint with TypeScript support
- Standard recommended rules

### Common Development Patterns

**Path Resolution:**
- Uses `@shared/` alias for shared types/classes in imports
- Server paths managed through `src/server/utils/paths.ts`

**Error Handling:**
- Winston logger for server-side logging (`src/server/utils/logger.ts`)
- Workflow validation through `WorkflowInstance.validateWorkflowObject()`

**TypeScript:**
- Shared base configuration in `src/tsconfig.base.json`
- Separate client/server TypeScript configs
- Strict type checking enabled

### Workflow Development

When working with workflows:
1. Workflows must be in ComfyUI API format (exported from ComfyUI web interface)
2. Use `WorkflowInstance` class for all workflow operations
3. Metadata generation handles user-friendly input mapping
4. Validation ensures workflows have required properties (`class_type`, `_meta`, `inputs`)

### ComfyUI Integration

The app acts as a proxy/wrapper around ComfyUI:
- All image generation requests forward to ComfyUI API
- WebSocket connection mirrors ComfyUI's progress WebSocket
- Output images retrieved from ComfyUI's output directory
- Version compatibility checking against minimum ComfyUI version

## Known Issues

### iPhone Safari Command Execution Bug
- **Issue**: Commands sent from iPhone Safari browser are not being executed
- **Status**: Recorded for future investigation
- **Likely causes**: iOS Safari WebSocket handling, touch event differences, or mobile-specific JavaScript limitations
- **Investigation needed**: Check client-side JavaScript event handlers, WebSocket connection stability on iOS, and mobile-specific browser compatibility

### Workflow Import Field Visibility
- **Issue**: On workflow import, all fields should be set as hidden by default since most fields are not typically modified by users
- **Status**: Recorded for future implementation
- **Location**: Likely in workflow metadata generation or import handling logic
- **Implementation needed**: Modify `WorkflowInstance.generateMetadataForWorkflow()` or import process to set `disabled: true` for all input options by default