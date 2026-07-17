#!/bin/bash
# devops/deploy.sh
# Run this script locally to deploy the application to your EC2 instance.
# Usage: ./devops/deploy.sh

# --- Configuration ---
# Update these variables with your actual EC2 details
EC2_USER="ubuntu"
EC2_HOST="your-ec2-ip-or-domain"
EC2_KEY_PATH="~/.ssh/your-key.pem"
APP_DIR="/home/ubuntu/upward" # Path to the repository on your EC2 instance
# ---------------------

echo "Starting deployment to $EC2_USER@$EC2_HOST..."

ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << EOF
  set -e
  
  echo "Navigating to app directory: $APP_DIR"
  cd $APP_DIR

  echo "Pulling latest code from main branch..."
  git checkout main
  git pull origin main

  if [ ! -f ".env" ] && [ ! -f "server/apps/api/.env" ]; then
    echo "WARNING: No .env file found in the root or server/apps/api directory!"
    echo "Make sure you manually create the .env file on the server with your production secrets."
  fi

  echo "Installing dependencies..."
  pnpm install

  echo "Building the API application..."
  # Build only the API, or use 'pnpm build' to build the whole monorepo
  pnpm --filter @upward/api build

  echo "Generating Prisma Client..."
  pnpm --filter @upward/api prisma:generate

  # Uncomment the following line if you want to run DB migrations automatically during deployment
  # echo "Running DB Migrations..."
  # pnpm --filter @upward/api exec prisma migrate deploy --schema=prisma/schema

  echo "Restarting application via PM2..."
  # Use the ecosystem config located in the devops directory
  pm2 startOrRestart devops/ecosystem.config.js --env production
  
  # Save the PM2 list so it restarts on system reboot
  pm2 save

  echo "Deployment Successful!"
EOF
