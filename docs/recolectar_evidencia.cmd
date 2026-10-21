@echo off
REM ---------------------------------------------------------------------------
REM Recoleccion automatica de evidencia de mensajeria (EP2) - SmartLogix
REM Programado con schtasks para las 18:40 (10 min antes de la presentacion).
REM ---------------------------------------------------------------------------
setlocal
cd /d "C:\Users\User\Desktop\smartlogix-azure"

if not exist "evidencia" mkdir "evidencia"

REM Cadena de conexion con la regla smartlogix-admin (el SDK de administracion
REM exige el claim "Manage"; la policy de la app solo tiene Send/Listen).
for /f "usebackq delims=" %%i in (`az servicebus namespace authorization-rule keys list -g rg-smartlogix-aca --namespace-name sb-smartlogix-ns -n smartlogix-admin --query primaryConnectionString -o tsv 2^>nul`) do set "SB_CONN=%%i"

echo [%date% %time%] inicio de la recoleccion automatica >> "evidencia\recoleccion_programada.log"
python "docs\recolectar_evidencia.py" >> "evidencia\recoleccion_programada.log" 2>&1
echo [%date% %time%] fin (codigo %errorlevel%) >> "evidencia\recoleccion_programada.log"
endlocal
