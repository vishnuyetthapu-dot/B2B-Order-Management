const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DB_SSL === "true"
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "b2b_order_management",
      }
);

const allowedStatuses = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Completed",
  "Cancelled",
];

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
    )
  `);

  // Existing databases may already have this table without product_name.
  await pool.query(`
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)
  `);

  // Existing rows may not have a product name. Keep the column nullable
  // so old orders remain accessible.
  console.log("Database tables are ready");
}

app.get("/", (req, res) => {
  res.json({ message: "B2B Order Management API is running" });
});

// PRODUCTS
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 0
    ) {
      return res.status(400).json({
        message: "Enter a valid name, price and stock",
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, price, stock)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), Number(price), Number(stock)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: "Failed to add product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      message: "Could not delete product",
    });
  }
});

// ORDERS
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  let client;

  try {
    const { customer_name, customer, items, product_id, quantity } = req.body;
    const customerName = String(customer_name || customer || "").trim();

    let orderItems = items;

    if (!orderItems && product_id && quantity) {
      orderItems = [{ product_id, quantity }];
    }

    if (
      !customerName ||
      !Array.isArray(orderItems) ||
      orderItems.length === 0
    ) {
      return res.status(400).json({
        message: "Customer name and at least one order item are required",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    let totalAmount = 0;
    const savedItems = [];

    for (const item of orderItems) {
      const productId = Number(item.product_id);
      const itemQuantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(itemQuantity) ||
        itemQuantity <= 0
      ) {
        throw new Error("Invalid product ID or quantity");
      }

      const productResult = await client.query(
        "SELECT * FROM products WHERE id = $1 FOR UPDATE",
        [productId]
      );

      if (!productResult.rows.length) {
        throw new Error(`Product ${productId} not found`);
      }

      const product = productResult.rows[0];

      if (Number(product.stock) < itemQuantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const price = Number(product.price);
      const subtotal = Math.round(price * itemQuantity * 100) / 100;
      totalAmount += subtotal;

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [itemQuantity, productId]
      );

      savedItems.push({
        product_id: productId,
        product_name: product.name,
        quantity: itemQuantity,
        price,
        subtotal,
      });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, total_amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [customerName, totalAmount, "Pending"]
    );

    const order = orderResult.rows[0];

    for (const item of savedItems) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.product_id,
          item.product_name,
          item.quantity,
          item.price,
          item.subtotal,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Order created successfully",
      order,
      items: savedItems,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Create order error:", error);
    res.status(400).json({ message: error.message });
  } finally {
    if (client) client.release();
  }
});

// UPDATE ORDER STATUS
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
        allowedStatuses,
      });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// INVOICE
app.get("/api/orders/:id/invoice", async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE id = $1",
      [orderId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT
         oi.id,
         oi.order_id,
         oi.product_id,
         COALESCE(
           oi.product_name,
           p.name,
           'Product no longer available'
         ) AS product_name,
         oi.quantity,
         oi.price,
         oi.subtotal
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [orderId]
    );

    res.json({
      order,
      items: itemsResult.rows,
      total_amount: Number(order.total_amount),
    });
  } catch (error) {
    console.error("Invoice error:", error);
    res.status(500).json({
      message: "Failed to load invoice",
      error: error.message,
    });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Invoice API is ready");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();