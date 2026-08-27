import { RawMaterial, Formula, ProductionOrder, StockMovement, Client, Sale, DeliveryRoute, AuditLog, User, SystemConfig, PurchaseOrder, TransferSheet, SaleNote } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'u-1', name: 'Jonathan (Gerente)', username: 'jonathan', email: 'gerencia@miauloo.com', role: 'admin', pin: '1111', active: true, permissions: ['dashboard', 'finanzas', 'configuracion'] },
  { id: 'u-2', name: 'Diana (Producción)', username: 'diana_prod', email: 'produccion@miauloo.com', role: 'production', pin: '2222', active: true, permissions: ['formulas', 'ordenes'] },
  { id: 'u-3', name: 'Carlos (Almacenista)', username: 'carlos_alm', email: 'almacen@miauloo.com', role: 'warehouse', pin: '3333', active: true, permissions: ['inventario', 'trazabilidad'] },
  { id: 'u-4', name: 'Mariana (Agente Ventas)', username: 'mariana_vta', email: 'ventas@miauloo.com', role: 'sales', pin: '4444', active: true, permissions: ['crm', 'caja'] },
  { id: 'u-5', name: 'Pedro (Repartidor)', username: 'pedro_rep', email: 'reparto@miauloo.com', role: 'delivery', pin: '5555', active: true, permissions: ['entregas'] },
];

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  // CATEGORÍA 1: INGREDIENTES Y MATERIA PRIMA
  { id: 'mat-1', name: 'Harina de Trigo Extra Fina', sku: 'MP-HARI-01', stock: 1500, unit: 'kg', minStock: 200, costPerUnit: 18.0, loteProveedor: 'PROV-HARI-901', expiryDate: '2027-06-30' },
  { id: 'mat-2', name: 'Azúcar Estándar Premium', sku: 'MP-AZUC-02', stock: 1200, unit: 'kg', minStock: 150, costPerUnit: 22.0, loteProveedor: 'PROV-AZUC-554', expiryDate: '2027-12-15' },
  { id: 'mat-3', name: 'Grenetina Hidrolizada 290 Bloom', sku: 'MP-GREN-03', stock: 350, unit: 'kg', minStock: 50, costPerUnit: 140.0, loteProveedor: 'PROV-GREN-302', expiryDate: '2028-04-10' },
  { id: 'mat-4', name: 'Cocoa en Polvo Alcalina', sku: 'MP-COCO-04', stock: 400, unit: 'kg', minStock: 60, costPerUnit: 110.0, loteProveedor: 'PROV-COCO-112', expiryDate: '2027-09-22' },
  { id: 'mat-5', name: 'Esencia de Vainilla Concentrada', sku: 'MP-VAIN-05', stock: 150, unit: 'L', minStock: 20, costPerUnit: 95.0, loteProveedor: 'PROV-SABO-880', expiryDate: '2028-02-18' },
  { id: 'mat-6', name: 'Colorante Rojo Fresa Grado Alimenticio', sku: 'MP-COLR-06', stock: 80, unit: 'L', minStock: 15, costPerUnit: 120.0, loteProveedor: 'PROV-COLO-403', expiryDate: '2028-08-11' },
  { id: 'mat-7', name: 'Mantequilla sin Sal', sku: 'MP-MANT-07', stock: 600, unit: 'kg', minStock: 80, costPerUnit: 85.0, loteProveedor: 'PROV-LACT-711', expiryDate: '2026-11-20' },
  { id: 'mat-8', name: 'Crema Chantilly para Batir', sku: 'MP-CREM-08', stock: 450, unit: 'L', minStock: 60, costPerUnit: 65.0, loteProveedor: 'PROV-LACT-712', expiryDate: '2026-12-05' },

  // CATEGORÍA 2: ARTÍCULOS DESECHABLES
  { id: 'mat-9', name: 'Domo de Plástico para Pastel Grande', sku: 'DES-DOMO-09', stock: 300, unit: 'pzs', minStock: 50, costPerUnit: 15.0, loteProveedor: 'PROV-DESE-220', expiryDate: '2030-01-01' },
  { id: 'mat-10', name: 'Capacillo para Cupcake #72', sku: 'DES-CAPA-10', stock: 8000, unit: 'pzs', minStock: 1000, costPerUnit: 0.15, loteProveedor: 'PROV-DESE-221', expiryDate: '2030-01-01' },
  { id: 'mat-11', name: 'Charola de Cartón Dorada Redonda 30cm', sku: 'DES-CHAR-11', stock: 500, unit: 'pzs', minStock: 100, costPerUnit: 8.0, loteProveedor: 'PROV-DESE-222', expiryDate: '2030-01-01' },
  { id: 'mat-12', name: 'Vaso de Plástico Cristal 12oz', sku: 'DES-VASO-12', stock: 4000, unit: 'pzs', minStock: 500, costPerUnit: 1.20, loteProveedor: 'PROV-DESE-223', expiryDate: '2030-01-01' },

  // CATEGORÍA 3: UTENSILIOS Y DECORACIÓN
  { id: 'mat-13', name: 'Molde de Silicón para Gelatina Corona', sku: 'UTE-MOLD-13', stock: 120, unit: 'pzs', minStock: 20, costPerUnit: 75.0, loteProveedor: 'PROV-UTEN-101', expiryDate: '2031-01-01' },
  { id: 'mat-14', name: 'Manga Pastelera Desechable con 6 Duyas', sku: 'UTE-MANG-14', stock: 250, unit: 'pzs', minStock: 30, costPerUnit: 45.0, loteProveedor: 'PROV-UTEN-102', expiryDate: '2031-01-01' },
  { id: 'mat-15', name: 'Vela de Bengala Infantil de Cumpleaños', sku: 'UTE-VELA-15', stock: 600, unit: 'pzs', minStock: 100, costPerUnit: 12.0, loteProveedor: 'PROV-DECO-330', expiryDate: '2029-01-01' },

  // PRODUCTOS PREPARADOS / ENSAMBLADOS (Productos Terminados)
  { id: 'pt-1', name: 'Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg)', sku: 'PT-MEZC-CH', stock: 120, unit: 'pzs', minStock: 20, costPerUnit: 25.50, loteProveedor: 'LOTE-REC-101', expiryDate: '2027-05-01' },
  { id: 'pt-2', name: 'Polvo Preparado para Gelatina de Fresa (Bolsa 1kg)', sku: 'PT-GELA-FR', stock: 85, unit: 'pzs', minStock: 15, costPerUnit: 34.20, loteProveedor: 'LOTE-REC-102', expiryDate: '2027-04-15' },
];

