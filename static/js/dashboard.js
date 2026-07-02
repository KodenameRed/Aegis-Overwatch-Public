// ================================================
// AEGIS DASHBOARD - MAIN JAVASCRIPT (v2.2)
// ================================================
// Purpose: All interactive logic for the Enterprise Orchestrator UI
// This file is intentionally sectioned for easy Ctrl+F / Ctrl+H navigation
// ================================================

// --- GLOBAL STATE ---
let isUIPaused = false;
let openDetailsState = JSON.parse(sessionStorage.getItem('aegis_ui_state') || '{}');
window.graphModalOpen = false;
let forensicHistory = [];
let logFollowEnabled = true;

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.style.cssText = `position:fixed;bottom:30px;right:30px;background:#161b22;border:1px solid ${type === "success" ? "#3fb950" : "#ff4b2b"};color:#c9d1d9;padding:12px 18px;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,0.6);z-index:99999;font-size:13px;`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}
// Allow verifyRemediation to be called from history.html as well
window.verifyRemediation = verifyRemediation;

// Read dynamic state securely from the HTML bridge
let selectedEngine = window.AEGIS_CONFIG ? window.AEGIS_CONFIG.engineMode : 'CLOUD';
let knownCriticalCount = window.AEGIS_CONFIG ? window.AEGIS_CONFIG.criticalCount : 0;

// ================================================
// SECTION: CORE UI HELPERS + STATE MANAGEMENT
// ================================================

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'm') {
        isUIPaused = false;
        window.graphModalOpen = false;
        const modal = document.getElementById('graphModal');
        if (modal) modal.style.display = 'none';
        alert("🛠️ AEGIS OVERRIDE: UI Unlocked");
    }
});

function attachFeedScrollListener() {
    const container = document.getElementById('log-rows-container');
    const checkbox = document.getElementById('log-follow');
    if (!container) return;

    container.addEventListener('scroll', function() {
        if (this.scrollTop > 15 && logFollowEnabled) {
            logFollowEnabled = false;
            if (checkbox) checkbox.checked = false;
        } else if (this.scrollTop === 0 && !logFollowEnabled) {
            logFollowEnabled = true;
            if (checkbox) checkbox.checked = true;
        }
    });
}

function trackToggle(id) {
    // Legacy placeholder - can be removed later if unused
}

// ================================================
// SECTION: SOFT REFRESH + SENSOR SYNC
// ================================================

async function refreshSensorsOnly() {
    if (isUIPaused) return;
    try {
        const res = await fetch('/dashboard');
        if (res.status !== 200) return;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const newSensorHTML = doc.querySelector('.sidebar').innerHTML;
        const oldSidebar = document.querySelector('.sidebar');

        if (newSensorHTML && oldSidebar) {
            const scrollY = oldSidebar.scrollTop;
            oldSidebar.innerHTML = newSensorHTML;
            oldSidebar.scrollTop = scrollY;
        }
    } catch (e) {}
}
setInterval(refreshSensorsOnly, 15000);

