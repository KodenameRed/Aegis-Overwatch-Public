@echo off
TITLE Aegis Overwatch - Core Orchestration Server (C2)
color 0b
cd /d "%~dp0"

:: 1. Elevation Check (Required for wevtutil in sensors)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ============================================================================
echo   [ /// AEGIS OVERWATCH: IGNITION NEXUS /// ]
echo ============================================================================
echo [*] Purging ghost processes and freeing network ports...

:: 2. Surgical Zombie Purge
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name = 'python.exe' OR Name = 'pythonw.exe'\" | Where-Object { $_.CommandLine -match 'Orchestration_Layer' -or $_.CommandLine -match 'aegis_' -or $_.CommandLine -match 'c2_socket' } | Invoke-CimMethod -MethodName Terminate" >nul 2>&1
echo [+] Environment mathematically sterilized.

:: 3. Sovereign Core Auto-Start (The Public Release Fix)
echo [*] Checking for Sovereign Core Engine (Ollama)...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [+] Ollama is already running in the background.
) else (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe" (
        echo [*] Waking up local Ollama engine...
        start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"
        :: Give Ollama 3 seconds to bind to port 11434 before starting Aegis
        timeout /t 3 >nul 
    ) else (
        echo [!] Ollama not found in default path. If using Sovereign Mode, please start it manually.
    )
)

:: 4. Failsafe ASN Database Check (For Public Release)
echo [*] Verifying Network Infrastructure Dependencies...
if not exist "data\GeoLite2-ASN.mmdb" (
    echo [!] ASN Database missing. Executing emergency TLS 1.2 download...
    if not exist "data" mkdir data
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb' -OutFile 'data\GeoLite2-ASN.mmdb'"
    if exist "data\GeoLite2-ASN.mmdb" (
        echo [+] ASN Database restored successfully.
    ) else (
        color 0e
        echo [!] EMERGENCY DOWNLOAD FAILED. Network Sentinel will operate in degraded mode.
        color 0b
    )
) else (
    echo [+] ASN Database verified.
)

echo [*] Booting FastAPI Orchestration Server...
echo.
echo ============================================================================
echo  [!] IMPORTANT: DO NOT CLOSE THIS TERMINAL.
echo  [!] This window acts as your live C2 Console and forensic log stream.
echo  [!] To shut down Aegis securely, simply close this window.
echo ============================================================================
echo.

:: 5. Launch Dashboard (Dynamic TCP Polling)
echo [*] Arming Dashboard Auto-Launcher...
start "" powershell -NoProfile -WindowStyle Hidden -Command "$t = New-Object System.Net.Sockets.TcpClient; while(!$t.Connected) { try { $t.Connect('127.0.0.1', 8000) } catch { Start-Sleep -Milliseconds 500 } }; $t.Close(); Start-Process 'http://localhost:8000/dashboard'"

:: 6. Run the Server in the FOREGROUND (With VENV Binding)
if exist "venv\Scripts\activate.bat" (
    echo [*] Binding Virtual Environment variables...
    call "venv\Scripts\activate.bat"
    python aegis_server.py
) else (
    echo [!] Virtual environment not found. Falling back to system Python...
    python aegis_server.py
)

echo.
echo [X] Aegis Orchestration Server has been terminated.
pause