export const INITIAL_FORMULAS: Formula[] = [
  {
    id: 'f-1',
    name: 'Mezcla de Harina Preparada para Pastel de Chocolate (Lote 100kg / 100 Bolsas)',
    description: 'Fórmula de mezcla seca homogénea lista para repostería casera. Solo requiere agregar huevo y leche.',
    batchSizeLiters: 100, // represent as 100 kg/pcs
    ingredients: [
      { materialId: 'mat-1', percentage: 65, amountPerThousandLiters: 65 }, // Harina
      { materialId: 'mat-2', percentage: 20, amountPerThousandLiters: 20 }, // Azúcar
      { materialId: 'mat-4', percentage: 15, amountPerThousandLiters: 15 }, // Cocoa
    ],
    packaging: [
      { materialId: 'mat-11', quantity: 1, cost: 8.0 }, // Charola o bolsa empaque
    ],
    laborCost: 150,
    otherCost: 50,
  },
  {
    id: 'f-2',
    name: 'Mezcla de Polvo Preparado para Gelatina de Fresa (Lote 100kg / 100 Bolsas)',
    description: 'Formulación de grenetina extra bloom con saborizante de vainilla y colorante rojo fresa brillante.',
    batchSizeLiters: 100,
    ingredients: [
      { materialId: 'mat-2', percentage: 80, amountPerThousandLiters: 80 }, // Azúcar
      { materialId: 'mat-3', percentage: 19, amountPerThousandLiters: 19 }, // Grenetina
      { materialId: 'mat-5', percentage: 0.5, amountPerThousandLiters: 0.5 }, // Esencia vainilla
      { materialId: 'mat-6', percentage: 0.5, amountPerThousandLiters: 0.5 }, // Colorante rojo
    ],
    packaging: [
      { materialId: 'mat-11', quantity: 1, cost: 8.0 },
    ],
    laborCost: 180,
    otherCost: 60,
  }
];

