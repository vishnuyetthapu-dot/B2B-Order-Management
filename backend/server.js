const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// CORS
app.use(cors({
  origin: "http://localhost:5173"
}));

// JSON support
app.use(express.json());

// Test backend
app.get("/", (req, res) => {
  res.json({
    message: "B2B Order Management Backend is running"
  });
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed"
    });
  }
});

// Get products from PostgreSQL
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY id"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch products"
    });
  }
});

// Start server
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});