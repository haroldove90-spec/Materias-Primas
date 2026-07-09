import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Users, FileCheck, DollarSign, Plus, Minus, 
  Trash2, FileText, Landmark, RefreshCw, Send, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, Client, Sale, OrderItem, DeliveryRoute, User } from '../types';

interface SalesRoleProps {
  onBack: () => void;
  currentUser: User;
}

export default function SalesRole({ onBack, currentUser }: SalesRoleProps) {
  // Database States
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<'pos' | 'crm' | 'cobranza'>('pos');
  
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

  // Load database
  const loadDatabase = () => {
    setMaterials(MockDatabase.getRawMaterials());
    setClients(MockDatabase.getClients());
    setSales(MockDatabase.getSales());
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Catálogo de Productos Terminados para la venta
  const finishedProducts = materials.filter(m => m.id.startsWith('pt'));

  // Precios Base (Público General)
  const getBasePrices = (prodId: string) => {
    // f-1 (pt-1): Detergente Limón 20L -> Público $790. Costo BOM: $427.5
    // f-2 (pt-2): Desengrasante Naranja 20L -> Público $890. Costo BOM: $512
    if (prodId === 'pt-1') return 790;
    if (prodId === 'pt-2') return 890;
    return 300; // default fallback
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
        alert(`No hay suficiente stock en el almacén de producto terminado para surtir: ${missingStockProduct}. Favor de solicitar fabricación al laboratorio.`);
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
        unit: 'porrones',
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
    MockDatabase.saveSales([newSale, ...currentSales]);

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
    const isDetergente = targetSale.items.find(it => it.productName.includes('Detergente'));
    const isDesengrasante = targetSale.items.find(it => it.productName.includes('Desengrasante'));

    const itemsToCheck = [
      { id: 'pt-1', qty: isDetergente ? isDetergente.quantity : 0 },
      { id: 'pt-2', qty: isDesengrasante ? isDesengrasante.quantity : 0 }
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="sales_root">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-500 text-white p-2 rounded-lg font-bold shadow-md">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Atención a Clientes y Caja Rápida</h1>
            <p className="text-xs text-slate-400">Vendedor activo: <span className="text-purple-400 font-medium">{currentUser.name}</span></p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all shadow-sm border border-slate-700"
          id="btn_sales_logout"
        >
          Cerrar Sesión Ventas
        </button>
      </header>

      {/* Tabs bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'pos' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab_sales_pos"
        >
          Punto de Venta Sucursal
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'crm' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab_sales_crm"
        >
          Clientes y Cotizaciones (CRM)
        </button>
        <button
          onClick={() => setActiveTab('cobranza')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'cobranza' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab_sales_cobranza"
        >
          Módulo de Cobranza (Créditos)
        </button>
      </div>

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
                          {isAgotado ? 'AGOTADO' : `Disponible: ${prod.stock} porrones`}
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
                          <p className="text-xs text-slate-600 mt-1">Surtido: {cot.items.map(it => `${it.quantity} porrones de ${it.productName.split('-')[0]}`).join(', ')}</p>
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
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <Landmark className="w-5 h-5 mr-1.5 text-slate-500" /> Cuentas por Cobrar de Clientes
              </h3>

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

      </main>

    </div>
  );
}
