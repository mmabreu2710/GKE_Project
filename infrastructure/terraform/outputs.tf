# Output the GKE cluster name
output "gke_cluster_name" {
  description = "The name of the GKE cluster"
  value       = google_container_cluster.primary.name
}

# Output the GKE cluster certificate authority data
output "gke_cluster_ca_certificate" {
  description = "The GKE cluster certificate authority data"
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
}

