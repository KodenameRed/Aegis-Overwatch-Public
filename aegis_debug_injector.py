# ==============================================================================
# © 2026 Forge Cyber Ops Inc. All Rights Reserved.
# Proprietary and Confidential. Unauthorized distribution is strictly prohibited.
# ==============================================================================
# ==============================================================================
# AEGIS OVERWATCH | X-RAY PRO: Forensic Diagnostic Interceptor
# Proves Deadlocks, Signature Mismatches, and Thread Starvation
# ==============================================================================
import asyncio
import time
import json
import uvicorn
import psutil
import os
import sqlite3
from fastapi import Request, Body
from colorama import init, Fore, Style
from contextlib import asynccontextmanager

# 1. Import your untouched Orchestrator
from New_orchestrator import app, VAULT, FORENSIC_DB_FILE
import New_orchestrator

init(autoreset=True)

# --- DIAGNOSTIC STATE ---
LATENCY_SAMPLES = []

# --- TRACKER 1: EVENT LOOP & THREAD MONITOR ---
async def performance_monitor():
    print(f"{Fore.CYAN}[X-RAY] Performance monitor active. Checking for Event Loop Deadlocks.")
    while True:
        start = time.perf_counter()
        await asyncio.sleep(1)
        lag = time.perf_counter() - start - 1
        
        if lag > 0.1: # If loop is delayed by more than 100ms
            print(f"{Fore.RED}[🚨 LOOP LAG] Event Loop delayed by {lag*1000:.2f}ms! Orchestrator is likely frozen by synchronous Disk/DB I/O.{Style.RESET_ALL}")
        
        # Check active python threads (Starvation check)
        import threading
        active_threads = threading.active_count()
        if active_threads > 40:
            print(f"{Fore.YELLOW}[⚠️ THREAD WARNING] {active_threads} active threads detected. SQLite pool may be saturated.{Style.RESET_ALL}")

# --- TRACKER 2: TCP SOCKET AUTOPSY ---
async def socket_tracker():
    print(f"{Fore.CYAN}[X-RAY] Socket tracking active.")
    while True:
        await asyncio.sleep(5)
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                cmd = " ".join(proc.info.get('cmdline', []) or []).lower()
                if any(k in cmd for k in ['aegis_', 'new_orchestrator']):
                    conns = proc.connections(kind='tcp')
                    states = [c.status for c in conns]
                    
                    cw = states.count('CLOSE_WAIT')
                    tw = states.count('TIME_WAIT')
                    est = states.count('ESTABLISHED')
                    fw = states.count('FIN_WAIT_2')

                    if cw > 10 or fw > 10:
                        name = "OS Sensor" if "sensor" in cmd else ("SOC Agent" if "agent" in cmd else "Orchestrator")
                        print(f"\n{Fore.RED}[🚨 LEAKY SOCKETS] {name} (PID {proc.info['pid']}) is bleeding connections!{Style.RESET_ALL}")
                        print(f"{Fore.RED} -> CLOSE_WAIT: {cw} (Server side fail) | FIN_WAIT_2: {fw} (Client side fail) | EST: {est}{Style.RESET_ALL}")
        except Exception: pass

# --- TRACKER 3: /API/VERDICT DEEP INSPECTOR ---
original_api_submit_verdict = New_orchestrator.api_submit_verdict

async def hooked_verdict(bg, data: dict = Body(...)):
    start_t = time.time()
    print(f"\n{Fore.MAGENTA}{Style.BRIGHT}================ 🕵️ VERDICT DEEP-SCAN 🕵️ ================{Style.RESET_ALL}")
    
    queue = data.get("target_queue", "alerts")
    ai_data = data.get("ai_structured", {})
    incoming_sig = str(data.get("target_signature") or ai_data.get("target_signature", ""))
    incoming_idx = data.get("alert_idx")
    
    print(f"1. {Fore.CYAN}Incoming AI Payload:{Style.RESET_ALL}")
    print(f"   - Target Sig: {incoming_sig}")
    print(f"   - Index Hint: {incoming_idx}")
    
    # --- COLLISION AUDIT ---
    # We will search the entire vault to see what REALLY matches
    matched_alert = None
    sig_match = False
    index_match = False
    fuzzy_match = None

    for idx, a in enumerate(VAULT.get(queue, [])):
        v_sig = str(a.get("signature", a.get("timestamp")))
        v_img = os.path.basename(str(a.get("image", ""))).lower()
        
        # Check Signature
        if v_sig == incoming_sig:
            matched_alert = a; sig_match = True; break
        
        # Check Index
        if str(idx) == str(incoming_idx):
            index_match = True
            
        # Check Fuzzy (Keyword match if verifying)
        if a.get("status_label") == "VERIFYING" and v_img in str(ai_data).lower():
            fuzzy_match = idx

    if sig_match:
        print(f"2. {Fore.GREEN}Result: SUCCESS (Signature Match Found){Style.RESET_ALL}")
    elif index_match:
        print(f"2. {Fore.YELLOW}Result: INDEX MISMATCH (Signature failed, but Index {incoming_idx} exists){Style.RESET_ALL}")
        print(f"   - Vault Sig at Index {incoming_idx} is: {VAULT[queue][incoming_idx].get('signature')}")
    elif fuzzy_match is not None:
        print(f"2. {Fore.RED}Result: ALIGNMENT FAILURE (Sig and Index failed, but found '{v_img}' at Index {fuzzy_match}){Style.RESET_ALL}")
    else:
        print(f"2. {Fore.RED}Result: TOTAL DROP (No signature or index match in vault of {len(VAULT[queue])} items){Style.RESET_ALL}")

    print(f"3. {Fore.MAGENTA}Latency Trace: {time.time() - start_t:.4f}s processing time.{Style.RESET_ALL}")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}============================================================{Style.RESET_ALL}\n")
    
    return await original_api_submit_verdict(bg, data)

# --- MONKEYPATCHING ---
for route in app.routes:
    if hasattr(route, "path") and route.path == "/api/verdict":
        route.endpoint = hooked_verdict

# --- WRAPPED LIFESPAN ---
original_lifespan = app.router.lifespan_context
@asynccontextmanager
async def diagnostic_wrapper(fastapi_app):
    asyncio.create_task(performance_monitor())
    asyncio.create_task(socket_tracker())
    async with original_lifespan(fastapi_app) as state:
        yield state

app.router.lifespan_context = diagnostic_wrapper

if __name__ == "__main__" or os.getenv("AEGIS_SENSOR_BOOT") == "1":
    print(f"{Fore.MAGENTA}{Style.BRIGHT}==================================================")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}   🩺 AEGIS X-RAY ULTIMATE DIAGNOSTIC ONLINE 🩺")
    print(f"{Fore.MAGENTA}{Style.BRIGHT}==================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
