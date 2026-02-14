const BASE_URL = "http://cosylab.iiitd.edu.in:6969";
const TOKEN = "N2Xl3Kum62fzUwgARHzuzkUowV22ki0RJ1EM-2dpuDaBGUfw";

let originalIngredients = [];
let currentIngredients = [];

window.onload = fetchRecipes;

async function fetchRecipes() {
    try {
        const response = await fetch(
            BASE_URL + "/recipe2-api/recipe/recipesinfo?page=1&limit=50",
            {
                headers: {
                    "Authorization": "Bearer " + TOKEN
                }
            }
        );

        const data = await response.json();
        const recipes = data.payload.data;
        populateDropdown(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
    }
}

function populateDropdown(recipes) {
    const dropdown = document.getElementById("recipeDropdown");
    
    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">-- INITIATE RECIPE SEARCH --</option>';

    recipes.forEach(recipe => {
        const option = document.createElement("option");
        option.value = recipe.Recipe_id;
        option.textContent = recipe.Recipe_title;
        dropdown.appendChild(option);
    });
}

async function loadSelectedRecipe() {
    const recipeId = document.getElementById("recipeDropdown").value;
    if (!recipeId) {
        document.getElementById("recipeDetails").style.display = "none";
        return;
    }

    try {
        const response = await fetch(
            BASE_URL + `/recipe2-api/search-recipe/${recipeId}`,
            {
                headers: {
                    "Authorization": "Bearer " + TOKEN
                }
            }
        );

        const data = await response.json();

        document.getElementById("recipeTitle").innerText = data.recipe.Recipe_title;

        originalIngredients = data.ingredients.map(ing => ({
            name: ing.ingredient,
            quantity: parseQuantity(ing.quantity),
            unit: ing.unit || ""
        }));

        currentIngredients = JSON.parse(JSON.stringify(originalIngredients));

        renderIngredients();

        document.getElementById("recipeDetails").style.display = "block";
    } catch (error) {
        console.error("Error loading recipe:", error);
    }
}

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
    currentIngredients[index].quantity = parseFloat(value);
}

function parseQuantity(q) {
    if (!q) return 0;

    if (q.includes("/")) {
        const parts = q.split("/");
        return parseFloat(parts[0]) / parseFloat(parts[1]);
    }

    return parseFloat(q);
}

function calculateScore() {
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
