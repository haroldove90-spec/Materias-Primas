import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Lock, Eye, EyeOff, Sparkles, 
  Search, Edit, Trash2, CheckCircle, XCircle, RefreshCw, 
  Mail, Phone, Briefcase, Building2, Download, FileText, 
  KeyRound, ShieldCheck, Check, X, AlertTriangle, MessageSquare, Copy, Share2, ExternalLink
} from 'lucide-react';
import { User, RoleType } from '../types';
import { MockDatabase } from '../data';
import { 
  fetchUsersFromSupabase, 
  saveUserToSupabase, 
  deleteUserFromSupabase 
} from '../services/supabaseService';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface EmployeesManagerProps {
  currentUser: User;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard & Estadísticas', group: 'General' },
  { id: 'finanzas', label: 'Finanzas y Crédito', group: 'Administración' },
  { id: 'configuracion', label: 'Configuración del Sistema', group: 'Administración' },
  { id: 'formulas', label: 'Fórmulas y Recetas', group: 'Producción' },
  { id: 'ordenes', label: 'Órdenes de Producción', group: 'Producción' },
  { id: 'inventario', label: 'Inventario y Almacén', group: 'Almacén' },
  { id: 'trazabilidad', label: 'Kárdex y Trazabilidad', group: 'Almacén' },
  { id: 'purchasing', label: 'Órdenes de Compra', group: 'Compras' },
  { id: 'suppliers', label: 'Catálogo de Proveedores', group: 'Compras' },
  { id: 'crm', label: 'Clientes y Cotizaciones', group: 'Ventas' },
  { id: 'caja', label: 'Punto de Venta / Caja', group: 'Ventas' },
  { id: 'notas', label: 'Notas de Venta Miauloo', group: 'Ventas' },
  { id: 'entregas', label: 'Rutas y Envíos Logísticos', group: 'Logística' },
];

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleType>('sales');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [active, setActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['dashboard']);

  const loadUsers = async () => {
    const local = MockDatabase.getUsers();
    setUsers(local);

    try {
      const res = await fetchUsersFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const map = new Map<string, User>();
        local.forEach(u => map.set(u.username.toLowerCase(), u));
        res.data.forEach(ru => map.set(ru.username.toLowerCase(), ru));
        const merged = Array.from(map.values());
        MockDatabase.saveUsers(merged);
        setUsers(merged);
      }
    } catch (e) {
      console.warn('Sync users error:', e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetchUsersFromSupabase();
      if (res.success && res.data) {
        MockDatabase.saveUsers(res.data);
        setUsers(res.data);
        setFeedback({ type: 'success', text: `¡${res.data.length} empleados sincronizados desde Supabase Cloud!` });
      } else {
        setFeedback({ type: 'error', text: res.error || 'No se pudieron descargar usuarios de la nube' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión con Supabase' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Generate strong PIN or password
  const generateSecurePin = (length: number = 6) => {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPin(res);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setRole('sales');
    generateSecurePin(4);
    setJobTitle('');
    setDepartment('');
    setActive(true);
    setSelectedPermissions(['dashboard', 'crm', 'caja']);
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setRole(u.role);
    setPin(u.pin);
    setJobTitle(u.jobTitle || '');
    setDepartment(u.department || '');
    setActive(u.active ?? true);
    setSelectedPermissions(u.permissions || []);
    setShowModal(true);
  };

  // Suggest default permissions on role change
  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    if (!editingUser) {
      switch (newRole) {
        case 'admin':
          setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
          break;
        case 'production':
          setSelectedPermissions(['dashboard', 'formulas', 'ordenes']);
          break;
        case 'warehouse':
          setSelectedPermissions(['dashboard', 'inventario', 'trazabilidad', 'purchasing', 'suppliers']);
          break;
        case 'sales':
          setSelectedPermissions(['dashboard', 'crm', 'caja', 'notas']);
          break;
        case 'delivery':
          setSelectedPermissions(['dashboard', 'entregas']);
          break;
      }
    }
  };

  const handleTogglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !pin.trim()) {
      alert('Nombre, usuario y clave/PIN son obligatorios');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    const newUser: User = {
      id: editingUser ? editingUser.id : `u-${Date.now()}`,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim() || `${cleanUsername}@miauloo.com`,
      phone: phone.trim(),
      role,
      pin: pin.trim(),
      active,
      permissions: selectedPermissions,
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      avatarUrl: editingUser?.avatarUrl || '',
      createdAt: editingUser?.createdAt || new Date().toISOString()
    };

    const currentList = MockDatabase.getUsers();
    let updatedList: User[] = [];
    if (editingUser) {
      updatedList = currentList.map(u => u.id === editingUser.id ? newUser : u);
    } else {
      // Check for duplicate username
      if (currentList.some(u => u.username.toLowerCase() === cleanUsername)) {
        alert(`El nombre de usuario "${cleanUsername}" ya existe. Elige otro.`);
        return;
      }
      updatedList = [...currentList, newUser];
    }

    MockDatabase.saveUsers(updatedList);
    setUsers(updatedList);

    MockDatabase.addAuditLog(
      currentUser.name,
      editingUser ? 'Actualizó empleado' : 'Registró nuevo empleado',
      'Personal',
      `Empleado: ${newUser.name} (${newUser.username}) - Rol: ${newUser.role}`
    );

    setShowModal(false);
    setFeedback({ type: 'success', text: `Empleado ${editingUser ? 'actualizado' : 'creado'} con éxito.` });

    // Sync to Supabase Cloud
    try {
      await saveUserToSupabase(newUser);
    } catch (err) {
      console.warn('Supabase save user error:', err);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUser.id) {
      alert('No puedes desactivar tu propia cuenta activa.');
      return;
    }
    const updated = { ...u, active: !u.active };
    const currentList = MockDatabase.getUsers();
    const list = currentList.map(item => item.id === u.id ? updated : item);
    MockDatabase.saveUsers(list);
    setUsers(list);

    try {
      await saveUserToSupabase(updated);
    } catch (e) {
      console.warn('Supabase toggle active user error:', e);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser.id || u.username === currentUser.username) {
      alert('No puedes eliminar tu propio usuario de administrador en sesión.');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar permanentemente al empleado "${u.name}" (@${u.username})?`)) return;

    const currentList = MockDatabase.getUsers();
    const updated = currentList.filter(item => item.id !== u.id);
    MockDatabase.saveUsers(updated);
    setUsers(updated);

    MockDatabase.addAuditLog(
      currentUser.name,
      'Eliminó empleado',
      'Personal',
      `Usuario: ${u.username}`
    );

    setFeedback({ type: 'success', text: `Empleado "${u.name}" eliminado.` });

    try {
      await deleteUserFromSupabase(u.id);
    } catch (e) {
      console.warn('Supabase delete user error:', e);
    }

    setTimeout(() => setFeedback(null), 3500);
  };

  const handleExportExcel = () => {
    const data = filteredUsers.map(u => ({
      'ID': u.id,
      'Nombre': u.name,
      'Usuario (Login)': u.username,
      'Rol': u.role.toUpperCase(),
      'Correo': u.email || 'N/A',
      'Teléfono': u.phone || 'N/A',
      'Puesto / Cargo': u.jobTitle || 'N/A',
      'Departamento': u.department || 'N/A',
      'Estado': u.active ? 'Activo' : 'Inactivo',
      'PIN / Clave': u.pin,
      'Permisos Asignados': (u.permissions || []).join(', ')
    }));
    exportToExcel(data, `Empleados_Credenciales_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const headers = ['Nombre', 'Usuario', 'Rol', 'Puesto / Depto', 'Teléfono', 'Estado'];
    const rows = filteredUsers.map(u => [
      u.name,
      `@${u.username}`,
      u.role.toUpperCase(),
      `${u.jobTitle || '-'} / ${u.department || '-'}`,
      u.phone || '-',
      u.active ? 'Activo' : 'Inactivo'
    ]);
    exportToPDF('Directorio de Empleados y Accesos - Miauloo ERP', headers, rows, `Empleados_Miauloo_${new Date().toISOString().slice(0, 10)}`);
  };

  // Filtering
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && u.active) || 
      (statusFilter === 'inactive' && !u.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (r: RoleType) => {
    switch (r) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 font-bold px-2.5 py-0.5 rounded-full text-xs">Administrador</span>;
      case 'production':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full text-xs">Producción</span>;
      case 'warehouse':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full text-xs">Almacén</span>;
      case 'sales':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-2.5 py-0.5 rounded-full text-xs">Ventas</span>;
      case 'delivery':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold px-2.5 py-0.5 rounded-full text-xs">Reparto</span>;
    }
  };

  const getRoleDisplayName = (r: RoleType) => {
    switch (r) {
      case 'admin': return 'Administrador (Control Total)';
      case 'production': return 'Producción y Control de Calidad';
      case 'warehouse': return 'Almacén, Inventarios y Compras';
      case 'sales': return 'Ventas, Clientes y Facturación';
      case 'delivery': return 'Reparto y Rutas de Entrega';
      default: return r;
    }
  };

  const handleShareCredentialsWhatsApp = (u: User) => {
    const currentOrigin = window.location.origin || 'https://ais-dev-pg74g2k2lbbjzkr3zjjamw-742180616653.us-east1.run.app';
    const roleLabel = getRoleDisplayName(u.role);
    
    const message = `👋 *¡Hola ${u.name}!*

Te compartimos tus credenciales de acceso para el sistema *ERP Miauloo*:

🌐 *Enlace del Sistema:*
${currentOrigin}

👤 *Nombre de Usuario:* \`${u.username}\`
🔑 *Contraseña / PIN:* \`${u.pin}\`
🎭 *Rol Asignado:* ${roleLabel}

*Instrucciones de Ingreso:*
1. Abre el enlace en tu celular o computadora.
2. Ingresa con tu usuario y contraseña/PIN.
3. Puedes personalizar tu foto y datos en el botón *"Mi Perfil"*.

¡Que tengas una excelente jornada laboral! 🚀`;

    const cleanPhone = (u.phone || '').replace(/\D/g, '');
    let url = '';
    if (cleanPhone.length >= 10) {
      const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    
    window.open(url, '_blank');
  };

  const handleCopyCredentials = (u: User) => {
    const currentOrigin = window.location.origin || 'https://ais-dev-pg74g2k2lbbjzkr3zjjamw-742180616653.us-east1.run.app';
    const text = `*ERP Miauloo - Credenciales de Acceso*
Sistema: ${currentOrigin}
Empleado: ${u.name}
Usuario: ${u.username}
Contraseña / PIN: ${u.pin}
Rol: ${getRoleDisplayName(u.role)}`;

    navigator.clipboard.writeText(text);
    setFeedback({ type: 'success', text: `¡Credenciales de @${u.username} copiadas al portapapeles!` });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-600/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Control de Empleados y Credenciales</h1>
              <p className="text-sm text-slate-500">Gestión de personal, asignación de roles, contraseñas seguras y permisos por módulo</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            title="Sincronizar usuarios con Supabase Cloud"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Supabase'}</span>
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
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear Empleado</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
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
              placeholder="Buscar por nombre, usuario (@login), correo, teléfono o puesto..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="all">Todos los Roles</option>
              <option value="admin">Administrador</option>
              <option value="production">Producción</option>
              <option value="warehouse">Almacén</option>
              <option value="sales">Ventas</option>
              <option value="delivery">Reparto</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <div 
            key={u.id}
            className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between hover:shadow-md ${
              u.active ? 'border-slate-200/90' : 'border-slate-200/60 opacity-75 bg-slate-50/50'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-sm flex items-center justify-center shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover rounded-full bg-white" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-purple-700 font-bold text-lg">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{u.name}</h3>
                    <p className="text-xs font-mono text-slate-500 font-medium">@{u.username}</p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  {getRoleBadge(u.role)}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Job and Department */}
              {(u.jobTitle || u.department) && (
                <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 mb-3 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{u.jobTitle || 'Empleado'}</span>
                  {u.department && <span className="text-slate-400">· {u.department}</span>}
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-3 border-t border-slate-100 pt-3">
                {u.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                )}
                {u.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{u.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-0.5 text-purple-700 font-mono text-[11px]">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>PIN de Acceso: <strong>•••• (Configurado)</strong></span>
                </div>
              </div>

              {/* Permissions Tags */}
              <div className="border-t border-slate-100 pt-2 mb-3">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Permisos activos:</span>
                <div className="flex flex-wrap gap-1">
                  {(u.permissions || []).slice(0, 4).map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {p}
                    </span>
                  ))}
                  {(u.permissions || []).length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">
                      +{u.permissions.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleActive(u)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    u.active ? 'text-slate-600 hover:bg-slate-100 border-slate-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                  }`}
                  title={u.active ? 'Desactivar usuario' : 'Activar usuario'}
                >
                  {u.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>{u.active ? 'Desactivar' : 'Activar'}</span>
                </button>

                <button
                  onClick={() => handleShareCredentialsWhatsApp(u)}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Compartir link del sistema, usuario y contraseña por WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCredentials(u)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  title="Copiar credenciales al portapapeles"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleOpenEdit(u)}
                  className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-slate-200 transition-colors"
                  title="Editar datos y credenciales"
                >
                  <Edit className="w-4 h-4" />
                </button>

                {u.id !== currentUser.id && (
                  <button
                    onClick={() => handleDelete(u)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                    title="Eliminar empleado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR / EDITAR EMPLEADO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingUser ? 'Editar Empleado y Credenciales' : 'Registrar Nuevo Empleado'}
                  </h2>
                  <p className="text-xs text-slate-500">Asigna nombre de usuario, contraseña segura y permisos de operación</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingUser && !username) {
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').slice(0, 12));
                      }
                    }}
                    placeholder="Ej. Roberto Morales García"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de Usuario (Login) *</label>
                  <input 
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="ej. r_morales"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empleado@miauloo.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono / WhatsApp</label>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 55-4433-2211"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rol en el Sistema *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as RoleType)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="admin">Administrador (Acceso Total)</option>
                    <option value="production">Producción (Fórmulas y Órdenes)</option>
                    <option value="warehouse">Almacén (Stock, Kárdex, Compras, Proveedores)</option>
                    <option value="sales">Ventas (Cotizaciones, POS, Cobranza, Notas)</option>
                    <option value="delivery">Reparto (Rutas, Evidencias, Cobros)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Puesto / Cargo</label>
                  <input 
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ej. Supervisor de Calidad"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Departamento</label>
                  <input 
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ej. Planta de Producción"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={active} 
                      onChange={(e) => setActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span className="ml-3 text-xs font-semibold text-slate-700">
                      {active ? 'Usuario Activo' : 'Usuario Bloqueado'}
                    </span>
                  </label>
                </div>

              </div>

              {/* Password & Security Card */}
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span>Contraseña / PIN de Acceso Seguro</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateSecurePin(6)}
                    className="text-xs text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Generar Clave Aleatoria
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input 
                    type={showPin ? 'text' : 'password'}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Contraseña o PIN seguro..."
                    className="w-full px-3.5 pr-10 py-2.5 bg-white border border-purple-300 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Esta clave será requerida en la pantalla de inicio de sesión o cambio de rol.
                </p>
              </div>

              {/* Granular Permissions Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
                  <span>Permisos Específicos por Módulo</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPermissions.length === AVAILABLE_PERMISSIONS.length) {
                        setSelectedPermissions([]);
                      } else {
                        setSelectedPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
                      }
                    }}
                    className="text-purple-600 hover:underline text-[11px] font-bold"
                  >
                    {selectedPermissions.length === AVAILABLE_PERMISSIONS.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label 
                      key={perm.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedPermissions.includes(perm.id) 
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!name || !username || !pin) {
                      alert('Completa al menos el nombre, usuario y clave para generar el mensaje de WhatsApp.');
                      return;
                    }
                    const tempUser: User = {
                      id: editingUser?.id || 'temp',
                      name,
                      username,
                      email,
                      phone,
                      role,
                      pin,
                      active,
                      jobTitle,
                      department,
                      permissions: selectedPermissions
                    };
                    handleShareCredentialsWhatsApp(tempUser);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Enviar credenciales generadas directamente al WhatsApp"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Compartir por WhatsApp</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingUser ? 'Guardar Cambios' : 'Crear Empleado'}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
