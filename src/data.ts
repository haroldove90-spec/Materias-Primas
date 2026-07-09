import { RawMaterial, Formula, ProductionOrder, StockMovement, Client, Sale, DeliveryRoute, AuditLog, User, SystemConfig } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'u-1', name: 'Jonathan (Gerente)', username: 'jonathan', role: 'admin', pin: '1111', active: true, permissions: ['dashboard', 'finanzas', 'configuracion'] },
  { id: 'u-2', name: 'Diana (Producción)', username: 'diana_prod', role: 'production', pin: '2222', active: true, permissions: ['formulas', 'ordenes'] },
  { id: 'u-3', name: 'Carlos (Almacenista)', username: 'carlos_alm', role: 'warehouse', pin: '3333', active: true, permissions: ['inventario', 'trazabilidad'] },
  { id: 'u-4', name: 'Mariana (Agente Ventas)', username: 'mariana_vta', role: 'sales', pin: '4444', active: true, permissions: ['crm', 'caja'] },
  { id: 'u-5', name: 'Pedro (Repartidor)', username: 'pedro_rep', role: 'delivery', pin: '5555', active: true, permissions: ['entregas'] },
];

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  { id: 'mat-1', name: 'Lauril Éter Sulfato de Sodio (LESS) 70%', sku: 'MP-LESS-01', stock: 1200, unit: 'kg', minStock: 200, costPerUnit: 45.0, loteProveedor: 'PROV-LESS-998', expiryDate: '2027-12-15' },
  { id: 'mat-2', name: 'Ácido Sulfónico Lineal (ADBS)', sku: 'MP-ADBS-02', stock: 1500, unit: 'kg', minStock: 300, costPerUnit: 55.0, loteProveedor: 'PROV-ADBS-451', expiryDate: '2027-10-10' },
  { id: 'mat-3', name: 'Sosa Cáustica Líquida 50%', sku: 'MP-SOSA-03', stock: 600, unit: 'kg', minStock: 100, costPerUnit: 22.0, loteProveedor: 'PROV-SOSA-332', expiryDate: '2028-05-20' },
  { id: 'mat-4', name: 'Amida de Coco', sku: 'MP-AMID-04', stock: 450, unit: 'kg', minStock: 100, costPerUnit: 75.0, loteProveedor: 'PROV-AMID-122', expiryDate: '2027-08-30' },
  { id: 'mat-5', name: 'Aroma Limón Concentrado', sku: 'MP-AROM-05', stock: 120, unit: 'kg', minStock: 25, costPerUnit: 280.0, loteProveedor: 'PROV-AROM-887', expiryDate: '2027-04-18' },
  { id: 'mat-6', name: 'Colorante Verde Directo', sku: 'MP-COLO-06', stock: 35, unit: 'kg', minStock: 10, costPerUnit: 120.0, loteProveedor: 'PROV-COLO-049', expiryDate: '2028-01-11' },
  { id: 'mat-7', name: 'Agua Desmineralizada', sku: 'MP-AGUA-07', stock: 12000, unit: 'L', minStock: 2000, costPerUnit: 1.50, loteProveedor: 'SIS-INTERNO', expiryDate: '2029-01-01' },
  { id: 'mat-8', name: 'Porrón de Plástico PEAD 20L', sku: 'ENV-PORR-20', stock: 180, unit: 'pzs', minStock: 50, costPerUnit: 65.0, loteProveedor: 'PROV-PLAS-300', expiryDate: '2030-01-01' },
  { id: 'mat-9', name: 'Tapa de Seguridad con Sello 20L', sku: 'ENV-TAPA-20', stock: 500, unit: 'pzs', minStock: 100, costPerUnit: 8.0, loteProveedor: 'PROV-PLAS-301', expiryDate: '2030-01-01' },
  { id: 'mat-10', name: 'Etiqueta Autoadherible Detergente 20L', sku: 'ENV-ETIQ-20', stock: 400, unit: 'pzs', minStock: 100, costPerUnit: 12.0, loteProveedor: 'PROV-GRAF-099', expiryDate: '2029-06-30' },
  // Producto Terminado tracked similarly for direct stock operations
  { id: 'pt-1', name: 'Detergente Multiusos Limón - Porrón 20L', sku: 'PT-DETL-20', stock: 45, unit: 'pzs', minStock: 20, costPerUnit: 427.50, loteProveedor: 'LOTE-INT-087', expiryDate: '2028-07-01' },
  { id: 'pt-2', name: 'Desengrasante Industrial Naranja - Porrón 20L', sku: 'PT-DESN-20', stock: 22, unit: 'pzs', minStock: 15, costPerUnit: 512.00, loteProveedor: 'LOTE-INT-086', expiryDate: '2028-06-15' },
];

