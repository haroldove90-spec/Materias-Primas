import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, DollarSign, Plus, Search, Filter, Calendar, 
  Clock, CheckCircle2, AlertTriangle, Eye, Edit, Trash2, 
  Download, Printer, RefreshCw, X, ArrowUpRight, ArrowDownRight,
  UserCheck, ShieldAlert, CreditCard, Receipt, FileText, Send, MessageSquare
} from 'lucide-react';
import { AccountReceivable, ReceivablePayment, Client, User } from '../types';
import { MockDatabase } from '../data';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { 
  fetchAccountsReceivableFromSupabase, 
  saveAccountReceivableToSupabase, 
  deleteAccountReceivableInSupabase,
  saveReceivablePaymentToSupabase,
  deleteReceivablePaymentInSupabase,
  saveClientToSupabase
} from '../services/supabaseService';

interface AccountsReceivableManagerProps {
  currentUser: User;
}

export const AccountsReceivableManager: React.FC<AccountsReceivableManagerProps> = ({ currentUser }) => {
  // Main Data States
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'parcial' | 'liquidado' | 'vencido'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Modals States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);

  // Form: Create / Edit Receivable State
  const [formFolio, setFormFolio] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formConcept, setFormConcept] = useState('');
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formCreditDays, setFormCreditDays] = useState(30);
  const [formTotalAmount, setFormTotalAmount] = useState<number>(0);
  const [formRemainingBalance, setFormRemainingBalance] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<AccountReceivable['status']>('pendiente');
  const [formNotes, setFormNotes] = useState('');
  const [formSaleId, setFormSaleId] = useState('');

  // Form: Register Payment State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<ReceivablePayment['paymentMethod']>('Transferencia SPEI');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Load Data
  const loadData = async () => {
    // 1. Local data
    const localReceivables = MockDatabase.getAccountsReceivable();
    const localClients = MockDatabase.getClients();
    setReceivables(localReceivables);
    setClients(localClients);

    // 2. Fetch from Supabase
    try {
      const res = await fetchAccountsReceivableFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const map = new Map<string, AccountReceivable>();
        localReceivables.forEach(r => map.set(r.id, r));
        res.data.forEach(r => map.set(r.id, r));
        const merged = Array.from(map.values());
        MockDatabase.saveAccountsReceivable(merged);
        setReceivables(merged);
      }
    } catch (e) {
      console.warn('Sync receivables error:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate due date when issue date or credit days change in create form
  useEffect(() => {
    if (formIssueDate && formCreditDays !== undefined) {
      const d = new Date(formIssueDate);
      d.setDate(d.getDate() + Number(formCreditDays));
      setFormDueDate(d.toISOString().split('T')[0]);
    }
  }, [formIssueDate, formCreditDays]);

  // Cloud Manual Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetchAccountsReceivableFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveAccountsReceivable(res.data);
        setReceivables(res.data);
        setFeedback({ type: 'success', text: `¡${res.data.length} cuentas por cobrar sincronizadas con Supabase!` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'No se pudo sincronizar desde Supabase' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error al conectar con la base de datos Supabase' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const activeItems = receivables.filter(r => r.active !== false && r.status !== 'cancelado');
    const totalDebt = activeItems
      .filter(r => r.status !== 'liquidado')
      .reduce((sum, r) => sum + (r.remainingBalance || 0), 0);
    
    const totalPaid = activeItems.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

    const now = new Date().toISOString().split('T')[0];
    const overdueItems = activeItems.filter(r => r.status !== 'liquidado' && r.dueDate < now);
    const overdueDebt = overdueItems.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

    const clientsWithDebt = new Set(activeItems.filter(r => r.remainingBalance > 0).map(r => r.clientId)).size;

    return { totalDebt, totalPaid, overdueCount: overdueItems.length, overdueDebt, clientsWithDebt };
  }, [receivables]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    setFormFolio(`CXC-${nextNum}`);
    setFormClientId(clients[0]?.id || '');
    setFormConcept('Venta a crédito de insumos químicos / productos');
    const today = new Date().toISOString().split('T')[0];
    setFormIssueDate(today);
    setFormCreditDays(30);
    setFormTotalAmount(5000);
    setFormRemainingBalance(5000);
    setFormStatus('pendiente');
    setFormNotes('');
    setFormSaleId('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: AccountReceivable) => {
    setSelectedReceivable(rec);
    setFormFolio(rec.folio);
    setFormClientId(rec.clientId);
    setFormConcept(rec.concept);
    setFormIssueDate(rec.issueDate);
    setFormDueDate(rec.dueDate);
    setFormCreditDays(rec.creditDays);
    setFormTotalAmount(rec.totalAmount);
    setFormRemainingBalance(rec.remainingBalance);
    setFormStatus(rec.status);
    setFormNotes(rec.notes || '');
    setFormSaleId(rec.saleId || '');
    setShowEditModal(true);
  };

  // Open Payment Modal
  const handleOpenPayment = (rec: AccountReceivable) => {
    setSelectedReceivable(rec);
    setPayAmount(rec.remainingBalance > 0 ? rec.remainingBalance : 0);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('Transferencia SPEI');
    setPayReference(`SPEI-${Math.floor(10000 + Math.random() * 90000)}`);
    setPayNotes(`Abono a cuenta ${rec.folio}`);
    setShowPaymentModal(true);
  };

  // Open View Modal
  const handleOpenView = (rec: AccountReceivable) => {
    setSelectedReceivable(rec);
    setShowViewModal(true);
  };

  // Save New Receivable
  const handleSaveNewReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formTotalAmount <= 0) {
      alert('Por favor selecciona un cliente y asigna un monto válido mayor a 0');
      return;
    }

    const client = clients.find(c => c.id === formClientId);
    const clientName = client ? client.name : 'Cliente General';

    const newRec: AccountReceivable = {
      id: `cxc-${Date.now()}`,
      folio: formFolio || `CXC-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: formClientId,
      clientName,
      saleId: formSaleId.trim() || undefined,
      concept: formConcept.trim() || 'Crédito otorgado',
      issueDate: formIssueDate,
      dueDate: formDueDate,
      creditDays: Number(formCreditDays) || 30,
      totalAmount: Number(formTotalAmount),
      amountPaid: 0,
      remainingBalance: Number(formTotalAmount),
      status: 'pendiente',
      notes: formNotes.trim(),
      payments: [],
      createdAt: new Date().toISOString(),
      active: true
    };

    const currentList = MockDatabase.getAccountsReceivable();
    const updated = [newRec, ...currentList];
    MockDatabase.saveAccountsReceivable(updated);
    setReceivables(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Registró cuenta por cobrar',
      'Cuentas por Cobrar',
      `Folio: ${newRec.folio} • Cliente: ${clientName} • Monto: $${newRec.totalAmount.toLocaleString('es-MX')}`
    );

    recordSaveTelemetry({
      table: 'accounts_receivable',
      folio: newRec.folio,
      action: 'Cuenta por Cobrar Creada',
      countBefore: currentList.length,
      countAfter: updated.length,
      status: 'success',
      payloadSummary: `Cliente: ${clientName} • Monto: $${newRec.totalAmount.toFixed(2)}`,
      source: 'cloud_sync'
    });

    setShowCreateModal(false);
    setFeedback({ type: 'success', text: `Cuenta por cobrar ${newRec.folio} guardada exitosamente.` });

    // Sync to Supabase
    try {
      await saveAccountReceivableToSupabase(newRec);
      if (client) {
        const updatedClient: Client = { ...client, currentDebt: (client.currentDebt || 0) + newRec.remainingBalance };
        await saveClientToSupabase(updatedClient);
      }
    } catch (err) {
      console.warn('Supabase sync error on new receivable:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Save Edited Receivable
  const handleSaveEditReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    const client = clients.find(c => c.id === formClientId);
    const clientName = client ? client.name : selectedReceivable.clientName;

    const updatedRec: AccountReceivable = {
      ...selectedReceivable,
      folio: formFolio,
      clientId: formClientId,
      clientName,
      saleId: formSaleId.trim() || undefined,
      concept: formConcept.trim(),
      issueDate: formIssueDate,
      dueDate: formDueDate,
      creditDays: Number(formCreditDays),
      totalAmount: Number(formTotalAmount),
      remainingBalance: Number(formRemainingBalance),
      status: formStatus,
      notes: formNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    const currentList = MockDatabase.getAccountsReceivable();
    const updated = currentList.map(r => r.id === selectedReceivable.id ? updatedRec : r);
    MockDatabase.saveAccountsReceivable(updated);
    setReceivables(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Modificó cuenta por cobrar',
      'Cuentas por Cobrar',
      `Folio: ${updatedRec.folio} • Saldo: $${updatedRec.remainingBalance.toLocaleString('es-MX')} • Estatus: ${updatedRec.status}`
    );

    setShowEditModal(false);
    setFeedback({ type: 'success', text: `Cuenta por cobrar ${updatedRec.folio} actualizada con éxito.` });

    try {
      await saveAccountReceivableToSupabase(updatedRec);
    } catch (err) {
      console.warn('Supabase edit receivable error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete Receivable
  const handleDeleteReceivable = async (rec: AccountReceivable) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de cuenta por cobrar ${rec.folio} de "${rec.clientName}"?\nEsta acción actualizará el saldo deudor.`)) {
      return;
    }

    const currentList = MockDatabase.getAccountsReceivable();
    const updated = currentList.filter(r => r.id !== rec.id);
    MockDatabase.saveAccountsReceivable(updated);
    setReceivables(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó cuenta por cobrar',
      'Cuentas por Cobrar',
      `Folio: ${rec.folio} • Cliente: ${rec.clientName} • Saldo: $${rec.remainingBalance.toLocaleString('es-MX')}`
    );

    setFeedback({ type: 'success', text: `Registro ${rec.folio} eliminado correctamente.` });

    try {
      await deleteAccountReceivableInSupabase(rec.id);
      // Recalculate client debt in supabase
      const client = clients.find(c => c.id === rec.clientId);
      if (client) {
        const remainingForClient = updated
          .filter(r => r.clientId === client.id && r.status !== 'liquidado')
          .reduce((sum, r) => sum + r.remainingBalance, 0);
        await saveClientToSupabase({ ...client, currentDebt: remainingForClient });
      }
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Register Payment (Abono)
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable || payAmount <= 0) {
      alert('Por favor ingresa un monto válido a abonar mayor a 0');
      return;
    }

    if (payAmount > selectedReceivable.remainingBalance) {
      if (!confirm(`El monto a abonar ($${payAmount.toLocaleString('es-MX')}) es mayor que el saldo pendiente ($${selectedReceivable.remainingBalance.toLocaleString('es-MX')}). ¿Deseas continuar y liquidar totalmente la cuenta?`)) {
        return;
      }
    }

    const newPayment: ReceivablePayment = {
      id: `pay-${Date.now()}`,
      receivableId: selectedReceivable.id,
      clientId: selectedReceivable.clientId,
      date: payDate,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      reference: payReference.trim(),
      receivedBy: currentUser.name,
      notes: payNotes.trim(),
      createdAt: new Date().toISOString()
    };

    const newAmountPaid = (selectedReceivable.amountPaid || 0) + Number(payAmount);
    const newRemainingBalance = Math.max(0, (selectedReceivable.totalAmount || 0) - newAmountPaid);
    const newStatus: AccountReceivable['status'] = newRemainingBalance <= 0 ? 'liquidado' : 'parcial';

    const existingPayments = selectedReceivable.payments || [];
    const updatedPayments = [...existingPayments, newPayment];

    const updatedRec: AccountReceivable = {
      ...selectedReceivable,
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance,
      status: newStatus,
      payments: updatedPayments,
      updatedAt: new Date().toISOString()
    };

    // Update in local DB
    const currentList = MockDatabase.getAccountsReceivable();
    const updated = currentList.map(r => r.id === selectedReceivable.id ? updatedRec : r);
    MockDatabase.saveAccountsReceivable(updated);
    setReceivables(updated);

    // Save payment in DB
    const currentPayments = MockDatabase.getReceivablePayments();
    MockDatabase.saveReceivablePayments([newPayment, ...currentPayments]);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Registró abono a cuenta por cobrar',
      'Cuentas por Cobrar / Abonos',
      `Folio: ${selectedReceivable.folio} • Abono: $${newPayment.amount.toLocaleString('es-MX')} • Método: ${newPayment.paymentMethod} • Saldo Restante: $${newRemainingBalance.toLocaleString('es-MX')}`
    );

    recordSaveTelemetry({
      table: 'receivable_payments',
      folio: `ABONO-${newPayment.id.slice(-6)}`,
      action: 'Abono Registrado a Cuenta',
      countBefore: currentPayments.length,
      countAfter: currentPayments.length + 1,
      status: 'success',
      payloadSummary: `Cuenta: ${selectedReceivable.folio} • Monto: $${newPayment.amount.toFixed(2)} • Saldo: $${newRemainingBalance.toFixed(2)}`,
      source: 'cloud_sync'
    });

    setShowPaymentModal(false);
    setSelectedReceivable(updatedRec);
    setFeedback({ type: 'success', text: `¡Abono de $${newPayment.amount.toLocaleString('es-MX')} MXN registrado! Saldo restante: $${newRemainingBalance.toLocaleString('es-MX')} MXN` });

    // Sync to Supabase
    try {
      await saveReceivablePaymentToSupabase(newPayment);
      await saveAccountReceivableToSupabase(updatedRec);
      
      const client = clients.find(c => c.id === selectedReceivable.clientId);
      if (client) {
        const remainingDebt = Math.max(0, (client.currentDebt || 0) - Number(payAmount));
        await saveClientToSupabase({ ...client, currentDebt: remainingDebt });
      }
    } catch (err) {
      console.warn('Supabase payment sync error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete Individual Payment inside View Modal
  const handleDeletePayment = async (payId: string, payAmount: number) => {
    if (!selectedReceivable) return;
    if (!confirm(`¿Estás seguro de eliminar este pago de $${payAmount.toLocaleString('es-MX')}? El saldo pendiente se ajustará.`)) {
      return;
    }

    const updatedPayments = (selectedReceivable.payments || []).filter(p => p.id !== payId);
    const newAmountPaid = Math.max(0, (selectedReceivable.amountPaid || 0) - payAmount);
    const newRemainingBalance = (selectedReceivable.totalAmount || 0) - newAmountPaid;
    const newStatus: AccountReceivable['status'] = newAmountPaid === 0 ? 'pendiente' : (newRemainingBalance <= 0 ? 'liquidado' : 'parcial');

    const updatedRec: AccountReceivable = {
      ...selectedReceivable,
      amountPaid: newAmountPaid,
      remainingBalance: newRemainingBalance,
      status: newStatus,
      payments: updatedPayments
    };

    const currentList = MockDatabase.getAccountsReceivable();
    const updated = currentList.map(r => r.id === selectedReceivable.id ? updatedRec : r);
    MockDatabase.saveAccountsReceivable(updated);
    setReceivables(updated);
    setSelectedReceivable(updatedRec);

    const currentPays = MockDatabase.getReceivablePayments();
    MockDatabase.saveReceivablePayments(currentPays.filter(p => p.id !== payId));

    try {
      await deleteReceivablePaymentInSupabase(payId);
      await saveAccountReceivableToSupabase(updatedRec);
    } catch (e) {
      console.warn('Error deleting payment in Supabase:', e);
    }

    setFeedback({ type: 'success', text: 'Pago revertido y saldo recalculado.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (rec: AccountReceivable) => {
    const client = clients.find(c => c.id === rec.clientId);
    const phone = client?.whatsapp || client?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');

    const message = `👋 *Estimado/a ${rec.clientName}:*

Le saludamos de *Miauloo - Soluciones Integrales de Abasto*. 
Le compartimos el estado de su cuenta:

📄 *Folio:* ${rec.folio}
📌 *Concepto:* ${rec.concept}
💰 *Monto Total:* $${rec.totalAmount.toLocaleString('es-MX')} MXN
✅ *Total Abonado:* $${rec.amountPaid.toLocaleString('es-MX')} MXN
⚠️ *Saldo Pendiente:* $${rec.remainingBalance.toLocaleString('es-MX')} MXN
📅 *Fecha de Vencimiento:* ${rec.dueDate}

Agradecemos su atención y quedamos a sus órdenes para la recepción de su comprobante de pago. ✨`;

    let url = '';
    if (cleanPhone.length >= 10) {
      const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    window.open(url, '_blank');
  };

  // Filtered List
  const filteredReceivables = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return receivables.filter(r => {
      if (r.active === false) return false;

      // Status filter
      if (statusFilter === 'pendiente' && r.status !== 'pendiente') return false;
      if (statusFilter === 'parcial' && r.status !== 'parcial') return false;
      if (statusFilter === 'liquidado' && r.status !== 'liquidado') return false;
      if (statusFilter === 'vencido') {
        const isOverdue = r.status !== 'liquidado' && r.dueDate < now;
        if (!isOverdue && r.status !== 'vencido') return false;
      }

      // Client filter
      if (clientFilter !== 'all' && r.clientId !== clientFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchFolio = r.folio.toLowerCase().includes(term);
        const matchClient = r.clientName.toLowerCase().includes(term);
        const matchConcept = (r.concept || '').toLowerCase().includes(term);
        const matchNotes = (r.notes || '').toLowerCase().includes(term);
        if (!matchFolio && !matchClient && !matchConcept && !matchNotes) return false;
      }

      return true;
    });
  }, [receivables, statusFilter, clientFilter, searchTerm]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredReceivables.map(r => ({
      'Folio': r.folio,
      'Cliente': r.clientName,
      'Concepto': r.concept,
      'Fecha Emisión': r.issueDate,
      'Fecha Vencimiento': r.dueDate,
      'Días Crédito': r.creditDays,
      'Monto Total ($)': r.totalAmount,
      'Total Abonado ($)': r.amountPaid,
      'Saldo Pendiente ($)': r.remainingBalance,
      'Estatus': r.status.toUpperCase(),
      'Notas': r.notes || ''
    }));
    exportToExcel(rows, 'Cuentas_Por_Cobrar_Miauloo');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = ['Folio', 'Cliente', 'Concepto', 'Total', 'Abonado', 'Saldo', 'Vence', 'Estado'];
    const rows = filteredReceivables.map(r => [
      r.folio,
      r.clientName,
      r.concept.length > 25 ? r.concept.substring(0, 22) + '...' : r.concept,
      `$${r.totalAmount.toLocaleString('es-MX')}`,
      `$${r.amountPaid.toLocaleString('es-MX')}`,
      `$${r.remainingBalance.toLocaleString('es-MX')}`,
      r.dueDate,
      r.status.toUpperCase()
    ]);
    exportToPDF('Reporte de Cuentas por Cobrar y Cartera de Clientes', headers, rows);
  };

  const getStatusBadge = (rec: AccountReceivable) => {
    const now = new Date().toISOString().split('T')[0];
    const isOverdue = rec.status !== 'liquidado' && rec.dueDate < now;

    if (rec.status === 'liquidado') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Liquidado
        </span>
      );
    }

    if (isOverdue || rec.status === 'vencido') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-600" /> Vencido
        </span>
      );
    }

    if (rec.status === 'parcial') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3 text-sky-600" /> Parcial
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3 text-amber-600" /> Pendiente
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-800" id="receivables_manager_root">
      
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
        
        {/* Cartera Total Pendiente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartera por Cobrar</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ${kpis.totalDebt.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              En <span className="font-bold text-slate-800">{kpis.clientsWithDebt}</span> clientes con saldo activo
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Total Recuperado / Abonado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cobrado / Abonos</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              ${kpis.totalPaid.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-emerald-700/80 mt-1 flex items-center gap-1 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5" /> Ingresos ingresados a caja
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Cuentas Vencidas / Alertas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartera Vencida</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              ${kpis.overdueDebt.toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-rose-700/80 mt-1 font-medium">
              {kpis.overdueCount} {kpis.overdueCount === 1 ? 'cuenta vencida' : 'cuentas vencidas'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Clientes con Crédito Autorizado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Línea de Crédito Total</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              ${clients.reduce((sum, c) => sum + (c.creditLimit || 0), 0).toLocaleString('es-MX')} <span className="text-xs text-slate-500 font-normal">MXN</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {clients.filter(c => c.creditLimit > 0).length} clientes autorizados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Control Bar: Actions, Search & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-purple-600" />
              Gestión de Cuentas por Cobrar y Abonos
            </h3>
            <p className="text-xs text-slate-500">
              Control de saldos, registro de abonos y pagos, edición de plazos y seguimiento de deudores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
              title="Sincronizar con Supabase Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-purple-600' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Recargar Nube'}
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>

            {/* New Receivable Button */}
            <button
              onClick={handleOpenCreate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-auto md:ml-0"
              id="btn_new_receivable"
            >
              <Plus className="w-4 h-4" /> Nuevo Crédito / Registro
            </button>
          </div>
        </div>

        {/* Search & Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, folio CXC o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white"
            >
              <option value="all">Todos los Estatus</option>
              <option value="pendiente">Solo Pendientes (Sin abono)</option>
              <option value="parcial">Con Abonos Parciales</option>
              <option value="liquidado">Liquidados / Saldo $0</option>
              <option value="vencido">Vencidos / Fuera de Plazo</option>
            </select>
          </div>

          {/* Client Filter */}
          <div className="md:col-span-3">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white"
            >
              <option value="all">Todos los Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
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
                <th className="py-3 px-4">Cliente Deudor</th>
                <th className="py-3 px-4">Concepto / Venta</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-right">Abonado</th>
                <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                <th className="py-3 px-4 text-center">Vencimiento</th>
                <th className="py-3 px-4 text-center">Estatus</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-semibold">No se encontraron cuentas por cobrar.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ajusta los filtros o registra un nuevo crédito con el botón superior.</p>
                  </td>
                </tr>
              ) : (
                filteredReceivables.map((rec) => {
                  const now = new Date().toISOString().split('T')[0];
                  const isOverdue = rec.status !== 'liquidado' && rec.dueDate < now;
                  const percentPaid = rec.totalAmount > 0 
                    ? Math.min(100, Math.round(((rec.amountPaid || 0) / rec.totalAmount) * 100)) 
                    : 0;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Folio & Fecha */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono text-[11px] flex items-center gap-1.5">
                          {rec.folio}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {rec.issueDate}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{rec.clientName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={() => handleSendWhatsAppReminder(rec)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                            title="Enviar recordatorio de cobro por WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" /> Recordar por WhatsApp
                          </button>
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="truncate text-slate-700 font-medium">{rec.concept}</p>
                        {rec.saleId && (
                          <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            Ref: {rec.saleId}
                          </span>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        ${rec.totalAmount.toLocaleString('es-MX')}
                      </td>

                      {/* Total Abonado */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-emerald-600">
                          ${(rec.amountPaid || 0).toLocaleString('es-MX')}
                        </span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 ml-auto mt-1 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400">{percentPaid}%</span>
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black text-sm ${rec.remainingBalance > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-950') : 'text-slate-400'}`}>
                          ${rec.remainingBalance.toLocaleString('es-MX')}
                        </span>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {rec.dueDate}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {rec.creditDays} días de crédito
                        </div>
                      </td>

                      {/* Estatus */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(rec)}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Ver Detalle / Historial */}
                          <button
                            onClick={() => handleOpenView(rec)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Ver Detalle y Pagos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Registrar Abono */}
                          {rec.remainingBalance > 0 && (
                            <button
                              onClick={() => handleOpenPayment(rec)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                              title="Registrar Abono / Pago"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Abonar</span>
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 transition-colors cursor-pointer"
                            title="Editar Registro"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Borrar */}
                          <button
                            onClick={() => handleDeleteReceivable(rec)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL 1: REGISTRAR NUEVO CRÉDITO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  Registrar Nueva Cuenta por Cobrar / Crédito
                </h3>
                <p className="text-xs text-slate-500">Crea una nueva partida de deuda para control de crédito de clientes.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewReceivable} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folio CXC *</label>
                  <input
                    type="text"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-purple-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Emisión *</label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente Deudor *</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Selecciona el cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Límite: ${c.creditLimit.toLocaleString()} | Deuda: ${c.currentDebt.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Concepto / Motivo de Deuda *</label>
                <input
                  type="text"
                  placeholder="Ej. Venta a crédito s/Factura 4A8B o Remisión 102"
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total del Crédito ($ MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formTotalAmount}
                    onChange={(e) => setFormTotalAmount(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Días de Crédito Plazo *</label>
                  <input
                    type="number"
                    min="1"
                    value={formCreditDays}
                    onChange={(e) => setFormCreditDays(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ref. Folio Venta (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. vta-1 o FAC-902"
                    value={formSaleId}
                    onChange={(e) => setFormSaleId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Condiciones de pago, promesas o acuerdos..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                >
                  Guardar Cuenta por Cobrar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO / PAGO */}
      {showPaymentModal && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-emerald-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Registrar Abono a Cuenta
                </h3>
                <p className="text-xs text-slate-500 font-mono">Folio: {selectedReceivable.folio} • {selectedReceivable.clientName}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4 text-xs">
              
              {/* Resumen de saldo */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Actual Restante</span>
                  <p className="text-lg font-black text-slate-900">
                    ${selectedReceivable.remainingBalance.toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedReceivable.remainingBalance)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                >
                  Liquidar Todo
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto del Abono ($ MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-emerald-700 text-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha del Pago *</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pago *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Transferencia SPEI">Transferencia SPEI</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta Débito/Crédito">Tarjeta Débito / Crédito</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Referencia / Folio Bancario</label>
                <input
                  type="text"
                  placeholder="Ej. SPEI BBVA #89012 o Recibo Caja #12"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas del Abono</label>
                <textarea
                  rows={2}
                  placeholder="Comentario sobre el pago..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  Confirmar Ingreso de Pago
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR CUENTA POR COBRAR */}
      {showEditModal && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-600" />
                  Editar Registro de Cuenta por Cobrar
                </h3>
                <p className="text-xs text-slate-500">Modifica los datos de la deuda, fechas o estatus.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditReceivable} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folio CXC *</label>
                  <input
                    type="text"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estatus</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="liquidado">Liquidado</option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente Deudor</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={formConcept}
                  onChange={(e) => setFormConcept(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formTotalAmount}
                    onChange={(e) => setFormTotalAmount(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Restante ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formRemainingBalance}
                    onChange={(e) => setFormRemainingBalance(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
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
                  Actualizar Registro
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: VER DETALLE COMPLETO Y HISTORIAL DE ABONOS */}
      {showViewModal && selectedReceivable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-[#032B4E] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-sky-300">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-300 tracking-wider">Estado de Cuenta de Cliente</span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {selectedReceivable.folio} • {selectedReceivable.clientName}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              
              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Crédito</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">
                    ${selectedReceivable.totalAmount.toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Abonado</span>
                  <p className="text-base font-black text-emerald-600 mt-0.5">
                    ${(selectedReceivable.amountPaid || 0).toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Restante</span>
                  <p className="text-base font-black text-rose-600 mt-0.5">
                    ${selectedReceivable.remainingBalance.toLocaleString('es-MX')} MXN
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Fecha Emisión</span>
                  <span className="font-semibold text-slate-800">{selectedReceivable.issueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Fecha Vencimiento</span>
                  <span className="font-semibold text-slate-800">{selectedReceivable.dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Plazo Autorizado</span>
                  <span className="font-semibold text-slate-800">{selectedReceivable.creditDays} días</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">Estatus</span>
                  <div className="mt-0.5">{getStatusBadge(selectedReceivable)}</div>
                </div>
              </div>

              {/* Concept & Notes */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Concepto: </span>
                  <span className="text-slate-600">{selectedReceivable.concept}</span>
                </div>
                {selectedReceivable.notes && (
                  <div>
                    <span className="font-bold text-slate-700">Notas: </span>
                    <span className="text-slate-600 italic">{selectedReceivable.notes}</span>
                  </div>
                )}
              </div>

              {/* Payments History Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Historial de Abonos Realizados
                  </h4>
                  {selectedReceivable.remainingBalance > 0 && (
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        handleOpenPayment(selectedReceivable);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Registrar Abono
                    </button>
                  )}
                </div>

                {(!selectedReceivable.payments || selectedReceivable.payments.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="font-semibold">No se han registrado abonos todavía para esta cuenta.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Usa el botón de registrar abono para ingresar pagos del cliente.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Monto Abonado</th>
                          <th className="py-2.5 px-3">Forma de Pago</th>
                          <th className="py-2.5 px-3">Referencia / Folio</th>
                          <th className="py-2.5 px-3">Recibido Por</th>
                          <th className="py-2.5 px-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReceivable.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-800">{p.date}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-600">
                              +${p.amount.toLocaleString('es-MX')} MXN
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{p.paymentMethod}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{p.reference || 'N/A'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{p.receivedBy}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleDeletePayment(p.id, p.amount)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                title="Eliminar este abono"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <button
                onClick={() => handleSendWhatsAppReminder(selectedReceivable)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Recordatorio WhatsApp
              </button>

              <button
                onClick={() => setShowViewModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
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
