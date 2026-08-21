// --- Service ID to Lucide Icon Mapping ---
function getIconName(id) {
    const serviceId = id.toLowerCase();
    if (serviceId.includes('virtuoso')) {
        return 'cpu';
    } else if (serviceId.includes('ssh')) {
        return 'terminal';
    } else if (serviceId.includes('license') || serviceId.includes('key')) {
        return 'key';
    }
    return 'server';
}

// --- Telemetry Loader ---
async function loadStatus() {
    try {
        const response = await fetch("data/status.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        const container = document.getElementById("status-container");
        if (!container) return;

        container.innerHTML = "";

        data.services.forEach(service => {
            const card = document.createElement("div");
            card.className = "card";

            const iconName = getIconName(service.id);
            const formattedDate = service.last_success 
                ? new Date(service.last_success).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A';

            card.innerHTML = `
                <div class="card-header-area">
                    <h2>${service.name}</h2>
                    <span class="status-badge badge-${service.status}">${service.status}</span>
                </div>

                <p class="message">${service.message}</p>

                <div class="card-meta">
                    <div class="card-meta-item">
                        <i data-lucide="${iconName}"></i>
                        <span>Node: ${service.id}</span>
                    </div>
                    <div class="card-meta-item">
                        <i data-lucide="clock"></i>
                        <span>Sync: ${formattedDate}</span>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // Format generated_at timestamp nicely
        const lastUpdatedDate = new Date(data.generated_at).toLocaleString();
        document.getElementById("generated_at").textContent = `Last Sync: ${lastUpdatedDate}`;

        // Initialize Lucide icons for dynamically added nodes
        lucide.createIcons();

    } catch (error) {
        console.error(error);
        const container = document.getElementById("status-container");
        if (container) {
            container.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; align-items: center; text-align: center;">
                    <div class="card-header-area" style="margin-bottom: 10px;">
                        <h2 style="color: var(--status-offline); margin: 0 auto;">Diagnostic Sync Error</h2>
                    </div>
                    <p class="message">Unable to query live telemetry from diagnostics network.</p>
                </div>
            `;
        }
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    loadStatus();
});