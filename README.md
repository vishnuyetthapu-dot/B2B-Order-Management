B2B Order Management Platform

Project Overview

The B2B Order Management Platform is a full-stack web application designed to manage products, inventory, and customer orders for a simulated distributor. It provides a simple dashboard to track products, create orders, and manage order status.

Technology Stack

- Frontend: React.js, CSS
- Backend: Node.js, Express.js
- Database: PostgreSQL
- API: REST API
- Development Tools: Visual Studio Code, Git, GitHub

Features Implemented

- View product listings and product details
- Add and manage products
- Store product and order data in PostgreSQL
- Shopping cart interface
- Create customer orders with quantity validation
- Update order status
- Manage inventory stock
- View order details and invoices
- Print invoices
- Dashboard with product, order, and sales information

Project Structure

- "frontend/" — React frontend application
- "backend/" — Node.js server and API logic
- "docs/" — Project requirements and documentation
- "package.json" — Project configuration

Setup Instructions

Prerequisites

- Node.js and npm
- PostgreSQL
- Git

Installation

1. Clone the repository:
   
   git clone https://github.com/vishnuyettapu-dot/B2B-Order-Management.git

2. Open the project folder:
   
   cd B2B-Order-Management

3. Configure your PostgreSQL database and backend environment variables in the backend ".env" file.

4. Install the backend dependencies:
   
   cd backend
npm install

5. Start the backend server using the start command configured in "backend/package.json".

6. Open another terminal and navigate to the frontend folder:
   
   cd frontend
npm install
npm run dev

7. Open the local frontend URL shown in the terminal.

Project Status

The core product management, order creation, order status update, invoice viewing, and invoice printing features have been implemented and tested locally. Further improvements and testing may be added.

Author

Yettapu Vishnu Govardhan Reddy