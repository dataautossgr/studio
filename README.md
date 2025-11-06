# Data Autos POS & Inventory Management System

This is a comprehensive, hybrid (offline-first) Point-of-Sale (POS) and inventory management application built with Next.js, Firebase, and Electron. It's specifically tailored for automotive and battery shops, providing a robust solution to manage sales, purchases, customers, dealers, inventory, and detailed financial tracking.

---

## ✨ Core Features

The application is packed with features designed to streamline daily business operations:

### 1. 📈 Dashboard
- **At-a-Glance Overview:** Provides a quick summary of the day's performance.
- **Key Metrics:** Displays Today's Revenue, Net Cash In, Net Online Payments, Low Stock Alerts, and Pending Dues from customers.
- **Quick Actions:** Buttons for creating new sales, purchases, and temporary bills.
- **Master Search:** A powerful search bar (`Ctrl+K` or `Cmd+K`) to instantly find any product, customer, or dealer.

### 2. 📦 Inventory Management
- **Dual Inventory System:** Separate management for **Automotive Parts** and **Battery/Acid/Scrap** stock.
- **Detailed Product/Battery Information:** Add items with cost price, sale price, stock quantity, brand, model, low-stock thresholds, and images.
- **Scrap & Acid Management:** Track scrap battery weight/value and acid stock in KGs. Record purchases, sales, and internal consumption.

### 3. 🧾 Sales & Invoicing
- **Dual Sales Forms:** Dedicated forms for creating **Automotive Sales** and **Battery Sales**.
- **Flexible Item Addition:** Add products from inventory, one-time items, charging services, or scrap trade-ins to a single bill.
- **Integrated Payments:** Record payments as `Paid`, `Unpaid`, or `Partial`. For paid transactions, specify `Cash` or `Online` (linked to your bank accounts).
- **Professional Invoicing:** Generate and print professional A4/A5/POS-sized invoices for every sale. Send invoice summaries via WhatsApp.

### 4. 🛒 Purchase Management
- **Track Purchases:** Record all stock purchases from your dealers.
- **Dual Purchase Forms:** Separate, tailored forms for **Automotive** and **Battery** purchases.
- **Supplier Linking:** Link each purchase to a specific dealer to manage accounts payable.
- **Payment Recording:** Mark purchases as paid or unpaid to automatically update dealer balances.

### 5. 👥 Customer & Dealer Management (CRM)
- **Centralized Database:** Manage all your customers and dealers, categorized by type (Automotive/Battery).
- **Detailed Ledgers:** Every customer and dealer has a complete transaction ledger, showing all sales/purchases and payments made.
- **Balance Tracking:** Automatically calculates and displays the outstanding balance for each entity. You always know who owes you and whom you owe.
- **Direct Payment Entry:** Add payments directly to a customer or dealer's ledger.

### 6. 💰 Financial Management
- **Cash Flow:** A dedicated daily cash session manager. Start the day with opening cash, see live cash-in/cash-out, and finalize the report at day's end with a physical cash count.
- **Bank Accounts:** Add and manage your own bank accounts/wallets (e.g., Meezan Bank, Easypaisa). Balances are **automatically updated** when you record online sales or payments.
- **Manual Transactions:** Manually record transfers between your bank accounts or cash withdrawals/deposits.
- **Expense Tracking:** Record all business expenses (salaries, rent, utilities) with category, payment method, and optional receipt attachments.

### 7. 🔧 Specialized Modules
- **Temporary Bills (Repair Jobs):** Create temporary bills for ongoing repair jobs. Add products over time and finalize the bill into a formal sale once the job is complete.
- **Warranty Claims:** A dedicated module to process battery warranty claims against an original invoice. It automatically calculates price differences, manages stock for the replacement battery, and creates a new mini-sale for any extra charges.

### 8. 📊 Reporting
- **Sales & Profit Reports:** View detailed reports on total revenue, profit, and top-selling products.
- **Filtered Views:** Filter reports by time period (Today, This Week, This Month, All Time) and business type (Automotive/Battery).

### 9. ⚙️ Settings & Data Management
- **Store Customization:** Update your store name, logo, address, and contact details, which automatically reflect on invoices.
- **Data Backup & Restore:** Create a full JSON backup of your entire database.
- **Offline-First:** The app works seamlessly offline. All data is saved locally and syncs to the cloud automatically when an internet connection is available.

---

## 📂 Project Structure (Folder Management)

The project is organized using the Next.js App Router for clear and scalable code.

```
.
├── /electron/                # Electron-specific files (main.js, preload.js)
├── /src/
│   ├── /app/                 # Main application routes and pages
│   │   ├── / (dashboard)
│   │   ├── /sales/           # Sales history and new sale forms
│   │   ├── /purchase/        # Purchase history and new purchase forms
│   │   ├── /inventory/       # Inventory management pages
│   │   ├── /customers/       # Customer list and ledger details
│   │   ├── /dealers/         # Dealer list and ledger details
│   │   ├── /expenses/        # Expense management page
│   │   ├── /cash-flow/       # Daily cash session management
│   │   ├── /my-banks/        # Bank account management
│   │   ├── /repair-jobs/     # Temporary bills management
│   │   ├── /batteries/       # All battery-specific modules (sales, claims, etc.)
│   │   ├── /reports/         # Business reports page
│   │   └── /settings/        # Application settings page
│   │
│   ├── /components/          # Reusable UI components
│   │   ├── /ui/              # Core ShadCN UI components (Button, Card, etc.)
│   │   └──  *.tsx            # Custom components (Header, Sidebar, Dialogs)
│   │
│   ├── /context/             # React Context providers (e.g., StoreSettings)
│   │
│   ├── /firebase/            # Firebase configuration and custom hooks
│   │   ├── config.ts         # Firebase project configuration keys
│   │   ├── index.ts          # Main Firebase initialization
│   │   ├── provider.tsx      # Core Firebase context provider
│   │   └── /firestore/       # Custom hooks like useCollection and useDoc
│   │
│   ├── /hooks/               # Custom React hooks (e.g., use-toast)
│   │
│   └── /lib/                 # Core logic, utilities, and data models
│       ├── data.ts           # TypeScript interfaces for all data models (Product, Sale, etc.)
│       └── utils.ts          # Utility functions (e.g., cn for Tailwind)
│
├── /docs/                    # Documentation
│   └── backend.json          # Defines the schema for all Firestore entities
│
├── firestore.rules           # Firestore security rules (currently allows all authenticated access)
└── tailwind.config.ts        # Tailwind CSS and theme configuration
```
