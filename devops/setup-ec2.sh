#!/bin/bash
# setup-ec2.sh
# Run this script directly ON the EC2 instance to set it up initially.
# It assumes an Ubuntu/Debian-based OS.

set -e

echo "Starting EC2 Setup for Upward API..."

# 1. Update system
echo "Updating packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js v20 (LTS)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install pnpm
echo "Installing pnpm..."
sudo npm install -g pnpm

# 4. Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# 5. Setup PM2 startup script
echo "Configuring PM2 to start on boot..."
pm2 startup ubuntu -u $USER --hp $HOME
# Note: You may need to run the command PM2 prints out manually if this fails.

# 6. Install other dependencies (Git, build tools)
echo "Installing Git and build tools..."
sudo apt install -y git build-essential

# 7. Install & configure self-hosted Redis for BullMQ queues
echo "Installing Redis server..."
sudo apt install -y redis-server

echo "Configuring Redis for BullMQ (localhost-only, AOF persistence, noeviction)..."
sudo sed -i 's/^appendonly no$/appendonly yes/' /etc/redis/redis.conf
if ! grep -q '^maxmemory ' /etc/redis/redis.conf; then
  echo 'maxmemory 256mb' | sudo tee -a /etc/redis/redis.conf > /dev/null
fi
if ! grep -q '^maxmemory-policy ' /etc/redis/redis.conf; then
  echo 'maxmemory-policy noeviction' | sudo tee -a /etc/redis/redis.conf > /dev/null
fi

sudo systemctl enable --now redis-server
sudo systemctl restart redis-server

echo "Setup complete! You can now clone the repository and run the deployment script."
echo "Verify installations:"
node -v
pnpm -v
pm2 -v
redis-cli ping
