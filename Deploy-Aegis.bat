@echo off
setlocal enabledelayedexpansion
TITLE Aegis Overwatch - Strategic Deployment v5.5-DUAL-HYBRID
color 0b
cd /d "%~dp0"

:: 1. Elevation Check
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] PERMISSION DENIED: Aegis requires an Elevated Command Prompt.
    echo [!] FIX: Close this window, right-click Deploy-Aegis.bat, and select "Run as Administrator".
    pause
    exit
)

:: 2. Strict Architectural Validation & Python Sourcing
echo [~] Validating local Python topography and Cython compatibility...
set "PY_EXE="
set "FORCE_NEW_VENV=0"

:: Check if a legitimate python is already in the system PATH
for /f "delims=" %%a in ('where python 2^>nul') do (
    echo %%a | findstr /i "WindowsApps" >nul
    if errorlevel 1 (
        if not defined PY_EXE set "PY_EXE=%%a"
    )
)

:: Enforce Python 3.13 Architecture Match
if defined PY_EXE (
    for /f "tokens=2" %%I in ('"!PY_EXE!" -V 2^>^&1') do set "PYVER=%%I"
    echo !PYVER! | findstr /b "3.13" >nul
    if errorlevel 1 (
        color 0e
        echo [!] Architecture Mismatch: Found Python !PYVER!, but Aegis requires exactly v3.13.x.
        echo [*] Invalidating host environment. Forcing Python 3.13 upgrade pipeline...
        set "PY_EXE="
        set "FORCE_NEW_VENV=1"
    ) else (
        echo [+] Discovered compatible Cython engine: !PY_EXE! [v!PYVER!]
    )
)

:: Autonomous Python 3.13 Provisioning
if not defined PY_EXE (
    color 0e
    if "!FORCE_NEW_VENV!"=="0" echo [!] Python environment missing or hijacked by MS Store aliases.
    echo [*] Initiating Autonomous Enterprise Provisioning Suite...
    
    set "PY_INSTALLER=%TEMP%\aegis_py_installer.exe"
    echo [*] Fetching official Python 3.13 binaries via TLS 1.2 [Silent/High-Speed]...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.13.0/python-3.13.0-amd64.exe' -OutFile '!PY_INSTALLER!'"
    
    if not exist "!PY_INSTALLER!" (
        color 0c
        echo ============================================================================
        echo [!] FATAL ERROR: PYTHON DOWNLOAD FAILED
        echo ============================================================================
        echo DIAGNOSTIC: The network link failed to fetch Python 3.13 binaries.
        echo ACTION REQUIRED: Check your firewall, proxy, or internet connection.
        echo ============================================================================
        pause
        exit
    )
    
    echo [*] Executing headless system-wide installation...
    start /wait "" "!PY_INSTALLER!" /passive InstallAllUsers=1 PrependPath=1 Include_test=0 Include_pip=1 Shortcuts=0
    del /f /q "!PY_INSTALLER!" >nul 2>&1
    
    :: Locate the newly installed Python 3.13 explicitly
    if exist "%ProgramFiles%\Python313\python.exe" (
        set "PY_EXE=%ProgramFiles%\Python313\python.exe"
    ) else if exist "%ProgramFiles(x86)%\Python313\python.exe" (
        set "PY_EXE=%ProgramFiles(x86)%\Python313\python.exe"
    ) else if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
        set "PY_EXE=%LocalAppData%\Programs\Python\Python313\python.exe"
    ) else (
        color 0c
        echo ============================================================================
        echo [!] FATAL ERROR: PYTHON BINARY MISSING POST-INSTALL
        echo ============================================================================
        echo DIAGNOSTIC: The silent installer finished, but python.exe could not be found.
        echo ACTION REQUIRED: Install Python 3.13 manually and check "Add to PATH".
        echo ============================================================================
        pause
        exit
    )
    
    color 0b
    echo [+] Success: Autonomous Python core deployed at !PY_EXE!
    set "FORCE_NEW_VENV=1"
)

