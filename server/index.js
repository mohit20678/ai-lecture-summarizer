require("dotenv").config();
require("dns").setServers(["8.8.8.8","1.1.1.1"]);
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) =>
  res.send("AI Lecture Summarizer API is running. Try /api/health")
);
app.use("/api/health", require("./routes/health"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/notes", require("./routes/notes"));

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

const uri = process.env.MONGO_URI;
if (!uri || uri.includes("your_mongodb_link_here")) {
  console.warn("MONGO_URI is not set. Notes will not be saved.");
} else {
  mongoose
    .connect(uri)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
