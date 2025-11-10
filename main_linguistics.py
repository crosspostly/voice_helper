"""
Main FastAPI service for the linguistics orchestrator.

Exposes endpoints for session management, utterance processing,
progress tracking, and health checks.
"""

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from linguistics.config import config
from linguistics.coordinator import get_coordinator, reset_coordinator
from linguistics.database import reset_database, reset_embedding_service
from linguistics.memory import reset_conversation_memory
from linguistics.personas import reset_persona_manager
from linguistics.rag import reset_rag_retriever
from linguistics.voice import reset_tts_service

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)

logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses
class SessionStartRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    session_id: str = Field(..., description="Unique identifier for the session")
    persona_id: Optional[str] = Field(None, description="Preferred persona ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional session context")


class UtteranceRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    session_id: str = Field(..., description="Unique identifier for the session")
    utterance: str = Field(..., description="User utterance to process")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class ProgressRequest(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    session_id: Optional[str] = Field(None, description="Optional session ID")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall health status")
    timestamp: str = Field(..., description="Health check timestamp")
    components: Dict[str, Any] = Field(..., description="Component health details")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp")


# Global coordinator instance
coordinator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    logger.info("Starting Linguistics Orchestrator Service...")
    
    try:
        # Validate configuration
        errors = config.validate_config()
        if errors:
            logger.error(f"Configuration errors: {errors}")
            raise ValueError(f"Configuration validation failed: {errors}")
        
        # Ensure directories exist
        config.ensure_directories()
        logger.info(f"Data directory: {config.DATA_DIR}")
        logger.info(f"ChromaDB path: {config.CHROMA_DB_PATH}")
        
        # Initialize coordinator
        global coordinator
        coordinator = get_coordinator()
        
        # Perform warm-up health check
        health = await coordinator.health_check()
        logger.info(f"Service health status: {health['overall']}")
        
        # Log service configuration
        logger.info(f"Gemini model: {config.GEMINI_MODEL_NAME}")
        logger.info(f"Embedding model: {config.GEMINI_EMBEDDING_MODEL}")
        logger.info(f"Embedding dimension: {config.EMBEDDING_DIMENSION}")
        
        logger.info("✅ Linguistics Orchestrator Service started successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to start service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Linguistics Orchestrator Service...")
    
    try:
        # Reset all components
        reset_coordinator()
        reset_database()
        reset_embedding_service()
        reset_conversation_memory()
        reset_persona_manager()
        reset_rag_retriever()
        reset_tts_service()
        
        logger.info("✅ Service shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title="Linguistics Orchestrator API",
    description="AI-powered linguistics service with conversation memory, RAG, and persona management",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with graceful degradation."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            details={"type": type(exc).__name__},
            timestamp=datetime.now(timezone.utc).isoformat()
        ).model_dump()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            timestamp=datetime.now(timezone.utc).isoformat()
        ).model_dump()
    )


# API endpoints
@app.post("/session/start", response_model=Dict[str, Any])
async def start_session(request: SessionStartRequest):
    """Start a new linguistics session for a user."""
    try:
        if not coordinator:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not initialized"
            )
        
        result = await coordinator.start_session(
            user_id=request.user_id,
            session_id=request.session_id,
            persona_id=request.persona_id,
            context=request.context
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to start session")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start session"
        )


@app.post("/utterance", response_model=Dict[str, Any])
async def process_utterance(request: UtteranceRequest):
    """Process user utterance and generate structured response."""
    try:
        if not coordinator:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not initialized"
            )
        
        if not request.utterance.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Utterance cannot be empty"
            )
        
        result = await coordinator.process_utterance(
            user_id=request.user_id,
            session_id=request.session_id,
            utterance=request.utterance,
            context=request.context
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to process utterance")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing utterance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process utterance"
        )


@app.post("/progress", response_model=Dict[str, Any])
async def get_progress(request: ProgressRequest):
    """Get progress snapshot for a user or specific session."""
    try:
        if not coordinator:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Service not initialized"
            )
        
        result = await coordinator.get_progress_snapshot(
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get progress"
        )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Perform comprehensive health check on all components."""
    try:
        if not coordinator:
            return HealthResponse(
                status="unhealthy",
                timestamp=datetime.now(timezone.utc).isoformat(),
                components={"coordinator": {"status": "unhealthy", "details": "Not initialized"}}
            )
        
        health = await coordinator.health_check()
        
        return HealthResponse(
            status=health["overall"],
            timestamp=health["timestamp"],
            components=health["components"]
        )
        
    except Exception as e:
        logger.error(f"Error during health check: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.now(timezone.utc).isoformat(),
            components={
                "health_check": {
                    "status": "unhealthy",
                    "details": str(e)
                }
            }
        )


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Linguistics Orchestrator API",
        "version": "0.1.0",
        "status": "running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoints": {
            "health": "/health",
            "session_start": "/session/start",
            "utterance": "/utterance",
            "progress": "/progress",
            "docs": "/docs"
        }
    }


@app.get("/personas")
async def list_personas():
    """List all available personas."""
    try:
        from linguistics.personas import get_persona_manager
        persona_manager = get_persona_manager()
        personas = persona_manager.list_personas()
        
        return {
            "personas": [persona.to_dict() for persona in personas],
            "count": len(personas)
        }
        
    except Exception as e:
        logger.error(f"Error listing personas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list personas"
        )


# CLI entry point
def main():
    """Main entry point for running the service."""
    logger.info("🚀 Starting Linguistics Orchestrator Service...")
    
    # Check configuration
    errors = config.validate_config()
    if errors:
        logger.error("❌ Configuration errors:")
        for error in errors:
            logger.error(f"  - {error}")
        sys.exit(1)
    
    # Run the service
    uvicorn.run(
        "main_linguistics:app",
        host="0.0.0.0",
        port=8000,
        reload=config.DEBUG_MODE,
        log_level=config.LOG_LEVEL.lower()
    )


if __name__ == "__main__":
    main()