export const INITIAL_FORMULAS: Formula[] = [
  {
    id: 'f-1',
    name: 'Detergente Líquido Multiusos Limón (Lote de 1,000L / 50 Porrones)',
    description: 'Fórmula estándar de detergente neutro concentrado con aroma a limón para todo tipo de superficies.',
    batchSizeLiters: 1000,
    ingredients: [
      { materialId: 'mat-1', percentage: 12, amountPerThousandLiters: 120 },
      { materialId: 'mat-2', percentage: 8, amountPerThousandLiters: 80 },
      { materialId: 'mat-3', percentage: 2, amountPerThousandLiters: 20 },
      { materialId: 'mat-4', percentage: 3, amountPerThousandLiters: 30 },
      { materialId: 'mat-5', percentage: 0.5, amountPerThousandLiters: 5 },
      { materialId: 'mat-6', percentage: 0.1, amountPerThousandLiters: 1 },
      { materialId: 'mat-7', percentage: 74.4, amountPerThousandLiters: 744 },
    ],
    packaging: [
      { materialId: 'mat-8', quantity: 50, cost: 65 },
      { materialId: 'mat-9', quantity: 50, cost: 8 },
      { materialId: 'mat-10', quantity: 50, cost: 12 },
    ],
    laborCost: 1200,
    otherCost: 800,
  },
  {
    id: 'f-2',
    name: 'Desengrasante Industrial Naranja (Lote de 1,000L / 50 Porrones)',
    description: 'Fórmula desengrasante alcalina pesada para limpieza de motores, pisos industriales y grasas difíciles.',
    batchSizeLiters: 1000,
    ingredients: [
      { materialId: 'mat-1', percentage: 6, amountPerThousandLiters: 60 },
      { materialId: 'mat-2', percentage: 12, amountPerThousandLiters: 120 },
      { materialId: 'mat-3', percentage: 5, amountPerThousandLiters: 50 },
      { materialId: 'mat-4', percentage: 4, amountPerThousandLiters: 40 },
      { materialId: 'mat-5', percentage: 1.0, amountPerThousandLiters: 10 }, // aroma naranja / d-limoneno
      { materialId: 'mat-6', percentage: 0.1, amountPerThousandLiters: 1 }, // colorante naranja
      { materialId: 'mat-7', percentage: 71.9, amountPerThousandLiters: 719 },
    ],
    packaging: [
      { materialId: 'mat-8', quantity: 50, cost: 65 },
      { materialId: 'mat-9', quantity: 50, cost: 8 },
      { materialId: 'mat-10', quantity: 50, cost: 12 },
    ],
    laborCost: 1500,
    otherCost: 1000,
  }
];

