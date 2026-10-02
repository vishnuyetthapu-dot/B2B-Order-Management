import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------
  // Fetch products from backend
  // -----------------------------
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();

      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load products from backend.");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Add product to cart
  // -----------------------------
  function addToCart(product) {
    const existingProduct = cart.find(
      (item) => item.id === product.id
    );

    if (existingProduct) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
        },
      ]);
    }
  }

  // -----------------------------
  // Remove product from cart
  // -----------------------------
  function removeFromCart(productId) {
    setCart(
      cart.filter((item) => item.id !== productId)
    );
  }

  // -----------------------------
  // Change quantity
  // -----------------------------
  function changeQuantity(productId, change) {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity =
              item.quantity + change;

            return {
              ...item,
              quantity:
                newQuantity < 1
                  ? 1
                  : newQuantity,
            };
          }

          return item;
        })
    );
  }

  // -----------------------------
  // Cart total
  // -----------------------------
  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price) * item.quantity,
      0
    );
  }, [cart]);

  // -----------------------------
  // Cart item count
  // -----------------------------
  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );
  }, [cart]);

  // -----------------------------
  // Place order
  // -----------------------------
  function placeOrder() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const newOrder = {
      id: orders.length + 1,
      date: new Date().toLocaleDateString(),
      items: [...cart],
      total: cartTotal,
      status: "Placed",
    };

    const newInvoice = {
      id: invoices.length + 1,
      orderId: newOrder.id,
      date: newOrder.date,
      amount: cartTotal,
      status: "Generated",
    };

    setOrders([
      ...orders,
      newOrder,
    ]);

    setInvoices([
      ...invoices,
      newInvoice,
    ]);

    setCart([]);

    setActivePage("Orders");

    alert("Order placed successfully!");
  }

  // -----------------------------
  // Dashboard
  // -----------------------------
  function Dashboard() {
    const totalStock = products.reduce(
      (total, product) =>
        total + Number(product.stock || 0),
      0
    );

    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="B2B Order Management overview"
        />

        <div className="cards">
          <div className="card">
            <h3>Total Products</h3>
            <p>{products.length}</p>
          </div>

          <div className="card">
            <h3>Cart Items</h3>
            <p>{cartItemCount}</p>
          </div>

          <div className="card">
            <h3>Total Stock</h3>
            <p>{totalStock}</p>
          </div>

          <div className="card">
            <h3>Total Orders</h3>
            <p>{orders.length}</p>
          </div>
        </div>

        <div className="section">
          <h2>System Status</h2>

          <div className="status-box">
            <span className="status-dot"></span>
            Backend API connected
          </div>

          <p className="muted">
            Product data is being loaded from the
            Node.js backend API.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Products
  // -----------------------------
  function Products() {
    return (
      <div>
        <PageHeader
          title="Products"
          description="Browse available products and add them to cart"
        />

        {loading && (
          <div className="message">
            Loading products...
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (
            <div className="message">
              No products available.
            </div>
          )}

        {!loading &&
          !error &&
          products.length > 0 && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>

                      <td>
                        <strong>
                          {product.name}
                        </strong>
                      </td>

                      <td>
                        ₹
                        {Number(
                          product.price
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        <span
                          className={
                            Number(product.stock) > 0
                              ? "stock available"
                              : "stock out"
                          }
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td>
                        <button
                          className="primary-btn"
                          disabled={
                            Number(product.stock) <= 0
                          }
                          onClick={() =>
                            addToCart(product)
                          }
                        >
                          Add to Cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    );
  }

  // -----------------------------
  // Shopping Cart
  // -----------------------------
  function ShoppingCart() {
    return (
      <div>
        <PageHeader
          title="Shopping Cart"
          description="Review products before placing an order"
        />

        {cart.length === 0 ? (
          <div className="empty-box">
            <h3>Your cart is empty</h3>
            <p>
              Go to Products and add products
              to your cart.
            </p>

            <button
              className="primary-btn"
              onClick={() =>
                setActivePage("Products")
              }
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>

                      <td>
                        ₹
                        {Number(
                          item.price
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        <div className="quantity">
                          <button
                            onClick={() =>
                              changeQuantity(
                                item.id,
                                -1
                              )
                            }
                          >
                            -
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              changeQuantity(
                                item.id,
                                1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td>
                        ₹
                        {(
                          Number(item.price) *
                          item.quantity
                        ).toLocaleString("en-IN")}
                      </td>

                      <td>
                        <button
                          className="danger-btn"
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="total-box">
              <h2>
                Total: ₹
                {cartTotal.toLocaleString("en-IN")}
              </h2>

              <button
                className="primary-btn large"
                onClick={placeOrder}
              >
                Place Order
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // -----------------------------
  // Orders
  // -----------------------------
  function Orders() {
    return (
      <div>
        <PageHeader
          title="Orders"
          description="View placed customer orders"
        />

        {orders.length === 0 ? (
          <div className="empty-box">
            <h3>No orders yet</h3>
            <p>
              Orders will appear here after
              checkout.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>

                    <td>{order.date}</td>

                    <td>
                      {order.items.length}
                    </td>

                    <td>
                      ₹
                      {order.total.toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      <span className="badge success">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------
  // Invoices
  // -----------------------------
  function Invoices() {
    return (
      <div>
        <PageHeader
          title="Invoices"
          description="Generated invoices for orders"
        />

        {invoices.length === 0 ? (
          <div className="empty-box">
            <h3>No invoices available</h3>
            <p>
              An invoice will be generated when
              an order is placed.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      INV-{invoice.id}
                    </td>

                    <td>
                      #{invoice.orderId}
                    </td>

                    <td>
                      {invoice.date}
                    </td>

                    <td>
                      ₹
                      {invoice.amount.toLocaleString(
                        "en-IN"
                      )}
                    </td>

                    <td>
                      <span className="badge success">
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------
  // Stock Status
  // -----------------------------
  function StockStatus() {
    return (
      <div>
        <PageHeader
          title="Stock Status"
          description="Current inventory status"
        />

        <div className="stock-grid">
          {products.map((product) => {
            const stock =
              Number(product.stock) || 0;

            let status = "In Stock";

            if (stock === 0) {
              status = "Out of Stock";
            } else if (stock < 10) {
              status = "Low Stock";
            }

            return (
              <div
                className="stock-card"
                key={product.id}
              >
                <h3>{product.name}</h3>

                <p>
                  Available Units:
                  <strong>
                    {" "}
                    {stock}
                  </strong>
                </p>

                <span
                  className={
                    stock === 0
                      ? "badge danger"
                      : stock < 10
                      ? "badge warning"
                      : "badge success"
                  }
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -----------------------------
  // Admin Controls
  // -----------------------------
  function AdminControls() {
    return (
      <div>
        <PageHeader
          title="Admin Controls"
          description="Administrative controls for the platform"
        />

        <div className="admin-grid">
          <div className="admin-card">
            <h3>User Management</h3>
            <p>
              Manage administrators and
              customer access.
            </p>

            <button className="secondary-btn">
              Manage Users
            </button>
          </div>

          <div className="admin-card">
            <h3>Product Management</h3>
            <p>
              View and manage products and
              inventory.
            </p>

            <button
              className="secondary-btn"
              onClick={() =>
                setActivePage("Products")
              }
            >
              Manage Products
            </button>
          </div>

          <div className="admin-card">
            <h3>Order Management</h3>
            <p>
              Review customer orders and
              order status.
            </p>

            <button
              className="secondary-btn"
              onClick={() =>
                setActivePage("Orders")
              }
            >
              View Orders
            </button>
          </div>

          <div className="admin-card">
            <h3>System Information</h3>
            <p>
              Backend: Node.js
            </p>
            <p>
              Database: PostgreSQL
            </p>
            <p>
              Frontend: React
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Page Header
  // -----------------------------
  function PageHeader({
    title,
    description,
  }) {
    return (
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="user-info">
          <span>Admin</span>

          <button
            className="logout-btn"
            onClick={() =>
              alert("Logout functionality")
            }
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------
  // Page Renderer
  // -----------------------------
  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return <Dashboard />;

      case "Products":
        return <Products />;

      case "Shopping Cart":
        return <ShoppingCart />;

      case "Orders":
        return <Orders />;

      case "Invoices":
        return <Invoices />;

      case "Stock Status":
        return <StockStatus />;

      case "Admin Controls":
        return <AdminControls />;

      default:
        return <Dashboard />;
    }
  }

  // -----------------------------
  // Main UI
  // -----------------------------
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <h2>B2B Order</h2>
          <h2>Management</h2>
        </div>

        <nav>
          <button
            className={
              activePage === "Dashboard"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              activePage === "Products"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Products")
            }
          >
            Products
          </button>

          <button
            className={
              activePage === "Shopping Cart"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Shopping Cart")
            }
          >
            Shopping Cart
            {cartItemCount > 0 && (
              <span className="nav-count">
                {cartItemCount}
              </span>
            )}
          </button>

          <button
            className={
              activePage === "Orders"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Orders")
            }
          >
            Orders
          </button>

          <button
            className={
              activePage === "Invoices"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Invoices")
            }
          >
            Invoices
          </button>

          <button
            className={
              activePage === "Stock Status"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Stock Status")
            }
          >
            Stock Status
          </button>

          <button
            className={
              activePage === "Admin Controls"
                ? "nav-btn active"
                : "nav-btn"
            }
            onClick={() =>
              setActivePage("Admin Controls")
            }
          >
            Admin Controls
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>B2B Order Management</p>
          <small>Full Stack Project</small>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;