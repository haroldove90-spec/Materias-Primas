import React, { useState, useEffect } from 'react';
import { 
  Package, ArrowDownLeft, ArrowUpRight, AlertOctagon, Calendar, 
  Printer, QrCode, Search, RefreshCw, Plus, Trash2, UserCheck, ShieldAlert 
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, StockMovement, User } from '../types';

interface WarehouseRoleProps {
  onBack: () => void;
  currentUser: User;
  activeTab?: 'inventory' | 'traceability';
  setActiveTab?: (tab: 'inventory' | 'traceability') => void;
}

export default function WarehouseRole({ onBack, currentUser, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: WarehouseRoleProps) {
  // Database States
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // UI States
  const [internalActiveTab, setInternalActiveTab] = useState<'inventory' | 'traceability'>('inventory');
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

  // Load database
  const loadDatabase = () => {
    setMaterials(MockDatabase.getRawMaterials());
    setMovements(MockDatabase.getStockMovements());
  };

  useEffect(() => {
    loadDatabase();
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="warehouse_root">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 text-slate-900 p-2 rounded-lg font-bold shadow-md">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Almacén y Control de Inventarios</h1>
            <p className="text-xs text-slate-400">Guardando el stock: <span className="text-orange-400 font-medium">{currentUser.name}</span></p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition-all shadow-sm border border-slate-700"
          id="btn_wh_logout"
        >
          Cerrar Sesión Almacenista
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex space-x-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'inventory' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab_wh_inventory"
        >
          Inventario General de Insumos
        </button>
        <button
          onClick={() => setActiveTab('traceability')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'traceability' 
              ? 'bg-slate-900 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab_wh_traceability"
        >
          Trazabilidad y Etiquetas de Lote
        </button>
      </div>

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

              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowInboundModal(true)}
                  className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center"
                >
                  <ArrowDownLeft className="w-4 h-4 mr-1" /> Registrar Compra (Entrada)
                </button>
                <button
                  onClick={() => setShowWasteModal(true)}
                  className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center justify-center border border-slate-200"
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
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <RefreshCw className="w-5 h-5 mr-1.5 text-slate-500" /> Registro Diario de Movimientos de Almacén
              </h3>
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

      </main>

      {/* MODAL 1: REGISTRAR COMPRA / ENTRADA */}
      {showInboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Registrar Entrada de Compra (Proveedor)</h3>
              <button onClick={() => setShowInboundModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInboundSubmit} className="p-5 space-y-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold py-2 rounded-lg text-xs"
              >
                Cargar Stock y Lote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR MERMA / DERRAME */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Registrar Merma, Evaporación o Derrame</h3>
              <button onClick={() => setShowWasteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleWasteSubmit} className="p-5 space-y-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
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

    </div>
  );
}
