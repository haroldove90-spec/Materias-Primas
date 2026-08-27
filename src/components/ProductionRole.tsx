import React, { useState, useEffect } from 'react';
import { 
  Beaker, ClipboardList, Check, AlertCircle, Plus, Info, 
  Layers, Package, BadgeAlert, UserCheck, Calendar, Activity, FileCheck, ShoppingCart, Trash2, Download, Printer
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, Formula, ProductionOrder, StockMovement, User } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';

interface ProductionRoleProps {
  onBack: () => void;
  currentUser: User;
  activeTab?: 'formulas' | 'orders' | 'mrp';
  setActiveTab?: (tab: 'formulas' | 'orders' | 'mrp') => void;
}

export default function ProductionRole({ onBack, currentUser, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: ProductionRoleProps) {
  // Database States
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);

  // UI States
  const [internalActiveTab, setInternalActiveTab] = useState<'formulas' | 'orders' | 'mrp'>('orders');
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = propsSetActiveTab || setInternalActiveTab;
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  
  // Create Order Form State
  const [createOrderFormulaId, setCreateOrderFormulaId] = useState('');
  const [createOrderQty, setCreateOrderQty] = useState(100); // changed default to match 100kg batch
  const [createOrderNotes, setCreateOrderNotes] = useState('');

  // Selected Order for Pre-check Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // MRP State variables
  const [mrpFormulaId, setMrpFormulaId] = useState('');
  const [mrpBatchQty, setMrpBatchQty] = useState(100);

  // QA Modal State variables
  const [qaPh, setQaPh] = useState(6.5);
  const [qaDensity, setQaDensity] = useState(1.05);
  const [qaSensory, setQaSensory] = useState(false);
  const [qaSealing, setQaSealing] = useState(false);
  const [qaOrderId, setQaOrderId] = useState<string | null>(null);

  // Load database
  const loadDatabase = () => {
    setFormulas(MockDatabase.getFormulas());
    setMaterials(MockDatabase.getRawMaterials());
    setProductionOrders(MockDatabase.getProductionOrders());
  };

  useEffect(() => {
    loadDatabase();
    // Default select first formula for BOM view
    const forms = MockDatabase.getFormulas();
    if (forms.length > 0) {
      setSelectedFormulaId(forms[0].id);
    }
  }, []);

  // Formulado de nueva receta
  const [newFormulaName, setNewFormulaName] = useState('');
  const [newFormulaDesc, setNewFormulaDesc] = useState('');
  const [newFormulaLabor, setNewFormulaLabor] = useState(1200);
  const [newFormulaOther, setNewFormulaOther] = useState(800);
  const [formulaIngredients, setFormulaIngredients] = useState<{materialId: string, percentage: number}[]>([
    { materialId: 'mat-1', percentage: 10 },
    { materialId: 'mat-7', percentage: 90 },
  ]);

  // Handler para agregar ingrediente en form de receta
  const addIngredientToNewFormula = () => {
    setFormulaIngredients([...formulaIngredients, { materialId: 'mat-2', percentage: 5 }]);
  };

  const handleCreateFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormulaName) return;

    // Calcular suma total de porcentajes
    const totalPercent = formulaIngredients.reduce((acc, curr) => acc + curr.percentage, 0);
    if (Math.abs(totalPercent - 100) > 0.1) {
      alert(`La suma de porcentajes de la receta debe ser exactamente 100%. Actualmente es: ${totalPercent}%`);
      return;
    }

    // Association automatic of PEAD and Cap for costing based on standard 1000L (50 porrones of 20L)
    const newFormula: Formula = {
      id: `f-${Date.now()}`,
      name: newFormulaName,
      description: newFormulaDesc,
      batchSizeLiters: 1000,
      ingredients: formulaIngredients.map(fi => ({
        materialId: fi.materialId,
        percentage: fi.percentage,
        amountPerThousandLiters: fi.percentage * 10
      })),
      packaging: [
        { materialId: 'mat-8', quantity: 50, cost: 65 }, // Porrón 20L
        { materialId: 'mat-9', quantity: 50, cost: 8 },  // Tapa
        { materialId: 'mat-10', quantity: 50, cost: 12 }, // Etiqueta
      ],
      laborCost: newFormulaLabor,
      otherCost: newFormulaOther
    };

    const updatedFormulas = [...formulas, newFormula];
    MockDatabase.saveFormulas(updatedFormulas);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Creó nueva receta`,
      'Producción',
      `Receta: ${newFormulaName}`
    );
    setFormulas(updatedFormulas);
    setSelectedFormulaId(newFormula.id);
    
    // Reset form
    setNewFormulaName('');
    setNewFormulaDesc('');
    setFormulaIngredients([{ materialId: 'mat-1', percentage: 10 }, { materialId: 'mat-7', percentage: 90 }]);
    alert('Receta guardada exitosamente en el catálogo del negocio.');
  };

  // Handler para crear orden de producción
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrderFormulaId) return;

    const newOrder: ProductionOrder = {
      id: `op-${Date.now()}`,
      formulaId: createOrderFormulaId,
      quantityLiters: createOrderQty,
      status: 'pending',
      createdAt: new Date().toISOString(),
      preCheckPassed: false,
      operator: currentUser.name,
      notes: createOrderNotes
    };

    const updatedOrders = [...productionOrders, newOrder];
    const prevOrdersCount = productionOrders.length;
    MockDatabase.saveProductionOrders(updatedOrders);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Generó Órden de Producción`,
      'Producción',
      `Órden ID: ${newOrder.id} para ${formulas.find(f => f.id === createOrderFormulaId)?.name}`
    );

    // Registrar Telemetría de Guardado Inmediata
    recordSaveTelemetry({
      table: 'production_orders',
      folio: newOrder.id,
      action: 'Orden de Producción Creada',
      countBefore: prevOrdersCount,
      countAfter: prevOrdersCount + 1,
      status: 'success',
      payloadSummary: `Fórmula: ${formulas.find(f => f.id === createOrderFormulaId)?.name || 'Receta'} • Cantidad: ${createOrderQty} kg/L`,
      source: 'cloud_sync'
    });
    
    // Reset form
    setCreateOrderFormulaId('');
    setCreateOrderQty(1000);
    setCreateOrderNotes('');
    loadDatabase();
    alert('Órden de trabajo creada con estatus Pendiente de Pre-chequeo.');
  };

  // Pre-chequeo del Almacén para una Orden
  const getPreCheckResults = (order: ProductionOrder) => {
    const formula = formulas.find(f => f.id === order.formulaId);
    if (!formula) return { passed: false, items: [] };

    const multiplier = order.quantityLiters / formula.batchSizeLiters;
    let passed = true;

    const items = [
      ...formula.ingredients.map(ing => {
        const required = ing.amountPerThousandLiters * multiplier;
        const mat = materials.find(m => m.id === ing.materialId);
        const available = mat ? mat.stock : 0;
        const isSufficient = available >= required;
        if (!isSufficient) passed = false;

        return {
          materialId: ing.materialId,
          name: mat ? mat.name : 'Desconocido',
          unit: mat ? mat.unit : 'kg',
          required,
          available,
          isSufficient
        };
      }),
      ...formula.packaging.map(pkg => {
        const required = pkg.quantity * multiplier;
        const mat = materials.find(m => m.id === pkg.materialId);
        const available = mat ? mat.stock : 0;
        const isSufficient = available >= required;
        if (!isSufficient) passed = false;

        return {
          materialId: pkg.materialId,
          name: mat ? mat.name : 'Desconocido',
          unit: mat ? mat.unit : 'pzs',
          required,
          available,
          isSufficient
        };
      })
    ];

    return { passed, items };
  };

  // Iniciar Mezcla (In Progress)
  const handleStartProduction = (order: ProductionOrder) => {
    const check = getPreCheckResults(order);
    if (!check.passed) {
      alert("No se puede iniciar la mezcla: Faltan insumos en el almacén.");
      return;
    }

    const updatedOrders = productionOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'in_progress' as const,
          startedAt: new Date().toISOString(),
          preCheckPassed: true
        };
      }
      return o;
    });

    MockDatabase.saveProductionOrders(updatedOrders);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Inició mezcla y dosificación`,
      'Producción',
      `Órden ID: ${order.id} pasó pre-chequeo de insumos.`
    );
    loadDatabase();
    setSelectedOrder(null);
  };

  // Cierre de Orden: Generar lote, descontar stock, incrementar PT
  const handleCloseProduction = (order: ProductionOrder) => {
    const formula = formulas.find(f => f.id === order.formulaId);
    if (!formula) return;

    const multiplier = order.quantityLiters / formula.batchSizeLiters;
    const finalLote = `LOTE-INT-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Descontar materias primas y empaques
    const currentMaterials = [...materials];
    const newMovements: StockMovement[] = [];

    // Ingredientes
    formula.ingredients.forEach(ing => {
      const required = ing.amountPerThousandLiters * multiplier;
      const matIdx = currentMaterials.findIndex(m => m.id === ing.materialId);
      if (matIdx !== -1) {
        currentMaterials[matIdx].stock = Math.max(0, currentMaterials[matIdx].stock - required);
        
        newMovements.push({
          id: `mov-${Date.now()}-${ing.materialId}`,
          materialId: ing.materialId,
          type: 'salida_produccion',
          quantity: required,
          date: new Date().toISOString(),
          lote: finalLote,
          user: currentUser.name,
          notes: `Consumo dosificación para OP ${order.id}`
        });
      }
    });

    // Empaques
    formula.packaging.forEach(pkg => {
      const required = pkg.quantity * multiplier;
      const matIdx = currentMaterials.findIndex(m => m.id === pkg.materialId);
      if (matIdx !== -1) {
        currentMaterials[matIdx].stock = Math.max(0, currentMaterials[matIdx].stock - required);
        
        newMovements.push({
          id: `mov-${Date.now()}-${pkg.materialId}`,
          materialId: pkg.materialId,
          type: 'salida_produccion',
          quantity: required,
          date: new Date().toISOString(),
          lote: finalLote,
          user: currentUser.name,
          notes: `Empacado y sellado para OP ${order.id}`
        });
      }
    });

    // 2. Incrementar Stock de Producto Terminado
    // Mapeamos de fórmula a producto terminado. Mezcla Pastel f-1 va a pt-1, Gelatina f-2 va a pt-2
    const ptId = formula.id === 'f-1' ? 'pt-1' : 'pt-2';
    const totalBolsasProduced = 100 * multiplier; // Cada lote de 100kg da 100 bolsas de 1kg
    const ptIdx = currentMaterials.findIndex(m => m.id === ptId);
    
    if (ptIdx !== -1) {
      currentMaterials[ptIdx].stock += totalBolsasProduced;
      currentMaterials[ptIdx].loteProveedor = finalLote;
      
      newMovements.push({
        id: `mov-${Date.now()}-pt`,
        materialId: ptId,
        type: 'entrada_compra', // Entrada por cierre de producción
        quantity: totalBolsasProduced,
        date: new Date().toISOString(),
        lote: finalLote,
        user: currentUser.name,
        notes: `Cierre producción OP ${order.id}. +${totalBolsasProduced} bolsas de 1kg`
      });
    }

    // Guardar cambios de materiales y movimientos en base de datos
    MockDatabase.saveRawMaterials(currentMaterials);
    const databaseMovements = MockDatabase.getStockMovements();
    MockDatabase.saveStockMovements([...newMovements, ...databaseMovements]);

    // 3. Completar órden de producción
    const updatedOrders = productionOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          lote: finalLote
        };
      }
      return o;
    });

    MockDatabase.saveProductionOrders(updatedOrders);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Cerró orden de producción con éxito`,
      'Producción',
      `Generado Lote interno: ${finalLote}. Se produjeron ${totalBolsasProduced} bolsas de 1kg.`
    );

    loadDatabase();
    setSelectedOrder(null);
    alert(`Órden cerrada exitosamente. Lote interno generado: ${finalLote}. Se han descontado los insumos e incrementado el producto terminado.`);
  };

  const handleCloseProductionWithQA = (order: ProductionOrder, qa: { ph: number, density: number, sensoryPassed: boolean, sealingPassed: boolean }) => {
    const formula = formulas.find(f => f.id === order.formulaId);
    if (!formula) return;

    const multiplier = order.quantityLiters / formula.batchSizeLiters;
    const finalLote = `LOTE-INT-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Descontar materias primas y empaques
    const currentMaterials = [...materials];
    const newMovements: StockMovement[] = [];

    // Ingredientes
    formula.ingredients.forEach(ing => {
      const required = ing.amountPerThousandLiters * multiplier;
      const matIdx = currentMaterials.findIndex(m => m.id === ing.materialId);
      if (matIdx !== -1) {
        currentMaterials[matIdx].stock = Math.max(0, currentMaterials[matIdx].stock - required);
        
        newMovements.push({
          id: `mov-${Date.now()}-${ing.materialId}`,
          materialId: ing.materialId,
          type: 'salida_produccion',
          quantity: required,
          date: new Date().toISOString(),
          lote: finalLote,
          user: currentUser.name,
          notes: `Consumo dosificación para OP ${order.id} (Liberado por Control de Calidad)`
        });
      }
    });

    // Empaques
    formula.packaging.forEach(pkg => {
      const required = pkg.quantity * multiplier;
      const matIdx = currentMaterials.findIndex(m => m.id === pkg.materialId);
      if (matIdx !== -1) {
        currentMaterials[matIdx].stock = Math.max(0, currentMaterials[matIdx].stock - required);
        
        newMovements.push({
          id: `mov-${Date.now()}-${pkg.materialId}`,
          materialId: pkg.materialId,
          type: 'salida_produccion',
          quantity: required,
          date: new Date().toISOString(),
          lote: finalLote,
          user: currentUser.name,
          notes: `Empacado y sellado para OP ${order.id} (Liberado por Control de Calidad)`
        });
      }
    });

    // 2. Incrementar Stock de Producto Terminado
    const ptId = formula.id === 'f-1' ? 'pt-1' : 'pt-2';
    const totalBolsasProduced = 100 * multiplier; // Cada lote de 100kg da 100 bolsas de 1kg
    const ptIdx = currentMaterials.findIndex(m => m.id === ptId);
    
    if (ptIdx !== -1) {
      currentMaterials[ptIdx].stock += totalBolsasProduced;
      currentMaterials[ptIdx].loteProveedor = finalLote;
      
      newMovements.push({
        id: `mov-${Date.now()}-pt`,
        materialId: ptId,
        type: 'entrada_compra', 
        quantity: totalBolsasProduced,
        date: new Date().toISOString(),
        lote: finalLote,
        user: currentUser.name,
        notes: `Liberación Control de Calidad OP ${order.id}. +${totalBolsasProduced} bolsas de 1kg`
      });
    }

    // Guardar cambios de materiales y movimientos en base de datos
    MockDatabase.saveRawMaterials(currentMaterials);
    const databaseMovements = MockDatabase.getStockMovements();
    MockDatabase.saveStockMovements([...newMovements, ...databaseMovements]);

    // 3. Completar órden de producción con info de QA
    const updatedOrders = productionOrders.map(o => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          lote: finalLote,
          qaCheck: {
            id: `qa-${Date.now().toString().slice(-4)}`,
            ph: qa.ph,
            density: qa.density,
            sensoryPassed: qa.sensoryPassed,
            sealingPassed: qa.sealingPassed,
            passed: qa.sensoryPassed && qa.sealingPassed,
            notes: `Liberado por ${currentUser.name}. pH: ${qa.ph}, Densidad: ${qa.density} g/cm³. Humedad y color correctos.`,
            checkedBy: currentUser.name,
            date: new Date().toISOString()
          }
        };
      }
      return o;
    });

    MockDatabase.saveProductionOrders(updatedOrders);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Aprobó Control de Calidad y liberó lote ${finalLote}`,
      'Control de Calidad (QA/QC)',
      `Análisis: pH ${qa.ph}, Densidad ${qa.density}. Evaluación sensorial y de empaque CUMPLIDA. Lote disponible para venta.`
    );

    loadDatabase();
    setQaOrderId(null);
    setQaPh(6.5);
    setQaDensity(1.05);
    setQaSensory(false);
    setQaSealing(false);
    alert(`¡Control de Calidad Aprobado! El lote ${finalLote} ha sido liberado oficialmente y cargado al inventario de ventas.`);
  };

  const getFormulaCost = (formula: Formula) => {
    const ingCost = formula.ingredients.reduce((acc, ing) => {
      const mat = materials.find(m => m.id === ing.materialId);
      const cost = mat ? mat.costPerUnit : 0;
      return acc + (ing.amountPerThousandLiters * cost);
    }, 0);

    const pkgCost = formula.packaging.reduce((acc, pkg) => {
      return acc + (pkg.quantity * pkg.cost);
    }, 0);

    return ingCost + pkgCost + formula.laborCost + formula.otherCost;
  };

  const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="production_root">
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
              Producción y Preparación de Mezclas
            </h1>
            <p className="text-xs text-sky-200/80">
              Operador activo: <span className="text-cyan-300 font-semibold">{currentUser.name}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-xs border border-white/20 cursor-pointer"
          id="btn_prod_logout"
        >
          Cerrar Sesión Producción
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form para Crear Órden */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 h-fit">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-1.5 text-cyan-600" /> Crear Órden de Producción
              </h3>
              
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fórmula / Receta</label>
                  <select
                    value={createOrderFormulaId}
                    onChange={(e) => setCreateOrderFormulaId(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">-- Elige la receta --</option>
                    {formulas.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Volumen a Fabricar (Liters)</label>
                  <select
                    value={createOrderQty}
                    onChange={(e) => setCreateOrderQty(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value={1000}>1,000 Litros (Lote Estándar)</option>
                    <option value={2000}>2,000 Litros (Doble Lote)</option>
                    <option value={3000}>3,000 Litros (Triple Lote)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notas de Fabricación</label>
                  <textarea
                    placeholder="Instrucciones adicionales para la mezcla..."
                    value={createOrderNotes}
                    onChange={(e) => setCreateOrderNotes(e.target.value)}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center shadow-sm"
                >
                  Programar Órden de Fabricación
                </button>
              </form>
            </div>

            {/* Listado de Órdenes */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-1.5 text-slate-500" /> Órdenes de Trabajo Activas e Históricas
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportToExcel(productionOrders.map(po => ({ Folio: po.id, Receta: formulas.find(f => f.id === po.formulaId)?.name || po.formulaId, Cantidad: `${po.quantityLiters} kg`, Estatus: po.status, Responsable: po.assignedTo, Fecha: new Date(po.createdAt).toLocaleDateString('es-MX') })), 'Ordenes_de_Produccion_Miauloo')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Registro de Órdenes de Producción Miauloo', ['Folio', 'Receta / Producto', 'Volumen (kg)', 'Estatus', 'Operador', 'Fecha'], productionOrders.map(po => [po.id, formulas.find(f => f.id === po.formulaId)?.name || po.formulaId, `${po.quantityLiters} kg`, po.status.toUpperCase(), po.assignedTo, new Date(po.createdAt).toLocaleDateString('es-MX')]))}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {productionOrders.map(order => {
                  const formula = formulas.find(f => f.id === order.formulaId);
                  const statusColors = {
                    pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                    in_progress: 'bg-cyan-50 text-cyan-800 border-cyan-200',
                    completed: 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  };

                  return (
                    <div 
                      key={order.id} 
                      className={`p-4 border rounded-xl transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${statusColors[order.status]}`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold uppercase">{order.id}</span>
                          <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded font-semibold text-slate-500">
                            {order.quantityLiters} Litros
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-950 mt-1">{formula?.name}</h4>
                        {order.notes && <p className="text-xs text-slate-600 mt-1 italic">"{order.notes}"</p>}
                        
                        <div className="text-[10px] text-slate-500 mt-2 flex flex-wrap gap-x-3">
                          <span>Operador: {order.operator}</span>
                          <span>Creado: {new Date(order.createdAt).toLocaleString('es-MX')}</span>
                          {order.completedAt && <span>Cerrado: {new Date(order.completedAt).toLocaleString('es-MX')}</span>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {order.status === 'completed' && (
                          <div className="text-right">
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded block text-center mb-1">
                              COMPLETADA
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-700">Lote: {order.lote}</span>
                          </div>
                        )}

                        {order.status === 'pending' && (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                          >
                            Pre-chequeo BOM
                          </button>
                        )}

                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => setQaOrderId(order.id)}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center"
                          >
                            <FileCheck className="w-4 h-4 mr-1 animate-pulse" /> Validar Control de Calidad y Cerrar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CONFIDENTIAL RECIPES */}
        {activeTab === 'formulas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lista de Fórmulas */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Recetario Industrial</h3>
              <div className="space-y-2">
                {formulas.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormulaId(f.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${
                      selectedFormulaId === f.id 
                        ? 'border-cyan-500 bg-cyan-50/50 text-cyan-900 font-semibold' 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{f.name}</span>
                    <Beaker className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>

              {/* Form de Agregar Receta */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Formular Nueva Receta (BOM)</h4>
                <form onSubmit={handleCreateFormula} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre del Producto"
                    value={newFormulaName}
                    onChange={(e) => setNewFormulaName(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={newFormulaDesc}
                    onChange={(e) => setNewFormulaDesc(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:ring-1 focus:ring-cyan-500"
                  />
                  
                  {/* Ingredientes Form */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Ingredientes (Suma total debe ser 100%)</label>
                    {formulaIngredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2">
                        <select
                          value={ing.materialId}
                          onChange={(e) => {
                            const updated = [...formulaIngredients];
                            updated[idx].materialId = e.target.value;
                            setFormulaIngredients(updated);
                          }}
                          className="w-2/3 text-xs bg-white border border-slate-200 rounded p-1"
                        >
                          {materials.filter(m => m.id.startsWith('mat')).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="%"
                          value={ing.percentage}
                          onChange={(e) => {
                            const updated = [...formulaIngredients];
                            updated[idx].percentage = Number(e.target.value);
                            setFormulaIngredients(updated);
                          }}
                          className="w-1/3 text-xs bg-white border border-slate-200 rounded p-1"
                          min="0.1"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addIngredientToNewFormula}
                      className="text-cyan-600 hover:text-cyan-800 text-[10px] font-bold"
                    >
                      + Añadir Insumo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase">Sueldo Labor ($)</label>
                      <input
                        type="number"
                        value={newFormulaLabor}
                        onChange={(e) => setNewFormulaLabor(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-slate-200 rounded p-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase">Indirecto ($)</label>
                      <input
                        type="number"
                        value={newFormulaOther}
                        onChange={(e) => setNewFormulaOther(Number(e.target.value))}
                        className="w-full text-xs bg-white border border-slate-200 rounded p-1"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold text-xs py-2 rounded"
                  >
                    Resguardar Nueva Fórmula
                  </button>
                </form>
              </div>
            </div>

            {/* BOM Detailed view */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              {(() => {
                const formula = formulas.find(f => f.id === selectedFormulaId);
                if (!formula) return <p className="text-slate-400 text-sm">Selecciona una receta para ver sus componentes.</p>;

                const totalBOMCost = getFormulaCost(formula);

                return (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-xs bg-cyan-100 text-cyan-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
                          Garantía de Calidad Repostería
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 mt-2">{formula.name}</h2>
                        <p className="text-xs text-slate-500 mt-1">{formula.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-semibold uppercase block">Costo Total (Lote 100kg)</span>
                        <span className="text-2xl font-black text-slate-900">${totalBOMCost.toLocaleString('es-MX')} MXN</span>
                        <span className="text-xs text-slate-500 block">Costo Unitario por kg: ${(totalBOMCost / 100).toFixed(2)} MXN</span>
                        <span className="text-xs text-cyan-600 block font-semibold">Costo por Bolsa 1kg: ${(totalBOMCost / 100).toFixed(2)} MXN</span>
                      </div>
                    </div>

                    {/* Ingredientes de Repostería */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                        <Layers className="w-4 h-4 mr-1 text-cyan-600" /> Ingredientes y Proporciones (Fórmula de Mezcla)
                      </h4>
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                              <th className="p-3">Ingrediente / Materia Prima</th>
                              <th className="p-3">Porcentaje exacto (%)</th>
                              <th className="p-3">Cantidad Requerida (Lote)</th>
                              <th className="p-3">Costo Promedio Unitario</th>
                              <th className="p-3 text-right">Subtotal Insumo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formula.ingredients.map((ing, idx) => {
                              const mat = materials.find(m => m.id === ing.materialId);
                              const cost = mat ? mat.costPerUnit : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-800">{mat?.name}</td>
                                  <td className="p-3 font-mono font-bold text-cyan-600">{ing.percentage}%</td>
                                  <td className="p-3 font-mono">{ing.amountPerThousandLiters} {mat?.unit}</td>
                                  <td className="p-3">${cost.toFixed(2)} / {mat?.unit}</td>
                                  <td className="p-3 text-right font-bold text-slate-950">${(ing.amountPerThousandLiters * cost).toLocaleString('es-MX')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Envases, Tapas y Etiquetas */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                        <Package className="w-4 h-4 mr-1 text-cyan-600" /> Componentes de Empaque y Acondicionamiento (BOM)
                      </h4>
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                              <th className="p-3">Componente de Empaque</th>
                              <th className="p-3">Cantidad Asociada</th>
                              <th className="p-3">Costo de Adquisición</th>
                              <th className="p-3 text-right">Subtotal Empaque</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formula.packaging.map((pkg, idx) => {
                              const mat = materials.find(m => m.id === pkg.materialId);
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-800">{mat?.name}</td>
                                  <td className="p-3 font-mono">{pkg.quantity} {mat?.unit}</td>
                                  <td className="p-3">${pkg.cost.toFixed(2)} / pzs</td>
                                  <td className="p-3 text-right font-bold text-slate-950">${(pkg.quantity * pkg.cost).toLocaleString('es-MX')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Costos Indirectos de Fabricación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Costos de Mano de Obra (Operario):</span>
                        <span className="font-bold text-slate-900">${formula.laborCost.toLocaleString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Gastos Indirectos (Luz, Equipos, Depreciación):</span>
                        <span className="font-bold text-slate-900">${formula.otherCost.toLocaleString('es-MX')}</span>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* TAB 3: MRP SIMULATOR */}
        {activeTab === 'mrp' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-600 animate-pulse" /> Planificación de Requerimiento de Materiales (MRP - Explosión de Insumos)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Realiza una simulación de explosión de materiales para planificar futuras órdenes de fabricación. El sistema calcula en tiempo real si el inventario actual es suficiente o si es necesario emitir órdenes de compra.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Receta / Fórmula Objetivo</label>
                  <select
                    value={mrpFormulaId}
                    onChange={(e) => setMrpFormulaId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                  >
                    <option value="">-- Elige una Receta --</option>
                    {formulas.map(f => (
                      <option key={f.id} value={f.id}>{f.name} (Lote Estándar: {f.batchSizeLiters}kg)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cantidad a Producir (kg)</label>
                  <input
                    type="number"
                    value={mrpBatchQty}
                    onChange={(e) => setMrpBatchQty(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold font-semibold"
                    min="1"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      if (!mrpFormulaId) alert('Por favor, selecciona una fórmula.');
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs font-semibold"
                  >
                    Simular Requerimiento MRP
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const selectedFormula = formulas.find(f => f.id === mrpFormulaId);
              if (!selectedFormula) {
                return (
                  <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
                    <Layers className="w-16 h-16 mx-auto text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-700">Explosión de Materiales Interactiva</p>
                    <p className="text-xs mt-1">Selecciona una receta y define la escala del lote arriba para ver la simulación MRP.</p>
                  </div>
                );
              }

              const multiplier = mrpBatchQty / selectedFormula.batchSizeLiters;
              let hasShortages = false;
              const shortagesList: { materialId: string, quantity: number, price: number }[] = [];

              const mrpItems = [
                ...selectedFormula.ingredients.map(ing => {
                  const required = ing.amountPerThousandLiters * multiplier;
                  const mat = materials.find(m => m.id === ing.materialId);
                  const available = mat ? mat.stock : 0;
                  const isSufficient = available >= required;
                  const deficit = isSufficient ? 0 : required - available;
                  if (!isSufficient) {
                    hasShortages = true;
                    shortagesList.push({ materialId: ing.materialId, quantity: deficit, price: mat ? mat.costPerUnit : 15 });
                  }

                  return {
                    id: ing.materialId,
                    name: mat ? mat.name : 'Insumo',
                    sku: mat ? mat.sku : 'SKU',
                    unit: mat ? mat.unit : 'kg',
                    required,
                    available,
                    deficit,
                    isSufficient
                  };
                }),
                ...selectedFormula.packaging.map(pkg => {
                  const required = pkg.quantity * multiplier;
                  const mat = materials.find(m => m.id === pkg.materialId);
                  const available = mat ? mat.stock : 0;
                  const isSufficient = available >= required;
                  const deficit = isSufficient ? 0 : required - available;
                  if (!isSufficient) {
                    hasShortages = true;
                    shortagesList.push({ materialId: pkg.materialId, quantity: deficit, price: pkg.cost });
                  }

                  return {
                    id: pkg.materialId,
                    name: mat ? mat.name : 'Empaque',
                    sku: mat ? mat.sku : 'SKU',
                    unit: mat ? mat.unit : 'pzs',
                    required,
                    available,
                    deficit,
                    isSufficient
                  };
                })
              ];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* MRP Ingredients Table */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                          <Layers className="w-4 h-4 mr-1 text-slate-600" /> Resultados del Análisis MRP ({selectedFormula.name})
                        </h4>
                        <span className="font-mono text-[10px] text-slate-400">Escala: x{multiplier.toFixed(2)}</span>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase text-[9px]">
                              <th className="p-2.5">SKU / Insumo</th>
                              <th className="p-2.5 text-center">Requerido</th>
                              <th className="p-2.5 text-center">Disponible</th>
                              <th className="p-2.5 text-center">Faltante</th>
                              <th className="p-2.5 text-center">Estatus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mrpItems.map(item => (
                              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2.5">
                                  <span className="font-mono text-[10px] font-bold text-slate-400 block">{item.sku}</span>
                                  <span className="font-semibold text-slate-900">{item.name}</span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.required.toFixed(1)} {item.unit}</td>
                                <td className="p-2.5 text-center font-mono text-slate-500">{item.available.toFixed(1)} {item.unit}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-red-600">
                                  {item.deficit > 0 ? `${item.deficit.toFixed(1)} ${item.unit}` : '0.0'}
                                </td>
                                <td className="p-2.5 text-center">
                                  {item.isSufficient ? (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Suficiente</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase">Abastecer</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Sugerencias de Abastecimiento */}
                  <div className="space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                        <BadgeAlert className="w-4 h-4 mr-1.5 text-indigo-600" /> Plan de Acción MRP
                      </h4>

                      {!hasShortages ? (
                        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 space-y-2">
                          <p className="font-bold text-xs flex items-center"><Check className="w-4 h-4 mr-1" /> ¡Viabilidad Completa!</p>
                          <p className="text-[11px]">Tienes suficiente materia prima y empaque en Almacén para lanzar esta orden de {mrpBatchQty}kg de inmediato.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 space-y-1">
                            <p className="font-bold text-xs flex items-center"><AlertCircle className="w-4 h-4 mr-1 text-rose-600" /> Desabasto Detectado</p>
                            <p className="text-[11px]">No se cuenta con los insumos suficientes para completar este lote. Es necesario realizar compras previas.</p>
                          </div>

                          <div className="border border-slate-200 rounded-xl p-4 space-y-3 font-semibold">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block font-semibold">Sugerencia de Abastecimiento</span>
                            <div className="space-y-2">
                              {shortagesList.map((short, i) => {
                                const m = materials.find(mat => mat.id === short.materialId);
                                return (
                                  <div key={i} className="flex justify-between text-xs font-semibold text-slate-700">
                                    <span>{m?.name}</span>
                                    <span className="font-mono text-rose-600">+{short.quantity.toFixed(1)} {m?.unit}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => {
                                // Crear la orden de compra automáticamente en la base de datos!
                                const poItemsFormatted = shortagesList.map(short => {
                                  const m = materials.find(mat => mat.id === short.materialId);
                                  return {
                                    materialId: short.materialId,
                                    materialName: m ? m.name : 'Insumo',
                                    quantity: Math.ceil(short.quantity * 1.2), // Agregar un 20% de seguridad
                                    unitPrice: short.price,
                                    total: Math.ceil(short.quantity * 1.2) * short.price
                                  };
                                });

                                const subtotal = poItemsFormatted.reduce((a, b) => a + b.total, 0);
                                const newPo: any = {
                                  id: `oc-mrp-${Date.now().toString().slice(-4)}`,
                                  supplierName: 'Distribuidora Harinera del Centro',
                                  items: poItemsFormatted,
                                  subtotal,
                                  tax: 0,
                                  total: subtotal,
                                  status: 'draft',
                                  createdAt: new Date().toISOString()
                                };

                                const existingPOs = MockDatabase.getPurchaseOrders();
                                MockDatabase.savePurchaseOrders([newPo, ...existingPOs]);

                                MockDatabase.addAuditLog(
                                  currentUser.name,
                                  `Creó Orden de Compra Automática por MRP`,
                                  'Abastecimiento / Compras',
                                  `Orden ${newPo.id} sugerida por explosión de materiales para receta ${selectedFormula.name}.`
                                );

                                alert(`¡Orden de compra sugerida generada con éxito en estatus Borrador! Folio: ${newPo.id}. El rol de Almacén ya la tiene disponible para validación.`);
                              }}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs mt-2 shadow-xs flex items-center justify-center transition-all font-semibold"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Generar OC en Almacén
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Pre-check Validation Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Beaker className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-tight">Pre-chequeo del Almacén Físico</h3>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Análisis de Viabilidad de Producción</p>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {formulas.find(f => f.id === selectedOrder.formulaId)?.name}
                </h4>
                <p className="text-slate-600 mt-1">Volumen solicitado: <b>{selectedOrder.quantityLiters} Litros</b>. Valida si la materia prima e insumos de empaquetado son suficientes.</p>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-3">Insumo Requerido</th>
                      <th className="p-3">Necesario</th>
                      <th className="p-3">Disponible en Almacén</th>
                      <th className="p-3 text-center">Factibilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getPreCheckResults(selectedOrder).items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{it.name}</td>
                        <td className="p-3 font-mono">{it.required} {it.unit}</td>
                        <td className="p-3 font-mono">{it.available} {it.unit}</td>
                        <td className="p-3 text-center">
                          {it.isSufficient ? (
                            <span className="inline-flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">
                              <Check className="w-3 h-3 mr-0.5" /> Suficiente
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">
                              <AlertCircle className="w-3 h-3 mr-0.5 animate-pulse" /> Faltan {(it.required - it.available).toFixed(1)} {it.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resultado global */}
              {getPreCheckResults(selectedOrder).passed ? (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-900 flex items-start space-x-3 mt-4">
                  <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">¡Insumos Disponibles!</h5>
                    <p className="text-[11px] text-green-700 mt-0.5">El almacén cuenta con el 100% de los insumos requeridos. Puede dosificar la mezcla con seguridad.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-950 flex items-start space-x-3 mt-4">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Mezcla Bloqueada</h5>
                    <p className="text-[11px] text-red-800 mt-0.5">Faltan insumos críticos. Notifica al Gerente para que el Almacenista cargue entradas de insumos por compra.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs border border-slate-200 transition-all"
              >
                Cancelar
              </button>
              
              <button
                onClick={() => handleStartProduction(selectedOrder)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all disabled:opacity-50"
                disabled={!getPreCheckResults(selectedOrder).passed}
              >
                Iniciar Mezcla y Dosificación
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QA Checklist Modal */}
      {qaOrderId && (() => {
        const targetOrder = productionOrders.find(o => o.id === qaOrderId);
        const formula = targetOrder ? formulas.find(f => f.id === targetOrder.formulaId) : null;
        if (!targetOrder) return null;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden text-slate-700 my-auto">
              <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-indigo-300" />
                  <div>
                    <h3 className="font-bold text-sm">Control de Calidad (HACCP)</h3>
                    <p className="text-[10px] text-indigo-200">Validación de inocuidad y empaque antes de liberación.</p>
                  </div>
                </div>
                <button onClick={() => setQaOrderId(null)} className="text-indigo-200 hover:text-white font-bold">✕</button>
              </div>

              <div className="p-5 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-900 text-xs">Orden a Liberar: {targetOrder.id}</p>
                  <p className="text-[11px] text-slate-500">Receta: {formula?.name}</p>
                  <p className="text-[11px] text-slate-500">Cantidad Lote: {targetOrder.quantityLiters} kg</p>
                </div>

                {/* pH Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="font-bold text-slate-600">Medición de pH (Rango Aceptado: 5.5 - 7.5)</label>
                    <span className="font-mono text-indigo-600 font-bold">{qaPh}</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="9.0"
                    step="0.1"
                    value={qaPh}
                    onChange={(e) => setQaPh(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>Ácido (4.0)</span>
                    <span className="text-emerald-600 font-bold">Ideal (6.5)</span>
                    <span>Alcalino (9.0)</span>
                  </div>
                </div>

                {/* Density Input */}
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Densidad Relativa (g/cm³)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="2.0"
                    step="0.01"
                    value={qaDensity}
                    onChange={(e) => setQaDensity(Number(e.target.value))}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    required
                  />
                </div>

                {/* Checklist options */}
                <div className="space-y-2.5 pt-2">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider text-[9px]">Puntos Críticos de Control (CCP)</label>
                  
                  <label className="flex items-start space-x-2.5 p-2 rounded border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaSensory}
                      onChange={(e) => setQaSensory(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Evaluación Sensorial Cumplida</p>
                      <p className="text-[10px] text-slate-400">Color, textura uniforme, sabor e higroscopicidad correctos de la mezcla.</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 p-2 rounded border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qaSealing}
                      onChange={(e) => setQaSealing(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                    />
                    <div>
                      <p className="font-bold text-slate-800">Prueba de Sellado y Loteado Correcto</p>
                      <p className="text-[10px] text-slate-400">Las bolsas selladoras no tienen fisuras. Código de lote impreso correctamente.</p>
                    </div>
                  </label>
                </div>

                {/* Action button */}
                <button
                  onClick={() => {
                    if (!qaSensory || !qaSealing) {
                      alert('Error: Todos los Puntos Críticos de Control (CCP) deben ser verificados y aprobados para poder liberar el lote al almacén.');
                      return;
                    }
                    if (qaPh < 5.5 || qaPh > 7.5) {
                      alert('Error: El pH medido está fuera del rango de tolerancia inocua (5.5 - 7.5). El lote debe ser retenido.');
                      return;
                    }
                    handleCloseProductionWithQA(targetOrder, { ph: qaPh, density: qaDensity, sensoryPassed: qaSensory, sealingPassed: qaSealing });
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs mt-4 shadow-md flex items-center justify-center transition-all"
                >
                  <Check className="w-4 h-4 mr-1.5" /> Aprobar y Liberar Lote a Ventas
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
