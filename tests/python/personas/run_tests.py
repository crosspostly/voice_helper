"""
Test runner for persona system tests.
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

if __name__ == "__main__":
    import pytest
    
    # Run the persona tests
    print("🧪 Running Persona Suite Tests...")
    
    test_args = [
        __file__.replace("run_tests.py", ""),  # Current directory
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "-x",  # Stop on first failure
    ]
    
    result = pytest.main(test_args)
    
    if result == 0:
        print("✅ All persona tests passed!")
    else:
        print("❌ Some persona tests failed!")
        sys.exit(1)