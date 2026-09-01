import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Phone, Mail, MapPin, 
  CreditCard, Edit, Trash2, CheckCircle2, XCircle, 
  FileText, Download, RefreshCw, AlertCircle, Building, Check, X, MessageSquare, DollarSign, Wallet, Eye
} from 'lucide-react';
import { Client, User } from '../types';
import { MockDatabase } from '../data';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { 
  fetchClientsFromSupabase, 
  saveClientToSupabase, 
  deleteClientInSupabase 
} from '../services/supabaseService';

interface ClientsManagerProps {
  currentUser: User;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceListFilter, setPriceListFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'with_debt' | 'no_debt'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for New/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [priceList, setPriceList] = useState<Client['priceList']>('Público');
  const [creditDays, setCreditDays] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const loadClients = async () => {
    // 1. Local state
    const local = MockDatabase.getClients();
    setClients(local);

    // 2. Fetch from Supabase Cloud
    try {
      const res = await fetchClientsFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const map = new Map<string, Client>();
        local.forEach(c => map.set(c.id, c));
        res.data.forEach(c => map.set(c.id, c));
        const merged = Array.from(map.values());
        MockDatabase.saveClients(merged);
        setClients(merged);
      }
    } catch (e) {
      console.warn('Sync clients error:', e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetchClientsFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveClients(res.data);
        setClients(res.data);
        setFeedback({ type: 'success', text: `¡${res.data.length} clientes sincronizados con Supabase!` });
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
    setEditingClient(null);
    setName('');
    setRfc('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setAddress('');
    setPriceList('Público');
    setCreditDays(0);
    setCreditLimit(0);
    setNotes('');
    setActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setRfc(c.rfc || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setWhatsapp(c.whatsapp || c.phone || '');
    setAddress(c.address || '');
    setPriceList(c.priceList || 'Público');
    setCreditDays(c.creditDays || 0);
    setCreditLimit(c.creditLimit || 0);
    setNotes(c.notes || '');
    setActive(c.active ?? true);
    setShowModal(true);
  };

  const handleToggleActive = async (c: Client) => {
    const nextStatus = !(c.active ?? true);
    const updatedClient: Client = { ...c, active: nextStatus };
    const currentList = MockDatabase.getClients();
    const updatedList = currentList.map(item => item.id === c.id ? updatedClient : item);
    MockDatabase.saveClients(updatedList);
    setClients(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      nextStatus ? 'Activó cliente' : 'Desactivó cliente',
      'Clientes',
      `${c.name} ahora está ${nextStatus ? 'Activo' : 'Inactivo'}`
    );

    setFeedback({
      type: 'success',
      text: `Cliente "${c.name}" ${nextStatus ? 'activado' : 'desactivado'} correctamente.`
    });

    try {
      await saveClientToSupabase(updatedClient);
    } catch (e) {
      console.warn('Supabase sync client error:', e);
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    const newClient: Client = {
      id: editingClient ? editingClient.id : `cli-${Date.now()}`,
      name: name.trim(),
      rfc: rfc.trim(),
      email: email.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      address: address.trim(),
      priceList,
      creditDays: Number(creditDays) || 0,
      creditLimit: Number(creditLimit) || 0,
      currentDebt: editingClient?.currentDebt || 0,
      notes: notes.trim(),
      active,
      createdAt: editingClient?.createdAt || new Date().toISOString()
    };

    // Update local database
    const currentList = MockDatabase.getClients();
    let updatedList: Client[] = [];
    if (editingClient) {
      updatedList = currentList.map(c => c.id === editingClient.id ? newClient : c);
    } else {
      updatedList = [newClient, ...currentList];
    }
    MockDatabase.saveClients(updatedList);
    setClients(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      editingClient ? 'Actualizó cliente' : 'Registró nuevo cliente',
      'Clientes',
      `${newClient.name} (${newClient.priceList}) - Estado: ${newClient.active ? 'Activo' : 'Inactivo'}`
    );

    setShowModal(false);
    setFeedback({ type: 'success', text: `Cliente "${newClient.name}" guardado correctamente.` });

    // Sync to Supabase Cloud
    try {
      await saveClientToSupabase(newClient);
    } catch (e) {
      console.warn('Supabase sync client error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente al cliente "${clientName}"?`)) return;

    const currentList = MockDatabase.getClients();
    const updated = currentList.filter(c => c.id !== id);
    MockDatabase.saveClients(updated);
    setClients(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó cliente',
      'Clientes',
      `ID: ${id}, Nombre: ${clientName}`
    );

    setFeedback({ type: 'success', text: `Cliente "${clientName}" eliminado.` });

    try {
      await deleteClientInSupabase(id);
    } catch (e) {
      console.warn('Supabase delete client error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSendWhatsAppMessage = (client: Client) => {
    const cleanPhone = (client.whatsapp || client.phone || '').replace(/\D/g, '');
    const message = `👋 *¡Hola estimado/a ${client.name}!*

Le saludamos cordialmente de *Miauloo*.
¿En qué podemos apoyarle hoy con sus pedidos o consultas?

Estamos a sus órdenes. ✨`;

    let url = '';
    if (cleanPhone.length >= 10) {
      const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    const data = filteredClients.map(c => ({
      'ID': c.id,
      'Nombre del Cliente': c.name,
      'RFC': c.rfc || 'N/A',
      'Teléfono': c.phone || 'N/A',
      'WhatsApp': c.whatsapp || c.phone || 'N/A',
      'Correo': c.email || 'N/A',
      'Dirección': c.address || 'N/A',
      'Lista de Precios': c.priceList,
      'Días de Crédito': c.creditDays,
      'Límite de Crédito ($)': c.creditLimit,
      'Saldo Pendiente ($)': c.currentDebt
    }));
    exportToExcel(data, `Clientes_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const headers = ['Nombre', 'Teléfono / WhatsApp', 'Lista Precios', 'Crédito ($)', 'Saldo Pendiente ($)'];
    const rows = filteredClients.map(c => [
      c.name,
      `${c.phone || '-'} / ${c.whatsapp || '-'}`,
      c.priceList,
      `$${c.creditLimit.toLocaleString()}`,
      `$${c.currentDebt.toLocaleString()}`
    ]);
    exportToPDF('Catálogo y Cartera de Clientes - Miauloo ERP', headers, rows, `Clientes_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  // Filter Clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.whatsapp && c.whatsapp.includes(searchTerm)) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriceList = priceListFilter === 'all' || c.priceList === priceListFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && (c.active ?? true)) || 
      (statusFilter === 'inactive' && c.active === false);
    const matchesDebt = 
      debtFilter === 'all' || 
      (debtFilter === 'with_debt' && (c.currentDebt || 0) > 0) || 
      (debtFilter === 'no_debt' && (c.currentDebt || 0) <= 0);

    return matchesSearch && matchesPriceList && matchesStatus && matchesDebt;
  });

  const totalDebt = clients.reduce((acc, c) => acc + (c.currentDebt || 0), 0);
  const totalCreditLimit = clients.reduce((acc, c) => acc + (c.creditLimit || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Catálogo y Cartera de Clientes</h1>
              <p className="text-xs text-slate-500">Gestión de clientes, direcciones, teléfonos, WhatsApp y límites de crédito</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Sincronizar clientes con Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
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
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total de Clientes</p>
            <h3 className="text-2xl font-bold text-slate-800">{clients.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Línea de Crédito Otorgada</p>
            <h3 className="text-2xl font-bold text-slate-800">${totalCreditLimit.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Saldo Total por Cobrar</p>
            <h3 className="text-2xl font-bold text-rose-600">${totalDebt.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por cliente, teléfono, WhatsApp, correo o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos / Desactivados</option>
          </select>

          <select
            value={priceListFilter}
            onChange={(e) => setPriceListFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todas las Listas</option>
            <option value="Público">Público General</option>
            <option value="Mayoreo">Mayoreo</option>
            <option value="Distribuidor">Distribuidor</option>
          </select>

          <select
            value={debtFilter}
            onChange={(e) => setDebtFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos los Saldos</option>
            <option value="with_debt">Con Saldo Pendiente</option>
            <option value="no_debt">Sin Deuda / Al Corriente</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((c) => {
          const isActive = c.active ?? true;
          return (
            <div 
              key={c.id} 
              className={`bg-white rounded-2xl border ${isActive ? 'border-slate-200/80 hover:border-blue-300' : 'border-slate-200 bg-slate-50/50 opacity-80'} p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 leading-tight">{c.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {c.rfc && (
                      <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">RFC: {c.rfc}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    c.priceList === 'Distribuidor' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    c.priceList === 'Mayoreo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {c.priceList}
                  </span>
                </div>

                {/* Contact and Info Details */}
                <div className="space-y-2 text-xs text-slate-600 mb-4 border-t border-b border-slate-100 py-3">
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 text-slate-500" title={c.address}>{c.address}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${c.phone}`} className="hover:text-blue-600 transition-colors">{c.phone}</a>
                    </div>
                  )}
                  {c.whatsapp && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-emerald-700">{c.whatsapp}</span>
                      </div>
                      <button
                        onClick={() => handleSendWhatsAppMessage(c)}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                        title="Enviar mensaje por WhatsApp"
                      >
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${c.email}`} className="truncate hover:text-blue-600 transition-colors">{c.email}</a>
                    </div>
                  )}
                </div>

                {/* Credit Terms & Balance */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Plazo de Crédito:</span>
                    <span className="font-semibold text-slate-800">{c.creditDays > 0 ? `${c.creditDays} días` : 'Contado'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Límite de Crédito:</span>
                    <span className="font-semibold text-slate-800">${(c.creditLimit || 0).toLocaleString()}</span>
                  </div>
                  {c.currentDebt > 0 && (
                    <div className="flex justify-between items-center text-rose-600 font-semibold pt-1 border-t border-slate-200/60">
                      <span>Saldo Pendiente:</span>
                      <span>${c.currentDebt.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingClient(c)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    title="Ver detalle completo del cliente"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                    title="Editar datos del cliente"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isActive 
                        ? 'text-amber-600 border-amber-200 hover:bg-amber-50' 
                        : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                    }`}
                    title={isActive ? 'Desactivar cliente' : 'Activar cliente'}
                  >
                    {isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                    title="Eliminar permanentemente al cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleSendWhatsAppMessage(c)}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contactar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron clientes</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No hay registros con los términos de búsqueda o filtros seleccionados.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>
      )}

      {/* MODAL VER DETALLE DEL CLIENTE */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{viewingClient.name}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (viewingClient.active ?? true) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {(viewingClient.active ?? true) ? 'Cliente Activo' : 'Cliente Inactivo'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setViewingClient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="text-slate-400 font-medium">Lista de Precios</p>
                  <p className="font-bold text-slate-800 text-sm">{viewingClient.priceList}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">RFC</p>
                  <p className="font-mono font-semibold text-slate-800">{viewingClient.rfc || 'No registrado'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Límite de Crédito</p>
                  <p className="font-bold text-slate-800">${(viewingClient.creditLimit || 0).toLocaleString()} MXN</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Plazo Permitido</p>
                  <p className="font-semibold text-slate-800">{viewingClient.creditDays > 0 ? `${viewingClient.creditDays} días` : 'Contado'}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <p className="text-slate-400 font-medium">Saldo Pendiente de Cobro</p>
                  <p className="font-bold text-rose-600 text-base">${(viewingClient.currentDebt || 0).toLocaleString()} MXN</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-800">Información de Contacto y Envío:</p>
                <p><span className="text-slate-500">Dirección:</span> {viewingClient.address || 'No especificada'}</p>
                <p><span className="text-slate-500">Teléfono:</span> {viewingClient.phone || 'No especificado'}</p>
                <p><span className="text-slate-500">WhatsApp:</span> {viewingClient.whatsapp || 'No especificado'}</p>
                <p><span className="text-slate-500">Correo:</span> {viewingClient.email || 'No especificado'}</p>
                {viewingClient.notes && (
                  <p className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-800 mt-2">
                    <span className="font-bold block">Notas / Observaciones:</span> {viewingClient.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => {
                  const client = viewingClient;
                  setViewingClient(null);
                  handleOpenEdit(client);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Editar este Cliente</span>
              </button>
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR CLIENTE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h2>
                  <p className="text-xs text-slate-500">Datos comerciales, dirección y contacto del cliente</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nombre del cliente */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Cliente / Negocio *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Pastelería El Maná del Cielo"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>

                {/* Estatus Activo / Inactivo */}
                <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Estado del Cliente en el Sistema</p>
                    <p className="text-[11px] text-slate-500">Los clientes inactivos se ocultan de las ventas rápidas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      active ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {active ? '✓ Cliente Activo' : '✕ Desactivado / Inactivo'}
                  </button>
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Completa</label>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Teléfonos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono Fijo / Oficina</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 477-123-4567"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp de Pedidos / Cobranza</label>
                  <input 
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. 477-123-4567"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Correo */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@negocio.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* RFC */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">RFC Fiscal</label>
                  <input 
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder="XAXX010101000"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Lista de Precios */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lista de Precios</label>
                  <select
                    value={priceList}
                    onChange={(e) => setPriceList(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Público">Público General</option>
                    <option value="Mayoreo">Mayoreo</option>
                    <option value="Distribuidor">Distribuidor</option>
                  </select>
                </div>

                {/* Días de Crédito */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Días de Crédito</label>
                  <input 
                    type="number"
                    min={0}
                    value={creditDays}
                    onChange={(e) => setCreditDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Límite de Crédito */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Límite de Crédito ($ MXN)</label>
                  <input 
                    type="number"
                    min={0}
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Notas / Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Notas Comerciales / Condiciones Especiales</label>
                  <textarea 
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones de entrega, horarios de recepción, etc."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
