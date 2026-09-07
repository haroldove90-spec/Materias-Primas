import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Eye, Edit, Trash2, Printer, Download, Save, 
  X, CheckCircle, AlertTriangle, Phone, MapPin, Calendar, User as UserIcon,
  RefreshCw, Check, Clock, AlertCircle, FileText, Filter
} from 'lucide-react';
import { MockDatabase } from '../data';
import { SaleNote, SaleNoteItem, User } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { 
  fetchSaleNotesFromSupabase, 
  saveSaleNoteToSupabase, 
  deleteSaleNoteInSupabase 
} from '../services/supabaseService';

const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

interface SaleNotesManagerProps {
  currentUser: User;
  onRefreshParent?: () => void;
}

export function SaleNotesManager({ currentUser, onRefreshParent }: SaleNotesManagerProps) {
  // Database States
  const [notes, setNotes] = useState<SaleNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SaleNote | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState<SaleNote | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingNote, setDeletingNote] = useState<SaleNote | null>(null);

  // Create Form State
  const [createNoteNo, setCreateNoteNo] = useState('');
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
  const [createClientName, setCreateClientName] = useState('');
  const [createPhone, setCreatePhone] = useState('4271169640');
  const [createCity, setCreateCity] = useState('San Juan del Río, Qro.');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<SaleNoteItem[]>([
    { pieces: 1, product: '', unitPrice: 0, total: 0 }
  ]);

  // Load from local MockDatabase and synchronize with Supabase Cloud
  const loadData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setIsLoading(true);
    const local = MockDatabase.getSaleNotes();
    setNotes(local);

    try {
      setIsSyncing(true);
      const res = await fetchSaleNotesFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        // Merge Supabase notes with local
        const mergedMap = new Map<string, SaleNote>();
        local.forEach(n => mergedMap.set(n.id, n));
        res.data.forEach(sn => mergedMap.set(sn.id, sn));
        const merged = Array.from(mergedMap.values()).sort((a, b) => 
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        );
        MockDatabase.saveSaleNotes(merged);
        setNotes(merged);
        setSyncStatus('Sincronizado con Supabase');
      }
    } catch (e: any) {
      console.warn('Error sincronizando notas de venta:', e);
    } finally {
      setIsSyncing(false);
      if (showLoadingSpinner) setIsLoading(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        note.noteNo.toLowerCase().includes(term) ||
        note.clientName.toLowerCase().includes(term) ||
        (note.city && note.city.toLowerCase().includes(term)) ||
        (note.phone && note.phone.toLowerCase().includes(term)) ||
        note.items.some(i => i.product.toLowerCase().includes(term));

      const matchStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? (note.active !== false) :
        (note.active === false);

      const matchDate = dateFilter ? note.date.startsWith(dateFilter) : true;

      return matchSearch && matchStatus && matchDate;
    });
  }, [notes, searchTerm, statusFilter, dateFilter]);

  // Totals of filtered
  const totalAmountFiltered = useMemo(() => {
    return filteredNotes.reduce((acc, n) => acc + (n.total || 0), 0);
  }, [filteredNotes]);

  // Open Edit Modal
  const handleOpenEditModal = (note: SaleNote) => {
    setEditingNote(JSON.parse(JSON.stringify(note)));
    setShowEditModal(true);
  };

  // Update Editing Note Field
  const handleUpdateEditingField = (field: keyof SaleNote, value: any) => {
    if (!editingNote) return;
    setEditingNote({ ...editingNote, [field]: value });
  };

  // Editing Items Handlers
  const handleAddEditingItem = () => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      items: [...editingNote.items, { pieces: 1, product: '', unitPrice: 0, total: 0 }]
    });
  };

  const handleUpdateEditingItem = (index: number, field: keyof SaleNoteItem, value: any) => {
    if (!editingNote) return;
    const updatedItems = [...editingNote.items];
    const current = { ...updatedItems[index], [field]: value };
    
    if (field === 'pieces' || field === 'unitPrice') {
      const pzs = Number(field === 'pieces' ? value : current.pieces) || 0;
      const price = Number(field === 'unitPrice' ? value : current.unitPrice) || 0;
      current.total = pzs * price;
    }
    
    updatedItems[index] = current;
    const subtotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const total = subtotal; // IVA = 0 en notas estándar

    setEditingNote({
      ...editingNote,
      items: updatedItems,
      subtotal,
      total
    });
  };

  const handleRemoveEditingItem = (index: number) => {
    if (!editingNote || editingNote.items.length <= 1) {
      alert('La nota de venta debe tener al menos una partida de producto.');
      return;
    }
    const updatedItems = editingNote.items.filter((_, idx) => idx !== index);
    const subtotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    setEditingNote({
      ...editingNote,
      items: updatedItems,
      subtotal,
      total: subtotal
    });
  };

  // Save Edited Note
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    if (!editingNote.clientName.trim() || !editingNote.noteNo.trim()) {
      alert('El cliente y el número de nota son obligatorios.');
      return;
    }

    if (editingNote.items.some(i => !i.product.trim() || i.pieces <= 0)) {
      alert('Por favor verifique que todas las partidas tengan descripción y cantidad válida.');
      return;
    }

    const updatedNotes = notes.map(n => n.id === editingNote.id ? editingNote : n);
    MockDatabase.saveSaleNotes(updatedNotes);
    setNotes(updatedNotes);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Modificó Nota de Venta No. ${editingNote.noteNo}`,
      'Notas de Venta',
      `Folio: ${editingNote.noteNo}, Cliente: ${editingNote.clientName}, Total: $${editingNote.total.toFixed(2)}`
    );

    // Sync to Supabase
    try {
      await saveSaleNoteToSupabase(editingNote);
      recordSaveTelemetry({
        table: 'sale_notes',
        folio: `NOTA-${editingNote.noteNo}`,
        action: 'Nota de Venta Modificada',
        countBefore: notes.length,
        countAfter: notes.length,
        status: 'success',
        payloadSummary: `Cliente: ${editingNote.clientName} • Total: $${editingNote.total.toFixed(2)} (Actualizada)`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
    }

    setShowEditModal(false);
    setEditingNote(null);
    if (onRefreshParent) onRefreshParent();
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (note: SaleNote) => {
    setDeletingNote(note);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingNote) return;

    const remaining = notes.filter(n => n.id !== deletingNote.id);
    MockDatabase.saveSaleNotes(remaining);
    setNotes(remaining);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Eliminó Nota de Venta No. ${deletingNote.noteNo}`,
      'Notas de Venta',
      `Folio eliminado: ${deletingNote.noteNo}. Cliente: ${deletingNote.clientName}. Importe: $${deletingNote.total.toFixed(2)}`
    );

    // Delete in Supabase
    try {
      await deleteSaleNoteInSupabase(deletingNote.id);
      recordSaveTelemetry({
        table: 'sale_notes',
        folio: `NOTA-${deletingNote.noteNo}`,
        action: 'Nota de Venta Eliminada',
        countBefore: notes.length,
        countAfter: remaining.length,
        status: 'success',
        payloadSummary: `Eliminó nota ${deletingNote.noteNo} de ${deletingNote.clientName}`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error borrando en Supabase:', err);
    }

    setShowDeleteModal(false);
    setDeletingNote(null);
    if (onRefreshParent) onRefreshParent();
  };

  // Toggle Active / Cancel Status
  const handleToggleActiveStatus = async (note: SaleNote) => {
    const newStatus = note.active === false ? true : false;
    const updated: SaleNote = {
      ...note,
      active: newStatus
    };

    const updatedNotes = notes.map(n => n.id === note.id ? updated : n);
    MockDatabase.saveSaleNotes(updatedNotes);
    setNotes(updatedNotes);

    MockDatabase.addAuditLog(
      currentUser.name,
      newStatus ? `Reactivó Nota No. ${note.noteNo}` : `Canceló/Archivó Nota No. ${note.noteNo}`,
      'Notas de Venta',
      `Estado cambiado a: ${newStatus ? 'Activa' : 'Cancelada'}`
    );

    await saveSaleNoteToSupabase(updated);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    // Generate next suggested note number
    const maxNumber = notes.reduce((max, n) => {
      const num = parseInt(n.noteNo.replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 5075);

    setCreateNoteNo(String(maxNumber + 1));
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateClientName('');
    setCreatePhone('4271169640');
    setCreateCity('San Juan del Río, Qro.');
    setCreateNotes('');
    setCreateItems([
      { pieces: 1, product: '', unitPrice: 0, total: 0 }
    ]);
    setShowCreateModal(true);
  };

  // Create Items Handlers
  const handleAddCreateItem = () => {
    setCreateItems([...createItems, { pieces: 1, product: '', unitPrice: 0, total: 0 }]);
  };

  const handleUpdateCreateItem = (index: number, field: keyof SaleNoteItem, value: any) => {
    const updated = [...createItems];
    const current = { ...updated[index], [field]: value };
    if (field === 'pieces' || field === 'unitPrice') {
      const pzs = Number(field === 'pieces' ? value : current.pieces) || 0;
      const price = Number(field === 'unitPrice' ? value : current.unitPrice) || 0;
      current.total = pzs * price;
    }
    updated[index] = current;
    setCreateItems(updated);
  };

  const handleRemoveCreateItem = (index: number) => {
    if (createItems.length <= 1) return;
    setCreateItems(createItems.filter((_, idx) => idx !== index));
  };

  // Save Created Note
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createClientName.trim() || !createNoteNo.trim()) {
      alert('Por favor ingrese el nombre del cliente y el número de nota.');
      return;
    }

    if (createItems.some(i => !i.product.trim() || i.pieces <= 0)) {
      alert('Asegúrese de ingresar una descripción y cantidad para cada producto.');
      return;
    }

    const subtotal = createItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const newNote: SaleNote = {
      id: `sn-${Date.now()}`,
      noteNo: createNoteNo,
      date: createDate,
      clientName: createClientName,
      phone: createPhone,
      city: createCity,
      items: createItems,
      subtotal,
      tax: 0,
      total: subtotal,
      createdAt: new Date().toISOString(),
      active: true,
      notes: createNotes || undefined
    };

    const updated = [newNote, ...notes];
    MockDatabase.saveSaleNotes(updated);
    setNotes(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Creó Nota de Venta No. ${createNoteNo}`,
      'Notas de Venta',
      `Cliente: ${createClientName}, Total: $${subtotal.toFixed(2)}`
    );

    try {
      await saveSaleNoteToSupabase(newNote);
      recordSaveTelemetry({
        table: 'sale_notes',
        folio: `NOTA-${createNoteNo}`,
        action: 'Nueva Nota de Venta',
        countBefore: notes.length,
        countAfter: updated.length,
        status: 'success',
        payloadSummary: `Cliente: ${createClientName} • Total: $${subtotal.toFixed(2)}`,
        source: 'cloud_sync'
      });
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
    }

    setShowCreateModal(false);
    setSelectedNote(newNote);
    setShowViewModal(true);
    if (onRefreshParent) onRefreshParent();
  };

  // Export Table
  const handleExportExcel = () => {
    const dataToExport = filteredNotes.map(n => ({
      'No. Nota': n.noteNo,
      'Fecha': n.date,
      'Cliente': n.clientName,
      'Teléfono': n.phone || '',
      'Ciudad': n.city || '',
      'Partidas': n.items.map(i => `${i.pieces} pzs ${i.product}`).join('; '),
      'Total ($ MXN)': n.total,
      'Estatus': n.active !== false ? 'Activa' : 'Cancelada'
    }));
    exportToExcel(dataToExport, 'Notas_de_Venta_Miauloo');
  };

  const handleExportPDF = () => {
    const headers = ['No. Nota', 'Fecha', 'Cliente', 'Ciudad', 'Partidas', 'Total ($ MXN)', 'Estatus'];
    const rows = filteredNotes.map(n => [
      `No. ${n.noteNo}`,
      n.date,
      n.clientName,
      n.city || 'S/D',
      `${n.items.length} prod. (${n.items.reduce((s, i) => s + i.pieces, 0)} pzs)`,
      `$${n.total.toFixed(2)}`,
      n.active !== false ? 'ACTIVA' : 'CANCELADA'
    ]);
    exportToPDF('Listado Oficial de Notas de Venta - Miauloo', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header and Control Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Control de Notas de Venta
                </h2>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Oficial Miauloo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Edición, consulta, modificación y cancelación de notas de venta comerciales.
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
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin text-purple-600' : ''}`} />
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
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center transition-all shadow-sm cursor-pointer ml-auto lg:ml-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Nota
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Notas Registradas</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{notes.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">En base de datos local y cloud</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notas Activas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {notes.filter(n => n.active !== false).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Vigentes para cobro y entrega</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notas Canceladas / Bajas</p>
          <p className="text-2xl font-black text-slate-400 mt-1">
            {notes.filter(n => n.active === false).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Archivadas o anuladas</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Importe Total Filtrado</p>
          <p className="text-2xl font-black text-purple-700 mt-1">
            ${totalAmountFiltered.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Suma de notas visibles</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por no. nota, cliente, producto, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Estatus:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <th className="p-3.5 w-24">No. Nota</th>
                <th className="p-3.5 w-28">Fecha</th>
                <th className="p-3.5">Cliente</th>
                <th className="p-3.5">Ciudad / Teléfono</th>
                <th className="p-3.5">Partidas / Productos</th>
                <th className="p-3.5 text-right w-28">Total ($ MXN)</th>
                <th className="p-3.5 text-center w-24">Estatus</th>
                <th className="p-3.5 text-right w-44">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    No se encontraron notas de venta con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredNotes.map(note => {
                  const isActive = note.active !== false;
                  return (
                    <tr 
                      key={note.id} 
                      className={`hover:bg-purple-50/40 transition-colors ${!isActive ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      <td className="p-3.5 font-bold font-mono text-purple-950">
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                          #{note.noteNo}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {note.date}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {note.clientName}
                        {note.notes && (
                          <span className="block text-[10px] text-slate-400 font-normal italic truncate max-w-xs">
                            {note.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div>{note.city || 'San Juan del Río, Qro.'}</div>
                        {note.phone && <div className="text-[10px] text-slate-400">{note.phone}</div>}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <span className="font-semibold text-slate-800">
                          {note.items.length} {note.items.length === 1 ? 'partida' : 'partidas'}
                        </span>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {note.items.map(it => `${it.pieces} ${it.product}`).join(', ')}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-950 text-sm">
                        ${note.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleActiveStatus(note)}
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
                          {/* VER / IMPRIMIR */}
                          <button
                            onClick={() => {
                              setSelectedNote(note);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver e Imprimir Formato Oficial Miauloo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* EDITAR / MODIFICAR */}
                          <button
                            onClick={() => handleOpenEditModal(note)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar y Modificar Nota de Venta"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* BORRAR */}
                          <button
                            onClick={() => handleOpenDeleteModal(note)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Borrar Nota de Venta"
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
      {/* MODAL: VER / IMPRIMIR NOTA DE VENTA OFICIAL (MIAULOO CORPORATIVO) */}
      {/* ========================================================================= */}
      {showViewModal && selectedNote && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden shrink-0">
              <span className="font-bold text-sm flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-purple-400" />
                Vista Previa Oficial: Nota de Venta No. {selectedNote.noteNo}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEditModal(selectedNote)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Official Template */}
            <div id="printable-sale-note" className="p-6 sm:p-8 text-slate-900 bg-[#FFFDF9] font-sans text-xs space-y-4 relative overflow-y-auto flex-1">
              
              {/* Top Banner */}
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
                    No. {selectedNote.noteNo}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                    FECHA: <span className="underline">{selectedNote.date}</span>
                  </div>
                </div>
              </div>

              {/* Client Info Block */}
              <div className="bg-amber-50/50 p-3 rounded border border-amber-200/60 text-[11px] space-y-1">
                <div>
                  <span className="font-bold text-[#1E3A8A]">NOMBRE:</span>{' '}
                  <span className="uppercase font-semibold">{selectedNote.clientName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-[#1E3A8A]">TELÉFONO:</span>{' '}
                    {selectedNote.phone || '4271169640'}
                  </div>
                  <div>
                    <span className="font-bold text-[#1E3A8A]">CIUDAD:</span>{' '}
                    {selectedNote.city || 'San Juan del Río, Qro.'}
                  </div>
                </div>
              </div>

              {/* Products Table */}
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
                    {selectedNote.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center border-r font-semibold">{it.pieces}</td>
                        <td className="p-2 border-r font-bold uppercase text-slate-800">{it.product}</td>
                        <td className="p-2 text-right border-r">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-black text-slate-900">${it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - selectedNote.items.length) }).map((_, i) => (
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

              {/* Summary Totals */}
              <div className="flex justify-end">
                <div className="w-56 border border-[#1E3A8A] rounded divide-y divide-slate-200 text-xs">
                  <div className="p-1.5 flex justify-between font-semibold">
                    <span>SUBTOTAL:</span>
                    <span>${selectedNote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="p-1.5 flex justify-between text-slate-500">
                    <span>IVA:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="p-1.5 flex justify-between font-black text-sm bg-[#1E3A8A] text-white">
                    <span>TOTAL:</span>
                    <span>${selectedNote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedNote.notes && (
                <div className="bg-slate-50 p-2 rounded text-[10px] text-slate-600 border border-slate-200">
                  <span className="font-bold">Observaciones:</span> {selectedNote.notes}
                </div>
              )}

              {/* Footer Address and Phone */}
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

      {/* ========================================================================= */}
      {/* MODAL: EDITAR / MODIFICAR NOTA DE VENTA */}
      {/* ========================================================================= */}
      {showEditModal && editingNote && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            <div className="bg-blue-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">
                  Modificar Nota de Venta No. {editingNote.noteNo}
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
                
                {/* General Data */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                    1. Datos de la Nota de Venta
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Número de Nota (Folio) *
                      </label>
                      <input
                        type="text"
                        value={editingNote.noteNo}
                        onChange={(e) => handleUpdateEditingField('noteNo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fecha de Emisión *
                      </label>
                      <input
                        type="date"
                        value={editingNote.date}
                        onChange={(e) => handleUpdateEditingField('date', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Estatus de la Nota
                      </label>
                      <select
                        value={editingNote.active !== false ? 'active' : 'inactive'}
                        onChange={(e) => handleUpdateEditingField('active', e.target.value === 'active')}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Activa (Vigente)</option>
                        <option value="inactive">Cancelada / Inactiva</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nombre del Cliente / Empresa *
                      </label>
                      <input
                        type="text"
                        value={editingNote.clientName}
                        onChange={(e) => handleUpdateEditingField('clientName', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="text"
                        value={editingNote.phone || ''}
                        onChange={(e) => handleUpdateEditingField('phone', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ciudad / Localidad
                      </label>
                      <input
                        type="text"
                        value={editingNote.city || ''}
                        onChange={(e) => handleUpdateEditingField('city', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Observaciones / Notas Adicionales
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Entregado en bodega o instrucciones de pago"
                        value={editingNote.notes || ''}
                        onChange={(e) => handleUpdateEditingField('notes', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Block */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                      2. Partidas y Productos a Facturar
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEditingItem}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Partida
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-center w-24">Piezas</th>
                          <th className="p-2.5">Descripción del Producto</th>
                          <th className="p-2.5 text-right w-32">P.U ($ MXN)</th>
                          <th className="p-2.5 text-right w-32">Importe</th>
                          <th className="p-2.5 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {editingNote.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.pieces}
                                onChange={(e) => handleUpdateEditingItem(idx, 'pieces', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center font-bold"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleUpdateEditingItem(idx, 'product', e.target.value)}
                                placeholder="Nombre comercial o químico del producto"
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

                  {/* Totals Summary */}
                  <div className="flex justify-end pt-2">
                    <div className="w-64 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between font-medium text-slate-600">
                        <span>Subtotal:</span>
                        <span>${editingNote.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>IVA:</span>
                        <span>$0.00</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-950 text-sm border-t border-slate-200 pt-1.5">
                        <span>TOTAL:</span>
                        <span className="text-blue-900">${editingNote.total.toFixed(2)} MXN</span>
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm flex items-center cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVA NOTA DE VENTA */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-300">
            
            <div className="bg-purple-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-base">
                  Registrar Nueva Nota de Venta
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Número de Nota (Folio) *
                      </label>
                      <input
                        type="text"
                        value={createNoteNo}
                        onChange={(e) => setCreateNoteNo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={createDate}
                        onChange={(e) => setCreateDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nombre del Cliente / Razón Social *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. PRODUCTOS Y SERVICIOS SAN JUAN"
                        value={createClientName}
                        onChange={(e) => setCreateClientName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        value={createPhone}
                        onChange={(e) => setCreatePhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={createCity}
                        onChange={(e) => setCreateCity(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Observaciones / Notas
                      </label>
                      <input
                        type="text"
                        placeholder="Instrucciones o notas adicionales"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                      Partidas / Productos
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddCreateItem}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1 rounded-lg font-bold flex items-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Partida
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-center w-24">Piezas</th>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5 text-right w-32">P.U ($ MXN)</th>
                          <th className="p-2.5 text-right w-32">Importe</th>
                          <th className="p-2.5 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {createItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={item.pieces}
                                onChange={(e) => handleUpdateCreateItem(idx, 'pieces', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1.5 text-center font-bold"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleUpdateCreateItem(idx, 'product', e.target.value)}
                                placeholder="Ej. SOSA CÁUSTICA 1L"
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
                        <span>TOTAL:</span>
                        <span className="text-purple-900">
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
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-sm flex items-center cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Guardar Nota de Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE BORRADO SEGURO */}
      {/* ========================================================================= */}
      {showDeleteModal && deletingNote && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-slate-900">
                ¿Eliminar Nota de Venta?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Está a punto de eliminar permanentemente la nota de venta <span className="font-bold text-slate-800">No. {deletingNote.noteNo}</span> correspondiente a <span className="font-bold text-slate-800">{deletingNote.clientName}</span> por un importe de <span className="font-bold text-slate-900">${deletingNote.total.toFixed(2)} MXN</span>.
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
