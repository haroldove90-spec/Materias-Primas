import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Users, FileCheck, DollarSign, Plus, Minus, 
  Trash2, FileText, Landmark, RefreshCw, Send, CheckCircle, AlertTriangle,
  Truck, Receipt, Eye, Printer, Download, Save, Search, X, Building, Phone, MapPin,
  Package, Edit, PlusCircle, MinusCircle, CheckCircle2, Sliders, ToggleLeft, ToggleRight, Layers, Tag, Calendar
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, Client, Sale, OrderItem, DeliveryRoute, User, TransferSheet, TransferSheetItem, SaleNote, SaleNoteItem, AccountReceivable } from '../types';
import { exportToExcel, exportToPDF, exportSaleNoteToPDF, printSaleNoteReceipt, exportTransferSheetToPDF, printElement } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { 
  saveRawMaterialToSupabase, 
  deleteRawMaterialInSupabase, 
  saveAccountReceivableToSupabase 
} from '../services/supabaseService';
import { SaleNotesManager } from './SaleNotesManager';
import { TransferSheetsManager } from './TransferSheetsManager';
import { ClientsManager } from './ClientsManager';
import { AccountsReceivableManager } from './AccountsReceivableManager';
import { SalesOrdersManager } from './SalesOrdersManager';
import { AdminRawMaterialsManager } from './AdminRawMaterialsManager';

interface SalesRoleProps {
  onBack: () => void;
  currentUser: User;
  activeTab?: 'pos' | 'crm' | 'cobranza' | 'traslado' | 'notas';
  setActiveTab?: (tab: 'pos' | 'crm' | 'cobranza' | 'traslado' | 'notas') => void;
}