async function softRefreshDashboard() {
    if (isUIPaused || window.graphModalOpen) return;
    try {
        const res = await fetch('/dashboard');
        if (res.status !== 200) return;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const mainView = document.getElementById('main-view');
        if (mainView) {
            const currentScroll = mainView.scrollTop;
            const oldScrollHeight = mainView.scrollHeight;

            mainView.querySelectorAll('details').forEach((el, idx) => {
                const key = el.id || 'det_' + idx;
                if (!el.id) el.id = key;
                openDetailsState[key] = el.hasAttribute('open');
            });
            sessionStorage.setItem('aegis_ui_state', JSON.stringify(openDetailsState));

            const terminalScrolls = {};
            mainView.querySelectorAll('.cmd-terminal').forEach((el, idx) => {
                const key = el.id || 'term_' + idx;
                if (!el.id) el.id = key;
                terminalScrolls[key] = el.scrollTop;
            });

            const wrapperStates = {};
            mainView.querySelectorAll('.batch-dossier-wrapper').forEach(el => {
                wrapperStates[el.id] = el.style.display;
            });

            const newMainView = doc.getElementById('main-view');
            newMainView.querySelectorAll('details').forEach((el, idx) => {
                const key = el.id || 'det_' + idx;
                if (openDetailsState[key] !== undefined) {
                    if (openDetailsState[key]) el.setAttribute('open', '');
                    else el.removeAttribute('open');
                }
            });

            mainView.innerHTML = newMainView.innerHTML;

            const restoredTerminals = mainView.querySelectorAll('.cmd-terminal');
            restoredTerminals.forEach((el, idx) => {
                const key = el.id || 'term_' + idx;
                if (terminalScrolls[key] !== undefined) {
                    el.scrollTop = terminalScrolls[key];
                }
            });

            Object.keys(wrapperStates).forEach(id => {
                const el = mainView.querySelector('#' + id);
                if (el && wrapperStates[id] !== undefined) {
                    el.style.display = wrapperStates[id];
                }
            });

            const newScrollHeight = mainView.scrollHeight;
            const heightDifference = newScrollHeight - oldScrollHeight;
            
            // Only adjust scroll if the user hasn't manually scrolled up to read something
            if (currentScroll > 50) {
                mainView.scrollTop = currentScroll + heightDifference;
            }
        }

        // === ELITE TELEMETRY REFRESH (ANTI-BLINK) ===
        const oldLogContainer = document.getElementById('log-rows-container');
        let feedScrollY = oldLogContainer ? oldLogContainer.scrollTop : 0;
        const savedFilter = sessionStorage.getItem('aegis_log_filter') || 'all';
        const savedSearch = (sessionStorage.getItem('aegis_log_search') || '').toLowerCase();

        const newLogContainer = doc.getElementById('log-rows-container');
        if (newLogContainer) {
            newLogContainer.querySelectorAll('.log-row').forEach(row => {
                const type = row.dataset.type || 'info';
                const text = row.textContent.toLowerCase();
                const matchesSearch = !savedSearch || text.includes(savedSearch);
                const matchesFilter = savedFilter === 'all' || type === savedFilter;
                row.style.display = (matchesFilter && matchesSearch) ? 'flex' : 'none';
            });
        }

        if (oldLogContainer && newLogContainer) {
            oldLogContainer.innerHTML = newLogContainer.innerHTML;
        }

        const oldBadge = document.getElementById('log-count-badge');
        const newBadge = doc.getElementById('log-count-badge');
        if (oldBadge && newBadge) oldBadge.innerText = newBadge.innerText;

        const restoredContainer = document.getElementById('log-rows-container');
        if (restoredContainer) {
            if (logFollowEnabled) restoredContainer.scrollTop = 0;
            else restoredContainer.scrollTop = feedScrollY;
        }

        document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
        let targetBtn = document.querySelector(`.log-filter-btn[data-filter="${savedFilter}"]`);
        if (!targetBtn) targetBtn = document.querySelector('.log-filter-btn[data-filter="all"]');
        if (targetBtn) targetBtn.classList.add('active');

        const searchInput = document.getElementById('log-search');
        if (searchInput) searchInput.value = savedSearch;

        attachFeedScrollListener();

        const newBottomBar = doc.querySelector('.bottom-bar');
        const oldBottomBar = document.querySelector('.bottom-bar');
        if (newBottomBar && oldBottomBar) oldBottomBar.innerHTML = newBottomBar.innerHTML;

        const trackerEl = doc.getElementById('critical-count-tracker');
        if (trackerEl) {
            const newCriticalCount = parseInt(trackerEl.innerText);
            if (newCriticalCount > knownCriticalCount) {
                document.getElementById('critical-toast').style.bottom = '60px';
                knownCriticalCount = newCriticalCount;
            } else if (newCriticalCount < knownCriticalCount) {
                knownCriticalCount = newCriticalCount;
            }
        }

        } catch (e) {}
}
setInterval(softRefreshDashboard, 18000);

