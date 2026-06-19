@echo off
REM Launch the LNP / Liposome Formulation Studio PWA on a local server.
cd /d "%~dp0"
echo Starting LNP / Liposome Formulation Studio ...
echo If your browser does not open automatically, go to http://localhost:8080/
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 serve.py 8080
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python serve.py 8080
  ) else (
    echo.
    echo Python was not found. Falling back to the PowerShell server...
    powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0serve.ps1" -Port 8080
  )
)
pause
