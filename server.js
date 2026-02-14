const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6969;

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

/* ================= MONGODB ================= */

const MONGO_URI = 'mongodb+srv://vikrant:4Uz2zM4LjmeeusFT@cluster0.9y79s8v.mongodb.net/hajmolaDB?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("Mongo Error:", err));

/* ================= USER MODEL ================= */

const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model("User", UserSchema);

/* ================= COSYLAB CONFIG ================= */

const COSY_BASE = "http://cosylab.iiitd.edu.in:6969";
const TOKEN = "N2Xl3Kum62fzUwgARHzuzkUowV22ki0RJ1EM-2dpuDaBGUfw";

/* ================= PROXY ROUTES ================= */

app.get("/api/proxy/recipes", async (req, res) => {
    try {
        const response = await fetch(
            `${COSY_BASE}/recipe2-api/recipe/recipesinfo?page=1&limit=50`,
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("Proxy Error Recipes:", err);
        res.status(500).json({ message: "Proxy failed" });
    }
});

app.get("/api/proxy/recipe/:id", async (req, res) => {
    try {
        const response = await fetch(
            `${COSY_BASE}/recipe2-api/search-recipe/${req.params.id}`,
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("Proxy Error Recipe:", err);
        res.status(500).json({ message: "Proxy failed" });
    }
});

/* ================= AUTH ROUTES ================= */

app.post("/api/register", async (req, res) => {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password)
        return res.status(400).json({ message: "All fields required" });

    try {
        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "User exists" });

        const newUser = new User({
            username: fullname,
            email,
            password
        });

        await newUser.save();
        res.json({ message: "Registered successfully" });

    } catch (err) {
        res.status(500).json({ message: "Registration error" });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.password !== password)
        return res.status(400).json({ message: "Invalid credentials" });

    res.json({
        message: "Login successful",
        user: { username: user.username, email: user.email }
    });
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
    console.log(`🚀 Running on http://localhost:${PORT}`);
});