// ================================================
// SECTION: LOG FILTERING SYSTEM
// ================================================

function filterLogs(mode) {
    const container = document.getElementById('log-rows-container');
    if (!container) return;

    const rows = container.querySelectorAll('.log-row');
    const searchVal = (document.getElementById('log-search')?.value || '').toLowerCase();

    if (mode) {
        document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = document.querySelector(`.log-filter-btn[data-filter="${mode}"]`);
        if (targetBtn) targetBtn.classList.add('active');
        sessionStorage.setItem('aegis_log_filter', mode);
    }

    const searchInput = document.getElementById('log-search');
    if (searchInput) {
        sessionStorage.setItem('aegis_log_search', searchInput.value);
    }

    const currentFilter = document.querySelector('.log-filter-btn.active')?.dataset.filter || 'all';

    rows.forEach(row => {
        const type = row.dataset.type || 'info';
        const text = row.textContent.toLowerCase();
        const matchesSearch = !searchVal || text.includes(searchVal);
        const matchesFilter = currentFilter === 'all' || type === currentFilter;
        row.style.display = (matchesFilter && matchesSearch) ? 'flex' : 'none';
    });
}

function clearLogFilter() {
    document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.log-filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');

    const search = document.getElementById('log-search');
    if (search) search.value = '';
    filterLogs('all');
}

function toggleLogFollow() {
    logFollowEnabled = document.getElementById('log-follow').checked;
}



function clearForensicPane() {
    const pane = document.getElementById('forensic-output-pane');
    const content = document.getElementById('forensic-output-content');
    if (pane && content) {
        content.innerHTML = '';
        pane.style.display = 'none';
    }
}

// ================================================
// SECTION: SOAR / KINETIC ACTIONS
// ================================================

function dispatchSOAR(event, btn, actionType, target, alertSig) {
    event.preventDefault();
    event.stopPropagation();

    const isForensic = actionType === "FORENSIC_QUERY";

    if (!isForensic && !confirm(`AUTHORIZE KINETIC STRIKE:\n\nAction: ${actionType}\nTarget: ${target}`)) {
        return;
    }

    const originalBtnText = btn.innerHTML; // Store original text
    btn.innerHTML = `⏳ DEPLOYING...`;
    btn.style.pointerEvents = "none";

    fetch('/api/execute_kinetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' },
        body: JSON.stringify({ action_type: actionType, target: target, alert_sig: alertSig })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'blocked') {
            alert(`🛑 GOVERNANCE BLOCK:\n${data.governance_log}`);
            btn.innerHTML = `AUTHORIZE STRIKE`;
            btn.style.pointerEvents = "auto";
            return;
        }

        if (isForensic && data.aar_log) {
            const pane = document.getElementById('forensic-output-pane');
            const content = document.getElementById('forensic-output-content');

            if (pane && content) {
                content.innerHTML = data.aar_log.replace(/\n/g, '<br>');
                pane.style.display = 'block';
            }
            
            // Restore original text
            btn.innerHTML = originalBtnText; 
            btn.style.pointerEvents = "auto";
            
            // Re-enable UI refreshes
            setTimeout(() => { isUIPaused = false; }, 2000);
            return;
        }

        if (data.status === 'success') {
            const card = document.getElementById('alert_' + alertSig) || btn.closest('.card') || btn.closest('details');
            if (card) {
                card.className = "card theme-triaged-kinetic";
                btn.innerHTML = `✅ NEUTRALIZED`;
            }
            setTimeout(() => location.reload(), 900);
        }
    })
    .catch(() => {
        alert("Failed to communicate with Aegis Core.");
        location.reload();
    });
}
// ================================================
// NEW: Verify Remediation (uses /api/verify_chain)
// ================================================
async function verifyRemediation(chainId) {
    // Try to find the button that was clicked (for loading state)
    const btn = event?.currentTarget || document.activeElement;

    if (!confirm("Mark this remediation as verified and trigger a targeted re-audit?")) return;

    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
        btn.innerHTML = `⏳ VERIFYING...`;
        btn.style.pointerEvents = "none";
    }

    try {
        const res = await fetch(`/api/verify_chain/${chainId}`, {
            method: "GET",
            headers: { 
                "Content-Type": "application/json",
                "x-aegis-signature": "UI_AUTHORIZED_SESSION"
            }
        });

        const data = await res.json();

        if (data.status === "success") {
            showToast(`✅ Verification complete → ${data.new_status}`, "success");
            
            if (btn) {
                btn.innerHTML = `✅ VERIFIED`;
                btn.style.borderColor = "#3fb950";
                btn.style.color = "#3fb950";
            }

            // Give user time to see the success state before refresh
            setTimeout(() => {
                softRefreshDashboard();
            }, 1200);
        } else {
            showToast(data.message || "Verification failed", "error");
            if (btn) {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = "auto";
            }
        }
    } catch (e) {
        console.error(e);
        showToast("Failed to contact Aegis Core", "error");
        if (btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = "auto";
        }
    }
}

