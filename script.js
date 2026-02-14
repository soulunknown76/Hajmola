let originalIngredients = [];
let currentIngredients = [];

window.onload = fetchRecipes;

/* ================= FETCH RECIPES ================= */

async function fetchRecipes() {
    try {
        const response = await fetch("/api/proxy/recipes");

        if (!response.ok) {
            console.error("Fetch failed:", response.status);
            return;
        }

        const data = await response.json();

        const recipes =
            data?.payload?.data ||
            data?.data ||
            [];

        populateDropdown(recipes);

    } catch (err) {
        console.error("Error:", err);
    }
}

/* ================= DROPDOWN ================= */

function populateDropdown(recipes) {
    const dropdown = document.getElementById("recipeDropdown");

    dropdown.innerHTML = '<option value="">-- INITIATE RECIPE SEARCH --</option>';

    recipes.forEach(recipe => {
        const option = document.createElement("option");
        option.value = recipe.Recipe_id;
        option.textContent = recipe.Recipe_title;
        dropdown.appendChild(option);
    });
}

/* ================= LOAD RECIPE ================= */

async function loadSelectedRecipe() {
    const recipeId = document.getElementById("recipeDropdown").value;
    if (!recipeId) return;

    try {
        const response = await fetch(`/api/proxy/recipe/${recipeId}`);

        if (!response.ok) {
            console.error("Recipe fetch failed:", response.status);
            return;
        }

        const data = await response.json();

        document.getElementById("recipeTitle").innerText =
            data.recipe.Recipe_title;

        originalIngredients = data.ingredients.map(ing => ({
            name: ing.ingredient,
            quantity: parseQuantity(ing.quantity),
            unit: ing.unit || ""
        }));

        currentIngredients = JSON.parse(JSON.stringify(originalIngredients));

        renderIngredients();
        document.getElementById("recipeDetails").style.display = "block";

    } catch (err) {
        console.error("Error:", err);
    }
}

/* ================= TABLE ================= */

function renderIngredients() {
    const tbody = document.querySelector("#ingredientTable tbody");
    tbody.innerHTML = "";

    currentIngredients.forEach((ing, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${ing.name}</td>
            <td>
                <input type="number" step="0.01" value="${ing.quantity}" 
                onchange="updateQuantity(${index}, this.value)">
            </td>
            <td>${ing.unit}</td>
        `;

        tbody.appendChild(row);
    });
}

function updateQuantity(index, value) {
    currentIngredients[index].quantity = parseFloat(value) || 0;
}

function parseQuantity(q) {
    if (!q) return 0;
    if (typeof q === "string" && q.includes("/")) {
        const parts = q.split("/");
        return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    return parseFloat(q) || 0;
}

/* ================= CALCULATE SCORE ================= */

function calculateScore() {
    if (!originalIngredients.length) return;

    let totalDeviation = 0;

    for (let i = 0; i < originalIngredients.length; i++) {
        const original = originalIngredients[i].quantity;
        const current = currentIngredients[i].quantity;

        // Avoid division by zero
        if (original === 0) continue;

        const deviation = Math.abs(current - original) / original;
        totalDeviation += deviation;
    }

    const avgDeviation = (totalDeviation / originalIngredients.length) * 100;

    let message = "";
    let colorClass = "";

    if (avgDeviation < 15) {
        message = "STABLE VARIATION [OPTIMAL]";
        colorClass = "color: #00ff00; text-shadow: 0 0 10px #00ff00;";
    } else if (avgDeviation < 40) {
        message = "MODERATE CHANGE [WARNING]";
        colorClass = "color: #ffaa00; text-shadow: 0 0 10px #ffaa00;";
    } else {
        message = "MAJOR EXPERIMENTAL CHANGE [CRITICAL]";
        colorClass = "color: #ff0000; text-shadow: 0 0 10px #ff0000;";
    }

    const resultElement = document.getElementById("scoreResult");
    resultElement.innerHTML =
        `DEVIATION SCORE: <span style="color: white;">${avgDeviation.toFixed(2)}%</span> <br> 
         STATUS: <span style="${colorClass}">${message}</span>`;

    // Add visual feedback
    resultElement.style.borderLeftColor = avgDeviation < 15 ? '#00ff00' : (avgDeviation < 40 ? '#ffaa00' : '#ff0000');
}

/* ================= NEW FEATURES ================= */

async function saveDeviation() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("Please login first");

    const recipeTitle = document.getElementById("recipeTitle").innerText;
    const scoreText = document.getElementById("scoreResult").innerText;

    if (!scoreText) return alert("Please calculate deviation first");

    const avgDeviation = parseFloat(scoreText.match(/[\d\.]+/)[0]);
    const status = scoreText.split("STATUS: ")[1].split("<")[0];

    const payload = {
        userEmail: user.email,
        recipeId: document.getElementById("recipeDropdown").value,
        recipeTitle: recipeTitle,
        ingredients: currentIngredients,
        deviationScore: avgDeviation,
        status: status
    };

    try {
        const response = await fetch('/api/save-deviation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) alert("Saved to History!");
        else alert("Failed to save.");
    } catch (error) {
        console.error(error);
        alert("Error saving.");
    }
}

async function publishToCommunity() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("Please login first");

    const recipeTitle = document.getElementById("recipeTitle").innerText;
    const scoreText = document.getElementById("scoreResult").innerText;

    if (!scoreText) return alert("Please calculate deviation first");

    const avgDeviation = parseFloat(scoreText.match(/[\d\.]+/)[0]);

    // Extract status text safely
    const statusText = scoreText.split("STATUS: ")[1];
    // Clean up status text (remove HTML tags if any)
    const status = statusText.replace(/<[^>]*>/g, '').trim();

    const payload = {
        author: user.username,
        recipeTitle: recipeTitle,
        ingredients: currentIngredients,
        deviationScore: avgDeviation,
        status: status
    };

    try {
        const response = await fetch('/api/community/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            alert("Published to Global Feed!");
            window.location.href = 'community.html';
        }
        else alert("Failed to publish.");
    } catch (error) {
        console.error(error);
        alert("Error publishing.");
    }
}

async function showHistory() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const modal = document.getElementById("historyModal");
    const list = document.getElementById("historyList");
    list.innerHTML = "Loading...";
    modal.style.display = "flex";

    try {
        const response = await fetch(`/api/history/${user.email}`);
        const history = await response.json();

        if (history.length === 0) {
            list.innerHTML = "<p>No deviations recorded.</p>";
            return;
        }

        let tableHtml = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Recipe</th>
                        <th>Deviation</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        history.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${new Date(item.date).toLocaleDateString()}</td>
                    <td>${item.recipeTitle}</td>
                    <td style="color: ${item.deviationScore < 15 ? '#00ff00' : (item.deviationScore < 40 ? 'orange' : 'red')}">
                        ${item.deviationScore.toFixed(2)}%
                    </td>
                    <td>${item.status}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        list.innerHTML = tableHtml;

    } catch (error) {
        list.innerHTML = "Error loading history.";
    }
}

function closeHistory() {
    document.getElementById("historyModal").style.display = "none";
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById("historyModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
