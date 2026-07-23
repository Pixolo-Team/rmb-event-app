docker run --rm \
 --name evento-backend-local \
 -p 4000:4000 \
 -e DATABASE_URL="postgresql://postgres.dnjdymgydmvqhnabisqy:rx9Qg3wiPp72Uf1u@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
 -e DIRECT_URL="postgresql://postgres.dnjdymgydmvqhnabisqy:rx9Qg3wiPp72Uf1u@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" \
 -e SMTP_HOST="smtp.gmail.com" \
 -e SMTP_PORT="465" \
 -e SMTP_USER="rmbthanecity@gmail.com" \
 -e SMTP_PASS="ldtymygjmoecofvo" \
 -e MAIL_FROM="Evento <rmbthanecity@gmail.com>" \
 -e PORT="4000" \
 -e WEB_ORIGIN="http://localhost:3000" \
 -e SESSION_JWT_SECRET="dev-only-secret-change-before-deploy" \
 -e NODE_ENV="development" \
 evento-backend:local

export PROJECT_ID="evento-502713"
export REGION="asia-south1"
export REPOSITORY="evento-containers"
export SERVICE_NAME="evento-backend"
export IMAGE_NAME="evento-backend"
export IMAGE_TAG="v1"

gcloud run deploy "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
 --image="$IMAGE_URL" \
  --region="$REGION" \
 --platform=managed \
 --allow-unauthenticated \
 --service-account="$RUNTIME_SERVICE_ACCOUNT" \
 --port=4000 \
 --cpu=1 \
 --memory=512Mi \
 --min-instances=0 \
 --max-instances=10 \
 --concurrency=80 \
 --timeout=300 \
 --env-vars-file=cloud-run.env.yaml \
 --set-secrets="DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest,SMTP_PASS=SMTP_PASS:latest,SESSION_JWT_SECRET=SESSION_JWT_SECRET:latest"

export IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"

export PROJECT_ID="evento-502713"  
export REGION="asia-south1"
export REPOSITORY="evento-containers"
export SERVICE_NAME="evento-backend"
export IMAGE_NAME="evento-backend"

export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${IMAGE_TAG}"

gcloud builds submit --project="$PROJECT_ID" --region="$REGION" --tag="$IMAGE_URL" .
