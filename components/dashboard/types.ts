export type DashPeriod = "today" | "yesterday" | "week" | "month";

export type DashSummary = {
  from: string;
  to: string;
  todaysSales: string;
  todaysTransactions: number;
  orders?: number;
  revenue?: string;
  todaysCustomers: number;
  todaysReturns: number;
  todaysReturnAmount?: string;
  todaysProfit: string;
  profit?: string;
  expenses?: string;
  due?: string;
  customerDue?: string;
  supplierDue?: string;
  discounts?: string;
  grossMargin: string;
  currentStockValue: string;
  lowStockItems: number;
  outOfStockItems?: number;
  stockSkuCount?: number;
  activeOutlets: number;
};

export type DashSales = {
  period: string;
  totalSales: string;
  transactionCount: number;
  averageTransactionValue: string;
  discounts: string;
  series: { date: string; sales: number; count: number }[];
};

export type DashPayments = {
  cash: string;
  card: string;
  mfs: string;
  refunds: string;
  captured?: string;
  payments: { method: string; amount: string }[];
};

export type DashInventory = {
  stockValue: string;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount?: number;
  skuCount?: number;
  threshold?: number;
  lowStock: { sku: string; product: string; location: string; available: string }[];
  outOfStock?: { sku: string; product: string; location: string; available: string }[];
};

export type DashTopProduct = {
  name: string;
  sku: string;
  qty: string;
  revenue: string;
  revenueValue?: number;
};

export type DashTopCustomer = {
  id: string;
  name: string;
  phone: string;
  count: number;
  revenue: string;
  revenueValue?: number;
};

export type DashCashier = {
  cashier: string;
  count: number;
  total: string;
  totalValue?: number;
};

export type DashHourly = { hour: string; sales: number; count: number };

export type DashRecentSale = {
  id: string;
  invoiceNumber: string;
  customer: string;
  cashier: string;
  outlet: string;
  amount: string;
  payment: string;
  time: string;
  status: string;
};

export type DashActivity = { id: string; action: string; entityType: string; time: string };

export type DashCustomersMix = {
  customersWithSales: number;
  walkInTransactions: number;
  transactions: number;
};
