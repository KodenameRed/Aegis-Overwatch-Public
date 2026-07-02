# ==============================================================================
# © 2026 Forge Cyber Ops Inc. All Rights Reserved.
# Proprietary and Confidential. Unauthorized distribution is strictly prohibited.
# ==============================================================================
# AEGIS OVERWATCH | Public Release Bootloader
# ==============================================================================
import os
import sys
import asyncio
import logging

# --- ANTI-DEADLOCK CONCURRENCY PATCH ---
os.environ["ANYIO_MAX_THREADS"] = "200"

# --- SILENCE FRAMEWORK LOGS (Terminal Clarity) ---
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

if __name__ == "__main__":
    import uvicorn
    
    # --- CRITICAL WINDOWS EVENT LOOP PATCH ---
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    print("\n[/// AEGIS OVERWATCH: IGNITION NEXUS ///]")
    print("[*] Booting FastAPI Orchestration Server (Compiled Release)...")
    print("[!] IMPORTANT: DO NOT CLOSE THIS TERMINAL.\n")
    
    uvicorn.run(
        "Orchestration_layer:app", 
        host="0.0.0.0", 
        port=8000, 
        access_log=False, 
        log_level="warning",
        timeout_keep_alive=30,
        limit_concurrency=250
    )