function internalizeRule(event, btn) {
    event.preventDefault();
    event.stopPropagation();

    const image = btn.dataset.target;
    const parent = btn.dataset.parent;
    const cmd = btn.dataset.cmd;
    const sig = btn.dataset.sig;
    const card = document.getElementById('alert_' + sig);

    isUIPaused = true;
    btn.innerHTML = `⏳ LEARNING...`;
    btn.style.pointerEvents = "none";
    if (card) card.style.pointerEvents = "none";

    fetch('/api/internalize_rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' },
        body: JSON.stringify({ image: image, parent: parent, command_snippet: cmd, signature: sig })
    }).then(() => {
        if (card) {
            card.style.borderLeft = "4px solid #3fb950";
            card.style.background = "rgba(63, 185, 80, 0.05)";
            const title = card.querySelector('b');
            if (title) {
                title.style.color = "#3fb950";
                title.innerHTML = "🎓 [LEARNED NOISE] " + title.innerHTML.replace("[⚙️ LATERAL]", "");
            }
            btn.innerHTML = `✅ INTERNALIZED`;
        }
        setTimeout(() => { isUIPaused = false; location.reload(); }, 1200);
    });
}

function dismissAlert(event, type, sig, elementId) {
    event.preventDefault();
    event.stopPropagation();
    const card = document.getElementById(elementId);
    isUIPaused = true;

    if (card) {
        card.style.opacity = '0';
        setTimeout(() => card.style.display = 'none', 200);
    }

    fetch(`/dismiss_alert/${type}/${sig}`).then(() => {
        setTimeout(() => { isUIPaused = false; location.reload(); }, 400);
    });
}

function submitDossierFeedback(event, btn, chainId, status) {
    event.preventDefault();
    event.stopPropagation();
    if (isUIPaused) return;
    isUIPaused = true;
    btn.innerHTML = `⏳...`;
    btn.style.pointerEvents = "none";

    fetch('/api/dossier_feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' },
        body: JSON.stringify({ chain_id: chainId, status: status })
    }).then(() => {
        setTimeout(() => { isUIPaused = false; location.reload(); }, 800);
    });
}

// ================================================
// SECTION: NEXUS CAUSALITY GRAPH (vis.js)
// ================================================

