import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function request(path, options = {}) {
    let response;

    try {
      response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
    } catch {
      throw new Error(
        "Backend connect avvaledu. Backend server port 5000 lo run avuthundo check cheyyi."
      );
    }

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadProducts() {
    const data = await request("/products");
    const list = Array.isArray(data) ? data : data.products;

    if (!Array.isArray(list)) {
      throw new Error("Products API nunchi valid list raledu.");
    }

    setProducts(list);
  }

  async function loadOrders() {
    const data = await request("/orders");
    const list = Array.isArray(data) ? data : data.orders;

    if (!Array.isArray(list)) {
      throw new Error("Orders API nunchi valid list raledu.");
    }

    setOrders(list);
  }

  async function refreshData() {
    try {
      await Promise.all([loadProducts(), loadOrders()]);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function addProduct(event) {
    event.preventDefault();

    try {
      await request("/products", {
        method: "POST",
        body: JSON.stringify({
          name: productName.trim(),
          price: Number(productPrice),
          stock: Number(productStock),
        }),
      });

      setProductName("");
      setProductPrice("");
      setProductStock("");
      setMessage("Product added successfully.");
      await loadProducts();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;

    try {
      await request(`/products/${product.id}`, { method: "DELETE" });
      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createOrder(event) {
    event.preventDefault();

    if (!customer.trim() || !selectedProduct || Number(quantity) < 1) {
      setMessage("Customer, product and valid quantity enter cheyyi.");
      return;
    }

    const product = products.find(
      (item) => String(item.id) === String(selectedProduct)
    );

    if (!product) {
      setMessage("Valid product select cheyyi.");
      return;
    }

    if (Number(quantity) > Number(product.stock)) {
      setMessage("Not enough stock available.");
      return;
    }

    try {
      await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customer.trim(),
          items: [
            {
              product_id: Number(selectedProduct),
              quantity: Number(quantity),
            },
          ],
        }),
      });

      setCustomer("");
      setSelectedProduct("");
      setQuantity(1);
      setMessage("Order created successfully.");

      await Promise.all([loadProducts(), loadOrders()]);
      setPage("Orders");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStatus(orderId, status) {
    try {
      await request(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage("Order status updated.");
      await loadOrders();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function viewInvoice(order) {
    setLoading(true);
    setMessage("");
    setInvoice(null);

    try {
      const data = await request(`/orders/${order.id}/invoice`);

      const orderData = data.order || data;

      setInvoice({
        ...data,
        order: orderData,
        items: Array.isArray(data.items)
          ? data.items
          : Array.isArray(orderData.items)
            ? orderData.items
            : [],
      });

      setPage("Invoice");
    } catch (error) {
      setMessage(`Invoice load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });
  }

  function printInvoice() {
    if (!invoice) return;

    const order = invoice.order || invoice;
    const items = invoice.items || [];

    const rows = items
      .map((item) => {
        const price = Number(item.price || 0);
        const qty = Number(item.quantity || 0);
        const subtotal = Number(item.subtotal ?? price * qty);

        return `
          <tr>
            <td>${escapeHtml(item.product_name || item.name || "Product")}</td>
            <td>${qty}</td>
            <td>₹${price.toLocaleString("en-IN")}</td>
            <td>₹${subtotal.toLocaleString("en-IN")}</td>
          </tr>`;
      })
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setMessage("Browser settings lo pop-ups allow cheyyi.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${escapeHtml(order.id)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 850px;
            margin: 35px auto;
            padding: 25px;
            color: #1e293b;
          }
          .top {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px solid #1769d2;
            padding-bottom: 20px;
          }
          h1 { color: #1769d2; margin-bottom: 5px; }
          .details { line-height: 2; margin: 25px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #dbe2ea; padding: 12px; text-align: left; }
          th { background: #eff6ff; }
          .total { text-align: right; margin-top: 25px; font-size: 22px; }
          .footer { margin-top: 40px; color: #64748b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="top">
          <div>
            <h1>B2B Portal</h1>
            <p>Order Management</p>
          </div>
          <div>
            <h2>INVOICE</h2>
            <p>Invoice #${escapeHtml(order.id)}</p>
          </div>
        </div>

        <div class="details">
          <b>Customer:</b> ${escapeHtml(order.customer_name || order.customer || "—")}<br>
          <b>Date:</b> ${escapeHtml(order.created_at || "—")}<br>
          <b>Status:</b> ${escapeHtml(order.status || "Pending")}
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows || "<tr><td colspan='4'>Item details unavailable</td></tr>"}
          </tbody>
        </table>

        <h2 class="total">
          Total: ₹${Number(
            order.total_amount || invoice.total_amount || 0
          ).toLocaleString("en-IN")}
        </h2>

        <p class="footer">Thank you for your business.</p>
        <script>window.onload = function () { window.print(); }<\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const menu = ["Dashboard", "Products", "Create Order", "Orders"];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">B</div>
          <div>
            <h3>B2B Portal</h3>
            <span>Order Management</span>
          </div>
        </div>

        <p className="menu-heading">MAIN MENU</p>

        {menu.map((item) => (
          <button
            key={item}
            className={`menu-item ${page === item ? "active" : ""}`}
            onClick={() => setPage(item)}
          >
            {item === "Dashboard" && "▦"}
            {item === "Products" && "□"}
            {item === "Create Order" && "+"}
            {item === "Orders" && "☷"}
            <span>{item}</span>
          </button>
        ))}

        <div className="sidebar-bottom">
          <strong>Administrator</strong>
          <span>Admin Account</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{page}</h1>
            <p>Manage your products, inventory and orders.</p>
          </div>
          <button className="secondary-btn" onClick={refreshData}>
            ↻ Refresh
          </button>
        </header>

        {message && (
          <div className="message" role="alert">
            <span>{message}</span>
            <button onClick={() => setMessage("")} aria-label="Close message">
              ×
            </button>
          </div>
        )}

        {page === "Dashboard" && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Total Products</span>
                <h2>{products.length}</h2>
              </div>
              <div className="stat-card">
                <span>Total Orders</span>
                <h2>{orders.length}</h2>
              </div>
              <div className="stat-card">
                <span>Total Sales</span>
                <h2>₹{totalSales.toLocaleString("en-IN")}</h2>
              </div>
              <div className="stat-card">
                <span>Pending Orders</span>
                <h2>
                  {orders.filter((order) => order.status === "Pending").length}
                </h2>
              </div>
            </div>

            <section className="panel">
              <h2>Recent Orders</h2>
              <OrdersTable
                orders={orders.slice(0, 5)}
                onStatusChange={updateStatus}
                onViewInvoice={viewInvoice}
              />
            </section>
          </>
        )}

        {page === "Products" && (
          <>
            <section className="panel">
              <h2>Add Product</h2>
              <form className="form-grid" onSubmit={addProduct}>
                <label>
                  Product Name
                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    required
                    placeholder="Enter product name"
                  />
                </label>

                <label>
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Stock
                  <input
                    type="number"
                    min="0"
                    value={productStock}
                    onChange={(event) => setProductStock(event.target.value)}
                    required
                  />
                </label>

                <button className="primary-btn" type="submit">
                  Add Product
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>All Products ({products.length})</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>#{product.id}</td>
                        <td>{product.name}</td>
                        <td>
                          ₹{Number(product.price || 0).toLocaleString("en-IN")}
                        </td>
                        <td>{product.stock}</td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => deleteProduct(product)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {products.length === 0 && (
                      <tr>
                        <td colSpan="5">No products found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === "Create Order" && (
          <section className="panel">
            <h2>Create New Order</h2>
            <form className="order-form" onSubmit={createOrder}>
              <label>
                Customer Name
                <input
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  required
                  placeholder="Enter customer name"
                />
              </label>

              <label>
                Select Product
                <select
                  value={selectedProduct}
                  onChange={(event) => setSelectedProduct(event.target.value)}
                  required
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — ₹{product.price} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>

              <button className="primary-btn" type="submit">
                Create Order
              </button>
            </form>
          </section>
        )}

        {page === "Orders" && (
          <section className="panel">
            <h2>All Orders</h2>
            <p>View orders, invoices and update their status.</p>
            <OrdersTable
              orders={orders}
              onStatusChange={updateStatus}
              onViewInvoice={viewInvoice}
            />
          </section>
        )}

        {page === "Invoice" && invoice && (
          <section className="panel invoice-panel">
            <div className="invoice-header">
              <div>
                <h2>Invoice #{invoice.order.id}</h2>
                <p>B2B Portal — Order Management</p>
              </div>
              <button className="primary-btn" onClick={printInvoice}>
                Print Invoice
              </button>
            </div>

            <div className="invoice-details">
              <p>
                <strong>Customer:</strong>{" "}
                {invoice.order.customer_name || invoice.order.customer || "—"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {invoice.order.created_at
                  ? new Date(invoice.order.created_at).toLocaleString()
                  : "—"}
              </p>
              <p>
                <strong>Status:</strong> {invoice.order.status || "Pending"}
              </p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>{item.product_name || item.name || "Product"}</td>
                      <td>{item.quantity || 0}</td>
                      <td>
                        ₹{Number(item.price || 0).toLocaleString("en-IN")}
                      </td>
                      <td>
                        ₹
                        {Number(
                          item.subtotal ??
                            Number(item.price || 0) * Number(item.quantity || 0)
                        ).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}

                  {invoice.items.length === 0 && (
                    <tr>
                      <td colSpan="4">No item details available for this order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 className="invoice-total">
              Total: ₹
              {Number(
                invoice.order.total_amount || invoice.total_amount || 0
              ).toLocaleString("en-IN")}
            </h2>

            <button className="secondary-btn" onClick={() => setPage("Orders")}>
              Back to Orders
            </button>
          </section>
        )}

        {loading && <p>Loading invoice...</p>}
      </main>
    </div>
  );
}

function OrdersTable({ orders, onStatusChange, onViewInvoice }) {
  const statuses = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Completed",
    "Cancelled",
  ];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Total Amount</th>
            <th>Created At</th>
            <th>Status</th>
            <th>Update Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.customer_name || order.customer || "—"}</td>
              <td>
                ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
              </td>
              <td>
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : "—"}
              </td>
              <td>
                <span
                  className={`status-badge ${String(
                    order.status || "Pending"
                  ).toLowerCase()}`}
                >
                  {order.status || "Pending"}
                </span>
              </td>
              <td>
                <select
                  value={order.status || "Pending"}
                  onChange={(event) =>
                    onStatusChange(order.id, event.target.value)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="primary-btn"
                  onClick={() => onViewInvoice(order)}
                >
                  View Invoice
                </button>
              </td>
            </tr>
          ))}

          {orders.length === 0 && (
            <tr>
              <td colSpan="7">No orders found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}