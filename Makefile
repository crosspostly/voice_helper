.PHONY: help install dev test lint format clean linguistics-run linguistics-test

# Default target
help:
	@echo "Available commands:"
	@echo "  install          Install Python dependencies"
	@echo "  dev              Install development dependencies"
	@echo "  test             Run tests"
	@echo "  lint             Run linting checks"
	@echo "  format           Format code"
	@echo "  clean            Clean generated files"
	@echo "  linguistics-run  Run linguistics service"
	@echo "  linguistics-test Test linguistics package"

# Installation
install:
	pip install -r requirements.txt

dev: install
	pip install -e .

# Testing
test:
	pytest

linguistics-test:
	python -m pytest linguistics/ -v

# Code quality
lint:
	ruff check linguistics/
	mypy linguistics/

format:
	ruff format linguistics/
	black linguistics/

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/

# Linguistics service
linguistics-run:
	@echo "Starting linguistics service..."
	@echo "Make sure to set GEMINI_API_KEY environment variable"
	python -m linguistics

# Validation
validate-linguistics:
	python -m compileall linguistics/
	@echo "✅ Linguistics package compiles successfully"

# Setup
setup-dirs:
	@echo "Creating necessary directories..."
	python -c "from linguistics.config import config; config.ensure_directories()"
	@echo "✅ Directories created"
