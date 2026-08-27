import React, { useState } from 'react';
import { Shield, Beaker, Package, ShoppingCart, Truck, Lock, User as UserIcon, UserPlus, LogIn, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { RoleType, User } from '../types';
import { MockDatabase } from '../data';
import { supabase } from '../lib/supabase';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';

interface RoleAuthModalProps {
  isOpen: boolean;
  role: RoleType;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function RoleAuthModal({ isOpen, role, onClose, onSuccess }: RoleAuthModalProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const roleMeta: Record<RoleType, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string; badge: string }> = {
    admin: {
      title: 'Acceso a Gerencia & Administración',
      subtitle: 'Control total de finanzas, catálogo de usuarios y configuración del sistema.',
      icon: Shield,
      color: 'from-amber-600 to-amber-700',
      badge: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    production: {
      title: 'Acceso a Producción & Fórmulas',
      subtitle: 'Preparación de mezclas, explosión de insumos (MRP) y órdenes de trabajo.',
      icon: Beaker,
      color: 'from-cyan-600 to-cyan-700',
      badge: 'bg-cyan-100 text-cyan-900 border-cyan-300'
    },
    warehouse: {
      title: 'Acceso a Almacén & Inventarios',
      subtitle: 'Kárdex, trazabilidad de lotes, mermas y órdenes de compra de insumos.',
      icon: Package,
      color: 'from-orange-600 to-orange-700',
      badge: 'bg-orange-100 text-orange-900 border-orange-300'
    },
    sales: {
      title: 'Acceso a Punto de Venta & Clientes',
      subtitle: 'Caja rápida, remisiones, notas de venta, traslados y crédito de clientes.',
      icon: ShoppingCart,
      color: 'from-purple-600 to-purple-700',
      badge: 'bg-purple-100 text-purple-900 border-purple-300'
    },
    delivery: {
      title: 'Acceso a Reparto & Logística',
      subtitle: 'Rutas de distribución, evidencias de entrega y cobro en destino.',
      icon: Truck,
      color: 'from-blue-600 to-blue-700',
      badge: 'bg-blue-100 text-blue-900 border-blue-300'
    }
  };

  const currentMeta = roleMeta[role];
  const IconComponent = currentMeta.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPin = pin.trim();

      if (!cleanUsername || !cleanPin) {
        setError('Por favor completa todos los campos.');
        setLoading(false);
        return;
      }

      // First check in local database
      const localUsers = MockDatabase.getUsers();

      // Also attempt to query Supabase directly for updated roles & newly created users
      let remoteUser: any = null;
      try {
        const { data, error: sbErr } = await supabase
          .from('users')
          .select('*')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (!sbErr && data) {
          remoteUser = {
            id: data.id,
            name: data.name,
            username: data.username,
            role: data.role as RoleType,
            pin: data.pin,
            active: data.active ?? true,
            permissions: Array.isArray(data.permissions) ? data.permissions : []
          };
        }
      } catch (err) {
        console.log('Supabase sync skip during auth:', err);
      }

      if (isRegisterMode) {
        // REGISTRATION MODE
        if (!name.trim()) {
          setError('Ingresa tu nombre completo.');
          setLoading(false);
          return;
        }

        // Check if username already taken locally or on Supabase
        const existsLocal = localUsers.find(u => u.username.toLowerCase() === cleanUsername);
        if (existsLocal || remoteUser) {
          setError(`El usuario "@${cleanUsername}" ya se encuentra registrado. Usa otro nombre de usuario o inicia sesión.`);
          setLoading(false);
          return;
        }

        // Default permissions based on role
        const defaultPerms: Record<RoleType, string[]> = {
          admin: ['dashboard', 'finanzas', 'configuracion', 'personal'],
          production: ['formulas', 'ordenes', 'mrp'],
          warehouse: ['inventario', 'trazabilidad', 'compras'],
          sales: ['pos', 'crm', 'cobranza', 'traslado', 'notas'],
          delivery: ['rutas', 'entregas']
        };

        const newUser: User = {
          id: `u-${Date.now()}`,
          name: name.trim(),
          username: cleanUsername,
          role: role, // Automatically assign the active modal role
          pin: cleanPin,
          active: true,
          permissions: defaultPerms[role]
        };

        // 1. Save to local storage database
        const updatedLocal = [...localUsers, newUser];
        MockDatabase.saveUsers(updatedLocal);

        // 2. Insert into Supabase if connected
        try {
          await supabase.from('users').upsert({
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            role: newUser.role,
            pin: newUser.pin,
            active: newUser.active,
            permissions: newUser.permissions
          });
        } catch (sbErr) {
          console.log('Error syncing user to Supabase:', sbErr);
        }

        // 3. Log event and record telemetry
        MockDatabase.addAuditLog(
          newUser.name,
          'Registro de Operador',
          'Seguridad',
          `Alta de nuevo usuario (@${newUser.username}) con rol asignado automático: ${newUser.role.toUpperCase()}`
        );

        recordSaveTelemetry({
          table: 'users',
          folio: `USR-${newUser.role.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          action: `Registro de Usuario (${newUser.name})`,
          countBefore: localUsers.length,
          countAfter: localUsers.length + 1,
          status: 'success',
          payloadSummary: `Usuario @${newUser.username} creado con rol ${newUser.role}`,
          source: 'cloud_sync'
        });

        setSuccessMsg(`¡Registro exitoso! Te has registrado con el rol de ${currentMeta.title}. Accediendo...`);
        setTimeout(() => {
          onSuccess(newUser);
        }, 800);

      } else {
        // LOGIN MODE
        // Prioritize Supabase data if role was updated in Supabase cloud!
        const existing = remoteUser || localUsers.find(u => u.username.toLowerCase() === cleanUsername);

        if (!existing) {
          setError(`No se encontró al usuario "@${cleanUsername}". Si eres nuevo en este departamento, regístrate abajo.`);
          setLoading(false);
          return;
        }

        if (existing.pin !== cleanPin) {
          setError('PIN o contraseña incorrecta. Verifica tu clave de acceso.');
          setLoading(false);
          return;
        }

        if (existing.active === false) {
          setError('Esta cuenta de usuario ha sido desactivada por Gerencia.');
          setLoading(false);
          return;
        }

        // Check if role is admin: Admin can access ANY module!
        // If not admin, verify that the user's role matches the module role
        if (existing.role !== 'admin' && existing.role !== role) {
          setError(`Tu cuenta (@${existing.username}) tiene asignado el rol de "${existing.role.toUpperCase()}". No tienes autorización para ingresar al módulo de "${role.toUpperCase()}". Solicita al Administrador un cambio de rol en Supabase.`);
          setLoading(false);
          return;
        }

        // If user data from Supabase was updated (e.g. role changed directly in Supabase), update local state
        const userIndex = localUsers.findIndex(u => u.id === existing.id || u.username.toLowerCase() === cleanUsername);
        if (userIndex >= 0) {
          localUsers[userIndex] = existing;
          MockDatabase.saveUsers(localUsers);
        } else {
          MockDatabase.saveUsers([...localUsers, existing]);
        }

        MockDatabase.addAuditLog(
          existing.name,
          'Inicio de Sesión',
          'Seguridad',
          `Acceso verificado para ${existing.name} (@${existing.username}) al módulo ${role.toUpperCase()}`
        );

        recordSaveTelemetry({
          table: 'audit_logs',
          folio: `LOG-${existing.role.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          action: `Acceso Exitoso (${existing.name})`,
          countBefore: 0,
          countAfter: 1,
          status: 'success',
          payloadSummary: `Autenticación de @${existing.username} en ${role}`,
          source: 'cloud_sync'
        });

        setSuccessMsg(`¡Bienvenido, ${existing.name}! Accediendo al sistema...`);
        setTimeout(() => {
          onSuccess(existing);
        }, 500);
      }

    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al procesar las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
        
        {/* Header with Pantone / Role gradient */}
        <div className={`bg-gradient-to-r ${currentMeta.color} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-inner">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 block">
                Módulo Seguro • Miauloo
              </span>
              <h3 className="text-xl font-extrabold tracking-tight text-white leading-tight">
                {role === 'admin' ? 'Administrador' : role === 'production' ? 'Producción' : role === 'warehouse' ? 'Almacén' : role === 'sales' ? 'Ventas' : 'Entregas'}
              </h3>
            </div>
          </div>
          <p className="text-xs text-white/90 font-medium leading-relaxed mt-2">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isRegisterMode 
                  ? 'bg-white text-[#032B4E] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isRegisterMode 
                  ? 'bg-white text-[#032B4E] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarse en {role === 'admin' ? 'Admin' : role === 'production' ? 'Producción' : role === 'warehouse' ? 'Almacén' : role === 'sales' ? 'Ventas' : 'Reparto'}</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="leading-snug">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Sánchez Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario / Identificador
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ej. roberto_alm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                PIN de Seguridad / Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Ej. 1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200/80 flex items-center justify-between">
                <div className="text-[11px] text-sky-900">
                  <span className="font-bold block">Rol Asignado Automáticamente:</span>
                  <span>{currentMeta.title}</span>
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md border ${currentMeta.badge}`}>
                  {role.toUpperCase()}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#032B4E] hover:bg-[#043b6b] disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Completar Registro y Entrar</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Ingresar a {role === 'admin' ? 'Administración' : role === 'production' ? 'Producción' : role === 'warehouse' ? 'Almacén' : role === 'sales' ? 'Ventas' : 'Reparto'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick predefined demo users hint */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              ¿Quieres probar con los usuarios por defecto?
            </p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-600">
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                Admin: <b>jonathan</b> (PIN: 1111)
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                Prod: <b>diana_prod</b> (PIN: 2222)
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                Alm: <b>carlos_alm</b> (PIN: 3333)
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                Vtas: <b>mariana_vta</b> (PIN: 4444)
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                Rep: <b>pedro_rep</b> (PIN: 5555)
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
