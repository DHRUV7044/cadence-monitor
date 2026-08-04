async function loadStatus() {

    try {

        const response = await fetch("data/status.json");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const container = document.getElementById("status-container");
        container.innerHTML = "";

        data.services.forEach(service => {

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <h2>${service.name}</h2>

                <p class="${service.status}">
                    ${service.status.toUpperCase()}
                </p>

                <small>${service.message}</small>
            `;

            container.appendChild(card);

        });

        document.getElementById("generated_at").textContent =
            `Last Updated : ${data.generated_at}`;

    }
    catch (error) {

        console.error(error);

        document.getElementById("status-container").innerHTML = `
            <div class="card">
                <h2>Error</h2>
                <p class="offline">Unable to load status.</p>
            </div>
        `;

    }

}

loadStatus();