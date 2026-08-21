// --- Global Dashboard State ---
let logHistory = [];
let activeFilter = 'ALL';
let canvasAnimFrame = null;
let latencyHistory = [12, 10, 15, 11, 14, 12, 15, 12, 13, 11, 14, 12];

document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI Handles ---
    const btnRefresh = document.getElementById('btnRefresh');
    const refreshIcon = document.getElementById('refreshIcon');
    const btnClearConsole = document.getElementById('btnClearConsole');
    const filterAll = document.getElementById('filterAll');
    const filterInfo = document.getElementById('filterInfo');
    const filterErrors = document.getElementById('filterErrors');
    
    // --- Event Listeners ---
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            // Spin refresh icon
            refreshIcon.classList.add('spin');
            addLogEntry('CMD', 'Initiating manual workstation diagnostics poll...', 'info');
            
            // Poll telemetry status
            loadStatus().then(() => {
                setTimeout(() => {
                    refreshIcon.classList.remove('spin');
                }, 600);
            });
        });
    }

    if (btnClearConsole) {
        btnClearConsole.addEventListener('click', () => {
            logHistory = [];
            renderLogs();
        });
    }

    if (filterAll) {
        filterAll.addEventListener('click', () => setConsoleFilter('ALL', filterAll));
    }
    if (filterInfo) {
        filterInfo.addEventListener('click', () => setConsoleFilter('INFO', filterInfo));
    }
    if (filterErrors) {
        filterErrors.addEventListener('click', () => setConsoleFilter('ERRORS', filterErrors));
    }

    // Initialize components
    initConsoleLogs();
    initWaveformAnalyzer();
    initDiagnosticsLoop();
    
    // Initial fetch
    loadStatus();
});

