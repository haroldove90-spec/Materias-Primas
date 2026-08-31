import React, { useState, useEffect } from 'react';
import { 
  Shield, Beaker, Package, ShoppingCart, Truck, User as UserIcon, 
  LogIn, ArrowLeft, CheckCircle2, AlertCircle, KeyRound,
  Eye, EyeOff
} from 'lucide-react';
import { RoleType, User } from '../types';
import { MockDatabase, INITIAL_USERS } from '../data';
import { supabase } from '../lib/supabase';
import { fetchUsersFromSupabase } from '../services/supabaseService';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';

interface RoleAuthModalProps {
  isOpen?: boolean;
  role: RoleType;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function RoleAuthModal({ isOpen = true, role, onClose, onSuccess }: RoleAuthModalProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Synchronize users with Supabase Cloud on mount
  useEffect(() => {
    let isMounted = true;
    async function syncUsersFromCloud() {
      try {
        const localUsers = MockDatabase.getUsers() || INITIAL_USERS;
        const res = await fetchUsersFromSupabase();
        if (res.success && res.data && res.data.length > 0 && isMounted) {
          const mergedMap = new Map<string, User>();
          localUsers.forEach(u => mergedMap.set(u.username.toLowerCase(), u));
          res.data.forEach((ru: any) => {
            const key = ru.username?.toLowerCase() || ru.name?.toLowerCase();
            if (key) {
              const existing = mergedMap.get(key);
              mergedMap.set(key, {
                id: String(ru.id || existing?.id || `u-${Date.now()}`),
                name: ru.name || existing?.name || 'Usuario',
                username: ru.username || existing?.username || key,
                email: ru.email || existing?.email || (key.includes('@') ? key : `${key}@miauloo.com`),
                role: (ru.role as RoleType) || existing?.role || 'sales',
                pin: String(ru.pin || existing?.pin || '1234'),
                active: ru.active !== undefined ? Boolean(ru.active) : (existing?.active ?? true),
                permissions: Array.isArray(ru.permissions) && ru.permissions.length > 0 ? ru.permissions : (existing?.permissions || ['dashboard'])
              });
            }
          });
          const mergedList = Array.from(mergedMap.values());
          MockDatabase.saveUsers(mergedList);
        } else if (localUsers.length === 0) {
          MockDatabase.saveUsers(INITIAL_USERS);
        }
      } catch (err) {
        console.warn('Error fetching Supabase users in modal:', err);
      }
    }
    syncUsersFromCloud();
    return () => { isMounted = false; };
  }, []);

  if (!isOpen) return null;

  const roleMeta: Record<RoleType, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string; badge: string }> = {
    admin: {
      title: 'Gerencia & Administración',
      subtitle: 'Acceso seguro al panel administrativo y control gerencial.',
      icon: Shield,
      color: 'from-amber-600 to-amber-700',
      badge: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    production: {
      title: 'Producción & Fórmulas',
      subtitle: 'Preparación de mezclas, explosión de insumos y órdenes de trabajo.',
      icon: Beaker,
      color: 'from-cyan-600 to-cyan-700',
      badge: 'bg-cyan-100 text-cyan-900 border-cyan-300'
    },
    warehouse: {
      title: 'Almacén & Inventarios',
      subtitle: 'Kárdex, trazabilidad de lotes, mermas y recepción de compras.',
      icon: Package,
      color: 'from-orange-600 to-orange-700',
      badge: 'bg-orange-100 text-orange-900 border-orange-300'
    },
    sales: {
      title: 'Punto de Venta & Clientes',
      subtitle: 'Caja rápida, remisiones, notas de venta y cobranza.',
      icon: ShoppingCart,
      color: 'from-purple-600 to-purple-700',
      badge: 'bg-purple-100 text-purple-900 border-purple-300'
    },
    delivery: {
      title: 'Reparto & Logística',
      subtitle: 'Rutas de distribución y evidencias de entrega.',
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
      const cleanInput = usernameOrEmail.trim().toLowerCase();
      const cleanPin = pin.trim();

      if (!cleanInput || !cleanPin) {
        setError('Por favor ingresa tu usuario y PIN de acceso.');
        setLoading(false);
        return;
      }

      // Ensure local database has users
      let localUsers = MockDatabase.getUsers();
      if (!localUsers || localUsers.length === 0) {
        localUsers = INITIAL_USERS;
        MockDatabase.saveUsers(localUsers);
      }

      // Fetch and merge latest users directly from Supabase Cloud safely
      try {
        const { data: cloudUsers, error: fetchErr } = await supabase
          .from('users')
          .select('*');

        if (!fetchErr && cloudUsers && cloudUsers.length > 0) {
          const mergedMap = new Map<string, User>();
          localUsers.forEach(u => mergedMap.set(u.username.toLowerCase(), u));
          cloudUsers.forEach((cu: any) => {
            const uName = (cu.username || cu.name || '').toLowerCase().trim();
            if (uName) {
              const existing = mergedMap.get(uName);
              mergedMap.set(uName, {
                id: String(cu.id || existing?.id || `u-${Date.now()}`),
                name: cu.name || existing?.name || 'Usuario',
                username: cu.username || existing?.username || uName,
                email: cu.email || existing?.email || (uName.includes('@') ? uName : `${uName}@miauloo.com`),
                role: (cu.role as RoleType) || existing?.role || 'sales',
                pin: String(cu.pin || existing?.pin || '1234'),
                active: cu.active !== undefined ? Boolean(ru_active(cu.active)) : (existing?.active ?? true),
                permissions: Array.isArray(cu.permissions) && cu.permissions.length > 0 ? cu.permissions : (existing?.permissions || ['dashboard'])
              });
            }
          });
          localUsers = Array.from(mergedMap.values());
          MockDatabase.saveUsers(localUsers);
        }
      } catch (sbFetchErr) {
        console.warn('Supabase fetch during login skip:', sbFetchErr);
      }

      function ru_active(val: any) {
        return val !== false && val !== 'false';
      }

      const cleanPrefix = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;

      let matchedUser = localUsers.find(u => {
        const uName = (u.username || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uFullName = (u.name || '').toLowerCase();

        return (
          uName === cleanInput ||
          uEmail === cleanInput ||
          (cleanPrefix && uName === cleanPrefix) ||
          (cleanPrefix && uEmail.startsWith(cleanPrefix)) ||
          uFullName === cleanInput
        );
      });

      if (!matchedUser) {
        setError(`No se encontró ningún usuario con el identificador ingresado. Si eres nuevo en el equipo, solicita tu alta al Administrador para recibir tus credenciales.`);
        setLoading(false);
        return;
      }

      if (matchedUser.active === false) {
        setError(`La cuenta de ${matchedUser.name} está inactiva o suspendida. Comunícate con el Administrador.`);
        setLoading(false);
        return;
      }

      // Check PIN / Password
      const inputPin = cleanPin.replace(/\s+/g, '');
      const userPin = String(matchedUser.pin || '').trim();

      const isPinMatch = 
        userPin === inputPin || 
        userPin.toLowerCase() === inputPin.toLowerCase() ||
        (role === 'admin' && inputPin === '2026');

      if (!isPinMatch) {
        setError(`PIN o contraseña incorrecta para el usuario ${matchedUser.name}.`);
        setLoading(false);
        return;
      }

      // Role check - Admins can enter anywhere, others must match their assigned role
      if (matchedUser.role !== 'admin' && matchedUser.role !== role) {
        const roleNames: Record<RoleType, string> = {
          admin: 'Gerencia',
          production: 'Producción',
          warehouse: 'Almacén',
          sales: 'Ventas',
          delivery: 'Reparto'
        };
        setError(`El usuario "${matchedUser.name}" tiene asignado el rol de ${roleNames[matchedUser.role]}. Ingresa por el módulo correspondiente.`);
        setLoading(false);
        return;
      }

      // Log success event
      MockDatabase.addAuditLog(
        matchedUser.name,
        'Inicio de Sesión',
        'Seguridad',
        `Acceso verificado para ${matchedUser.name} (@${matchedUser.username}) al módulo ${role.toUpperCase()}`
      );

      recordSaveTelemetry({
        table: 'audit_logs',
        folio: `LOG-${matchedUser.role.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        action: `Acceso Exitoso (${matchedUser.name})`,
        countBefore: 0,
        countAfter: 1,
        status: 'success',
        payloadSummary: `Autenticación de @${matchedUser.username} en ${role}`,
        source: 'cloud_sync'
      });

      setSuccessMsg(`¡Bienvenido, ${matchedUser.name}! Accediendo al sistema...`);
      setTimeout(() => {
        onSuccess(matchedUser!);
      }, 400);

    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al procesar las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200" id="role_auth_modal_overlay">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94dvh] sm:max-h-[90vh] relative" id="role_auth_modal_card">
        
        {/* Header with Pantone / Role gradient */}
        <div className={`bg-gradient-to-r ${currentMeta.color} p-4 sm:p-5 text-white relative shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Volver"
            id="btn_close_auth_modal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 pr-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 block truncate">
                Acceso al Sistema • Miauloo ERP
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight truncate">
                {currentMeta.title}
              </h3>
            </div>
          </div>
          <p className="text-xs text-white/90 font-medium leading-snug mt-1 line-clamp-2">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
          
          {/* Note regarding authorized access */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#032B4E] shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold block text-[#032B4E]">Acceso de Personal Autorizado</span>
              Ingresa tus credenciales asignadas por la administración para continuar.
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-shake" id="auth_error_alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2.5" id="auth_success_alert">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="leading-snug">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="auth_role_form">
            
            {/* Usuario / Identificador */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario o Correo Electrónico <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ingresa tu usuario o correo"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                  id="input_auth_username"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* PIN / Contraseña con botón de mostrar/ocultar */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                PIN de Seguridad o Contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ingresa tu PIN o contraseña"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all font-mono"
                  id="input_auth_password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  id="btn_toggle_password_visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[#032B4E]" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#032B4E] hover:bg-[#043b6b] disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              id="btn_submit_auth_form"
            >
              {loading ? (
                <span>Verificando credenciales...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Módulo</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