export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: 'op-1', formulaId: 'f-1', quantityLiters: 1000, status: 'completed', createdAt: '2026-07-02T09:00:00Z', startedAt: '2026-07-02T10:00:00Z', completedAt: '2026-07-02T14:30:00Z', preCheckPassed: true, lote: 'LOTE-INT-087', operator: 'Diana' },
  { id: 'op-2', formulaId: 'f-2', quantityLiters: 1000, status: 'completed', createdAt: '2026-07-05T08:30:00Z', startedAt: '2026-07-05T09:15:00Z', completedAt: '2026-07-05T13:45:00Z', preCheckPassed: true, lote: 'LOTE-INT-086', operator: 'Diana' },
  { id: 'op-3', formulaId: 'f-1', quantityLiters: 1000, status: 'pending', createdAt: '2026-07-08T11:00:00Z', preCheckPassed: false, operator: 'Diana' },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'cli-1', name: 'Distribuidora de Limpieza del Bajío SA', rfc: 'DLB180412AA1', email: 'compras@bajiolimpieza.com', phone: '477-123-4567', priceList: 'Distribuidor', creditDays: 30, creditLimit: 150000, currentDebt: 45000 },
  { id: 'cli-2', name: 'Productos de Sanidad de Occidente', rfc: 'PSO200511XX2', email: 'finanzas@sanidadoccidente.com', phone: '333-987-6543', priceList: 'Mayoreo', creditDays: 15, creditLimit: 80000, currentDebt: 12000 },
  { id: 'cli-3', name: 'Servicios de Hotelería de la Costa', rfc: 'SHC150228BB9', email: 'proveedores@hotelcosta.com', phone: '322-555-1234', priceList: 'Público', creditDays: 0, creditLimit: 0, currentDebt: 0 },
  { id: 'cli-4', name: 'Lavanderías Express del Norte', rfc: 'LEN120915CC3', email: 'almacen@lavanderiasnorth.com', phone: '818-444-9988', priceList: 'Mayoreo', creditDays: 45, creditLimit: 60000, currentDebt: 58000 }, // Alerta de crédito casi rebasado o vencido
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'vta-1',
    clientId: 'cli-1',
    clientName: 'Distribuidora de Limpieza del Bajío SA',
    items: [
      { id: 'item-1', productName: 'Detergente Multiusos Limón - Porrón 20L', quantity: 20, unit: 'pzs', unitPrice: 580, total: 11600 },
      { id: 'item-2', productName: 'Desengrasante Industrial Naranja - Porrón 20L', quantity: 15, unit: 'pzs', unitPrice: 690, total: 10350 }
    ],
    subtotal: 21950,
    tax: 3512,
    total: 25462,
    paymentType: 'Crédito',
    status: 'Pedido Activo',
    billingType: 'CFDI',
    cfdiStatus: 'Timbrado exitosamente (UUID: 4A8B-91F2)',
    createdAt: '2026-07-07T14:30:00Z',
    creditDaysLeft: 29,
    amountPaid: 0
  },
  {
    id: 'vta-2',
    clientId: 'cli-2',
    clientName: 'Productos de Sanidad de Occidente',
    items: [
      { id: 'item-3', productName: 'Detergente Multiusos Limón - Porrón 20L', quantity: 10, unit: 'pzs', unitPrice: 620, total: 6200 }
    ],
    subtotal: 6200,
    tax: 992,
    total: 7192,
    paymentType: 'Contado',
    status: 'Entregado',
    billingType: 'Remisión',
    createdAt: '2026-07-06T10:15:00Z',
    amountPaid: 7192
  },
  {
    id: 'vta-3',
    clientId: 'cli-3',
    clientName: 'Servicios de Hotelería de la Costa',
    items: [
      { id: 'item-4', productName: 'Desengrasante Industrial Naranja - Porrón 20L', quantity: 5, unit: 'pzs', unitPrice: 790, total: 3950 }
    ],
    subtotal: 3950,
    tax: 632,
    total: 4582,
    paymentType: 'Contado',
    status: 'Cotización',
    billingType: 'Remisión',
    createdAt: '2026-07-08T15:00:00Z',
    amountPaid: 0
  }
];

