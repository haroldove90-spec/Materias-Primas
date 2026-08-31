import React, { useState } from 'react';
import { 
  User as UserIcon, Phone, Mail, Lock, Shield, Camera, 
  Check, X, Sparkles, Building2, Briefcase, Eye, EyeOff, Save, RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { MockDatabase } from '../data';
import { saveUserToSupabase } from '../services/supabaseService';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onUpdateUser }) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [department, setDepartment] = useState(user.department || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [pin, setPin] = useState(user.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate secure PIN/Password
  const handleGenerateSecurePin = () => {
    // Generate 6-digit or strong 8-char key
    const chars = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPin(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar los 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El nombre es obligatorio' });
      return;
    }
    if (!pin.trim()) {
      setFeedbackMsg({ type: 'error', text: 'El PIN / Clave es obligatorio' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const updated: User = {
      ...user,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      pin: pin.trim()
    };

    // 1. Update in LocalStorage
    const allUsers = MockDatabase.getUsers();
    const index = allUsers.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (index >= 0) {
      allUsers[index] = updated;
    } else {
      allUsers.push(updated);
    }
    MockDatabase.saveUsers(allUsers);
    MockDatabase.addAuditLog(
      user.name,
      'Actualizó su perfil de usuario',
      'Perfil',
      `Cambio de datos de contacto y credenciales de ${user.username}`
    );

    // 2. Sync to Supabase Cloud
    try {
      const res = await saveUserToSupabase({
        id: updated.id,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        pin: updated.pin,
        active: updated.active,
        permissions: updated.permissions,
        avatarUrl: updated.avatarUrl,
        jobTitle: updated.jobTitle,
        department: updated.department,
        bio: updated.bio
      });

      if (res.success) {
        setFeedbackMsg({ type: 'success', text: '¡Perfil actualizado y sincronizado con Supabase Cloud!' });
      } else {
        setFeedbackMsg({ type: 'success', text: 'Perfil guardado localmente (sin conexión a Supabase).' });
      }
    } catch {
      setFeedbackMsg({ type: 'success', text: 'Perfil actualizado localmente con éxito.' });
    } finally {
      setIsSaving(false);
      onUpdateUser(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mi Perfil de Usuario</h2>
              <p className="text-xs text-slate-500">Actualiza tu información personal, foto y credenciales de acceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {feedbackMsg && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
              {feedbackMsg.text}
            </div>
          )}

          {/* Avatar Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-md flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={name} 
                    className="w-full h-full object-cover rounded-full bg-white" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-400 font-bold text-2xl">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-slate-900 text-white rounded-full shadow-lg cursor-pointer hover:bg-amber-600 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="text-sm font-semibold text-slate-800">Foto o Avatar</div>
              <p className="text-xs text-slate-500">Selecciona un avatar rápido o sube una imagen de tu dispositivo</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 ${
                      avatarUrl === preset ? 'border-amber-500 scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt={`Avatar ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-700 underline font-medium ml-2"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* General Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre Completo *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="Ej. Jonathan Ruiz"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre de Usuario (Login)</label>
              <input 
                type="text"
                disabled
                value={user.username}
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="ejemplo@miauloo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono / WhatsApp</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="Ej. 55-1234-5678"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cargo / Puesto</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="Ej. Encargado de Producción"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departamento / Área</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="Ej. Planta y Calidad"
                />
              </div>
            </div>
          </div>

          {/* Credentials / Security Section */}
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Credenciales de Acceso y Seguridad</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateSecurePin}
                className="text-xs text-amber-700 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                Generar Clave Segura
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">PIN / Contraseña de Ingreso *</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
                <input 
                  type={showPin ? 'text' : 'password'}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                  placeholder="PIN o contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Rol asignado:</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Notes / Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas personales / Biografía</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
              placeholder="Información adicional relevante..."
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/20 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
