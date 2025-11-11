# Catalog of Retained Utils - Post 9ab7cc7

## Overview
This document catalogs all functionality introduced after commit `9ab7cc7` (Merge pull request #8) and identifies utilities that should be ported back to the legacy codebase. The analysis compares the current advanced state (HEAD) against the 9ab7cc7 baseline.

## Executive Summary

### Current State vs 9ab7cc7
- **9ab7cc7 baseline**: 2 hooks, basic linguistics integration
- **Current state**: 9 hooks, comprehensive utility suite, modular architecture
- **Total new utilities**: 7 additional hooks + enhanced services + VoiceApp UI architecture

### Key Findings
The post-9ab7cc7 development introduced a sophisticated modular architecture with:
- Advanced session management with auto-reconnect
- Wake lock for mobile reliability  
- Persistent state management
- Comprehensive logging system
- Modular UI components
- Enhanced persona management
- Extensive test coverage

---

## Hooks Inventory

### 1. useWakeLock
**Purpose**: Prevents screen sleep and maintains audio playback on mobile devices
- **Files**: `src/hooks/useWakeLock.ts`
- **Dependencies**: `useLogger` hook
- **Features**:
  - Screen Wake Lock API (Android Chrome, Edge, Firefox)
  - iOS fallback using silent audio loop
  - Auto-restore on app visibility changes
  - Cross-platform mobile reliability
- **API**: `{ requestWakeLock, releaseWakeLock, isActive }`
- **Test Coverage**: `tests/useWakeLock.test.tsx` (10040 bytes)
- **Origin**: Wake lock feature branch (d0990d0)
- **Priority**: **HIGH** - Critical for mobile experience

### 2. usePersistentState
**Purpose**: localStorage-backed state persistence with cross-tab sync
- **Files**: `src/hooks/usePersistentState.ts`
- **Dependencies**: None (React hooks only)
- **Features**:
  - JSON and plain string parsing
  - Cross-tab synchronization
  - Error handling and fallbacks
  - Type-safe generic implementation
- **API**: `[value, setValue]` tuple like useState
- **Test Coverage**: `tests/usePersistentState.test.ts`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **HIGH** - Foundation for user preferences

### 3. useAutoReconnectTimer
**Purpose**: Manages session duration and triggers auto-reconnect before API timeout
- **Files**: `src/hooks/useAutoReconnectTimer.ts`
- **Dependencies**: None (React hooks only)
- **Features**:
  - 4.5 minute session timeout handling
  - Real-time countdown display
  - Configurable warning thresholds
  - Prevents Gemini Live API session drops
- **API**: `{ sessionStartTime, sessionTimeLeft, isActive, shouldReconnect, startTimer, stopTimer, resetTimer, getElapsed }`
- **Constants**: `SESSION_MAX_DURATION = 4.5 * 60 * 1000`
- **Test Coverage**: `tests/useAutoReconnectTimer.test.tsx`
- **Origin**: Auto-reconnect commit (9ac9509)
- **Priority**: **HIGH** - Essential for long conversations

### 4. useLogger
**Purpose**: Application logging with persistence, filtering, and console output
- **Files**: `src/hooks/useLogger.ts`
- **Dependencies**: `usePersistentState` hook
- **Features**:
  - Configurable log levels (DEBUG, INFO, WARN, ERROR)
  - Persistent storage with configurable retention
  - Console output with appropriate methods
  - Cross-tab log synchronization
- **API**: `{ logs, log, clearLogs, getFilteredLogs, logCount }`
- **Test Coverage**: `tests/useLogger.test.tsx`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **MEDIUM** - Development tooling, optional for production

### 5. useSessionManager
**Purpose**: High-level session orchestration combining all utility hooks
- **Files**: `src/hooks/useSessionManager.ts`
- **Dependencies**: All other hooks + services
- **Features**:
  - Unified session management interface
  - Auto-reconnect coordination
  - Wake lock lifecycle management
  - Error handling and recovery
  - Linguistics service integration
- **API**: Comprehensive session, transcript, audio, and configuration interfaces
- **Test Coverage**: `tests/useSessionManager.test.tsx`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **HIGH** - Main orchestration layer

### 6. useAudioEngine
**Purpose**: Audio playback management for TTS and streaming audio
- **Files**: `src/hooks/useAudioEngine.ts`
- **Dependencies**: `useLogger` hook
- **Features**:
  - Base64 audio playback
  - Text-to-speech synthesis
  - Audio context management
  - Playback state tracking
- **API**: `{ isPlaying, playBase64Audio, playText, stopAll, attachOnEnded }`
- **Test Coverage**: `tests/useAudioEngine.test.tsx`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **HIGH** - Core audio functionality

### 7. useTranscript
**Purpose**: Transcript management with export capabilities
- **Files**: `src/hooks/useTranscript.ts`
- **Dependencies**: `useLogger` hook
- **Features**:
  - Message history management
  - PDF export functionality
  - JSON export and clipboard copy
  - Pagination and filtering
- **API**: `{ transcript, displayedTranscript, addMessage, appendPartial, finalizeLast, clear, exportToPdf, exportToJson, copyToClipboard }`
- **Test Coverage**: `tests/useTranscript.test.tsx`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **MEDIUM** - User-facing feature, can be deferred

### 8. useLanguageManager
**Purpose**: Internationalization and localization management
- **Files**: `src/hooks/useLanguageManager.ts`
- **Dependencies**: None (React hooks only)
- **Features**:
  - Language switching
  - Translation loading
  - RTL/LTR support
  - Persistent language preferences
- **API**: `{ language, setLanguage, t, isRTL }`
- **Test Coverage**: `tests/useLanguageManager.test.tsx`
- **Origin**: Phase 2 hooks commit (5e756f6)
- **Priority**: **LOW** - Localization feature, can be deferred

---

## Services Inventory

### 1. Enhanced audioUtils
**Files**: `src/services/audioUtils.ts`
**Features**:
- PCM audio encoding/decoding
- Base64 audio conversion
- Audio buffer creation for playback
- Gemini API blob creation
- **Priority**: **HIGH** - Core audio processing

### 2. GeminiService
**Files**: `src/services/geminiService.ts`
**Features**:
- Text generation with Gemini 2.5 Flash
- TTS generation with voice configuration
- Chat history management
- **Priority**: **HIGH** - Core AI integration

### 3. PersonaService
**Files**: `src/services/personaService.ts`
**Features**:
- 10 preset expert personas
- Custom persona CRUD operations
- localStorage persistence
- Multi-language support
- **Priority**: **MEDIUM** - Feature enhancement

### 4. TranscriptService
**Files**: `src/services/transcriptService.ts`
**Features**:
- Transcript export utilities
- PDF generation
- JSON serialization
- **Priority**: **MEDIUM** - Feature enhancement

---

## UI Components Inventory

### VoiceApp Architecture
**Directory**: `src/components/VoiceApp/`
**Key Files**:
- `VoiceAppContext.tsx` - Global state provider (12,127 bytes)
- `VoiceApp.tsx` - Main component
- `TranscriptPanel.tsx` - Transcript display
- `ControlBar.tsx` - Session controls
- `SidePanel.tsx` - Settings and persona management
- `ChatInput.tsx` - Text input interface
- `ModalsContainer.tsx` - Modal management
- `ProgressCards.tsx` - Status indicators

**Sub-directories**:
- `Common/` - Shared UI components
- `PersonaManager/` - Persona selection and management
- `Settings/` - Configuration modals

**Priority**: **MEDIUM** - UI overhaul, can be ported incrementally

---

## Testing Infrastructure

### Test Coverage
- **Total test files**: 17 comprehensive test files
- **Hook testing**: All hooks have dedicated test files
- **Service testing**: GeminiService, PersonaService, TranscriptService
- **Component testing**: VoiceAppContext, ChatInput, ProgressCard
- **Setup**: `tests/setup.ts` for test configuration

**Priority**: **HIGH** - Essential for maintaining code quality

---

## Dependencies Analysis

### Core Dependencies
- `@google/genai` - Gemini API integration
- React hooks ecosystem
- localStorage for persistence
- Web Audio API for processing
- Wake Lock API for mobile

### Inter-hook Dependencies
```
useSessionManager (orchestrator)
├── useWakeLock
├── useAutoReconnectTimer  
├── useTranscript
├── useAudioEngine
├── useLogger
├── useLanguageManager
└── usePersistentState
    └── useLogger
```

---

## Cherry-Pick Plan

### Immediate Port (Stage 4) - HIGH Priority
1. **useWakeLock** - Critical for mobile reliability
   - Commit: d0990d0 (wake-lock-bg-audio branch)
   - Files: `src/hooks/useWakeLock.ts`, `tests/useWakeLock.test.tsx`

2. **usePersistentState** - Foundation for user preferences
   - Commit: 5e756f6 (phase2-hooks branch)
   - Files: `src/hooks/usePersistentState.ts`, `tests/usePersistentState.test.ts`

3. **useAutoReconnectTimer** - Prevents session timeouts
   - Commit: 9ac9509 (auto-reconnect branch)
   - Files: `src/hooks/useAutoReconnectTimer.ts`, `tests/useAutoReconnectTimer.test.tsx`

4. **Enhanced audioUtils** - Core audio processing
   - Files: `src/services/audioUtils.ts`

5. **Test Infrastructure** - Quality assurance
   - Files: `tests/setup.ts`, relevant test files

### Secondary Port (Stage 5) - MEDIUM Priority
1. **useLogger** - Development tooling
   - Commit: 5e756f6
   - Files: `src/hooks/useLogger.ts`, `tests/useLogger.test.tsx`

2. **useAudioEngine** - Audio management
   - Commit: 5e756f6
   - Files: `src/hooks/useAudioEngine.ts`, `tests/useAudioEngine.test.tsx`

3. **GeminiService** - Enhanced AI integration
   - Files: `src/services/geminiService.ts`, `tests/GeminiService.test.ts`

4. **PersonaService** - Persona management
   - Files: `src/services/personaService.ts`, `tests/PersonaService.test.ts`

### Deferred Port (Stage 6) - LOW Priority
1. **useSessionManager** - Complex orchestration
   - Commit: 5e756f6
   - Depends on all other hooks

2. **useTranscript** - Export functionality
   - Commit: 5e756f6
   - Files: `src/hooks/useTranscript.ts`, `tests/useTranscript.test.tsx`

3. **useLanguageManager** - Localization
   - Commit: 5e756f6
   - Files: `src/hooks/useLanguageManager.ts`, `tests/useLanguageManager.test.tsx`

4. **VoiceApp UI Architecture** - Complete UI overhaul
   - Directory: `src/components/VoiceApp/`
   - Requires careful integration with legacy components

---

## Risk Assessment

### High-Risk Items (Manual Port Required)
- **useSessionManager** - Complex dependencies, requires careful integration
- **VoiceApp architecture** - Major UI changes, potential breaking changes
- **PersonaService** - May conflict with existing persona implementation

### Low-Risk Items (Safe Cherry-Pick)
- **useWakeLock** - Self-contained, minimal dependencies
- **usePersistentState** - Generic utility, no breaking changes
- **useAutoReconnectTimer** - Isolated functionality
- **audioUtils** - Pure utility functions

---

## Implementation Recommendations

### Phase 1: Foundation Utilities
1. Port `usePersistentState` first (provides foundation for others)
2. Port `useWakeLock` (critical for mobile)
3. Port `useAutoReconnectTimer` (session reliability)
4. Port enhanced `audioUtils` (core processing)

### Phase 2: Development Infrastructure
1. Port `useLogger` (development tooling)
2. Port test infrastructure
3. Port `GeminiService` (enhanced AI integration)

### Phase 3: Feature Enhancements
1. Port `useAudioEngine` (audio management)
2. Port `PersonaService` (persona management)
3. Port `useTranscript` (export functionality)

### Phase 4: Advanced Features
1. Port `useLanguageManager` (localization)
2. Evaluate `useSessionManager` (may require re-architecture)
3. Consider VoiceApp UI components (incremental adoption)

---

## Validation Checklist

### Pre-Port Validation
- [ ] Verify commit hashes and branches
- [ ] Confirm file ownership and permissions
- [ ] Review dependency chains
- [ ] Test cherry-pick on feature branch

### Post-Port Validation
- [ ] Unit tests pass for ported utilities
- [ ] Integration tests with legacy codebase
- [ ] Cross-platform compatibility (mobile/desktop)
- [ ] Performance impact assessment
- [ ] Documentation updates

---

## Stakeholder Sign-off Required

- [ ] **Engineering Lead**: Review technical feasibility and risk assessment
- [ ] **Product Manager**: Confirm feature priority and staging
- [ ] **QA Lead**: Validate test coverage and integration approach
- [ ] **Mobile Team**: Confirm wake lock and audio utility requirements

---

*Document created: 2025-11-11*
*Baseline commit: 9ab7cc7*
*Target commit: HEAD (ec35dfc)*
*Analysis scope: All functionality introduced after 9ab7cc7*