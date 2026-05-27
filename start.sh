#!/bin/bash
# NOVA Server Startup Script
# Keeps the server alive by auto-restarting on crashes

cd /home/z/my-project/.next/standalone

export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

echo "Starting NOVA server..."

while true; do
  node server.js
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE, restarting in 2 seconds..."
  sleep 2
done