export const INITIAL_PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: 'op-1', formulaId: 'f-1', quantityLiters: 100, status: 'completed', createdAt: '2026-07-02T09:00:00Z', startedAt: '2026-07-02T10:00:00Z', completedAt: '2026-07-02T14:30:00Z', preCheckPassed: true, lote: 'LOTE-REC-101', operator: 'Diana' },
  { id: 'op-2', formulaId: 'f-2', quantityLiters: 100, status: 'completed', createdAt: '2026-07-05T08:30:00Z', startedAt: '2026-07-05T09:15:00Z', completedAt: '2026-07-05T13:45:00Z', preCheckPassed: true, lote: 'LOTE-REC-102', operator: 'Diana' },
  { id: 'op-3', formulaId: 'f-1', quantityLiters: 100, status: 'pending', createdAt: '2026-07-08T11:00:00Z', preCheckPassed: false, operator: 'Diana' },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'cli-1', name: 'Pastelería "El Maná del Cielo"', rfc: 'PMC180412AA1', email: 'contacto@pasteleriaelmana.com', phone: '477-123-4567', priceList: 'Distribuidor', creditDays: 30, creditLimit: 50000, currentDebt: 15000 },
  { id: 'cli-2', name: 'Repostera Dulces Creaciones S.A.', rfc: 'RDC200511XX2', email: 'ventas@dulcescreaciones.com', phone: '333-987-6543', priceList: 'Mayoreo', creditDays: 15, creditLimit: 30000, currentDebt: 6500 },
  { id: 'cli-3', name: 'Gelatinas y Postres Doña Tere', rfc: 'GPD150228BB9', email: 'donatere@gmail.com', phone: '322-555-1234', priceList: 'Público', creditDays: 0, creditLimit: 0, currentDebt: 0 },
  { id: 'cli-4', name: 'Panificadora El Buen Trigo', rfc: 'PBT120915CC3', email: 'panaderia@buentrigo.com', phone: '818-444-9988', priceList: 'Mayoreo', creditDays: 45, creditLimit: 25000, currentDebt: 24000 },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'vta-1',
    clientId: 'cli-1',
    clientName: 'Pastelería "El Maná del Cielo"',
    items: [
      { id: 'item-1', productName: 'Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg)', quantity: 50, unit: 'pzs', unitPrice: 42.0, total: 2100 },
      { id: 'item-2', productName: 'Domo de Plástico para Pastel Grande', quantity: 100, unit: 'pzs', unitPrice: 24.0, total: 2400 },
      { id: 'item-3', productName: 'Charola de Cartón Dorada Redonda 30cm', quantity: 100, unit: 'pzs', unitPrice: 15.0, total: 1500 }
    ],
    subtotal: 6000,
    tax: 960,
    total: 6960,
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
    clientName: 'Repostera Dulces Creaciones S.A.',
    items: [
      { id: 'item-4', productName: 'Polvo Preparado para Gelatina de Fresa (Bolsa 1kg)', quantity: 30, unit: 'pzs', unitPrice: 55.0, total: 1650 },
      { id: 'item-5', productName: 'Molde de Silicón para Gelatina Corona', quantity: 5, unit: 'pzs', unitPrice: 120.0, total: 600 }
    ],
    subtotal: 2250,
    tax: 360,
    total: 2610,
    paymentType: 'Contado',
    status: 'Entregado',
    billingType: 'Remisión',
    createdAt: '2026-07-06T10:15:00Z',
    amountPaid: 2610
  },
  {
    id: 'vta-3',
    clientId: 'cli-3',
    clientName: 'Gelatinas y Postres Doña Tere',
    items: [
      { id: 'item-6', productName: 'Manga Pastelera Desechable con 6 Duyas', quantity: 2, unit: 'pzs', unitPrice: 75.0, total: 150 },
      { id: 'item-7', productName: 'Vela de Bengala Infantil de Cumpleaños', quantity: 20, unit: 'pzs', unitPrice: 20.0, total: 400 }
    ],
    subtotal: 550,
    tax: 88,
    total: 638,
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
    clientName: 'Pastelería "El Maná del Cielo"',
    address: 'Blvd. Adolfo López Mateos 1820, Col. Centro, León, Gto.',
    status: 'en_ruta',
    itemsSummary: '50 Bolsas Pastel Chocolate, 100 Domos Pastel, 100 Charolas Doradas',
  },
  {
    id: 'rut-2',
    saleId: 'vta-2',
    clientName: 'Repostera Dulces Creaciones S.A.',
    address: 'Calzada Independencia Sur 445, Sector Reforma, Guadalajara, Jal.',
    status: 'entregado',
    deliveredAt: '2026-07-07T12:00:00Z',
    evidenceSignature: 'FIRMA_DULCES_CREACIONES_MA',
    evidencePhoto: 'recepcion_reposteria.jpg',
    paymentCollected: 2610,
    paymentMethod: 'Efectivo',
    itemsSummary: '30 Bolsas Gelatina de Fresa, 5 Moldes de Silicón',
  }
];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'mov-1', materialId: 'mat-1', type: 'entrada_compra', quantity: 1500, date: '2026-07-01T10:00:00Z', loteProveedor: 'PROV-HARI-901', user: 'Carlos', notes: 'Abastecimiento Harina Fina - Factura 309' },
  { id: 'mov-2', materialId: 'mat-1', type: 'salida_produccion', quantity: 65, date: '2026-07-02T10:15:00Z', lote: 'LOTE-REC-101', user: 'Diana', notes: 'Consumo para OP-1 Mezcla de Chocolate' },
  { id: 'mov-3', materialId: 'pt-1', type: 'entrada_compra', quantity: 100, date: '2026-07-02T14:30:00Z', lote: 'LOTE-REC-101', user: 'Diana', notes: 'Empaque final de OP-1 (+100 Bolsas)' },
  { id: 'mov-4', materialId: 'pt-1', type: 'salida_venta', quantity: 50, date: '2026-07-07T14:45:00Z', user: 'Mariana', notes: 'Salida para Pastelería El Maná' },
  { id: 'mov-5', materialId: 'mat-5', type: 'merma', quantity: 1, date: '2026-07-07T16:00:00Z', user: 'Carlos', notes: 'Esencia derramada en zona de fraccionamiento' }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', user: 'Jonathan', action: 'Inició sesión en el sistema', module: 'Autenticación', timestamp: '2026-07-08T17:30:00Z', details: 'Navegación general al sistema' },
  { id: 'aud-2', user: 'Diana', action: 'Actualizó receta de Gelatina', module: 'Fórmulas', timestamp: '2026-07-08T12:15:00Z', details: 'Ajustó proporción de colorante para mejorar tonalidad' },
  { id: 'aud-3', user: 'Carlos', action: 'Registró merma de insumos', module: 'Inventario', timestamp: '2026-07-07T16:00:00Z', details: 'Derrame de 1 litro de Esencia de Vainilla' },
  { id: 'aud-4', user: 'Jonathan', action: 'Autorizó crédito para cliente', module: 'Finanzas', timestamp: '2026-07-05T14:00:00Z', details: 'Estableció límite para Panificadora El Buen Trigo' }
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  maxDiscountPublic: 5,
  maxDiscountWholesale: 12,
  maxDiscountDistributor: 20,
  creditDaysAllowed: 60,
};

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'oc-1',
    supplierName: 'Distribuidora Harinera del Centro',
    items: [
      { materialId: 'mat-1', materialName: 'Harina de Trigo Extra Fina', quantity: 1000, unitPrice: 15.0, total: 15000 }
    ],
    subtotal: 15000,
    tax: 0,
    total: 15000,
    status: 'received',
    createdAt: '2026-07-01T09:00:00Z',
    receivedAt: '2026-07-01T14:00:00Z',
    invoiceNumber: 'FAC-8892'
  },
  {
    id: 'oc-2',
    supplierName: 'Grenetinas Premium de Occidente',
    items: [
      { materialId: 'mat-3', materialName: 'Grenetina Hidrolizada 290 Bloom', quantity: 200, unitPrice: 125.0, total: 25000 }
    ],
    subtotal: 25000,
    tax: 0,
    total: 25000,
    status: 'ordered',
    createdAt: '2026-07-08T10:00:00Z'
  }
];

