#!/bin/bash

# Define common variables
PROJECT_ID="agisit-2425-website-98956"
REGION="europe-west1"
BACKEND_REPO="backend-repo"  # Backend repository for services
FRONTEND_REPO="frontend-repo"  # Frontend repository
TAG="latest"  # You can change this to a version number or timestamp for versioning
SERVICES=("frontend" "history" "play-computer" "play-player")

# Authenticate with Google Cloud (if necessary)
echo "Authenticating with Google Cloud..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Function to build, tag, and push a Docker image
build_and_push() {
  local service=$1
  local path=$2
  local repo=$3

  echo "Building Docker image for ${service}..."
  cd ${path} || { echo "Directory ${path} not found, exiting."; exit 1; }  # Go to service directory

  docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}-image:${TAG} .

  echo "Pushing Docker image for ${service} to Google Artifact Registry..."
  docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}-image:${TAG}

  cd - || exit 1  # Go back to the previous directory
}

# Step 1: Build and push frontend
echo "Building and pushing frontend..."
build_and_push "frontend" "tic-tac-toe-frontend" ${FRONTEND_REPO}

# Step 2: Build and push backend services
for service in "${SERVICES[@]:1}"; do
  echo "Building and pushing backend service: $service"
  build_and_push ${service} "tic-tac-toe-backend/microservices/${service}" ${BACKEND_REPO}
done

echo "All Docker images have been built and pushed to Artifact Registry."
