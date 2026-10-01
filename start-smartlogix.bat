@echo off
setlocal EnableExtensions DisableDelayedExpansion

title SmartLogix - Docker Desktop Launcher
color 0B

set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "DRY_RUN=0"

if /i "%~1"=="/dry-run" set "DRY_RUN=1"
if /i "%~1"=="--dry-run" set "DRY_RUN=1"

call :banner
echo.
echo  Root: %ROOT_DIR%
echo  Runtime: Docker Desktop / Docker Compose
if "%DRY_RUN%"=="1" echo  Mode: Dry run validation
echo.

cd /d "%ROOT_DIR%" || goto :fail

where docker >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Docker CLI is not installed or is not available in PATH.
  goto :fail
)

docker --version || goto :fail
docker compose version || goto :fail
docker info >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Docker Desktop is installed, but its engine is not running.
  echo          Open Docker Desktop and wait until the engine is ready.
  goto :fail
)

if not exist "%ROOT_DIR%\.env" (
  echo  [INFO] No local .env file found; using variables from the current environment.
)

echo  Validating Docker Compose configuration...
docker compose config --quiet
if errorlevel 1 goto :fail
echo  [OK] Docker Compose configuration is valid.

if "%DRY_RUN%"=="1" (
  echo.
  echo  Dry run completed. No containers were created or changed.
  exit /b 0
)

echo.
echo  Building and starting SmartLogix...
docker compose up -d --build --wait --wait-timeout 300
if errorlevel 1 goto :runtime_fail

echo.
docker compose ps
echo.
echo  ================================================================
echo   SmartLogix is ready
echo  ================================================================
echo.
echo   Frontend:    http://localhost:5173
echo   API Gateway: http://localhost:8080
echo   pgAdmin:     http://localhost:5050
echo   RabbitMQ UI: http://localhost:15672
echo.
pause
exit /b 0

:banner
echo  ================================================================
echo   SMARTLOGIX - Complete local Docker stack
echo  ================================================================
exit /b 0

:runtime_fail
echo.
echo  [ERROR] One or more SmartLogix services failed to become healthy.
echo.
docker compose ps --all
echo.
docker compose logs --no-color --tail 100
echo.
echo  The current container state is being preserved for diagnosis.
goto :fail

:fail
echo.
echo  ================================================================
echo   Startup aborted. Review the error above; no volumes were deleted.
echo  ================================================================
echo.
pause
exit /b 1
