provider "google" {
  credentials = file("${path.module}/key.json")  
  project     = var.project_id
  region      = var.region
}

# Create a VPC for the project
resource "google_compute_network" "vpc_network" {
  name = "tic-tac-toe-vpc"
}

# Define subnetwork
resource "google_compute_subnetwork" "subnet" {
  name          = "tic-tac-toe-subnet"
  ip_cidr_range = "10.0.0.0/16"
  network       = google_compute_network.vpc_network.self_link
  region        = var.region
}

# Create GKE Cluster
resource "google_container_cluster" "primary" {
  name               = "tic-tac-toe-cluster"
  location           = var.region
  
  # Reduce the initial node count to save resources
  initial_node_count = 1  # Reduce to 1 if you only need a minimal cluster for testing

  deletion_protection = false  # Add this to ensure the cluster can be deleted
  

  # Reduce the machine type and disk size for each node
  node_config {
    machine_type = "e2-medium"  # Smaller machine type (e2-medium is cheaper than n1-standard-1)
    disk_size_gb = 20           # Decrease disk size from the default (100GB) to 20GB

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  network    = google_compute_network.vpc_network.name
  subnetwork = google_compute_subnetwork.subnet.name
}

# Create firewall rule to allow traffic from anywhere on HTTP (port 80)
resource "google_compute_firewall" "allow-http" {
  name    = "allow-http"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
}

# Remove the HTTPS firewall rule if you are not serving your services over HTTPS
# Uncomment if necessary
# resource "google_compute_firewall" "allow-https" {
#   name    = "allow-https"
#   network = google_compute_network.vpc_network.name

#   allow {
#     protocol = "tcp"
#     ports    = ["443"]
#   }

#   source_ranges = ["0.0.0.0/0"]
# }

# Output cluster details
output "gke_cluster_endpoint" {
  description = "The GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
}
