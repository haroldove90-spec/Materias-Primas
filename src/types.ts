export type RoleType = 'admin' | 'production' | 'warehouse' | 'sales' | 'delivery';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: RoleType;
  pin: string;
  active: boolean;
  permissions: string[];
}

export interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  stock: number; // in kg or L or units
  unit: 'kg' | 'L' | 'pzs';
  minStock: number;
  costPerUnit: number;
  loteProveedor?: string;
  expiryDate?: string;
}

export interface FormulaIngredient {
  materialId: string;
  percentage: number; // e.g., 12 for 12%
  amountPerThousandLiters: number; // in kg/L
}

export interface PackagingAssociation {
  materialId: string; // e.g., Envase PEAD 1L, Tapa, Etiqueta
  quantity: number; // ratio per unit (usually 1)
  cost: number;
}

export interface Formula {
  id: string;
  name: string;
  description: string;
  batchSizeLiters: number; // standard size, e.g., 1000
  ingredients: FormulaIngredient[];
  packaging: PackagingAssociation[];
  laborCost: number;
  otherCost: number;
}

export interface QualityCheck {
  pH?: number; // e.g., 6.8
  density?: number; // e.g., 1.05
  sensoryCheck: boolean; // taste, odor, appearance
  sealingCheck: boolean; // packaging sealed properly
  passed: boolean;
  checkedBy?: string;
  checkedAt?: string;
}

export interface ProductionOrder {
  id: string;
  lote?: string; // generated upon closure
  formulaId: string;
  quantityLiters: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  preCheckPassed: boolean;
  notes?: string;
  operator: string;
  qaCheck?: QualityCheck;
}

export interface StockMovement {
  id: string;
  materialId: string;
  type: 'entrada_compra' | 'salida_produccion' | 'salida_venta' | 'merma' | 'ajuste';
  quantity: number;
  date: string;
  lote?: string;
  loteProveedor?: string;
  user: string;
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  rfc: string;
  email: string;
  phone: string;
  priceList: 'Público' | 'Mayoreo' | 'Distribuidor';
  creditDays: number;
  creditLimit: number;
  currentDebt: number;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentType: 'Contado' | 'Crédito';
  status: 'Cotización' | 'Pedido Activo' | 'Entregado' | 'Cancelado';
  billingType: 'Remisión' | 'CFDI';
  cfdiStatus?: string;
  createdAt: string;
  creditDaysLeft?: number;
  amountPaid: number;
}

export interface DeliveryRoute {
  id: string;
  saleId: string;
  clientName: string;
  address: string;
  status: 'pendiente' | 'en_ruta' | 'entregado';
  deliveredAt?: string;
  evidenceSignature?: string; // base64 or digital sign marker
  evidencePhoto?: string; // placeholder image path
  paymentCollected?: number;
  paymentMethod?: string;
  itemsSummary: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string; // e.g., "Modificó precio de LESS"
  module: string; // e.g., "Finanzas"
  timestamp: string;
  details: string;
}

export interface SystemConfig {
  maxDiscountPublic: number;
  maxDiscountWholesale: number;
  maxDiscountDistributor: number;
  creditDaysAllowed: number;
}

export interface TransferSheetItem {
  quantity: number;
  unit: string;
  description: string;
  unitPrice: number;
  total: number;
}

export interface TransferSheet {
  id: string;
  folio: string;
  date: string;
  expeditedIn: string;
  elaboratedBy: string;
  clientName: string;
  destination: string;
  address?: string;
  cp?: string;
  colonia?: string;
  fiscalRegimen?: string;
  phone?: string;
  clientNo?: string;
  rfc?: string;
  curp?: string;
  paymentForm?: string;
  operator?: string;
  plateNo?: string;
  items: TransferSheetItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
}

export interface SaleNoteItem {
  pieces: number;
  product: string;
  unitPrice: number;
  total: number;
}

export interface SaleNote {
  id: string;
  noteNo: string;
  date: string;
  clientName: string;
  phone?: string;
  city?: string;
  items: SaleNoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

export interface PurchaseOrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'ordered' | 'received';
  createdAt: string;
  receivedAt?: string;
  invoiceNumber?: string;
}