:: 3. Validate C++ Redistributable (Required for Cython .pyd execution)
echo [~] Verifying Microsoft Visual C++ Runtime libraries...
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" /v "Version" >nul 2>&1
if %errorlevel% neq 0 (
    color 0e
    echo [!] VC++ Redistributable missing. Cython binaries will fail to execute.
    echo [*] Fetching official Microsoft VC++ installer [Silent/High-Speed]...
    set "VC_INSTALLER=%TEMP%\vcredist_x64.exe"
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '!VC_INSTALLER!'"
    
    if exist "!VC_INSTALLER!" (
        echo [*] Executing headless VC++ installation...
        start /wait "" "!VC_INSTALLER!" /install /quiet /norestart
        del /f /q "!VC_INSTALLER!" >nul 2>&1
        color 0b
        echo [+] Success: VC++ Environment Hardened.
    ) else (
        color 0c
        echo ============================================================================
        echo [!] FATAL ERROR: VC++ DOWNLOAD FAILED
        echo ============================================================================
        echo DIAGNOSTIC: Failed to download the Microsoft Visual C++ Redistributable.
        echo ACTION REQUIRED: Manually install from https://aka.ms/vs/17/release/vc_redist.x64.exe
        echo ============================================================================
        pause
        exit
    )
) else (
    echo [+] VC++ Runtime confirmed active.
)

:: 4. Validate Npcap Driver (Required for PCAP Network Sniffing)
echo [~] Verifying Npcap Packet Capture Engine...
if exist "%SystemRoot%\System32\Npcap\wpcap.dll" (
    echo [+] Npcap Driver confirmed active.
) else if exist "%SystemRoot%\System32\wpcap.dll" (
    echo [+] Legacy Pcap Driver confirmed active.
) else (
    color 0e
    echo [!] Npcap Driver missing. Network Sentinel will be blind.
    echo [*] Fetching official Npcap installer [Silent/High-Speed]...
    set "NPCAP_INSTALLER=%TEMP%\npcap_installer.exe"
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://npcap.com/dist/npcap-1.80.exe' -OutFile '!NPCAP_INSTALLER!'"
    
    if exist "!NPCAP_INSTALLER!" (
        echo [*] Launching Npcap installer...
        color 0e
        echo ============================================================================
        echo [!] MANUAL ACTION REQUIRED: NPCAP INSTALLER
        echo ============================================================================
        echo Npcap's free version blocks automated silent installations.
        echo The installer window will now open. Please manually click:
        echo "I Agree" -^> "Install" -^> "Next" -^> "Finish"
        echo ============================================================================
        color 0b
        start /wait "" "!NPCAP_INSTALLER!"
        del /f /q "!NPCAP_INSTALLER!" >nul 2>&1
        echo [+] Success: Network Packet Capture framework loaded.
        set "REQUIRES_REBOOT=1"
    ) else (
        color 0c
        echo ============================================================================
        echo [!] FATAL ERROR: NPCAP DOWNLOAD FAILED
        echo ============================================================================
        echo DIAGNOSTIC: Failed to download the Npcap network driver.
        echo ACTION REQUIRED: Manually install from https://npcap.com/#download
        echo ============================================================================
        pause
        exit
    )
)

:: --- THE PRE-FLIGHT PURGE ---
echo [*] Orchestrating clean-state environment...
schtasks /delete /tn "Aegis_Overwatch_Engine" /f >nul 2>&1
del /f /q start_engine.bat aegis_ghost.vbs Aegis-Control.bat >nul 2>&1
powershell -Command "Get-CimInstance Win32_Process -Filter \"Name = 'python.exe' OR Name = 'pythonw.exe'\" | Where-Object { $_.CommandLine -match 'aegis_' -or $_.CommandLine -match 'c2_socket' } | Invoke-CimMethod -MethodName Terminate" >nul 2>&1

set TARGET_DIR=C:\Aegis-Overwatch
if /i "%~dp0" == "%TARGET_DIR%\" goto BUILD_PHASE

