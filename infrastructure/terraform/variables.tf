variable "project_id" {
  description = "The GCP project ID"
  type        = string   # Add the type for clarity
}

variable "region" {
  description = "The region in which to create resources"
  default     = "europe-west1"  # Replace with your desired default region
  type        = string
}

variable "postgres_password" {
  description = "Password for the PostgreSQL database"
  type        = string          # Removed the default to ensure it's passed securely via terraform.tfvars
}
