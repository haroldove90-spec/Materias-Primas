import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, ArrowUpDown, 
  Download, FileText, RefreshCw, Check, X, Edit, Trash2, 
  Layers, DollarSign, Calendar, Tag, PlusCircle, MinusCircle, CheckCircle2
} from 'lucide-react';
import { RawMaterial, User } from '../types';
import { MockDatabase } from '../data';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { 
  fetchRawMaterialsFromSupabase, 
  saveRawMaterialToSupabase, 
  deleteRawMaterialInSupabase 
} from '../services/supabaseService';

interface AdminRawMaterialsManagerProps {
  currentUser: User;
}

export const AdminRawMaterialsManager: React.FC<AdminRawMaterialsManagerProps> = ({ currentUser }) => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'ok' | 'out'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for New/Edit Material
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState<number>(0);
  const [unit, setUnit] = useState<'kg' | 'L' | 'pzs'>('kg');
  const [minStock, setMinStock] = useState<number>(10);
  const [costPerUnit, setCostPerUnit] = useState<number>(0);
  const [loteProveedor, setLoteProveedor] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Quick Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustMaterial, setAdjustMaterial] = useState<RawMaterial | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  const loadMaterials = async () => {
    // 1. Local
    const local = MockDatabase.getRawMaterials();
    setMaterials(local);

    // 2. Fetch from Supabase
    try {
      const res = await fetchRawMaterialsFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const map = new Map<string, RawMaterial>();
        local.forEach(m => map.set(m.id, m));
        res.data.forEach(m => map.set(m.id, m));
        const merged = Array.from(map.values());
        MockDatabase.saveRawMaterials(merged);
        setMaterials(merged);
      }
    } catch (e) {
      console.warn('Sync raw materials error:', e);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetchRawMaterialsFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveRawMaterials(res.data);
        setMaterials(res.data);
        setFeedback({ type: 'success', text: `¡${res.data.length} materias primas sincronizadas con Supabase!` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'No se pudo sincronizar desde la nube' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión con Supabase' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setName('');
    setSku(`MP-${Math.floor(100 + Math.random() * 900)}`);
    setStock(0);
    setUnit('kg');
    setMinStock(10);
    setCostPerUnit(0);
    setLoteProveedor('');
    setExpiryDate('');
    setShowModal(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingMaterial(m);
    setName(m.name);
    setSku(m.sku);
    setStock(m.stock);
    setUnit(m.unit);
    setMinStock(m.minStock);
    setCostPerUnit(m.costPerUnit);
    setLoteProveedor(m.loteProveedor || '');
    setExpiryDate(m.expiryDate || '');
    setShowModal(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('El nombre del insumo es obligatorio');
      return;
    }

    const newMat: RawMaterial = {
      id: editingMaterial ? editingMaterial.id : `mat-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now()}`,
      stock: Number(stock) || 0,
      unit,
      minStock: Number(minStock) || 0,
      costPerUnit: Number(costPerUnit) || 0,
      loteProveedor: loteProveedor.trim() || undefined,
      expiryDate: expiryDate || undefined
    };

    const currentList = MockDatabase.getRawMaterials();
    let updatedList: RawMaterial[] = [];
    if (editingMaterial) {
      updatedList = currentList.map(m => m.id === editingMaterial.id ? newMat : m);
    } else {
      updatedList = [newMat, ...currentList];
    }
    MockDatabase.saveRawMaterials(updatedList);
    setMaterials(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      editingMaterial ? 'Actualizó materia prima' : 'Registró nueva materia prima',
      'Inventario',
      `${newMat.name} (${newMat.sku}) - Stock: ${newMat.stock} ${newMat.unit}`
    );

    setShowModal(false);
    setFeedback({ type: 'success', text: `Materia prima ${editingMaterial ? 'actualizada' : 'registrada'} correctamente.` });

    // Sync to Supabase
    try {
      await saveRawMaterialToSupabase(newMat);
    } catch (e) {
      console.warn('Supabase sync raw material error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = async (id: string, matName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el insumo "${matName}" del inventario?`)) return;

    const currentList = MockDatabase.getRawMaterials();
    const updated = currentList.filter(m => m.id !== id);
    MockDatabase.saveRawMaterials(updated);
    setMaterials(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó materia prima',
      'Inventario',
      `ID: ${id}, Nombre: ${matName}`
    );

    setFeedback({ type: 'success', text: `Materia prima "${matName}" eliminada.` });

    try {
      await deleteRawMaterialInSupabase(id);
    } catch (e) {
      console.warn('Supabase delete raw material error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Quick Stock Adjustment
  const handleOpenAdjust = (m: RawMaterial) => {
    setAdjustMaterial(m);
    setAdjustType('add');
    setAdjustQty(0);
    setAdjustReason('Ajuste de inventario físico');
    setShowAdjustModal(true);
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustMaterial || adjustQty <= 0) {
      alert('Ingresa una cantidad válida mayor a cero');
      return;
    }

    let newStock = adjustMaterial.stock;
    if (adjustType === 'add') {
      newStock += adjustQty;
    } else if (adjustType === 'remove') {
      newStock = Math.max(0, newStock - adjustQty);
    } else {
      newStock = adjustQty;
    }

    const updatedMat: RawMaterial = {
      ...adjustMaterial,
      stock: newStock
    };

    const currentList = MockDatabase.getRawMaterials();
    const list = currentList.map(m => m.id === adjustMaterial.id ? updatedMat : m);
    MockDatabase.saveRawMaterials(list);
    setMaterials(list);

    // Kárdex movement
    MockDatabase.addStockMovement(
      adjustMaterial.id,
      adjustMaterial.name,
      adjustType === 'add' ? 'in' : 'adjustment',
      adjustQty,
      adjustMaterial.unit,
      `${adjustType === 'add' ? 'Entrada / Ajuste +' : 'Salida / Merma -'}: ${adjustReason || 'Ajuste administrativo'}`
    );

    MockDatabase.addAuditLog(
      currentUser.name,
      'Ajustó inventario materia prima',
      'Inventario',
      `${adjustMaterial.name}: ${adjustMaterial.stock} -> ${newStock} ${adjustMaterial.unit}`
    );

    setShowAdjustModal(false);
    setFeedback({ type: 'success', text: `Stock de "${adjustMaterial.name}" actualizado a ${newStock} ${adjustMaterial.unit}.` });

    try {
      await saveRawMaterialToSupabase(updatedMat);
    } catch (err) {
      console.warn('Supabase adjust error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleExportExcel = () => {
    const data = filteredMaterials.map(m => ({
      'ID': m.id,
      'SKU / Código': m.sku,
      'Materia Prima': m.name,
      'Stock Actual': m.stock,
      'Unidad': m.unit,
      'Stock Mínimo': m.minStock,
      'Costo Unitario ($)': m.costPerUnit,
      'Valor Inventario ($)': m.stock * m.costPerUnit,
      'Lote Proveedor': m.loteProveedor || 'N/A',
      'Caducidad': m.expiryDate || 'N/A',
      'Estado Stock': m.stock <= 0 ? 'AGOTADO' : m.stock <= m.minStock ? 'BAJO STOCK' : 'ÓPTIMO'
    }));
    exportToExcel(data, `Materias_Primas_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const headers = ['SKU', 'Materia Prima', 'Stock', 'Unidad', 'Costo Unit.', 'Valor Total', 'Estado'];
    const rows = filteredMaterials.map(m => [
      m.sku,
      m.name,
      m.stock.toString(),
      m.unit,
      `$${m.costPerUnit.toFixed(2)}`,
      `$${(m.stock * m.costPerUnit).toLocaleString()}`,
      m.stock <= 0 ? 'AGOTADO' : m.stock <= m.minStock ? 'BAJO' : 'OK'
    ]);
    exportToPDF('Inventario de Materias Primas e Insumos - Miauloo ERP', headers, rows, `Materias_Primas_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.loteProveedor && m.loteProveedor.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesUnit = unitFilter === 'all' || m.unit === unitFilter;
    
    let matchesStock = true;
    if (stockStatusFilter === 'out') matchesStock = m.stock <= 0;
    else if (stockStatusFilter === 'low') matchesStock = m.stock > 0 && m.stock <= m.minStock;
    else if (stockStatusFilter === 'ok') matchesStock = m.stock > m.minStock;

    return matchesSearch && matchesUnit && matchesStock;
  });

  const totalInventoryValue = materials.reduce((acc, m) => acc + (m.stock * m.costPerUnit), 0);
  const lowStockCount = materials.filter(m => m.stock <= m.minStock && m.stock > 0).length;
  const outOfStockCount = materials.filter(m => m.stock <= 0).length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Inventario de Materias Primas e Insumos</h1>
              <p className="text-xs text-slate-500">Control de materias primas, costos unitarios, stock mínimo y lotes</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Sincronizar materias primas con Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Exportar a Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors"
            title="Exportar a PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Materia Prima</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Insumos Registrados</p>
            <h3 className="text-2xl font-bold text-slate-800">{materials.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Valoración Total Stock</p>
            <h3 className="text-2xl font-bold text-emerald-600">${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Stock Bajo (Reabastecer)</p>
            <h3 className="text-2xl font-bold text-amber-600">{lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Insumos Agotados (0)</p>
            <h3 className="text-2xl font-bold text-rose-600">{outOfStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por nombre, SKU, o lote de proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">Todos los Estados</option>
            <option value="low">Stock Bajo / Crítico</option>
            <option value="out">Agotados (Stock 0)</option>
            <option value="ok">Stock Óptimo</option>
          </select>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">Todas las Unidades</option>
            <option value="kg">Kilogramos (kg)</option>
            <option value="L">Litros (L)</option>
            <option value="pzs">Piezas (pzs)</option>
          </select>
        </div>
      </div>

      {/* Raw Materials Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">SKU / Insumo</th>
                <th className="py-3.5 px-4 text-center">Unidad</th>
                <th className="py-3.5 px-4 text-right">Stock Actual</th>
                <th className="py-3.5 px-4 text-right">Stock Mínimo</th>
                <th className="py-3.5 px-4 text-right">Costo Unit.</th>
                <th className="py-3.5 px-4 text-right">Valor Total</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Lote / Caducidad</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredMaterials.map((m) => {
                const isOut = m.stock <= 0;
                const isLow = m.stock > 0 && m.stock <= m.minStock;
                const totalVal = m.stock * m.costPerUnit;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                          isOut ? 'bg-rose-100 text-rose-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <span className="text-[11px] font-mono text-slate-400">SKU: {m.sku}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                        {m.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                      <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800'}>
                        {m.stock.toLocaleString()} {m.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                      {m.minStock.toLocaleString()} {m.unit}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      ${m.costPerUnit.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">
                      ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isOut ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200">
                          Agotado
                        </span>
                      ) : isLow ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-bold text-[11px] border border-amber-200">
                          Bajo Stock
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                          Óptimo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center text-[11px] text-slate-500">
                      {m.loteProveedor ? (
                        <div>
                          <span className="font-mono font-semibold text-slate-700 block">{m.loteProveedor}</span>
                          {m.expiryDate && <span className="text-slate-400">{m.expiryDate}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(m)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          title="Ajustar stock rápido"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          <span>Ajustar</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar materia prima"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar del catálogo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No hay materias primas</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              No se encontraron registros con los filtros o términos de búsqueda ingresados.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Materia Prima</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL NUEVA / EDITAR MATERIA PRIMA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingMaterial ? 'Editar Materia Prima' : 'Registrar Materia Prima'}
                  </h2>
                  <p className="text-xs text-slate-500">Parámetros de inventario, costos y lotes de almacén</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nombre de la materia prima */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Insumo / Materia Prima *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Harina de Trigo Extra Fina (Bolsa 50kg)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SKU / Código Interno</label>
                  <input 
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="MP-101"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Unidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unidad de Medida</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="L">Litros (L)</option>
                    <option value="pzs">Piezas (pzs)</option>
                  </select>
                </div>

                {/* Stock Actual */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Actual</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Mínimo (Alerta)</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Costo Unitario */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Unitario ($ MXN)</label>
                  <input 
                    type="number"
                    min={0}
                    step="any"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Lote Proveedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lote del Proveedor</label>
                  <input 
                    type="text"
                    value={loteProveedor}
                    onChange={(e) => setLoteProveedor(e.target.value)}
                    placeholder="Ej. LOT-2026-09"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Fecha Caducidad */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Caducidad / Vencimiento</label>
                  <input 
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/20 flex items-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingMaterial ? 'Guardar Cambios' : 'Registrar Materia Prima'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL AJUSTE RÁPIDO DE INVENTARIO */}
      {showAdjustModal && adjustMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Ajuste de Stock Físico</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">{adjustMaterial.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-6 space-y-4 text-slate-700">
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Stock Actual en Sistema:</span>
                <span className="font-bold text-slate-800 font-mono text-sm">{adjustMaterial.stock} {adjustMaterial.unit}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Ajuste</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      adjustType === 'add' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + Entrada
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('remove')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      adjustType === 'remove' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    - Salida / Merma
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      adjustType === 'set' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    = Fijar Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {adjustType === 'set' ? `Nuevo Stock Total (${adjustMaterial.unit})` : `Cantidad a ${adjustType === 'add' ? 'Agregar' : 'Restar'} (${adjustMaterial.unit})`}
                </label>
                <input 
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo del Ajuste</label>
                <input 
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ej. Conteo físico mensual, Merma por derrame..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Ajuste</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
