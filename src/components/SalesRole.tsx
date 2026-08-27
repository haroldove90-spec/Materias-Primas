import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Users, FileCheck, DollarSign, Plus, Minus, 
  Trash2, FileText, Landmark, RefreshCw, Send, CheckCircle, AlertTriangle,
  Truck, Receipt, Eye, Printer, Download, Save, Search, X, Building, Phone, MapPin
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, Client, Sale, OrderItem, DeliveryRoute, User, TransferSheet, TransferSheetItem, SaleNote, SaleNoteItem } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';

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

  // Catálogo de Productos Terminados para la venta
  const finishedProducts = materials.filter(m => m.id.startsWith('pt'));

  // Precios Base (Público General)
  const getBasePrices = (prodId: string) => {
    // pt-1: Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg) -> Público $65
    // pt-2: Polvo Preparado para Gelatina de Fresa (Bolsa 1kg) -> Público $85
    if (prodId === 'pt-1') return 65;
    if (prodId === 'pt-2') return 85;
    return 150; // default fallback
  };

  // Calcular precio del producto de acuerdo a la lista del cliente seleccionado
  const getProductPriceForClient = (prodId: string, clientId: string) => {
    const basePrice = getBasePrices(prodId);
    const client = clients.find(c => c.id === clientId);
    if (!client) return basePrice;

    if (client.priceList === 'Distribuidor') {
      return basePrice * 0.80; // 20% descuento
    } else if (client.priceList === 'Mayoreo') {
      return basePrice * 0.88; // 12% descuento
    }
    return basePrice; // Público
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
  const addToCart = (prodId: string) => {
    const existing = cartItems.find(item => item.productMatId === prodId);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.productMatId === prodId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCartItems([...cartItems, { productMatId: prodId, quantity: 1 }]);
    }
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.productMatId === prodId) {
        const newQty = item.quantity + delta;
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
        productName: mat.name,
        quantity: item.quantity,
        unit: 'pzs',
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
      // 1. Descontar Stock de Producto Terminado
      const currentMaterials = [...materials];
      const movements = MockDatabase.getStockMovements();
      const newMovements = [...movements];

      cartItems.forEach(item => {
        const matIdx = currentMaterials.findIndex(m => m.id === item.productMatId);
        if (matIdx !== -1) {
          currentMaterials[matIdx].stock = Math.max(0, currentMaterials[matIdx].stock - item.quantity);
          
          newMovements.push({
            id: `mov-${Date.now()}-${item.productMatId}`,
            materialId: item.productMatId,
            type: 'salida_venta',
            quantity: item.quantity,
            date: new Date().toISOString(),
            user: currentUser.name,
            notes: `Salida de almacén por venta folio ${newSale.id}`
          });
        }
      });
      MockDatabase.saveRawMaterials(currentMaterials);
      MockDatabase.saveStockMovements(newMovements);

      // 2. Incrementar deuda del cliente si es crédito
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
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
      const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
      item.total = qty * price;
    }
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

    const subtotal = tsItems.reduce((acc, item) => acc + (item.total || 0), 0);
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
      items: tsItems,
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
      payloadSummary: `Destino: ${tsDestination} • Cliente: ${tsClientName} • Total: $${total.toFixed(2)}`,
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
    const item = { ...updated[index], [field]: value };
    if (field === 'pieces' || field === 'unitPrice') {
      const pzs = Number(field === 'pieces' ? value : item.pieces) || 0;
      const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
      item.total = pzs * price;
    }
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

    const subtotal = snItems.reduce((acc, item) => acc + (item.total || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    const newNote: SaleNote = {
      id: `sn-${Date.now()}`,
      noteNo: snNoteNo,
      date: snDate,
      clientName: snClientName,
      phone: snPhone,
      city: snCity,
      items: snItems,
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
      payloadSummary: `Cliente: ${snClientName} • Ciudad: ${snCity} • Total: $${total.toFixed(2)}`,
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
              Vendedor activo: <span className="text-purple-300 font-semibold">{currentUser.name}</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Catalog of Finished Products */}
            <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Catálogo de Producto Terminado</h3>
                <p className="text-xs text-slate-500">Los precios se recalculan automáticamente según la tarifa asignada al cliente.</p>
              </div>

              {/* Client Selector in POS */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Paso 1: Seleccionar Cliente</label>
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
                  <div className="bg-purple-50 p-2 rounded border border-purple-100 mt-2 text-[11px] text-purple-900 flex justify-between items-center">
                    <span>Tarifa Activa: <b>{selectedClient.priceList}</b> (Descuento aplicado en catálogo)</span>
                    {selectedClient.creditLimit > 0 && (
                      <span>Crédito Disp: <b>${(selectedClient.creditLimit - selectedClient.currentDebt).toLocaleString()} MXN</b></span>
                    )}
                  </div>
                )}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {finishedProducts.map((prod) => {
                  const clientPrice = getProductPriceForClient(prod.id, cartClientId);
                  const isAgotado = prod.stock <= 0;

                  return (
                    <div 
                      key={prod.id} 
                      className={`p-4 border rounded-xl transition-all flex flex-col justify-between space-y-3 ${
                        isAgotado ? 'opacity-60 border-slate-200' : 'hover:border-purple-300 border-slate-100 shadow-sm'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{prod.sku}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{prod.name}</h4>
                        <div className="flex items-baseline space-x-2 mt-2">
                          <span className="text-lg font-extrabold text-slate-950">${clientPrice.toFixed(2)} MXN</span>
                          {cartClientId && selectedClient?.priceList !== 'Público' && (
                            <span className="text-[10px] text-slate-400 line-through">${getBasePrices(prod.id)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <span className={`text-[10px] font-bold ${isAgotado ? 'text-red-500' : 'text-slate-500'}`}>
                          {isAgotado ? 'AGOTADO' : `Disponible: ${prod.stock} pzs`}
                        </span>
                        
                        <button
                          onClick={() => addToCart(prod.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-all disabled:opacity-50"
                          disabled={!cartClientId || isAgotado}
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  );
                })}
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

        {/* TAB 2: CRM & QUOTES */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form Registro de Cliente */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 h-fit">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-1 text-purple-600" /> Registrar Nuevo Prospecto (CRM)
                </h3>

                <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Razón Social / Cliente</label>
                    <input
                      type="text"
                      placeholder="Ej. Químicos de México S.A."
                      value={crmClientName}
                      onChange={(e) => setCrmClientName(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">RFC Oficial</label>
                    <input
                      type="text"
                      placeholder="Ej. QME120409BA1"
                      value={crmClientRFC}
                      onChange={(e) => setCrmClientRFC(e.target.value.toUpperCase())}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 font-mono"
                      maxLength={13}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Correo Electrónico (Para CFDI)</label>
                    <input
                      type="email"
                      placeholder="Ej. facturacion@cliente.com"
                      value={crmClientEmail}
                      onChange={(e) => setCrmClientEmail(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Lista de Precios Permitida</label>
                    <select
                      value={crmClientPriceList}
                      onChange={(e) => setCrmClientPriceList(e.target.value as any)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5"
                    >
                      <option value="Público">Público General (Sin descuento)</option>
                      <option value="Mayoreo">Tarifa Mayoreo (12% Descuento)</option>
                      <option value="Distribuidor">Tarifa Distribuidor (20% Descuento)</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs">
                    Registrar Cliente en CRM
                  </button>
                </form>
              </div>

              {/* Lista de Cotizaciones Activas */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                  <FileCheck className="w-5 h-5 mr-1.5 text-slate-500" /> Cotizaciones CRM Pendientes de Conversión
                </h3>

                <div className="space-y-4">
                  {sales.filter(s => s.status === 'Cotización').length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-6 text-center">No hay cotizaciones pendientes en el CRM.</p>
                  ) : (
                    sales.filter(s => s.status === 'Cotización').map(cot => (
                      <div key={cot.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="bg-amber-100 text-amber-800 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">{cot.id}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{new Date(cot.createdAt).toLocaleDateString('es-MX')}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-950 mt-1">{cot.clientName}</h4>
                          <p className="text-xs text-slate-600 mt-1">Surtido: {cot.items.map(it => `${it.quantity} pzs de ${it.productName.split('-')[0]}`).join(', ')}</p>
                        </div>

                        <div className="text-right flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">${cot.total.toLocaleString()} MXN</p>
                            <p className="text-[9px] text-slate-400 uppercase">Tarifa asignada</p>
                          </div>
                          
                          <button
                            onClick={() => handleConvertQuote(cot.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all"
                          >
                            Convertir a Pedido Surtido
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: COBRANZA (CREDITS) */}
        {activeTab === 'cobranza' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form para Registrar Abono */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 h-fit">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-1 text-emerald-600" /> Registrar Abono / Pago de Cliente
              </h3>

              <form onSubmit={handleRegisterAbono} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Seleccionar Cliente Deudor</label>
                  <select
                    value={selectedCobranzaClientId}
                    onChange={(e) => {
                      const cliId = e.target.value;
                      setSelectedCobranzaClientId(cliId);
                      const chosen = clients.find(c => c.id === cliId);
                      if (chosen) setPaymentAmount(chosen.currentDebt);
                    }}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">-- Elige el deudor --</option>
                    {clients.filter(c => c.currentDebt > 0).map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Debe: ${c.currentDebt.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Monto del Abono ($ MXN)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                    min="1"
                    disabled={!selectedCobranzaClientId}
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Folio de Transferencia o Recibo</label>
                  <input
                    type="text"
                    placeholder="Ej. SPEI Bancomer #1928"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5"
                    disabled={!selectedCobranzaClientId}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs"
                  disabled={!selectedCobranzaClientId}
                >
                  Registrar Ingreso a Caja
                </button>
              </form>
            </div>

            {/* List of Debtors with credit limits */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center">
                  <Landmark className="w-5 h-5 mr-1.5 text-slate-500" /> Cuentas por Cobrar de Clientes
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportToExcel(clients.filter(c => c.creditLimit > 0).map(c => ({ Cliente: c.name, 'Crédito Autorizado': c.creditLimit, 'Saldo Pendiente': c.currentDebt, 'Disponible Restante': c.creditLimit - c.currentDebt })), 'Cobranza_Cuentas_Por_Cobrar')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Estado de Cuentas por Cobrar de Clientes', ['Cliente Deudor', 'Crédito Autorizado ($)', 'Saldo Pendiente ($)', 'Disponible Restante ($)'], clients.filter(c => c.creditLimit > 0).map(c => [c.name, `$${c.creditLimit.toLocaleString('es-MX')}`, `$${c.currentDebt.toLocaleString('es-MX')}`, `$${(c.creditLimit - c.currentDebt).toLocaleString('es-MX')}`]))}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-3">Cliente Deudor</th>
                      <th className="p-3">Crédito Autorizado</th>
                      <th className="p-3">Saldo Vencido / Deuda</th>
                      <th className="p-3">Disponible Restante</th>
                      <th className="p-3">Estatus Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map(c => {
                      if (c.creditLimit <= 0) return null;
                      
                      const percentDebt = (c.currentDebt / c.creditLimit) * 100;
                      let riskBadge = 'bg-green-50 text-green-700';
                      let riskLabel = 'Estable';

                      if (percentDebt >= 90) {
                        riskBadge = 'bg-red-50 text-red-700 border border-red-200 animate-pulse';
                        riskLabel = 'Peligro Límite';
                      } else if (percentDebt >= 50) {
                        riskBadge = 'bg-yellow-50 text-yellow-700';
                        riskLabel = 'Preventivo';
                      }

                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="p-3">${c.creditLimit.toLocaleString()} MXN</td>
                          <td className="p-3 font-bold text-slate-950">${c.currentDebt.toLocaleString()} MXN</td>
                          <td className="p-3 text-slate-600 font-medium">
                            ${(c.creditLimit - c.currentDebt).toLocaleString()} MXN
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${riskBadge}`}>
                              {riskLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: TRASLADO DE PRODUCTOS */}
        {activeTab === 'traslado' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-purple-600" />
                  Módulo de Traslado de Productos
                </h2>
                <p className="text-xs text-slate-500">
                  Generación de Hojas de Traslado oficial, asignación de chofer y control logístico.
                </p>
              </div>

              <button
                onClick={() => {
                  setTsFolio(`SIM-${Math.floor(100000 + Math.random() * 900000)}`);
                  setShowCreateTransferModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Nueva Hoja de Traslado
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por folio, cliente u operador..."
                    value={tsSearchTerm}
                    onChange={(e) => setTsSearchTerm(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
                  <span className="text-xs font-medium text-slate-500 mr-2 hidden sm:inline">
                    Total: {transferSheets.length}
                  </span>
                  <button
                    onClick={() => exportToExcel(transferSheets.map(ts => ({ Folio: ts.folio, Fecha: ts.date, Cliente: ts.clientName, Destino: ts.destination, Operador: ts.operator, Placas: ts.plateNo, Total: ts.total })), 'Hojas_de_Traslado_Miauloo')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Registro de Hojas de Traslado de Productos', ['Folio', 'Fecha', 'Cliente', 'Destino', 'Operador', 'Placas', 'Total ($)'], transferSheets.map(ts => [ts.folio, ts.date, ts.clientName, ts.destination, ts.operator, ts.plateNo, `$${ts.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]))}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Folio</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Cliente Destino</th>
                      <th className="p-3">Destino / Dirección</th>
                      <th className="p-3">Operador / Placas</th>
                      <th className="p-3">Items</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferSheets
                      .filter(ts => 
                        ts.folio.toLowerCase().includes(tsSearchTerm.toLowerCase()) ||
                        ts.clientName.toLowerCase().includes(tsSearchTerm.toLowerCase()) ||
                        (ts.operator && ts.operator.toLowerCase().includes(tsSearchTerm.toLowerCase()))
                      )
                      .map(ts => (
                        <tr key={ts.id} className="hover:bg-purple-50/30 transition-all">
                          <td className="p-3 font-bold text-purple-900">{ts.folio}</td>
                          <td className="p-3 text-slate-600">{ts.date}</td>
                          <td className="p-3 font-semibold text-slate-900">{ts.clientName}</td>
                          <td className="p-3 text-slate-600 truncate max-w-xs">{ts.destination} - {ts.address}</td>
                          <td className="p-3 text-slate-600">{ts.operator} ({ts.plateNo})</td>
                          <td className="p-3 text-slate-600 font-medium">{ts.items.length} productos</td>
                          <td className="p-3 text-right font-bold text-slate-900">${ts.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedTransferSheet(ts);
                                setShowViewTransferModal(true);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center transition-all"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver / Imprimir
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTAS DE VENTA */}
        {activeTab === 'notas' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-purple-600" />
                  Módulo de Notas de Venta
                </h2>
                <p className="text-xs text-slate-500">
                  Comprobantes físicos de venta directa en sucursal con formato corporativo Miauloo.
                </p>
              </div>

              <button
                onClick={() => {
                  setSnNoteNo(`${5075 + saleNotes.length}`);
                  setShowCreateNoteModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Nueva Nota de Venta
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por número de nota o cliente..."
                    value={snSearchTerm}
                    onChange={(e) => setSnSearchTerm(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
                  <span className="text-xs font-medium text-slate-500 mr-2 hidden sm:inline">
                    Total: {saleNotes.length}
                  </span>
                  <button
                    onClick={() => exportToExcel(saleNotes.map(sn => ({ 'Nota No': sn.noteNo, Fecha: sn.date, Cliente: sn.clientName, Teléfono: sn.phone, Ciudad: sn.city, Total: sn.total })), 'Notas_de_Venta_Miauloo')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Registro de Notas de Venta Miauloo', ['No. Nota', 'Fecha', 'Cliente', 'Teléfono', 'Ciudad', 'Total ($)'], saleNotes.map(sn => [sn.noteNo, sn.date, sn.clientName, sn.phone, sn.city, `$${sn.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]))}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">No. Nota</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Teléfono / Ciudad</th>
                      <th className="p-3">Piezas Total</th>
                      <th className="p-3 text-right">Importe Total</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {saleNotes
                      .filter(sn => 
                        sn.noteNo.toLowerCase().includes(snSearchTerm.toLowerCase()) ||
                        sn.clientName.toLowerCase().includes(snSearchTerm.toLowerCase())
                      )
                      .map(sn => (
                        <tr key={sn.id} className="hover:bg-purple-50/30 transition-all">
                          <td className="p-3 font-bold text-purple-900">#{sn.noteNo}</td>
                          <td className="p-3 text-slate-600">{sn.date}</td>
                          <td className="p-3 font-semibold text-slate-900">{sn.clientName}</td>
                          <td className="p-3 text-slate-600">{sn.phone} / {sn.city}</td>
                          <td className="p-3 text-slate-600 font-medium">{sn.items.reduce((a, b) => a + (b.pieces || 0), 0)} pzs</td>
                          <td className="p-3 text-right font-bold text-slate-900">${sn.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedSaleNote(sn);
                                setShowViewNoteModal(true);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center transition-all"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver / Imprimir
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Exportar en PDF / Imprimir
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
                        <td className="p-2 text-right border-r">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${it.total.toFixed(2)}</td>
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
                    <span>${selectedTransferSheet.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between">
                    <span>I.V.A:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-slate-100 text-[#0B2545]">
                    <span>TOTAL:</span>
                    <span>${selectedTransferSheet.total.toFixed(2)}</span>
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Exportar en PDF / Imprimir
                </button>
                <button
                  onClick={() => setShowViewNoteModal(false)}
                  className="text-slate-400 hover:text-white p-1"
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
                        <td className="p-2 text-center border-r font-semibold">{it.pieces}</td>
                        <td className="p-2 border-r font-bold uppercase text-slate-800">{it.product}</td>
                        <td className="p-2 text-right border-r">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-black text-slate-900">${it.total.toFixed(2)}</td>
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
                    <span>${selectedSaleNote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between text-slate-500">
                    <span>IVA:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-[#1E3A8A] text-white">
                    <span>TOTAL:</span>
                    <span>${selectedSaleNote.total.toFixed(2)}</span>
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

    </div>
  );
}