:RELOCATION_PHASE
cls
echo [*] PHASE 1: Relocating to System Root [%TARGET_DIR%]...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
xcopy /E /I /H /Y "%~dp0*" "%TARGET_DIR%" >nul 2>&1

echo Relocation complete. Re-launching from System Root...
timeout /t 2 >nul
powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%TARGET_DIR%\%~nx0\"\"' -Verb RunAs"
exit

:BUILD_PHASE
cls
echo ============================================================================
echo                    [ PROVISIONING NEURAL ENVIRONMENT ]
echo ============================================================================
echo.
:: PHASE 0: Vault Provisioning
if not exist ".env" (
    echo [*] Generating Security manifest template [.env]...
    echo # AEGIS OVERWATCH CORE SECRETS > .env
    echo AI_ENGINE_MODE=CLOUD >> .env
    echo GEMINI_API_KEY=your_gemini_key_here >> .env
    echo AEGIS_API_KEY=your_custom_security_password >> .env
    echo VT_API_KEY=your_virustotal_key_here >> .env
    echo LOCAL_MODEL_ID=llama3.2:1b >> .env
    echo AEGIS_KINETIC_ARMED=False >> .env
    echo [+] Vault template created. UI Configuration will launch on first boot.
) else (
    echo [+] Security manifest found.
)

