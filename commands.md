# Commands

## Deployment & Build

### GCP Container Build & Push

Set up environment variables and build the backend Docker image:

```bash
export IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
export PROJECT_ID="evento-502713"  
export REGION="asia-south1"
export REPOSITORY="evento-containers"
export SERVICE_NAME="evento-backend"
export IMAGE_NAME="evento-backend"

export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"

gcloud builds submit --project="$PROJECT_ID" --region="$REGION" --tag="$IMAGE_URL" .
```
