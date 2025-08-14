#!/bin/bash

# Deployment Script for ComputerCraft Server
# This script helps deploy to various hosting platforms

set -e

echo "🚀 ComputerCraft Server Deployment Script"
echo "=========================================="

# Function to deploy to different platforms
deploy_to_platform() {
    case $1 in
        "railway")
            echo "🚂 Deploying to Railway..."
            echo "1. Make sure you have Railway CLI installed: npm install -g @railway/cli"
            echo "2. Login: railway login"
            echo "3. Create project: railway new"
            echo "4. Deploy: railway up"
            echo "5. Set environment variables in Railway dashboard"
            ;;
        "render")
            echo "🎨 Deploying to Render..."
            echo "1. Connect your GitHub repository to Render"
            echo "2. Create a new Web Service"
            echo "3. Use these settings:"
            echo "   - Build Command: npm install && npm run build"
            echo "   - Start Command: npm start"
            echo "   - Environment: Node"
            echo "4. Set environment variables in Render dashboard"
            ;;
        "fly")
            echo "🪰 Deploying to Fly.io..."
            echo "1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/"
            echo "2. Login: fly auth login"
            echo "3. Launch app: fly launch"
            echo "4. Deploy: fly deploy"
            ;;
        "docker")
            echo "🐳 Building Docker image for manual deployment..."
            ./scripts/docker-build.sh
            ;;
        *)
            echo "❓ Unknown platform: $1"
            echo "Available platforms: railway, render, fly, docker"
            exit 1
            ;;
    esac
}

# Check if platform argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <platform>"
    echo "Available platforms:"
    echo "  - railway   (Free tier available)"
    echo "  - render    (Free tier available)"
    echo "  - fly       (Free tier available)"
    echo "  - docker    (Build for manual deployment)"
    exit 1
fi

# Build the project first
echo "🔨 Building project..."
npm run build

# Deploy to specified platform
deploy_to_platform $1

echo ""
echo "✅ Deployment preparation complete!"
echo "📋 Don't forget to:"
echo "   1. Set environment variables on your hosting platform"
echo "   2. Update CORS_ORIGINS to include your production domain"
echo "   3. Test the health endpoint: /health"
echo "   4. Update your ComputerCraft scripts with the new server URL"
