import { placeholderImages } from "./placeholder-images.json";

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
}

export interface Sale {
    id: string;
    invoice: string;
    customer: {
        name: string;
        type: 'walk-in' | 'registered';
    };
    date: string;
    total: number;
    status: 'Paid' | 'Unpaid' | 'Partial';
    items: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    paymentMethod?: 'cash' | 'online';
    onlinePaymentSource?: string;
}

export interface Dealer {
    id: string;
    name: string;
    company: string;
    phone: string;
}

export interface Purchase {
    id: string;
    dealer: Dealer;
    invoiceNumber: string;
    date: string;
    total: number;
    status: 'Paid' | 'Unpaid' | 'Partial';
    items: {
        productId: string;
        name: string;
        quantity: number;
        costPrice: number;
    }[];
}

const productData: Omit<Product, 'imageUrl' | 'imageHint' | 'id'>[] = [
  { name: 'Spark Plugs (4-pack)', category: 'Engine Parts', brand: 'NGK', model: 'BKR6E-11', costPrice: 800, salePrice: 1200, stock: 50, unit: 'piece', lowStockThreshold: 10 },
  { name: 'Oil Filter', category: 'Filters', brand: 'Guard', model: 'GDO-118', costPrice: 350, salePrice: 500, stock: 8, unit: 'piece', lowStockThreshold: 20 },
  { name: 'Front Brake Pads', category: 'Brakes', brand: 'Toyota Genuine', model: '04465-YZZR3', costPrice: 4500, salePrice: 6000, stock: 30, unit: 'piece', lowStockThreshold: 5 },
  { name: 'AGS Battery', category: 'Batteries', brand: 'AGS', model: 'GL-48', costPrice: 7000, salePrice: 8500, stock: 15, unit: 'piece', lowStockThreshold: 3 },
  { name: 'Air Filter', category: 'Filters', brand: 'Leppon', model: 'LA-261', costPrice: 400, salePrice: 650, stock: 80, unit: 'piece', lowStockThreshold: 15 },
  { name: 'Timing Belt', category: 'Engine Parts', brand: 'Gates', model: 'T145', costPrice: 2200, salePrice: 3000, stock: 4, unit: 'piece', lowStockThreshold: 5 },
  { name: 'Radiator Coolant (1L)', category: 'Fluids', brand: 'ZIC', model: 'Super A', costPrice: 600, salePrice: 800, stock: 100, unit: 'litre', lowStockThreshold: 25 },
  { name: 'Headlight Bulb', category: 'Lighting', brand: 'Philips', model: 'H4', costPrice: 250, salePrice: 400, stock: 200, unit: 'piece', lowStockThreshold: 50 },
  { name: 'Wiper Blades (Pair)', category: 'Exterior', brand: 'Bosch', model: 'Clear Advantage', costPrice: 1000, salePrice: 1500, stock: 9, unit: 'piece', lowStockThreshold: 10 },
  { name: 'Synthetic Engine Oil (4L)', category: 'Fluids', brand: 'Shell', model: 'Helix Ultra 5W-40', costPrice: 4800, salePrice: 5500, stock: 35, unit: 'litre', lowStockThreshold: 10 },
];

const mockProducts: Product[] = productData.map((p, index) => {
    const placeholder = placeholderImages[index % placeholderImages.length];
    return {
        id: `PROD${1001 + index}`,
        ...p,
        imageUrl: placeholder.imageUrl,
        imageHint: placeholder.imageHint,
    }
});

const mockSales: Sale[] = [
    {
        id: 'SALE001',
        invoice: 'INV-2024-001',
        customer: { name: 'Ali Khan', type: 'registered' },
        date: '2024-07-20T10:30:00Z',
        total: 1700,
        status: 'Paid',
        items: [
            { productId: 'PROD1001', name: 'Spark Plugs (4-pack)', quantity: 1, price: 1200 },
            { productId: 'PROD1002', name: 'Oil Filter', quantity: 1, price: 500 },
        ],
        paymentMethod: 'cash'
    },
    {
        id: 'SALE002',
        invoice: 'INV-2024-002',
        customer: { name: 'Walk-in Customer', type: 'walk-in' },
        date: '2024-07-20T11:45:00Z',
        total: 6000,
        status: 'Paid',
        items: [
             { productId: 'PROD1003', name: 'Front Brake Pads', quantity: 1, price: 6000 },
        ],
        paymentMethod: 'online',
        onlinePaymentSource: 'Easypaisa',
    },
    {
        id: 'SALE003',
        invoice: 'INV-2024-003',
        customer: { name: 'Usman Autos', type: 'registered' },
        date: '2024-07-21T09:15:00Z',
        total: 1450,
        status: 'Unpaid',
        items: [
            { productId: 'PROD1005', name: 'Air Filter', quantity: 1, price: 650 },
            { productId: 'PROD1008', name: 'Headlight Bulb', quantity: 2, price: 400 },
        ],
    },
     {
        id: 'SALE004',
        invoice: 'INV-2024-004',
        customer: { name: 'Walk-in Customer', type: 'walk-in' },
        date: '2024-07-22T14:00:00Z',
        total: 5500,
        status: 'Partial',
        items: [
            { productId: 'PROD1010', name: 'Synthetic Engine Oil (4L)', quantity: 1, price: 5500 },
        ],
    }
];

const mockDealers: Dealer[] = [
    { id: 'DLR001', name: 'Imran Qureshi', company: 'Qureshi Auto Parts', phone: '0300-1234567' },
    { id: 'DLR002', name: 'Nadeem Sons', company: 'Nadeem & Sons Trading', phone: '0321-7654321' },
    { id: 'DLR003', name: 'Khalid Butt', company: 'Butt Auto Store', phone: '0333-1122334' },
];

const mockPurchases: Purchase[] = [
    {
        id: 'PUR001',
        dealer: mockDealers[0],
        invoiceNumber: 'QN-5829',
        date: '2024-07-18T14:00:00Z',
        total: 24000,
        status: 'Paid',
        items: [
            { productId: 'PROD1001', name: 'Spark Plugs (4-pack)', quantity: 30, costPrice: 800 },
        ],
    },
    {
        id: 'PUR002',
        dealer: mockDealers[1],
        invoiceNumber: 'NS-9812',
        date: '2024-07-19T16:30:00Z',
        total: 105000,
        status: 'Partial',
        items: [
            { productId: 'PROD1004', name: 'AGS Battery', quantity: 15, costPrice: 7000 },
        ],
    },
    {
        id: 'PUR003',
        dealer: mockDealers[2],
        invoiceNumber: 'BT-0123',
        date: '2024-07-22T11:00:00Z',
        total: 8000,
        status: 'Unpaid',
        items: [
            { productId: 'PROD1005', name: 'Air Filter', quantity: 20, costPrice: 400 },
        ],
    }
];


// Simulate async data fetching
export const getProducts = async (): Promise<Product[]> => {
  return new Promise(resolve => setTimeout(() => resolve(mockProducts), 500));
};

export const getSales = async (): Promise<Sale[]> => {
    return new Promise(resolve => setTimeout(() => resolve(mockSales), 500));
};

export const getProductCategories = async (): Promise<string[]> => {
    const categories = [...new Set(mockProducts.map(p => p.category))];
    return new Promise(resolve => setTimeout(() => resolve(['All', ...categories]), 200));
}

export const getDealers = async (): Promise<Dealer[]> => {
    return new Promise(resolve => setTimeout(() => resolve(mockDealers), 500));
};

export const getPurchases = async (): Promise<Purchase[]> => {
    return new Promise(resolve => setTimeout(() => resolve(mockPurchases), 500));
};
