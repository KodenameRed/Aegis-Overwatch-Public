# ==============================================================================
# © 2026 Forge Cyber Ops Inc. All Rights Reserved.
# Proprietary and Confidential. Unauthorized distribution is strictly prohibited.
# ==============================================================================
import os
import json
import sys
import asyncio 
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# --- THE SCREAM TRACER ---
def scream(tag, msg):
    try:
        import time, os
        trace_file = Path(__file__).parent / "data" / "scream_trace.log"
        with open(trace_file, "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%H:%M:%S')} {time.time() % 1:.4f}] [{tag}] {msg}\n")
            f.flush()
            os.fsync(f.fileno())
    except: pass

# Core Logic Engine (Python will auto-detect if this is a .pyd or .py file)
try:
    import aegis_mcp_core 
except ImportError:
    pass

mcp = FastMCP("Aegis-Overwatch-Brain")

# Path to your live orchestrator vault
VAULT_FILE = Path(__file__).parent / "data" / "soar_metrics.json"

@mcp.resource("vault://metrics/alerts")
def get_vault_metrics() -> str:
    """Expose the active orchestrator vault to the SOC Agent."""
    if VAULT_FILE.exists():
        try:
            with open(VAULT_FILE, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            pass
    # Fallback to empty schema if file is locked or missing
    return json.dumps({"alerts": [], "gateway_alerts": []})

@mcp.prompt("socket_lateral_triage")
def socket_lateral_triage(image: str, score: str, command_line: str, csi_context: str = "None", metadata: str = "{}"):
    """Bridge to the triage engine with Geopolitical Context"""
    return aegis_mcp_core.internal_lateral_logic(
        image, 
        float(score), 
        command_line, 
        csi_context,
        metadata
    )

@mcp.prompt("socket_network_hazard")
def socket_network_hazard(score: str, jitter: str, baseline: str, volume_kb: str, unique_ports: str, strategic_context: str):
    """Bridge to the tactical network engine"""
    return aegis_mcp_core.internal_network_logic(
        float(score), 
        float(jitter), 
        float(baseline), 
        float(volume_kb), 
        int(unique_ports),
        strategic_context
    )

@mcp.prompt("socket_strategic_analysis")
def socket_strategic_analysis(ledger_data: str):
    """Bridge to the strategic long-term memory engine"""
    return aegis_mcp_core.internal_strategic_logic(ledger_data)

# --- [CRITICAL FIX] MISSING NEXUS DOSSIER PROMPT ---
@mcp.prompt("socket_nexus_dossier")
def socket_nexus_dossier(bucket_events_json: str):
    """Bridge to the Nexus Hindsight Processor (Temporal Aggregation & DNA Extraction)"""
    try:
        import aegis_nexus_processor
        
        # 1. Parse the raw JSON payload from the SOC Agent
        bucket_events = json.loads(bucket_events_json)
        if not bucket_events:
            return "No events provided for Nexus analysis."
            
        # 2. Hand it to the Nexus Processor to do the heavy temporal/SQL lookups
        nexus_data = aegis_nexus_processor.execute_nexus_scan(bucket_events)
        
        # 3. Return the fully compiled AI prompt back to the SOC Agent
        if "ai_prompt" in nexus_data:
            scream("MCP", f"Nexus Dossier Prompt successfully generated with {len(bucket_events)} events.")
            return nexus_data["ai_prompt"]
        else:
            return "Error: Could not generate Nexus prompt."
            
    except Exception as e:
        scream("MCP", f"FATAL NEXUS ERROR: {str(e)}")
        # Ultimate fallback so the AI doesn't crash
        return f"System Instruction: You are a cyber analyst compiling an incident report. Review this raw telemetry: {bucket_events_json}"

# [CRITICAL FIX] Changed to async def and added await
@mcp.tool()
async def submit_verdict(target_queue: str, alert_idx: int, verdict_json_string: str):
    """Submit AI reasoning back to the Spine"""
    scream("MCP", f"4. Received payload from Agent. Sending to Orchestrator API for queue: {target_queue}")
    try:
        res = await aegis_mcp_core.internal_submit_verdict(target_queue, alert_idx, verdict_json_string)
        scream("MCP", "5. Orchestrator API responded successfully.")
        return res
    except Exception as e:
        scream("MCP", f"FATAL: Failed to reach Orchestrator API: {e}")
        return {"error": str(e)}

# [CRITICAL FIX] Changed to async def and added await
@mcp.tool()
async def propose_remediation(alert_idx: int, process_name: str, action: str, justification: str):
    """Execute response via the Spine API"""
    return await aegis_mcp_core.internal_remediate(alert_idx, process_name, action, justification)

if __name__ == "__main__" or os.getenv("AEGIS_SENSOR_BOOT") == "1":
    mcp.run()
