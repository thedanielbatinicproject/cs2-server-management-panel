#!/bin/bash

# CS2 RCON Manager - Start Script (Docker)
# Builds and starts both backend and frontend using Docker

set -e

echo "=========================================="
echo "  CS2 RCON Manager - Starting with Docker"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}[1/2] Building Docker containers...${NC}"
docker-compose build

echo -e "${YELLOW}[2/2] Starting Docker containers...${NC}"
docker-compose up -d

# Wait for containers to start
echo "Waiting for services to start..."
sleep 10

# Open browser (cross-platform)
FRONTEND_URL="http://localhost:8080"
echo -e "${GREEN}Opening browser at $FRONTEND_URL${NC}"

if command -v xdg-open &> /dev/null; then
    xdg-open "$FRONTEND_URL"
elif command -v open &> /dev/null; then
    open "$FRONTEND_URL"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  CS2 RCON Manager is running!"
echo "=========================================="
echo ""
echo "  Frontend: http://localhost:8080"
echo "  Backend:  http://localhost:3001"
echo ""
echo "  Default login: admin / admin"
echo ""
echo "  To stop: docker-compose down"
echo "  To view logs: docker-compose logs -f"
echo -e "==========================================${NC}"
