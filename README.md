# ☀️ MRS SOLAR - Solar Panel Loan Management System

Build a modern, responsive, and secure full-stack web application for **MRS SOLAR**, a solar panel installation company providing EMI-based financing for customers.

---

## 🌟 Key Features

### 👤 Customer Portal
- **Interactive Loan Dashboard**: Displays total project cost, down payment, remaining balance, and active EMI amortization schedule.
- **Dynamic Late Fee Automation**: Displays real-time late penalties (1% per day on overdue installments).
- **1-Click Mobile UPI Payment**: Generates instant QR code & direct deep-link buttons (`Pay via GPay / PhonePe / Paytm`) with auto-filled payee details (`rsanthoshkumar376@oksbi`) and exact due amounts.
- **Payment Receipts**: View and print official payment receipts with QR verification.

### 🛡️ Owner / Admin Portal
- **Financial Statistics & Analytics**: Live tracking of total customers, loan disbursement, total collections, and profit metrics with monthly collection charts.
- **Customer Management**: Register new solar financing contracts, upload KYC documents (Aadhaar, PAN, Electricity Bill, etc.), edit contract parameters, or search/filter customer ledgers.
- **Repayment Queue & Manual Payment Marking**: Track all pending/overdue dues and manually mark EMI installments as paid upon bank verification.
- **Audit Logs & Security**: Detailed logging of all admin actions and transactions.
- **Database Backup & Recovery**: Native JSON-file database engine with atomic file-locking queue, point-in-time restore, and one-click `.MDB` database export download.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite), Tailwind CSS, Lucide Icons, Axios, React Router v6
- **Backend**: Node.js, Express.js, Custom JSON/BSON Database Engine, bcryptjs, jsonwebtoken (JWT), node-cron
- **Deployment / Scripts**: Batch launcher (`start_website.bat`), PowerShell archive exporters

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v16+)
- npm

### Installation & Launching

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mrs-solar.git
   cd mrs-solar
   ```

2. **Install dependencies**:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Run the Application**:
   - **Windows (Single Click)**: Double-click `start_website.bat` in the root folder.
   - **Manual Terminal Startup**:
     - Backend: `cd backend && node server.js` (runs on http://localhost:5000)
     - Frontend: `cd frontend && npm run dev` (runs on http://localhost:5173)

---

## 🔐 Default Access Credentials

| Portal | Login ID / Username | Password |
|---|---|---|
| **Owner / Admin** | `MRSassociates` | `2332` |
| **Customer** | `SOL-1001` | Customer's Registered Mobile Number (e.g. `8072454996`) |

---

## 📁 Repository Structure

```
mrs-solar/
├── backend/
│   ├── data/             # Database storage & uploads
│   ├── database/         # Custom JSON DB engine
│   ├── middleware/       # JWT auth & role guards
│   ├── routes/           # Auth, Admin, & Customer REST APIs
│   ├── utils/            # Calculations, scheduler, logger
│   └── server.js         # Main Express backend server
├── frontend/
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # Layout, Sidebar, Nav, ProtectedRoute
│   │   ├── context/      # AuthContext
│   │   ├── pages/        # Admin & Customer pages
│   │   ├── utils/        # API client & formatting helpers
│   │   ├── App.jsx       # Main router setup
│   │   └── main.jsx      # Entry point
│   └── vite.config.js
├── start_website.bat     # 1-Click desktop launcher
└── README.md
```
