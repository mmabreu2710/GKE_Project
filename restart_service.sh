#!/bin/bash

# Define common variables
PROJECT_ID="agisit-2425-website-98956"
REGION="europe-west1"
REPO="frontend-repo"  # Set for frontend and backend services.
TAG="latest"  # You can change this to a version number or timestamp for versioning
SERVICES=("frontend" "play-computer" "play-player" "history")

# Authenticate with Google Cloud (if necessary)
echo "Authenticating with Google Cloud..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Function to build, tag, and push a Docker image
build_and_push() {
  local service=$1
  local repo=$2
  local path=$3
  
  echo "Building Docker image for ${service}..."
  cd ${path} || { echo "Directory ${path} not found, exiting."; exit 1; }  # Go to service directory
  
  # Build the Docker image
  docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}-image:${TAG} .
  
  echo "Pushing Docker image for ${service} to Google Artifact Registry..."
  docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}-image:${TAG}
  
  cd - || exit 1  # Go back to the previous directory
}

# Function to update Kubernetes deployment with the new image
update_kubernetes_deployment() {
  local service=$1
  local repo=$2
  
  echo "Updating Kubernetes deployment for ${service}..."
  kubectl set image deployment/${service}-deployment ${service}=${REGION}-docker.pkg.dev/${PROJECT_ID}/${repo}/${service}-image:${TAG}
  
  echo "Rolling out deployment restart for ${service}..."
  kubectl rollout restart deployment/${service}-deployment
}

# Step 1: Build and push frontend
echo "Building and pushing frontend..."
build_and_push "frontend" ${REPO} "tic-tac-toe-frontend"

# Step 2: Build and push backend services
for service in "play-computer" "play-player" "history"; do
  echo "Building and pushing backend service: $service"
  build_and_push ${service} "backend-repo" "tic-tac-toe-backend/microservices/${service}"
done

echo "All Docker images have been built and pushed to Artifact Registry."

# Step 3: Update Kubernetes deployments
echo "Updating frontend Kubernetes deployment..."
update_kubernetes_deployment "frontend" ${REPO}

for service in "play-computer" "play-player" "history"; do
  echo "Updating Kubernetes deployment for backend service: $service"
  update_kubernetes_deployment ${service} "backend-repo"
done

echo "All Kubernetes deployments have been updated and restarted."
