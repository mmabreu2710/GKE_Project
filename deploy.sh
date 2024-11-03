#!/bin/bash

# Step 1: Terraform to create the GKE Cluster
echo "Applying Terraform configuration to create GKE cluster..."
cd infrastructure/terraform/
terraform init
terraform apply -auto-approve

# Step 2: Get GKE credentials to interact with the cluster
echo "Fetching GKE credentials..."
gcloud container clusters get-credentials tic-tac-toe-cluster --region europe-west1 

# Step 3: Deploy Kubernetes services
echo "Deploying PostgreSQL service..."
kubectl apply -f ../kubernetes/postgres-deployment.yaml

echo "Deploying History microservice..."
kubectl apply -f ../kubernetes/history-deployment.yaml

echo "Deploying Play-Computer microservice..."
kubectl apply -f ../kubernetes/play-computer-deployment.yaml

echo "Deploying Play-Player microservice..."
kubectl apply -f ../kubernetes/play-player-deployment.yaml

# Deploy Frontend
echo "Deploying Frontend Deployment..."
kubectl apply -f ../kubernetes/frontend-deployment.yaml

# Deploy Prometheus
echo "Deploying Prometheus Deployment..."
kubectl apply -f ../kubernetes/prometheus-deployment.yaml

# Deploy Graphana
echo "Deploying Graphana Deployment..."
kubectl apply -f ../kubernetes/grafana-deployment.yaml

echo "Deploying Frontend Service..."
kubectl apply -f ../kubernetes/frontend-service.yaml

echo "Deploying Postgres Service..."
kubectl apply -f ../kubernetes/postgres-service.yaml

echo "Deploying Postgres-Exporter Service..."
kubectl apply -f ../kubernetes/postgres-exporter-service.yaml

echo "All services have been deployed to GKE."
