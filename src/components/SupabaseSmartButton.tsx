import React, { useState, useEffect } from 'react';
import { Database, Zap, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { 
  SupabaseHealthStatus, 
  subscribeHealthStatus, 
  checkSupabasePing, 
  startHeartbeatMonitor 
} from '../services/supabaseTelemetry';
import { SUPABASE_PROJECT_INFO } from '../lib/supabase';

interface SupabaseSmartButtonProps {
  onClick?: () => void;
  variant?: 'pill' | 'compact' | 'badge' | 'card';
  className?: string;
  showPingButton?: boolean;
}

export const SupabaseSmartButton: React.FC<SupabaseSmartButtonProps> = ({
  onClick,
  variant = 'pill',
  className = '',
  showPingButton = false,
}) => {
  const [health, setHealth] = useState<SupabaseHealthStatus>({
    connected: false,
    latencyMs: 0,
    lastChecked: null,
    lastCheckedFormatted: 'Iniciando...',
    message: 'Verificando estado de Supabase...',
    isChecking: false,
  });

  useEffect(() => {
    // Start background heartbeat monitor every 25 seconds
    startHeartbeatMonitor(25000);

    const unsubscribe = subscribeHealthStatus((status) => {
      setHealth(status);
    });

    return () => unsubscribe();
  }, []);

  const handleManualPing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await checkSupabasePing();
  };

  const isConnected = health.connected;
  const isChecking = health.isChecking;
  const latency = health.latencyMs;

  // Latency speed color
  const getLatencyBadgeColor = (ms: number) => {
    if (!isConnected) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (ms < 120) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (ms < 350) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  };

  // 1. Compact Header Variant
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          onClick={onClick}
          title={`Supabase Cloud: ${health.message} • Latencia: ${latency}ms • Heartbeat: cada 25s`}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
            isConnected
              ? 'bg-slate-900 text-slate-100 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-800'
              : 'bg-slate-900 text-slate-100 border-rose-500/40 hover:border-rose-400 hover:bg-slate-800'
          }`}
        >
          {/* Semáforo en Vivo 2 Estados (🟢 / 🔴) con animación */}
          <div className="relative flex items-center justify-center">
            {isConnected ? (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </div>

          <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          
          <span className="text-[11px] font-mono font-bold tracking-tight">
            Supabase
          </span>

          {/* Latency badge */}
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold flex items-center gap-0.5 ${getLatencyBadgeColor(latency)}`}>
            <Zap className="w-2.5 h-2.5" />
            {isChecking ? '...' : `${latency}ms`}
          </span>
        </button>

        {showPingButton && (
          <button
            onClick={handleManualPing}
            disabled={isChecking}
            title="Comprobación a Demanda en 1 Clic (Ping diagnóstico)"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  // 2. Sidebar Full Width Card Variant
  if (variant === 'card') {
    return (
      <div className={`p-3 bg-slate-900 border ${isConnected ? 'border-emerald-500/30' : 'border-rose-500/30'} rounded-xl text-white space-y-2 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Semáforo en Vivo */}
            <div className="relative flex items-center justify-center">
              {isConnected ? (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Supabase Cloud
            </span>
          </div>

          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 ${getLatencyBadgeColor(latency)}`}>
            <Zap className="w-2.5 h-2.5" />
            {isChecking ? 'Ping...' : `${latency} ms`}
          </span>
        </div>

        <p className="text-[10px] text-slate-400 truncate">
          {isConnected ? `Sincronizado • Heartbeat 25s` : health.message}
        </p>

        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            onClick={onClick}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors text-center border border-slate-700"
          >
            Panel & Historial
          </button>
          <button
            onClick={handleManualPing}
            disabled={isChecking}
            title="Comprobación a Demanda en 1 Clic"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // 3. Default Rich Pill Variant (Used in Login / Header)
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={onClick}
        className={`group relative pl-3 pr-3 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
          isConnected
            ? 'bg-slate-950 text-white border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-950/40'
            : 'bg-slate-950 text-white border-rose-500/40 hover:border-rose-400 hover:shadow-rose-950/40'
        }`}
      >
        {/* Semáforo en Vivo 2 Estados (🟢 / 🔴) con animación de pulso */}
        <div className="relative flex items-center justify-center">
          {isConnected ? (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-[11px] font-semibold text-slate-200">
            Supabase: <strong className="text-white font-mono">{SUPABASE_PROJECT_INFO.projectId}</strong>
          </span>
        </div>

        {/* Medición de Latencia en ms */}
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${getLatencyBadgeColor(latency)}`}>
          <Zap className="w-3 h-3" />
          {isChecking ? 'Verificando...' : `${latency} ms`}
        </span>
      </button>

      {/* 1-Click Diagnostics Ping Button */}
      <button
        onClick={handleManualPing}
        disabled={isChecking}
        title="Comprobación a Demanda en 1 Clic (Ping diagnóstico)"
        className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
      </button>
    </div>
  );
};
