import React, { useState, useEffect } from 'react';
import { 
  Package, ArrowDownLeft, ArrowUpRight, AlertOctagon, Calendar, 
  Printer, QrCode, Search, RefreshCw, Plus, Trash2, UserCheck, ShieldAlert,
  ShoppingCart, FileText, CheckCircle, Download, X, Truck
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, StockMovement, User, PurchaseOrder, Supplier } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { SuppliersManager } from './SuppliersManager';

interface WarehouseRoleProps {
  onBack: () => void;
  currentUser: User;
  activeTab?: 'inventory' | 'traceability' | 'purchasing' | 'suppliers';
  setActiveTab?: (tab: 'inventory' | 'traceability' | 'purchasing' | 'suppliers') => void;
}

export default function WarehouseRole({ onBack, currentUser, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: WarehouseRoleProps) {
  // Database States
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // UI States
  const [internalActiveTab, setInternalActiveTab] = useState<'inventory' | 'traceability' | 'purchasing' | 'suppliers'>('inventory');
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = propsSetActiveTab || setInternalActiveTab;
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals States
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [selectedLabelLot, setSelectedLabelLot] = useState<string | null>(null);

  // Inbound Form State
  const [inboundMatId, setInboundMatId] = useState('');
  const [inboundQty, setInboundQty] = useState(100);
  const [inboundLoteProv, setInboundLoteProv] = useState('');
  const [inboundExpiry, setInboundExpiry] = useState('2028-06-01');
  const [inboundNotes, setInboundNotes] = useState('');

  // Waste Form State
  const [wasteMatId, setWasteMatId] = useState('');
  const [wasteQty, setWasteQty] = useState(5);
  const [wasteType, setWasteType] = useState<'merma' | 'evaporacion' | 'derrame'>('derrame');
  const [wasteNotes, setWasteNotes] = useState('');

  // Purchase Order States
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('Distribuidora Harinera del Centro');
  const [poItems, setPoItems] = useState<{ materialId: string, quantity: number, unitPrice: number }[]>([]);
  const [newPoMatId, setNewPoMatId] = useState('');
  const [newPoQty, setNewPoQty] = useState(100);
  const [newPoPrice, setNewPoPrice] = useState(15);
  const [poInvoiceNumber, setPoInvoiceNumber] = useState('');

  // Load database
  const loadDatabase = () => {
    setMaterials(MockDatabase.getRawMaterials());
    setMovements(MockDatabase.getStockMovements());
    setPurchaseOrders(MockDatabase.getPurchaseOrders());
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Agregar un material al carro de la Orden de Compra
  const handleAddPoItem = () => {
    if (!newPoMatId || newPoQty <= 0 || newPoPrice <= 0) return;
    const material = materials.find(m => m.id === newPoMatId);
    if (!material) return;

    // Verificar si ya existe en el carro
    const existingIndex = poItems.findIndex(item => item.materialId === newPoMatId);
    if (existingIndex > -1) {
      const updated = [...poItems];
      updated[existingIndex].quantity += newPoQty;
      updated[existingIndex].unitPrice = newPoPrice;
      setPoItems(updated);
    } else {
      setPoItems([...poItems, { materialId: newPoMatId, quantity: newPoQty, unitPrice: newPoPrice }]);
    }
    setNewPoMatId('');
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  // Crear la Orden de Compra
  const handleCreatePo = (status: 'draft' | 'ordered') => {
    if (poItems.length === 0) {
      alert('Debes agregar al menos un insumo a la orden.');
      return;
    }

    const itemsWithNames = poItems.map(item => {
      const mat = materials.find(m => m.id === item.materialId);
      return {
        materialId: item.materialId,
        materialName: mat ? mat.name : 'Insumo',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      };
    });

    const subtotal = itemsWithNames.reduce((acc, item) => acc + item.total, 0);
    const tax = 0; // Alimentos tasa 0%
    const total = subtotal + tax;

    const newPO: PurchaseOrder = {
      id: `oc-${Date.now().toString().slice(-4)}`,
      supplierName: selectedSupplier,
      items: itemsWithNames,
      subtotal,
      tax,
      total,
      status,
      createdAt: new Date().toISOString()
    };

    const updatedPos = [newPO, ...purchaseOrders];
    MockDatabase.savePurchaseOrders(updatedPos);
    setPurchaseOrders(updatedPos);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Creó Orden de Compra ${newPO.id} (${status === 'draft' ? 'Borrador' : 'Enviada'})`,
      'Compras',
      `Proveedor: ${selectedSupplier}, Total: $${total} MXN`
    );

    // Resetear form
    setPoItems([]);
    setSelectedSupplier('Distribuidora Harinera del Centro');
    setShowCreatePoModal(false);
    loadDatabase();
  };

  // Recibir Orden de Compra (incrementa inventario de insumos y registra kárdex)
  const handleReceivePo = (poId: string, invoiceNum: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    // Actualizar inventario de materias primas
    const updatedMaterials = materials.map(m => {
      const poItem = po.items.find(item => item.materialId === m.id);
      if (poItem) {
        return {
          ...m,
          stock: m.stock + poItem.quantity,
          // Actualizamos costo promedio para el costeo de fórmulas
          costPerUnit: poItem.unitPrice
        };
      }
      return m;
    });

    // Crear movimientos de stock por cada artículo
    const newMovements: StockMovement[] = po.items.map(poItem => ({
      id: `mov-${Date.now()}-${poItem.materialId}`,
      materialId: poItem.materialId,
      type: 'entrada_compra',
      quantity: poItem.quantity,
      date: new Date().toISOString(),
      lote: 'LOTE-PROV-RECIENTE',
      user: currentUser.name,
      notes: `Recepción de Orden de Compra ${po.id}. Factura: ${invoiceNum || 'N/A'}`
    }));

    const updatedPos = purchaseOrders.map(p => {
      if (p.id === poId) {
        return {
          ...p,
          status: 'received' as const,
          receivedAt: new Date().toISOString(),
          invoiceNumber: invoiceNum || 'S/F'
        };
      }
      return p;
    });

    MockDatabase.saveRawMaterials(updatedMaterials);
    MockDatabase.saveStockMovements([...newMovements, ...movements]);
    MockDatabase.savePurchaseOrders(updatedPos);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Recibió físicamente Orden de Compra ${po.id}`,
      'Almacén / Compras',
      `Inventario de insumos incrementado. Factura registrada: ${invoiceNum || 'S/F'}`
    );

    loadDatabase();
    alert(`Orden de Compra ${po.id} recibida exitosamente en Almacén.`);
  };

  // Filter materials based on search
  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Registrar Entrada (Compra)
  const handleInboundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundMatId || inboundQty <= 0) return;

    const targetMat = materials.find(m => m.id === inboundMatId);
    if (!targetMat) return;

    const updatedMaterials = materials.map(m => {
      if (m.id === inboundMatId) {
        return {
          ...m,
          stock: m.stock + inboundQty,
          loteProveedor: inboundLoteProv || m.loteProveedor,
          expiryDate: inboundExpiry || m.expiryDate
        };
      }
      return m;
    });

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      materialId: inboundMatId,
      type: 'entrada_compra',
      quantity: inboundQty,
      date: new Date().toISOString(),
      lote: inboundLoteProv || 'S/L',
      user: currentUser.name,
      notes: inboundNotes || `Carga de compra proveedor. Lote: ${inboundLoteProv}`
    };

    MockDatabase.saveRawMaterials(updatedMaterials);
    MockDatabase.saveStockMovements([newMovement, ...movements]);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Cargó entrada por compra de ${targetMat.name}`,
      'Inventarios',
      `Cantidad: ${inboundQty} ${targetMat.unit}. Lote Proveedor: ${inboundLoteProv}`
    );

    // Reset
    setInboundMatId('');
    setInboundQty(100);
    setInboundLoteProv('');
    setInboundNotes('');
    setShowInboundModal(false);
    loadDatabase();
    alert('Entrada registrada exitosamente e incrementado el stock.');
  };

  // Registrar Merma / Derrame
  const handleWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteMatId || wasteQty <= 0) return;

    const targetMat = materials.find(m => m.id === wasteMatId);
    if (!targetMat) return;

    if (targetMat.stock < wasteQty) {
      alert("La cantidad de merma no puede superar al stock disponible en el almacén.");
      return;
    }

    const updatedMaterials = materials.map(m => {
      if (m.id === wasteMatId) {
        return {
          ...m,
          stock: Math.max(0, m.stock - wasteQty)
        };
      }
      return m;
    });

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      materialId: wasteMatId,
      type: 'merma',
      quantity: wasteQty,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: `Merma registrada (${wasteType}): ${wasteNotes}`
    };

    MockDatabase.saveRawMaterials(updatedMaterials);
    MockDatabase.saveStockMovements([newMovement, ...movements]);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Registró merma de ${targetMat.name}`,
      'Inventarios',
      `Tipo: ${wasteType}, Cantidad: ${wasteQty} ${targetMat.unit}. Motivo: ${wasteNotes}`
    );

    // Reset
    setWasteMatId('');
    setWasteQty(5);
    setWasteNotes('');
    setShowWasteModal(false);
    loadDatabase();
    alert('Merma deducida del inventario de forma exitosa.');
  };

  // Generar pixelado código QR interactivo para una etiqueta de lote
  const renderSimulatedQR = () => {
    return (
      <div className="grid grid-cols-5 gap-0.5 bg-black p-1 w-16 h-16 shrink-0">
        {[...Array(25)].map((_, i) => {
          // Pixel grid map simulating a real QR code matrix
          const activePixels = [0, 1, 2, 3, 4, 5, 9, 10, 12, 14, 15, 17, 19, 20, 21, 22, 23, 24];
          const isActive = activePixels.includes(i);
          return (
            <div key={i} className={`w-full h-full ${isActive ? 'bg-white' : 'bg-transparent'}`} />
          );
        })}
      </div>
    );
  };

  const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="warehouse_root">
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
              Almacén y Control de Inventarios
            </h1>
            <p className="text-xs text-sky-200/80">
              Guardando el stock: <span className="text-orange-300 font-semibold">{currentUser.name}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-xs border border-white/20 cursor-pointer"
          id="btn_wh_logout"
        >
          Cerrar Sesión Almacenista
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            
            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por SKU o Nombre de insumo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => exportToExcel(materials.map(m => ({ SKU: m.sku, Material: m.name, Existencia: m.stock, Unidad: m.unit, Mínimo: m.minStock, Lote: m.loteProveedor || 'S/L', Caducidad: m.expiryDate || 'N/A' })), 'Inventario_Almacen_Miauloo')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={() => exportToPDF('Inventario de Materias Primas e Insumos', ['SKU', 'Material / Insumo', 'Existencia', 'Mínimo', 'Lote', 'Caducidad'], materials.map(m => [m.sku, m.name, `${m.stock} ${m.unit}`, `${m.minStock} ${m.unit}`, m.loteProveedor || 'S/L', m.expiryDate || 'N/A']))}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
                <button
                  onClick={() => setShowInboundModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center"
                >
                  <ArrowDownLeft className="w-4 h-4 mr-1" /> Registrar Compra (Entrada)
                </button>
                <button
                  onClick={() => setShowWasteModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center border border-slate-200"
                >
                  <AlertOctagon className="w-4 h-4 mr-1 text-red-500" /> Control de Merma / Fuga
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-4">SKU / ID</th>
                    <th className="p-4">Material / Insumo</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Existencia Física</th>
                    <th className="p-4">Mínimo Requerido</th>
                    <th className="p-4">Estatus Stock</th>
                    <th className="p-4">Lote Vigente</th>
                    <th className="p-4">Fecha Caducidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((m) => {
                    // Determinar estatus
                    let statusColor = 'bg-green-50 text-green-700 border-green-200';
                    let statusText = 'Saludable';
                    
                    if (m.stock <= 0) {
                      statusColor = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
                      statusText = 'AGOTADO';
                    } else if (m.stock <= m.minStock) {
                      statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      statusText = 'STOCK BAJO';
                    }

                    const isFinishedProduct = m.id.startsWith('pt');

                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-500">{m.sku}</td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{m.name}</p>
                          <p className="text-[10px] text-slate-400">Costo Unitario: ${m.costPerUnit.toFixed(2)} MXN / {m.unit}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isFinishedProduct ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isFinishedProduct ? 'PRODUCTO TERMINADO' : 'MATERIA PRIMA'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900 text-sm">
                          {m.stock.toLocaleString()} {m.unit}
                        </td>
                        <td className="p-4 font-mono text-slate-500">
                          {m.minStock} {m.unit}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-700 font-semibold">
                          {m.loteProveedor || 'S/L'}
                        </td>
                        <td className="p-4 text-slate-500 font-mono">
                          {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('es-MX') : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recent Movements Log */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-1.5 text-slate-500" /> Registro Diario de Movimientos de Almacén
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportToExcel(movements.map(mov => ({ Fecha: new Date(mov.date).toLocaleString('es-MX'), Insumo: materials.find(m => m.id === mov.materialId)?.name || 'Insumo', Tipo: mov.type, Cantidad: mov.quantity, Lote: mov.lote || 'N/A', Operario: mov.user, Observaciones: mov.notes })), 'Movimientos_Almacen_Kardex')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Registro de Movimientos de Almacén (Kardex)', ['Fecha', 'Insumo', 'Tipo', 'Cantidad', 'Lote', 'Operario'], movements.map(mov => [new Date(mov.date).toLocaleString('es-MX'), materials.find(m => m.id === mov.materialId)?.name || 'Insumo', mov.type.toUpperCase(), `${mov.type.startsWith('entrada') ? '+' : '-'}${mov.quantity}`, mov.lote || 'N/A', mov.user]))}
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
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3">Insumo</th>
                      <th className="p-3">Tipo de Operación</th>
                      <th className="p-3">Cantidad</th>
                      <th className="p-3">Lote Asociado</th>
                      <th className="p-3">Operario</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.slice(0, 10).map((mov) => {
                      const matName = materials.find(m => m.id === mov.materialId)?.name || 'Insumo Eliminado';
                      
                      const typeStyles = {
                        entrada_compra: 'bg-green-50 text-green-700 border-green-200',
                        salida_produccion: 'bg-blue-50 text-blue-700 border-blue-200',
                        salida_venta: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        merma: 'bg-red-50 text-red-700 border-red-200',
                        ajuste: 'bg-gray-50 text-gray-700 border-gray-200'
                      };

                      const typeLabels = {
                        entrada_compra: 'ENTRADA (COMPRA)',
                        salida_produccion: 'SALIDA (PROD)',
                        salida_venta: 'SALIDA (VENTA)',
                        merma: 'MERMA / DESECHO',
                        ajuste: 'AJUSTE'
                      };

                      return (
                        <tr key={mov.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 font-mono">
                            {new Date(mov.date).toLocaleString('es-MX')}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{matName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${typeStyles[mov.type]}`}>
                              {typeLabels[mov.type]}
                            </span>
                          </td>
                          <td className="p-3 font-bold font-mono">
                            {mov.type.startsWith('entrada') ? '+' : '-'}{mov.quantity}
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-700">{mov.lote || 'N/A'}</td>
                          <td className="p-3">{mov.user}</td>
                          <td className="p-3 text-slate-600 italic">{mov.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TRACEABILITY & LABELS */}
        {activeTab === 'traceability' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lotes List */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Lotes Disponibles para Etiquetado</h3>
              <p className="text-xs text-slate-500 mb-4">Selecciona un lote de fabricación interna o materia prima para generar su etiqueta de trazabilidad industrial.</p>
              
              <div className="space-y-2">
                {materials.map(m => {
                  if (!m.loteProveedor) return null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedLabelLot(m.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${
                        selectedLabelLot === m.id 
                          ? 'border-orange-500 bg-orange-50/50 text-orange-900 font-semibold' 
                          : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-xs text-slate-500">Lote: <span className="font-mono font-bold text-slate-900">{m.loteProveedor}</span></p>
                        <p className="text-sm font-semibold">{m.name}</p>
                      </div>
                      <Printer className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>

              {/* Expiry alerts monitor */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-1 text-red-500" /> Monitor de Caducidades Próximas
                </h4>
                <div className="space-y-2.5">
                  {materials.filter(m => m.expiryDate).map(m => {
                    const expiry = new Date(m.expiryDate!);
                    const today = new Date();
                    const diffTime = expiry.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let color = 'bg-green-50 text-green-700';
                    let alertLabel = `Vence en ${diffDays} días`;

                    if (diffDays <= 0) {
                      color = 'bg-red-100 text-red-800 font-bold animate-pulse';
                      alertLabel = 'CADUCADO';
                    } else if (diffDays <= 180) {
                      color = 'bg-yellow-100 text-yellow-800';
                      alertLabel = `Por caducar (${diffDays} días)`;
                    }

                    return (
                      <div key={m.id} className="text-xs p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Caduca: {expiry.toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${color}`}>
                          {alertLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Printable Chemical Label view */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              {(() => {
                const targetMat = materials.find(m => m.id === selectedLabelLot);
                if (!targetMat) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                      <QrCode className="w-16 h-16 text-slate-300 mb-3" />
                      <p className="text-sm font-semibold text-slate-700">Generador de Etiquetas de Trazabilidad</p>
                      <p className="text-xs text-slate-500">Selecciona un lote de la lista izquierda para visualizar y mandar a imprimir su etiqueta oficial.</p>
                    </div>
                  );
                }

                const isFinished = targetMat.id.startsWith('pt');

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Vista de Impresión</h3>
                        <p className="text-xs text-slate-500">Etiqueta con requerimientos regulatorios de trazabilidad química.</p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center shadow-sm transition-all"
                      >
                        <Printer className="w-4 h-4 mr-1.5" /> Imprimir Etiqueta
                      </button>
                    </div>

                    {/* Styled Industrial Chemical Label */}
                    <div className="border-4 border-slate-950 p-6 rounded-lg bg-white text-black max-w-xl mx-auto shadow-md relative overflow-hidden" id="printable-label">
                      {/* Danger Stripe */}
                      <div className="bg-slate-950 text-white font-extrabold text-center py-1 text-sm uppercase tracking-widest mb-4">
                        {isFinished ? 'PRODUCTO TERMINADO AUTORIZADO' : 'MATERIA PRIMA QUÍMICA'}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Sustancia / Solución</span>
                            <h2 className="text-base font-extrabold tracking-tight text-slate-950 uppercase">{targetMat.name}</h2>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-bold uppercase text-slate-500 block">SKU Interno</span>
                              <span className="font-mono font-bold text-xs">{targetMat.sku}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold uppercase text-slate-500 block">Lote de Control</span>
                              <span className="font-mono font-bold text-xs bg-amber-100 px-1 py-0.2 rounded border border-amber-300">{targetMat.loteProveedor}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-bold uppercase text-slate-500 block">Fecha Envasado</span>
                              <span className="text-xs font-semibold">{new Date().toLocaleDateString('es-MX')}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold uppercase text-slate-500 block">Fecha Caducidad</span>
                              <span className="text-xs font-semibold text-red-600 font-mono">{targetMat.expiryDate ? new Date(targetMat.expiryDate).toLocaleDateString('es-MX') : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* QR Code and Barcode block */}
                        <div className="col-span-1 flex flex-col items-center justify-between border-l border-slate-300 pl-4">
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center mb-1">Escanear Trazabilidad</span>
                          {renderSimulatedQR()}
                          <div className="text-center mt-2">
                            <span className="text-[9px] font-bold block text-slate-400">Verificación</span>
                            <span className="font-mono text-[10px] font-semibold">{targetMat.loteProveedor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chemical Barcode simulated with CSS lines */}
                      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col items-center justify-center">
                        <div className="flex h-10 w-full justify-center items-stretch space-x-0.5">
                          {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 3, 1, 4, 2].map((w, i) => (
                            <div key={i} className="bg-black" style={{ width: `${w * 1.5}px` }} />
                          ))}
                        </div>
                        <span className="font-mono text-[9px] mt-1 text-center font-bold tracking-widest">{targetMat.sku}-{targetMat.loteProveedor}</span>
                      </div>

                      {/* Safety Diamond and instructions */}
                      <div className="mt-4 bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between text-[9px] text-slate-600 gap-3">
                        <div>
                          <p className="font-bold text-slate-800">INDICACIONES DE CONSERVACIÓN (GRADO ALIMENTICIO):</p>
                          <p className="mt-0.5">Mantener en un lugar fresco y seco, protegido de la luz directa y humedad. Almacenar sobre tarimas para evitar contaminación cruzada.</p>
                        </div>
                        {/* Simulación Grado de Calidad */}
                        <div className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-1 rounded shrink-0 border border-emerald-300">
                          GRADO ALIMENTICIO
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB 3: PURCHASING & SUPPLIERS */}
        {activeTab === 'purchasing' && (
          <div className="space-y-6">
            
            {/* Control Bar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-indigo-600" /> Control de Adquisición y Órdenes de Compra (Procurement)
                </h3>
                <p className="text-xs text-slate-500 mt-1">Crea y gestiona requerimientos de abastecimiento de materia prima grado alimenticio directamente en el ERP.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportToExcel(purchaseOrders.map(po => ({ Folio: po.id, Proveedor: po.supplierName, Fecha: new Date(po.createdAt).toLocaleDateString('es-MX'), Estatus: po.status, Total: po.total })), 'Ordenes_de_Compra_Miauloo')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={() => exportToPDF('Registro de Órdenes de Compra (Procurement)', ['Folio', 'Proveedor', 'Fecha Creación', 'Estatus', 'Total ($)'], purchaseOrders.map(po => [po.id, po.supplierName, new Date(po.createdAt).toLocaleDateString('es-MX'), po.status.toUpperCase(), `$${po.total.toFixed(2)}`]))}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
                <button
                  onClick={() => {
                    setPoItems([]);
                    setSelectedSupplier('Distribuidora Harinera del Centro');
                    setShowCreatePoModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  id="btn_wh_create_po"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nueva Orden de Compra
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Active POs List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                    <FileText className="w-4 h-4 mr-1.5 text-slate-600" /> Órdenes de Compra en Curso
                  </h4>

                  <div className="space-y-4">
                    {purchaseOrders.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        No hay órdenes de compra registradas.
                      </div>
                    ) : (
                      purchaseOrders.map(po => {
                        let statusColor = 'bg-slate-100 text-slate-700';
                        let statusLabel = 'Borrador';

                        if (po.status === 'ordered') {
                          statusColor = 'bg-amber-100 text-amber-800';
                          statusLabel = 'Solicitada (Tránsito)';
                        } else if (po.status === 'received') {
                          statusColor = 'bg-emerald-100 text-emerald-800';
                          statusLabel = 'Recibida en Almacén';
                        }

                        return (
                          <div key={po.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition-all space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-slate-400">Folio: {po.id}</span>
                                <h5 className="text-sm font-bold text-slate-900 mt-0.5">{po.supplierName}</h5>
                                <p className="text-[10px] text-slate-400">Creada: {new Date(po.createdAt).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}>
                                  {statusLabel}
                                </span>
                                <span className="font-mono font-extrabold text-sm text-indigo-600">${po.total.toFixed(2)} MXN</span>
                              </div>
                            </div>

                            {/* Items list summary */}
                            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Artículos Solicitados</span>
                              <div className="space-y-1">
                                {po.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
                                    <span>• {item.materialName}</span>
                                    <span className="font-mono font-bold text-slate-900">{item.quantity} pzs / kg</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Received Details if applicable */}
                            {po.status === 'received' && (
                              <div className="flex justify-between text-[10px] bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                                <span><strong>Recibida:</strong> {new Date(po.receivedAt!).toLocaleDateString('es-MX')}</span>
                                <span><strong>Factura Proveedor:</strong> {po.invoiceNumber}</span>
                              </div>
                            )}

                            {/* Actions inside order */}
                            {po.status === 'draft' && (
                              <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => {
                                    const updated = purchaseOrders.map(p => {
                                      if (p.id === po.id) return { ...p, status: 'ordered' as const };
                                      return p;
                                    });
                                    MockDatabase.savePurchaseOrders(updated);
                                    setPurchaseOrders(updated);
                                    MockDatabase.addAuditLog(currentUser.name, `Orden de compra ${po.id} enviada al proveedor`, 'Compras', po.supplierName);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center shadow-xs transition-all"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Enviar Pedido al Proveedor
                                </button>
                              </div>
                            )}

                            {po.status === 'ordered' && (
                              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 space-y-3 pt-3 mt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-amber-900 flex items-center">
                                    <AlertOctagon className="w-4 h-4 mr-1 text-amber-600" /> Recepción Física en Almacén
                                  </span>
                                  <p className="text-[10px] text-amber-700 font-medium">Al recibir los insumos, el inventario se cargará automáticamente.</p>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    id={`invoice_input_${po.id}`}
                                    placeholder="Folio de Factura Proveedor (Ej. F-9821)"
                                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold"
                                  />
                                  <button
                                    onClick={() => {
                                      const inputEl = document.getElementById(`invoice_input_${po.id}`) as HTMLInputElement;
                                      const invoiceValue = inputEl ? inputEl.value : 'S/F';
                                      handleReceivePo(po.id, invoiceValue);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-4 py-2 rounded-lg transition-all border border-emerald-700 shadow-sm whitespace-nowrap"
                                  >
                                    Confirmar Entrada
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Suppliers panel */}
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                    <UserCheck className="w-4 h-4 mr-1.5 text-slate-600" /> Proveedores Homologados
                  </h4>

                  <div className="space-y-3.5">
                    {[
                      { name: 'Distribuidora Harinera del Centro', cat: 'Harina, Almidones y Sémola', phone: '55-1234-5678', rfc: 'DHC881022AA1' },
                      { name: 'Azúcares y Melazas de México', cat: 'Endulzantes y Glucosas', phone: '81-4433-2211', rfc: 'AMM120504BB2' },
                      { name: 'Grenetinas Premium de Occidente', cat: 'Grenetina, Gomas y Espesantes', phone: '33-9876-5432', rfc: 'GPO050412XX3' },
                      { name: 'Sabores y Esencias San Ángel', cat: 'Aditivos, Aromas y Colorantes', phone: '477-889-9112', rfc: 'SES150915CC1' },
                      { name: 'Lácteos y Grasas del Bajío', cat: 'Derivados de Leche y Mantequilla', phone: '462-555-6677', rfc: 'LGB100101DD5' },
                    ].map((prov, i) => (
                      <div key={i} className="text-xs p-3 rounded-lg border border-slate-100 space-y-1 hover:bg-slate-50/50 transition-all">
                        <h5 className="font-bold text-slate-900">{prov.name}</h5>
                        <p className="text-[10px] text-indigo-600 font-semibold">{prov.cat}</p>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>RFC: {prov.rfc}</span>
                          <span>Tel: {prov.phone}</span>
                        </div>
                        <div className="pt-1.5 flex items-center text-[9px] text-emerald-600 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Control de Inocuidad Aprobado
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: PROVEEDORES (SUPPLIERS) */}
        {activeTab === 'suppliers' && (
          <SuppliersManager 
            currentUser={currentUser} 
            onCreatePurchaseOrder={(sup) => {
              setSelectedSupplier(sup.name);
              setShowCreatePoModal(true);
              setActiveTab('purchasing');
            }}
          />
        )}

      </main>

      {/* MODAL 1: REGISTRAR COMPRA / ENTRADA */}
      {showInboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm">Registrar Entrada de Compra (Proveedor)</h3>
              <button onClick={() => setShowInboundModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInboundSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Insumo / Material comprado</label>
                <select
                  value={inboundMatId}
                  onChange={(e) => setInboundMatId(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                  required
                >
                  <option value="">-- Elige el insumo --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.sku} - {m.name} ({m.stock} {m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cantidad Recibida</label>
                  <input
                    type="number"
                    value={inboundQty}
                    onChange={(e) => setInboundQty(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Lote del Proveedor</label>
                  <input
                    type="text"
                    placeholder="Ej. LOT-9821"
                    value={inboundLoteProv}
                    onChange={(e) => setInboundLoteProv(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Fecha de Caducidad</label>
                <input
                  type="date"
                  value={inboundExpiry}
                  onChange={(e) => setInboundExpiry(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Notas de Factura / Proveedor</label>
                <textarea
                  placeholder="Número de factura, nombre del transportista, etc..."
                  value={inboundNotes}
                  onChange={(e) => setInboundNotes(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold py-2 rounded-lg text-xs shadow-sm"
              >
                Cargar Stock y Lote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR MERMA / DERRAME */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-sm">Registrar Merma, Evaporación o Derrame</h3>
              <button onClick={() => setShowWasteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleWasteSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Insumo afectado</label>
                <select
                  value={wasteMatId}
                  onChange={(e) => setWasteMatId(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                  required
                >
                  <option value="">-- Elige el insumo --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cantidad Perdida</label>
                  <input
                    type="number"
                    value={wasteQty}
                    onChange={(e) => setWasteQty(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Tipo de Evento</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value as any)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2"
                  >
                    <option value="derrame">Derrame de Químicos</option>
                    <option value="evaporacion">Evaporación natural</option>
                    <option value="merma">Merma de empaque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Descripción de la Causa (Auditable)</label>
                <textarea
                  placeholder="Explica qué sucedió para que quede registrado en el historial de auditoría..."
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 h-20"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs"
              >
                Registrar y Ajustar Almacén
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: CREAR ORDEN DE COMPRA */}
      {showCreatePoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm">Generar Nueva Orden de Compra (ERP Abastecimiento)</h3>
                <p className="text-[10px] text-slate-400">Adquisición oficial de materia prima e insumos de panificación.</p>
              </div>
              <button onClick={() => setShowCreatePoModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 text-xs text-slate-700 overflow-y-auto flex-1">
              {/* Supplier and Date selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Proveedor Autorizado</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Distribuidora Harinera del Centro">Distribuidora Harinera del Centro (Harina, Trigo)</option>
                    <option value="Azúcares y Melazas de México">Azúcares y Melazas de México (Azúcar, Glucosa)</option>
                    <option value="Grenetinas Premium de Occidente">Grenetinas Premium de Occidente (Grenetina)</option>
                    <option value="Sabores y Esencias San Ángel">Sabores y Esencias San Ángel (Esencias, Colorantes)</option>
                    <option value="Lácteos y Grasas del Bajío">Lácteos y Grasas del Bajío (Mantequilla, Chantilly)</option>
                    <option value="Envases y Desechables Industriales">Envases y Desechables Industriales (Domos, Moldes)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fecha de Solicitud</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString('es-MX')}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-500"
                    disabled
                  />
                </div>
              </div>

              {/* Add Material to PO form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Insumo a la Orden
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-500 mb-1 font-semibold">Insumo / MP</label>
                    <select
                      value={newPoMatId}
                      onChange={(e) => {
                        setNewPoMatId(e.target.value);
                        const mat = materials.find(m => m.id === e.target.value);
                        if (mat) setNewPoPrice(mat.costPerUnit);
                      }}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5"
                    >
                      <option value="">-- Selecciona --</option>
                      {materials.filter(m => !m.id.startsWith('pt')).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-500 mb-1 font-semibold font-semibold">Cantidad Solicitada</label>
                    <input
                      type="number"
                      value={newPoQty}
                      onChange={(e) => setNewPoQty(Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-mono"
                      min="1"
                    />
                  </div>
                  <div className="flex gap-2 items-end font-semibold">
                    <div className="flex-1 font-semibold">
                      <label className="block font-medium text-slate-500 mb-1">Costo Unitario ($)</label>
                      <input
                        type="number"
                        value={newPoPrice}
                        onChange={(e) => setNewPoPrice(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-1.5 font-mono"
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPoItem}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all border border-slate-950 shadow-sm"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* PO Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] border-b border-slate-200">
                      <th className="p-2.5">Insumo</th>
                      <th className="p-2.5 text-center">Cantidad</th>
                      <th className="p-2.5 text-right">Costo Unit.</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                      <th className="p-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-6 text-slate-400 font-medium">
                          No hay insumos cargados a esta orden de compra.
                        </td>
                      </tr>
                    ) : (
                      poItems.map((item, index) => {
                        const mat = materials.find(m => m.id === item.materialId);
                        const sub = item.quantity * item.unitPrice;
                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-900">{mat?.name || 'Insumo'}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{item.quantity} {mat?.unit || 'kg'}</td>
                            <td className="p-2.5 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">${sub.toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePoItem(index)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PO Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-right text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">${poItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toFixed(2)} MXN</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Impuestos (Tasa 0%):</span>
                    <span className="font-mono">$0.00 MXN</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Estimado:</span>
                    <span className="font-mono text-emerald-600">${poItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0).toFixed(2)} MXN</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowCreatePoModal(false)}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleCreatePo('draft')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg border border-slate-300 font-semibold"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={() => handleCreatePo('ordered')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg border border-emerald-700 font-semibold shadow-sm flex items-center"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5 animate-pulse" /> Enviar Orden (Solicitada)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