export const INITIAL_TRANSFER_SHEETS: TransferSheet[] = [
  {
    id: 'ts-1',
    folio: 'SIM-270726',
    date: '2026-07-27',
    expeditedIn: 'San Juan del Rio, Qro.',
    elaboratedBy: 'Areli Antonia Mireles Cruz',
    clientName: 'JORGE LUIS',
    destination: 'SAN JUAN DEL RIO',
    address: 'Av. Juárez #104, Col. Centro',
    cp: '76800',
    colonia: 'Centro',
    fiscalRegimen: '601 - General de Ley Personas Morales',
    phone: '(52) 427 116 9640',
    clientNo: 'CLI-0042',
    rfc: 'BAMN8611098PA',
    curp: 'BAMN8611098HQT',
    paymentForm: 'PPD - Pago en parcialidades o diferido',
    operator: 'Pedro (Chofer Logistics)',
    plateNo: 'UK-882-J',
    items: [
      { quantity: 20, unit: 'LTS', description: 'SOSA CAUSTICA', unitPrice: 18.00, total: 360.00 },
      { quantity: 20, unit: 'LTS', description: 'HIPOCLORITO', unitPrice: 11.00, total: 220.00 }
    ],
    subtotal: 580.00,
    tax: 0,
    total: 580.00,
    notes: 'Entregar en horario matutino. Verificar sellos de seguridad.',
    createdAt: '2026-07-27T09:30:00Z'
  }
];

