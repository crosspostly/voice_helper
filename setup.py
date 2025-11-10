"""
Setup configuration for the linguistics package.

Provides package metadata and CLI entry points for the linguistics
orchestrator service.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_path = Path(__file__).parent / "README.md"
long_description = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_path.exists():
    with open(requirements_path, "r", encoding="utf-8") as f:
        requirements = [
            line.strip() 
            for line in f 
            if line.strip() and not line.startswith("#")
        ]

setup(
    name="linguistics-orchestrator",
    version="0.1.0",
    description="AI-powered linguistics service with conversation memory, RAG, and persona management",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Linguistics Team",
    author_email="team@linguistics.ai",
    url="https://github.com/linguistics/linguistics-orchestrator",
    packages=find_packages(),
    include_package_data=True,
    install_requires=requirements,
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords="ai linguistics nlp chatbot rag memory personas",
    entry_points={
        "console_scripts": [
            "linguistics-service=main_linguistics:main",
            "linguistics=linguistics.__main__:main",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/linguistics/linguistics-orchestrator/issues",
        "Source": "https://github.com/linguistics/linguistics-orchestrator",
        "Documentation": "https://docs.linguistics.ai",
    },
    package_data={
        "linguistics": [
            "data/*.json",
            "data/*.md",
        ],
    },
)