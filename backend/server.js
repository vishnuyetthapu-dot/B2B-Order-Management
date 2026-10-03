
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// ===============================
// DATABASE TEST
// ===============================

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


// ===============================
// BACKEND TEST
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "B2B Order Management Backend is running"
  });
});


// ===============================
// GET ALL PRODUCTS
// ===============================

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


// ===============================
// ADD PRODUCT
// ===============================

app.post("/api/products", async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    // Validation
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        message: "Name, price and stock are required"
      });
    }

    if (Number(price) < 0 || Number(stock) < 0) {
      return res.status(400).json({
        message: "Price and stock cannot be negative"
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, price, stock)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, price, stock]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add product"
    });
  }
});


// ===============================
// UPDATE PRODUCT
// ===============================

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock } = req.body;

    // Validation
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        message: "Name, price and stock are required"
      });
    }

    if (Number(price) < 0 || Number(stock) < 0) {
      return res.status(400).json({
        message: "Price and stock cannot be negative"
      });
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1,
           price = $2,
           stock = $3
       WHERE id = $4
       RETURNING *`,
      [name, price, stock, id]
    );

    // Product not found
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update product"
    });
  }
});


// ===============================
// START SERVER
// ===============================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});