async function renderNexusGraph(chainId) {
    window.graphModalOpen = true;

    let modal = document.getElementById('graphModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'graphModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(1,4,9,0.95); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999;';
        modal.innerHTML = `
            <div style="width:92%; max-width:1100px; height:80%; background:#0d1117; border:1px solid #30363d; border-radius:8px; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                <div style="padding:15px 20px; border-bottom:1px solid #21262d; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                    <div style="color:#58a6ff; font-weight:900; letter-spacing:1px; font-size:12px;">📊 AEGIS CAUSALITY GRAPH — NEURAL LINK</div>
                    <button onclick="closeGraphModal()" style="background:transparent; border:1px solid #30363d; color:#c9d1d9; padding:5px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 10px; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">✕ CLOSE</button>
                </div>
                <div id="graph-container" style="flex:1; position:relative; padding:0; overflow:hidden;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    const container = document.getElementById('graph-container');
    container.innerHTML = `<div style="color:#58a6ff; font-family:monospace; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);">⏳ Mapping attack causality...</div>`;

    try {
        const res = await fetch(`/api/export_dot/${chainId}`);
        const graphJson = await res.json();

        if (graphJson.type === "visjs" && graphJson.data) {
            container.innerHTML = '';

            const options = {
                nodes: {
                    shape: 'dot',
                    size: 18,
                    font: { 
                        color: '#c9d1d9', 
                        face: 'Inter, monospace', 
                        size: 13, 
                        strokeWidth: 0,
                        bold: true
                    },
                    borderWidth: 2,
                    shadow: { enabled: true, color: 'rgba(0,0,0,0.7)', size: 6 },
                    labelHighlightBold: true
                },
                edges: {
                    width: 2.5,
                    font: { 
                        color: '#8b949e', 
                        size: 11, 
                        align: 'top', 
                        face: 'Inter, monospace', 
                        strokeWidth: 0 
                    },
                    arrows: { to: { enabled: true, scaleFactor: 0.6 } },
                    smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.35 },
                    color: { color: '#30363d', highlight: '#58a6ff' }
                },
                groups: {
                    system:   { color: { background: '#238636', border: '#3fb950' }, shape: 'hexagon', size: 22 },
                    process:  { color: { background: '#1f6feb', border: '#58a6ff' }, shape: 'dot' },
                    shell:    { color: { background: '#9e6a03', border: '#ffab40' }, shape: 'square' },
                    network:  { color: { background: '#da3633', border: '#ff4b2b' }, shape: 'diamond', size: 26 }
                },
                physics: {
                    forceAtlas2Based: { 
                        gravitationalConstant: -45, 
                        centralGravity: 0.004, 
                        springLength: 95, 
                        springConstant: 0.09 
                    },
                    maxVelocity: 35,
                    solver: 'forceAtlas2Based',
                    timestep: 0.32,
                    stabilization: { iterations: 180 }
                },
                interaction: { 
                    hover: true, 
                    tooltipDelay: 120, 
                    navigationButtons: true,
                    keyboard: true
                }
            };

            new vis.Network(container, graphJson.data, options);
        } else {
            container.innerHTML = `<div style="color:#ffab40; padding:40px; text-align:center;">No causality graph available for this dossier.<br><span style="font-size:11px; opacity:0.7;">(Backend returned no vis.js data)</span></div>`;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:#ff4b2b; padding:40px;">Graph generation failed: ${e.message}</div>`;
    }
}

function closeGraphModal() {
    const modal = document.getElementById('graphModal');
    if (modal) modal.style.display = 'none';
    window.graphModalOpen = false;
}

// ================================================
// SECTION: COPY + UTILITY FUNCTIONS
// ================================================

