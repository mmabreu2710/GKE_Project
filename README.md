# agisit24-g29

# Tic-Tac-Toe Microservices Application

## Overview

This project implements a microservices-based Tic-Tac-Toe application designed to run on a Kubernetes cluster using Google Cloud services. The application consists of multiple microservices, each responsible for a specific task, such as gameplay, player management, and history logging. The infrastructure is provisioned and managed via Terraform, with Docker images deployed to Google Cloud’s container registry. You have to generate a key json, and put it in infracture/terraform for this to work for you. Here is the video of this working: https://youtu.be/BIcsH58xQ8w

### Key Components

- **Frontend**: The web-based user interface for the Tic-Tac-Toe game.
- **Backend**: Microservices that handle the game logic, history storage, and player management.
- **Infrastructure**: Managed via Terraform, the infrastructure deploys the necessary Kubernetes cluster, networking, and other Google Cloud services required to run the application.

---

## Components Breakdown

### 1. **Frontend**
   - **Location**: `tic-tac-toe-frontend/`
   - The React-based web application allows users to play the Tic-Tac-Toe game against other players or an AI.
   - It communicates with the backend services to retrieve game states, submit moves, and store history.
   
### 2. **Backend (Microservices)**
   - **Location**: `tic-tac-toe-backend/`
   - The backend consists of the following microservices:
     - **Play-Computer Service**: Handles the logic for the AI opponent.
     - **Play-Player Service**: Handles the multiplayer game logic.
     - **History Service**: Records the game history and allows users to retrieve past games.
   - Each microservice is containerized using Docker and deployed on Kubernetes.

### 3. **Infrastructure**
   - **Location**: `infrastructure/`
   - The infrastructure folder contains Terraform scripts that provision a Kubernetes cluster on Google Cloud, networking setup, and service accounts.
   - The Docker images for the microservices are pushed to Google Container Registry.
   - This folder also contains the Kubernetes manifests used for deploying the services to the cluster.

### 4. **Deployment Scripts**
   - **deploy.sh**: Script to deploy the services, infrastructure, and applications to the Kubernetes cluster.
   - **destroy.sh**: Script to tear down the Kubernetes services and clean up the infrastructure.
   - **docker_build_and_push.sh**: Script to build and push the Docker images of the microservices to Google Cloud’s container registry.
   - **restart_service.sh**: Script to restart the microservices after changes are made.

---

## Setup Instructions

### Prerequisites
1. **Google Cloud Account**: Ensure you have a Google Cloud account with access to Kubernetes Engine and Container Registry.
2. **Google Cloud SDK**: Install and configure Google Cloud SDK to interact with Google Cloud.
3. **Terraform**: Ensure Terraform is installed on your machine.
4. **Docker**: Install Docker to build the container images for the microservices.

### Steps to Install

1. **Clone the Repository and install google-cloud-sdk**:
   ```bash
   git clone <repository_url>
   cd agisit24-g29
2. **Build and Push Docker Images**:
Use the `docker_build_and_push.sh` script to build the Docker images for the microservices and push them to Google Cloud Container Registry.
    ```bash
    ./docker_build_and_push.sh
3. **Provision the Infrastructure with Terraform:**:
Navigate to the infrastructure/terraform folder and run Terraform commands to provision the required Google Cloud resources:
    ```bash
    cd infrastructure/terraform
    terraform init
    terraform apply
4. **Deploy the Application:**:
Once the infrastructure is provisioned, use the deploy.sh script to deploy the application to the Kubernetes cluster:
    ```bash
    ./deploy.sh
5. **Access the Application:**:
After the deployment, the frontend and backend services will be accessible via the external IPs assigned by Google Cloud. You can find the IPs by running:
    ```bash
    kubectl get services
6. **Monitor and Manage the System**:Prometheus is set up to scrape metrics from the various services, and Grafana is configured to visualize them.
Access Grafana using the external IP of the grafana-service.

7. **Test the system**:If you want to test the system use the python script and change number of requests:
    ```bash
    python3 test_start_computer.py
8. **Clean Up:**:
If you wish to clean up the infrastructure and stop the services, run the destroy.sh script:
    ```bash
    ./destroy.sh
## Conclusion
This project demonstrates the use of microservices architecture, Kubernetes, and Google Cloud services to build and deploy a scalable Tic-Tac-Toe game. By using Terraform and Docker, the infrastructure is easily manageable, and the services can be deployed in a streamlined manner.
