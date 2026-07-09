import React, { useState } from 'react';
import { 
  Shield, Beaker, Package, ShoppingCart, Truck, RefreshCw, Home, LogOut,
  BarChart3, DollarSign, Settings, Activity, Layers, Users, FileCheck, MapPin
} from 'lucide-react';
import { MockDatabase } from './data';
import { User, RoleType } from './types';

import AdminRole from './components/AdminRole';
import ProductionRole from './components/ProductionRole';
import WarehouseRole from './components/WarehouseRole';
import SalesRole from './components/SalesRole';
import DeliveryRole from './components/DeliveryRole';

export default function App() {
  // Authentication & Active States
  const [activeRole, setActiveRole] = useState<RoleType | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRoleTab, setActiveRoleTab] = useState<string>('analytics');

  // List of roles with their clean color configuration
  const rolesList = [
    { 
      type: 'admin' as RoleType, 
      title: 'Administrador', 
      shortLabel: 'Admin',
      icon: Shield, 
      colorClass: 'bg-amber-500 text-white shadow-amber-100 border-amber-300',
      activeColor: 'bg-amber-500 text-white border-amber-600',
      inactiveColor: 'text-amber-700 hover:bg-amber-50',
      bgLight: 'bg-amber-50/50',
      operatorName: 'Jonathan'
    },
    { 
      type: 'production' as RoleType, 
      title: 'Producción', 
      shortLabel: 'Prod',
      icon: Beaker, 
      colorClass: 'bg-cyan-500 text-white shadow-cyan-100 border-cyan-300',
      activeColor: 'bg-cyan-500 text-white border-cyan-600',
      inactiveColor: 'text-cyan-700 hover:bg-cyan-50',
      bgLight: 'bg-cyan-50/50',
      operatorName: 'Diana'
    },
    { 
      type: 'warehouse' as RoleType, 
      title: 'Almacén', 
      shortLabel: 'Almacén',
      icon: Package, 
      colorClass: 'bg-orange-500 text-white shadow-orange-100 border-orange-300',
      activeColor: 'bg-orange-500 text-white border-orange-600',
      inactiveColor: 'text-orange-700 hover:bg-orange-50',
      bgLight: 'bg-orange-50/50',
      operatorName: 'Carlos'
    },
    { 
      type: 'sales' as RoleType, 
      title: 'Ventas', 
      shortLabel: 'Ventas',
      icon: ShoppingCart, 
      colorClass: 'bg-purple-500 text-white shadow-purple-100 border-purple-300',
      activeColor: 'bg-purple-500 text-white border-purple-600',
      inactiveColor: 'text-purple-700 hover:bg-purple-50',
      bgLight: 'bg-purple-50/50',
      operatorName: 'Mariana'
    },
    { 
      type: 'delivery' as RoleType, 
      title: 'Entregas', 
      shortLabel: 'Rutas',
      icon: Truck, 
      colorClass: 'bg-blue-500 text-white shadow-blue-100 border-blue-300',
      activeColor: 'bg-blue-500 text-white border-blue-600',
      inactiveColor: 'text-blue-700 hover:bg-blue-50',
      bgLight: 'bg-blue-50/50',
      operatorName: 'Pedro'
    }
  ];

  // Map of tabs for each active role
  const tabsByRole: Record<RoleType, Array<{ id: string; label: string; shortLabel: string; icon: React.ComponentType<any> }>> = {
    admin: [
      { id: 'analytics', label: 'Dashboard', shortLabel: 'Dashboard', icon: BarChart3 },
      { id: 'finances', label: 'Finanzas y Crédito', shortLabel: 'Finanzas', icon: DollarSign },
      { id: 'config', label: 'Configuración', shortLabel: 'Ajustes', icon: Settings },
    ],
    production: [
      { id: 'orders', label: 'Órdenes de Prod.', shortLabel: 'Órdenes', icon: Activity },
      { id: 'formulas', label: 'Catálogo de Recetas', shortLabel: 'Recetas', icon: Layers },
    ],
    warehouse: [
      { id: 'inventory', label: 'Inventario Insumos', shortLabel: 'Stock', icon: Package },
      { id: 'traceability', label: 'Kárdex / Historial', shortLabel: 'Kárdex', icon: RefreshCw },
    ],
    sales: [
      { id: 'pos', label: 'Punto de Venta', shortLabel: 'Caja', icon: ShoppingCart },
      { id: 'crm', label: 'Clientes y Créditos', shortLabel: 'Clientes', icon: Users },
      { id: 'cobranza', label: 'Cobros y Remisiones', shortLabel: 'Cobros', icon: FileCheck },
    ],
    delivery: [
      { id: 'routes', label: 'Rutas de Entrega', shortLabel: 'Rutas', icon: MapPin },
    ],
  };

  // Handler for direct role navigation without credentials
  const handleRoleClick = (roleType: RoleType) => {
    const allUsers = MockDatabase.getUsers();
    const matchUser = allUsers.find(u => u.role === roleType);
    if (matchUser) {
      setCurrentUser(matchUser);
      setActiveRole(roleType);

      // Set default tab for selected role
      if (roleType === 'admin') setActiveRoleTab('analytics');
      else if (roleType === 'production') setActiveRoleTab('orders');
      else if (roleType === 'warehouse') setActiveRoleTab('inventory');
      else if (roleType === 'sales') setActiveRoleTab('pos');
      else if (roleType === 'delivery') setActiveRoleTab('routes');
      
      // Log event to Audits
      MockDatabase.addAuditLog(
        matchUser.name,
        'Accedió directamente',
        'Seguridad',
        `Navegación libre al rol: ${matchUser.role}`
      );
    }
  };

  const handleLogout = () => {
    setActiveRole(null);
    setCurrentUser(null);
  };

  const resetAllDatabaseDemo = () => {
    if (window.confirm("¿Seguro que deseas restablecer el inventario, ventas y rutas de entrega al estado demo original?")) {
      MockDatabase.reset();
      // Reload page to refresh state in components
      window.location.reload();
    }
  };

  // Switch role directly from sidebar or bottom navigation
  const handleDirectSwitch = (roleType: RoleType) => {
    handleRoleClick(roleType);
  };

  // Helper to render active role component
  const renderActiveDashboard = () => {
    if (!activeRole || !currentUser) return null;
    switch (activeRole) {
      case 'admin':
        return <AdminRole onBack={handleLogout} currentUser={currentUser} activeTab={activeRoleTab as any} setActiveTab={setActiveRoleTab as any} />;
      case 'production':
        return <ProductionRole onBack={handleLogout} currentUser={currentUser} activeTab={activeRoleTab as any} setActiveTab={setActiveRoleTab as any} />;
      case 'warehouse':
        return <WarehouseRole onBack={handleLogout} currentUser={currentUser} activeTab={activeRoleTab as any} setActiveTab={setActiveRoleTab as any} />;
      case 'sales':
        return <SalesRole onBack={handleLogout} currentUser={currentUser} activeTab={activeRoleTab as any} setActiveTab={setActiveRoleTab as any} />;
      case 'delivery':
        return <DeliveryRole onBack={handleLogout} currentUser={currentUser} />;
      default:
        return null;
    }
  };

  // HOME SCREEN (No descriptions, logo, title and the 5 role buttons)
  if (!activeRole) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between p-6 md:p-12 font-sans relative" id="homepage_root">
        {/* Background decorative touch */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-100 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none" />

        {/* Corporate Header */}
        <header className="max-w-4xl mx-auto w-full text-center py-10 shrink-0 relative z-10 flex flex-col items-center">
          {/* Elegant Minimal Logo */}
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl tracking-tighter shadow-lg mb-6 border border-slate-800">
            MP
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-display">
            Materias primas
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-3 tracking-wide">
            Panel de Control de Negocio
          </p>
        </header>

        {/* 5 Roles Selection - Strict Visuals (No descriptions, just icon and title) */}
        <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center items-center relative z-10 my-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full justify-center">
            {rolesList.map((role) => {
              const IconComponent = role.icon;
              return (
                <button
                  key={role.type}
                  onClick={() => handleRoleClick(role.type)}
                  className={`p-6 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:-translate-y-1 transition-all duration-350 cursor-pointer flex flex-col items-center justify-center text-center space-y-4 shadow-sm hover:shadow-md group`}
                  id={`btn_role_select_${role.type}`}
                >
                  {/* Icon Wrapper */}
                  <div className={`p-4 rounded-xl shadow-sm transition-transform group-hover:scale-110 ${role.colorClass}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Role Title ONLY - Strict compliance */}
                  <h3 className="text-xs font-bold tracking-tight text-slate-700 group-hover:text-slate-900 transition-colors uppercase">
                    {role.title}
                  </h3>
                </button>
              );
            })}
          </div>
        </main>

        {/* Footer controls */}
        <footer className="max-w-5xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 relative z-10">
          <p>© 2026 Materias primas. Todos los derechos reservados.</p>
          <button 
            onClick={resetAllDatabaseDemo}
            className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs hover:shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restablecer Base de Datos Demo
          </button>
        </footer>
      </div>
    );
  }

  // ACTIVE ROLE LAYOUT: Left sidebar on Desktop, Bottom bar on Mobile/Tablet
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row font-sans" id="app_main_layout">
      
      {/* 1. MOBILE/TABLET HEADER (lg:hidden) */}
      <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-extrabold text-sm">
            MP
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-900 uppercase font-display">
            Materias primas
          </span>
        </div>
        
        {/* Quick Back to Home */}
        <button 
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
          title="Ir al Inicio"
        >
          <Home className="w-5 h-5" />
        </button>
      </header>

      {/* 2. FULLSCREEN LEFT SIDEBAR (lg:flex) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 justify-between">
        
        {/* Top brand & navigation list */}
        <div className="flex flex-col">
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              MP
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm tracking-tight font-display uppercase leading-tight">
                Materias primas
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Control Integrado</p>
            </div>
          </div>

          {/* Sub-modules for the Active Role */}
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
              Módulos {activeRole ? `- ${rolesList.find(r => r.type === activeRole)?.title}` : ''}
            </span>

            {(activeRole ? tabsByRole[activeRole] : []).map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeRoleTab === tab.id;
              const activeRoleColor = rolesList.find(r => r.type === activeRole);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveRoleTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  id={`tab_nav_sidebar_${tab.id}`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-slate-800 text-white' : (activeRoleColor?.bgLight || 'bg-slate-50') + ' ' + (activeRoleColor?.inactiveColor.split(' ')[0] || 'text-slate-500')
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom profile & home button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Usuario</span>
              <span className="text-xs font-bold text-slate-800">{currentUser?.name}</span>
            </div>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase">
              {activeRole}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </button>
        </div>

      </aside>

      {/* 3. MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 overflow-auto bg-[#F8FAFC] pb-20 lg:pb-0 min-h-0">
        {renderActiveDashboard()}
      </main>

      {/* 4. MOBILE/TABLET BOTTOM NAVIGATION BAR (lg:hidden) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-lg shrink-0">
        {(activeRole ? tabsByRole[activeRole] : []).map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeRoleTab === tab.id;
          const activeRoleColor = rolesList.find(r => r.type === activeRole);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveRoleTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive ? 'text-slate-900 font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
              id={`tab_nav_bottom_${tab.id}`}
            >
              <div className={`p-1.5 rounded-lg ${
                isActive ? (activeRoleColor?.colorClass || 'bg-slate-900 text-white') : 'bg-transparent'
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider mt-1">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
