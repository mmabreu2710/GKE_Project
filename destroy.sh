# Step 1: Set up Kubernetes context
echo "Fetching GKE credentials to interact with the cluster..."
gcloud container clusters get-credentials tic-tac-toe-cluster --region europe-west1

# Step 2: Delete Kubernetes services and deployments
echo "Deleting Frontend service and deployment..."
kubectl delete -f infrastructure/kubernetes/frontend-deployment.yaml
kubectl delete -f infrastructure/kubernetes/frontend-service.yaml

echo "Deleting Play-Player microservice..."
kubectl delete -f infrastructure/kubernetes/play-player-deployment.yaml

echo "Deleting Play-Computer microservice..."
kubectl delete -f infrastructure/kubernetes/play-computer-deployment.yaml

echo "Deleting History microservice..."
kubectl delete -f infrastructure/kubernetes/history-deployment.yaml

echo "Deleting grafana microservice..."
kubectl delete -f infrastructure/kubernetes/grafana-deployment.yaml

echo "Deleting prometheus microservice..."
kubectl delete -f infrastructure/kubernetes/prometheus-deployment.yaml

echo "Deleting PostgreSQL service and deployment..."
kubectl delete -f infrastructure/kubernetes/postgres-deployment.yaml
kubectl delete -f infrastructure/kubernetes/postgres-service.yaml
kubectl delete -f infrastructure/kubernetes/postgres-exporter-service.yaml

# Optional: Check that all resources have been deleted
echo "Checking if any pods are still running..."
kubectl get pods --all-namespaces

# Step 3: Terraform destroy to remove the GKE cluster and associated resources
echo "Destroying the GKE cluster and infrastructure with Terraform..."
cd infrastructure/terraform/
terraform destroy -auto-approve

echo "All Kubernetes resources and infrastructure have been destroyed."
