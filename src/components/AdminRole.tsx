import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, DollarSign, AlertTriangle, Shield, Settings, 
  Plus, Trash2, Calendar, FileText, CheckCircle, RefreshCw, Layers, Download, Printer, Database 
} from 'lucide-react';
import { MockDatabase } from '../data';
import { RawMaterial, Client, Sale, AuditLog, User, SystemConfig, RoleType } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { SupabaseModal } from './SupabaseModal';
import { SUPABASE_PROJECT_INFO, SUPABASE_URL, supabase } from '../lib/supabase';
import { updateUserRoleInSupabase, fetchUsersFromSupabase } from '../services/supabaseService';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';
import { EmployeesManager } from './EmployeesManager';
import { SuppliersManager } from './SuppliersManager';
import { ClientsManager } from './ClientsManager';
import { AdminRawMaterialsManager } from './AdminRawMaterialsManager';

export type AdminTabType = 'analytics' | 'finances' | 'clients' | 'suppliers' | 'raw_materials' | 'employees' | 'config';

interface AdminRoleProps {
  onBack: () => void;
  currentUser: User;
  activeTab?: AdminTabType;
  setActiveTab?: (tab: AdminTabType) => void;
  onNavigateToRole?: (role: RoleType) => void;
}

export default function AdminRole({ onBack, currentUser, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: AdminRoleProps) {
  // Database States
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  // UI States
  const [internalActiveTab, setInternalActiveTab] = useState<AdminTabType>('analytics');
  const activeTab = (propsActiveTab as AdminTabType) || internalActiveTab;
  const setActiveTab = (propsSetActiveTab as (tab: AdminTabType) => void) || setInternalActiveTab;
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  
  // Create Employee Form State
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'admin' | 'production' | 'warehouse' | 'sales' | 'delivery'>('sales');

  // Client Credit Configuration Form State
  const [selectedClientForCredit, setSelectedClientForCredit] = useState<string>('');
  const [creditDays, setCreditDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(50000);

  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [userSyncMsg, setUserSyncMsg] = useState<string | null>(null);

  // Load database on mount and whenever updates happen
  const loadDatabase = async () => {
    setMaterials(MockDatabase.getRawMaterials());
    setClients(MockDatabase.getClients());
    setSales(MockDatabase.getSales());
    setAuditLogs(MockDatabase.getAuditLogs());
    setUsers(MockDatabase.getUsers());
    setConfig(MockDatabase.getSystemConfig());

    // Pull users from Supabase Cloud
    try {
      const res = await fetchUsersFromSupabase();
      if (res.success && res.data && res.data.length > 0) {
        const local = MockDatabase.getUsers();
        const map = new Map<string, User>();
        local.forEach(u => map.set(u.username.toLowerCase(), u));
        res.data.forEach((ru: any) => {
          const key = ru.username?.toLowerCase() || ru.name?.toLowerCase();
          if (key) {
            const existing = map.get(key);
            map.set(key, {
              id: ru.id || existing?.id || `u-${Date.now()}`,
              name: ru.name || existing?.name || 'Usuario',
              username: ru.username || existing?.username || key,
              email: ru.email || existing?.email || `${key}@miauloo.com`,
              role: ru.role || existing?.role || 'sales',
              pin: String(ru.pin || existing?.pin || '1234'),
              active: ru.active !== undefined ? Boolean(ru.active) : true,
              permissions: ru.permissions || existing?.permissions || ['dashboard']
            });
          }
        });
        const merged = Array.from(map.values());
        MockDatabase.saveUsers(merged);
        setUsers(merged);
      }
    } catch (e) {
      console.warn('Sync users error in AdminRole:', e);
    }
  };

  const handleManualSyncUsers = async () => {
    setIsSyncingUsers(true);
    setUserSyncMsg(null);
    try {
      const res = await fetchUsersFromSupabase();
      if (res.success && res.data) {
        const local = MockDatabase.getUsers();
        const map = new Map<string, User>();
        local.forEach(u => map.set(u.username.toLowerCase(), u));
        res.data.forEach((ru: any) => {
          const key = ru.username?.toLowerCase() || ru.name?.toLowerCase();
          if (key) {
            const existing = map.get(key);
            map.set(key, {
              id: ru.id || existing?.id || `u-${Date.now()}`,
              name: ru.name || existing?.name || 'Usuario',
              username: ru.username || existing?.username || key,
              email: ru.email || existing?.email || `${key}@miauloo.com`,
              role: ru.role || existing?.role || 'sales',
              pin: String(ru.pin || existing?.pin || '1234'),
              active: ru.active !== undefined ? Boolean(ru.active) : true,
              permissions: ru.permissions || existing?.permissions || ['dashboard']
            });
          }
        });
        const merged = Array.from(map.values());
        MockDatabase.saveUsers(merged);
        setUsers(merged);
        setUserSyncMsg(`¡${res.data.length} usuarios sincronizados desde Supabase Cloud!`);
      } else {
        setUserSyncMsg(res.error || 'No se pudieron descargar los usuarios de Supabase.');
      }
    } catch (err: any) {
      setUserSyncMsg('Error de conexión con Supabase.');
    } finally {
      setIsSyncingUsers(false);
      setTimeout(() => setUserSyncMsg(null), 4000);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Alertas críticas
  const zeroStockMaterials = materials.filter(m => m.stock <= 0);
  const lowStockMaterials = materials.filter(m => m.stock > 0 && m.stock <= m.minStock);
  const overdueClients = clients.filter(c => c.currentDebt > c.creditLimit * 0.9 && c.creditLimit > 0);

  // Cálculos de Ventas Totales y Métricas
  const totalSalesAmount = sales
    .filter(s => s.status !== 'Cotización' && s.status !== 'Cancelado')
    .reduce((acc, curr) => acc + curr.total, 0);

  // Reporte de pérdidas y ganancias aproximado
  // Supongamos un costo promedio del 40% de la venta para materias primas + costos operativos
  const estimacionCostosMP = sales
    .filter(s => s.status !== 'Cotización' && s.status !== 'Cancelado')
    .reduce((acc, s) => {
      // Calculamos el costo aproximado basado en los ingredientes
      return acc + (s.total * 0.35); // 35% de costo de materia prima
    }, 0);
  
  const estimacionCostosOperacion = 8500; // Costo fijo simulado (sueldos, luz, renta)
  const utilidadNeta = totalSalesAmount - estimacionCostosMP - estimacionCostosOperacion;

  // Top 5 Productos más vendidos y rentabilidad (simulado en base a ventas actuales)
  const productPerformance = [
    { name: 'Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg)', salesQty: 185, profitMargin: '48%', totalRevenue: 7770 },
    { name: 'Polvo Preparado para Gelatina de Fresa (Bolsa 1kg)', salesQty: 125, profitMargin: '51%', totalRevenue: 6875 },
    { name: 'Domo de Plástico para Pastel Grande', salesQty: 95, profitMargin: '45%', totalRevenue: 2280 },
    { name: 'Esencia de Vainilla Concentrada L', salesQty: 42, profitMargin: '60%', totalRevenue: 3990 },
    { name: 'Harina de Trigo Extra Fina kg', salesQty: 38, profitMargin: '30%', totalRevenue: 684 },
  ];

  // Handler para agregar empleado
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpUsername || !newEmpPin) return;

    const newEmployee: User = {
      id: `u-${Date.now()}`,
      name: newEmpName,
      username: newEmpUsername,
      email: newEmpEmail.trim() || `${newEmpUsername}@miauloo.com`,
      role: newEmpRole,
      pin: newEmpPin,
      active: true,
      permissions: newEmpRole === 'admin' ? ['dashboard', 'finanzas', 'configuracion'] : [newEmpRole]
    };

    const updatedUsers = [...users, newEmployee];
    MockDatabase.saveUsers(updatedUsers);

    // Sync to Supabase with multi-tier fallback
    try {
      const { error: fullErr } = await supabase.from('users').upsert({
        id: newEmployee.id,
        name: newEmployee.name,
        username: newEmployee.username,
        email: newEmployee.email,
        role: newEmployee.role,
        pin: newEmployee.pin,
        active: newEmployee.active,
        permissions: newEmployee.permissions
      });

      if (fullErr) {
        // Fallback to core columns
        await supabase.from('users').upsert({
          id: newEmployee.id,
          name: newEmployee.name,
          username: newEmployee.username,
          role: newEmployee.role,
          pin: newEmployee.pin
        });
      }
    } catch (sbErr) {
      console.log('Error syncing new employee to Supabase:', sbErr);
    }

    MockDatabase.addAuditLog(
      currentUser.name,
      `Creó empleado: ${newEmpName}`,
      'Configuración',
      `Asignado rol: ${newEmpRole}, Usuario: ${newEmpUsername}, Email: ${newEmployee.email}`
    );
    
    // Reset form
    setNewEmpName('');
    setNewEmpUsername('');
    setNewEmpEmail('');
    setNewEmpPin('');
    loadDatabase();
  };

  // Handler para dar de baja empleado
  const handleRemoveEmployee = async (id: string, name: string) => {
    if (id === currentUser.id) {
      alert("No puedes darte de baja a ti mismo.");
      return;
    }
    const updatedUsers = users.filter(u => u.id !== id);
    MockDatabase.saveUsers(updatedUsers);

    try {
      await supabase.from('users').delete().eq('id', id);
    } catch (sbErr) {
      console.log('Error deleting employee from Supabase:', sbErr);
    }

    MockDatabase.addAuditLog(
      currentUser.name,
      `Dio de baja al empleado: ${name}`,
      'Configuración',
      `ID de empleado eliminado: ${id}`
    );
    loadDatabase();
  };

  // Handler para cambiar rol de usuario directamente (sincronizando con Supabase)
  const handleRoleChangeForUser = async (userId: string, newRole: RoleType, userName: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });

    // Save locally
    MockDatabase.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    MockDatabase.addAuditLog(
      currentUser.name,
      `Cambio de Rol: ${userName}`,
      'Seguridad & Roles',
      `Se reasignó el rol a "${newRole.toUpperCase()}" para el usuario ${userName}`
    );

    // Sync directly with Supabase Cloud users table
    try {
      const res = await updateUserRoleInSupabase(userId, newRole);
      if (res.success) {
        recordSaveTelemetry({
          table: 'users',
          folio: `ROL-${newRole.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          action: `Actualización de Rol Supabase (${userName})`,
          countBefore: users.length,
          countAfter: users.length,
          status: 'success',
          payloadSummary: `Rol cambiado a ${newRole} en Supabase Cloud`,
          source: 'cloud_sync'
        });
      }
    } catch (e) {
      console.log('Error updating role in Supabase:', e);
    }
  };

  // Actualizar días de crédito y límite por cliente
  const handleUpdateClientCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForCredit) return;

    const updatedClients = clients.map(c => {
      if (c.id === selectedClientForCredit) {
        return {
          ...c,
          creditDays,
          creditLimit
        };
      }
      return c;
    });

    MockDatabase.saveClients(updatedClients);
    const clientName = clients.find(c => c.id === selectedClientForCredit)?.name || '';
    MockDatabase.addAuditLog(
      currentUser.name,
      `Actualizó crédito de ${clientName}`,
      'Finanzas',
      `Límite: $${creditLimit} MXN, Días: ${creditDays}`
    );
    setSelectedClientForCredit('');
    loadDatabase();
  };

  // Datos para los gráficos SVG
  const chartData = {
    daily: [
      { label: 'Lun', sales: 18000, cost: 6300 },
      { label: 'Mar', sales: 22000, cost: 7700 },
      { label: 'Mié', sales: 15000, cost: 5250 },
      { label: 'Jue', sales: 29000, cost: 10150 },
      { label: 'Vie', sales: 34000, cost: 11900 },
      { label: 'Sáb', sales: 12000, cost: 4200 },
      { label: 'Dom', sales: 5000, cost: 1750 },
    ],
    monthly: [
      { label: 'Ene', sales: 120000, cost: 42000 },
      { label: 'Feb', sales: 145000, cost: 50750 },
      { label: 'Mar', sales: 130000, cost: 45500 },
      { label: 'Abr', sales: 190000, cost: 66500 },
      { label: 'May', sales: 210000, cost: 73500 },
      { label: 'Jun', sales: 245000, cost: 85750 },
    ],
    yearly: [
      { label: '2023', sales: 1800000, cost: 630000 },
      { label: '2024', sales: 2250000, cost: 787500 },
      { label: '2025', sales: 2890000, cost: 1011500 },
      { label: '2026 (Est)', sales: 3400000, cost: 1190000 },
    ]
  };

  const currentChartData = chartData[chartPeriod];
  const maxVal = Math.max(...currentChartData.map(d => d.sales)) * 1.15;

  const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="admin_root">
      {/* Top Navigation - Pantone #032B4E with unencapsulated logo, title & subtitle (Visible only on Desktop lg:) */}
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
              Gerencia y Administración
            </h1>
            <p className="text-xs text-sky-200/80">
              Sesión iniciada como: <span className="text-amber-400 font-semibold">{currentUser?.name || 'Administrador'} (Gerente)</span>
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-xs border border-white/20 cursor-pointer"
          id="btn_admin_logout"
        >
          Cerrar Sesión Gerente
        </button>
      </header>

      {/* Alerts Banner */}
      {(zeroStockMaterials.length > 0 || overdueClients.length > 0) && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm text-amber-900">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold">Alertas Críticas:</span>{' '}
              {zeroStockMaterials.length > 0 && `${zeroStockMaterials.length} insumos en stock Cero.`}{' '}
              {overdueClients.length > 0 && `${overdueClients.length} clientes excediendo el 90% de su límite de crédito.`}
            </div>
          </div>
          <div className="flex gap-2">
            {zeroStockMaterials.map(m => (
              <span key={m.id} className="bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded font-medium">
                {m.name}: 0 {m.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content Container */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* KPI metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ventas Totales</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">${totalSalesAmount.toLocaleString('es-MX')} MXN</h3>
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> +14.2% este mes
                  </span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Utilidad Neta Est.</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">${utilidadNeta.toLocaleString('es-MX')} MXN</h3>
                  <span className="text-xs text-slate-500">Menos gastos fijos de $8,500</span>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Crítico</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{zeroStockMaterials.length + lowStockMaterials.length} Insumos</h3>
                  <span className="text-xs text-amber-600 font-medium">{zeroStockMaterials.length} agotados, {lowStockMaterials.length} por agotarse</span>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Cartera de Clientes</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{clients.length} Registros</h3>
                  <span className="text-xs text-blue-600">3 con línea de crédito</span>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Interactive Custom SVG Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Ventas en Tiempo Real</h3>
                  <p className="text-xs text-slate-500">Análisis comparativo de ingresos contra costos estimados de fabricación</p>
                </div>
                <div className="bg-slate-100 p-1 rounded-lg flex space-x-1">
                  {(['daily', 'monthly', 'yearly'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all uppercase ${
                        chartPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {p === 'daily' ? 'Diario' : p === 'monthly' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Stage */}
              <div className="h-64 w-full relative flex items-end">
                {/* Y-Axis guide lines */}
                <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none opacity-50">
                  <div className="border-b border-dashed border-slate-100 w-full text-[10px] text-slate-400 pt-1">
                    ${(maxVal).toLocaleString('es-MX')}
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full text-[10px] text-slate-400 pt-1">
                    ${(maxVal * 0.66).toLocaleString('es-MX')}
                  </div>
                  <div className="border-b border-dashed border-slate-100 w-full text-[10px] text-slate-400 pt-1">
                    ${(maxVal * 0.33).toLocaleString('es-MX')}
                  </div>
                  <div className="w-full text-[10px] text-slate-400">
                    $0
                  </div>
                </div>

                {/* SVG Render */}
                <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
                  <line x1="0" y1="33" x2="100" y2="33" stroke="#f1f5f9" strokeWidth="0.5" />
                  <line x1="0" y1="66" x2="100" y2="66" stroke="#f1f5f9" strokeWidth="0.5" />

                  {/* Draw Sales Area & Line */}
                  <path
                    d={`M 0,100 ${currentChartData.map((d, i) => {
                      const x = (i / (currentChartData.length - 1)) * 100;
                      const y = 100 - (d.sales / maxVal) * 100;
                      return `L ${x},${y}`;
                    }).join(' ')} L 100,100 Z`}
                    fill="url(#salesGrad)"
                    opacity="0.15"
                  />
                  <path
                    d={currentChartData.map((d, i) => {
                      const x = (i / (currentChartData.length - 1)) * 100;
                      const y = 100 - (d.sales / maxVal) * 100;
                      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                  />

                  {/* Draw Cost Line */}
                  <path
                    d={currentChartData.map((d, i) => {
                      const x = (i / (currentChartData.length - 1)) * 100;
                      const y = 100 - (d.cost / maxVal) * 100;
                      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Legend Hover Nodes */}
                <div className="absolute inset-x-0 bottom-6 flex justify-between px-2 z-20 pointer-events-none">
                  {currentChartData.map((d, i) => {
                    const pctSales = (d.sales / maxVal) * 100;
                    return (
                      <div key={i} className="flex flex-col items-center group pointer-events-auto cursor-pointer" style={{ width: `${100 / currentChartData.length}%` }}>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg -mt-16 text-center z-50">
                          <p className="font-semibold text-amber-400">Ventas: ${d.sales.toLocaleString('es-MX')}</p>
                          <p className="text-slate-300">Costo MP: ${d.cost.toLocaleString('es-MX')}</p>
                        </div>
                        {/* Dot indicator */}
                        <div 
                          className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white shadow-sm transition-transform group-hover:scale-150"
                          style={{ marginBottom: `${pctSales * 1.5}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart X-axis Labels */}
              <div className="flex justify-between mt-3 px-1 text-xs text-slate-500 font-medium">
                {currentChartData.map((d, i) => (
                  <span key={i} className="text-center w-full">{d.label}</span>
                ))}
              </div>

              {/* Legend Indicator */}
              <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-slate-100 justify-center text-xs text-slate-600">
                <div className="flex items-center">
                  <span className="w-3 h-0.5 bg-slate-900 mr-1.5" />
                  <span>Ventas Brutas</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-0.5 border-t border-dashed border-amber-500 mr-1.5" />
                  <span>Costo Estimado Producción (35%)</span>
                </div>
              </div>
            </div>

            {/* Top Products & Alarms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Top 5 Products */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">Top 5 Productos de Limpieza</h3>
                  <p className="text-xs text-slate-500">Artículos con mayor volumen de comercialización y rentabilidad bruta</p>
                </div>
                <div className="divide-y divide-slate-100 flex-1">
                  {productPerformance.map((p, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="bg-slate-100 text-slate-700 font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-500">Márgen bruto estimado: <span className="text-emerald-600 font-semibold">{p.profitMargin}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">${p.totalRevenue.toLocaleString('es-MX')} MXN</p>
                        <p className="text-xs text-slate-500">{p.salesQty} bolsas / pzs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Alert list */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Alertas de Operación y Cobranza</h3>
                    <p className="text-xs text-slate-500">Monitoreo automático de riesgos y desabastos</p>
                  </div>
                  <RefreshCw className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={loadDatabase} />
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                  
                  {/* Stock en Cero */}
                  {zeroStockMaterials.length === 0 && lowStockMaterials.length === 0 && overdueClients.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400">
                      <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-slate-700">¡Todo en orden!</p>
                      <p className="text-xs text-slate-500 text-center">No hay alertas de desabasto ni atrasos críticos.</p>
                    </div>
                  )}

                  {zeroStockMaterials.map(m => (
                    <div key={m.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-900">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold">{m.name} AGOTADO</h4>
                        <p className="text-xs text-red-700 mt-0.5">El stock actual es 0 {m.unit}. Esto frena la producción de recetas asociadas.</p>
                      </div>
                    </div>
                  ))}

                  {/* Stock Bajo */}
                  {lowStockMaterials.map(m => (
                    <div key={m.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold">Reorden: {m.name}</h4>
                        <p className="text-xs text-amber-700 mt-0.5">Stock en {m.stock} {m.unit} (Mínimo requerido: {m.minStock} {m.unit}). Solicitar compra.</p>
                      </div>
                    </div>
                  ))}

                  {/* Cuentas por Cobrar Casi Excedidas */}
                  {overdueClients.map(c => (
                    <div key={c.id} className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-3 text-rose-950">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold">Límite de Crédito Crítico</h4>
                        <p className="text-xs text-rose-800 mt-0.5">{c.name} tiene una deuda de ${c.currentDebt.toLocaleString('es-MX')} MXN de un límite autorizado de ${c.creditLimit.toLocaleString('es-MX')} MXN.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: FINANCES & AUDITING */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Reporte de Pérdidas y Ganancias */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-slate-500" /> Pérdidas y Ganancias (Simulación Real-Time)
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600 text-sm">Ingresos por Ventas:</span>
                    <span className="font-semibold text-slate-900 text-sm">${totalSalesAmount.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600 text-sm">Costos Materias Primas (Promedio 35%):</span>
                    <span className="font-semibold text-red-600 text-sm">-${estimacionCostosMP.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600 text-sm">Costo Operativo Fijo (Sueldos/Servicios):</span>
                    <span className="font-semibold text-red-600 text-sm">-${estimacionCostosOperacion.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-double border-slate-200">
                    <span className="text-slate-900 font-bold text-base">Utilidad Operativa Bruta:</span>
                    <span className={`font-extrabold text-base ${utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${utilidadNeta.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-500 mt-6">
                  <p className="font-semibold text-slate-700">Nota:</p>
                  <p className="mt-0.5">Costos de insumos descontados en Producción.</p>
                </div>
              </div>

              {/* Ajustar Créditos y Precios de Clientes */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-slate-500" /> Configuración de Créditos y Listas de Precios por Cliente
                </h3>

                <form onSubmit={handleUpdateClientCredit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Seleccionar Cliente</label>
                      <select
                        value={selectedClientForCredit}
                        onChange={(e) => {
                          const cliId = e.target.value;
                          setSelectedClientForCredit(cliId);
                          const chosen = clients.find(c => c.id === cliId);
                          if (chosen) {
                            setCreditDays(chosen.creditDays);
                            setCreditLimit(chosen.creditLimit);
                          }
                        }}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">-- Elige un cliente --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.priceList})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Días de Crédito Autorizados</label>
                      <input
                        type="number"
                        value={creditDays}
                        onChange={(e) => setCreditDays(Number(e.target.value))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                        min="0"
                        max="90"
                        disabled={!selectedClientForCredit}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Límite de Crédito ($ MXN)</label>
                      <input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(Number(e.target.value))}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                        min="0"
                        disabled={!selectedClientForCredit}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all disabled:opacity-50"
                      disabled={!selectedClientForCredit}
                    >
                      Actualizar Permisos de Crédito
                    </button>
                  </div>
                </form>

                {/* Clients Table with limits and status */}
                <div className="mt-6 border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Tarifa Asignada</th>
                        <th className="p-3">Límite Autorizado</th>
                        <th className="p-3">Días Permitidos</th>
                        <th className="p-3">Deuda Activa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clients.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.priceList === 'Distribuidor' ? 'bg-purple-100 text-purple-800' :
                              c.priceList === 'Mayoreo' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {c.priceList}
                            </span>
                          </td>
                          <td className="p-3">${c.creditLimit.toLocaleString('es-MX')}</td>
                          <td className="p-3">{c.creditDays} días</td>
                          <td className={`p-3 font-semibold ${c.currentDebt > c.creditLimit * 0.9 && c.creditLimit > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            ${c.currentDebt.toLocaleString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Historial de Auditoría Completo */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Historial de Auditoría de Seguridad</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Registro inmutable de modificaciones clave en fórmulas, ajustes de inventario o emisión de créditos.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportToExcel(auditLogs.map(log => ({ Fecha: new Date(log.timestamp).toLocaleString('es-MX'), Usuario: log.user, Módulo: log.module, Acción: log.action, Detalles: log.details })), 'Auditoria_Seguridad_Miauloo')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button
                    onClick={() => exportToPDF('Bitácora de Auditoría de Seguridad ERP Miauloo', ['Fecha', 'Usuario', 'Módulo', 'Acción', 'Detalles'], auditLogs.map(log => [new Date(log.timestamp).toLocaleString('es-MX'), log.user, log.module, log.action, log.details]))}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>
              
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Módulo</th>
                      <th className="p-3">Acción Realizada</th>
                      <th className="p-3">Detalle Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString('es-MX')}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{log.user}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px]">
                            {log.module}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{log.action}</td>
                        <td className="p-3 text-slate-600 italic">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SYSTEM CONFIG & EMPLOYEES */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form de Agregar Empleado */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-slate-500" /> Alta de Nuevo Empleado
                </h3>

                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Usuario de Acceso</label>
                    <input
                      type="text"
                      placeholder="Ej. jperez_lab"
                      value={newEmpUsername}
                      onChange={(e) => setNewEmpUsername(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="Ej. jperez@miauloo.com"
                      value={newEmpEmail}
                      onChange={(e) => setNewEmpEmail(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">PIN / Password</label>
                      <input
                        type="text"
                        placeholder="Ej. 1234"
                        value={newEmpPin}
                        onChange={(e) => setNewEmpPin(e.target.value)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                        maxLength={6}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Rol Operativo</label>
                      <select
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value as any)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="admin">Administrador</option>
                        <option value="production">Producción</option>
                        <option value="warehouse">Almacén</option>
                        <option value="sales">Ventas</option>
                        <option value="delivery">Repartidor</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Registrar Empleado
                  </button>
                </form>
              </div>

              {/* Lista de Empleados */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-slate-500" /> Catálogo y Permisos de Personal Activo
                  </h3>
                  <div className="flex items-center gap-2">
                    {userSyncMsg && (
                      <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        {userSyncMsg}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleManualSyncUsers}
                      disabled={isSyncingUsers}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center border border-slate-300 disabled:opacity-50"
                      title="Sincronizar usuarios desde Supabase Cloud"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-600 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                      {isSyncingUsers ? 'Sincronizando...' : 'Recargar de Supabase'}
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">PIN</th>
                        <th className="p-3">Permisos</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            {u.email && <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>}
                          </td>
                          <td className="p-3 font-mono text-slate-600">@{u.username}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChangeForUser(u.id, e.target.value as RoleType, u.name)}
                                className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                  u.role === 'admin' ? 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500' :
                                  u.role === 'production' ? 'bg-cyan-50 text-cyan-900 border-cyan-300 focus:ring-cyan-500' :
                                  u.role === 'warehouse' ? 'bg-orange-50 text-orange-900 border-orange-300 focus:ring-orange-500' :
                                  u.role === 'sales' ? 'bg-purple-50 text-purple-900 border-purple-300 focus:ring-purple-500' : 'bg-blue-50 text-blue-900 border-blue-300 focus:ring-blue-500'
                                }`}
                                title="Cambiar rol de usuario (sincroniza en Supabase)"
                              >
                                <option value="admin">ADMINISTRADOR</option>
                                <option value="production">PRODUCCIÓN</option>
                                <option value="warehouse">ALMACÉN</option>
                                <option value="sales">VENTAS</option>
                                <option value="delivery">REPARTO</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-3 font-mono">{u.pin}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {u.permissions.map((p, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px]">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRemoveEmployee(u.id, u.name)}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1.5 rounded transition-all cursor-pointer"
                              title="Baja de empleado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Supabase Cloud Database Integration Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-extrabold text-base text-white">Base de Datos Supabase (PostgreSQL)</h4>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                          Configurado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Proyecto: {SUPABASE_PROJECT_INFO.projectName} ({SUPABASE_PROJECT_INFO.projectId})
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Integración completa con Supabase REST API y PostgreSQL. Genera el script SQL de las 13 tablas con RLS y siembra todos los datos de prueba directamente.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setShowSupabaseModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <Database className="w-4 h-4" /> Ver Script SQL & Sincronizar
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: CLIENTES */}
        {activeTab === 'clients' && (
          <ClientsManager currentUser={currentUser} />
        )}

        {/* TAB: MATERIAS PRIMAS */}
        {activeTab === 'raw_materials' && (
          <AdminRawMaterialsManager currentUser={currentUser} />
        )}

        {/* TAB 4: EMPLEADOS Y ACCESOS */}
        {activeTab === 'employees' && (
          <EmployeesManager currentUser={currentUser} />
        )}

        {/* TAB 5: PROVEEDORES */}
        {activeTab === 'suppliers' && (
          <SuppliersManager currentUser={currentUser} />
        )}

      </main>

      {/* Supabase Management Modal */}
      <SupabaseModal isOpen={showSupabaseModal} onClose={() => setShowSupabaseModal(false)} />
    </div>
  );
}