:: --- [UNIFICATION] Auto-Generate Aegis-Switch.bat if missing ---
if exist "%TARGET_DIR%\Aegis-Switch.bat" goto SKIP_SWITCH
echo [*] Generating C2 Ignition Switch...
(
echo @echo off
echo TITLE Aegis Overwatch - Core Orchestration Server ^(C2^)
echo color 0b
echo cd /d "%%~dp0"
echo :: 1. Elevation Check
echo net session ^>nul 2^>^&1
echo if %%errorLevel%% neq 0 ^(
echo     echo [*] Requesting Administrative Privileges...
echo     powershell -Command "Start-Process '%%~dpnx0' -Verb RunAs"
echo     exit /b
echo ^)
echo echo ============================================================================
echo echo   [ /// AEGIS OVERWATCH: IGNITION NEXUS /// ]
echo echo ============================================================================
echo echo [*] Purging ghost processes and freeing network ports...
echo powershell -Command "Get-CimInstance Win32_Process -Filter \"Name = 'python.exe' OR Name = 'pythonw.exe'\" | Where-Object { $_.CommandLine -match 'aegis_' -or $_.CommandLine -match 'c2_socket' } | Invoke-CimMethod -MethodName Terminate" ^>nul 2^>^&1
echo echo [+] Environment mathematically sterilized.
echo :: 3. Sovereign Core Auto-Start
echo echo [*] Checking for Sovereign Core Engine ^(Ollama^)...
echo tasklist /FI "IMAGENAME eq ollama.exe" 2^>NUL ^| find /I /N "ollama.exe"^>NUL
echo if "%%ERRORLEVEL%%"=="0" ^(
echo     echo [+] Ollama is already running in the background.
echo ^) else ^(
echo     if exist "%%LOCALAPPDATA%%\Programs\Ollama\ollama app.exe" ^(
echo         echo [*] Waking up local Ollama engine...
echo         start "" "%%LOCALAPPDATA%%\Programs\Ollama\ollama app.exe"
echo         timeout /t 3 ^>nul 
echo     ^) else ^(
echo         echo [!] Ollama not found in default path. If using Sovereign Mode, please start it manually.
echo     ^)
echo ^)
echo :: 4. Failsafe ASN Database Check
echo echo [*] Verifying Network Infrastructure Dependencies...
echo if not exist "data\GeoLite2-ASN.mmdb" ^(
echo     echo [!] ASN Database missing. Executing emergency TLS 1.2 download...
echo     if not exist "data" mkdir data
echo     powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb' -OutFile 'data\GeoLite2-ASN.mmdb'"
echo     if exist "data\GeoLite2-ASN.mmdb" ^(
echo         echo [+] ASN Database restored successfully.
echo     ^) else ^(
echo         color 0e
echo         echo [!] EMERGENCY DOWNLOAD FAILED. Network Sentinel will operate in degraded mode.
echo         color 0b
echo     ^)
echo ^) else ^(
echo     echo [+] ASN Database verified.
echo ^)
echo echo [*] Booting FastAPI Orchestration Server...
echo echo.
echo echo ============================================================================
echo echo  [!] IMPORTANT: DO NOT CLOSE THIS TERMINAL.
echo echo  [!] This window acts as your live C2 Console and forensic log stream.
echo echo  [!] To shut down Aegis securely, simply close this window.
echo echo ============================================================================
echo echo.
echo start /b cmd /c "timeout /t 6 ^>nul ^& start http://localhost:8000/dashboard"
echo if exist "venv\Scripts\activate.bat" ^(
echo     echo [*] Binding Virtual Environment variables...
echo     call "venv\Scripts\activate.bat"
echo     python aegis_server.py
echo ^) else ^(
echo     echo [!] Virtual environment not found. Falling back to system Python...
echo     python aegis_server.py
echo ^)
echo echo.
echo echo [X] Aegis Orchestration Server has been terminated.
echo pause
) > "%TARGET_DIR%\Aegis-Switch.bat"
:SKIP_SWITCH

if not exist "data" mkdir data

:: --- AUTOMATED MAXMIND ASN DATABASE PROVISIONING ---
echo [*] Checking for MaxMind GeoLite2-ASN Database...
if not exist "data\GeoLite2-ASN.mmdb" (
    echo [!] ASN Database not found. Downloading from public mirror ^(TLS 1.2 Enforced^)...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-ASN.mmdb' -OutFile 'data\GeoLite2-ASN.mmdb'"
    
    if exist "data\GeoLite2-ASN.mmdb" (
        echo [+] Offline ASN Database successfully provisioned.
    ) else (
        color 0e
        echo [!] WARNING: Failed to download ASN database. Network engine will run degraded.
        color 0b
    )
) else (
    echo [+] Offline ASN Database present.
)

:: Enforce Environment Sterilization if Architecture was Upgraded
if "!FORCE_NEW_VENV!"=="1" (
    if exist "venv" (
        echo [*] Purging legacy virtual environment to prevent Cython poisoning...
        rmdir /s /q "venv" >nul 2>&1
    )
)

if exist "venv\Scripts\python.exe" (
    echo [+] Existing compatible virtual environment detected. Checking for updates...
    goto SYNC_DEPS
)

echo [*] Initializing Virtual Environment (One-time setup)...
"!PY_EXE!" -m venv venv
if %errorlevel% neq 0 (
    color 0c
    echo ============================================================================
    echo [!] FATAL ERROR: VIRTUAL ENVIRONMENT CREATION FAILED
    echo ============================================================================
    echo DIAGNOSTIC: Python attempted to run "python -m venv venv" but failed.
    echo ACTION REQUIRED: Ensure your OS allows script execution or clear the old venv folder.
    echo ============================================================================
    pause
    exit
)

:: Pre-Authorize the new VENV Python executable through the Windows Firewall
echo [*] Injecting Windows Firewall Egress/Ingress rules to prevent security popups...
netsh advfirewall firewall add rule name="Aegis C2 Engine (VENV)" dir=in action=allow program="%TARGET_DIR%\venv\Scripts\python.exe" enable=yes profile=any >nul 2>&1
echo [+] Firewall rules bound. Zero-click boot enabled.

:SYNC_DEPS
echo [*] Upgrading core installer components...
"venv\Scripts\python.exe" -m pip install --upgrade pip --quiet

echo.
echo [*] SYNCING COMPONENT MANIFEST (FastAPI, ONNX, Scapy, geoip2, jinja2, etc.)...
echo [!] Visual Progress Enabled. This ensures no 10-minute hangs.
echo.
"venv\Scripts\python.exe" -m pip install onnxruntime scapy fastapi uvicorn psutil python-dotenv colorama requests geoip2 openai google-generativeai jinja2 --prefer-binary
"venv\Scripts\python.exe" -m pip install -r requirements.txt --prefer-binary

if %errorlevel% neq 0 (
    color 0c
    echo ============================================================================
    echo [!] FATAL ERROR: PIP DEPENDENCY SYNC FAILED
    echo ============================================================================
    echo DIAGNOSTIC: Pip failed to download required neural or networking libraries.
    echo ACTION REQUIRED: Verify internet connection and try running the deployer again.
    echo ============================================================================
    pause
    exit
)

echo.
echo [+] Neural Environment Hardened.
echo.

echo [*] Provisioning Windows Audit Policies (Event ID 4104)...
reg add "HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1 /f >nul
reg add "HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\PowerShellCore\ScriptBlockLogging" /v EnableScriptBlockLogging /t REG_DWORD /d 1 /f >nul
echo [*] Forcing Windows Policy Refresh - Please wait...
gpupdate /force >nul 2>&1
echo [+] Core Windows Auditing Enabled.
echo.

echo [*] Optimizing Sovereign Core (Local LLM) Latency...
setx OLLAMA_KEEP_ALIVE "-1" /M >nul 2>&1
taskkill /F /IM "ollama app.exe" >nul 2>&1
taskkill /F /IM "ollama.exe" >nul 2>&1
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe" (
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe" >nul 2>&1
    echo [+] Ollama VRAM Hot-State enabled ^(Zero-latency triage unlocked^).
) else (
    echo [i] Ollama not detected locally. Skipping VRAM optimization.
)
echo.