export const INITIAL_SALE_NOTES: SaleNote[] = [
  {
    id: 'sn-1',
    noteNo: '5075',
    date: '2026-07-28',
    clientName: 'MIAULOO S.A. DE C.V.',
    phone: '4271169640',
    city: 'San Juan del Río, Qro.',
    items: [
      { pieces: 5, product: 'SOSA CAUSTICA LIQUIDA 1L', unitPrice: 35.00, total: 175.00 },
      { pieces: 10, product: 'HIPOCLORITO DE SODIO CONCENTRADO 1L', unitPrice: 22.00, total: 220.00 }
    ],
    subtotal: 395.00,
    tax: 0,
    total: 395.00,
    createdAt: '2026-07-28T11:00:00Z'
  }
];

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

  static getPurchaseOrders(): PurchaseOrder[] {
    return this.get<PurchaseOrder[]>('purchase_orders', INITIAL_PURCHASE_ORDERS);
  }

  static savePurchaseOrders(data: PurchaseOrder[]) {
    this.set('purchase_orders', data);
  }

  static getTransferSheets(): TransferSheet[] {
    return this.get<TransferSheet[]>('transfer_sheets', INITIAL_TRANSFER_SHEETS);
  }

  static saveTransferSheets(data: TransferSheet[]) {
    this.set('transfer_sheets', data);
  }

  static getSaleNotes(): SaleNote[] {
    return this.get<SaleNote[]>('sale_notes', INITIAL_SALE_NOTES);
  }

  static saveSaleNotes(data: SaleNote[]) {
    this.set('sale_notes', data);
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
