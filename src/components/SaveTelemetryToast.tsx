import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, X, Clock, Layers, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { SaveTelemetryRecord, subscribeSaveTelemetry } from '../services/supabaseTelemetry';

interface SaveTelemetryToastProps {
  onOpenConfirmationsHistory?: () => void;
}

export const SaveTelemetryToast: React.FC<SaveTelemetryToastProps> = ({ onOpenConfirmationsHistory }) => {
  const [currentToast, setCurrentToast] = useState<SaveTelemetryRecord | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSaveTelemetry((record) => {
      setCurrentToast(record);
      setIsVisible(true);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  if (!isVisible || !currentToast) return null;

  const isSuccess = currentToast.status === 'success';

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-md w-full animate-slide-up transition-all duration-300">
      <div className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-md transition-all ${
        isSuccess 
          ? 'bg-slate-950/95 border-emerald-500/40 text-white shadow-emerald-950/30'
          : 'bg-slate-950/95 border-rose-500/40 text-white shadow-rose-950/30'
      }`}>
        {/* Header line */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Telemetría de Guardado Supabase
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isSuccess ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'}`} />
                  {isSuccess ? 'Persistido' : 'Error'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Info */}
        <div className="py-2.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">{currentToast.action}</span>
            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-[11px] text-emerald-300 border border-slate-800 font-bold">
              {currentToast.folio}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
            {/* Auditoría de Conteo Previo vs Posterior */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Layers className="w-3 h-3 text-slate-500" /> Auditoría Conteo
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold mt-0.5">
                <span className="text-slate-400">{currentToast.countBefore}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span className="text-emerald-400">{currentToast.countAfter}</span>
                {currentToast.countAfter > currentToast.countBefore && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-sans">
                    +1
                  </span>
                )}
              </div>
            </div>

            {/* Latencia Exacta */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Zap className="w-3 h-3 text-amber-400" /> Latencia Servidor
              </span>
              <span className={`text-[11px] font-mono font-bold mt-0.5 ${
                currentToast.latencyMs < 150 ? 'text-emerald-400' : currentToast.latencyMs < 400 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                ⚡ {currentToast.latencyMs} ms
              </span>
            </div>
          </div>

          {/* Timestamp Completo */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {currentToast.formattedDate}
            </span>
            <span className="font-mono text-slate-500">Tabla: {currentToast.table}</span>
          </div>
        </div>

        {/* Footer Actions */}
        {onOpenConfirmationsHistory && (
          <div className="pt-2 border-t border-slate-800/80 flex justify-end">
            <button
              onClick={() => {
                setIsVisible(false);
                onOpenConfirmationsHistory();
              }}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              Ver en Historial de Confirmaciones <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