async function copySOCReport(elementId) {
    try {
        let textArea = document.getElementById(elementId);
        if (!textArea) { alert("❌ Report missing from DOM."); return; }
        
        let reportText = textArea.value;

        // === NEW: Request real HMAC signature ===
        try {
            const res = await fetch('/api/sign_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_text: reportText })
            });
            const result = await res.json();

            if (result.status === "success" && result.hmac) {
                reportText += `\n\n• Report HMAC (HMAC-SHA256): ${result.hmac}`;
                reportText += `\n• Verification: Use same AEGIS_API_KEY + HMAC-SHA256 on the report content.`;
            }
        } catch (e) {
            console.warn("HMAC signing failed, copying unsigned report.", e);
        }

        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(reportText).then(() => {
                alert("✅ Commercial SOC Report copied + HMAC signed.");
            }).catch(() => fallbackCopy(reportText));
        } else {
            fallbackCopy(reportText);
        }
    } catch (err) {
        alert("❌ Failed to copy SOC Report.");
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert("✅ Copied via fallback.");
    } catch (err) {
        alert("❌ Browser blocked clipboard.");
    }
    document.body.removeChild(textArea);
}

function viewHistoricalForensics(elementId) {
    const textArea = document.getElementById(elementId);
    if (!textArea) return;
    
    const pane = document.getElementById('forensic-output-pane');
    const content = document.getElementById('forensic-output-content');
    
    if (pane && content) {
        // Route the historical text into the global pane and display it
        content.innerHTML = textArea.value.replace(/\n/g, '<br>');
        pane.style.display = 'block';
    }
}

function toggleVolumeRounding(btn) {
    const isRounded = btn.dataset.rounded === 'true';
    document.querySelectorAll('.vol-cell').forEach(cell => {
        const kb = parseFloat(cell.dataset.kb || '0');
        if (isRounded) {
            cell.innerHTML = kb.toFixed(1) + ' KB';
        } else {
            cell.innerHTML = (kb / 1024).toFixed(2) + ' MB';
        }
    });
    btn.dataset.rounded = (!isRounded).toString();
    btn.textContent = isRounded ? 'Round KB → MB' : 'Show Raw KB';
}

// ================================================
// SECTION: KINETIC TOGGLE + VAULT + ACTIONS
// ================================================

function handleKineticToggle(event) {
    if (event.target.checked) {
        event.target.checked = false;
        document.getElementById('kinetic-auth-modal').style.display = 'flex';
    } else {
        setKineticState(false);
    }
}

function cancelKineticArming() {
    document.getElementById('kinetic-auth-modal').style.display = 'none';
}

function confirmKineticArming() {
    document.getElementById('kinetic-auth-modal').style.display = 'none';
    setKineticState(true);
}

async function setKineticState(isArmed) {
    try {
        let res = await fetch('/api/arm_kinetic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' },
            body: JSON.stringify({ armed: isArmed })
        });
        let data = await res.json();
        if (data.status === 'success') location.reload();
    } catch (err) {
        alert("Failed to communicate with orchestrator.");
    }
}

function handleQueueAction(event, btn, idx, action) {
    event.preventDefault();
    const card = document.getElementById('req_card_' + idx);
    isUIPaused = true;
    btn.innerHTML = '⏳...';
    btn.style.pointerEvents = 'none';

    if (card) {
        card.style.opacity = "0.4";
        card.style.transform = "scale(0.98)";
    }

    fetch(`/remediation/${idx}/${action}`).then(() => {
        setTimeout(() => { isUIPaused = false; location.reload(); }, 600);
    });
}

function actionWithSpinner(event, btn, url, loadingText) {
    event.preventDefault();
    isUIPaused = true;
    btn.innerHTML = `⏳ ${loadingText}`;
    fetch(url).then(() => setTimeout(() => { isUIPaused = false; location.reload(); }, 800));
}

async function factoryReset(event, btn) {
    event.preventDefault();
    if (!confirm("⚠️ NUCLEAR PURGE: This will destroy ALL hunter DNA, forensic history, and persistent memory.\n\nAre you 100% sure?")) return;

    btn.innerHTML = `🔥 PURGING...`;
    btn.style.pointerEvents = "none";

    fetch('/api/factory_reset', { method: 'POST' })
        .then(() => setTimeout(() => location.reload(), 1200))
        .catch(() => {
            alert("Nuclear purge failed.");
            btn.innerHTML = `🔥 NUCLEAR PURGE`;
            btn.style.pointerEvents = "auto";
        });
}

