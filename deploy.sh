#!/bin/bash

# Deploy script for Google Cloud Run
echo "🚀 Deploying Ralla Water Purifiers Backend to Google Cloud Run..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please login to gcloud first: gcloud auth login"
    exit 1
fi

# Set project (replace with your project ID)
PROJECT_ID="ralla-f1f30"
echo "📋 Using project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
echo "🏗️ Building and deploying..."
gcloud builds submit --config cloudbuild.yaml

echo "✅ Deployment complete!"
echo "🌐 Your API will be available at: https://ralla-backend-[hash]-uc.a.run.app"
echo "📱 Health check: https://ralla-backend-[hash]-uc.a.run.app/health"