// --- Telemetry Loader ---
async function loadStatus() {
    try {
        const response = await fetch("data/status.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        // Update nodes count
        const nodeCountBadge = document.getElementById("nodeCount");
        if (nodeCountBadge) {
            nodeCountBadge.textContent = `${data.services.length} Nodes`;
        }

        // Render Telemetry Table Rows
        const tbody = document.getElementById("telemetry-rows");
        tbody.innerHTML = "";

        data.services.forEach(service => {
            const tr = document.createElement("tr");
            const checkTime = service.last_success 
                ? new Date(service.last_success).toLocaleTimeString()
                : 'N/A';

            tr.innerHTML = `
                <td class="node-badge font-mono">${service.id}</td>
                <td><strong>${service.name}</strong></td>
                <td>
                    <span class="status-diag diag-${service.status}">
                        ${service.status}
                    </span>
                </td>
                <td><div class="message-feed" title="${service.message}">${service.message}</div></td>
                <td class="text-right font-mono">${checkTime}</td>
            `;
            tbody.appendChild(tr);

            // Log entries from telemetry responses
            const severity = service.status === 'online' ? 'success' : (service.status === 'warning' ? 'warn' : 'err');
            addLogEntry(
                service.id.toUpperCase(), 
                `Node reported status: ${service.status.toUpperCase()} - "${service.message}"`, 
                severity
            );
        });

        // Update licensing values if virtuoso license server checked out successfully
        const cdsLicenseNode = data.services.find(s => s.id === 'license');
        if (cdsLicenseNode && cdsLicenseNode.status === 'online') {
            document.getElementById('licActive').textContent = '12';
            document.getElementById('licAvailable').textContent = '88';
        }

        // Footer Timestamp
        const lastCheck = new Date(data.generated_at).toLocaleString();
        document.getElementById("generated_at").textContent = `Last Workstation Sync: ${lastCheck}`;
        
        addLogEntry('SYS', 'Telemetry sync complete. Telemetry buffers updated.', 'success');

    } catch (error) {
        console.error(error);
        addLogEntry('SYS', `Network telemetry poll failed: ${error.message}`, 'err');
        
        const tbody = document.getElementById("telemetry-rows");
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-loading" style="color: var(--status-offline);">
                    <i data-lucide="alert-triangle" style="animation: none; color: var(--status-offline);"></i>
                    <span>Telemetry Poll Failed. Check Gateway Link.</span>
                </td>
            </tr>
        `;
        lucide.createIcons();
    }
}

// --- Monospaced Logs Terminal Logic ---
function initConsoleLogs() {
    addLogEntry('SYS', 'EDA Workstation System Diagnostics v2.0 initialized.', 'info');
    addLogEntry('SYS', 'Secure socket connection established at port 22.', 'info');
    addLogEntry('SYS', 'Diagnostic telemetry buffers allocated.', 'success');
}

function addLogEntry(source, message, severity) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Add to history array
    logHistory.push({
        timestamp,
        source,
        message,
        severity
    });

    // Cap logs at 100 entries to prevent memory leak
    if (logHistory.length > 100) {
        logHistory.shift();
    }

    renderLogs();
}

function setConsoleFilter(filter, activeBtn) {
    activeFilter = filter;
    
    // Remove active filter classes
    document.querySelectorAll('.btn-console').forEach(btn => {
        btn.classList.remove('active-console-filter');
    });
    
    // Add active filter class
    activeBtn.classList.add('active-console-filter');
    
    renderLogs();
}

function renderLogs() {
    const logBox = document.getElementById('consoleLogBox');
    if (!logBox) return;

    logBox.innerHTML = "";
    
    const filteredLogs = logHistory.filter(log => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'INFO') return log.severity === 'info' || log.severity === 'success';
        if (activeFilter === 'ERRORS') return log.severity === 'err' || log.severity === 'warn';
        return true;
    });

    if (filteredLogs.length === 0) {
        logBox.innerHTML = `<div class="console-log-line text-muted">No diagnostic messages in current buffer.</div>`;
        return;
    }

    filteredLogs.forEach(log => {
        const line = document.createElement('div');
        line.className = 'console-log-line';
        
        let severityClass = 'console-info';
        if (log.severity === 'success') severityClass = 'console-success';
        if (log.severity === 'warn') severityClass = 'console-warn';
        if (log.severity === 'err') severityClass = 'console-err';

        line.innerHTML = `
            <span class="console-ts">[${log.timestamp}]</span>
            <span class="console-source">[${log.source}]</span>
            <span class="${severityClass}">${log.message}</span>
        `;
        logBox.appendChild(line);
    });

    // Auto-scroll to bottom
    logBox.scrollTop = logBox.scrollHeight;
}

// --- Logic Analyzer Waveform Canvas ---
function initWaveformAnalyzer() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let offset = 0;
    
    function drawWaveforms() {
        if (!canvas.getContext) return;
        
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#03060c';
        ctx.fillRect(0, 0, width, height);
        
        // Draw coordinate grid lines
        ctx.strokeStyle = 'rgba(27, 38, 59, 0.4)';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = 0; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal signal channels lines
        const channelHeight = height / 3;
        for (let c = 1; c < 3; c++) {
            ctx.beginPath();
            ctx.moveTo(0, c * channelHeight);
            ctx.lineTo(width, c * channelHeight);
            ctx.stroke();
        }
        
        // --- Draw CLK Signal (Square wave) ---
        ctx.strokeStyle = '#0ea5e9'; // Cyan
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const clkYCenter = channelHeight / 2;
        const clkAmp = channelHeight * 0.3; // Amplitude
        const clkPeriod = 15; // Width of high/low cycle
        
        for (let x = 0; x < width; x++) {
            const phase = Math.floor((x + offset) / clkPeriod) % 2;
            const y = clkYCenter + (phase === 0 ? -clkAmp : clkAmp);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                // If value shifts, draw vertical line transitions
                const prevPhase = Math.floor((x - 1 + offset) / clkPeriod) % 2;
                if (phase !== prevPhase) {
                    const prevY = clkYCenter + (prevPhase === 0 ? -clkAmp : clkAmp);
                    ctx.lineTo(x, prevY);
                }
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // --- Draw EN (Enable) Signal ---
        ctx.strokeStyle = '#a855f7'; // Purple
        ctx.beginPath();
        
        const enYCenter = channelHeight + channelHeight / 2;
        const enAmp = channelHeight * 0.3;
        const enPeriod = 120;
        
        for (let x = 0; x < width; x++) {
            // Enable stays high, drops low periodically
            const phase = Math.floor((x + offset * 0.5) / enPeriod) % EnCyclesLength();
            const state = (phase === 2) ? 1 : 0; // Drop low on cycle 2
            const y = enYCenter + (state === 0 ? -enAmp : enAmp);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevPhase = Math.floor((x - 1 + offset * 0.5) / enPeriod) % EnCyclesLength();
                const prevState = (prevPhase === 2) ? 1 : 0;
                if (state !== prevState) {
                    const prevY = enYCenter + (prevState === 0 ? -enAmp : enAmp);
                    ctx.lineTo(x, prevY);
                }
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // --- Draw DATA Signal ---
        ctx.strokeStyle = '#10b981'; // Green
        ctx.beginPath();
        
        const dataYCenter = 2 * channelHeight + channelHeight / 2;
        const dataAmp = channelHeight * 0.3;
        
        for (let x = 0; x < width; x++) {
            // Draw pseudo-random shifting bus data bits
            const seed = Math.floor((x + offset * 0.75) / 25);
            const bit = pseudoRandomBit(seed);
            const y = dataYCenter + (bit === 1 ? -dataAmp : dataAmp);
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevSeed = Math.floor((x - 1 + offset * 0.75) / 25);
                const prevBit = pseudoRandomBit(prevSeed);
                if (bit !== prevBit) {
                    const prevY = dataYCenter + (prevBit === 1 ? -dataAmp : dataAmp);
                    ctx.lineTo(x, prevY);
                }
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        offset = (offset + 1.2) % 600; // Increment shift offset
        canvasAnimFrame = requestAnimationFrame(drawWaveforms);
    }

    function EnCyclesLength() { return 5; }
    
    function pseudoRandomBit(seed) {
        // Simple hash function for consistent pseudo-random waveforms
        const x = Math.sin(seed) * 10000;
        return (x - Math.floor(x)) > 0.5 ? 1 : 0;
    }
    
    // Start drawing loop
    drawWaveforms();
}

// --- Live Diagnostics Telemetry Loop ---
function initDiagnosticsLoop() {
    // 1. Memory and CPU load fluctuations
    setInterval(() => {
        // CPU Load fluctuates slightly around 5-12%
        const cpuLoad = (5 + Math.random() * 7).toFixed(1);
        const cpuBar = document.querySelector('.specs-grid .spec-row:nth-child(4) .progress-bar');
        const cpuLabel = document.querySelector('.specs-grid .spec-row:nth-child(4) .progress-label');
        if (cpuBar && cpuLabel) {
            cpuBar.style.width = `${cpuLoad}%`;
            cpuLabel.textContent = `${cpuLoad}%`;
        }

        // DRAM fluctuates slightly around 32-33%
        const dramLoad = (31.8 + Math.random() * 0.8).toFixed(1);
        const dramBar = document.querySelector('.specs-grid .spec-row:nth-child(5) .progress-bar');
        const dramLabel = document.querySelector('.specs-grid .spec-row:nth-child(5) .progress-label');
        if (dramBar && dramLabel) {
            dramBar.style.width = `${dramLoad}%`;
            dramLabel.textContent = `${dramLoad}%`;
        }
    }, 2500);

    // 2. Latency Sparkline loop
    setInterval(() => {
        // Generate new latency between 9ms and 19ms
        const newPing = Math.floor(9 + Math.random() * 11);
        latencyHistory.push(newPing);
        if (latencyHistory.length > 12) {
            latencyHistory.shift();
        }
        
        // Update Sparkline DOM
        const sparkContainer = document.getElementById('pingSparkline');
        const pingValDisplay = document.getElementById('pingVal');
        
        if (sparkContainer && pingValDisplay) {
            pingValDisplay.textContent = `${newPing} ms`;
            sparkContainer.innerHTML = "";
            
            latencyHistory.forEach((ping, idx) => {
                const span = document.createElement('span');
                span.className = 'spark-bar';
                // Scale height mapping (9ms -> 8px, 19ms -> 24px)
                const height = 8 + (ping - 9) * 1.6;
                span.style.height = `${height}px`;
                
                // Last item is active
                if (idx === latencyHistory.length - 1) {
                    span.classList.add('active-spark');
                }
                sparkContainer.appendChild(span);
            });
        }
    }, 3000);
}