async function powerOff(event) {
    event.preventDefault();
    if (!confirm("Terminate Aegis?")) return;
    isUIPaused = true;
    fetch('/api/shutdown');
    document.body.innerHTML = "<div style='display:flex;height:100vh;width:100%;align-items:center;justify-content:center;background:#010409;'><h1 style='color:#ff4b2b;letter-spacing:2px;'>SYSTEM OFFLINE</h1></div>";
}

function openVault() {
    const modal = document.getElementById('vault-setup-overlay');
    if (modal) modal.style.display = 'flex';

    // Pre-fill existing values from backend if available (future improvement)
    // For now, this just ensures the modal opens cleanly
    setTimeout(() => {
        const analystField = document.getElementById('setup-analyst-name');
        if (analystField && !analystField.value) {
            analystField.placeholder = "e.g. Jakub Derwojed - SOC Analyst";
        }
    }, 100);
}

function startCalibration() {
    const gate = document.getElementById('calibration-gate');
    if (gate) gate.style.display = 'none';

    fetch('/api/start_hydration').then(() => {
        const status = document.createElement('div');
        status.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#238636;color:white;padding:12px 24px;border-radius:6px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,0.4);';
        status.innerHTML = '✅ Calibration started. Keep system idle for ~10 minutes.';
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 4500);
    });
}

function startHydration(event, btn) {
    event.preventDefault();
    btn.innerHTML = `⏳ INITIATING...`;
    btn.style.pointerEvents = "none";
    fetch('/api/start_hydration').then(() => setTimeout(() => location.reload(), 1000));
}

// ================================================
// SECTION: INITIALIZATION
// ================================================

