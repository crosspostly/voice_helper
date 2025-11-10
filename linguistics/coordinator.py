"""
Linguistics coordinator for orchestrating all components.

Manages the flow of requests through conversation memory, progress tracking,
retriever, and personas to generate structured responses.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from .config import config
from .memory import get_conversation_memory
from .personas import get_persona_manager
from .rag import get_rag_retriever
from .voice import get_tts_service
from .database import get_database, UserProgressMetadata

logger = logging.getLogger(__name__)


class LinguisticsCoordinator:
    """Coordinates all linguistics components for response generation."""
    
    def __init__(self):
        """Initialize the linguistics coordinator."""
        self.config = config
        self.persona_manager = get_persona_manager()
        self.rag_retriever = get_rag_retriever()
        self.tts_service = get_tts_service()
        
        # Initialize Gemini if API key is available
        if self.config.GEMINI_API_KEY:
            genai.configure(api_key=self.config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(self.config.GEMINI_MODEL_NAME)
        else:
            self.model = None
            logger.warning("No Gemini API key available")
    
    async def start_session(
        self,
        user_id: str,
        session_id: str,
        persona_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Start a new linguistics session for a user."""
        try:
            # Get conversation memory for the user
            memory = get_conversation_memory(user_id)
            
            # Select appropriate persona
            persona = self.persona_manager.get_persona_for_context(
                context or {},
                persona_id
            )
            
            # Initialize session context
            session_context = {
                "user_id": user_id,
                "session_id": session_id,
                "persona": persona.to_dict(),
                "started_at": datetime.now(timezone.utc).isoformat(),
                "context": context or {}
            }
            
            # Store session initialization in memory
            await memory.add_message(
                session_id=session_id,
                role="system",
                content=f"Session started with {persona.name} persona",
                metadata={
                    "event": "session_start",
                    "persona_id": persona.id,
                    "context": session_context
                }
            )
            
            logger.info(f"Started session {session_id} for user {user_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "user_id": user_id,
                "persona": persona.to_dict(),
                "started_at": session_context["started_at"],
                "message": f"Session started with {persona.name} persona"
            }
            
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to start session"
            }
    
    async def process_utterance(
        self,
        user_id: str,
        session_id: str,
        utterance: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process user utterance and generate structured response."""
        try:
            # Get conversation memory
            memory = get_conversation_memory(user_id)
            
            # Store user utterance in memory
            await memory.add_message(
                session_id=session_id,
                role="user",
                content=utterance,
                metadata={"event": "user_utterance", "context": context}
            )
            
            # Get conversation context
            conversation_context = memory.get_context_summary(session_id)
            
            # Retrieve relevant context using RAG
            rag_context = await self.rag_retriever.retrieve_context(utterance)
            formatted_context = self.rag_retriever.format_context_for_response(rag_context)
            
            # Get current session persona
            session_history = await memory.get_conversation_history(session_id, limit=1)
            current_persona_id = "assistant"  # Default
            
            # Extract persona from last system message if available
            for msg in session_history:
                if msg.get("role") == "system" and msg.get("metadata", {}).get("persona_id"):
                    current_persona_id = msg["metadata"]["persona_id"]
                    break
            
            persona = self.persona_manager.get_persona(current_persona_id)
            if not persona:
                persona = self.persona_manager.get_default_persona()
            
            # Generate response using Gemini
            response_data = await self._generate_response(
                utterance=utterance,
                conversation_context=conversation_context,
                rag_context=formatted_context,
                persona=persona,
                context=context
            )
            
            # Store assistant response in memory
            await memory.add_message(
                session_id=session_id,
                role="assistant",
                content=response_data["detailed_text"],
                metadata={
                    "event": "assistant_response",
                    "response_type": "structured",
                    "persona_id": persona.id,
                    "rag_context_used": len(rag_context) > 0
                }
            )
            
            # Update user progress
            await self._update_progress(user_id, session_id, utterance, response_data)
            
            # Generate TTS if available
            audio_data = None
            if self.tts_service.is_available():
                audio_data = await self.tts_service.synthesize_speech(
                    text=response_data["summary"],
                    language=context.get("language", "en") if context else "en"
                )
            
            logger.info(f"Processed utterance for session {session_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "user_id": user_id,
                "persona": persona.to_dict(),
                "response": response_data,
                "audio_data": audio_data,
                "context_used": len(rag_context) > 0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to process utterance: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to process utterance"
            }
    
    async def get_progress_snapshot(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get progress snapshot for a user or specific session."""
        try:
            db = get_database()
            memory = get_conversation_memory(user_id)
            
            if session_id:
                # Get session-specific progress
                conversation_history = await memory.get_conversation_history(session_id)
                session_context = memory.get_context_summary(session_id)
                
                return {
                    "user_id": user_id,
                    "session_id": session_id,
                    "conversation_count": len(conversation_history),
                    "last_activity": session_context.get("last_message", {}).get("timestamp"),
                    "has_context": session_context.get("has_context", False),
                    "session_active": True
                }
            else:
                # Get overall user progress
                progress_results = db.get(
                    collection_name="user_progress",
                    where={"user_id": user_id},
                    limit=10
                )
                
                # Handle the results structure from ChromaDB
                metadatas = progress_results.get("metadatas", [])
                
                return {
                    "user_id": user_id,
                    "total_sessions": len(set(p.get("session_id") for p in metadatas)),
                    "progress_entries": len(metadatas),
                    "last_activity": metadatas[0].get("updated_at") if metadatas else None,
                    "recent_progress": metadatas[:5]
                }
                
        except Exception as e:
            logger.error(f"Failed to get progress snapshot: {e}")
            return {
                "user_id": user_id,
                "session_id": session_id,
                "error": str(e),
                "progress_entries": 0
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components."""
        health_status = {
            "overall": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {}
        }
        
        try:
            # Check configuration
            config_errors = self.config.validate_config()
            health_status["components"]["config"] = {
                "status": "healthy" if not config_errors else "unhealthy",
                "details": config_errors if config_errors else "Configuration valid"
            }
            
            # Check database connectivity
            try:
                db = get_database()
                # Try a simple query to check connectivity
                db.get(collection_name="linguistics_book", limit=1)
                health_status["components"]["database"] = {
                    "status": "healthy",
                    "details": "ChromaDB connection successful"
                }
            except Exception as e:
                health_status["components"]["database"] = {
                    "status": "unhealthy",
                    "details": str(e)
                }
                health_status["overall"] = "degraded"
            
            # Check embedding service
            try:
                embedding_service = get_embedding_service()
                health_status["components"]["embeddings"] = {
                    "status": "healthy" if embedding_service.is_available() else "unhealthy",
                    "details": "Embedding service available" if embedding_service.is_available() else "Embedding service unavailable"
                }
            except Exception as e:
                health_status["components"]["embeddings"] = {
                    "status": "unhealthy",
                    "details": str(e)
                }
                health_status["overall"] = "degraded"
            
            # Check Gemini API
            if self.model:
                health_status["components"]["gemini"] = {
                    "status": "healthy",
                    "details": f"Gemini model {self.config.GEMINI_MODEL_NAME} available"
                }
            else:
                health_status["components"]["gemini"] = {
                    "status": "unhealthy",
                    "details": "Gemini API key not configured"
                }
                health_status["overall"] = "degraded"
            
            # Check TTS service
            tts_available = self.tts_service.is_available()
            health_status["components"]["tts"] = {
                "status": "healthy" if tts_available else "unhealthy",
                "details": "TTS service available" if tts_available else "TTS service unavailable"
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_status["overall"] = "unhealthy"
            health_status["error"] = str(e)
        
        return health_status
    
    async def _generate_response(
        self,
        utterance: str,
        conversation_context: Dict[str, Any],
        rag_context: str,
        persona: Any,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate structured response using Gemini."""
        if not self.model:
            return {
                "summary": "AI service unavailable",
                "detailed_text": "The AI service is currently unavailable. Please check your API configuration.",
                "next_actions": ["Check API key configuration", "Try again later"],
                "metadata": {"error": "no_gemini_model", "fallback": True}
            }
        
        try:
            # Build prompt with persona and context
            prompt = self._build_prompt(
                utterance=utterance,
                conversation_context=conversation_context,
                rag_context=rag_context,
                persona=persona,
                context=context
            )
            
            # Generate response
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse response into structured format
            return self._parse_structured_response(response_text, persona)
            
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return {
                "summary": "I apologize, but I'm having trouble generating a response right now.",
                "detailed_text": f"An error occurred while processing your request: {str(e)}",
                "next_actions": ["Please try again", "Check if the service is available"],
                "metadata": {"error": str(e), "fallback": True}
            }
    
    def _build_prompt(
        self,
        utterance: str,
        conversation_context: Dict[str, Any],
        rag_context: str,
        persona: Any,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build a comprehensive prompt for response generation."""
        prompt_parts = [
            f"You are {persona.name}, a {persona.description}.",
            f"Your traits: {persona.traits}",
            f"Response style: {persona.response_style}",
            "",
            "CONTEXT INFORMATION:",
        ]
        
        if rag_context:
            prompt_parts.extend([
                "Relevant information from knowledge base:",
                rag_context,
                ""
            ])
        
        if conversation_context.get("has_context"):
            prompt_parts.extend([
                "Recent conversation context:",
                f"Total messages: {conversation_context.get('total_messages', 0)}",
                ""
            ])
        
        prompt_parts.extend([
            "USER INPUT:",
            utterance,
            "",
            "Please provide a structured response in the following format:",
            "SUMMARY: [A brief, TTS-friendly summary of your response]",
            "DETAILED: [Your detailed response with explanations and examples]",
            "ACTIONS: [List of suggested next actions for the user, as a Python list]",
            "",
            "Response:"
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_structured_response(
        self,
        response_text: str,
        persona: Any
    ) -> Dict[str, Any]:
        """Parse Gemini response into structured format."""
        try:
            # Try to extract structured components
            lines = response_text.split('\n')
            summary = ""
            detailed = ""
            actions = []
            
            current_section = None
            for line in lines:
                line = line.strip()
                if line.startswith("SUMMARY:"):
                    current_section = "summary"
                    summary = line.replace("SUMMARY:", "").strip()
                elif line.startswith("DETAILED:"):
                    current_section = "detailed"
                    detailed = line.replace("DETAILED:", "").strip()
                elif line.startswith("ACTIONS:"):
                    current_section = "actions"
                    actions_line = line.replace("ACTIONS:", "").strip()
                    if actions_line:
                        try:
                            import ast
                            actions = ast.literal_eval(actions_line)
                        except:
                            actions = [actions_line]
                elif current_section == "summary":
                    summary += " " + line
                elif current_section == "detailed":
                    detailed += " " + line
                elif current_section == "actions":
                    if line.startswith("-") or line.startswith("*"):
                        actions.append(line.lstrip("-* ").strip())
            
            # Fallback if structured parsing failed
            if not summary and not detailed:
                summary = response_text[:200] + "..." if len(response_text) > 200 else response_text
                detailed = response_text
                actions = ["Continue conversation"]
            
            return {
                "summary": summary.strip(),
                "detailed_text": detailed.strip(),
                "next_actions": actions[:5],  # Limit to 5 actions
                "metadata": {
                    "persona_id": persona.id,
                    "persona_name": persona.name,
                    "response_length": len(response_text),
                    "structured": True
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to parse structured response: {e}")
            return {
                "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "detailed_text": response_text,
                "next_actions": ["Continue conversation"],
                "metadata": {
                    "persona_id": persona.id,
                    "persona_name": persona.name,
                    "response_length": len(response_text),
                    "structured": False,
                    "parse_error": str(e)
                }
            }
    
    async def _update_progress(
        self,
        user_id: str,
        session_id: str,
        utterance: str,
        response_data: Dict[str, Any]
    ) -> None:
        """Update user progress in the database."""
        try:
            db = get_database()
            
            progress_metadata = UserProgressMetadata(
                user_id=user_id,
                session_id=session_id,
                skill_practiced="conversation",
                difficulty_level="intermediate",
                completion_score=0.8,  # Placeholder score
                time_spent_minutes=1,  # Placeholder time
                language="en"
            )
            
            # Generate unique ID for the progress entry
            import uuid
            progress_id = str(uuid.uuid4())
            
            # Use the database upsert method
            db.upsert(
                collection_name="user_progress",
                ids=[progress_id],
                documents=[f"User: {utterance}\nAssistant: {response_data.get('summary', '')}"],
                metadatas=[{
                    **progress_metadata.model_dump(),
                    "progress_id": progress_id
                }]
            )
            
        except Exception as e:
            logger.error(f"Failed to update progress: {e}")


# Global coordinator instance
_coordinator: Optional[LinguisticsCoordinator] = None


def get_coordinator() -> LinguisticsCoordinator:
    """Get the global linguistics coordinator instance."""
    global _coordinator
    if _coordinator is None:
        _coordinator = LinguisticsCoordinator()
    return _coordinator


def reset_coordinator() -> None:
    """Reset the global linguistics coordinator instance."""
    global _coordinator
    _coordinator = None