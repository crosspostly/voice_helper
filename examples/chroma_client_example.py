"""
Example usage of the linguistics ChromaDB client.

This example demonstrates how to use the client to store and retrieve
linguistics data, conversations, and user progress.
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from linguistics.database import (
    Collections,
    get_database,
    create_linguistics_book_metadata,
    create_user_conversation_metadata,
    create_user_progress_metadata,
)


def main():
    """Demonstrate basic usage of the linguistics database."""
    
    # Set up API key (optional - client will work without it for basic operations)
    # os.environ["GEMINI_API_KEY"] = "your-api-key-here"
    
    print("🚀 Initializing Linguistics Database...")
    
    # Get database instance (will create ./data/chroma_db if it doesn't exist)
    db = get_database()
    
    # Check if embeddings are available
    if db.is_embedding_available():
        print("✅ Gemini embeddings are available")
    else:
        print("⚠️  Gemini embeddings not available - using fallback")
        print("   Set GEMINI_API_KEY environment variable to enable embeddings")
    
    print("\n📚 Adding educational content to linguistics_book...")
    
    # Add some educational content
    lesson_metadata = create_linguistics_book_metadata(
        content_type="lesson",
        difficulty_level="beginner",
        topic="grammar",
        subtopic="present_tense",
        language="en",
        tags=["grammar", "verbs", "beginner"],
        author="AI Assistant"
    )
    
    exercise_metadata = create_linguistics_book_metadata(
        content_type="exercise",
        difficulty_level="beginner",
        topic="grammar",
        subtopic="present_tense",
        language="en",
        tags=["practice", "verbs", "beginner"]
    )
    
    # Store content
    db.upsert(
        collection_name=Collections.LINGUISTICS_BOOK,
        ids=["lesson_001", "exercise_001"],
        documents=[
            "The present tense is used to describe actions happening now or general truths. "
            "For example: 'I study English', 'The sun rises in the east'.",
            "Practice: Convert these sentences to present tense:\n"
            "1. I studied yesterday -> I ______\n"
            "2. They will learn -> They ______"
        ],
        metadatas=[lesson_metadata, exercise_metadata]
    )
    
    print(f"✅ Added 2 items to {Collections.LINGUISTICS_BOOK}")
    
    print("\n💬 Adding user conversation...")
    
    # Add a conversation
    conversation_metadata = create_user_conversation_metadata(
        user_id="user_123",
        session_id="session_456",
        persona_id="teacher_persona",
        language="en",
        conversation_type="lesson",
        tags=["grammar", "present_tense"]
    )
    
    db.upsert(
        collection_name=Collections.USER_CONVERSATIONS,
        ids=["msg_001", "msg_002"],
        documents=[
            "How do I use the present tense correctly?",
            "Great question! The present tense has several uses: for actions happening now "
            "(I am studying), habitual actions (I study every day), and general truths "
            "(The earth revolves around the sun)."
        ],
        metadatas=[conversation_metadata, conversation_metadata]
    )
    
    print(f"✅ Added conversation to {Collections.USER_CONVERSATIONS}")
    
    print("\n📈 Tracking user progress...")
    
    # Add progress tracking
    progress_metadata = create_user_progress_metadata(
        user_id="user_123",
        language="en",
        skill_type="grammar",
        skill_level="beginner",
        progress_score=0.75,
        mastery_level=0.60,
        practice_count=5,
        difficulty_preference="adaptive"
    )
    
    db.upsert(
        collection_name=Collections.USER_PROGRESS,
        ids=["progress_001"],
        documents=["User has completed 75% of beginner grammar curriculum"],
        metadatas=[progress_metadata]
    )
    
    print(f"✅ Added progress to {Collections.USER_PROGRESS}")
    
    print("\n🔍 Searching for content...")
    
    # If embeddings are available, do semantic search
    if db.is_embedding_available():
        try:
            results = db.query(
                collection_name=Collections.LINGUISTICS_BOOK,
                query_texts=["present tense grammar"],
                n_results=3
            )
            
            print(f"Found {len(results['ids'][0])} results:")
            for i, (doc_id, document, distance) in enumerate(zip(
                results['ids'][0], 
                results['documents'][0], 
                results['distances'][0]
            )):
                print(f"  {i+1}. [{doc_id}] (similarity: {1-distance:.2f})")
                print(f"     {document[:100]}...")
                
        except Exception as e:
            print(f"❌ Search failed: {e}")
    else:
        # Fallback to metadata-based search
        results = db.get(
            collection_name=Collections.LINGUISTICS_BOOK,
            where={"topic": "grammar"}
        )
        
        print(f"Found {len(results['ids'])} grammar items:")
        for i, (doc_id, document) in enumerate(zip(results['ids'], results['documents'])):
            print(f"  {i+1}. [{doc_id}]")
            print(f"     {document[:100]}...")
    
    print("\n📊 Database statistics:")
    
    # Show collection stats
    for collection_name in [Collections.LINGUISTICS_BOOK, Collections.USER_CONVERSATIONS, Collections.USER_PROGRESS]:
        count = db.count(collection_name)
        print(f"  {collection_name}: {count} documents")
    
    print("\n🎉 Example completed successfully!")
    print(f"💾 Database stored at: {db.persist_directory}")
    print("\nTo reset the database, use:")
    print("  from linguistics.database import get_database")
    print("  db = get_database(reset_db=True)")


if __name__ == "__main__":
    main()
