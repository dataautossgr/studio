'use client';
import data from "./placeholder-images.json";
import type { DocumentReference } from "firebase/firestore";

export type Unit = 'piece' | 'cartoon' | 'ml' | 'litre' | 'kg' | 'g' | 'inch' | 'foot' | 'meter';


export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  model: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  unit: Unit;
  lowStockThreshold: number;
  imageUrl: string;
  imageHint: string;
  dealerId?: string;
  location?: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    vehicleDetails: string;
    balance: number;
    type: 'automotive' | 'battery';
    address?: string;
    paymentDueDate?: string; // Optional due date for pending balance
}

export interface Sale {
    id: string;
    invoice: string;
    customer: DocumentReference;
    date: string;
    total: number;
    status: 'Paid' | 'Unpaid' | 'Partial';
    items: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    discount?: number;
    paymentMethod?: 'cash' | 'online';
    onlinePaymentSource?: string;
    partialAmountPaid?: number;
    dueDate?: string; // Optional due date for this specific sale
}

export interface Payment {
  id: string;
  customer: DocumentReference;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  notes?: string;
  receiptImageUrl?: string;
  reference?: string;
}


export interface Dealer {
    id: string;
    name: string;
    company: string;
    phone: string;
    address?: string;
    balance: number;
    type: 'automotive' | 'battery';
    paymentDueDate?: string; // Optional due date for pending balance
}

export interface Purchase {
    id: string;
    dealer: DocumentReference;
    invoiceNumber: string;
    date: string;
    total: number;
    status: 'Paid' | 'Unpaid' | 'Partial';
    receiptImageUrl?: string;
    items: {
        productId: string;
        name: string;
        quantity: number;
        costPrice: number;
    }[];
    dueDate?: string; // Optional due date for this specific purchase
}

export interface RepairJob {
  id: string;
  jobId: string;
  customer: DocumentReference;
  vehicleInfo: string;
  mechanic?: string;
  status: 'In Progress' | 'Paused' | 'Completed' | 'Cancelled';
  createdAt: string;
  closedAt?: string;
  total: number;
  items: RepairJobItem[];
}

export interface RepairJobItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Battery {
  id: string;
  brand: string;
  model: string;
  ampere: number;
  type: 'Lead-Acid' | 'Lithium' | 'AGM';
  costPrice: number;
  salePrice: number;
  stock: number;
  warrantyMonths: number;
  lowStockThreshold: number;
}

export interface ScrapStock {
  id: string; // Should be a singleton document, e.g., 'main'
  totalWeightKg: number;
  totalScrapValue: number;
}

export interface BatterySale {
  id: string;
  invoice: string;
  customer: DocumentReference;
  date: string;
  total: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  items: {
      id: string;
      name: string;
      quantity: number;
      price: number;
      costPrice: number;
      stock: number;
      isOneTime: boolean;
      type: 'battery' | 'service' | 'scrap' | 'acid' | 'one-time';
      warrantyMonths?: number;
      manufacturingCode?: string;
  }[];
  discount?: number;
  paymentMethod?: 'cash' | 'online';
  onlinePaymentSource?: string;
  partialAmountPaid?: number;
  dueDate?: string;
}


export interface BatteryPurchase {
  id: string;
  dealerId: string;
  date: string;
  items: {
    batteryId: string;
    quantity: number;
    costPrice: number;
  }[];
  totalAmount: number;
}


export interface ScrapPurchase {
    id: string;
    date: string;
    sellerName?: string;
    sellerAddress?: string;
    sellerNIC?: string;
    weightKg: number;
    ratePerKg: number;
    totalValue: number;
    paymentMethod?: 'Cash' | 'Bank';
}

export interface ScrapSale {
    id: string;
    date: string;
    buyerName: string;
    weightKg: number;
    ratePerKg: number;
    totalValue: number;
}


export interface AcidStock {
  id: string; // Singleton document ID, e.g., 'main'
  totalQuantityKg: number;
  totalValue: number;
  lowStockThreshold: number;
}

export interface AcidPurchase {
  id: string;
  date: string;
  quantityKg: number;
  ratePerKg: number;
  totalValue: number;
  supplier?: string;
}

export interface AcidConsumption {
  id: string;
  date: string;
  quantityKg: number;
  notes?: string;
}



