#!/bin/bash

# Deploy Script with Voice Preloading
# This script builds the application and preloads voice samples

set -e  # Exit on any error

echo "🚀 Starting deployment with voice preloading..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Create public/voice-samples directory if it doesn't exist
mkdir -p public/voice-samples

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    print_warning "GEMINI_API_KEY environment variable not set. Using default key."
fi

# Preload voice samples
print_status "Preloading voice samples..."
node scripts/preload-voices.js public/voice-samples

if [ $? -ne 0 ]; then
    print_error "Voice preloading failed. Continuing with build anyway..."
fi

# Build the application
print_status "Building application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

# Check if build directory exists
if [ ! -d "dist" ]; then
    print_error "Build directory 'dist' not found!"
    exit 1
fi

# Copy voice samples to dist directory
print_status "Copying voice samples to build directory..."
cp -r public/voice-samples dist/

# Create a manifest file with build info
cat > dist/voice-manifest.json << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "voiceSamplesGenerated": true,
  "totalVoices": $(node -e "console.log(require('./src/constants/voices.ts').AVAILABLE_VOICES.length)"),
  "samplesDirectory": "voice-samples/"
}
EOF

print_status "✅ Deployment completed successfully!"
print_status "📁 Build directory: dist/"
print_status "🎤 Voice samples: dist/voice-samples/"
print_status "📋 Manifest: dist/voice-manifest.json"

# Show preview command
print_status "To preview the build, run: npm run preview"

echo -e "${GREEN}🎉 All done! Your application is ready with preloaded voice samples.${NC}"