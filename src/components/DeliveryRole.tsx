import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Navigation, FileText, CheckCircle, Smartphone, Camera, 
  Trash2, CreditCard, DollarSign, Clock, MapPin, ChevronRight, PenTool 
} from 'lucide-react';
import { MockDatabase } from '../data';
import { DeliveryRoute, Sale, User } from '../types';

interface DeliveryRoleProps {
  onBack: () => void;
  currentUser: User;
}

export default function DeliveryRole({ onBack, currentUser }: DeliveryRoleProps) {
  // Database States
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // UI States
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isSignatureSaved, setIsSignatureSaved] = useState(false);
  const [photoEvidence, setPhotoEvidence] = useState<string | null>(null);
  const [isCashCollected, setIsCashCollected] = useState(false);

  // HTML5 Canvas Ref for Signature pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Load database
  const loadDatabase = () => {
    setRoutes(MockDatabase.getDeliveryRoutes());
    setSales(MockDatabase.getSales());
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Initialize Canvas for Signature Drawing
  useEffect(() => {
    if (selectedRouteId && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a'; // slate-900
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Clear canvas initially
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setIsSignatureSaved(false);
      setPhotoEvidence(null);
      setIsCashCollected(false);
    }
  }, [selectedRouteId]);

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const pos = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling when drawing on touch screens
    if (e.cancelable) e.preventDefault();

    const pos = getCoordinates(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    
    // Check if TouchEvent or MouseEvent
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setIsSignatureSaved(false);
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    setIsSignatureSaved(true);
    alert('Firma digital almacenada en memoria temporal.');
  };

  // Simular foto de recibo
  const simulatePhotoUpload = () => {
    setPhotoEvidence('evidencia_bultos_entregados.jpg');
    alert('Foto de evidencia cargada exitosamente.');
  };

  // COMPLETAR ENTREGA EN RUTA
  const handleCompleteDelivery = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Obtener la venta asociada para validar si es pago contra entrega
    const sale = sales.find(s => s.id === route.saleId);
    const requireCollection = sale?.paymentType === 'Contado' && sale.amountPaid === 0;

    if (requireCollection && !isCashCollected) {
      alert("Este pedido es Pago Contra Entrega. Debes registrar el Cobro en Sitio primero.");
      return;
    }

    if (!isSignatureSaved && !photoEvidence) {
      alert("Por favor captura la Firma Digital del cliente o sube la foto de evidencia antes de confirmar.");
      return;
    }

    // 1. Actualizar estatus de ruta de entrega
    const updatedRoutes = routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          status: 'entregado' as const,
          deliveredAt: new Date().toISOString(),
          evidenceSignature: isSignatureSaved ? 'SIGNATURE_CAPTURED' : undefined,
          evidencePhoto: photoEvidence || undefined,
          paymentCollected: requireCollection ? sale?.total : undefined,
          paymentMethod: requireCollection ? 'Efectivo en Sitio' : undefined
        };
      }
      return r;
    });

    // 2. Actualizar estatus de venta a Entregado y registrar cobro
    const updatedSales = sales.map(s => {
      if (s.id === route.saleId) {
        return {
          ...s,
          status: 'Entregado' as const,
          amountPaid: s.paymentType === 'Contado' ? s.total : s.amountPaid // pagado si cobró en sitio
        };
      }
      return s;
    });

    MockDatabase.saveDeliveryRoutes(updatedRoutes);
    MockDatabase.saveSales(updatedSales);
    MockDatabase.addAuditLog(
      currentUser.name,
      `Entregó pedido logístico`,
      'Logística',
      `Pedido entregado: ${route.saleId}. Cliente: ${route.clientName}. Firma guardada.`
    );

    loadDatabase();
    setSelectedRouteId(null);
    alert(`Entrega confirmada y registrada en el sistema de forma exitosa.\nEstatus de la venta ${route.saleId} cambiado a "Entregado".`);
  };

  // Estadísticas del repartidor
  const pendingDeliveries = routes.filter(r => r.status !== 'entregado');
  const completedDeliveries = routes.filter(r => r.status === 'entregado');
  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const selectedSale = selectedRoute ? sales.find(s => s.id === selectedRoute.saleId) : null;
  const isPaymentPending = selectedSale?.paymentType === 'Contado' && selectedSale.amountPaid === 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center font-sans" id="delivery_root">
      
      {/* PHONE CONTAINER MOCKUP (Optimized for Mobile view) */}
      <div className="w-full max-w-md bg-slate-950 flex flex-col min-h-screen border-x border-slate-800 shadow-2xl relative">
        
        {/* Mobile Header bar */}
        <header className="bg-slate-900 py-4 px-4 flex justify-between items-center border-b border-slate-800 sticky top-0 z-40">
          <div className="flex items-center space-x-2.5">
            <Truck className="w-5 h-5 text-amber-500 animate-bounce" />
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Ruta de Distribución</h2>
              <span className="text-[10px] text-slate-400 block">Conductor: {currentUser.name}</span>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            id="btn_deliv_logout"
          >
            Cerrar
          </button>
        </header>

        {/* Deliveries Screen */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          
          {/* Active Deliveries Overview Card */}
          {!selectedRouteId && (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Progreso del Día</p>
                <h3 className="text-base font-extrabold mt-1">
                  {completedDeliveries.length} de {routes.length} entregas completadas
                </h3>
              </div>
              <div className="h-10 w-10 rounded-full border-2 border-amber-500 flex items-center justify-center text-xs font-bold text-amber-500">
                {routes.length > 0 ? Math.round((completedDeliveries.length / routes.length) * 100) : 0}%
              </div>
            </div>
          )}

          {/* RUTA PENDIENTE LIST */}
          {!selectedRouteId ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Ruta Asignada</h4>
              
              {routes.length === 0 ? (
                <p className="text-center py-12 text-slate-500 text-xs italic">No tienes rutas o entregas asignadas hoy.</p>
              ) : (
                routes.map((route, idx) => {
                  const isDone = route.status === 'entregado';
                  
                  return (
                    <div 
                      key={route.id}
                      onClick={() => !isDone && setSelectedRouteId(route.id)}
                      className={`p-4 rounded-xl border transition-all flex justify-between items-center ${
                        isDone 
                          ? 'bg-slate-950 border-slate-900 opacity-60 pointer-events-none' 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 active:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.2 rounded">
                            PEDIDO #{idx + 1}
                          </span>
                          {isDone ? (
                            <span className="text-[9px] text-emerald-400 font-bold uppercase flex items-center">
                              <CheckCircle className="w-3 h-3 mr-0.5" /> Entregado
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-500 font-bold uppercase flex items-center animate-pulse">
                              <Clock className="w-3 h-3 mr-0.5" /> En Espera
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white mt-1.5">{route.clientName}</h3>
                        <p className="text-xs text-slate-400 mt-1 flex items-start">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{route.address}</span>
                        </p>
                      </div>

                      {!isDone && (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            
            // DETAILED RETAIL WORKSPACE FOR DELIVERY
            <div className="space-y-4">
              
              {/* Back Button */}
              <button
                onClick={() => setSelectedRouteId(null)}
                className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center mb-2"
              >
                ← Volver a Mi Ruta
              </button>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[9px] bg-slate-800 text-amber-400 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                  Detalle del Envío
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">{selectedRoute?.clientName}</h3>
                <p className="text-xs text-slate-300 flex items-start leading-relaxed">
                  <MapPin className="w-4 h-4 mr-1.5 text-amber-500 shrink-0 mt-0.5" />
                  {selectedRoute?.address}
                </p>
                <button
                  onClick={() => alert(`Simulando redireccionamiento a Google Maps para la dirección: ${selectedRoute?.address}`)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded flex items-center justify-center border border-slate-700 mt-1"
                >
                  <Navigation className="w-4 h-4 mr-1 text-amber-400" /> Iniciar Navegación GPS
                </button>
              </div>

              {/* Items Summary list */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-1 text-slate-400" /> Productos a Descargar / Entregar
                </h4>
                <p className="font-bold text-white text-sm py-1.5 leading-relaxed bg-slate-950 px-3 rounded border border-slate-850">
                  {selectedRoute?.itemsSummary}
                </p>
              </div>

              {/* CASH ON-SITE COLLECTION FORM */}
              {isPaymentPending && (
                <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded-xl space-y-3">
                  <div className="flex items-start space-x-2">
                    <DollarSign className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Cobro en Sitio Requerido</h4>
                      <p className="text-[11px] text-amber-300 mt-0.5">El pedido fue registrado como liquidación contra entrega.</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded border border-amber-950 flex justify-between items-center">
                    <span className="text-xs text-slate-300">Total a Recaudar:</span>
                    <span className="text-base font-black text-amber-400">${selectedSale?.total.toLocaleString()} MXN</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="cash-collect"
                      checked={isCashCollected}
                      onChange={(e) => setIsCashCollected(e.target.checked)}
                      className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-800 rounded focus:ring-amber-500"
                    />
                    <label htmlFor="cash-collect" className="text-xs font-semibold text-slate-200">
                      He cobrado el 100% en efectivo/tarjeta
                    </label>
                  </div>
                </div>
              )}

              {/* DIGITAL SIGNATURE PAD */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <PenTool className="w-4 h-4 mr-1 text-amber-500" /> Firma Digital de Recibido (Evidencia)
                </h4>

                <div className="border border-slate-850 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair block"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={clearCanvas}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-2 rounded border border-slate-700 flex-1"
                  >
                    Borrar Lienzo
                  </button>
                  <button
                    onClick={saveSignature}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-extrabold px-3 py-2 rounded flex-1"
                  >
                    Guardar Firma
                  </button>
                </div>
              </div>

              {/* PHOTO EVIDENCE */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Camera className="w-4 h-4 mr-1 text-slate-400" /> Evidencia Fotográfica (Opcional)
                </h4>

                {photoEvidence ? (
                  <div className="bg-slate-950 p-2 rounded border border-slate-850 flex justify-between items-center text-xs">
                    <span className="text-green-400 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" /> {photoEvidence}
                    </span>
                    <button onClick={() => setPhotoEvidence(null)} className="text-red-400 hover:text-red-500 font-bold">
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={simulatePhotoUpload}
                    className="w-full bg-slate-950 hover:bg-slate-900 border border-dashed border-slate-800 p-6 rounded-lg text-xs text-slate-500 flex flex-col items-center justify-center space-y-1"
                  >
                    <Camera className="w-8 h-8 text-slate-600 mb-1" />
                    <span>Tomar Foto o Subir Recibo</span>
                    <span className="text-[10px] text-slate-600">Simular captura de cámara</span>
                  </button>
                )}
              </div>

              {/* CONFIRM / SUBMIT BUTTON */}
              <button
                onClick={() => handleCompleteDelivery(selectedRouteId!)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> CONFIRMAR ENTREGA DE PEDIDO
              </button>

            </div>
          )}

        </main>

        {/* Mobile Navigation bar indicator (Pure style) */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-900 h-1 border-t border-slate-850 flex items-center justify-center">
          <div className="w-24 h-1.5 bg-slate-700 rounded-full my-1.5" />
        </div>

      </div>

    </div>
  );
}
