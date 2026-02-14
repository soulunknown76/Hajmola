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

/* ================= HISTORY & COMMUNITY MODELS ================= */

const DeviationSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    recipeId: { type: String, required: true },
    recipeTitle: { type: String, required: true },
    ingredients: { type: Array, required: true },
    deviationScore: { type: Number, required: true },
    status: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Deviation = mongoose.model('Deviation', DeviationSchema);

const CommunityMixSchema = new mongoose.Schema({
    author: { type: String, required: true },
    recipeTitle: { type: String, required: true },
    ingredients: { type: Array, required: true },
    deviationScore: { type: Number, required: true },
    status: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    votedBy: { type: [String], default: [] }, // Track users who voted
    date: { type: Date, default: Date.now }
});
const CommunityMix = mongoose.model('CommunityMix', CommunityMixSchema);

/* ================= HISTORY & COMMUNITY ROUTES ================= */

app.post('/api/save-deviation', async (req, res) => {
    try {
        const newDeviation = new Deviation(req.body);
        await newDeviation.save();
        res.status(201).json({ message: 'Deviation saved to history' });
    } catch (error) {
        console.error("Error saving deviation:", error);
        res.status(500).json({ message: 'Failed to save deviation' });
    }
});

app.get('/api/history/:email', async (req, res) => {
    try {
        const history = await Deviation.find({ userEmail: req.params.email }).sort({ date: -1 });
        res.json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: 'Failed to fetch history' });
    }
});

app.post('/api/community/publish', async (req, res) => {
    try {
        const newMix = new CommunityMix(req.body);
        await newMix.save();
        res.status(201).json({ message: 'Published to Community Hub' });
    } catch (error) {
        console.error("Error publishing mix:", error);
        res.status(500).json({ message: 'Failed to publish mix' });
    }
});

app.get('/api/community/feed', async (req, res) => {
    try {
        // Sort by likes (descending), then date
        const feed = await CommunityMix.find().sort({ likes: -1, date: -1 }).limit(50);
        res.json(feed);
    } catch (error) {
        console.error("Error fetching feed:", error);
        res.status(500).json({ message: 'Failed to fetch community feed' });
    }
});

app.post('/api/community/vote', async (req, res) => {
    const { id, type, userEmail } = req.body; // Expect userEmail in body
    try {
        const mix = await CommunityMix.findById(id);
        if (!mix) return res.status(404).json({ message: 'Mix not found' });

        if (mix.votedBy.includes(userEmail)) {
            return res.status(400).json({ message: 'You have already voted on this mix.' });
        }

        if (type === 'like') mix.likes += 1;
        if (type === 'dislike') mix.dislikes += 1;

        mix.votedBy.push(userEmail);
        await mix.save();

        res.json({ message: 'Vote recorded', likes: mix.likes, dislikes: mix.dislikes });
    } catch (error) {
        console.error("Error voting:", error);
        res.status(500).json({ message: 'Failed to vote' });
    }
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
    console.log(`🚀 Running on http://localhost:${PORT}`);
});