export const INITIAL_DELIVERY_ROUTES: DeliveryRoute[] = [
  {
    id: 'rut-1',
    saleId: 'vta-1',
    clientName: 'Distribuidora de Limpieza del Bajío SA',
    address: 'Blvd. Adolfo López Mateos 1820, Col. Centro, León, Gto.',
    status: 'en_ruta',
    itemsSummary: '20 Porrones Detergente Limón, 15 Porrones Desengrasante',
  },
  {
    id: 'rut-2',
    saleId: 'vta-2',
    clientName: 'Productos de Sanidad de Occidente',
    address: 'Calzada Independencia Sur 445, Sector Reforma, Guadalajara, Jal.',
    status: 'entregado',
    deliveredAt: '2026-07-07T12:00:00Z',
    evidenceSignature: 'FIRMA_RECIBIDO_CARLOS_O',
    evidencePhoto: 'recepcion_sanidad.jpg',
    paymentCollected: 7192,
    paymentMethod: 'Transferencia',
    itemsSummary: '10 Porrones Detergente Limón 20L',
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'mov-1', materialId: 'mat-1', type: 'entrada_compra', quantity: 1000, date: '2026-07-01T10:00:00Z', loteProveedor: 'PROV-LESS-998', user: 'Carlos', notes: 'Compra autorizada factura F-9908' },
  { id: 'mov-2', materialId: 'mat-1', type: 'salida_produccion', quantity: 120, date: '2026-07-02T10:15:00Z', lote: 'LOTE-INT-087', user: 'Diana', notes: 'Consumo para OP-1 Detergente Limón' },
  { id: 'mov-3', materialId: 'pt-1', type: 'entrada_compra', quantity: 50, date: '2026-07-02T14:30:00Z', lote: 'LOTE-INT-087', user: 'Diana', notes: 'Cierre de producción de OP-1 (+50 Porrones)' },
  { id: 'mov-4', materialId: 'pt-1', type: 'salida_venta', quantity: 10, date: '2026-07-06T11:00:00Z', user: 'Mariana', notes: 'Salida por venta folio VTA-2' },
  { id: 'mov-5', materialId: 'mat-5', type: 'merma', quantity: 2, date: '2026-07-07T16:00:00Z', user: 'Carlos', notes: 'Derrame accidental en andén de carga' }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', user: 'Jonathan', action: 'Inició sesión en el sistema', module: 'Autenticación', timestamp: '2026-07-08T17:30:00Z', details: 'Acceso desde dirección IP autorizada' },
  { id: 'aud-2', user: 'Diana', action: 'Actualizó fórmula confidencial', module: 'Fórmulas', timestamp: '2026-07-08T12:15:00Z', details: 'Ajustó ingrediente LESS en un 0.5% para optimizar viscosidad' },
  { id: 'aud-3', user: 'Carlos', action: 'Registró merma de químicos', module: 'Inventario', timestamp: '2026-07-07T16:00:00Z', details: 'Derrame de 2kg de Aroma Limón en pasillo central' },
  { id: 'aud-4', user: 'Jonathan', action: 'Modificó límite de crédito', module: 'Finanzas', timestamp: '2026-07-05T14:00:00Z', details: 'Incrementó límite de Lavanderías del Norte a $60,000 MXN' }
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  maxDiscountPublic: 5,
  maxDiscountWholesale: 12,
  maxDiscountDistributor: 20,
  creditDaysAllowed: 60,
};

// Global Store Wrapper for easy persistence and reactive binding
export class MockDatabase {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const val = localStorage.getItem(`mp_db_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`mp_db_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  static reset(): void {
    localStorage.clear();
    window.location.reload();
  }

  static getUsers(): User[] {
    return this.get<User[]>('users', INITIAL_USERS);
  }

  static saveUsers(data: User[]) {
    this.set('users', data);
  }

  static getRawMaterials(): RawMaterial[] {
    return this.get<RawMaterial[]>('raw_materials', INITIAL_RAW_MATERIALS);
  }

  static saveRawMaterials(data: RawMaterial[]) {
    this.set('raw_materials', data);
  }

  static getFormulas(): Formula[] {
    return this.get<Formula[]>('formulas', INITIAL_FORMULAS);
  }

  static saveFormulas(data: Formula[]) {
    this.set('formulas', data);
  }

  static getProductionOrders(): ProductionOrder[] {
    return this.get<ProductionOrder[]>('production_orders', INITIAL_PRODUCTION_ORDERS);
  }

  static saveProductionOrders(data: ProductionOrder[]) {
    this.set('production_orders', data);
  }

  static getClients(): Client[] {
    return this.get<Client[]>('clients', INITIAL_CLIENTS);
  }

  static saveClients(data: Client[]) {
    this.set('clients', data);
  }

  static getSales(): Sale[] {
    return this.get<Sale[]>('sales', INITIAL_SALES);
  }

  static saveSales(data: Sale[]) {
    this.set('sales', data);
  }

  static getDeliveryRoutes(): DeliveryRoute[] {
    return this.get<DeliveryRoute[]>('delivery_routes', INITIAL_DELIVERY_ROUTES);
  }

  static saveDeliveryRoutes(data: DeliveryRoute[]) {
    this.set('delivery_routes', data);
  }

  static getStockMovements(): StockMovement[] {
    return this.get<StockMovement[]>('stock_movements', INITIAL_STOCK_MOVEMENTS);
  }

  static saveStockMovements(data: StockMovement[]) {
    this.set('stock_movements', data);
  }

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
  }

  static saveAuditLogs(data: AuditLog[]) {
    this.set('audit_logs', data);
  }

  static getSystemConfig(): SystemConfig {
    return this.get<SystemConfig>('system_config', INITIAL_SYSTEM_CONFIG);
  }

  static saveSystemConfig(data: SystemConfig) {
    this.set('system_config', data);
  }

  static addAuditLog(user: string, action: string, module: string, details: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      user,
      action,
      module,
      timestamp: new Date().toISOString(),
      details
    };
    this.saveAuditLogs([newLog, ...logs]);
  }
}
