# **App Name**: Data Autos POS System

## Core Features:

- Inventory Management: Add, edit, and delete automotive items with details such as name, brand, model, cost price, sale price, stock quantity, image, and low-stock alerts.
- POS and Billing: Quick product search, add items to cart, apply discounts, generate bills, and create automatic invoice numbers.
- Sales and Receipts: Store sales records, customer type (walk-in/registered), payment mode (Paid/Unpaid), and manage returns and exchanges.
- Counter Cash System: Track daily opening and closing cash with automatic cash in/out calculation, showing start cash, sales, expenses, closing balance, and variance.
- Report Generation: Generate filterable daily/monthly reports for sales, purchases, ledgers, profit/loss, and cash sessions, presented in both Urdu and English.
- Data Synchronization: Automatically synchronize SQLite data with Firebase Firestore when internet is available, ensuring data backup and accessibility across devices. Tool utilizes a timestamping strategy to resolve any conflicts.
- Data Backup and Restore: Create daily ZIP backups of the local database and automatically upload them to Firebase Storage for secure data recovery.

## Style Guidelines:

- Primary color: Deep teal (#008080) to evoke trust, stability, and a modern digital aesthetic.
- Background color: Light teal (#E0F8F8) for a soft and clean user interface.
- Accent color: Soft orange (#FFB347) for interactive elements to draw attention without being jarring.
- Body and headline font: 'PT Sans' for a modern and readable interface.
- Use clean, outline-style icons for easy recognition and a modern look.
- Responsive and clean layout for optimal viewing on different screen sizes; use of cards to present information in a clear and organized manner.
- Subtle transition animations to provide a smooth and engaging user experience.