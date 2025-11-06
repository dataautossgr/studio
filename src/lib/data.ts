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
    onlinePaymentSource?: string; // Can be bank ID or name
    partialAmountPaid?: number;
    dueDate?: string; // Optional due date for this specific sale
}

export interface Payment {
  id: string;
  customer: DocumentReference;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Online' | 'Cheque';
  onlinePaymentSource?: string; // Can be bank ID or name
  notes?: string;
  receiptImageUrl?: string;
  reference?: string;
}

export interface DealerPayment {
  id: string;
  dealer: DocumentReference;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Online' | 'Cheque';
  onlinePaymentSource?: string; // This will store the BankAccount ID
  paymentDestinationDetails?: {
      accountTitle?: string;
      bankName?: string;
      accountNumber?: string;
  };
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
    dueDate?: string;
    paymentMethod?: 'Cash' | 'Online';
    paymentSourceAccount?: string; // This will store the BankAccount ID
    paymentDestinationDetails?: {
      accountTitle: string;
      bankName: string;
      accountNumber?: string;
    };
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

export interface BankTransaction {
  id: string;
  accountId: string; // Reference to the BankAccount
  date: string;
  description: string;
  type: 'Credit' | 'Debit';
  amount: number;
  balanceAfter: number;
  referenceId?: string; // Optional reference to a Sale, Purchase, etc.
  referenceType?: 'Sale' | 'Purchase' | 'Customer Payment' | 'Dealer Payment' | 'Manual';
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

export interface SaleItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    costPrice: number;
    stock: number;
    isOneTime: boolean;
    type: 'battery' | 'service' | 'scrap' | 'acid' | 'one-time';
    warrantyMonths?: number;
    manufacturingCode?: string;
}

export interface BatterySale {
  id: string;
  invoice: string;
  customer: DocumentReference;
  date: string;
  total: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  items: SaleItem[];
  discount?: number;
  paymentMethod?: 'cash' | 'online';
  onlinePaymentSource?: string; // Can be bank ID or name
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
  paymentMethod?: 'Cash' | 'Online';
  paymentSourceAccount?: string; // This will store the BankAccount ID
  paymentDestinationDetails?: {
    accountTitle: string;
    bankName: string;
    accountNumber?: string;
  };
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

export interface BatteryClaim {
    id: string;
    originalSaleId: string;
    customerId: string;
    claimedBatteryId: string; // Original battery ID
    replacementBatteryId: string; // New battery ID
    claimDate: string;
    originalBatteryPrice: number;
    replacementBatteryPrice: number;
    priceDifference: number;
    serviceCharges: number;
    totalPayable: number;
    isPaid: boolean;
    notes?: string;
}

export interface BankAccount {
  id: string;
  accountTitle: string;
  bankName: string;
  accountNumber?: string;
  balance: number;
}