const productData: Omit<Product, 'imageUrl' | 'imageHint' | 'id'>[] = [
  { name: 'Spark Plugs (4-pack)', category: 'Engine Parts', brand: 'NGK', model: 'BKR6E-11', costPrice: 800, salePrice: 1200, stock: 50, unit: 'piece', lowStockThreshold: 10, dealerId: 'DLR001', location: 'Shelf A-1' },
  { name: 'Oil Filter', category: 'Filters', brand: 'Guard', model: 'GDO-118', costPrice: 350, salePrice: 500, stock: 8, unit: 'piece', lowStockThreshold: 20, dealerId: 'DLR002', location: 'Shelf B-3' },
  { name: 'Front Brake Pads', category: 'Brakes', brand: 'Toyota Genuine', model: '04465-YZZR3', costPrice: 4500, salePrice: 6000, stock: 30, unit: 'piece', lowStockThreshold: 5, dealerId: 'DLR001', location: 'Shelf C-2' },
  { name: 'AGS Battery', category: 'Batteries', brand: 'AGS', model: 'GL-48', costPrice: 7000, salePrice: 8500, stock: 15, unit: 'piece', lowStockThreshold: 3, dealerId: 'DLR003', location: 'Floor Area' },
  { name: 'Air Filter', category: 'Filters', brand: 'Leppon', model: 'LA-261', costPrice: 400, salePrice: 650, stock: 80, unit: 'piece', lowStockThreshold: 15, dealerId: 'DLR002', location: 'Shelf B-4' },
  { name: 'Timing Belt', category: 'Engine Parts', brand: 'Gates', model: 'T145', costPrice: 2200, salePrice: 3000, stock: 4, unit: 'piece', lowStockThreshold: 5, dealerId: 'DLR001', location: 'Shelf A-2' },
  { name: 'Radiator Coolant (1L)', category: 'Fluids', brand: 'ZIC', model: 'Super A', costPrice: 600, salePrice: 800, stock: 100, unit: 'litre', lowStockThreshold: 25, location: 'Shelf D-1' },
  { name: 'Headlight Bulb', category: 'Lighting', brand: 'Philips', model: 'H4', costPrice: 250, salePrice: 400, stock: 200, unit: 'piece', lowStockThreshold: 50, location: 'Shelf E-1' },
  { name: 'Wiper Blades (Pair)', category: 'Exterior', brand: 'Bosch', model: 'Clear Advantage', costPrice: 1000, salePrice: 1500, stock: 9, unit: 'piece', lowStockThreshold: 10, dealerId: 'DLR003', location: 'Hanging Rack 1' },
  { name: 'Synthetic Engine Oil (4L)', category: 'Fluids', brand: 'Shell', model: 'Helix Ultra 5W-40', costPrice: 4800, salePrice: 5500, stock: 35, unit: 'litre', lowStockThreshold: 10, dealerId: 'DLR002', location: 'Shelf D-2' },
];

const mockDealers: Omit<Dealer, 'balance'>[] = [
    { id: 'DLR001', name: 'Imran Qureshi', company: 'Qureshi Auto Parts', phone: '0300-1234567', address: 'Montgomery Road, Lahore', type: 'automotive' },
    { id: 'DLR002', name: 'Nadeem Butt', company: 'Nadeem & Sons Trading', phone: '0321-7654321', address: 'Badami Bagh, Lahore', type: 'automotive' },
    { id: 'DLR003', name: 'Khalid Butt', company: 'Butt Auto Store', phone: '0333-1122334', address: 'Mcleod Road, Lahore', type: 'automotive' },
    { id: 'DLR004', name: 'Volta Batteries', company: 'Volta International', phone: '0345-1231234', address: 'Multan Road, Lahore', type: 'battery' },
];

const mockProducts: Product[] = productData.map((p, index) => {
    const placeholder = data.placeholderImages[index % data.placeholderImages.length];
    return {
        id: `PROD${1001 + index}`,
        ...p,
        imageUrl: placeholder.imageUrl,
        imageHint: placeholder.imageHint,
    }
});

const mockCustomers: Omit<Customer, 'balance'>[] = [
    { id: 'CUST001', name: 'Ali Khan', phone: '0301-1112233', vehicleDetails: 'Toyota Corolla 2022', type: 'automotive', address: 'DHA Phase 5, Lahore' },
    { id: 'CUST002', name: 'Usman Autos', phone: '0322-4455667', vehicleDetails: 'Suzuki Mehran 2018', type: 'automotive' },
    { id: 'CUST003', name: 'Zahid Pervaiz', phone: '0345-9988776', vehicleDetails: 'Honda Civic 2021', type: 'automotive' },
    { id: 'CUST004', name: 'Rizwan Tariq', phone: '0311-9876543', vehicleDetails: 'UPS Rickshaw', type: 'battery' },
];


