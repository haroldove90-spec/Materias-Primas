import React, { useState, useEffect } from 'react';
import { 
  Database, CheckCircle2, AlertTriangle, Copy, Download, RefreshCw, 
  ExternalLink, Server, Table, ShieldCheck, X, Sparkles, Check,
  Zap, Clock, Layers, Activity, ArrowRight, Trash2, Send, Radio
} from 'lucide-react';
import { 
  SUPABASE_SQL_SCRIPT, 
  seedSupabaseFromClient, 
  checkSupabaseConnection 
} from '../services/supabaseService';
import { 
  SupabaseHealthStatus,
  subscribeHealthStatus,
  checkSupabasePing,
  SaveTelemetryRecord,
  getConfirmationHistory,
  clearConfirmationHistory,
  syncAuditAndAccessLogs,
  recordSaveTelemetry,
  formatFullTimestamp
} from '../services/supabaseTelemetry';
import { SUPABASE_PROJECT_INFO, SUPABASE_URL } from '../lib/supabase';
import { MockDatabase } from '../data';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'status' | 'sync' | 'history' | 'sql' | 'tables';
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'status'
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sync' | 'history' | 'sql' | 'tables'>(initialTab);
  
  // Health & Diagnostics
  const [health, setHealth] = useState<SupabaseHealthStatus>({
    connected: false,
    latencyMs: 0,
    lastChecked: null,
    lastCheckedFormatted: 'Iniciando...',
    message: 'Verificando estado...',
    isChecking: false,
  });

  // History state
  const [history, setHistory] = useState<SaveTelemetryRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Load current health & history
      setHistory(getConfirmationHistory());
      checkSupabasePing();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsubscribe = subscribeHealthStatus((status) => {
      setHealth(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualPing = async () => {
    await checkSupabasePing();
    setHistory(getConfirmationHistory());
  };

  const handleSyncLogs = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Enviando bitácora y registros de acceso a Supabase Cloud...');
    const res = await syncAuditAndAccessLogs();
    setIsSyncing(false);
    setSyncStatusMsg(res.message);
    setHistory(getConfirmationHistory());
  };

  const handleTestSaveTelemetry = async () => {
    const randomFolio = `OP-DEMO-${Math.floor(100 + Math.random() * 900)}`;
    const prevCount = MockDatabase.getProductionOrders().length;
    await recordSaveTelemetry({
      table: 'production_orders',
      folio: randomFolio,
      action: 'Creación de Orden de Prueba',
      countBefore: prevCount,
      countAfter: prevCount + 1,
      latencyMs: health.latencyMs || 42,
      status: 'success',
      payloadSummary: 'Demostración de Guardado Inmediato con Telemetría',
      source: 'cloud_sync',
    });
    setHistory(getConfirmationHistory());
  };

  const handleClearHistory = () => {
    if (confirm('¿Deseas vaciar el historial local de confirmaciones de guardado?')) {
      clearConfirmationHistory();
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSQL = () => {
    const element = document.createElement('a');
    const file = new Blob([SUPABASE_SQL_SCRIPT], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'supabase_erp_materiasprimas_schema_seeds.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    const res = await seedSupabaseFromClient();
    setSeedResult(res);
    setIsSeeding(false);
    await checkSupabasePing();
  };

  const isConnected = health.connected;
  const latency = health.latencyMs;

  const filteredHistory = history.filter(item => {
    if (!historyFilter) return true;
    const term = historyFilter.toLowerCase();
    return (
      item.folio.toLowerCase().includes(term) ||
      item.table.toLowerCase().includes(term) ||
      item.action.toLowerCase().includes(term) ||
      item.formattedDate.toLowerCase().includes(term)
    );
  });

  const tablesList = [
    { name: 'users', desc: 'Usuarios, roles y permisos de panificación (Admin, Producción, Almacén, Ventas, Reparto)', rows: 5 },
    { name: 'raw_materials', desc: 'Catálogo de materias primas, insumos, desechables y productos terminados', rows: 17 },
    { name: 'formulas', desc: 'Recetarios, proporciones de mezclas reposteras y costeo industrial', rows: 2 },
    { name: 'production_orders', desc: 'Órdenes de producción, lotes generados y validaciones de inocuidad', rows: 3 },
    { name: 'clients', desc: 'Directorio de clientes, listas de precios y líneas de crédito', rows: 4 },
    { name: 'sales', desc: 'Ventas, cotizaciones, facturación CFDI y remisiones', rows: 3 },
    { name: 'delivery_routes', desc: 'Rutas logísticas de choferes, evidencias fotográficas y firmas', rows: 2 },
    { name: 'stock_movements', desc: 'Kardex continuo, entradas por compra, mermas y consumos de OP', rows: 5 },
    { name: 'purchase_orders', desc: 'Órdenes de compra a proveedores de harinas, lácteos y químicos', rows: 2 },
    { name: 'transfer_sheets', desc: 'Hojas oficiales de traslado de productos con folios y destinos', rows: 1 },
    { name: 'sale_notes', desc: 'Notas de venta comerciales Miauloo foliadas', rows: 1 },
    { name: 'audit_logs', desc: 'Bitácora inmutable de auditoría de seguridad y movimientos clave', rows: 4 },
    { name: 'system_config', desc: 'Límites de descuento y parámetros crediticios del ERP', rows: 1 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header con Semáforo en Vivo & Latencia en ms */}
        <div className="bg-slate-950 text-white p-5 flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="font-extrabold text-base tracking-tight text-white">Centro Inteligente Supabase</h3>
                
                {/* Semáforo en Vivo de 2 Estados (🟢 / 🔴) */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-900 border-slate-700">
                  <span className="flex h-2.5 w-2.5 relative">
                    {isConnected ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </>
                    )}
                  </span>
                  <span className={isConnected ? 'text-emerald-300' : 'text-rose-300'}>
                    {isConnected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>

                {/* Medición de Latencia en ms */}
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                  !isConnected 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : latency < 120 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <Zap className="w-3 h-3" />
                  {health.isChecking ? '...' : `${latency} ms`}
                </span>
              </div>

              <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                <span>{SUPABASE_PROJECT_INFO.projectId}</span>
                <span>•</span>
                <span className="text-slate-500 truncate max-w-xs">{SUPABASE_URL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1. Comprobación a Demanda en 1 Clic */}
            <button
              onClick={handleManualPing}
              disabled={health.isChecking}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${health.isChecking ? 'animate-spin' : ''}`} />
              <span>{health.isChecking ? 'Comprobando...' : 'Verificar Conexión'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-5 border-b border-slate-200 flex space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. Diagnóstico & Semáforo</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>2. Sincronización Bitácora & Accesos</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>3. Historial de Confirmaciones ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>4. Script SQL Completo</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'tables'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>5. Catálogo de Tablas (13)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* TAB 1: DIAGNÓSTICO & SEMÁFORO EN VIVO */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              
              {/* Top Banner Status */}
              <div className={`p-6 rounded-2xl border ${
                isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isConnected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    }`}>
                      {isConnected ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-lg">
                          {isConnected ? 'Conexión Estable con Supabase Cloud' : 'Desconectado o Tablas Pendientes'}
                        </h4>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isConnected ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                        }`}>
                          {isConnected ? '🟢 En Línea' : '🔴 Error'}
                        </span>
                      </div>
                      
                      <p className="text-sm mt-1 text-slate-700 font-medium">
                        {health.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                        <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Latencia: <strong>{latency} ms</strong> ({latency < 120 ? 'Excelente' : latency < 350 ? 'Normal' : 'Elevada'})
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Última verificación: <strong>{health.lastCheckedFormatted}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleManualPing}
                    disabled={health.isChecking}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${health.isChecking ? 'animate-spin text-emerald-400' : ''}`} />
                    Lanzar Ping (1 Clic)
                  </button>
                </div>
              </div>

              {/* 4 Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Semáforo en Vivo & Latencia */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-emerald-600" /> Semáforo en Vivo
                    </span>
                    <span className="flex h-2.5 w-2.5 relative">
                      {isConnected ? (
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 animate-ping"></span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Monitoreo constante con animación de pulso verde y detección de fallos de red.
                  </p>
                  <div className="text-xl font-extrabold font-mono text-slate-900 pt-1">
                    {latency} <span className="text-xs text-slate-400">ms ping</span>
                  </div>
                </div>

                {/* 2. Heartbeat Monitor */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-600" /> Heartbeat 25s
                    </span>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Sondeo periódico en segundo plano cada 25 segundos sin degradar el navegador.
                  </p>
                  <div className="text-xs font-mono font-bold text-indigo-900 pt-1">
                    Intervalo: 25,000 ms
                  </div>
                </div>

                {/* 3. Telemetría de Guardado */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" /> Conteo N_prev → N_post
                    </span>
                    <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                      Toast Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Auditoría matemática de conteo antes vs después en cada inserción con estampa completa.
                  </p>
                  <button
                    onClick={handleTestSaveTelemetry}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline block pt-1"
                  >
                    Probar Notificación Toast ↗
                  </button>
                </div>

              </div>

              {/* Direct links & Seeder */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h5 className="font-extrabold text-sm text-white">Siembra Inicial de Datos (Seed API)</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Inserta automáticamente todos los usuarios, materias primas, fórmulas y clientes si las tablas ya existen en Supabase.
                    </p>
                  </div>

                  <button
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
                    {isSeeding ? 'Sembrando Datos...' : 'Sembrar Datos por API'}
                  </button>
                </div>

                {seedResult && (
                  <div className={`p-3.5 rounded-xl text-xs font-medium border ${
                    seedResult.success 
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}>
                    <p className="font-bold">{seedResult.message}</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SINCRONIZACIÓN INTELIGENTE DE BITÁCORA Y ACCESOS */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Sincronización de Bitácora de Auditoría y Accesos
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Transfiere todos los registros de auditoría, accesos por PIN/rol y eventos de caseta/campo generados localmente hacia la tabla inmutable <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-mono">public.audit_logs</code> en Supabase Cloud.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncLogs}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <Send className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar a la Nube (1 Clic)'}
                  </button>
                </div>

                {syncStatusMsg && (
                  <div className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono border border-slate-800 flex items-center justify-between">
                    <span>{syncStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Vista previa de registros de auditoría */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                    Registros en Bitácora Local ({MockDatabase.getAuditLogs().length} eventos)
                  </h5>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Tabla destino: audit_logs
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {MockDatabase.getAuditLogs().map((log) => (
                    <div key={log.id} className="p-3.5 flex items-start justify-between text-xs hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.user}</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                            {log.module}
                          </span>
                          <span className="font-semibold text-emerald-700">{log.action}</span>
                        </div>
                        <p className="text-slate-500 text-[11px]">{log.details}</p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PESTAÑA DE HISTORIAL DE CONFIRMACIONES (ÚLTIMAS 30 OPERACIONES) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Historial de Confirmaciones & Telemetría (Últimas 30 Operaciones)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trazabilidad en tiempo real con conteo previo vs posterior (N_prev → N_post), latencia exacta en ms y estampa completa.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTestSaveTelemetry}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                  >
                    + Simular Guardado
                  </button>

                  <button
                    onClick={handleClearHistory}
                    disabled={history.length === 0}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold px-3 py-2 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filtrar por folio, tabla, acción o fecha..."
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* History Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {filteredHistory.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium text-slate-500">
                      No hay registros de telemetría aún. Cada vez que guardes una orden, movimiento, nota o sincronices, aparecerá aquí.
                    </p>
                    <button
                      onClick={handleTestSaveTelemetry}
                      className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md hover:bg-emerald-700 transition-all"
                    >
                      Generar Registro de Prueba
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white border-b border-slate-800 text-[11px] uppercase font-mono tracking-wider">
                          <th className="py-3 px-3.5">Estado</th>
                          <th className="py-3 px-3.5">Estampa Completa (Día & Hora)</th>
                          <th className="py-3 px-3.5">Tabla & Folio</th>
                          <th className="py-3 px-3.5">Acción</th>
                          <th className="py-3 px-3.5">Auditoría Conteo (N_prev → N_post)</th>
                          <th className="py-3 px-3.5">Latencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {filteredHistory.map((item) => {
                          const isOk = item.status === 'success';
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                  {isOk ? 'Persistido' : 'Error'}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                                {item.formattedDate}
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900">{item.folio}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{item.table}</div>
                              </td>

                              <td className="py-3 px-3.5 text-slate-800 font-medium">
                                <div>{item.action}</div>
                                {item.payloadSummary && (
                                  <div className="text-[10px] text-slate-400">{item.payloadSummary}</div>
                                )}
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400 font-semibold">{item.countBefore}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-emerald-700 font-bold">{item.countAfter}</span>
                                  {item.countAfter > item.countBefore && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-sans font-bold">
                                      +1
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold">
                                <span className={`text-[11px] ${
                                  item.latencyMs < 120 ? 'text-emerald-600' : item.latencyMs < 350 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  ⚡ {item.latencyMs} ms
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SCRIPT SQL COMPLETO */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Script SQL DDL + DML (13 Tablas y Políticas RLS)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pega este script en el SQL Editor de tu panel de Supabase para inicializar la base de datos completa.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopySQL}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar SQL'}</span>
                  </button>

                  <button
                    onClick={handleDownloadSQL}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .sql</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/mwtzisudncwrlsizmgap/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Code viewer */}
              <div className="relative rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 shadow-xl overflow-hidden font-mono text-xs">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                  <span>supabase_erp_materiasprimas_schema_seeds.sql (750+ líneas)</span>
                  <span className="text-emerald-400 font-bold">13 Tablas • RLS • 100% Compatible</span>
                </div>
                <pre className="p-4 max-h-96 overflow-y-auto leading-relaxed text-slate-300 selection:bg-emerald-500 selection:text-black">
                  {SUPABASE_SQL_SCRIPT}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: CATÁLOGO DE TABLAS */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Estructura de las 13 Tablas del ERP</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Arquitectura relacional en PostgreSQL alojada en Supabase con Row Level Security.
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                  13 Tablas Diseñadas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tablesList.map((t, idx) => (
                  <div key={t.name} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-emerald-700">{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">~{t.rows} seeds</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-snug">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">Supabase REST Client `@supabase/supabase-js` conectado</span>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
