import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, Plus, Search, Eye, Edit, Trash2, Printer, Download, Save, 
  X, CheckCircle, AlertTriangle, Phone, MapPin, Calendar, RefreshCw, 
  Check, Filter, FileText, Building, User as UserIcon
} from 'lucide-react';
import { MockDatabase } from '../data';
import { TransferSheet, TransferSheetItem, User } from '../types';
import { 
  exportToExcel, 
  exportToPDF, 
  exportTransferSheetToPDF, 
  printElement 
} from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { 
  fetchTransferSheetsFromSupabase, 
  saveTransferSheetToSupabase, 
  deleteTransferSheetInSupabase 
} from '../services/supabaseService';

const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

interface TransferSheetsManagerProps {
  currentUser: User;
  onRefreshParent?: () => void;
}

export function TransferSheetsManager({ currentUser, onRefreshParent }: TransferSheetsManagerProps) {
  // State
  const [sheets, setSheets] = useState<TransferSheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<TransferSheet | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSheet, setEditingSheet] = useState<TransferSheet | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSheet, setDeletingSheet] = useState<TransferSheet | null>(null);

  // Create Form State
  const [createFolio, setCreateFolio] = useState('');
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
  const [createExpeditedIn, setCreateExpeditedIn] = useState('San Juan del Rio, Qro.');
  const [createElaboratedBy, setCreateElaboratedBy] = useState('Areli Antonia Mireles Cruz');
  const [createClientName, setCreateClientName] = useState('');
  const [createDestination, setCreateDestination] = useState('SAN JUAN DEL RIO');
  const [createAddress, setCreateAddress] = useState('Sta. Cruz 71, La Loma');
  const [createCp, setCreateCp] = useState('76804');
  const [createColonia, setCreateColonia] = useState('La Loma');
  const [createFiscalRegimen, setCreateFiscalRegimen] = useState('601 - General de Ley Personas Morales');
  const [createPhone, setCreatePhone] = useState('(52) 427 116 9640');
  const [createClientNo, setCreateClientNo] = useState('CLI-0042');
  const [createRfc, setCreateRfc] = useState('BAMN8611098PA');
  const [createCurp, setCreateCurp] = useState('BAMN8611098HQT');
  const [createPaymentForm, setCreatePaymentForm] = useState('PPD - Pago en parcialidades o diferido');
  const [createOperator, setCreateOperator] = useState('Pedro (Chofer Logistics)');
  const [createPlateNo, setCreatePlateNo] = useState('UK-882-J');
  const [createNotes, setCreateNotes] = useState('NOTA: Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: "Recibí mi pedido completo", su nombre, firma y fecha.');
  const [createItems, setCreateItems] = useState<TransferSheetItem[]>([
    { quantity: 10, unit: 'LTS', description: '', unitPrice: 0, total: 0 }
  ]);

  // Load from local MockDatabase and synchronize with Supabase Cloud
  const loadData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    const local = MockDatabase.getTransferSheets();
    setSheets(local);

    try {
      setIsSyncing(true);
      const res = await fetchTransferSheetsFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const mergedMap = new Map<string, TransferSheet>();
        local.forEach(s => mergedMap.set(s.id, s));
        res.data.forEach(ts => mergedMap.set(ts.id, ts));
        const merged = Array.from(mergedMap.values()).sort((a, b) => 
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        );
        MockDatabase.saveTransferSheets(merged);
        setSheets(merged);
        setSyncStatus('Sincronizado con Supabase');
      }
    } catch (e: any) {
      console.warn('Error sincronizando hojas de traslado:', e);
    } finally {
      setIsSyncing(false);
      if (showLoadingSpinner) setIsLoading(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Filtered Sheets
  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        sheet.folio.toLowerCase().includes(term) ||
        sheet.clientName.toLowerCase().includes(term) ||
        sheet.destination.toLowerCase().includes(term) ||
        (sheet.operator && sheet.operator.toLowerCase().includes(term)) ||
        (sheet.plateNo && sheet.plateNo.toLowerCase().includes(term)) ||
        (sheet.rfc && sheet.rfc.toLowerCase().includes(term)) ||
        sheet.items.some(i => i.description.toLowerCase().includes(term));

      const matchStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? (sheet.active !== false) :
        (sheet.active === false);

      const matchDate = dateFilter ? sheet.date.startsWith(dateFilter) : true;

      return matchSearch && matchStatus && matchDate;
    });
  }, [sheets, searchTerm, statusFilter, dateFilter]);

  // Totals
  const totalAmountFiltered = useMemo(() => {
    return filteredSheets.reduce((acc, s) => acc + (s.total || 0), 0);
  }, [filteredSheets]);

  // Open Edit Modal
  const handleOpenEditModal = (sheet: TransferSheet) => {
    setEditingSheet(JSON.parse(JSON.stringify(sheet)));
    setShowEditModal(true);
  };

  // Update Field in Editing Sheet
  const handleUpdateEditingField = (field: keyof TransferSheet, value: any) => {
    if (!editingSheet) return;
    setEditingSheet({ ...editingSheet, [field]: value });
  };

  // Editing Items Handlers
  const handleAddEditingItem = () => {
    if (!editingSheet) return;
    setEditingSheet({
      ...editingSheet,
      items: [...editingSheet.items, { quantity: 1, unit: 'LTS', description: '', unitPrice: 0, total: 0 }]
    });
  };

  const handleUpdateEditingItem = (index: number, field: keyof TransferSheetItem, value: any) => {
    if (!editingSheet) return;
    const updatedItems = [...editingSheet.items];
    const current = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(field === 'quantity' ? value : current.quantity) || 0;
      const price = Number(field === 'unitPrice' ? value : current.unitPrice) || 0;
      current.total = qty * price;
    }
    
    updatedItems[index] = current;
    const subtotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const total = subtotal;

    setEditingSheet({
      ...editingSheet,
      items: updatedItems,
      subtotal,
      total
    });
  };

  const handleRemoveEditingItem = (index: number) => {
    if (!editingSheet || editingSheet.items.length <= 1) {
      alert('La hoja de traslado debe contener al menos un producto a trasladar.');
      return;
    }
    const updatedItems = editingSheet.items.filter((_, idx) => idx !== index);
    const subtotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    setEditingSheet({
      ...editingSheet,
      items: updatedItems,
      subtotal,
      total: subtotal
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSheet) return;

    if (!editingSheet.clientName.trim() || !editingSheet.folio.trim()) {
      alert('El cliente y el folio de traslado son obligatorios.');
      return;
    }

    if (editingSheet.items.some(i => !i.description.trim() || i.quantity <= 0)) {
      alert('Asegúrese de que todas las partidas tengan descripción y cantidad válida.');
      return;
    }

    const updated = sheets.map(s => s.id === editingSheet.id ? editingSheet : s);
    MockDatabase.saveTransferSheets(updated);
    setSheets(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Modificó Hoja de Traslado ${editingSheet.folio}`,
      'Traslado de Productos',
      `Folio: ${editingSheet.folio}, Cliente: ${editingSheet.clientName}, Destino: ${editingSheet.destination}, Total: $${editingSheet.total.toFixed(2)}`
    );

    // Sync to Supabase
    try {
      await saveTransferSheetToSupabase(editingSheet);
      recordSaveTelemetry({
        table: 'transfer_sheets',
        folio: editingSheet.folio,
        action: 'Hoja de Traslado Modificada',
        countBefore: sheets.length,
        countAfter: sheets.length,
        status: 'success',
        payloadSummary: `Cliente: ${editingSheet.clientName} • Chofer: ${editingSheet.operator} • Total: $${editingSheet.total.toFixed(2)}`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error guardando hoja de traslado en Supabase:', err);
    }

    setShowEditModal(false);
    setEditingSheet(null);
    if (onRefreshParent) onRefreshParent();
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (sheet: TransferSheet) => {
    setDeletingSheet(sheet);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingSheet) return;

    const remaining = sheets.filter(s => s.id !== deletingSheet.id);
    MockDatabase.saveTransferSheets(remaining);
    setSheets(remaining);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Eliminó Hoja de Traslado ${deletingSheet.folio}`,
      'Traslado de Productos',
      `Folio eliminado: ${deletingSheet.folio}. Cliente: ${deletingSheet.clientName}. Chofer: ${deletingSheet.operator}`
    );

    // Sync to Supabase
    try {
      await deleteTransferSheetInSupabase(deletingSheet.id);
      recordSaveTelemetry({
        table: 'transfer_sheets',
        folio: deletingSheet.folio,
        action: 'Hoja de Traslado Eliminada',
        countBefore: sheets.length,
        countAfter: remaining.length,
        status: 'success',
        payloadSummary: `Eliminó hoja ${deletingSheet.folio} (${deletingSheet.clientName})`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error borrando hoja de traslado en Supabase:', err);
    }

    setShowDeleteModal(false);
    setDeletingSheet(null);
    if (onRefreshParent) onRefreshParent();
  };

  // Toggle Active Status
  const handleToggleActiveStatus = async (sheet: TransferSheet) => {
    const newStatus = sheet.active === false ? true : false;
    const updated: TransferSheet = {
      ...sheet,
      active: newStatus
    };

    const updatedSheets = sheets.map(s => s.id === sheet.id ? updated : s);
    MockDatabase.saveTransferSheets(updatedSheets);
    setSheets(updatedSheets);

    MockDatabase.addAuditLog(
      currentUser.name,
      newStatus ? `Reactivó Hoja de Traslado ${sheet.folio}` : `Canceló Hoja de Traslado ${sheet.folio}`,
      'Traslado de Productos',
      `Estado cambiado a: ${newStatus ? 'Activa' : 'Cancelada'}`
    );

    await saveTransferSheetToSupabase(updated);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setCreateFolio(`SIM-${Math.floor(100000 + Math.random() * 900000)}`);
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateClientName('');
    setCreateDestination('SAN JUAN DEL RIO');
    setCreateAddress('Sta. Cruz 71, La Loma');
    setCreateCp('76804');
    setCreateColonia('La Loma');
    setCreateFiscalRegimen('601 - General de Ley Personas Morales');
    setCreatePhone('(52) 427 116 9640');
    setCreateClientNo('CLI-0042');
    setCreateRfc('BAMN8611098PA');
    setCreateCurp('BAMN8611098HQT');
    setCreatePaymentForm('PPD - Pago en parcialidades o diferido');
    setCreateOperator('Pedro (Chofer Logistics)');
    setCreatePlateNo('UK-882-J');
    setCreateNotes('NOTA: Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: "Recibí mi pedido completo", su nombre, firma y fecha.');
    setCreateItems([
      { quantity: 10, unit: 'LTS', description: '', unitPrice: 0, total: 0 }
    ]);
    setShowCreateModal(true);
  };

  // Create Items Handlers
  const handleAddCreateItem = () => {
    setCreateItems([...createItems, { quantity: 1, unit: 'LTS', description: '', unitPrice: 0, total: 0 }]);
  };

  const handleUpdateCreateItem = (index: number, field: keyof TransferSheetItem, value: any) => {
    const updated = [...createItems];
    const current = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(field === 'quantity' ? value : current.quantity) || 0;
      const price = Number(field === 'unitPrice' ? value : current.unitPrice) || 0;
      current.total = qty * price;
    }
    updated[index] = current;
    setCreateItems(updated);
  };

  const handleRemoveCreateItem = (index: number) => {
    if (createItems.length <= 1) return;
    setCreateItems(createItems.filter((_, idx) => idx !== index));
  };

  // Save Created Sheet
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createClientName.trim() || !createFolio.trim()) {
      alert('Por favor ingrese el cliente y folio.');
      return;
    }

    if (createItems.some(i => !i.description.trim() || i.quantity <= 0)) {
      alert('Asegúrese de ingresar descripción y cantidad para cada producto.');
      return;
    }

    const subtotal = createItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const newSheet: TransferSheet = {
      id: `ts-${Date.now()}`,
      folio: createFolio,
      date: createDate,
      expeditedIn: createExpeditedIn,
      elaboratedBy: createElaboratedBy,
      clientName: createClientName,
      destination: createDestination,
      address: createAddress,
      cp: createCp,
      colonia: createColonia,
      fiscalRegimen: createFiscalRegimen,
      phone: createPhone,
      clientNo: createClientNo,
      rfc: createRfc,
      curp: createCurp,
      paymentForm: createPaymentForm,
      operator: createOperator,
      plateNo: createPlateNo,
      items: createItems,
      subtotal,
      tax: 0,
      total: subtotal,
      notes: createNotes,
      createdAt: new Date().toISOString(),
      active: true
    };

    const updated = [newSheet, ...sheets];
    MockDatabase.saveTransferSheets(updated);
    setSheets(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Creó Hoja de Traslado ${createFolio}`,
      'Traslado de Productos',
      `Cliente: ${createClientName}, Destino: ${createDestination}, Total: $${subtotal.toFixed(2)}`
    );

    try {
      await saveTransferSheetToSupabase(newSheet);
      recordSaveTelemetry({
        table: 'transfer_sheets',
        folio: createFolio,
        action: 'Nueva Hoja de Traslado',
        countBefore: sheets.length,
        countAfter: updated.length,
        status: 'success',
        payloadSummary: `Cliente: ${createClientName} • Chofer: ${createOperator} • Total: $${subtotal.toFixed(2)}`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error guardando hoja de traslado en Supabase:', err);
    }

    setShowCreateModal(false);
    setSelectedSheet(newSheet);
    setShowViewModal(true);
    if (onRefreshParent) onRefreshParent();
  };

  // Export Table
  const handleExportExcel = () => {
    const dataToExport = filteredSheets.map(s => ({
      'Folio': s.folio,
      'Fecha': s.date,
      'Cliente': s.clientName,
      'Destino': s.destination,
      'Operador / Chofer': s.operator || '',
      'Placas': s.plateNo || '',
      'RFC': s.rfc || '',
      'Productos Trasladados': s.items.map(i => `${i.quantity} ${i.unit} ${i.description}`).join('; '),
      'Importe Total ($ MXN)': s.total,
      'Estatus': s.active !== false ? 'Activa' : 'Cancelada'
    }));
    exportToExcel(dataToExport, 'Hojas_de_Traslado_Miauloo');
  };

  const handleExportPDF = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Destino', 'Operador', 'Placas', 'Total ($ MXN)', 'Estatus'];
    const rows = filteredSheets.map(s => [
      s.folio,
      s.date,
      s.clientName,
      s.destination,
      s.operator || 'N/A',
      s.plateNo || 'N/A',
      `$${s.total.toFixed(2)}`,
      s.active !== false ? 'ACTIVA' : 'CANCELADA'
    ]);
    exportToPDF('Listado Oficial de Hojas de Traslado de Productos - Miauloo', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Control Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Control de Hojas de Traslado de Productos
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Logística y Distribución
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Emisión, visualización, modificación y control de hojas de traslado con asignación de chofer y placas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {syncStatus && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> {syncStatus}
            </span>
          )}

          <button
            onClick={() => loadData(true)}
            disabled={isSyncing}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center transition-all cursor-pointer"
            title="Sincronizar con Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Recargar'}
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="bg-[#0B2545] hover:bg-[#133966] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center transition-all shadow-sm cursor-pointer ml-auto lg:ml-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Hoja de Traslado
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hojas de Traslado Totales</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{sheets.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Expedidas en sistema</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hojas Activas / En Ruta</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {sheets.filter(s => s.active !== false).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Vigentes con operadores</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hojas Canceladas / Bajas</p>
          <p className="text-2xl font-black text-slate-400 mt-1">
            {sheets.filter(s => s.active === false).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Archivadas o anuladas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Valor Trasladado Filtrado</p>
          <p className="text-2xl font-black text-[#0B2545] mt-1">
            ${totalAmountFiltered.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total mercancía en hojas visibles</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, destino, chofer, placas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Estatus:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Canceladas</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Fecha:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
                title="Limpiar fecha"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="p-3.5 w-28">Folio</th>
                <th className="p-3.5 w-28">Fecha</th>
                <th className="p-3.5">Cliente y Destino</th>
                <th className="p-3.5">Operador / Placas</th>
                <th className="p-3.5">Productos / Mercancía</th>
                <th className="p-3.5 text-right w-28">Total ($ MXN)</th>
                <th className="p-3.5 text-center w-24">Estatus</th>
                <th className="p-3.5 text-right w-44">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSheets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    No se encontraron hojas de traslado con los filtros indicados.
                  </td>
                </tr>
              ) : (
                filteredSheets.map(sheet => {
                  const isActive = sheet.active !== false;
                  return (
                    <tr 
                      key={sheet.id} 
                      className={`hover:bg-blue-50/40 transition-colors ${!isActive ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      <td className="p-3.5 font-bold font-mono text-[#0B2545]">
                        <span className="bg-blue-50 text-[#0B2545] px-2 py-0.5 rounded border border-blue-200">
                          {sheet.folio}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {sheet.date}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 uppercase">{sheet.clientName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Destino: {sheet.destination}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="font-medium text-slate-800">{sheet.operator || 'Sin chofer'}</div>
                        {sheet.plateNo && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Placas: {sheet.plateNo}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <span className="font-semibold text-slate-800">
                          {sheet.items.length} {sheet.items.length === 1 ? 'partida' : 'partidas'}
                        </span>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {sheet.items.map(it => `${it.quantity} ${it.unit} ${it.description}`).join(', ')}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-950 text-sm">
                        ${sheet.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleActiveStatus(sheet)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase cursor-pointer transition-all ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                          title="Clic para cambiar estatus activo/cancelado"
                        >
                          {isActive ? 'Activa' : 'Cancelada'}
                        </button>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* IMPRIMIR DIRECTO */}
                          <button
                            onClick={() => printElement('printable-transfer-sheet', `Hoja_Traslado_${sheet.folio}`)}
                            className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Imprimir Hoja de Traslado Directo"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* DESCARGAR PDF */}
                          <button
                            onClick={() => exportTransferSheetToPDF(sheet)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Descargar Hoja de Traslado en PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* VER / IMPRIMIR OFICIAL */}
                          <button
                            onClick={() => {
                              setSelectedSheet(sheet);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver e Imprimir Formato Oficial Miauloo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* EDITAR / MODIFICAR */}
                          <button
                            onClick={() => handleOpenEditModal(sheet)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar y Modificar Hoja de Traslado"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* BORRAR */}
                          <button
                            onClick={() => handleOpenDeleteModal(sheet)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Borrar Hoja de Traslado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: VER / IMPRIMIR HOJA DE TRASLADO OFICIAL (PLANTILLA MIAULOO) */}
      {/* ========================================================================= */}
      {showViewModal && selectedSheet && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden shrink-0">
              <span className="font-bold text-sm flex items-center">
                <Truck className="w-4 h-4 mr-2 text-blue-400" />
                Vista Previa Oficial: Hoja de Traslado {selectedSheet.folio}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEditModal(selectedSheet)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                </button>
                <button
                  onClick={() => exportTransferSheetToPDF(selectedSheet)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                  title="Descargar Hoja de Traslado en PDF Oficial"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Descargar PDF
                </button>
                <button
                  onClick={() => printElement('printable-transfer-sheet', `Hoja_Traslado_${selectedSheet.folio}`)}
                  className="bg-[#0B2545] hover:bg-[#133966] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                  title="Mandar a imprimir directamente a la impresora"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Transfer Sheet Layout */}
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
                    <span className="font-bold">RFC:</span> {selectedSheet.rfc || 'BAMN8611098PA'}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">E-MAIL:</span> miauloosolucionesintegrales@gmail.com
                  </div>
                  <div className="p-1.5 col-span-2">
                    <span className="font-bold">MOVIL:</span> {selectedSheet.phone || '(52) 427 116 9640'}
                  </div>
                  <div className="p-1.5 col-span-2">
                    <span className="font-bold">Expedido en:</span> Sta. Cruz 71, La Loma, 76804 San Juan del Río, Qro.
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Fecha:</span> {selectedSheet.date}
                  </div>
                  <div className="p-1.5 font-bold text-blue-900 bg-blue-50/50">
                    Folio: {selectedSheet.folio}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Lugar de expedición:</span> {selectedSheet.expeditedIn || 'San Juan del Rio, Qro.'}
                  </div>
                  <div className="p-1.5">
                    <span className="font-bold">Elaborado por:</span> {selectedSheet.elaboratedBy || 'Areli Antonia Mireles Cruz'}
                  </div>
                </div>
              </div>

              <div className="border border-[#0B2545] p-2 text-[10px] space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-bold">Cliente:</span> <span className="uppercase font-semibold">{selectedSheet.clientName}</span></div>
                  <div><span className="font-bold">Destino:</span> <span className="uppercase">{selectedSheet.destination}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">Dirección:</span> {selectedSheet.address}</div>
                  <div><span className="font-bold">C.P.:</span> {selectedSheet.cp}</div>
                  <div><span className="font-bold">Colonia:</span> {selectedSheet.colonia}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">Regimen fiscal:</span> {selectedSheet.fiscalRegimen}</div>
                  <div><span className="font-bold">Tel:</span> {selectedSheet.phone}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-1">
                  <div><span className="font-bold">No. De Cliente:</span> {selectedSheet.clientNo}</div>
                  <div><span className="font-bold">R.F.C.:</span> {selectedSheet.rfc}</div>
                  <div><span className="font-bold">CURP:</span> {selectedSheet.curp}</div>
                </div>
                <div className="border-t border-slate-200 pt-1">
                  <span className="font-bold">FORMA DE PAGO:</span> {selectedSheet.paymentForm}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1 bg-slate-50 p-1">
                  <div><span className="font-bold">Operador:</span> {selectedSheet.operator}</div>
                  <div><span className="font-bold">No. De Placas:</span> {selectedSheet.plateNo}</div>
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
                    {selectedSheet.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center border-r font-medium">{it.quantity}</td>
                        <td className="p-2 text-center border-r font-medium uppercase">{it.unit}</td>
                        <td className="p-2 border-r font-semibold uppercase">{it.description}</td>
                        <td className="p-2 text-right border-r">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">${it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - selectedSheet.items.length) }).map((_, i) => (
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
                    <span>${selectedSheet.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between">
                    <span>I.V.A:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-slate-100 text-[#0B2545]">
                    <span>TOTAL:</span>
                    <span>${selectedSheet.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-[#0B2545] p-3 space-y-3 bg-slate-50/50">
                <p className="text-[9px] text-justify leading-tight font-medium text-slate-800">
                  <span className="font-bold text-red-700">NOTA:</span> Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: <span className="font-bold">“Recibí mi pedido completo”</span>, su nombre, firma y fecha.
                </p>
                {selectedSheet.notes && (
                  <div className="text-[9px] border-t pt-1">
                    <span className="font-bold">Observaciones:</span> {selectedSheet.notes}
                  </div>
                )}
                
                <div className="pt-8 flex justify-center">
                  <div className="w-64 border-t-2 border-slate-900 text-center text-[10px] pt-1">
                    <p className="font-bold uppercase">{selectedSheet.clientName}</p>
                    <p className="text-[9px] text-slate-500">Acepto de Conformidad (Firma)</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR / MODIFICAR HOJA DE TRASLADO */}
      {/* ========================================================================= */}
      {showEditModal && editingSheet && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            <div className="bg-[#0B2545] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">
                  Modificar Hoja de Traslado {editingSheet.folio}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* Section 1: Generales */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    1. Datos de Expedición y Control
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Folio *</label>
                      <input
                        type="text"
                        value={editingSheet.folio}
                        onChange={(e) => handleUpdateEditingField('folio', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Fecha *</label>
                      <input
                        type="date"
                        value={editingSheet.date}
                        onChange={(e) => handleUpdateEditingField('date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Lugar de Expedición</label>
                      <input
                        type="text"
                        value={editingSheet.expeditedIn || ''}
                        onChange={(e) => handleUpdateEditingField('expeditedIn', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Estatus</label>
                      <select
                        value={editingSheet.active !== false ? 'active' : 'inactive'}
                        onChange={(e) => handleUpdateEditingField('active', e.target.value === 'active')}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Activa (Vigente)</option>
                        <option value="inactive">Cancelada / Inactiva</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Elaborado por</label>
                      <input
                        type="text"
                        value={editingSheet.elaboratedBy || ''}
                        onChange={(e) => handleUpdateEditingField('elaboratedBy', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Forma de Pago</label>
                      <input
                        type="text"
                        value={editingSheet.paymentForm || ''}
                        onChange={(e) => handleUpdateEditingField('paymentForm', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Cliente y Destino */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    2. Datos del Cliente y Destino
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cliente / Destinatario *</label>
                      <input
                        type="text"
                        value={editingSheet.clientName}
                        onChange={(e) => handleUpdateEditingField('clientName', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Destino *</label>
                      <input
                        type="text"
                        value={editingSheet.destination}
                        onChange={(e) => handleUpdateEditingField('destination', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega</label>
                      <input
                        type="text"
                        value={editingSheet.address || ''}
                        onChange={(e) => handleUpdateEditingField('address', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Colonia</label>
                      <input
                        type="text"
                        value={editingSheet.colonia || ''}
                        onChange={(e) => handleUpdateEditingField('colonia', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">C.P.</label>
                      <input
                        type="text"
                        value={editingSheet.cp || ''}
                        onChange={(e) => handleUpdateEditingField('cp', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">RFC</label>
                      <input
                        type="text"
                        value={editingSheet.rfc || ''}
                        onChange={(e) => handleUpdateEditingField('rfc', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={editingSheet.phone || ''}
                        onChange={(e) => handleUpdateEditingField('phone', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. de Cliente</label>
                      <input
                        type="text"
                        value={editingSheet.clientNo || ''}
                        onChange={(e) => handleUpdateEditingField('clientNo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Chofer y Placas */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    3. Asignación Logística (Chofer y Unidad)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Operador / Chofer Asignado</label>
                      <input
                        type="text"
                        placeholder="Ej. Pedro (Chofer Logistics)"
                        value={editingSheet.operator || ''}
                        onChange={(e) => handleUpdateEditingField('operator', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. de Placas del Vehículo</label>
                      <input
                        type="text"
                        placeholder="Ej. UK-882-J"
                        value={editingSheet.plateNo || ''}
                        onChange={(e) => handleUpdateEditingField('plateNo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instrucciones u Observaciones</label>
                    <textarea
                      rows={2}
                      value={editingSheet.notes || ''}
                      onChange={(e) => handleUpdateEditingField('notes', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Section 4: Partidas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                      4. Productos y Mercancía a Trasladar
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEditingItem}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Producto
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-center w-24">Cantidad</th>
                          <th className="p-2.5 text-center w-24">Unidad</th>
                          <th className="p-2.5">Descripción de Producto</th>
                          <th className="p-2.5 text-right w-28">P.U ($ MXN)</th>
                          <th className="p-2.5 text-right w-28">Importe</th>
                          <th className="p-2.5 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {editingSheet.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleUpdateEditingItem(idx, 'quantity', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center font-bold"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={item.unit}
                                onChange={(e) => handleUpdateEditingItem(idx, 'unit', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center uppercase font-bold"
                              >
                                <option value="LTS">LTS</option>
                                <option value="KG">KG</option>
                                <option value="PZS">PZS</option>
                                <option value="PORRON">PORRON</option>
                                <option value="CUB">CUB</option>
                                <option value="TAMBOR">TAMBOR</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateEditingItem(idx, 'description', e.target.value)}
                                placeholder="Ej. SOSA CAUSTICA"
                                className="w-full border border-slate-300 rounded p-1.5 uppercase font-medium"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateEditingItem(idx, 'unitPrice', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-right font-medium"
                                required
                              />
                            </td>
                            <td className="p-2 text-right font-black text-slate-900">
                              ${item.total.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditingItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                title="Eliminar renglón"
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
                    <div className="w-64 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between font-medium text-slate-600">
                        <span>Subtotal:</span>
                        <span>${editingSheet.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 text-sm border-t border-slate-200 pt-1.5">
                        <span>TOTAL TRASLADO:</span>
                        <span className="text-[#0B2545]">${editingSheet.total.toFixed(2)} MXN</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0B2545] hover:bg-[#133966] text-white rounded-xl font-bold shadow-sm flex items-center cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVA HOJA DE TRASLADO */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            <div className="bg-[#0B2545] text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">
                  Registrar Nueva Hoja de Traslado de Productos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-300 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Folio *</label>
                      <input
                        type="text"
                        value={createFolio}
                        onChange={(e) => setCreateFolio(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Fecha *</label>
                      <input
                        type="date"
                        value={createDate}
                        onChange={(e) => setCreateDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Lugar de Expedición</label>
                      <input
                        type="text"
                        value={createExpeditedIn}
                        onChange={(e) => setCreateExpeditedIn(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Elaborado por</label>
                      <input
                        type="text"
                        value={createElaboratedBy}
                        onChange={(e) => setCreateElaboratedBy(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cliente / Destinatario *</label>
                      <input
                        type="text"
                        placeholder="Ej. JORGE LUIS"
                        value={createClientName}
                        onChange={(e) => setCreateClientName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Destino *</label>
                      <input
                        type="text"
                        placeholder="Ej. SAN JUAN DEL RIO"
                        value={createDestination}
                        onChange={(e) => setCreateDestination(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={createAddress}
                        onChange={(e) => setCreateAddress(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Colonia</label>
                      <input
                        type="text"
                        value={createColonia}
                        onChange={(e) => setCreateColonia(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">C.P.</label>
                      <input
                        type="text"
                        value={createCp}
                        onChange={(e) => setCreateCp(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Operador / Chofer</label>
                      <input
                        type="text"
                        value={createOperator}
                        onChange={(e) => setCreateOperator(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">No. de Placas</label>
                      <input
                        type="text"
                        value={createPlateNo}
                        onChange={(e) => setCreatePlateNo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                      Partidas / Mercancía
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddCreateItem}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Producto
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-center w-24">Cantidad</th>
                          <th className="p-2.5 text-center w-24">Unidad</th>
                          <th className="p-2.5">Descripción</th>
                          <th className="p-2.5 text-right w-28">P.U ($ MXN)</th>
                          <th className="p-2.5 text-right w-28">Importe</th>
                          <th className="p-2.5 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {createItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleUpdateCreateItem(idx, 'quantity', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center font-bold"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={item.unit}
                                onChange={(e) => handleUpdateCreateItem(idx, 'unit', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center uppercase font-bold"
                              >
                                <option value="LTS">LTS</option>
                                <option value="KG">KG</option>
                                <option value="PZS">PZS</option>
                                <option value="PORRON">PORRON</option>
                                <option value="CUB">CUB</option>
                                <option value="TAMBOR">TAMBOR</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateCreateItem(idx, 'description', e.target.value)}
                                placeholder="Ej. SOSA CAUSTICA"
                                className="w-full border border-slate-300 rounded p-1.5 uppercase font-medium"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateCreateItem(idx, 'unitPrice', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-right font-medium"
                                required
                              />
                            </td>
                            <td className="p-2 text-right font-black text-slate-900">
                              ${item.total.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              {createItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCreateItem(idx)}
                                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between font-black text-slate-950 text-sm">
                        <span>TOTAL TRASLADO:</span>
                        <span className="text-[#0B2545]">
                          ${createItems.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2)} MXN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end space-x-3 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0B2545] hover:bg-[#133966] text-white rounded-xl font-bold shadow-sm flex items-center cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Hoja de Traslado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE BORRADO SEGURO */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingSheet && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-slate-900">
                ¿Eliminar Hoja de Traslado?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Está a punto de eliminar permanentemente la hoja de traslado <span className="font-bold text-slate-800">{deletingSheet.folio}</span> asignada a <span className="font-bold text-slate-800">{deletingSheet.clientName}</span> (Chofer: {deletingSheet.operator || 'N/A'}).
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              <span className="font-bold">Advertencia:</span> Esta acción se registrará en la bitácora de auditoría del sistema y sincronizará la eliminación en Supabase Cloud.
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
