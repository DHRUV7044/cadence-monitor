async function loadStatus() {

    const response = await fetch("data/status.json");
    const data = await response.json();

    const container = document.getElementById("status-container");

    container.innerHTML = "";

    data.services.forEach(service => {

        const card = document.createElement("div");
        card.className = "card";

        const statusText = service.status;
        const statusClass = service.status;

        card.innerHTML = `
            <h2>${service.name}</h2>
            <p class="${statusClass}">
                ${statusText}
            </p>
        `;

        container.appendChild(card);

    });

    document.getElementById("last-updated").textContent =
        "Last Updated : " + data.last_updated;
}

loadStatus();