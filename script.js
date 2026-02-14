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

function calculateScore() {
    if (!originalIngredients.length) return;

    let totalDeviation = 0;

    for (let i = 0; i < originalIngredients.length; i++) {
        const original = originalIngredients[i].quantity;
        const current = currentIngredients[i].quantity;

        if (original === 0) continue;

        const deviation = Math.abs(current - original) / original;
        totalDeviation += deviation;
    }

    const avgDeviation =
        (totalDeviation / originalIngredients.length) * 100;

    document.getElementById("scoreResult").innerText =
        `Deviation Score: ${avgDeviation.toFixed(2)}%`;
}