export const seedInitialData = async (db: any) => {
    const { collection, addDoc, doc, setDoc, writeBatch } = await import('firebase/firestore');

    console.log("Seeding initial data...");

    const batch = writeBatch(db);

    // Seed Products
    const productsCollection = collection(db, 'products');
    for (const product of mockProducts) {
        batch.set(doc(productsCollection, product.id), product);
    }
    console.log("Products queued for seeding.");

    // Seed Dealers
    const dealersCollection = collection(db, 'dealers');
    for (const dealer of mockDealers) {
        batch.set(doc(dealersCollection, dealer.id), { ...dealer, balance: 0, paymentDueDate: '2024-07-25' }); // Added due date
    }
    console.log("Dealers queued for seeding.");

    // Seed Customers
    const customersCollection = collection(db, 'customers');
     for (const customer of mockCustomers) {
        batch.set(doc(customersCollection, customer.id), { ...customer, balance: 0 });
    }
    console.log("Customers queued for seeding.");
    
    // Commit initial batch
    await batch.commit();
    console.log("Products, Dealers, and Customers seeded.");
    
    // Now seed sales and purchases, which depend on the above
    const salesBatch = writeBatch(db);
    const salesCollection = collection(db, 'sales');
    const mockSales = [
        {
            id: 'SALE001', invoice: 'INV-2024-001', customerId: 'CUST001', date: '2024-07-20T10:30:00Z', total: 1700, status: 'Paid' as const, discount: 0,
            items: [ { productId: 'PROD1001', name: 'Spark Plugs (4-pack)', quantity: 1, price: 1200 }, { productId: 'PROD1002', name: 'Oil Filter', quantity: 1, price: 500 } ],
            paymentMethod: 'cash' as const
        },
        {
            id: 'SALE002', invoice: 'INV-2024-002', customerId: 'CUST001', date: '2024-07-20T11:45:00Z', total: 6000, status: 'Paid' as const, discount: 0,
            items: [ { productId: 'PROD1003', name: 'Front Brake Pads', quantity: 1, price: 6000 } ],
            paymentMethod: 'online' as const, onlinePaymentSource: 'Easypaisa'
        },
        {
            id: 'SALE003', invoice: 'INV-2024-003', customerId: 'CUST001', date: '2024-07-21T09:15:00Z', total: 1450, status: 'Unpaid' as const, discount: 150, dueDate: '2024-07-28',
            items: [ { productId: 'PROD1005', name: 'Air Filter', quantity: 1, price: 650 }, { productId: 'PROD1008', name: 'Headlight Bulb', quantity: 2, price: 400 } ],
        },
         {
            id: 'SALE004', invoice: 'INV-2024-004', customerId: 'CUST002', date: '2024-07-22T14:00:00Z', total: 5500, status: 'Partial' as const, partialAmountPaid: 3000, discount: 0, dueDate: new Date().toISOString().split('T')[0], // Due today
            items: [ { productId: 'PROD1010', name: 'Synthetic Engine Oil (4L)', quantity: 1, price: 5500 } ],
        }
    ];

    for (const sale of mockSales) {
       const { id, customerId, ...saleData } = sale;
       const saleToStore = {
           ...saleData,
           customer: doc(db, 'customers', customerId)
       }
       salesBatch.set(doc(salesCollection, id), saleToStore);

       // Update customer balance for unpaid/partial
       if (sale.status === 'Unpaid' || sale.status === 'Partial') {
         const balance_change = sale.status === 'Unpaid' ? sale.total : sale.total - (sale.partialAmountPaid || 0);
         salesBatch.update(doc(db, 'customers', customerId), { balance: balance_change, paymentDueDate: sale.dueDate });
       }
    }
    await salesBatch.commit();
    console.log("Seeded sales and updated customer balances.");

    const purchasesBatch = writeBatch(db);
    const purchasesCollection = collection(db, 'purchases');
    const mockPurchases = [
        {
            id: 'PUR001', dealerId: 'DLR001', invoiceNumber: 'QN-5829', date: '2024-07-18T14:00:00Z', total: 24000, status: 'Paid' as const,
            items: [ { productId: 'PROD1001', name: 'Spark Plugs (4-pack)', quantity: 30, costPrice: 800 } ],
        },
        {
            id: 'PUR002', dealerId: 'DLR002', invoiceNumber: 'NS-9812', date: '2024-07-19T16:30:00Z', total: 105000, status: 'Partial' as const,
            items: [ { productId: 'PROD1004', name: 'AGS Battery', quantity: 15, costPrice: 7000 } ],
        },
        {
            id: 'PUR003', dealerId: 'DLR003', invoiceNumber: 'BT-0123', date: '2024-07-22T11:00:00Z', total: 8000, status: 'Unpaid' as const, dueDate: '2024-07-26',
            items: [ { productId: 'PROD1005', name: 'Air Filter', quantity: 20, costPrice: 400 } ],
        }
    ];

    for (const purchase of mockPurchases) {
         const {id, dealerId, ...purchaseData} = purchase;
         const purchaseToStore = {
           ...purchaseData,
           dealer: doc(db, 'dealers', dealerId)
         }
        purchasesBatch.set(doc(purchasesCollection, id), purchaseToStore);

        if (purchase.status === 'Unpaid' || purchase.status === 'Partial') {
          purchasesBatch.update(doc(db, 'dealers', dealerId), { balance: purchase.total, paymentDueDate: purchase.dueDate });
        }
    }
    await purchasesBatch.commit();
    console.log("Seeded purchases and updated dealer balances.");
    
    console.log("Data seeding complete.");
};

    