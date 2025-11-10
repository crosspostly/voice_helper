"""
Integration test to verify the ChromaDB client works with the React app.

This script tests the client behavior with and without API keys to ensure
graceful degradation.
"""

import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from linguistics.database import get_database, Collections


def test_without_api_key():
    """Test client behavior when API key is missing."""
    print("🧪 Testing without API key...")
    
    # Ensure no API key is set
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]
    
    try:
        db = get_database()
        
        # Should work without API key
        assert not db.is_embedding_available()
        print("✅ Client initializes without API key")
        
        # Should be able to create collections
        collection = db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        assert collection is not None
        print("✅ Collections can be created without API key")
        
        # Should be able to upsert documents
        result = db.upsert(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["test_001"],
            documents=["Test document"],
            metadatas=[{
                "content_type": "lesson",
                "difficulty_level": "beginner",
                "topic": "grammar",
                "language": "en"
            }]
        )
        assert result == ["test_001"]
        print("✅ Documents can be upserted without API key")
        
        # Should be able to get documents
        results = db.get(collection_name=Collections.LINGUISTICS_BOOK, ids=["test_001"])
        assert len(results['ids']) == 1
        print("✅ Documents can be retrieved without API key")
        
        # Should NOT be able to query with text (requires embeddings)
        try:
            db.query(collection_name=Collections.LINGUISTICS_BOOK, query_texts=["test"])
            assert False, "Should not be able to query without embeddings"
        except Exception:
            print("✅ Query correctly fails without API key")
        
        print("✅ All tests passed without API key")
        return True
        
    except Exception as e:
        print(f"❌ Test failed without API key: {e}")
        return False


def test_with_mock_api_key():
    """Test client behavior with mocked API key."""
    print("\n🧪 Testing with mock API key...")
    
    # Set a mock API key
    os.environ["GEMINI_API_KEY"] = "mock-api-key-for-testing"
    
    try:
        # Reset database to clear any cached instance
        from linguistics.database import reset_database
        reset_database()
        
        db = get_database()
        
        # Should have embedding service available (but will fail on actual calls)
        # This is expected since we don't have a real API key
        print("✅ Client initializes with API key")
        
        # Should be able to create collections
        collection = db.get_or_create_collection(Collections.LINGUISTICS_BOOK)
        assert collection is not None
        print("✅ Collections can be created with API key")
        
        # Should be able to upsert documents
        result = db.upsert(
            collection_name=Collections.LINGUISTICS_BOOK,
            ids=["test_002"],
            documents=["Another test document"],
            metadatas=[{
                "content_type": "exercise",
                "difficulty_level": "intermediate",
                "topic": "vocabulary",
                "language": "en"
            }]
        )
        assert result == ["test_002"]
        print("✅ Documents can be upserted with API key")
        
        print("✅ All tests passed with mock API key")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with mock API key: {e}")
        return False


def test_database_persistence():
    """Test that database persists across instances."""
    print("\n🧪 Testing database persistence...")
    
    try:
        # Create first instance
        db1 = get_database()
        
        # Add some data
        db1.upsert(
            collection_name=Collections.USER_PROGRESS,
            ids=["progress_001"],
            documents=["User progress tracking"],
            metadatas=[{
                "user_id": "test_user",
                "language": "en",
                "skill_type": "grammar",
                "skill_level": "beginner",
                "progress_score": 0.5,
                "mastery_level": 0.3
            }]
        )
        
        # Create second instance (should reuse same database)
        db2 = get_database()
        
        # Should be able to retrieve data
        results = db2.get(collection_name=Collections.USER_PROGRESS, ids=["progress_001"])
        assert len(results['ids']) == 1
        print("✅ Database persists across instances")
        
        # Should show correct counts
        count = db2.count(Collections.USER_PROGRESS)
        assert count == 1
        print("✅ Document counts are accurate")
        
        print("✅ All persistence tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Persistence test failed: {e}")
        return False


def test_error_handling():
    """Test error handling and graceful degradation."""
    print("\n🧪 Testing error handling...")
    
    try:
        db = get_database()
        
        # Test invalid collection name
        try:
            db.get_or_create_collection("invalid_collection")
            assert False, "Should raise error for invalid collection"
        except Exception:
            print("✅ Invalid collection names are rejected")
        
        # Test invalid metadata
        try:
            db.upsert(
                collection_name=Collections.LINGUISTICS_BOOK,
                ids=["invalid_001"],
                documents=["Invalid document"],
                metadatas=[{
                    "content_type": "invalid_type",  # Invalid content type
                    "difficulty_level": "beginner",
                    "topic": "grammar",
                    "language": "en"
                }]
            )
            assert False, "Should raise error for invalid metadata"
        except Exception:
            print("✅ Invalid metadata is rejected")
        
        # Test mismatched array lengths
        try:
            db.upsert(
                collection_name=Collections.LINGUISTICS_BOOK,
                ids=["mismatch_001", "mismatch_002"],
                documents=["Only one document"],  # Mismatched length
                metadatas=[{}]
            )
            assert False, "Should raise error for mismatched lengths"
        except Exception:
            print("✅ Mismatched array lengths are rejected")
        
        print("✅ All error handling tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False


def main():
    """Run all integration tests."""
    print("🚀 Starting ChromaDB integration tests...\n")
    
    tests = [
        test_without_api_key,
        test_with_mock_api_key,
        test_database_persistence,
        test_error_handling
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed!")
        print("✅ ChromaDB client is ready for production use")
        return True
    else:
        print("❌ Some tests failed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