export default function SalesRole({ onBack, currentUser, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: SalesRoleProps) {
  // Database States
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // UI States
  const [internalActiveTab, setInternalActiveTab] = useState<'pos' | 'crm' | 'cobranza' | 'traslado' | 'notas'>('pos');
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = propsSetActiveTab || setInternalActiveTab;
  const [posSubView, setPosSubView] = useState<'pos' | 'products' | 'history'>('pos');
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'finished' | 'raw' | 'in_stock'>('all');
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [posFeedback, setPosFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals for Products / Raw Materials in POS
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RawMaterial | null>(null);
  const [viewingProduct, setViewingProduct] = useState<RawMaterial | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<RawMaterial | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Ajuste de inventario en mostrador');

  // Form fields for Product / Raw Material
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodStock, setProdStock] = useState<number>(0);
  const [prodUnit, setProdUnit] = useState<'kg' | 'L' | 'pzs'>('kg');
  const [prodMinStock, setProdMinStock] = useState<number>(10);
  const [prodCost, setProdCost] = useState<number>(0);
  const [prodSalePrice, setProdSalePrice] = useState<number>(0);
  const [prodLote, setProdLote] = useState('');
  const [prodExpiry, setProdExpiry] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [prodNotes, setProdNotes] = useState('');
  
  // POS Cart State
  const [cartClientId, setCartClientId] = useState('');
  const [cartItems, setCartItems] = useState<{productMatId: string, quantity: number}[]>([]);
  const [paymentType, setPaymentType] = useState<'Contado' | 'Crédito'>('Contado');
  const [billingType, setBillingType] = useState<'Remisión' | 'CFDI'>('Remisión');
  const [isStamping, setIsStamping] = useState(false);
  const [stampedMessage, setStampedMessage] = useState<string | null>(null);

  // Cobranza State
  const [selectedCobranzaClientId, setSelectedCobranzaClientId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(1000);
  const [paymentNotes, setPaymentNotes] = useState('');

  // CRM Quote / Cotización State
  const [crmClientName, setCrmClientName] = useState('');
  const [crmClientRFC, setCrmClientRFC] = useState('');
  const [crmClientEmail, setCrmClientEmail] = useState('');
  const [crmClientPriceList, setCrmClientPriceList] = useState<'Público' | 'Mayoreo' | 'Distribuidor'>('Público');

  // Transfer sheets state
  const [transferSheets, setTransferSheets] = useState<TransferSheet[]>([]);
  const [selectedTransferSheet, setSelectedTransferSheet] = useState<TransferSheet | null>(null);
  const [showCreateTransferModal, setShowCreateTransferModal] = useState(false);
  const [showViewTransferModal, setShowViewTransferModal] = useState(false);
  const [tsSearchTerm, setTsSearchTerm] = useState('');

  // Form state for Transfer Sheet
  const [tsFolio, setTsFolio] = useState(`SIM-${Math.floor(100000 + Math.random() * 900000)}`);
  const [tsDate, setTsDate] = useState(new Date().toISOString().split('T')[0]);
  const [tsExpeditedIn, setTsExpeditedIn] = useState('San Juan del Rio, Qro.');
  const [tsElaboratedBy, setTsElaboratedBy] = useState('Areli Antonia Mireles Cruz');
  const [tsClientName, setTsClientName] = useState('JORGE LUIS');
  const [tsDestination, setTsDestination] = useState('SAN JUAN DEL RIO');
  const [tsAddress, setTsAddress] = useState('Sta. Cruz 71, La Loma');
  const [tsCp, setTsCp] = useState('76804');
  const [tsColonia, setTsColonia] = useState('La Loma');
  const [tsFiscalRegimen, setTsFiscalRegimen] = useState('601 - General de Ley Personas Morales');
  const [tsPhone, setTsPhone] = useState('(52) 427 116 9640');
  const [tsClientNo, setTsClientNo] = useState('CLI-0042');
  const [tsRfc, setTsRfc] = useState('BAMN8611098PA');
  const [tsCurp, setTsCurp] = useState('BAMN8611098HQT');
  const [tsPaymentForm, setTsPaymentForm] = useState('PPD - Pago en parcialidades o diferido');
  const [tsOperator, setTsOperator] = useState('Pedro (Chofer Logistics)');
  const [tsPlateNo, setTsPlateNo] = useState('UK-882-J');
  const [tsNotes, setTsNotes] = useState('NOTA: Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: "Recibí mi pedido completo", su nombre, firma y fecha.');
  const [tsItems, setTsItems] = useState<TransferSheetItem[]>([
    { quantity: 20, unit: 'LTS', description: 'SOSA CAUSTICA', unitPrice: 18.00, total: 360.00 },
    { quantity: 20, unit: 'LTS', description: 'HIPOCLORITO', unitPrice: 11.00, total: 220.00 }
  ]);

  // Sale notes state
  const [saleNotes, setSaleNotes] = useState<SaleNote[]>([]);
  const [selectedSaleNote, setSelectedSaleNote] = useState<SaleNote | null>(null);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showViewNoteModal, setShowViewNoteModal] = useState(false);
  const [snSearchTerm, setSnSearchTerm] = useState('');

  // Form state for Sale Note
  const [snNoteNo, setSnNoteNo] = useState('5075');
  const [snDate, setSnDate] = useState(new Date().toISOString().split('T')[0]);
  const [snClientName, setSnClientName] = useState('MIAULOO S.A. DE C.V.');
  const [snPhone, setSnPhone] = useState('4271169640');
  const [snCity, setSnCity] = useState('San Juan del Río, Qro.');
  const [snItems, setSnItems] = useState<SaleNoteItem[]>([
    { pieces: 5, product: 'SOSA CAUSTICA LIQUIDA 1L', unitPrice: 35.00, total: 175.00 },
    { pieces: 10, product: 'HIPOCLORITO DE SODIO CONCENTRADO 1L', unitPrice: 22.00, total: 220.00 }
  ]);

  // Load database
  const loadDatabase = () => {
    setMaterials(MockDatabase.getRawMaterials());
    setClients(MockDatabase.getClients());
    setSales(MockDatabase.getSales());
    setTransferSheets(MockDatabase.getTransferSheets());
    setSaleNotes(MockDatabase.getSaleNotes());
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Precios Base (Público General / Mostrador)
  const getBasePrices = (prodId: string) => {
    const mat = materials.find(m => m.id === prodId);
    if (mat && mat.salePrice && mat.salePrice > 0) return mat.salePrice;
    if (prodId === 'pt-1') return 65;
    if (prodId === 'pt-2') return 85;
    if (mat && mat.costPerUnit > 0) return Math.round(mat.costPerUnit * 1.35 * 100) / 100;
    return 150; // default fallback
  };

  // Calcular precio del producto de acuerdo a la lista del cliente seleccionado
  const getProductPriceForClient = (prodId: string, clientId: string) => {
    const basePrice = getBasePrices(prodId);
    const client = clients.find(c => c.id === clientId);
    if (!client) return basePrice;

    if (client.priceList === 'Distribuidor') {
      return Math.round(basePrice * 0.80 * 100) / 100; // 20% descuento
    } else if (client.priceList === 'Mayoreo') {
      return Math.round(basePrice * 0.88 * 100) / 100; // 12% descuento
    }
    return basePrice; // Público
  };

  // Catálogo de productos y materias primas filtrados para POS
  const filteredCatalogProducts = useMemo(() => {
    return materials.filter(m => {
      // Filtro de categoría
      if (catalogCategory === 'finished') {
        const isFinished = m.id.startsWith('pt') || m.sku.startsWith('PT') || (m.unit === 'pzs' && !m.id.startsWith('mp'));
        if (!isFinished) return false;
      } else if (catalogCategory === 'raw') {
        const isRaw = m.id.startsWith('mp') || m.sku.startsWith('MP') || m.unit === 'kg' || m.unit === 'L';
        if (!isRaw) return false;
      } else if (catalogCategory === 'in_stock') {
        if (m.stock <= 0) return false;
      }

      // Filtro de búsqueda por nombre, código interno (SKU) o lote
      if (posSearchTerm.trim()) {
        const q = posSearchTerm.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesSku = m.sku.toLowerCase().includes(q);
        const matchesLote = (m.loteProveedor || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesLote) return false;
      }

      return true;
    });
  }, [materials, catalogCategory, posSearchTerm]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setPosFeedback({ type, text });
    setTimeout(() => setPosFeedback(null), 3500);
  };

  // Product CRUD Handlers in POS
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSku(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setProdStock(0);
    setProdUnit('kg');
    setProdMinStock(10);
    setProdCost(0);
    setProdSalePrice(0);
    setProdLote('');
    setProdExpiry('');
    setProdActive(true);
    setProdNotes('');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (m: RawMaterial) => {
    setEditingProduct(m);
    setProdName(m.name);
    setProdSku(m.sku);
    setProdStock(m.stock);
    setProdUnit(m.unit);
    setProdMinStock(m.minStock);
    setProdCost(m.costPerUnit);
    setProdSalePrice(m.salePrice || 0);
    setProdLote(m.loteProveedor || '');
    setProdExpiry(m.expiryDate || '');
    setProdActive(m.active ?? true);
    setProdNotes(m.notes || '');
    setShowProductModal(true);
  };

  const handleOpenViewProduct = (m: RawMaterial) => {
    setViewingProduct(m);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert('El nombre del producto o materia prima es obligatorio');
      return;
    }

    const newProd: RawMaterial = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodName.trim(),
      sku: prodSku.trim() || `SKU-${Date.now()}`,
      stock: Number(prodStock) || 0,
      unit: prodUnit,
      minStock: Number(prodMinStock) || 0,
      costPerUnit: Number(prodCost) || 0,
      salePrice: Number(prodSalePrice) > 0 ? Number(prodSalePrice) : undefined,
      loteProveedor: prodLote.trim() || undefined,
      expiryDate: prodExpiry || undefined,
      active: prodActive,
      notes: prodNotes.trim() || undefined
    };

    const currentList = MockDatabase.getRawMaterials();
    let updatedList: RawMaterial[];
    if (editingProduct) {
      updatedList = currentList.map(m => m.id === editingProduct.id ? newProd : m);
    } else {
      updatedList = [newProd, ...currentList];
    }
    MockDatabase.saveRawMaterials(updatedList);
    setMaterials(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      editingProduct ? 'Actualizó producto en mostrador' : 'Registró nuevo producto/materia prima en POS',
      'Punto de Venta',
      `${newProd.name} (${newProd.sku}) - Stock: ${newProd.stock} ${newProd.unit} - Estado: ${newProd.active ? 'Activo' : 'Desactivado'}`
    );

    setShowProductModal(false);
    showNotification('success', `Producto/materia prima "${newProd.name}" guardado exitosamente.`);

    try {
      await saveRawMaterialToSupabase(newProd);
    } catch (err) {
      console.warn('Supabase save product error:', err);
    }
  };

  const handleToggleProductActive = async (m: RawMaterial) => {
    const nextStatus = !(m.active ?? true);
    const updated: RawMaterial = { ...m, active: nextStatus };
    const currentList = MockDatabase.getRawMaterials();
    const updatedList = currentList.map(item => item.id === m.id ? updated : item);
    MockDatabase.saveRawMaterials(updatedList);
    setMaterials(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      nextStatus ? 'Activó producto en POS' : 'Desactivó producto en POS',
      'Punto de Venta',
      `${m.name} (${m.sku}) ahora está ${nextStatus ? 'Activo' : 'Desactivado'}`
    );

    showNotification('success', `"${m.name}" ahora está ${nextStatus ? 'activo' : 'desactivado'}.`);

    try {
      await saveRawMaterialToSupabase(updated);
    } catch (err) {
      console.warn('Supabase toggle error:', err);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto/materia prima "${name}" del inventario?`)) return;

    const currentList = MockDatabase.getRawMaterials();
    const updatedList = currentList.filter(m => m.id !== id);
    MockDatabase.saveRawMaterials(updatedList);
    setMaterials(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó producto en POS',
      'Punto de Venta',
      `ID: ${id}, Nombre: ${name}`
    );

    showNotification('success', `"${name}" eliminado del catálogo.`);

    try {
      await deleteRawMaterialInSupabase(id);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  };

  const handleOpenAdjust = (m: RawMaterial) => {
    setAdjustingProduct(m);
    setAdjustType('add');
    setAdjustQty(0);
    setAdjustReason('Ajuste de inventario en mostrador');
    setShowAdjustModal(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty <= 0) {
      alert('Ingresa una cantidad válida mayor a cero');
      return;
    }

    let newStock = adjustingProduct.stock;
    if (adjustType === 'add') {
      newStock += adjustQty;
    } else if (adjustType === 'remove') {
      newStock = Math.max(0, newStock - adjustQty);
    } else if (adjustType === 'set') {
      newStock = adjustQty;
    }

    const updated: RawMaterial = {
      ...adjustingProduct,
      stock: Number(newStock.toFixed(2))
    };

    const currentList = MockDatabase.getRawMaterials();
    const updatedList = currentList.map(m => m.id === adjustingProduct.id ? updated : m);
    MockDatabase.saveRawMaterials(updatedList);
    setMaterials(updatedList);

    // Movimiento Kardex
    const movements = MockDatabase.getStockMovements();
    const newMovement = {
      id: `mov-${Date.now()}`,
      materialId: adjustingProduct.id,
      type: adjustType === 'add' ? 'entrada_compra' : adjustType === 'remove' ? 'merma' : 'ajuste',
      quantity: adjustQty,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: `${adjustReason} (Stock: ${adjustingProduct.stock} ${adjustingProduct.unit} -> ${newStock} ${adjustingProduct.unit})`
    };
    MockDatabase.saveStockMovements([newMovement as any, ...movements]);

    setShowAdjustModal(false);
    showNotification('success', `Stock de "${adjustingProduct.name}" actualizado a ${newStock} ${adjustingProduct.unit}.`);

    try {
      await saveRawMaterialToSupabase(updated);
    } catch (err) {
      console.warn('Supabase adjust error:', err);
    }
  };

  // Cálculos de Carrito Activo
  const selectedClient = clients.find(c => c.id === cartClientId);
  
  const cartTotals = cartItems.reduce((acc, item) => {
    const price = getProductPriceForClient(item.productMatId, cartClientId);
    const totalItem = price * item.quantity;
    return {
      subtotal: acc.subtotal + totalItem,
      tax: acc.tax + (totalItem * 0.16),
      total: acc.total + (totalItem * 1.16)
    };
  }, { subtotal: 0, tax: 0, total: 0 });

  // Validador de crédito
  const exceedsCreditLimit = selectedClient && paymentType === 'Crédito' && 
    (selectedClient.currentDebt + cartTotals.total > selectedClient.creditLimit);

  const missingCreditAmount = exceedsCreditLimit && selectedClient
    ? (selectedClient.currentDebt + cartTotals.total - selectedClient.creditLimit)
    : 0;

  // Acciones de Carrito
  const addToCart = (prodId: string, customQty?: number) => {
    const qtyToAdd = customQty !== undefined && customQty > 0 ? customQty : (productQuantities[prodId] || 1);
    const existing = cartItems.find(item => item.productMatId === prodId);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.productMatId === prodId ? { ...item, quantity: Number((item.quantity + qtyToAdd).toFixed(2)) } : item
      ));
    } else {
      setCartItems([...cartItems, { productMatId: prodId, quantity: Number(qtyToAdd.toFixed(2)) }]);
    }
    setProductQuantities(prev => ({ ...prev, [prodId]: 1 }));
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.productMatId === prodId) {
        const newQty = Number((item.quantity + delta).toFixed(2));
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (prodId: string) => {
    setCartItems(cartItems.filter(item => item.productMatId !== prodId));
  };

  // PROCESAR VENTA / COTIZACIÓN
  const handleCheckout = async (isQuote: boolean = false) => {
    if (!cartClientId) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    if (cartItems.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    if (!isQuote && exceedsCreditLimit) {
      alert(`Venta denegada por Crédito Excedido por $${missingCreditAmount?.toFixed(2)} MXN. Solicita autorización de Jonathan.`);
      return;
    }

    // Validar Stock antes de descontar para Pedidos Activos
    if (!isQuote) {
      let stockCheckPassed = true;
      let missingStockProduct = '';
      
      cartItems.forEach(item => {
        const mat = materials.find(m => m.id === item.productMatId);
        if (!mat || mat.stock < item.quantity) {
          stockCheckPassed = false;
          missingStockProduct = mat ? mat.name : 'Desconocido';
        }
      });

      if (!stockCheckPassed) {
        alert(`No hay suficiente stock en el almacén de producto terminado para surtir: ${missingStockProduct}. Favor de solicitar preparación o empaquetado al área de Producción.`);
        return;
      }
    }

    // Simular timbrado si es CFDI
    if (billingType === 'CFDI' && !isQuote) {
      setIsStamping(true);
      await new Promise(resolve => setTimeout(resolve, 1800)); // Simula latencia del PAC
      setIsStamping(false);
    }

    const uuidCFDI = `CFDI-UUID-${Math.floor(1000 + Math.random() * 9000)}-4B38`;
    
    // Generar la venta
    const newSaleItems: OrderItem[] = cartItems.map((item, idx) => {
      const mat = materials.find(m => m.id === item.productMatId)!;
      const unitPrice = getProductPriceForClient(item.productMatId, cartClientId);
      return {
        id: `item-${Date.now()}-${idx}`,
        productName: mat ? mat.name : 'Producto',
        quantity: item.quantity,
        unit: (mat && mat.unit) ? mat.unit : 'pzs',
        unitPrice,
        total: unitPrice * item.quantity
      };
    });

    const newSale: Sale = {
      id: isQuote ? `COT-${Math.floor(100 + Math.random() * 900)}` : `VTA-${Math.floor(100 + Math.random() * 900)}`,
      clientId: cartClientId,
      clientName: selectedClient?.name || 'Cliente Express',
      items: newSaleItems,
      subtotal: cartTotals.subtotal,
      tax: cartTotals.tax,
      total: cartTotals.total,
      paymentType,
      status: isQuote ? 'Cotización' : 'Pedido Activo',
      billingType,
      cfdiStatus: billingType === 'CFDI' && !isQuote ? `Timbrado exitosamente (${uuidCFDI})` : undefined,
      createdAt: new Date().toISOString(),
      creditDaysLeft: paymentType === 'Crédito' ? selectedClient?.creditDays : undefined,
      amountPaid: paymentType === 'Contado' ? cartTotals.total : 0
    };

    // Actualizar Base de Datos
    const currentSales = MockDatabase.getSales();
    const prevSalesCount = currentSales.length;
    MockDatabase.saveSales([newSale, ...currentSales]);

    // Registrar Telemetría de Guardado Inmediata
    recordSaveTelemetry({
      table: 'sales',
      folio: newSale.id,
      action: isQuote ? 'Cotización CRM Guardada' : `Venta / Facturación (${billingType})`,
      countBefore: prevSalesCount,
      countAfter: prevSalesCount + 1,
      status: 'success',
      payloadSummary: `Total: $${cartTotals.total.toLocaleString()} MXN • Cliente: ${selectedClient?.name || 'Express'}`,
      source: 'cloud_sync'
    });

    if (!isQuote) {
      // 1. Descontar Stock de Producto o Materia Prima vendida
      const currentMaterials = [...materials];
      const movements = MockDatabase.getStockMovements();
      const newMovements = [...movements];

      cartItems.forEach(item => {
        const matIdx = currentMaterials.findIndex(m => m.id === item.productMatId);
        if (matIdx !== -1) {
          const oldStock = currentMaterials[matIdx].stock;
          const newStock = Math.max(0, Number((oldStock - item.quantity).toFixed(2)));
          currentMaterials[matIdx].stock = newStock;
          
          newMovements.push({
            id: `mov-${Date.now()}-${item.productMatId}`,
            materialId: item.productMatId,
            type: 'salida_venta',
            quantity: item.quantity,
            date: new Date().toISOString(),
            user: currentUser.name,
            notes: `Salida de mostrador por venta folio ${newSale.id} (${item.quantity} ${currentMaterials[matIdx].unit})`
          });

          // Sincronizar actualización de stock en Supabase
          saveRawMaterialToSupabase(currentMaterials[matIdx]).catch(e => console.warn('Supabase stock sync error:', e));
        }
      });
      MockDatabase.saveRawMaterials(currentMaterials);
      MockDatabase.saveStockMovements(newMovements);
      setMaterials(currentMaterials);

      // 2. Incrementar deuda del cliente si es crédito y registrar en Cuentas por Cobrar
      if (paymentType === 'Crédito') {
        const updatedClients = clients.map(c => {
          if (c.id === cartClientId) {
            return {
              ...c,
              currentDebt: c.currentDebt + cartTotals.total
            };
          }
          return c;
        });
        MockDatabase.saveClients(updatedClients);

        // Crear registro formal en Cuentas por Cobrar
        const currentCxc = MockDatabase.getAccountsReceivable();
        const newCxc: AccountReceivable = {
          id: `cxc-${Date.now()}`,
          folio: `CXC-${Math.floor(1000 + Math.random() * 9000)}`,
          clientId: cartClientId,
          clientName: selectedClient?.name || 'Cliente Express',
          saleId: newSale.id,
          concept: `Venta a crédito en mostrador folio ${newSale.id}`,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + (selectedClient?.creditDays || 30) * 86400000).toISOString().split('T')[0],
          creditDays: selectedClient?.creditDays || 30,
          totalAmount: cartTotals.total,
          amountPaid: 0,
          remainingBalance: cartTotals.total,
          status: 'pendiente',
          createdAt: new Date().toISOString(),
          active: true
        };
        MockDatabase.saveAccountsReceivable([newCxc, ...currentCxc]);
        saveAccountReceivableToSupabase(newCxc).catch(e => console.warn('Supabase cxc sync error:', e));
      }

      // 3. Crear automáticamente Ruta de Entrega para el repartidor
      const currentRoutes = MockDatabase.getDeliveryRoutes();
      const newRoute: DeliveryRoute = {
        id: `rut-${Date.now()}`,
        saleId: newSale.id,
        clientName: selectedClient?.name || 'Cliente',
        address: selectedClient?.rfc === 'DLB180412AA1' ? 'Blvd. Adolfo López Mateos 1820, Col. Centro, León, Gto.' : 'Av. Juárez 500, Sector Juárez, Guadalajara, Jal.',
        status: 'pendiente',
        itemsSummary: newSaleItems.map(it => `${it.quantity} Porrones de ${it.productName.split('-')[0]}`).join(', ')
      };
      MockDatabase.saveDeliveryRoutes([newRoute, ...currentRoutes]);

      MockDatabase.addAuditLog(
        currentUser.name,
        `Procesó Venta y Facturación (${billingType})`,
        'Caja y CRM',
        `Folio: ${newSale.id}. Total: $${cartTotals.total.toLocaleString()} MXN. Cliente: ${selectedClient?.name}`
      );

      alert(`¡Venta realizada con éxito!\nFolio: ${newSale.id}\nSe generó orden de entrega logística.`);
    } else {
      MockDatabase.addAuditLog(
        currentUser.name,
        `Generó Cotización CRM`,
        'Caja y CRM',
        `Folio: ${newSale.id}. Cliente: ${selectedClient?.name}`
      );
      alert(`Cotización ${newSale.id} guardada en el CRM del cliente.`);
    }

    // Resetear Carrito
    setCartItems([]);
    setCartClientId('');
    loadDatabase();
  };

  // Convertir Cotización a Pedido Activo
  const handleConvertQuote = (saleId: string) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    // Verificar stock de producto terminado
    let stockCheckPassed = true;
    const currentMaterials = [...materials];
    const newMovements = [...MockDatabase.getStockMovements()];

    // Mapear items de cotización a stock
    const isMezclaPastel = targetSale.items.find(it => it.productName.includes('Pastel'));
    const isGelatina = targetSale.items.find(it => it.productName.includes('Gelatina'));

    const itemsToCheck = [
      { id: 'pt-1', qty: isMezclaPastel ? isMezclaPastel.quantity : 0 },
      { id: 'pt-2', qty: isGelatina ? isGelatina.quantity : 0 }
    ].filter(i => i.qty > 0);

    itemsToCheck.forEach(it => {
      const matIdx = currentMaterials.findIndex(m => m.id === it.id);
      if (matIdx !== -1 && currentMaterials[matIdx].stock < it.qty) {
        stockCheckPassed = false;
      }
    });

    if (!stockCheckPassed) {
      alert("No hay suficiente stock en almacén para surtir esta cotización. Programa producción.");
      return;
    }

    // Descontar Stock
    itemsToCheck.forEach(it => {
      const matIdx = currentMaterials.findIndex(m => m.id === it.id);
      if (matIdx !== -1) {
        currentMaterials[matIdx].stock -= it.qty;
        newMovements.push({
          id: `mov-${Date.now()}-${it.id}`,
          materialId: it.id,
          type: 'salida_venta',
          quantity: it.qty,
          date: new Date().toISOString(),
          user: currentUser.name,
          notes: `Conversión de Cotización ${saleId} a Pedido Activo`
        });
      }
    });
    MockDatabase.saveRawMaterials(currentMaterials);
    MockDatabase.saveStockMovements(newMovements);

    // Actualizar estatus de venta
    const updatedSales = sales.map(s => {
      if (s.id === saleId) {
        return {
          ...s,
          status: 'Pedido Activo' as const
        };
      }
      return s;
    });
    MockDatabase.saveSales(updatedSales);

    // Crear Ruta Logística
    const currentRoutes = MockDatabase.getDeliveryRoutes();
    const newRoute: DeliveryRoute = {
      id: `rut-${Date.now()}`,
      saleId: targetSale.id,
      clientName: targetSale.clientName,
      address: 'Dirección Registrada CRM',
      status: 'pendiente',
      itemsSummary: targetSale.items.map(it => `${it.quantity} Porrones de ${it.productName.split('-')[0]}`).join(', ')
    };
    MockDatabase.saveDeliveryRoutes([newRoute, ...currentRoutes]);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Convirtió Cotización en Pedido Surtido`,
      'CRM Ventas',
      `Cotización convertida: ${saleId}`
    );

    loadDatabase();
    alert(`La Cotización ${saleId} ha sido surtida y enviada a la cola logística del Repartidor.`);
  };

  // REGISTRAR ABONO (COBRANZA)
  const handleRegisterAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCobranzaClientId || paymentAmount <= 0) return;

    const client = clients.find(c => c.id === selectedCobranzaClientId);
    if (!client) return;

    if (paymentAmount > client.currentDebt) {
      alert("El abono no puede superar la deuda actual del cliente.");
      return;
    }

    const updatedClients = clients.map(c => {
      if (c.id === selectedCobranzaClientId) {
        return {
          ...c,
          currentDebt: c.currentDebt - paymentAmount
        };
      }
      return c;
    });

    MockDatabase.saveClients(updatedClients);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Registró Cobranza / Abono Crédito`,
      'Finanzas',
      `Cliente: ${client.name}. Recibido: $${paymentAmount} MXN. Observación: ${paymentNotes}`
    );

    // Agregar registro de pago a ventas para reportar como ingreso de contado en caja
    const newAbonoSale: Sale = {
      id: `ABO-${Math.floor(100 + Math.random() * 900)}`,
      clientId: selectedCobranzaClientId,
      clientName: client.name,
      items: [
        { id: `ab-${Date.now()}`, productName: `Abono a Cuenta Crédito - Ref: ${paymentNotes || 'Abono'}`, quantity: 1, unit: 'pago', unitPrice: paymentAmount, total: paymentAmount }
      ],
      subtotal: paymentAmount,
      tax: 0,
      total: paymentAmount,
      paymentType: 'Contado',
      status: 'Entregado',
      billingType: 'Remisión',
      createdAt: new Date().toISOString(),
      amountPaid: paymentAmount
    };
    const currentSales = MockDatabase.getSales();
    MockDatabase.saveSales([newAbonoSale, ...currentSales]);

    setSelectedCobranzaClientId('');
    setPaymentAmount(1000);
    setPaymentNotes('');
    loadDatabase();
    alert(`Cobro de abono registrado correctamente. Saldo de ${client.name} actualizado.`);
  };

  // Crear Cliente Nuevo (CRM)
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmClientName || !crmClientRFC) return;

    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: crmClientName,
      rfc: crmClientRFC,
      email: crmClientEmail || 'contacto@cliente.com',
      phone: 'S/N',
      priceList: crmClientPriceList,
      creditDays: crmClientPriceList === 'Distribuidor' ? 30 : 0,
      creditLimit: crmClientPriceList === 'Distribuidor' ? 50000 : 0,
      currentDebt: 0
    };

    const updatedClients = [...clients, newClient];
    MockDatabase.saveClients(updatedClients);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Registró nuevo cliente CRM`,
      'CRM Clientes',
      `Cliente: ${crmClientName}, Tarifa: ${crmClientPriceList}`
    );

    setCrmClientName('');
    setCrmClientRFC('');
    setCrmClientEmail('');
    loadDatabase();
    alert(`Cliente registrado en el CRM con tarifa: ${crmClientPriceList}`);
  };

  // Transfer Sheet Handlers
  const handleAddTsItem = () => {
    setTsItems([...tsItems, { quantity: 1, unit: 'LTS', description: '', unitPrice: 0, total: 0 }]);
  };

  const handleUpdateTsItem = (index: number, field: keyof TransferSheetItem, value: any) => {
    const updated = [...tsItems];
    const item = { ...updated[index] };
    if (field === 'quantity') {
      item.quantity = Number(value) || 0;
    } else if (field === 'unitPrice') {
      item.unitPrice = Number(value) || 0;
    } else if (field === 'unit') {
      item.unit = value;
    } else if (field === 'description') {
      item.description = value;
    }
    item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    updated[index] = item;
    setTsItems(updated);
  };

  const handleRemoveTsItem = (index: number) => {
    setTsItems(tsItems.filter((_, i) => i !== index));
  };

  const handleSaveTransferSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsClientName || tsItems.length === 0) {
      alert('Por favor complete los datos obligatorios y al menos un producto.');
      return;
    }

    const sanitizedItems = tsItems.map(it => ({
      quantity: Number(it.quantity || 0),
      unit: it.unit || 'LTS',
      description: it.description || '',
      unitPrice: Number(it.unitPrice || 0),
      total: Number(it.quantity || 0) * Number(it.unitPrice || 0)
    }));

    const subtotal = sanitizedItems.reduce((acc, item) => acc + (item.total || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    const newSheet: TransferSheet = {
      id: `ts-${Date.now()}`,
      folio: tsFolio,
      date: tsDate,
      expeditedIn: tsExpeditedIn,
      elaboratedBy: tsElaboratedBy,
      clientName: tsClientName,
      destination: tsDestination,
      address: tsAddress,
      cp: tsCp,
      colonia: tsColonia,
      fiscalRegimen: tsFiscalRegimen,
      phone: tsPhone,
      clientNo: tsClientNo,
      rfc: tsRfc,
      curp: tsCurp,
      paymentForm: tsPaymentForm,
      operator: tsOperator,
      plateNo: tsPlateNo,
      items: sanitizedItems,
      subtotal,
      tax,
      total,
      notes: tsNotes,
      createdAt: new Date().toISOString()
    };

    const updated = [newSheet, ...transferSheets];
    const prevSheetsCount = transferSheets.length;
    MockDatabase.saveTransferSheets(updated);
    MockDatabase.addAuditLog(currentUser.name, 'Guardó Hoja de Traslado de Productos', 'Ventas / Traslado', `Folio: ${tsFolio}`);
    
    // Registrar Telemetría de Guardado
    recordSaveTelemetry({
      table: 'transfer_sheets',
      folio: tsFolio,
      action: 'Hoja de Traslado de Productos Guardada',
      countBefore: prevSheetsCount,
      countAfter: prevSheetsCount + 1,
      status: 'success',
      payloadSummary: `Destino: ${tsDestination} • Cliente: ${tsClientName} • Total: $${Number(total || 0).toFixed(2)}`,
      source: 'cloud_sync'
    });

    setTransferSheets(updated);
    setShowCreateTransferModal(false);
    setSelectedTransferSheet(newSheet);
    setShowViewTransferModal(true);
    alert(`Hoja de Traslado de Productos ${tsFolio} guardada correctamente.`);
  };

  // Sale Note Handlers
  const handleAddSnItem = () => {
    setSnItems([...snItems, { pieces: 1, product: '', unitPrice: 0, total: 0 }]);
  };

  const handleUpdateSnItem = (index: number, field: keyof SaleNoteItem, value: any) => {
    const updated = [...snItems];
    const item = { ...updated[index] };
    if (field === 'pieces') {
      item.pieces = Number(value) || 0;
    } else if (field === 'unitPrice') {
      item.unitPrice = Number(value) || 0;
    } else if (field === 'product') {
      item.product = value;
    }
    item.total = Number(item.pieces || 0) * Number(item.unitPrice || 0);
    updated[index] = item;
    setSnItems(updated);
  };

  const handleRemoveSnItem = (index: number) => {
    setSnItems(snItems.filter((_, i) => i !== index));
  };

  const handleSaveSaleNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snClientName || snItems.length === 0) {
      alert('Por favor complete los datos obligatorios y al menos un producto.');
      return;
    }

    const sanitizedItems = snItems.map(it => ({
      pieces: Number(it.pieces || 0),
      product: it.product || '',
      unitPrice: Number(it.unitPrice || 0),
      total: Number(it.pieces || 0) * Number(it.unitPrice || 0)
    }));

    const subtotal = sanitizedItems.reduce((acc, item) => acc + (item.total || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    const newNote: SaleNote = {
      id: `sn-${Date.now()}`,
      noteNo: snNoteNo,
      date: snDate,
      clientName: snClientName,
      phone: snPhone,
      city: snCity,
      items: sanitizedItems,
      subtotal,
      tax,
      total,
      createdAt: new Date().toISOString()
    };

    const updated = [newNote, ...saleNotes];
    const prevNotesCount = saleNotes.length;
    MockDatabase.saveSaleNotes(updated);
    MockDatabase.addAuditLog(currentUser.name, 'Guardó Nota de Venta', 'Ventas / Notas', `Nota No: ${snNoteNo}`);
    
    // Registrar Telemetría de Guardado
    recordSaveTelemetry({
      table: 'sale_notes',
      folio: `NOTA-${snNoteNo}`,
      action: 'Nota de Venta Guardada',
      countBefore: prevNotesCount,
      countAfter: prevNotesCount + 1,
      status: 'success',
      payloadSummary: `Cliente: ${snClientName} • Ciudad: ${snCity} • Total: $${Number(total || 0).toFixed(2)}`,
      source: 'cloud_sync'
    });
    setSaleNotes(updated);
    setShowCreateNoteModal(false);
    setSelectedSaleNote(newNote);
    setShowViewNoteModal(true);
    alert(`Nota de Venta No. ${snNoteNo} guardada correctamente.`);
  };

  const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="sales_root">
      
      {/* Top Header - Pantone #032B4E with unencapsulated logo, title & subtitle (Visible only on Desktop lg:) */}
      <header className="hidden lg:flex bg-[#032B4E] text-white shadow-md py-3.5 px-4 md:px-6 justify-between items-center shrink-0 border-b border-[#043b6b]">
        <div className="flex items-center space-x-3.5">
          <img 
            src={MIAULOO_LOGO} 
            alt="Miauloo" 
            className="h-10 md:h-11 w-auto object-contain shrink-0" 
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs font-extrabold tracking-wider text-sky-300 uppercase">
                Miauloo • Soluciones integrales de abasto
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
              Atención a Clientes y Caja Rápida
            </h1>
            <p className="text-xs text-sky-200/80">
              Vendedor activo: <span className="text-purple-300 font-semibold">{currentUser?.name || 'Vendedor'}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-xs border border-white/20 cursor-pointer"
          id="btn_sales_logout"
        >
          Cerrar Sesión Ventas
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* TAB 1: POINT OF SALE */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            {/* Feedback Alert Banner */}
            {posFeedback && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-xs ${
                posFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {posFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{posFeedback.text}</span>
              </div>
            )}

            {/* Subview Switcher & Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPosSubView('pos')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posSubView === 'pos'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Caja / Venta en Mostrador</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosSubView('products')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posSubView === 'products'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Catálogo de Productos & Insumos ({materials.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPosSubView('history')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    posSubView === 'history'
                      ? 'bg-white text-purple-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Historial de Ventas ({sales.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateProduct}
                  className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Registrar Producto / Materia Prima</span>
                </button>

                <button
                  type="button"
                  onClick={loadDatabase}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  title="Actualizar inventario"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {posSubView === 'history' ? (
              <SalesOrdersManager currentUser={currentUser} onGoToPOS={() => setPosSubView('pos')} />
            ) : posSubView === 'products' ? (
              <AdminRawMaterialsManager currentUser={currentUser} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Catalog of Products and Raw Materials */}
            <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-700" />
                    <span>Catálogo de Productos y Materias Primas</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Venta directa por cantidad ({filteredCatalogProducts.length} artículos disponibles)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateProduct}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 w-fit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Artículo</span>
                </button>
              </div>

              {/* Client Selector in POS */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Paso 1: Seleccionar Cliente y Tarifa de Venta</label>
                <select
                  value={cartClientId}
                  onChange={(e) => setCartClientId(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 font-semibold"
                  required
                >
                  <option value="">-- Elige un cliente para asignar tarifa --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Lista: {c.priceList})</option>
                  ))}
                </select>
                {selectedClient && (
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100 mt-2 text-[11px] text-purple-900 flex flex-wrap justify-between items-center gap-2">
                    <span>Tarifa Aplicada: <b>{selectedClient.priceList}</b> ({selectedClient.priceList === 'Distribuidor' ? '20% desc.' : selectedClient.priceList === 'Mayoreo' ? '12% desc.' : 'Precio Mostrador'})</span>
                    {selectedClient.creditLimit > 0 && (
                      <span>Crédito Disponible: <b>${Math.max(0, selectedClient.creditLimit - selectedClient.currentDebt).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</b> (Límite: ${selectedClient.creditLimit.toLocaleString('es-MX')})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Search and Category Filter */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por código de producto interno (SKU), nombre o lote..."
                      value={posSearchTerm}
                      onChange={(e) => setPosSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        catalogCategory === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos ({materials.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('finished')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        catalogCategory === 'finished'
                          ? 'bg-purple-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Terminados
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('raw')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        catalogCategory === 'raw'
                          ? 'bg-amber-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Materias Primas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('in_stock')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                        catalogCategory === 'in_stock'
                          ? 'bg-emerald-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      En Stock
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {filteredCatalogProducts.length === 0 ? (
                  <div className="col-span-2 text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-semibold">No se encontraron artículos con los criterios seleccionados</p>
                    <button
                      type="button"
                      onClick={handleOpenCreateProduct}
                      className="mt-3 px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Nuevo Producto
                    </button>
                  </div>
                ) : (
                  filteredCatalogProducts.map((prod) => {
                    const clientPrice = getProductPriceForClient(prod.id, cartClientId);
                    const basePrice = getBasePrices(prod.id);
                    const isAgotado = prod.stock <= 0;
                    const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;
                    const isActive = prod.active ?? true;
                    const currentQty = productQuantities[prod.id] ?? 1;

                    return (
                      <div 
                        key={prod.id} 
                        className={`p-3.5 border rounded-xl transition-all flex flex-col justify-between space-y-3 bg-white ${
                          !isActive
                            ? 'opacity-65 border-slate-200 bg-slate-50/50'
                            : isAgotado 
                              ? 'border-rose-200 bg-rose-50/10' 
                              : isLowStock
                                ? 'border-amber-200 bg-amber-50/10 hover:border-amber-300 shadow-xs'
                                : 'hover:border-purple-300 border-slate-200 shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Card Top: Sku Code, Active Status, and Action Buttons */}
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                Cód: {prod.sku}
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                                isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-200 text-slate-600 border-slate-300'
                              }`}>
                                {isActive ? 'Activo' : 'Desactivado'}
                              </span>
                            </div>

                            {/* Row Action Buttons: Ver, Editar, Ajustar Stock, Desactivar, Borrar */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenViewProduct(prod)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                                title="Ver Ficha Técnica"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(prod)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-amber-700 rounded transition-colors"
                                title="Editar Producto / Materia Prima"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(prod)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-purple-700 rounded transition-colors"
                                title="Ajustar Stock"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleProductActive(prod)}
                                className={`p-1 hover:bg-slate-100 rounded transition-colors ${
                                  isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                                }`}
                                title={isActive ? 'Desactivar producto' : 'Activar producto'}
                              >
                                {isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar Producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Product Name */}
                          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2" title={prod.name}>
                            {prod.name}
                          </h4>

                          {/* Pricing */}
                          <div className="flex items-baseline space-x-2 mt-1.5">
                            <span className="text-base font-black text-slate-950">
                              ${clientPrice.toFixed(2)} MXN
                            </span>
                            <span className="text-[10px] text-slate-400">/ {prod.unit}</span>
                            {cartClientId && selectedClient?.priceList !== 'Público' && clientPrice < basePrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ${basePrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock Status & Quantity Add Bar */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`font-bold flex items-center gap-1 ${
                              isAgotado 
                                ? 'text-rose-600' 
                                : isLowStock 
                                  ? 'text-amber-600' 
                                  : 'text-emerald-700'
                            }`}>
                              {isAgotado ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  <span>AGOTADO</span>
                                </>
                              ) : isLowStock ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  <span>Bajo Stock: {prod.stock} {prod.unit}</span>
                                </>
                              ) : (
                                <span>Stock: {prod.stock} {prod.unit}</span>
                              )}
                            </span>

                            {prod.loteProveedor && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Lote: {prod.loteProveedor}
                              </span>
                            )}
                          </div>

                          {/* Quantity Selector & Add Button */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden w-24 shrink-0">
                              <input
                                type="number"
                                min={prod.unit === 'pzs' ? 1 : 0.1}
                                step={prod.unit === 'pzs' ? 1 : 0.5}
                                value={currentQty}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setProductQuantities(prev => ({
                                    ...prev,
                                    [prod.id]: isNaN(val) ? 1 : Math.max(0.1, val)
                                  }));
                                }}
                                className="w-full text-center text-xs font-bold py-1 bg-transparent focus:outline-none"
                                title={`Cantidad a vender en ${prod.unit}`}
                              />
                              <span className="text-[9px] font-bold text-slate-400 pr-1.5 uppercase select-none">
                                {prod.unit}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => addToCart(prod.id, currentQty)}
                              className="flex-1 bg-slate-900 hover:bg-purple-900 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                              disabled={!cartClientId || isAgotado || !isActive}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Añadir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Shopping Cart checkout pane */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800 space-y-5 h-fit sticky top-6">
              <h3 className="text-base font-semibold border-b border-slate-800 pb-3 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-1.5 text-purple-400 animate-bounce" /> Resumen de Pedido / Cotización
              </h3>

              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Por favor, añade productos al carrito desde la izquierda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items list */}
                  <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto">
                    {cartItems.map((item) => {
                      const mat = materials.find(m => m.id === item.productMatId)!;
                      const price = getProductPriceForClient(item.productMatId, cartClientId);
                      const itemTotal = price * item.quantity;

                      return (
                        <div key={item.productMatId} className="py-3 flex justify-between items-center text-xs">
                          <div className="flex-1 pr-3">
                            <p className="font-bold text-slate-200">{mat.name.split('-')[0]}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">${price.toFixed(2)} MXN / pz</p>
                          </div>

                          <div className="flex items-center space-x-2.5">
                            <button onClick={() => updateCartQty(item.productMatId, -1)} className="bg-slate-800 p-1 rounded hover:bg-slate-700">
                              <Minus className="w-3 h-3 text-slate-300" />
                            </button>
                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.productMatId, 1)} className="bg-slate-800 p-1 rounded hover:bg-slate-700">
                              <Plus className="w-3 h-3 text-slate-300" />
                            </button>
                            
                            <span className="font-bold text-white w-20 text-right">${itemTotal.toLocaleString()}</span>
                            
                            <button onClick={() => removeFromCart(item.productMatId)} className="text-red-400 hover:text-red-500 pl-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pricing break downs */}
                  <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>${cartTotals.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IVA (16%):</span>
                      <span>${cartTotals.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm border-t border-slate-800 pt-2 text-white">
                      <span>TOTAL COBRAR:</span>
                      <span>${cartTotals.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                    </div>
                  </div>

                  {/* Checkout Options */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Método de Liquidación</label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                      >
                        <option value="Contado">Pago de Contado</option>
                        <option value="Crédito">Crédito Comercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Tipo de Factura</label>
                      <select
                        value={billingType}
                        onChange={(e) => setBillingType(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-xs"
                      >
                        <option value="Remisión">Nota / Remisión Simple</option>
                        <option value="CFDI">Factura CFDI 4.0 SAT</option>
                      </select>
                    </div>
                  </div>

                  {/* Credit Overdue warning */}
                  {exceedsCreditLimit && (
                    <div className="bg-red-900/50 border border-red-700 p-3 rounded-lg flex items-start space-x-2 text-red-100 text-xs">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <div>
                        <p className="font-bold">Crédito Excedido</p>
                        <p className="text-[10px] text-red-200 mt-0.5">El cliente excede su límite por ${missingCreditAmount?.toLocaleString()} MXN. Venta bloqueada temporalmente.</p>
                      </div>
                    </div>
                  )}

                  {/* Checkout Actions Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => handleCheckout(false)}
                      disabled={isStamping || exceedsCreditLimit}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-slate-950 font-black py-3 rounded-lg text-xs transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {isStamping ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Timbrando Factura en el SAT...
                        </>
                      ) : (
                        'EMITIR COMPROBANTE Y ENVIAR LOGÍSTICA'
                      )}
                    </button>

                    <button
                      onClick={() => handleCheckout(true)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-bold transition-all border border-slate-700"
                    >
                      Guardar como Cotización CRM
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
            )}
          </div>
        )}

        {/* TAB 2: CLIENTES Y PROSPECTOS (CRM) */}
        {activeTab === 'crm' && (
          <ClientsManager currentUser={currentUser} />
        )}

        {/* TAB 3: CUENTAS POR COBRAR (COBRANZA Y CRÉDITOS) */}
        {activeTab === 'cobranza' && (
          <AccountsReceivableManager currentUser={currentUser} />
        )}


        {/* TAB 4: TRASLADO DE PRODUCTOS */}
        {activeTab === 'traslado' && (
          <TransferSheetsManager currentUser={currentUser} />
        )}

        {/* TAB 5: NOTAS DE VENTA */}
        {activeTab === 'notas' && (
          <SaleNotesManager currentUser={currentUser} />
        )}

      </main>

      {/* MODAL: REGISTRAR HOJA DE TRASLADO */}
      {showCreateTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-200">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-purple-600" />
                  Registrar Formulario: Hoja de Traslado de Productos
                </h3>
                <p className="text-xs text-slate-500">Ingrese los datos para la plantilla oficial de traslado de insumos/productos.</p>
              </div>
              <button 
                onClick={() => setShowCreateTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransferSheet} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700">Folio *</label>
                  <input
                    type="text"
                    value={tsFolio}
                    onChange={(e) => setTsFolio(e.target.value)}
                    required
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Fecha *</label>
                  <input
                    type="date"
                    value={tsDate}
                    onChange={(e) => setTsDate(e.target.value)}
                    required
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Lugar de Expedición</label>
                  <input
                    type="text"
                    value={tsExpeditedIn}
                    onChange={(e) => setTsExpeditedIn(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Elaborado Por</label>
                  <input
                    type="text"
                    value={tsElaboratedBy}
                    onChange={(e) => setTsElaboratedBy(e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 border-b pb-1">Datos del Cliente y Destino</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600">Cliente *</label>
                    <input
                      type="text"
                      value={tsClientName}
                      onChange={(e) => setTsClientName(e.target.value)}
                      required
                      placeholder="Nombre del Cliente"
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Destino</label>
                    <input
                      type="text"
                      value={tsDestination}
                      onChange={(e) => setTsDestination(e.target.value)}
                      placeholder="Ciudad / Municipio"
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Dirección</label>
                    <input
                      type="text"
                      value={tsAddress}
                      onChange={(e) => setTsAddress(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">C.P. / Colonia</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tsCp}
                        onChange={(e) => setTsCp(e.target.value)}
                        placeholder="CP"
                        className="w-1/3 mt-1 p-2 border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={tsColonia}
                        onChange={(e) => setTsColonia(e.target.value)}
                        placeholder="Colonia"
                        className="w-2/3 mt-1 p-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Teléfono</label>
                    <input
                      type="text"
                      value={tsPhone}
                      onChange={(e) => setTsPhone(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Forma de Pago</label>
                    <input
                      type="text"
                      value={tsPaymentForm}
                      onChange={(e) => setTsPaymentForm(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">R.F.C. / CURP</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tsRfc}
                        onChange={(e) => setTsRfc(e.target.value)}
                        placeholder="RFC"
                        className="w-1/2 mt-1 p-2 border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={tsCurp}
                        onChange={(e) => setTsCurp(e.target.value)}
                        placeholder="CURP"
                        className="w-1/2 mt-1 p-2 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Operador (Chofer)</label>
                    <input
                      type="text"
                      value={tsOperator}
                      onChange={(e) => setTsOperator(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">No. De Placas</label>
                    <input
                      type="text"
                      value={tsPlateNo}
                      onChange={(e) => setTsPlateNo(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="font-bold text-slate-800">Detalle de Insumos / Productos en Traslado</h4>
                  <button
                    type="button"
                    onClick={handleAddTsItem}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] px-3 py-1 rounded flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Fila
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700">
                        <th className="p-2.5 w-24">Cantidad</th>
                        <th className="p-2.5 w-24">Unidad</th>
                        <th className="p-2.5">Descripción del Producto / Insumo</th>
                        <th className="p-2.5 w-28">P/U ($)</th>
                        <th className="p-2.5 w-28 text-right">Importe ($)</th>
                        <th className="p-2.5 w-12 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tsItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateTsItem(idx, 'quantity', e.target.value)}
                              className="w-full p-1.5 border rounded text-center"
                              min="1"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateTsItem(idx, 'unit', e.target.value)}
                              className="w-full p-1.5 border rounded uppercase"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateTsItem(idx, 'description', e.target.value)}
                              placeholder="Ej. SOSA CAUSTICA 1L"
                              className="w-full p-1.5 border rounded font-semibold uppercase"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateTsItem(idx, 'unitPrice', e.target.value)}
                              className="w-full p-1.5 border rounded text-right"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            ${(item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveTsItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 text-xs bg-slate-50 p-3 rounded-lg border">
                    <div className="flex justify-between font-semibold">
                      <span>SUBTOTAL:</span>
                      <span>${tsItems.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>I.V.A.:</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-purple-900 border-t pt-1">
                      <span>TOTAL:</span>
                      <span>${tsItems.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Leyenda Oficial de Recepción / Observaciones</label>
                <textarea
                  rows={2}
                  value={tsNotes}
                  onChange={(e) => setTsNotes(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-xs"
                />
              </div>
              </div>

              <div className="flex justify-end space-x-3 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow flex items-center"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Hoja de Traslado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NOTA DE VENTA */}
      {showCreateNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-200">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-200 bg-white shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-purple-600" />
                  Registrar Formulario: Nota de Venta Miauloo
                </h3>
                <p className="text-xs text-slate-500">Ingrese los datos para la nota de venta física en sucursal.</p>
              </div>
              <button 
                onClick={() => setShowCreateNoteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSaleNote} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700">No. Nota *</label>
                    <input
                      type="text"
                      value={snNoteNo}
                      onChange={(e) => setSnNoteNo(e.target.value)}
                      required
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded font-bold text-purple-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Fecha *</label>
                    <input
                      type="date"
                      value={snDate}
                      onChange={(e) => setSnDate(e.target.value)}
                      required
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Teléfono Contacto</label>
                    <input
                      type="text"
                      value={snPhone}
                      onChange={(e) => setSnPhone(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-700">Nombre del Cliente *</label>
                    <input
                      type="text"
                      value={snClientName}
                      onChange={(e) => setSnClientName(e.target.value)}
                      required
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Ciudad / Municipio</label>
                    <input
                      type="text"
                      value={snCity}
                      onChange={(e) => setSnCity(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1">
                    <h4 className="font-bold text-slate-800">Conceptos / Productos</h4>
                    <button
                      type="button"
                      onClick={handleAddSnItem}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] px-3 py-1 rounded flex items-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Producto
                    </button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700">
                          <th className="p-2.5 w-24">Pieza</th>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5 w-28">P.U ($)</th>
                          <th className="p-2.5 w-28 text-right">Importe ($)</th>
                          <th className="p-2.5 w-12 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {snItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.pieces}
                                onChange={(e) => handleUpdateSnItem(idx, 'pieces', e.target.value)}
                                className="w-full p-1.5 border rounded text-center"
                                min="1"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleUpdateSnItem(idx, 'product', e.target.value)}
                                placeholder="Ej. SOSA CAUSTICA LIQUIDA 1L"
                                className="w-full p-1.5 border rounded uppercase font-medium"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateSnItem(idx, 'unitPrice', e.target.value)}
                                className="w-full p-1.5 border rounded text-right"
                                step="0.01"
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              ${(item.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSnItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1 text-xs bg-slate-50 p-3 rounded-lg border">
                      <div className="flex justify-between font-semibold">
                        <span>SUBTOTAL:</span>
                        <span>${snItems.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>IVA:</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-purple-900 border-t pt-1">
                        <span>TOTAL:</span>
                        <span>${snItems.reduce((acc, i) => acc + (i.total || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateNoteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow flex items-center"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Nota de Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER / IMPRIMIR HOJA DE TRASLADO DE PRODUCTOS (PLANTILLA OFICIAL BASADA EN IMAGEN 1) */}
      {showViewTransferModal && selectedTransferSheet && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden shrink-0">
              <span className="font-bold text-sm flex items-center">
                <Truck className="w-4 h-4 mr-2 text-purple-400" />
                Vista Previa Oficial: Hoja de Traslado {selectedTransferSheet.folio}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportTransferSheetToPDF(selectedTransferSheet)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow cursor-pointer"
                  title="Descargar Hoja de Traslado en PDF Oficial"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Descargar PDF
                </button>
                <button
                  onClick={() => printElement('printable-transfer-sheet', `Hoja_Traslado_${selectedTransferSheet.folio}`)}
                  className="bg-[#0B2545] hover:bg-[#133966] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow cursor-pointer"
                  title="Mandar a imprimir directamente a la impresora"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowViewTransferModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-transfer-sheet" className="p-6 sm:p-8 text-slate-900 bg-white font-sans text-xs space-y-4 overflow-y-auto flex-1">
              <div className="bg-[#0B2545] text-white font-extrabold text-center py-2 text-base uppercase tracking-widest rounded-t border border-[#0B2545]">
                HOJA DE TRASLADO DE PRODUCTOS
              </div>

              <div className="grid grid-cols-12 border border-[#0B2545] text-[11px]">
                <div className="col-span-4 p-3 border-r border-[#0B2545] flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <img 
                    src={MIAULOO_LOGO} 
                    alt="Miauloo" 
                    className="h-12 w-auto object-contain mb-1.5" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-bold text-[9px] uppercase leading-tight text-[#0B2545]">
                    SOLUCIONES INTEGRALES DE ABASTO, LIMPIEZA Y RECOLECCION
                  </span>
                </div>

                <div className="col-span-8 grid grid-cols-2 divide-x divide-y divide-[#0B2545] text-[10px]">
                  <div className="p-1.5">
                    <span className="font-bold">RFC:</span> {selectedTransferSheet.rfc || 'BAMN8611098PA'}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">E-MAIL:</span> miauloosolucionesintegrales@gmail.com
                  </div>
                  <div className="p-1.5 col-span-2">
                    <span className="font-bold">MOVIL:</span> {selectedTransferSheet.phone || '(52) 427 116 9640'}
                  </div>
                  <div className="p-1.5 col-span-2">
                    <span className="font-bold">Expedido en:</span> Sta. Cruz 71, La Loma, 76804 San Juan del Río, Qro.
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Fecha:</span> {selectedTransferSheet.date}
                  </div>
                  <div className="p-1.5 font-bold text-purple-900 bg-purple-50/50">
                    Folio: {selectedTransferSheet.folio}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Lugar de expedición:</span> {selectedTransferSheet.expeditedIn || 'San Juan del Rio, Qro.'}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Elaborado por:</span> {selectedTransferSheet.elaboratedBy || 'Areli Antonia Mireles Cruz'}
                  </div>
                </div>
              </div>

              <div className="border border-[#0B2545] p-2 text-[10px] space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-bold">Cliente:</span> <span className="uppercase font-semibold">{selectedTransferSheet.clientName}</span></div>
                  <div><span className="font-bold">Destino:</span> <span className="uppercase">{selectedTransferSheet.destination}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">Dirección:</span> {selectedTransferSheet.address}</div>
                  <div><span className="font-bold">C.P.:</span> {selectedTransferSheet.cp}</div>
                  <div><span className="font-bold">Colonia:</span> {selectedTransferSheet.colonia}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">Regimen fiscal:</span> {selectedTransferSheet.fiscalRegimen}</div>
                  <div><span className="font-bold">Tel:</span> {selectedTransferSheet.phone}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">No. De Cliente:</span> {selectedTransferSheet.clientNo}</div>
                  <div><span className="font-bold">R.F.C.:</span> {selectedTransferSheet.rfc}</div>
                  <div><span className="font-bold">CURP:</span> {selectedTransferSheet.curp}</div>
                </div>
                <div className="border-t border-slate-200 pt-1">
                  <span className="font-bold">FORMA DE PAGO:</span> {selectedTransferSheet.paymentForm}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1 bg-slate-50 p-1">
                  <div><span className="font-bold">Operador:</span> {selectedTransferSheet.operator}</div>
                  <div><span className="font-bold">No. De Placas:</span> {selectedTransferSheet.plateNo}</div>
                </div>
              </div>

              <div className="border border-[#0B2545] overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#0B2545] text-white font-bold uppercase text-[10px]">
                      <th className="p-2 border-r border-[#0B2545] text-center w-16">Cantidad</th>
                      <th className="p-2 border-r border-[#0B2545] text-center w-16">Unidad</th>
                      <th className="p-2 border-r border-[#0B2545]">Descripción</th>
                      <th className="p-2 border-r border-[#0B2545] text-right w-24">P/U</th>
                      <th className="p-2 text-right w-28">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {selectedTransferSheet.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center border-r font-medium">{it.quantity}</td>
                        <td className="p-2 text-center border-r font-medium uppercase">{it.unit}</td>
                        <td className="p-2 border-r font-semibold uppercase">{it.description}</td>
                        <td className="p-2 text-right border-r">${Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${Number(it.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - selectedTransferSheet.items.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-64 border border-[#0B2545] divide-y divide-[#0B2545] text-[11px]">
                  <div className="p-1.5 flex justify-between font-bold">
                    <span>SUBTOTAL:</span>
                    <span>${Number(selectedTransferSheet.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between">
                    <span>I.V.A:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-slate-100 text-[#0B2545]">
                    <span>TOTAL:</span>
                    <span>${Number(selectedTransferSheet.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-[#0B2545] p-3 space-y-3 bg-slate-50/50">
                <p className="text-[9px] text-justify leading-tight font-medium text-slate-800">
                  <span className="font-bold text-red-700">NOTA:</span> Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: <span className="font-bold">“Recibí mi pedido completo”</span>, su nombre, firma y fecha.
                </p>
                {selectedTransferSheet.notes && (
                  <div className="text-[9px] border-t pt-1">
                    <span className="font-bold">Observaciones:</span> {selectedTransferSheet.notes}
                  </div>
                )}
                
                <div className="pt-8 flex justify-center">
                  <div className="w-64 border-t-2 border-slate-900 text-center text-[10px] pt-1">
                    <p className="font-bold uppercase">{selectedTransferSheet.clientName}</p>
                    <p className="text-[9px] text-slate-500">Acepto de Conformidad (Firma)</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER / IMPRIMIR NOTA DE VENTA (PLANTILLA OFICIAL BASADA EN IMAGEN 2) */}
      {showViewNoteModal && selectedSaleNote && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden shrink-0">
              <span className="font-bold text-sm flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-purple-400" />
                Vista Previa Oficial: Nota de Venta No. {selectedSaleNote.noteNo}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportSaleNoteToPDF(selectedSaleNote)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow cursor-pointer"
                  title="Descargar Nota de Venta en PDF Oficial"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Descargar PDF
                </button>
                <button
                  onClick={() => printSaleNoteReceipt(selectedSaleNote)}
                  className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow cursor-pointer"
                  title="Mandar a imprimir directamente a la impresora"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowViewNoteModal(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="printable-sale-note" className="p-6 sm:p-8 text-slate-900 bg-[#FFFDF9] font-sans text-xs space-y-4 relative overflow-y-auto flex-1">
              <div className="flex justify-between items-start border-b-2 border-[#1E3A8A] pb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={MIAULOO_LOGO} 
                    alt="Miauloo" 
                    className="h-12 w-auto object-contain shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h1 className="text-2xl font-black tracking-wider text-[#1E3A8A] font-serif uppercase">
                      MIAULOO
                    </h1>
                    <p className="text-[8px] italic font-semibold text-cyan-900 max-w-xs leading-snug">
                      &quot;PURIFICAME CON HISOPO, Y SERÉ LIMPIO; LÁVAME, Y SERÉ MÁS BLANCO QUE LA NIEVE&quot;
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="bg-[#1E3A8A] text-white px-3 py-1 rounded font-bold text-sm">
                    NOTA DE VENTA
                  </div>
                  <div className="text-red-600 font-extrabold text-base mt-1">
                    No. {selectedSaleNote.noteNo}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                    FECHA: <span className="underline">{selectedSaleNote.date}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 p-3 rounded border border-amber-200/60 text-[11px] space-y-1">
                <div><span className="font-bold text-[#1E3A8A]">NOMBRE:</span> <span className="uppercase font-semibold">{selectedSaleNote.clientName}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-bold text-[#1E3A8A]">TELÉFONO:</span> {selectedSaleNote.phone}</div>
                  <div><span className="font-bold text-[#1E3A8A]">CIUDAD:</span> {selectedSaleNote.city}</div>
                </div>
              </div>

              <div className="border border-[#1E3A8A] rounded overflow-hidden relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1E3A8A] text-white font-bold text-[10px]">
                      <th className="p-2 text-center w-16 border-r border-blue-800">PIEZA</th>
                      <th className="p-2 border-r border-blue-800">PRODUCTO</th>
                      <th className="p-2 text-right w-24 border-r border-blue-800">P.U</th>
                      <th className="p-2 text-right w-24">IMPORTE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white/80">
                    {selectedSaleNote.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center border-r font-semibold">{it.pieces || 0}</td>
                        <td className="p-2 border-r font-bold uppercase text-slate-800">{it.product || ''}</td>
                        <td className="p-2 text-right border-r">${Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td className="p-2 text-right font-black text-slate-900">${Number(it.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - selectedSaleNote.items.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2 border-r">&nbsp;</td>
                        <td className="p-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-56 border border-[#1E3A8A] rounded divide-y divide-slate-200 text-xs">
                  <div className="p-1.5 flex justify-between font-semibold">
                    <span>SUBTOTAL:</span>
                    <span>${Number(selectedSaleNote.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between text-slate-500">
                    <span>IVA:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-[#1E3A8A] text-white">
                    <span>TOTAL:</span>
                    <span>${Number(selectedSaleNote.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-300 pt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[9px] text-slate-700">
                <div className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="font-semibold">4271169640</span>
                </div>
                <div className="flex items-center space-x-1 col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="truncate">Rio Panuco Ext.35 M. 136 L. 0030 San Cayetano 1A Secc. San Juan del Río, Qro.</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#1E3A8A] via-cyan-700 to-[#1E3A8A] text-white text-center py-1.5 rounded-b font-serif italic text-[11px] shadow-inner">
                &quot;Gracias por su preferencia&quot;
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR / EDITAR PRODUCTO O MATERIA PRIMA */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-700/20 font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingProduct ? 'Editar Producto / Materia Prima' : 'Registrar Nuevo Producto / Materia Prima'}
                  </h2>
                  <p className="text-xs text-slate-500">Parámetros de inventario por cantidad, código interno y precios</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Producto o Materia Prima *</label>
                  <input 
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Ej. Sosa Cáustica Líquida 50%, Harina de Trigo, etc."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium text-slate-800"
                  />
                </div>

                {/* Estatus Activo / Desactivado Toggle */}
                <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Estatus para Venta en Mostrador</p>
                    <p className="text-[11px] text-slate-500">Los productos desactivados no se podrán seleccionar en caja</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProdActive(!prodActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      prodActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {prodActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Producto Activo</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Desactivado</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Código Interno / SKU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Producto Interno (SKU) *</label>
                  <input 
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="PROD-101 o MP-202"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Unidad de Medida */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida *</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="L">Litros (L)</option>
                    <option value="pzs">Piezas (pzs)</option>
                  </select>
                </div>

                {/* Cantidad / Stock Actual */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad / Stock Actual en Almacén *</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Mínimo de Alerta</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-amber-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Costo Unitario */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Unitario ($ MXN)</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={prodCost}
                    onChange={(e) => setProdCost(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Precio de Venta al Público / Mostrador */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Precio de Venta Base ($ MXN)</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={prodSalePrice}
                    onChange={(e) => setProdSalePrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Lote Proveedor / Interno */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lote de Proveedor o Interno</label>
                  <input 
                    type="text"
                    value={prodLote}
                    onChange={(e) => setProdLote(e.target.value)}
                    placeholder="Ej. LOT-2026-X1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Fecha Caducidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Caducidad</label>
                  <input 
                    type="date"
                    value={prodExpiry}
                    onChange={(e) => setProdExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Notas */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones</label>
                  <textarea 
                    rows={2}
                    value={prodNotes}
                    onChange={(e) => setProdNotes(e.target.value)}
                    placeholder="Detalles sobre presentación, condiciones de almacenamiento, etc."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-700/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'Guardar Cambios' : 'Registrar en Inventario y Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VER FICHA DE PRODUCTO / MATERIA PRIMA */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{viewingProduct.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">Código Interno / SKU: {viewingProduct.sku}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-medium">Stock Disponible</p>
                  <p className="text-base font-bold text-slate-900 font-mono">{viewingProduct.stock} {viewingProduct.unit}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Stock Mínimo Alerta</p>
                  <p className="font-semibold text-slate-700 font-mono">{viewingProduct.minStock} {viewingProduct.unit}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Costo por {viewingProduct.unit}</p>
                  <p className="font-bold text-slate-700 font-mono">${viewingProduct.costPerUnit.toFixed(2)} MXN</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Precio de Venta Base</p>
                  <p className="font-bold text-emerald-700 font-mono text-sm">
                    {viewingProduct.salePrice ? `$${viewingProduct.salePrice.toFixed(2)} MXN` : 'Sin precio asignado'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Valor Total en Stock</p>
                  <p className="font-bold text-slate-800 font-mono">
                    ${(viewingProduct.stock * viewingProduct.costPerUnit).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Lote</p>
                  <p className="font-semibold font-mono text-slate-800">{viewingProduct.loteProveedor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Fecha Caducidad</p>
                  <p className="font-semibold text-slate-800">{viewingProduct.expiryDate || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Estatus Mostrador</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border mt-0.5 ${
                    (viewingProduct.active ?? true) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {(viewingProduct.active ?? true) ? '✓ Activo' : '✕ Desactivado'}
                  </span>
                </div>
              </div>

              {viewingProduct.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800">
                  <span className="font-bold block mb-0.5">Notas y Especificaciones:</span>
                  <p>{viewingProduct.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = viewingProduct;
                    setViewingProduct(null);
                    handleOpenEditProduct(p);
                  }}
                  className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar este Artículo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = viewingProduct;
                    setViewingProduct(null);
                    handleOpenAdjust(p);
                  }}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ajustar Stock</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AJUSTAR STOCK RÁPIDO */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ajustar Inventario en Mostrador</h3>
                  <p className="text-xs text-slate-500 font-mono">{adjustingProduct.name} ({adjustingProduct.sku})</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-100 flex justify-between items-center">
                <span className="font-semibold text-purple-900">Stock Actual en Sistema:</span>
                <span className="text-base font-black text-purple-950 font-mono">
                  {adjustingProduct.stock} {adjustingProduct.unit}
                </span>
              </div>

              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      adjustType === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    + Entrada / Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('remove')}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      adjustType === 'remove'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    - Salida / Merma
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      adjustType === 'set'
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    = Fijar Físico
                  </button>
                </div>
              </div>

              {/* Cantidad a ajustar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {adjustType === 'set' ? 'Nuevo Stock Total Exacto' : 'Cantidad a Ajustar'} ({adjustingProduct.unit}) *
                </label>
                <input 
                  type="number"
                  min={0.01}
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificación *</label>
                <input 
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ej. Conteo físico de inventario, recepción de lote, merma por derrame"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-700/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Aplicar Ajuste y Kardex</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