echo [*] PHASE 2: Executing Smart Machine DNA Profiling...
echo [!] Running 3-Minute DEMO MODE network calibration in the background.
"venv\Scripts\python.exe" aegis_profiler.py
if %errorlevel% neq 0 (
    color 0c
    echo ============================================================================
    echo [!] FATAL ERROR: AEGIS PROFILER CALIBRATION FAILED
    echo ============================================================================
    echo DIAGNOSTIC: aegis_profiler.py crashed during network baseline mapping.
    echo ACTION REQUIRED: Check the terminal logs above to see which Python module failed to import.
    echo ============================================================================
    pause
    exit
)
echo [+] Base DNA established and Cryptographically Sealed.
echo.
echo [*] PHASE 3: Pinning Secure Control Panel...
set SCRIPT="%TEMP%\AegisLink.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\Aegis Control Panel.lnk") >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "C:\Aegis-Overwatch\Aegis-Switch.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "C:\Aegis-Overwatch" >> %SCRIPT%
echo oLink.IconLocation = "C:\Aegis-Overwatch\aegis.ico" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT% >nul 2>&1
del %SCRIPT%

echo.
echo ============================================================================
echo [ 🛡️ AEGIS OVERWATCH: DEPLOYMENT COMPLETE ]
echo ============================================================================
echo.
echo   Staged at: %TARGET_DIR%
echo   A shortcut has been placed on your Desktop.
echo.
if "!REQUIRES_REBOOT!"=="1" (
    color 0e
    echo ============================================================================
    echo [!] KERNEL DRIVER REBOOT REQUIRED
    echo ============================================================================
    echo Aegis has successfully deployed, but Windows requires a system restart
    echo to bind the new Npcap network drivers to your interface cards.
    echo.
    echo If you do not reboot, the Network Sentinel will remain blind.
    echo ============================================================================
    set /p REBOOT_CHOICE="Do you want to restart the system now? (Y/N): "
    if /i "!REBOOT_CHOICE!"=="Y" (
        echo [*] Initiating system reboot in 5 seconds...
        shutdown /r /t 5 /c "Aegis Overwatch: Finalizing network driver installation."
        exit
    ) else (
        echo [i] Auto-boot aborted. Please reboot manually before launching Aegis.
        pause
        exit
    )
) else (
    echo [*] Igniting the C2 Console...
    timeout /t 3 >nul
    start "" "C:\Aegis-Overwatch\Aegis-Switch.bat"
    exit
)