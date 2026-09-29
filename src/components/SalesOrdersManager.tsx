import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Search, Filter, Eye, Edit, Trash2, 
  Download, Printer, RefreshCw, X, CheckCircle2, Clock, 
  AlertTriangle, Receipt, FileText, Check, DollarSign, Calendar, Tag, ArrowUpRight
} from 'lucide-react';
import { Sale, OrderItem, User, Client } from '../types';
import { MockDatabase } from '../data';
import { exportToExcel, exportToPDF, printElement } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { 
  fetchSalesFromSupabase, 
  saveSaleToSupabase, 
  deleteSaleInSupabase 
} from '../services/supabaseService';

interface SalesOrdersManagerProps {
  currentUser: User;
  onGoToPOS?: () => void;
}

export const SalesOrdersManager: React.FC<SalesOrdersManagerProps> = ({ currentUser, onGoToPOS }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Cotización' | 'Pedido Activo' | 'Entregado' | 'Cancelado'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Contado' | 'Crédito'>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'Remisión' | 'CFDI'>('all');

  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Edit Form States
  const [editStatus, setEditStatus] = useState<Sale['status']>('Pedido Activo');
  const [editPaymentType, setEditPaymentType] = useState<Sale['paymentType']>('Contado');
  const [editBillingType, setEditBillingType] = useState<Sale['billingType']>('Remisión');
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Load Sales Data
  const loadSales = async () => {
    const local = MockDatabase.getSales();
    setSales(local);

    try {
      const res = await fetchSalesFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const map = new Map<string, Sale>();
        local.forEach(s => map.set(s.id, s));
        res.data.forEach(s => map.set(s.id, s));
        const merged = Array.from(map.values());
        MockDatabase.saveSales(merged);
        setSales(merged);
      }
    } catch (e) {
      console.warn('Sync sales error:', e);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetchSalesFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveSales(res.data);
        setSales(res.data);
        setFeedback({ type: 'success', text: `¡${res.data.length} ventas sincronizadas con Supabase!` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'No se pudo sincronizar ventas' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión con la nube de Supabase' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const activeSales = sales.filter(s => s.active !== false && s.status !== 'Cancelado');
    const totalAmount = activeSales
      .filter(s => s.status === 'Entregado' || s.status === 'Pedido Activo')
      .reduce((sum, s) => sum + (s.total || 0), 0);
    
    const countActive = sales.filter(s => s.status === 'Pedido Activo').length;
    const countQuotes = sales.filter(s => s.status === 'Cotización').length;
    const creditSales = activeSales.filter(s => s.paymentType === 'Crédito').reduce((sum, s) => sum + s.total, 0);

    return { totalAmount, countActive, countQuotes, creditSales };
  }, [sales]);

  // Open Edit Modal
  const handleOpenEdit = (s: Sale) => {
    setSelectedSale(s);
    setEditStatus(s.status);
    setEditPaymentType(s.paymentType);
    setEditBillingType(s.billingType);
    setEditAmountPaid(s.amountPaid || 0);
    setEditNotes(s.notes || '');
    setShowEditModal(true);
  };

  // Open View Modal
  const handleOpenView = (s: Sale) => {
    setSelectedSale(s);
    setShowViewModal(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    const updatedSale: Sale = {
      ...selectedSale,
      status: editStatus,
      paymentType: editPaymentType,
      billingType: editBillingType,
      amountPaid: Number(editAmountPaid),
      notes: editNotes.trim()
    };

    const currentSales = MockDatabase.getSales();
    const updated = currentSales.map(s => s.id === selectedSale.id ? updatedSale : s);
    MockDatabase.saveSales(updated);
    setSales(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Modificó registro de venta',
      'Ventas / Pedidos',
      `ID: ${updatedSale.id} • Cliente: ${updatedSale.clientName} • Estatus: ${updatedSale.status}`
    );

    recordSaveTelemetry({
      table: 'sales',
      folio: updatedSale.id,
      action: 'Venta Modificada',
      countBefore: currentSales.length,
      countAfter: updated.length,
      status: 'success',
      payloadSummary: `Cliente: ${updatedSale.clientName} • Estatus: ${updatedSale.status} • Total: $${updatedSale.total.toFixed(2)}`,
      source: 'cloud_sync'
    });

    setShowEditModal(false);
    setSelectedSale(updatedSale);
    setFeedback({ type: 'success', text: `Venta ${updatedSale.id} actualizada correctamente.` });

    try {
      await saveSaleToSupabase(updatedSale);
    } catch (err) {
      console.warn('Supabase update sale error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete Sale
  const handleDeleteSale = async (s: Sale) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente la venta ${s.id} de "${s.clientName}" por $${s.total.toLocaleString('es-MX')} MXN?`)) {
      return;
    }

    const currentSales = MockDatabase.getSales();
    const updated = currentSales.filter(item => item.id !== s.id);
    MockDatabase.saveSales(updated);
    setSales(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó venta / pedido',
      'Ventas / Historial',
      `ID: ${s.id} • Cliente: ${s.clientName} • Total: $${s.total.toLocaleString('es-MX')}`
    );

    setFeedback({ type: 'success', text: `Venta ${s.id} eliminada exitosamente.` });

    try {
      await deleteSaleInSupabase(s.id);
    } catch (err) {
      console.warn('Supabase delete sale error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.active === false) return false;

      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && s.paymentType !== paymentFilter) return false;
      if (billingFilter !== 'all' && s.billingType !== billingFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = s.id.toLowerCase().includes(term);
        const matchClient = s.clientName.toLowerCase().includes(term);
        const matchItem = s.items.some(it => it.productName.toLowerCase().includes(term));
        const matchNotes = (s.notes || '').toLowerCase().includes(term);
        if (!matchId && !matchClient && !matchItem && !matchNotes) return false;
      }

      return true;
    });
  }, [sales, statusFilter, paymentFilter, billingFilter, searchTerm]);

  // Export Excel
  const handleExportExcel = () => {
    const rows = filteredSales.map(s => ({
      'Folio Venta': s.id,
      'Fecha': s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-MX') : '',
      'Cliente': s.clientName,
      'Productos': s.items.map(i => `${i.quantity} ${i.unit} ${i.productName}`).join('; '),
      'Subtotal ($)': s.subtotal,
      'IVA ($)': s.tax,
      'Total ($)': s.total,
      'Forma Pago': s.paymentType,
      'Comprobante': s.billingType,
      'Estado': s.status,
      'Abonado ($)': s.amountPaid,
      'Notas': s.notes || ''
    }));
    exportToExcel(rows, 'Historial_Ventas_Miauloo');
  };

  // Export PDF
  const handleExportPDF = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Artículos', 'Pago', 'Total', 'Estatus'];
    const rows = filteredSales.map(s => [
      s.id,
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-MX') : '',
      s.clientName,
      s.items.length.toString(),
      s.paymentType,
      `$${s.total.toLocaleString('es-MX')}`,
      s.status
    ]);
    exportToPDF('Historial y Registro de Ventas Miauloo', headers, rows);
  };

  const getStatusBadge = (status: Sale['status']) => {
    switch (status) {
      case 'Entregado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Entregado
          </span>
        );
      case 'Pedido Activo':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-purple-600" /> Pedido Activo
          </span>
        );
      case 'Cotización':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
            <FileText className="w-3 h-3 text-amber-600" /> Cotización
          </span>
        );
      case 'Cancelado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-slate-800" id="sales_orders_manager_root">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Totales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ${kpis.totalAmount.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Facturación activa y confirmada
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos en Curso</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">
              {kpis.countActive} pedidos
            </h3>
            <p className="text-xs text-slate-500 mt-1">En preparación o ruta</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cotizaciones Pendientes</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {kpis.countQuotes} registros
            </h3>
            <p className="text-xs text-slate-500 mt-1">Listas para conversión</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas a Crédito</p>
            <h3 className="text-2xl font-black text-sky-700 mt-1">
              ${kpis.creditSales.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">En cartera de cobranza</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              Historial y Registro de Ventas / Pedidos
            </h3>
            <p className="text-xs text-slate-500">
              Visualiza, edita estatus, reimprime comprobantes y gestiona los registros de ventas del sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-purple-600' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Recargar Nube'}
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>

            {onGoToPOS && (
              <button
                onClick={onGoToPOS}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-auto md:ml-0"
              >
                <ShoppingCart className="w-4 h-4" /> Ir a Caja / Nueva Venta
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, folio vta- o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white"
            >
              <option value="all">Todos los Estatus</option>
              <option value="Pedido Activo">Pedidos Activos</option>
              <option value="Entregado">Entregados</option>
              <option value="Cotización">Cotizaciones</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white"
            >
              <option value="all">Todo Pago</option>
              <option value="Contado">Contado</option>
              <option value="Crédito">Crédito</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white"
            >
              <option value="all">Todo Tipo</option>
              <option value="CFDI">Factura CFDI</option>
              <option value="Remisión">Remisión</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Folio & Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Productos / Resumen</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Pago</th>
                <th className="py-3 px-4 text-right">Total ($)</th>
                <th className="py-3 px-4 text-center">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-semibold">No se encontraron ventas o pedidos registrados.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900">{s.id}</span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-MX') : 'Reciente'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{s.clientName}</span>
                    </td>

                    <td className="py-3 px-4 max-w-[220px]">
                      <p className="truncate text-slate-600">
                        {s.items.map(it => `${it.quantity} ${it.unit} ${it.productName.split(' ')[0]}`).join(', ')}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {s.items.length} {s.items.length === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.billingType === 'CFDI' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.billingType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.paymentType === 'Crédito' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {s.paymentType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ${s.total.toLocaleString('es-MX')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        {getStatusBadge(s.status)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenView(s)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Ver Ticket / Detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 transition-colors cursor-pointer"
                          title="Editar Venta"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteSale(s)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Eliminar Registro de Venta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VER DETALLE / TICKET */}
      {showViewModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-[#032B4E] text-white shrink-0">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-sky-300" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-300 tracking-wider">Comprobante Oficial de Venta</span>
                  <h3 className="text-base font-black text-white">{selectedSale.id} • {selectedSale.clientName}</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Cliente</span>
                  <span className="font-bold text-slate-800 text-xs">{selectedSale.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Fecha y Hora</span>
                  <span className="font-semibold text-slate-700">
                    {selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString('es-MX') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Forma de Pago</span>
                  <span className="font-bold text-slate-800">{selectedSale.paymentType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Estatus</span>
                  <div className="mt-0.5">{getStatusBadge(selectedSale.status)}</div>
                </div>
                {selectedSale.cfdiStatus && (
                  <div className="col-span-2 font-mono text-[10px] bg-purple-50 p-2 rounded border border-purple-200 text-purple-900">
                    {selectedSale.cfdiStatus}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">Partidas del Pedido</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Cant.</th>
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3 text-right">P. Unit.</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSale.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-bold text-slate-700">{it.quantity} {it.unit}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{it.productName}</td>
                          <td className="py-2 px-3 text-right text-slate-600">${it.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">${it.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-right text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${selectedSale.subtotal.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA (16%):</span>
                  <span className="font-semibold">${selectedSale.tax.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total General:</span>
                  <span className="text-purple-700">${selectedSale.total.toFixed(2)} MXN</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold block text-[10px] uppercase">Notas:</span>
                  {selectedSale.notes}
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5 shrink-0">
              <button
                onClick={() => {
                  exportToPDF(`Comprobante_${selectedSale.id}`, ['Cant.', 'Producto', 'P. Unitario', 'Total'], selectedSale.items.map(i => [`${i.quantity} ${i.unit}`, i.productName, `$${i.unitPrice.toFixed(2)}`, `$${i.total.toFixed(2)}`]));
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Descargar Comprobante en archivo PDF"
              >
                <Download className="w-3.5 h-3.5" /> Descargar PDF
              </button>
              <button
                onClick={() => {
                  printElement(`
                    <div style="font-family: system-ui, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; color: #0f172a;">
                      <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                          <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; font-weight: 900;">MIAULOO ERP</h2>
                          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Comprobante de Venta Comercial</p>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-weight: 900; font-size: 14px; color: #dc2626;">FOLIO: ${selectedSale.id}</div>
                          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${new Date(selectedSale.createdAt).toLocaleString('es-MX')}</div>
                        </div>
                      </div>
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 11px;">
                        <div><strong>Cliente:</strong> <span style="text-transform: uppercase;">${selectedSale.clientName}</span></div>
                        <div style="margin-top: 3px;"><strong>Condición de Pago:</strong> ${selectedSale.paymentType}</div>
                      </div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; border: 1px solid #1e3a8a;">
                        <thead>
                          <tr style="background: #1e3a8a; color: white;">
                            <th style="padding: 7px; text-align: center; width: 65px;">Cant.</th>
                            <th style="padding: 7px; text-align: left;">Producto / Insumo</th>
                            <th style="padding: 7px; text-align: right; width: 85px;">P.U</th>
                            <th style="padding: 7px; text-align: right; width: 95px;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${selectedSale.items.map((it, idx) => `
                            <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                              <td style="padding: 6px 7px; text-align: center;">${it.quantity} ${it.unit}</td>
                              <td style="padding: 6px 7px; font-weight: 600;">${it.productName}</td>
                              <td style="padding: 6px 7px; text-align: right;">$${it.unitPrice.toFixed(2)}</td>
                              <td style="padding: 6px 7px; text-align: right; font-weight: bold;">$${it.total.toFixed(2)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      <div style="text-align: right; font-size: 14px; font-weight: 900; color: #1e3a8a; margin-bottom: 20px;">
                        TOTAL: $${selectedSale.total.toFixed(2)} MXN
                      </div>
                      <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; text-align: center; font-size: 9px; color: #94a3b8;">
                        Documento emitido por MIAULOO ERP • San Juan del Río, Qro.
                      </div>
                    </div>
                  `, `Comprobante_${selectedSale.id}`);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Mandar a imprimir comprobante a impresora"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Comprobante
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDITAR VENTA */}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-600" />
                  Editar Registro de Venta
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {selectedSale.id} • {selectedSale.clientName}</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Estatus del Pedido / Venta *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Pedido Activo">Pedido Activo (En preparación)</option>
                  <option value="Entregado">Entregado (Concluido)</option>
                  <option value="Cotización">Cotización CRM</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Pago</label>
                  <select
                    value={editPaymentType}
                    onChange={(e) => setEditPaymentType(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Comprobante</label>
                  <select
                    value={editBillingType}
                    onChange={(e) => setEditBillingType(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Remisión">Remisión</option>
                    <option value="CFDI">CFDI Factura</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto Abonado / Pagado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmountPaid}
                  onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  placeholder="Detalles de la entrega, instrucciones..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
