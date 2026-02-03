@echo off
REM CS2 RCON Manager - Start Script for Windows (Docker)
REM Builds and starts both backend and frontend using Docker

echo ==========================================
echo   CS2 RCON Manager - Starting with Docker
echo ==========================================

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/2] Building Docker containers...
docker-compose build
if errorlevel 1 (
    echo Docker build failed!
    pause
    exit /b 1
)

echo [2/2] Starting Docker containers...
start "CS2-RCON-Docker" cmd /c "docker-compose up"

REM Wait for containers to start
echo Waiting for services to start...
timeout /t 15 /nobreak > nul

echo Opening browser...
start http://localhost:8080

echo.
echo ==========================================
echo   CS2 RCON Manager is running!
echo ==========================================
echo.
echo   Frontend: http://localhost:8080
echo   Backend:  http://localhost:3001
echo.
echo   Default login: admin / admin
echo.
echo   To stop: Press Ctrl+C in Docker window
echo            or run: docker-compose down
echo ==========================================

pause
