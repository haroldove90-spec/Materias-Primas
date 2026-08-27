import React, { useState, useEffect } from 'react';
import { 
  Shield, Beaker, Package, ShoppingCart, Truck, Lock, User as UserIcon, 
  UserPlus, LogIn, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Mail,
  Eye, EyeOff, Sparkles
} from 'lucide-react';
import { RoleType, User } from '../types';
import { MockDatabase, INITIAL_USERS } from '../data';
import { supabase } from '../lib/supabase';
import { recordSaveTelemetry } from '../services/supabaseTelemetry';

interface RoleAuthModalProps {
  isOpen?: boolean;
  role: RoleType;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function RoleAuthModal({ isOpen = true, role, onClose, onSuccess }: RoleAuthModalProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Predefined default user for this specific role for quick 1-click test
  const defaultUserForRole = INITIAL_USERS.find(u => u.role === role);

  useEffect(() => {
    // Ensure local database has initial users if empty
    const currentUsers = MockDatabase.getUsers();
    if (!currentUsers || currentUsers.length === 0) {
      MockDatabase.saveUsers(INITIAL_USERS);
    }
  }, []);

  if (!isOpen) return null;

  const roleMeta: Record<RoleType, { title: string; subtitle: string; icon: React.ComponentType<any>; color: string; badge: string; defaultUserHint: string; defaultPin: string }> = {
    admin: {
      title: 'Gerencia & Administración',
      subtitle: 'Control total de finanzas, catálogo de usuarios, configuraciones y todos los roles.',
      icon: Shield,
      color: 'from-amber-600 to-amber-700',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      defaultUserHint: 'jonathan',
      defaultPin: '1111'
    },
    production: {
      title: 'Producción & Fórmulas',
      subtitle: 'Preparación de mezclas, explosión de insumos (MRP) y órdenes de trabajo.',
      icon: Beaker,
      color: 'from-cyan-600 to-cyan-700',
      badge: 'bg-cyan-100 text-cyan-900 border-cyan-300',
      defaultUserHint: 'diana_prod',
      defaultPin: '2222'
    },
    warehouse: {
      title: 'Almacén & Inventarios',
      subtitle: 'Kárdex, trazabilidad de lotes, mermas y órdenes de compra de insumos.',
      icon: Package,
      color: 'from-orange-600 to-orange-700',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      defaultUserHint: 'carlos_alm',
      defaultPin: '3333'
    },
    sales: {
      title: 'Punto de Venta & Clientes',
      subtitle: 'Caja rápida, remisiones, notas de venta, traslados y crédito de clientes.',
      icon: ShoppingCart,
      color: 'from-purple-600 to-purple-700',
      badge: 'bg-purple-100 text-purple-900 border-purple-300',
      defaultUserHint: 'mariana_vta',
      defaultPin: '4444'
    },
    delivery: {
      title: 'Reparto & Logística',
      subtitle: 'Rutas de distribución, evidencias de entrega y cobro en destino.',
      icon: Truck,
      color: 'from-blue-600 to-blue-700',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      defaultUserHint: 'pedro_rep',
      defaultPin: '5555'
    }
  };

  const currentMeta = roleMeta[role];
  const IconComponent = currentMeta.icon;

  const handleQuickFill = (user: string, passwordPin: string) => {
    setUsernameOrEmail(user);
    setPin(passwordPin);
    setError(null);
    setSuccessMsg(`Credenciales cargadas para @${user}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const cleanInput = usernameOrEmail.trim().toLowerCase();
      const cleanPin = pin.trim();

      if (!cleanInput || !cleanPin) {
        setError('Por favor completa todos los campos requeridos.');
        setLoading(false);
        return;
      }

      // Ensure local database has users
      let localUsers = MockDatabase.getUsers();
      if (!localUsers || localUsers.length === 0) {
        localUsers = INITIAL_USERS;
        MockDatabase.saveUsers(localUsers);
      }

      if (isRegisterMode) {
        // ============================================
        // MODO REGISTRO DE NUEVO USUARIO
        // ============================================
        if (!name.trim()) {
          setError('Por favor ingresa tu nombre completo.');
          setLoading(false);
          return;
        }

        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@')) {
          setError('Por favor ingresa un correo electrónico válido con formato @dominio.com');
          setLoading(false);
          return;
        }

        // Verify if username or email already exists locally
        const existsLocal = localUsers.find(
          u => u.username.toLowerCase() === cleanInput || 
               (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        );

        if (existsLocal) {
          setError(`El usuario "@${cleanInput}" o correo ya se encuentra registrado. Inicia sesión o elige otro nombre de usuario.`);
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
          username: cleanInput,
          email: cleanEmail || `${cleanInput}@miauloo.com`,
          role: role, // Automatically assign the active modal role
          pin: cleanPin,
          active: true,
          permissions: defaultPerms[role]
        };

        // 1. Save to local storage database
        const updatedLocal = [...localUsers, newUser];
        MockDatabase.saveUsers(updatedLocal);

        // 2. Insert into Supabase with multi-tier fallback
        try {
          // Tier 1: Try full schema (id, name, username, email, role, pin, active, permissions)
          const { error: fullSchemaErr } = await supabase.from('users').upsert({
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            pin: newUser.pin,
            active: newUser.active,
            permissions: newUser.permissions
          });

          if (fullSchemaErr) {
            console.warn('Supabase full schema insert failed, trying core columns fallback:', fullSchemaErr.message);
            // Tier 2: Fallback to core columns (id, name, username, role, pin)
            const { error: coreErr } = await supabase.from('users').upsert({
              id: newUser.id,
              name: newUser.name,
              username: newUser.username,
              role: newUser.role,
              pin: newUser.pin
            });
            if (coreErr) {
              console.error('Supabase core insert error (check RLS / columns in Supabase):', coreErr.message);
            }
          }
        } catch (sbErr: any) {
          console.warn('Error syncing user to Supabase (guardado localmente):', sbErr?.message || sbErr);
        }

        // 3. Log event and record telemetry
        MockDatabase.addAuditLog(
          newUser.name,
          'Registro de Operador',
          'Seguridad',
          `Alta de nuevo usuario (@${newUser.username} / ${newUser.email}) con rol asignado automático: ${newUser.role.toUpperCase()}`
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

        setSuccessMsg(`¡Registro completado con éxito! Se te ha asignado el rol de ${currentMeta.title}. Accediendo...`);
        setTimeout(() => {
          onSuccess(newUser);
        }, 800);

      } else {
        // ============================================
        // MODO INICIO DE SESIÓN
        // ============================================

        // Flexible lookup: Find by username, email, or common alias (e.g., 'carlos' -> 'carlos_alm', 'diana' -> 'diana_prod', 'mariana' -> 'mariana_vta', 'pedro' -> 'pedro_rep')
        let matchedUser = localUsers.find(u => {
          const uName = u.username.toLowerCase();
          const uEmail = u.email?.toLowerCase() || '';
          const fullName = u.name.toLowerCase();
          return (
            uName === cleanInput ||
            uEmail === cleanInput ||
            uName.replace(/_(prod|alm|vta|rep)$/, '') === cleanInput ||
            fullName.includes(cleanInput)
          );
        });

        // Also attempt to query Supabase directly for updated roles or users created remotely
        try {
          const { data, error: sbErr } = await supabase
            .from('users')
            .select('*')
            .or(`username.ilike.${cleanInput},email.ilike.${cleanInput},username.ilike.${cleanInput}_%`)
            .maybeSingle();

          if (!sbErr && data) {
            matchedUser = {
              id: data.id,
              name: data.name,
              username: data.username,
              email: data.email || `${data.username}@miauloo.com`,
              role: data.role as RoleType,
              pin: data.pin,
              active: data.active ?? true,
              permissions: Array.isArray(data.permissions) ? data.permissions : []
            };
          }
        } catch (err) {
          console.log('Supabase sync skip during auth:', err);
        }

        if (!matchedUser) {
          setError(`No se encontró el usuario o correo "${cleanInput}". Si aún no tienes cuenta en este departamento, haz clic en la pestaña "Registrarse".`);
          setLoading(false);
          return;
        }

        // Validate PIN / Password
        if (matchedUser.pin !== cleanPin) {
          setError('PIN o contraseña incorrecta. Verifica tu clave de acceso.');
          setLoading(false);
          return;
        }

        if (matchedUser.active === false) {
          setError('Esta cuenta de usuario ha sido desactivada por la Gerencia.');
          setLoading(false);
          return;
        }

        // Role verification:
        // Admin can access ANY module!
        // Other roles can only access their specific role module
        if (matchedUser.role !== 'admin' && matchedUser.role !== role) {
          setError(`Tu cuenta (@${matchedUser.username}) tiene asignado el rol de "${matchedUser.role.toUpperCase()}". No tienes permiso para ingresar al módulo de "${role.toUpperCase()}". Solicita al Administrador un cambio de rol en Supabase.`);
          setLoading(false);
          return;
        }

        // Synchronize in local state in case role was modified in Supabase
        const uIndex = localUsers.findIndex(u => u.id === matchedUser!.id || u.username.toLowerCase() === matchedUser!.username.toLowerCase());
        if (uIndex >= 0) {
          localUsers[uIndex] = matchedUser;
          MockDatabase.saveUsers(localUsers);
        } else {
          MockDatabase.saveUsers([...localUsers, matchedUser]);
        }

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
        }, 500);
      }

    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al procesar las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200" id="role_auth_modal_overlay">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94dvh] sm:max-h-[90vh] relative" id="role_auth_modal_card">
        
        {/* Header with Pantone / Role gradient */}
        <div className={`bg-gradient-to-r ${currentMeta.color} p-3.5 sm:p-5 text-white relative shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Volver"
            id="btn_close_auth_modal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5 sm:space-x-3 mb-1 sm:mb-1.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 pr-6">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-white/80 block truncate">
                Módulo Seguro • Miauloo
              </span>
              <h3 className="text-base sm:text-xl font-extrabold tracking-tight text-white leading-tight truncate">
                {currentMeta.title}
              </h3>
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-white/90 font-medium leading-snug mt-1 sm:mt-1.5 line-clamp-2">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Form Body - Scrollable Container for Mobile */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-3 sm:space-y-3.5">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-3 border border-slate-200/80 shrink-0" id="auth_mode_tabs">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isRegisterMode 
                  ? 'bg-white text-[#032B4E] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              id="tab_login_mode"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isRegisterMode 
                  ? 'bg-white text-[#032B4E] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              id="tab_register_mode"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Quick Auto-fill banner for testing */}
          {!isRegisterMode && defaultUserForRole && (
            <div className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors">
              <div className="text-[11px] text-slate-700 flex items-center gap-1.5 truncate pr-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Operador: <strong>@{defaultUserForRole.username}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickFill(defaultUserForRole.username, defaultUserForRole.pin)}
                className="text-[10px] font-bold bg-[#032B4E] text-white px-2.5 py-1 rounded-md hover:bg-[#043b6b] transition-all cursor-pointer shadow-xs shrink-0"
              >
                Autocompletar
              </button>
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="space-y-3" id="auth_role_form">
            
            {/* Registro: Nombre Completo */}
            {isRegisterMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Sánchez Gómez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                    id="input_register_name"
                  />
                </div>
              </div>
            )}

            {/* Usuario / Identificador */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                {isRegisterMode ? 'Nombre de Usuario' : 'Usuario o Correo Electrónico'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder={isRegisterMode ? `Ej. ${currentMeta.defaultUserHint}` : `Ej. ${currentMeta.defaultUserHint} o correo`}
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                  id="input_auth_username"
                />
              </div>
            </div>

            {/* Registro: Correo Electrónico */}
            {isRegisterMode && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="Ej. usuario@miauloo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                    id="input_register_email"
                  />
                </div>
              </div>
            )}

            {/* PIN / Contraseña con Ojito para ver contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  PIN de Seguridad / Contraseña <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Ej: {currentMeta.defaultPin}</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ingresa tu clave"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#032B4E] focus:border-transparent transition-all"
                  id="input_auth_password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer"
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

            {/* Rol Asignado Automáticamente en Registro */}
            {isRegisterMode && (
              <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200/80 flex items-center justify-between">
                <div className="text-[11px] text-sky-900">
                  <span className="font-bold block">Rol Asignado Automáticamente:</span>
                  <span>{currentMeta.title}</span>
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${currentMeta.badge}`}>
                  {role.toUpperCase()}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#032B4E] hover:bg-[#043b6b] disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              id="btn_submit_auth_form"
            >
              {loading ? (
                <span>Verificando credenciales...</span>
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

          {/* Predefined demo accounts footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mb-1.5">
              Usuarios oficiales predefinidos (Haz clic para autocompletar):
            </p>
            <div className="flex flex-wrap justify-center gap-1 text-[10px] text-slate-600">
              <button
                type="button"
                onClick={() => handleQuickFill('jonathan', '1111')}
                className="bg-slate-100 hover:bg-amber-100 hover:text-amber-900 px-2 py-0.5 rounded font-mono border border-slate-200 transition-colors cursor-pointer"
              >
                Admin: <b>jonathan</b>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('diana_prod', '2222')}
                className="bg-slate-100 hover:bg-cyan-100 hover:text-cyan-900 px-2 py-0.5 rounded font-mono border border-slate-200 transition-colors cursor-pointer"
              >
                Prod: <b>diana_prod</b>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('carlos_alm', '3333')}
                className="bg-slate-100 hover:bg-orange-100 hover:text-orange-900 px-2 py-0.5 rounded font-mono border border-slate-200 transition-colors cursor-pointer"
              >
                Alm: <b>carlos_alm</b>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('mariana_vta', '4444')}
                className="bg-slate-100 hover:bg-purple-100 hover:text-purple-900 px-2 py-0.5 rounded font-mono border border-slate-200 transition-colors cursor-pointer"
              >
                Vtas: <b>mariana_vta</b>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('pedro_rep', '5555')}
                className="bg-slate-100 hover:bg-blue-100 hover:text-blue-900 px-2 py-0.5 rounded font-mono border border-slate-200 transition-colors cursor-pointer"
              >
                Rep: <b>pedro_rep</b>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