document.addEventListener("DOMContentLoaded", () => {
    const mainView = document.getElementById('main-view');
    if (mainView) {
        mainView.querySelectorAll('details').forEach(el => {
            if (el.id && openDetailsState[el.id] !== undefined) {
                if (openDetailsState[el.id]) el.setAttribute('open', '');
                else el.removeAttribute('open');
            }
        });

        const savedScroll = sessionStorage.getItem('aegisMainScroll');
        if (savedScroll) mainView.scrollTop = parseInt(savedScroll);

        mainView.addEventListener('scroll', () => {
            sessionStorage.setItem('aegisMainScroll', mainView.scrollTop);
        });
    }

    attachFeedScrollListener();

    // Restore log filter state
    const savedFilter = sessionStorage.getItem('aegis_log_filter') || 'all';
    const targetBtn = document.querySelector(`.log-filter-btn[data-filter="${savedFilter}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    const searchInput = document.getElementById('log-search');
    if (searchInput) {
        searchInput.value = sessionStorage.getItem('aegis_log_search') || '';
    }

    // Set initial critical count
    const trackerEl = document.getElementById('critical-count-tracker');
    if (trackerEl) {
        knownCriticalCount = parseInt(trackerEl.innerText) || 0;
    }
});
// ================================================
// SECTION 8: VAULT SETUP + EMERGENCY CONTROLS
// ================================================

// Persist <details> toggle states across soft refreshes
document.addEventListener('toggle', (e) => {
    if (e.target.tagName === 'DETAILS' && e.target.id) {
        openDetailsState[e.target.id] = e.target.open;
        sessionStorage.setItem('aegis_ui_state', JSON.stringify(openDetailsState));
    }
}, true);

// selectedEngine is now defined at the top of the file via window.AEGIS_CONFIG

function selectEngine(mode) {
    selectedEngine = mode;
    const cloud = document.getElementById('path-cloud');
    const local = document.getElementById('path-local');
    if (cloud) {
        cloud.style.borderColor = mode === 'CLOUD' ? '#58a6ff' : '#30363d';
        cloud.style.background = mode === 'CLOUD' ? 'rgba(88, 166, 255, 0.05)' : '#010409';
    }
    if (local) {
        local.style.borderColor = mode === 'LOCAL' ? '#d2a8ff' : '#30363d';
        local.style.background = mode === 'LOCAL' ? 'rgba(210, 168, 255, 0.05)' : '#010409';
    }
}

async function sealVault(event) {
    if (event) event.preventDefault();

    const aegis = document.getElementById('setup-aegis').value;
    const gemini = document.getElementById('setup-gemini').value;
    const vt = document.getElementById('setup-vt').value;

    const itsmUrl = (document.getElementById('setup-itsm-url')?.value || "").trim();
    const itsmToken = (document.getElementById('setup-itsm-token')?.value || "").trim();
    const jiraBaseUrl = (document.getElementById('setup-jira-base-url')?.value || "").trim();
    const analystName = (document.getElementById('setup-analyst-name')?.value || "").trim();

    if (!aegis || aegis.includes('your_')) {
        alert('Master Aegis Key is mandatory.');
        return;
    }

    const btn = document.getElementById('vault-save-btn');
    if (btn) btn.innerText = "SEALING...";
    isUIPaused = true;

    try {
        const res = await fetch('/api/configure_vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                aegis_key: aegis, 
                gemini_key: gemini, 
                vt_key: vt, 
                engine_mode: selectedEngine,
                itsm_url: itsmUrl,
                itsm_token: itsmToken,
                jira_base_url: jiraBaseUrl,
                analyst_name: analystName
            })
        });
        const json = await res.json();

        if (json.status === 'success') {
            document.body.innerHTML = `
                <div style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;background:#010409;color:#8b949e;justify-content:center;align-items:center;font-family:monospace;font-size:14px;flex-direction:column;z-index:9999;">
                    <div style="color:#58a6ff;font-size:24px;font-weight:900;letter-spacing:3px;margin-bottom:15px;animation:text-pulse 1.5s infinite;">🔄 REBOOTING ENGINE</div>
                    <div style="color:#c9d1d9;">Swapping Cognitive Cores...</div>
                </div>`;
            setTimeout(() => location.reload(), 4000);
        } else {
            alert("Error: " + json.message);
            if (btn) btn.innerText = "Seal Vault & Ignite Core";
            isUIPaused = false;
        }
    } catch (e) {
        setTimeout(() => location.reload(), 1000);
    }
}

function executeEmergencyRollback() {
    if (!confirm("EMERGENCY ROLLBACK: Disarm engine and flush network perimeters?")) return;
    fetch('/api/emergency_rollback', { 
        method: 'POST', 
        headers: { 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' } 
    }).then(() => setTimeout(() => location.reload(), 1000));
}

function forceFlushDossier() {
    isUIPaused = true;
    fetch('/api/force_flush', {
        headers: { 'x-aegis-signature': 'UI_AUTHORIZED_SESSION' }
    }).then(() => {
        setTimeout(() => { 
            isUIPaused = false; 
            location.reload(); 
        }, 600);
    });
}

function openDeepAudit(sig) {
    const allWrappers = document.querySelectorAll('.batch-dossier-wrapper');
    allWrappers.forEach(el => {
        if (el.id !== 'wrapper_' + sig && el.dataset.isBatch === 'true') {
            el.style.display = 'none';
        }
    });
    
    const target = document.getElementById('wrapper_' + sig);
    if (target) {
        target.style.display = 'block';
        const mainDetails = target.querySelector('details');
        if (mainDetails) mainDetails.setAttribute('open', '');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


function executeFallbackCopy(text) {
    // Create a robust temporary textarea
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Crucial styles to ensure the element is focusable but invisible
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0"; // Invisible but present in the layout flow
    
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert("✅ Forensic data copied via fallback.");
        } else {
            alert("❌ Browser rejected the copy command.");
        }
    } catch (err) {
        alert("❌ Copy failed: " + err);
    }
    
    document.body.removeChild(textArea);
}