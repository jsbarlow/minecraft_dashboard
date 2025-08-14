#!/bin/bash

# Docker Build Script for ComputerCraft Server

set -e

echo "🐳 Building ComputerCraft Dashboard Server Docker Image..."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="computercraft-server"

echo "📦 Version: $VERSION"
echo "🏷️  Image name: $IMAGE_NAME"

# Build production image
echo "🔨 Building production image..."
docker build \
  --target production \
  --tag "$IMAGE_NAME:$VERSION" \
  --tag "$IMAGE_NAME:latest" \
  .

# Build development image
echo "🔨 Building development image..."
docker build \
  --file Dockerfile.dev \
  --tag "$IMAGE_NAME:dev" \
  .

echo "✅ Docker images built successfully!"
echo ""
echo "🚀 To run the production container:"
echo "   docker run -p 8080:8080 $IMAGE_NAME:latest"
echo ""
echo "🔧 To run the development container:"
echo "   docker-compose -f docker-compose.dev.yml up"
echo ""
echo "📊 Images built:"
docker images | grep "$IMAGE_NAME"
