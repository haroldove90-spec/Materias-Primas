import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Filter, Phone, Mail, MapPin, 
  CreditCard, Star, Edit, Trash2, CheckCircle2, XCircle, 
  FileText, Download, RefreshCw, ShoppingCart, AlertCircle, Building, Check, X, MessageSquare, Eye
} from 'lucide-react';
import { Supplier, User } from '../types';
import { MockDatabase } from '../data';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { 
  fetchSuppliersFromSupabase, 
  saveSupplierToSupabase, 
  deleteSupplierInSupabase 
} from '../services/supabaseService';

interface SuppliersManagerProps {
  currentUser: User;
  onCreatePurchaseOrder?: (supplier: Supplier) => void;
}

export const SuppliersManager: React.FC<SuppliersManagerProps> = ({ currentUser, onCreatePurchaseOrder }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for New/Edit
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [rfc, setRfc] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Supplier['category']>('Materia Prima');
  const [paymentTerms, setPaymentTerms] = useState<Supplier['paymentTerms']>('Crédito 30 días');
  const [creditDays, setCreditDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(50000);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const loadSuppliers = async () => {
    // 1. Local first
    const local = MockDatabase.getSuppliers();
    setSuppliers(local);

    // 2. Fetch from cloud
    try {
      const res = await fetchSuppliersFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        // Merge with local
        const map = new Map<string, Supplier>();
        local.forEach(s => map.set(s.id, s));
        res.data.forEach(s => map.set(s.id, s));
        const merged = Array.from(map.values());
        MockDatabase.saveSuppliers(merged);
        setSuppliers(merged);
      }
    } catch (e) {
      console.warn('Sync suppliers error:', e);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      // 1. First push local suppliers to Supabase so none are lost
      const currentList = MockDatabase.getSuppliers();
      for (const sup of currentList) {
        await saveSupplierToSupabase(sup);
      }

      // 2. Fetch fresh data from Supabase
      const res = await fetchSuppliersFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveSuppliers(res.data);
        setSuppliers(res.data);
        setFeedback({ 
          type: 'success', 
          text: `¡${res.data.length} proveedores sincronizados y guardados en Supabase Cloud!` 
        });
      } else {
        setFeedback({ 
          type: 'success', 
          text: `¡${currentList.length} proveedores locales enviados a Supabase con éxito!` 
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', text: `Error de sincronización: ${e?.message || 'Revisa tu conexión'}` });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setName('');
    setRfc('');
    setContactName('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setCategory('Materia Prima');
    setPaymentTerms('Crédito 30 días');
    setCreditDays(30);
    setCreditLimit(50000);
    setRating(5);
    setNotes('');
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setRfc(s.rfc || '');
    setContactName(s.contactName || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setWhatsapp(s.whatsapp || s.phone || '');
    setAddress(s.address || '');
    setCategory(s.category || 'Materia Prima');
    setPaymentTerms(s.paymentTerms || 'Contado');
    setCreditDays(s.creditDays || 0);
    setCreditLimit(s.creditLimit || 0);
    setRating(s.rating || 5);
    setNotes(s.notes || '');
    setActive(s.active ?? true);
    setShowModal(true);
  };

  const handleOpenView = (s: Supplier) => {
    setViewingSupplier(s);
    setShowViewModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('El nombre del proveedor es obligatorio');
      return;
    }

    const newSup: Supplier = {
      id: editingSupplier ? editingSupplier.id : `prov-${Date.now()}`,
      name: name.trim(),
      rfc: rfc.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      category,
      paymentTerms,
      creditDays: Number(creditDays) || 0,
      creditLimit: Number(creditLimit) || 0,
      currentDebt: editingSupplier?.currentDebt || 0,
      rating,
      notes: notes.trim(),
      active,
      createdAt: editingSupplier?.createdAt || new Date().toISOString()
    };

    // Update local database
    const currentList = MockDatabase.getSuppliers();
    let updatedList: Supplier[] = [];
    if (editingSupplier) {
      updatedList = currentList.map(s => s.id === editingSupplier.id ? newSup : s);
    } else {
      updatedList = [newSup, ...currentList];
    }
    MockDatabase.saveSuppliers(updatedList);
    setSuppliers(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      editingSupplier ? 'Actualizó proveedor' : 'Registró nuevo proveedor',
      'Proveedores',
      `${newSup.name} (${newSup.category})`
    );

    setShowModal(false);

    // Sync to Supabase Cloud
    try {
      const res = await saveSupplierToSupabase(newSup);
      if (res.success) {
        setFeedback({ 
          type: 'success', 
          text: `Proveedor "${newSup.name}" guardado y sincronizado con Supabase Cloud exitosamente.` 
        });
      } else {
        setFeedback({ 
          type: 'success', 
          text: `Proveedor guardado localmente (${res.error ? 'Aviso Nube: ' + res.error : 'Pendiente sync'}).` 
        });
      }
    } catch (e: any) {
      console.warn('Supabase sync supplier error:', e);
      setFeedback({ 
        type: 'success', 
        text: `Proveedor guardado en el sistema localmente.` 
      });
    }

    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = async (id: string, supName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${supName}"?`)) return;

    const currentList = MockDatabase.getSuppliers();
    const updated = currentList.filter(s => s.id !== id);
    MockDatabase.saveSuppliers(updated);
    setSuppliers(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó proveedor',
      'Proveedores',
      `ID: ${id}, Nombre: ${supName}`
    );

    setFeedback({ type: 'success', text: `Proveedor "${supName}" eliminado.` });

    try {
      await deleteSupplierInSupabase(id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleActive = async (s: Supplier) => {
    const updated = { ...s, active: !s.active };
    const currentList = MockDatabase.getSuppliers();
    const list = currentList.map(item => item.id === s.id ? updated : item);
    MockDatabase.saveSuppliers(list);
    setSuppliers(list);

    try {
      await saveSupplierToSupabase(updated);
    } catch (e) {
      console.warn('Supabase toggle error:', e);
    }
  };

  const handleExportExcel = () => {
    const data = filteredSuppliers.map(s => ({
      'Razón Social / Nombre': s.name,
      'RFC': s.rfc || 'N/A',
      'Contacto': s.contactName || 'N/A',
      'Categoría': s.category,
      'Teléfono': s.phone || 'N/A',
      'Correo': s.email || 'N/A',
      'Dirección': s.address || 'N/A',
      'Condiciones de Pago': s.paymentTerms,
      'Días Crédito': s.creditDays,
      'Límite de Crédito': s.creditLimit,
      'Saldo por Pagar': s.currentDebt || 0,
      'Estado': s.active ? 'Activo' : 'Inactivo',
      'Calificación': `${s.rating} Estrellas`,
      'Notas': s.notes || ''
    }));
    exportToExcel(data, `Catalogo_Proveedores_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const headers = ['Proveedor', 'RFC', 'Categoría', 'Contacto / Tel.', 'Términos', 'Límite Crédito', 'Estado'];
    const rows = filteredSuppliers.map(s => [
      s.name,
      s.rfc || '-',
      s.category || 'General',
      `${s.contactName || '-'} / ${s.phone || '-'}`,
      `${s.paymentTerms} (${s.creditDays}d)`,
      `$${(s.creditLimit || 0).toLocaleString()}`,
      s.active ? 'Activo' : 'Inactivo'
    ]);
    exportToPDF('Catálogo General de Proveedores - Miauloo ERP', headers, rows, `Proveedores_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  // Filtering
  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactName && s.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.rfc && s.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm));
    
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && s.active) || 
      (statusFilter === 'inactive' && !s.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['all', 'Materia Prima', 'Químicos', 'Empaques', 'Desechables', 'Utensilios', 'Servicios', 'General'];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Catálogo de Proveedores</h1>
              <p className="text-sm text-slate-500">Gestión de abastecimiento, condiciones comerciales y cuentas por pagar</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            title="Sincronizar con Supabase Cloud"
          >
            <RefreshCw className={`w-4 h-4 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/60 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100/60 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          {feedback.text}
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, RFC, contacto o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'Todas las Categorías' : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSuppliers.map((s) => (
          <div 
            key={s.id} 
            className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between hover:shadow-md ${
              s.active ? 'border-slate-200/90' : 'border-slate-200/60 opacity-75 bg-slate-50/50'
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                      {s.category || 'General'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {s.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-1" title={s.name}>
                    {s.name}
                  </h3>
                  {s.rfc && (
                    <span className="text-xs font-mono text-slate-400">RFC: {s.rfc}</span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < (s.rating || 5) ? 'fill-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Contact and Info Details */}
              <div className="space-y-2 text-xs text-slate-600 mb-4 border-t border-b border-slate-100 py-3">
                {s.contactName && (
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-700">{s.contactName}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${s.phone}`} className="hover:text-amber-600 transition-colors">{s.phone}</a>
                  </div>
                )}
                {s.whatsapp && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-emerald-700">{s.whatsapp}</span>
                    </div>
                    <a 
                      href={`https://api.whatsapp.com/send?phone=${s.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${s.email}`} className="truncate hover:text-amber-600 transition-colors">{s.email}</a>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1 text-slate-500" title={s.address}>{s.address}</span>
                  </div>
                )}
              </div>

              {/* Commercial Terms & Credit */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Condiciones:</span>
                  <span className="font-semibold text-slate-800">{s.paymentTerms}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Límite de Crédito:</span>
                  <span className="font-semibold text-slate-800">${(s.creditLimit || 0).toLocaleString()}</span>
                </div>
                {s.currentDebt !== undefined && s.currentDebt > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-semibold pt-1 border-t border-slate-200/60">
                    <span>Saldo por Pagar:</span>
                    <span>${s.currentDebt.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {s.notes && (
                <p className="text-[11px] text-slate-500 italic mb-4 line-clamp-2">
                  "{s.notes}"
                </p>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenView(s)}
                  className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
                  title="Ver detalle del proveedor"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleToggleActive(s)}
                  className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    s.active ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200' : 'text-slate-500 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={s.active ? 'Desactivar proveedor' : 'Activar proveedor'}
                >
                  {s.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors"
                  title="Editar proveedor"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                  title="Eliminar proveedor"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {onCreatePurchaseOrder && (
                <button
                  onClick={() => onCreatePurchaseOrder(s)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Crear OC</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron proveedores</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No hay registros que coincidan con los filtros aplicados. Puedes agregar un nuevo proveedor o ajustar los términos de búsqueda.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Proveedor</span>
          </button>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PROVEEDOR */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                  </h2>
                  <p className="text-xs text-slate-500">Ingresa la información comercial y fiscal del proveedor</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Razón Social / Nombre Comercial *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Distribuidora Harinera del Centro S.A. de C.V."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">RFC Fiscal</label>
                  <input 
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder="DHC090415KT3"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Materia Prima">Materia Prima</option>
                    <option value="Químicos">Químicos</option>
                    <option value="Empaques">Empaques</option>
                    <option value="Desechables">Desechables</option>
                    <option value="Utensilios">Utensilios</option>
                    <option value="Servicios">Servicios</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contacto Principal</label>
                  <input 
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ej. Ing. Fernando Morales"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono / Oficina</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 55-5390-8800"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp de Contacto</label>
                  <input 
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. 55-4433-2211"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico para Pedidos</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ventas@proveedor.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Fiscal / Entrega</label>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Número, Colonia, Municipio, Estado, CP"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Términos de Pago</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setPaymentTerms(val);
                      if (val === 'Contado') setCreditDays(0);
                      else if (val === 'Crédito 15 días') setCreditDays(15);
                      else if (val === 'Crédito 30 días') setCreditDays(30);
                      else if (val === 'Crédito 45 días') setCreditDays(45);
                      else if (val === 'Crédito 60 días') setCreditDays(60);
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Crédito 45 días">Crédito 45 días</option>
                    <option value="Crédito 60 días">Crédito 60 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Límite de Crédito ($ MXN)</label>
                  <input 
                    type="number"
                    min={0}
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Calificación de Confiabilidad</label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${num <= rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-600 ml-1">{rating} / 5</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={active} 
                      onChange={(e) => setActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    <span className="ml-3 text-xs font-semibold text-slate-700">
                      {active ? 'Proveedor Activo' : 'Proveedor Inactivo'}
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Notas Comerciales / Condiciones de Entrega</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Horarios de entrega, tiempos de respuesta, certificados requeridos..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

              </div>

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
                  <span>{editingSupplier ? 'Actualizar Proveedor' : 'Guardar Proveedor'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL DETALLES DEL PROVEEDOR (VIEW MODAL) */}
      {showViewModal && viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{viewingSupplier.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">RFC: {viewingSupplier.rfc || 'No especificado'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-semibold text-slate-500 block">Categoría:</span>
                  <span className="inline-block mt-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {viewingSupplier.category || 'General'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Estado:</span>
                  <span className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    viewingSupplier.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {viewingSupplier.active ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Condiciones de Pago:</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{viewingSupplier.paymentTerms}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Límite de Crédito:</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">${(viewingSupplier.creditLimit || 0).toLocaleString()} MXN</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Contacto y Comunicación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{viewingSupplier.contactName || 'Sin contacto directo'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{viewingSupplier.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center gap-2 sm:col-span-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{viewingSupplier.email || 'Sin correo'}</span>
                  </div>
                  {viewingSupplier.address && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{viewingSupplier.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewingSupplier.whatsapp && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-[11px] text-emerald-800 font-semibold block">WhatsApp Directo</span>
                      <span className="font-mono font-bold text-xs text-emerald-950">{viewingSupplier.whatsapp}</span>
                    </div>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${viewingSupplier.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <span>Abrir Chat</span>
                  </a>
                </div>
              )}

              {viewingSupplier.notes && (
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Notas Comerciales y Logística</h4>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap">
                    {viewingSupplier.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenEdit(viewingSupplier);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar
                </button>
                {onCreatePurchaseOrder && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      onCreatePurchaseOrder(viewingSupplier);
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Generar OC
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
