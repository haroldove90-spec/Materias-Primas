import { supabase, SUPABASE_PROJECT_INFO, SUPABASE_URL } from '../lib/supabase';
import { 
  INITIAL_USERS, 
  INITIAL_RAW_MATERIALS, 
  INITIAL_FORMULAS, 
  INITIAL_PRODUCTION_ORDERS, 
  INITIAL_CLIENTS, 
  INITIAL_SALES, 
  INITIAL_DELIVERY_ROUTES, 
  INITIAL_STOCK_MOVEMENTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_SYSTEM_CONFIG, 
  INITIAL_PURCHASE_ORDERS, 
  INITIAL_TRANSFER_SHEETS, 
  INITIAL_SALE_NOTES,
  INITIAL_SUPPLIERS,
  INITIAL_ACCOUNTS_RECEIVABLE,
  INITIAL_RECEIVABLE_PAYMENTS,
  MockDatabase
} from '../data';
import { 
  Supplier, 
  User, 
  Client, 
  RawMaterial, 
  Formula, 
  ProductionOrder, 
  Sale, 
  PurchaseOrder, 
  TransferSheet, 
  SaleNote, 
  DeliveryRoute,
  AccountReceivable,
  ReceivablePayment 
} from '../types';

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- ERP MATERIAS PRIMAS & INSUMOS DE PANIFICACIÓN / REPOSTERÍA
-- PROYECTO SUPABASE: ${SUPABASE_PROJECT_INFO.projectName}
-- ID DE PROYECTO: ${SUPABASE_PROJECT_INFO.projectId}
-- URL: ${SUPABASE_URL}
-- ==============================================================================

-- 1. TABLA: USUARIOS, CREDENCIALES Y PERFILES (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'production', 'warehouse', 'sales', 'delivery')),
    pin TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    avatar_url TEXT,
    job_title TEXT,
    department TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. TABLA: PROVEEDORES (suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfc TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    category TEXT DEFAULT 'Materia Prima',
    payment_terms TEXT DEFAULT 'Contado',
    credit_days INTEGER NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    current_debt NUMERIC NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    rating INTEGER NOT NULL DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- 3. TABLA: INVENTARIO DE MATERIAS PRIMAS E INSUMOS (raw_materials)
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    stock NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_stock NUMERIC NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0,
    sale_price NUMERIC,
    lote_proveedor TEXT,
    expiry_date DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS stock NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'kg';
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS min_stock NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS lote_proveedor TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.raw_materials DROP CONSTRAINT IF EXISTS raw_materials_unit_check;
CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON public.raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_raw_materials_active ON public.raw_materials(active);


-- 4. TABLA: FÓRMULAS Y RECETAS (formulas)
CREATE TABLE IF NOT EXISTS public.formulas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    batch_size_liters NUMERIC NOT NULL DEFAULT 100,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    packaging JSONB NOT NULL DEFAULT '[]'::jsonb,
    labor_cost NUMERIC NOT NULL DEFAULT 0,
    other_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABLA: ÓRDENES DE PRODUCCIÓN (production_orders)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id TEXT PRIMARY KEY,
    lote TEXT,
    formula_id TEXT REFERENCES public.formulas(id) ON DELETE SET NULL,
    quantity_liters NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    pre_check_passed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    operator TEXT NOT NULL,
    qa_check JSONB
);

-- 6. TABLA: CLIENTES Y CRÉDITOS (clients)
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfc TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    price_list TEXT NOT NULL DEFAULT 'Público',
    credit_days INTEGER NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    current_debt NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rfc TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_list TEXT NOT NULL DEFAULT 'Público';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS credit_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS current_debt NUMERIC NOT NULL DEFAULT 0;

-- 7. TABLA: VENTAS Y COTIZACIONES (sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'Contado',
    status TEXT NOT NULL DEFAULT 'Cotización',
    billing_type TEXT NOT NULL DEFAULT 'Remisión',
    cfdi_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    credit_days_left INTEGER,
    amount_paid NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'Contado';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Cotización';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'Remisión';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cfdi_status TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS credit_days_left INTEGER;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

-- 8. TABLA: RUTAS DE ENTREGA Y LOGÍSTICA (delivery_routes)
CREATE TABLE IF NOT EXISTS public.delivery_routes (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    delivered_at TIMESTAMPTZ,
    evidence_signature TEXT,
    evidence_photo TEXT,
    payment_collected NUMERIC DEFAULT 0,
    payment_method TEXT,
    items_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABLA: MOVIMIENTOS DE KARDEX / ALMACÉN (stock_movements)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    material_id TEXT REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    lote TEXT,
    lote_proveedor TEXT,
    user_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABLA: ÓRDENES DE COMPRA / PROCUREMENT (purchase_orders)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at TIMESTAMPTZ,
    invoice_number TEXT
);

-- 11. TABLA: HOJAS DE TRASLADO DE PRODUCTOS (transfer_sheets)
CREATE TABLE IF NOT EXISTS public.transfer_sheets (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL,
    date DATE NOT NULL,
    expedited_in TEXT,
    elaborated_by TEXT,
    client_name TEXT NOT NULL,
    destination TEXT NOT NULL,
    address TEXT,
    cp TEXT,
    colonia TEXT,
    fiscal_regimen TEXT,
    phone TEXT,
    client_no TEXT,
    rfc TEXT,
    curp TEXT,
    payment_form TEXT,
    operator TEXT,
    plate_no TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TABLA: NOTAS DE VENTA MIAULOO (sale_notes)
CREATE TABLE IF NOT EXISTS public.sale_notes (
    id TEXT PRIMARY KEY,
    note_no TEXT NOT NULL,
    date DATE NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. TABLA: BITÁCORA DE AUDITORÍA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    details TEXT
);

-- 14. TABLA: CONFIGURACIÓN GENERAL DEL SISTEMA (system_config)
DROP TABLE IF EXISTS public.system_config CASCADE;
CREATE TABLE public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_discount_public NUMERIC NOT NULL DEFAULT 5,
    max_discount_wholesale NUMERIC NOT NULL DEFAULT 12,
    max_discount_distributor NUMERIC NOT NULL DEFAULT 20,
    credit_days_allowed INTEGER NOT NULL DEFAULT 60,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. TABLA: CUENTAS POR COBRAR Y CARTERA DE CRÉDITO (accounts_receivable)
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    sale_id TEXT,
    concept TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    credit_days INTEGER NOT NULL DEFAULT 30,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'parcial', 'liquidado', 'vencido', 'cancelado')),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS concept TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS credit_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cxc_client_id ON public.accounts_receivable(client_id);
CREATE INDEX IF NOT EXISTS idx_cxc_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_cxc_due_date ON public.accounts_receivable(due_date);

-- 16. TABLA: REGISTRO DE PAGOS Y ABONOS (receivable_payments)
CREATE TABLE IF NOT EXISTS public.receivable_payments (
    id TEXT PRIMARY KEY,
    receivable_id TEXT REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    reference TEXT,
    received_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asegurar columnas en receivable_payments si ya existía
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS received_by TEXT NOT NULL DEFAULT 'Sistema';
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_pay_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_pay_client_id ON public.receivable_payments(client_id);

-- ==============================================================================
-- HABILITACIÓN DE ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura anónimas públicas para la App
DROP POLICY IF EXISTS "Permitir todo a anon users" ON public.users;
CREATE POLICY "Permitir todo a anon users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon suppliers" ON public.suppliers;
CREATE POLICY "Permitir todo a anon suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon raw_materials" ON public.raw_materials;
CREATE POLICY "Permitir todo a anon raw_materials" ON public.raw_materials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon formulas" ON public.formulas;
CREATE POLICY "Permitir todo a anon formulas" ON public.formulas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon production_orders" ON public.production_orders;
CREATE POLICY "Permitir todo a anon production_orders" ON public.production_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon clients" ON public.clients;
CREATE POLICY "Permitir todo a anon clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon sales" ON public.sales;
CREATE POLICY "Permitir todo a anon sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon delivery_routes" ON public.delivery_routes;
CREATE POLICY "Permitir todo a anon delivery_routes" ON public.delivery_routes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon stock_movements" ON public.stock_movements;
CREATE POLICY "Permitir todo a anon stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon purchase_orders" ON public.purchase_orders;
CREATE POLICY "Permitir todo a anon purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon transfer_sheets" ON public.transfer_sheets;
CREATE POLICY "Permitir todo a anon transfer_sheets" ON public.transfer_sheets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon sale_notes" ON public.sale_notes;
CREATE POLICY "Permitir todo a anon sale_notes" ON public.sale_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir todo a anon audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon system_config" ON public.system_config;
CREATE POLICY "Permitir todo a anon system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Permitir todo a anon accounts_receivable" ON public.accounts_receivable FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon receivable_payments" ON public.receivable_payments;
CREATE POLICY "Permitir todo a anon receivable_payments" ON public.receivable_payments FOR ALL USING (true) WITH CHECK (true);

-- Permisos globales para anon y authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- INSERCIÓN DE DATOS DE PRUEBA / SEED DATA
-- ==============================================================================

-- 1. USUARIOS
INSERT INTO public.users (id, name, username, email, role, pin, active, permissions)
VALUES
('u-harold', 'Harold Anguiano Morales', 'haroldo90', 'haroldo90@hotmail.com', 'admin', 'Chevropar#1970', true, '["*"]'::jsonb),
('u-1', 'Jonathan (Gerente)', 'jonathan', 'gerencia@miauloo.com', 'admin', '1111', true, '["dashboard", "finanzas", "configuracion"]'::jsonb),
('u-2', 'Diana (Producción)', 'diana_prod', 'produccion@miauloo.com', 'production', '2222', true, '["formulas", "ordenes"]'::jsonb),
('u-3', 'Carlos (Almacenista)', 'carlos_alm', 'almacen@miauloo.com', 'warehouse', '3333', true, '["inventario", "trazabilidad"]'::jsonb),
('u-4', 'Mariana (Agente Ventas)', 'mariana_vta', 'ventas@miauloo.com', 'sales', '4444', true, '["crm", "caja"]'::jsonb),
('u-5', 'Pedro (Repartidor)', 'pedro_rep', 'reparto@miauloo.com', 'delivery', '5555', true, '["entregas"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    pin = EXCLUDED.pin,
    active = EXCLUDED.active,
    permissions = EXCLUDED.permissions;

-- 1.5 PROVEEDORES
INSERT INTO public.suppliers (id, name, rfc, contact_name, email, phone, whatsapp, address, category, payment_terms, credit_days, credit_limit, current_debt, active, rating, notes)
VALUES
('supp-1', 'Distribuidora Harinera del Centro', 'DHC980115XX1', 'Ing. Roberto Gómez', 'ventas@harineradelcentro.com', '477-889-1122', '4778891122', 'Parque Industrial Las Colinas, Silao, Gto.', 'Materia Prima', 'Crédito 30 días', 30, 80000, 15000, true, 5, 'Proveedor de harinas extra finas y mejoradores.'),
('supp-2', 'Grenetinas Premium de Occidente', 'GPO040312BB2', 'Lic. Patricia Vega', 'contacto@grenetinasoccidente.com', '333-667-2244', '3336672244', 'Av. Solidaridad 1200, Zapopan, Jal.', 'Materia Prima', 'Crédito 15 días', 15, 50000, 25000, true, 5, 'Grenetina bloom alto y colágeno hidrolizado.'),
('supp-3', 'Envases & Domos Plásticos del Bajío', 'EDP120820CC3', 'Carlos Santillán', 'pedidos@envasesbajio.com', '427-112-3344', '4271123344', 'Zona Industrial Valle de Oro, San Juan del Río, Qro.', 'Empaques', 'Contado', 0, 0, 0, true, 4, 'Domos, charolas doradas y capacillos.')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    rfc = EXCLUDED.rfc,
    contact_name = EXCLUDED.contact_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    address = EXCLUDED.address,
    category = EXCLUDED.category,
    payment_terms = EXCLUDED.payment_terms,
    credit_days = EXCLUDED.credit_days,
    credit_limit = EXCLUDED.credit_limit,
    current_debt = EXCLUDED.current_debt,
    active = EXCLUDED.active,
    rating = EXCLUDED.rating;

-- 2. MATERIAS PRIMAS E INSUMOS
INSERT INTO public.raw_materials (id, name, sku, stock, unit, min_stock, cost_per_unit, sale_price, lote_proveedor, expiry_date)
VALUES
('mat-1', 'Harina de Trigo Extra Fina', 'MP-HARI-01', 1500, 'kg', 200, 18.0, 28.0, 'PROV-HARI-901', '2027-06-30'),
('mat-2', 'Azúcar Estándar Premium', 'MP-AZUC-02', 1200, 'kg', 150, 22.0, 32.0, 'PROV-AZUC-554', '2027-12-15'),
('mat-3', 'Grenetina Hidrolizada 290 Bloom', 'MP-GREN-03', 350, 'kg', 50, 140.0, 195.0, 'PROV-GREN-302', '2028-04-10'),
('mat-4', 'Cocoa en Polvo Alcalina', 'MP-COCO-04', 400, 'kg', 60, 110.0, 155.0, 'PROV-COCO-112', '2027-09-22'),
('mat-5', 'Esencia de Vainilla Concentrada', 'MP-VAIN-05', 150, 'L', 20, 95.0, 145.0, 'PROV-SABO-880', '2028-02-18'),
('mat-6', 'Colorante Rojo Fresa Grado Alimenticio', 'MP-COLR-06', 80, 'L', 15, 120.0, 180.0, 'PROV-COLO-403', '2028-08-11'),
('mat-7', 'Mantequilla sin Sal', 'MP-MANT-07', 600, 'kg', 80, 85.0, 125.0, 'PROV-LACT-711', '2026-11-20'),
('mat-8', 'Crema Chantilly para Batir', 'MP-CREM-08', 450, 'L', 60, 65.0, 98.0, 'PROV-LACT-712', '2026-12-05'),
('mat-9', 'Domo de Plástico para Pastel Grande', 'DES-DOMO-09', 300, 'pzs', 50, 15.0, 24.0, 'PROV-DESE-220', '2030-01-01'),
('mat-10', 'Capacillo para Cupcake #72', 'DES-CAPA-10', 8000, 'pzs', 1000, 0.15, 0.35, 'PROV-DESE-221', '2030-01-01'),
('mat-11', 'Charola de Cartón Dorada Redonda 30cm', 'DES-CHAR-11', 500, 'pzs', 100, 8.0, 15.0, 'PROV-DESE-222', '2030-01-01'),
('mat-12', 'Vaso de Plástico Cristal 12oz', 'DES-VASO-12', 4000, 'pzs', 500, 1.20, 2.50, 'PROV-DESE-223', '2030-01-01'),
('mat-13', 'Molde de Silicón para Gelatina Corona', 'UTE-MOLD-13', 120, 'pzs', 20, 75.0, 120.0, 'PROV-UTEN-101', '2031-01-01'),
('mat-14', 'Manga Pastelera Desechable con 6 Duyas', 'UTE-MANG-14', 250, 'pzs', 30, 45.0, 75.0, 'PROV-UTEN-102', '2031-01-01'),
('mat-15', 'Vela de Bengala Infantil de Cumpleaños', 'UTE-VELA-15', 600, 'pzs', 100, 12.0, 20.0, 'PROV-DECO-330', '2029-01-01'),
('pt-1', 'Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg)', 'PT-MEZC-CH', 120, 'pzs', 20, 25.50, 65.0, 'LOTE-REC-101', '2027-05-01'),
('pt-2', 'Polvo Preparado para Gelatina de Fresa (Bolsa 1kg)', 'PT-GELA-FR', 85, 'pzs', 15, 34.20, 85.0, 'LOTE-REC-102', '2027-04-15')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    stock = EXCLUDED.stock,
    unit = EXCLUDED.unit,
    min_stock = EXCLUDED.min_stock,
    cost_per_unit = EXCLUDED.cost_per_unit,
    sale_price = EXCLUDED.sale_price,
    lote_proveedor = EXCLUDED.lote_proveedor,
    expiry_date = EXCLUDED.expiry_date;

-- 3. FÓRMULAS
INSERT INTO public.formulas (id, name, description, batch_size_liters, ingredients, packaging, labor_cost, other_cost)
VALUES
('f-1', 'Mezcla de Harina Preparada para Pastel de Chocolate (Lote 100kg / 100 Bolsas)', 'Fórmula de mezcla seca homogénea lista para repostería casera. Solo requiere agregar huevo y leche.', 100, '[{"materialId": "mat-1", "percentage": 65, "amountPerThousandLiters": 65}, {"materialId": "mat-2", "percentage": 20, "amountPerThousandLiters": 20}, {"materialId": "mat-4", "percentage": 15, "amountPerThousandLiters": 15}]'::jsonb, '[{"materialId": "mat-11", "quantity": 1, "cost": 8.0}]'::jsonb, 150, 50),
('f-2', 'Mezcla de Polvo Preparado para Gelatina de Fresa (Lote 100kg / 100 Bolsas)', 'Formulación de grenetina extra bloom con saborizante de vainilla y colorante rojo fresa brillante.', 100, '[{"materialId": "mat-2", "percentage": 80, "amountPerThousandLiters": 80}, {"materialId": "mat-3", "percentage": 19, "amountPerThousandLiters": 19}, {"materialId": "mat-5", "percentage": 0.5, "amountPerThousandLiters": 0.5}, {"materialId": "mat-6", "percentage": 0.5, "amountPerThousandLiters": 0.5}]'::jsonb, '[{"materialId": "mat-11", "quantity": 1, "cost": 8.0}]'::jsonb, 180, 60)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    batch_size_liters = EXCLUDED.batch_size_liters,
    ingredients = EXCLUDED.ingredients,
    packaging = EXCLUDED.packaging,
    labor_cost = EXCLUDED.labor_cost,
    other_cost = EXCLUDED.other_cost;

-- 4. ÓRDENES DE PRODUCCIÓN
INSERT INTO public.production_orders (id, formula_id, quantity_liters, status, created_at, started_at, completed_at, pre_check_passed, lote, operator)
VALUES
('op-1', 'f-1', 100, 'completed', '2026-07-02T09:00:00Z', '2026-07-02T10:00:00Z', '2026-07-02T14:30:00Z', true, 'LOTE-REC-101', 'Diana'),
('op-2', 'f-2', 100, 'completed', '2026-07-05T08:30:00Z', '2026-07-05T09:15:00Z', '2026-07-05T13:45:00Z', true, 'LOTE-REC-102', 'Diana'),
('op-3', 'f-1', 100, 'pending', '2026-07-08T11:00:00Z', NULL, NULL, false, NULL, 'Diana')
ON CONFLICT (id) DO UPDATE SET 
    formula_id = EXCLUDED.formula_id,
    quantity_liters = EXCLUDED.quantity_liters,
    status = EXCLUDED.status,
    pre_check_passed = EXCLUDED.pre_check_passed,
    lote = EXCLUDED.lote,
    operator = EXCLUDED.operator;

-- 5. CLIENTES
INSERT INTO public.clients (id, name, rfc, email, phone, price_list, credit_days, credit_limit, current_debt)
VALUES
('cli-1', 'Pastelería "El Maná del Cielo"', 'PMC180412AA1', 'contacto@pasteleriaelmana.com', '477-123-4567', 'Distribuidor', 30, 50000, 15000),
('cli-2', 'Repostera Dulces Creaciones S.A.', 'RDC200511XX2', 'ventas@dulcescreaciones.com', '333-987-6543', 'Mayoreo', 15, 30000, 6500),
('cli-3', 'Gelatinas y Postres Doña Tere', 'GPD150228BB9', 'donatere@gmail.com', '322-555-1234', 'Público', 0, 0, 0),
('cli-4', 'Panificadora El Buen Trigo', 'PBT120915CC3', 'panaderia@buentrigo.com', '818-444-9988', 'Mayoreo', 45, 25000, 24000)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    rfc = EXCLUDED.rfc,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    price_list = EXCLUDED.price_list,
    credit_days = EXCLUDED.credit_days,
    credit_limit = EXCLUDED.credit_limit,
    current_debt = EXCLUDED.current_debt;

-- 6. VENTAS
INSERT INTO public.sales (id, client_id, client_name, items, subtotal, tax, total, payment_type, status, billing_type, cfdi_status, created_at, credit_days_left, amount_paid)
VALUES
('vta-1', 'cli-1', 'Pastelería "El Maná del Cielo"', '[{"id": "item-1", "productName": "Mezcla Preparada para Pastel de Chocolate (Bolsa 1kg)", "quantity": 50, "unit": "pzs", "unitPrice": 42.0, "total": 2100}, {"id": "item-2", "productName": "Domo de Plástico para Pastel Grande", "quantity": 100, "unit": "pzs", "unitPrice": 24.0, "total": 2400}, {"id": "item-3", "productName": "Charola de Cartón Dorada Redonda 30cm", "quantity": 100, "unit": "pzs", "unitPrice": 15.0, "total": 1500}]'::jsonb, 6000, 960, 6960, 'Crédito', 'Pedido Activo', 'CFDI', 'Timbrado exitosamente (UUID: 4A8B-91F2)', '2026-07-07T14:30:00Z', 29, 0),
('vta-2', 'cli-2', 'Repostera Dulces Creaciones S.A.', '[{"id": "item-4", "productName": "Polvo Preparado para Gelatina de Fresa (Bolsa 1kg)", "quantity": 30, "unit": "pzs", "unitPrice": 55.0, "total": 1650}, {"id": "item-5", "productName": "Molde de Silicón para Gelatina Corona", "quantity": 5, "unit": "pzs", "unitPrice": 120.0, "total": 600}]'::jsonb, 2250, 360, 2610, 'Contado', 'Entregado', 'Remisión', NULL, '2026-07-06T10:15:00Z', 0, 2610),
('vta-3', 'cli-3', 'Gelatinas y Postres Doña Tere', '[{"id": "item-6", "productName": "Manga Pastelera Desechable con 6 Duyas", "quantity": 2, "unit": "pzs", "unitPrice": 75.0, "total": 150}, {"id": "item-7", "productName": "Vela de Bengala Infantil de Cumpleaños", "quantity": 20, "unit": "pzs", "unitPrice": 20.0, "total": 400}]'::jsonb, 550, 88, 638, 'Contado', 'Cotización', 'Remisión', NULL, '2026-07-08T15:00:00Z', 0, 0)
ON CONFLICT (id) DO UPDATE SET 
    client_id = EXCLUDED.client_id,
    client_name = EXCLUDED.client_name,
    items = EXCLUDED.items,
    subtotal = EXCLUDED.subtotal,
    tax = EXCLUDED.tax,
    total = EXCLUDED.total,
    payment_type = EXCLUDED.payment_type,
    status = EXCLUDED.status,
    billing_type = EXCLUDED.billing_type,
    cfdi_status = EXCLUDED.cfdi_status,
    amount_paid = EXCLUDED.amount_paid;

-- 7. RUTAS DE ENTREGA
INSERT INTO public.delivery_routes (id, sale_id, client_name, address, status, items_summary, payment_collected, payment_method, evidence_signature, evidence_photo, delivered_at)
VALUES
('rut-1', 'vta-1', 'Pastelería "El Maná del Cielo"', 'Blvd. Adolfo López Mateos 1820, Col. Centro, León, Gto.', 'en_ruta', '50 Bolsas Pastel Chocolate, 100 Domos Pastel, 100 Charolas Doradas', 0, NULL, NULL, NULL, NULL),
('rut-2', 'vta-2', 'Repostera Dulces Creaciones S.A.', 'Calzada Independencia Sur 445, Sector Reforma, Guadalajara, Jal.', 'entregado', '30 Bolsas Gelatina de Fresa, 5 Moldes de Silicón', 2610, 'Efectivo', 'FIRMA_DULCES_CREACIONES_MA', 'recepcion_reposteria.jpg', '2026-07-07T12:00:00Z')
ON CONFLICT (id) DO UPDATE SET 
    sale_id = EXCLUDED.sale_id,
    client_name = EXCLUDED.client_name,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    items_summary = EXCLUDED.items_summary,
    payment_collected = EXCLUDED.payment_collected,
    payment_method = EXCLUDED.payment_method;

-- 8. MOVIMIENTOS DE KARDEX
INSERT INTO public.stock_movements (id, material_id, type, quantity, date, lote, lote_proveedor, user_name, notes)
VALUES
('mov-1', 'mat-1', 'entrada_compra', 1500, '2026-07-01T10:00:00Z', NULL, 'PROV-HARI-901', 'Carlos', 'Abastecimiento Harina Fina - Factura 309'),
('mov-2', 'mat-1', 'salida_produccion', 65, '2026-07-02T10:15:00Z', 'LOTE-REC-101', NULL, 'Diana', 'Consumo para OP-1 Mezcla de Chocolate'),
('mov-3', 'pt-1', 'entrada_compra', 100, '2026-07-02T14:30:00Z', 'LOTE-REC-101', NULL, 'Diana', 'Empaque final de OP-1 (+100 Bolsas)'),
('mov-4', 'pt-1', 'salida_venta', 50, '2026-07-07T14:45:00Z', NULL, NULL, 'Mariana', 'Salida para Pastelería El Maná'),
('mov-5', 'mat-5', 'merma', 1, '2026-07-07T16:00:00Z', NULL, NULL, 'Carlos', 'Esencia derramada en zona de fraccionamiento')
ON CONFLICT (id) DO UPDATE SET 
    material_id = EXCLUDED.material_id,
    type = EXCLUDED.type,
    quantity = EXCLUDED.quantity,
    date = EXCLUDED.date,
    notes = EXCLUDED.notes;

-- 9. ÓRDENES DE COMPRA (Procurement)
INSERT INTO public.purchase_orders (id, supplier_name, items, subtotal, tax, total, status, created_at, received_at, invoice_number)
VALUES
('oc-1', 'Distribuidora Harinera del Centro', '[{"materialId": "mat-1", "materialName": "Harina de Trigo Extra Fina", "quantity": 1000, "unitPrice": 15.0, "total": 15000}]'::jsonb, 15000, 0, 15000, 'received', '2026-07-01T09:00:00Z', '2026-07-01T14:00:00Z', 'FAC-8892'),
('oc-2', 'Grenetinas Premium de Occidente', '[{"materialId": "mat-3", "materialName": "Grenetina Hidrolizada 290 Bloom", "quantity": 200, "unitPrice": 125.0, "total": 25000}]'::jsonb, 25000, 0, 25000, 'ordered', '2026-07-08T10:00:00Z', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET 
    supplier_name = EXCLUDED.supplier_name,
    items = EXCLUDED.items,
    subtotal = EXCLUDED.subtotal,
    tax = EXCLUDED.tax,
    total = EXCLUDED.total,
    status = EXCLUDED.status;

-- 10. HOJAS DE TRASLADO DE PRODUCTOS
INSERT INTO public.transfer_sheets (id, folio, date, expedited_in, elaborated_by, client_name, destination, address, cp, colonia, fiscal_regimen, phone, client_no, rfc, curp, payment_form, operator, plate_no, items, subtotal, tax, total, notes)
VALUES
('ts-1', 'SIM-270726', '2026-07-27', 'San Juan del Rio, Qro.', 'Areli Antonia Mireles Cruz', 'JORGE LUIS', 'SAN JUAN DEL RIO', 'Av. Juárez #104, Col. Centro', '76800', 'Centro', '601 - General de Ley Personas Morales', '(52) 427 116 9640', 'CLI-0042', 'BAMN8611098PA', 'BAMN8611098HQT', 'PPD - Pago en parcialidades o diferido', 'Pedro (Chofer Logistics)', 'UK-882-J', '[{"quantity": 20, "unit": "LTS", "description": "SOSA CAUSTICA", "unitPrice": 18.00, "total": 360.00}, {"quantity": 20, "unit": "LTS", "description": "HIPOCLORITO", "unitPrice": 11.00, "total": 220.00}]'::jsonb, 580.00, 0, 580.00, 'Entregar en horario matutino. Verificar sellos de seguridad.')
ON CONFLICT (id) DO UPDATE SET 
    folio = EXCLUDED.folio,
    date = EXCLUDED.date,
    client_name = EXCLUDED.client_name,
    destination = EXCLUDED.destination,
    items = EXCLUDED.items,
    total = EXCLUDED.total;

-- 11. NOTAS DE VENTA MIAULOO
INSERT INTO public.sale_notes (id, note_no, date, client_name, phone, city, items, subtotal, tax, total)
VALUES
('sn-1', '5075', '2026-07-28', 'MIAULOO S.A. DE C.V.', '4271169640', 'San Juan del Río, Qro.', '[{"pieces": 5, "product": "SOSA CAUSTICA LIQUIDA 1L", "unitPrice": 35.00, "total": 175.00}, {"pieces": 10, "product": "HIPOCLORITO DE SODIO CONCENTRADO 1L", "unitPrice": 22.00, "total": 220.00}]'::jsonb, 395.00, 0, 395.00)
ON CONFLICT (id) DO UPDATE SET 
    note_no = EXCLUDED.note_no,
    date = EXCLUDED.date,
    client_name = EXCLUDED.client_name,
    items = EXCLUDED.items,
    total = EXCLUDED.total;

-- 12. BITÁCORA DE AUDITORÍA
INSERT INTO public.audit_logs (id, user_name, action, module, timestamp, details)
VALUES
('aud-1', 'Jonathan', 'Inició sesión en el sistema', 'Autenticación', '2026-07-08T17:30:00Z', 'Navegación general al sistema'),
('aud-2', 'Diana', 'Actualizó receta de Gelatina', 'Fórmulas', '2026-07-08T12:15:00Z', 'Ajustó proporción de colorante para mejorar tonalidad'),
('aud-3', 'Carlos', 'Registró merma de insumos', 'Inventario', '2026-07-07T16:00:00Z', 'Derrame de 1 litro de Esencia de Vainilla'),
('aud-4', 'Jonathan', 'Autorizó crédito para cliente', 'Finanzas', '2026-07-05T14:00:00Z', 'Estableció límite para Panificadora El Buen Trigo')
ON CONFLICT (id) DO NOTHING;

-- 13. CONFIGURACIÓN DEL SISTEMA
INSERT INTO public.system_config (id, max_discount_public, max_discount_wholesale, max_discount_distributor, credit_days_allowed)
VALUES
('default', 5, 12, 20, 60)
ON CONFLICT (id) DO UPDATE SET 
    max_discount_public = EXCLUDED.max_discount_public,
    max_discount_wholesale = EXCLUDED.max_discount_wholesale,
    max_discount_distributor = EXCLUDED.max_discount_distributor,
    credit_days_allowed = EXCLUDED.credit_days_allowed;

-- 14. CUENTAS POR COBRAR Y CARTERA DE CRÉDITO
INSERT INTO public.accounts_receivable (id, folio, client_id, client_name, sale_id, concept, issue_date, due_date, credit_days, total_amount, amount_paid, remaining_balance, status, notes, active)
VALUES
('cxc-1', 'CXC-00101', 'cli-1', 'Pastelería "El Maná del Cielo"', 'vta-1', 'Venta a crédito de Insumos y Envases Pastelería (Factura CFDI 4A8B-91F2)', '2026-07-07', '2026-08-06', 30, 20000, 5000, 15000, 'parcial', 'Abono parcial recibido de $5,000 vía SPEI. Saldo restante de $15,000 en curso.', true),
('cxc-2', 'CXC-00102', 'cli-2', 'Repostera Dulces Creaciones S.A.', 'vta-2', 'Suministro de Gelatinas y Moldes (Remisión R-204)', '2026-07-12', '2026-07-27', 15, 6500, 0, 6500, 'pendiente', 'Crédito a 15 días autorizado por ventas.', true),
('cxc-3', 'CXC-00103', 'cli-4', 'Panificadora El Buen Trigo', 'vta-4', 'Pedido Harinas Extra Fina y Mejoradores Especiales', '2026-06-15', '2026-07-30', 45, 24000, 0, 24000, 'pendiente', 'Cliente en seguimiento de límite de crédito ($24,000 de $25,000).', true)
ON CONFLICT (id) DO UPDATE SET 
    folio = EXCLUDED.folio,
    client_name = EXCLUDED.client_name,
    concept = EXCLUDED.concept,
    due_date = EXCLUDED.due_date,
    credit_days = EXCLUDED.credit_days,
    total_amount = EXCLUDED.total_amount,
    amount_paid = EXCLUDED.amount_paid,
    remaining_balance = EXCLUDED.remaining_balance,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    active = EXCLUDED.active;

-- 15. HISTORIAL DE PAGOS Y ABONOS
INSERT INTO public.receivable_payments (id, receivable_id, client_id, date, amount, payment_method, reference, received_by, notes)
VALUES
('pay-1', 'cxc-1', 'cli-1', '2026-07-15', 5000, 'Transferencia SPEI', 'SPEI-BBVA-90812', 'Jonathan (Gerente)', 'Abono inicial a cuenta de factura 4A8B')
ON CONFLICT (id) DO UPDATE SET 
    amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method,
    reference = EXCLUDED.reference,
    notes = EXCLUDED.notes;

-- ==============================================================================
-- FIN DEL SCRIPT SQL PARA SUPABASE
-- ==============================================================================
`;

// Script SQL para vaciar datos de prueba / muestra directamente en Supabase
export const SUPABASE_PURGE_SAMPLE_DATA_SQL = `-- ==============================================================================
-- SCRIPT DE VACIADO TOTAL DE DATOS DE MUESTRA EN SUPABASE
-- Ejecuta este script en el Editor SQL de Supabase para dejar tu base limpia
-- ==============================================================================

-- 1. Vaciar pagos y cartera de crédito
DELETE FROM public.receivable_payments;
DELETE FROM public.accounts_receivable;

-- 2. Vaciar logística, entregas y ventas
DELETE FROM public.delivery_routes;
DELETE FROM public.sales;

-- 3. Vaciar movimientos de kardex y órdenes de compra
DELETE FROM public.stock_movements;
DELETE FROM public.purchase_orders;

-- 4. Vaciar traslados y notas de venta
DELETE FROM public.transfer_sheets;
DELETE FROM public.sale_notes;

-- 5. Vaciar producción, recetas y materias primas
DELETE FROM public.production_orders;
DELETE FROM public.formulas;
DELETE FROM public.raw_materials;

-- 6. Vaciar clientes, proveedores y bitácora
DELETE FROM public.clients;
DELETE FROM public.suppliers;
DELETE FROM public.audit_logs;

-- 7. Eliminar usuarios demo conservando únicamente al Administrador
DELETE FROM public.users WHERE role != 'admin';

-- Reajustar configuración general a valores iniciales por defecto
INSERT INTO public.system_config (id, max_discount_public, max_discount_wholesale, max_discount_distributor, credit_days_allowed)
VALUES ('default', 5, 12, 20, 60)
ON CONFLICT (id) DO UPDATE SET 
    max_discount_public = EXCLUDED.max_discount_public,
    max_discount_wholesale = EXCLUDED.max_discount_wholesale,
    max_discount_distributor = EXCLUDED.max_discount_distributor,
    credit_days_allowed = EXCLUDED.credit_days_allowed;

-- ==============================================================================
-- FIN DEL VACIADO - BASE DE DATOS LIMPIA Y LISTA PARA PRODUCCIÓN
-- ==============================================================================
`;

// Script de Esquema Limpio (Solo Estructura + Admin, sin datos de muestra)
export const SUPABASE_CLEAN_SQL_SCRIPT = `-- ==============================================================================
-- ERP MATERIAS PRIMAS & INSUMOS - ESQUEMA LIMPIO PARA PRODUCCIÓN
-- (Crea todas las 16 tablas, RLS, permisos y Administrador SIN datos de muestra)
-- ==============================================================================

-- 1. TABLA: USUARIOS (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'production', 'warehouse', 'sales', 'delivery')),
    pin TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    avatar_url TEXT,
    job_title TEXT,
    department TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. TABLA: PROVEEDORES (suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfc TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    category TEXT DEFAULT 'Materia Prima',
    payment_terms TEXT DEFAULT 'Contado',
    credit_days INTEGER NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    current_debt NUMERIC NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    rating INTEGER NOT NULL DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rfc TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. TABLA: INVENTARIO DE MATERIAS PRIMAS E INSUMOS (raw_materials)
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    stock NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_stock NUMERIC NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC NOT NULL DEFAULT 0,
    sale_price NUMERIC,
    lote_proveedor TEXT,
    expiry_date DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS stock NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'kg';
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS min_stock NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS lote_proveedor TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.raw_materials DROP CONSTRAINT IF EXISTS raw_materials_unit_check;
CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON public.raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_raw_materials_active ON public.raw_materials(active);

-- 4. TABLA: FÓRMULAS Y RECETAS (formulas)
CREATE TABLE IF NOT EXISTS public.formulas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    batch_size_liters NUMERIC NOT NULL DEFAULT 100,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    packaging JSONB NOT NULL DEFAULT '[]'::jsonb,
    labor_cost NUMERIC NOT NULL DEFAULT 0,
    other_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABLA: ÓRDENES DE PRODUCCIÓN (production_orders)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id TEXT PRIMARY KEY,
    lote TEXT,
    formula_id TEXT REFERENCES public.formulas(id) ON DELETE SET NULL,
    quantity_liters NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    pre_check_passed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    operator TEXT NOT NULL,
    qa_check JSONB
);

-- 6. TABLA: CLIENTES Y CRÉDITOS (clients)
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfc TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    price_list TEXT NOT NULL DEFAULT 'Público',
    credit_days INTEGER NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    current_debt NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rfc TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_list TEXT NOT NULL DEFAULT 'Público';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS credit_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS current_debt NUMERIC NOT NULL DEFAULT 0;

-- 7. TABLA: VENTAS Y COTIZACIONES (sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'Contado',
    status TEXT NOT NULL DEFAULT 'Cotización',
    billing_type TEXT NOT NULL DEFAULT 'Remisión',
    cfdi_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    credit_days_left INTEGER,
    amount_paid NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'Contado';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Cotización';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'Remisión';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cfdi_status TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS credit_days_left INTEGER;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

-- 8. TABLA: RUTAS DE ENTREGA Y LOGÍSTICA (delivery_routes)
CREATE TABLE IF NOT EXISTS public.delivery_routes (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente',
    delivered_at TIMESTAMPTZ,
    evidence_signature TEXT,
    evidence_photo TEXT,
    payment_collected NUMERIC DEFAULT 0,
    payment_method TEXT,
    items_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABLA: MOVIMIENTOS DE KARDEX / ALMACÉN (stock_movements)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    material_id TEXT REFERENCES public.raw_materials(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    lote TEXT,
    lote_proveedor TEXT,
    user_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABLA: ÓRDENES DE COMPRA / PROCUREMENT (purchase_orders)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at TIMESTAMPTZ,
    invoice_number TEXT
);

-- 11. TABLA: HOJAS DE TRASLADO DE PRODUCTOS (transfer_sheets)
CREATE TABLE IF NOT EXISTS public.transfer_sheets (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL,
    date DATE NOT NULL,
    expedited_in TEXT,
    elaborated_by TEXT,
    client_name TEXT NOT NULL,
    destination TEXT NOT NULL,
    address TEXT,
    cp TEXT,
    colonia TEXT,
    fiscal_regimen TEXT,
    phone TEXT,
    client_no TEXT,
    rfc TEXT,
    curp TEXT,
    payment_form TEXT,
    operator TEXT,
    plate_no TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TABLA: NOTAS DE VENTA MIAULOO (sale_notes)
CREATE TABLE IF NOT EXISTS public.sale_notes (
    id TEXT PRIMARY KEY,
    note_no TEXT NOT NULL,
    date DATE NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. TABLA: BITÁCORA DE AUDITORÍA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    details TEXT
);

-- 14. TABLA: CONFIGURACIÓN GENERAL DEL SISTEMA (system_config)
DROP TABLE IF EXISTS public.system_config CASCADE;
CREATE TABLE public.system_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_discount_public NUMERIC NOT NULL DEFAULT 5,
    max_discount_wholesale NUMERIC NOT NULL DEFAULT 12,
    max_discount_distributor NUMERIC NOT NULL DEFAULT 20,
    credit_days_allowed INTEGER NOT NULL DEFAULT 60,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. TABLA: CUENTAS POR COBRAR Y CARTERA DE CRÉDITO (accounts_receivable)
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    sale_id TEXT,
    concept TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    credit_days INTEGER NOT NULL DEFAULT 30,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'parcial', 'liquidado', 'vencido', 'cancelado')),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS folio TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS sale_id TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS concept TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS credit_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cxc_client_id ON public.accounts_receivable(client_id);
CREATE INDEX IF NOT EXISTS idx_cxc_status ON public.accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_cxc_due_date ON public.accounts_receivable(due_date);

-- 16. TABLA: REGISTRO DE PAGOS Y ABONOS (receivable_payments)
CREATE TABLE IF NOT EXISTS public.receivable_payments (
    id TEXT PRIMARY KEY,
    receivable_id TEXT REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    reference TEXT,
    received_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS received_by TEXT NOT NULL DEFAULT 'Sistema';
ALTER TABLE public.receivable_payments ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_pay_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_pay_client_id ON public.receivable_payments(client_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a anon users" ON public.users;
CREATE POLICY "Permitir todo a anon users" ON public.users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon suppliers" ON public.suppliers;
CREATE POLICY "Permitir todo a anon suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon raw_materials" ON public.raw_materials;
CREATE POLICY "Permitir todo a anon raw_materials" ON public.raw_materials FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon formulas" ON public.formulas;
CREATE POLICY "Permitir todo a anon formulas" ON public.formulas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon production_orders" ON public.production_orders;
CREATE POLICY "Permitir todo a anon production_orders" ON public.production_orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon clients" ON public.clients;
CREATE POLICY "Permitir todo a anon clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon sales" ON public.sales;
CREATE POLICY "Permitir todo a anon sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon delivery_routes" ON public.delivery_routes;
CREATE POLICY "Permitir todo a anon delivery_routes" ON public.delivery_routes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon stock_movements" ON public.stock_movements;
CREATE POLICY "Permitir todo a anon stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon purchase_orders" ON public.purchase_orders;
CREATE POLICY "Permitir todo a anon purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon transfer_sheets" ON public.transfer_sheets;
CREATE POLICY "Permitir todo a anon transfer_sheets" ON public.transfer_sheets FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon sale_notes" ON public.sale_notes;
CREATE POLICY "Permitir todo a anon sale_notes" ON public.sale_notes FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir todo a anon audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon system_config" ON public.system_config;
CREATE POLICY "Permitir todo a anon system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "Permitir todo a anon accounts_receivable" ON public.accounts_receivable FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir todo a anon receivable_payments" ON public.receivable_payments;
CREATE POLICY "Permitir todo a anon receivable_payments" ON public.receivable_payments FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ÚNICOS REGISTROS FUNDAMENTALES:
-- 1. Usuarios Administradores Maestros
INSERT INTO public.users (id, name, username, email, phone, role, pin, active, permissions, job_title, department)
VALUES
('u-harold', 'Harold Anguiano Morales', 'haroldo90', 'haroldo90@hotmail.com', '', 'admin', 'Chevropar#1970', true, '["*"]'::jsonb, 'Administrador General', 'Dirección General'),
('usr-1', 'Jonathan (Admin)', 'admin', 'gerencia@miauloo.com', '5512345678', 'admin', '1234', true, '["*"]'::jsonb, 'Director General', 'Dirección')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    pin = EXCLUDED.pin,
    active = EXCLUDED.active,
    permissions = EXCLUDED.permissions;

-- 2. Configuración General del Sistema
INSERT INTO public.system_config (id, max_discount_public, max_discount_wholesale, max_discount_distributor, credit_days_allowed)
VALUES
('default', 5, 12, 20, 60)
ON CONFLICT (id) DO UPDATE SET 
    max_discount_public = EXCLUDED.max_discount_public,
    max_discount_wholesale = EXCLUDED.max_discount_wholesale,
    max_discount_distributor = EXCLUDED.max_discount_distributor,
    credit_days_allowed = EXCLUDED.credit_days_allowed;

-- ==============================================================================
-- FIN DEL ESQUEMA LIMPIO PARA PRODUCCIÓN (Listo para registrar productos reales)
-- ==============================================================================
`;

// Función para purgar/vaciar todos los datos de muestra en Supabase Cloud
export async function clearSampleDataFromSupabase(keepAdmin = true): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const results: Record<string, any> = {};

    // 1. Pagos y Cartera
    const { error: errPay } = await supabase.from('receivable_payments').delete().neq('id', '___safe_key___');
    results.receivable_payments = errPay ? errPay.message : 'OK (Vaciado)';

    const { error: errCxc } = await supabase.from('accounts_receivable').delete().neq('id', '___safe_key___');
    results.accounts_receivable = errCxc ? errCxc.message : 'OK (Vaciado)';

    // 2. Rutas y Ventas
    const { error: errRoutes } = await supabase.from('delivery_routes').delete().neq('id', '___safe_key___');
    results.delivery_routes = errRoutes ? errRoutes.message : 'OK (Vaciado)';

    const { error: errSales } = await supabase.from('sales').delete().neq('id', '___safe_key___');
    results.sales = errSales ? errSales.message : 'OK (Vaciado)';

    // 3. Kardex y Compras
    const { error: errMov } = await supabase.from('stock_movements').delete().neq('id', '___safe_key___');
    results.stock_movements = errMov ? errMov.message : 'OK (Vaciado)';

    const { error: errPo } = await supabase.from('purchase_orders').delete().neq('id', '___safe_key___');
    results.purchase_orders = errPo ? errPo.message : 'OK (Vaciado)';

    // 4. Traslados y Notas
    const { error: errTs } = await supabase.from('transfer_sheets').delete().neq('id', '___safe_key___');
    results.transfer_sheets = errTs ? errTs.message : 'OK (Vaciado)';

    const { error: errSn } = await supabase.from('sale_notes').delete().neq('id', '___safe_key___');
    results.sale_notes = errSn ? errSn.message : 'OK (Vaciado)';

    // 5. Producción, Recetas y Materias Primas
    const { error: errProd } = await supabase.from('production_orders').delete().neq('id', '___safe_key___');
    results.production_orders = errProd ? errProd.message : 'OK (Vaciado)';

    const { error: errForm } = await supabase.from('formulas').delete().neq('id', '___safe_key___');
    results.formulas = errForm ? errForm.message : 'OK (Vaciado)';

    const { error: errMat } = await supabase.from('raw_materials').delete().neq('id', '___safe_key___');
    results.raw_materials = errMat ? errMat.message : 'OK (Vaciado)';

    // 6. Directorio Clientes, Proveedores y Auditoría
    const { error: errCli } = await supabase.from('clients').delete().neq('id', '___safe_key___');
    results.clients = errCli ? errCli.message : 'OK (Vaciado)';

    const { error: errSupp } = await supabase.from('suppliers').delete().neq('id', '___safe_key___');
    results.suppliers = errSupp ? errSupp.message : 'OK (Vaciado)';

    const { error: errAud } = await supabase.from('audit_logs').delete().neq('id', '___safe_key___');
    results.audit_logs = errAud ? errAud.message : 'OK (Vaciado)';

    // 7. Usuarios (conservar administrador para no perder acceso)
    if (keepAdmin) {
      const { error: errUsers } = await supabase.from('users').delete().neq('role', 'admin');
      results.users = errUsers ? errUsers.message : 'OK (Admin preservado)';
    } else {
      const { error: errUsers } = await supabase.from('users').delete().neq('id', '___safe_key___');
      results.users = errUsers ? errUsers.message : 'OK (Vaciado)';
    }

    return {
      success: true,
      message: 'Todos los datos de muestra fueron eliminados permanentemente de Supabase.',
      details: results
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Error al conectar con Supabase para vaciar datos.',
      details: error
    };
  }
}

// Helper for seeding all data into Supabase via REST API
export async function seedSupabaseFromClient(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const results: Record<string, any> = {};

    // 1. Users (with multi-tier fallback for schema compatibility)
    let { error: errUsers } = await supabase.from('users').upsert(
      INITIAL_USERS.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        pin: u.pin,
        active: u.active,
        permissions: u.permissions
      }))
    );

    if (errUsers) {
      const { error: coreErr } = await supabase.from('users').upsert(
        INITIAL_USERS.map(u => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          pin: u.pin
        }))
      );
      errUsers = coreErr;
    }
    results.users = errUsers ? errUsers.message : 'OK';

    // 2. Raw Materials
    const { error: errMat } = await supabase.from('raw_materials').upsert(
      INITIAL_RAW_MATERIALS.map(m => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
        stock: m.stock,
        unit: m.unit,
        min_stock: m.minStock,
        cost_per_unit: m.costPerUnit,
        lote_proveedor: m.loteProveedor,
        expiry_date: m.expiryDate
      }))
    );
    results.raw_materials = errMat ? errMat.message : 'OK';

    // 3. Formulas
    const { error: errForm } = await supabase.from('formulas').upsert(
      INITIAL_FORMULAS.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        batch_size_liters: f.batchSizeLiters,
        ingredients: f.ingredients,
        packaging: f.packaging,
        labor_cost: f.laborCost,
        other_cost: f.otherCost
      }))
    );
    results.formulas = errForm ? errForm.message : 'OK';

    // 4. Clients
    const { error: errCli } = await supabase.from('clients').upsert(
      INITIAL_CLIENTS.map(c => ({
        id: c.id,
        name: c.name,
        rfc: c.rfc,
        email: c.email,
        phone: c.phone,
        price_list: c.priceList,
        credit_days: c.creditDays,
        credit_limit: c.creditLimit,
        current_debt: c.currentDebt
      }))
    );
    results.clients = errCli ? errCli.message : 'OK';

    // 5. Sales
    const { error: errSales } = await supabase.from('sales').upsert(
      INITIAL_SALES.map(s => ({
        id: s.id,
        client_id: s.clientId,
        client_name: s.clientName,
        items: s.items,
        subtotal: s.subtotal,
        tax: s.tax,
        total: s.total,
        payment_type: s.paymentType,
        status: s.status,
        billing_type: s.billingType,
        cfdi_status: s.cfdiStatus,
        created_at: s.createdAt,
        credit_days_left: s.creditDaysLeft,
        amount_paid: s.amountPaid
      }))
    );
    results.sales = errSales ? errSales.message : 'OK';

    // 6. Production Orders
    const { error: errPo } = await supabase.from('production_orders').upsert(
      INITIAL_PRODUCTION_ORDERS.map(po => ({
        id: po.id,
        formula_id: po.formulaId,
        quantity_liters: po.quantityLiters,
        status: po.status,
        created_at: po.createdAt,
        started_at: po.startedAt,
        completed_at: po.completedAt,
        pre_check_passed: po.preCheckPassed,
        lote: po.lote,
        operator: po.operator,
        qa_check: po.qaCheck
      }))
    );
    results.production_orders = errPo ? errPo.message : 'OK';

    // 7. Delivery Routes
    const { error: errRoutes } = await supabase.from('delivery_routes').upsert(
      INITIAL_DELIVERY_ROUTES.map(r => ({
        id: r.id,
        sale_id: r.saleId,
        client_name: r.clientName,
        address: r.address,
        status: r.status,
        delivered_at: r.deliveredAt,
        evidence_signature: r.evidenceSignature,
        evidence_photo: r.evidencePhoto,
        payment_collected: r.paymentCollected,
        payment_method: r.paymentMethod,
        items_summary: r.itemsSummary
      }))
    );
    results.delivery_routes = errRoutes ? errRoutes.message : 'OK';

    // 8. Stock Movements
    const { error: errMov } = await supabase.from('stock_movements').upsert(
      INITIAL_STOCK_MOVEMENTS.map(m => ({
        id: m.id,
        material_id: m.materialId,
        type: m.type,
        quantity: m.quantity,
        date: m.date,
        lote: m.lote,
        lote_proveedor: m.loteProveedor,
        user_name: m.user,
        notes: m.notes
      }))
    );
    results.stock_movements = errMov ? errMov.message : 'OK';

    // 9. Purchase Orders
    const { error: errPur } = await supabase.from('purchase_orders').upsert(
      INITIAL_PURCHASE_ORDERS.map(p => ({
        id: p.id,
        supplier_name: p.supplierName,
        items: p.items,
        subtotal: p.subtotal,
        tax: p.tax,
        total: p.total,
        status: p.status,
        created_at: p.createdAt,
        received_at: p.receivedAt,
        invoice_number: p.invoiceNumber
      }))
    );
    results.purchase_orders = errPur ? errPur.message : 'OK';

    // 10. Transfer Sheets
    const { error: errTs } = await supabase.from('transfer_sheets').upsert(
      INITIAL_TRANSFER_SHEETS.map(ts => ({
        id: ts.id,
        folio: ts.folio,
        date: ts.date,
        expedited_in: ts.expeditedIn,
        elaborated_by: ts.elaboratedBy,
        client_name: ts.clientName,
        destination: ts.destination,
        address: ts.address,
        cp: ts.cp,
        colonia: ts.colonia,
        fiscal_regimen: ts.fiscalRegimen,
        phone: ts.phone,
        client_no: ts.clientNo,
        rfc: ts.rfc,
        curp: ts.curp,
        payment_form: ts.paymentForm,
        operator: ts.operator,
        plate_no: ts.plateNo,
        items: ts.items,
        subtotal: ts.subtotal,
        tax: ts.tax,
        total: ts.total,
        notes: ts.notes,
        created_at: ts.createdAt
      }))
    );
    results.transfer_sheets = errTs ? errTs.message : 'OK';

    // 11. Sale Notes
    const { error: errSn } = await supabase.from('sale_notes').upsert(
      INITIAL_SALE_NOTES.map(sn => ({
        id: sn.id,
        note_no: sn.noteNo,
        date: sn.date,
        client_name: sn.clientName,
        phone: sn.phone,
        city: sn.city,
        items: sn.items,
        subtotal: sn.subtotal,
        tax: sn.tax,
        total: sn.total,
        created_at: sn.createdAt
      }))
    );
    results.sale_notes = errSn ? errSn.message : 'OK';

    // 12. Audit Logs
    const { error: errAud } = await supabase.from('audit_logs').upsert(
      INITIAL_AUDIT_LOGS.map(a => ({
        id: a.id,
        user_name: a.user,
        action: a.action,
        module: a.module,
        timestamp: a.timestamp,
        details: a.details
      }))
    );
    results.audit_logs = errAud ? errAud.message : 'OK';

    // 13. Suppliers
    const { error: errSupp } = await supabase.from('suppliers').upsert(
      INITIAL_SUPPLIERS.map(s => ({
        id: s.id,
        name: s.name,
        rfc: s.rfc,
        contact_name: s.contactName,
        email: s.email,
        phone: s.phone,
        address: s.address,
        category: s.category,
        payment_terms: s.paymentTerms,
        credit_days: s.creditDays,
        credit_limit: s.creditLimit,
        current_debt: s.currentDebt,
        active: s.active,
        rating: s.rating,
        notes: s.notes,
        created_at: s.createdAt
      }))
    );
    results.suppliers = errSupp ? errSupp.message : 'OK';

    // 14. Accounts Receivable
    const { error: errCxc } = await supabase.from('accounts_receivable').upsert(
      INITIAL_ACCOUNTS_RECEIVABLE.map(c => ({
        id: c.id,
        folio: c.folio,
        client_id: c.clientId,
        client_name: c.clientName,
        sale_id: c.saleId || null,
        concept: c.concept,
        issue_date: c.issueDate,
        due_date: c.dueDate,
        credit_days: c.creditDays,
        total_amount: c.totalAmount,
        amount_paid: c.amountPaid,
        remaining_balance: c.remainingBalance,
        status: c.status,
        notes: c.notes || null,
        active: c.active !== undefined ? c.active : true,
        created_at: c.createdAt || new Date().toISOString()
      }))
    );
    results.accounts_receivable = errCxc ? errCxc.message : 'OK';

    // 15. Receivable Payments
    const { error: errPay } = await supabase.from('receivable_payments').upsert(
      INITIAL_RECEIVABLE_PAYMENTS.map(p => ({
        id: p.id,
        receivable_id: p.receivableId,
        client_id: p.clientId || null,
        date: p.date,
        amount: p.amount,
        payment_method: p.paymentMethod,
        reference: p.reference || null,
        received_by: p.receivedBy,
        notes: p.notes || null,
        created_at: p.createdAt || new Date().toISOString()
      }))
    );
    results.receivable_payments = errPay ? errPay.message : 'OK';

    // 16. System Config
    const sysConf = MockDatabase.getSystemConfig();
    const { error: errConf } = await supabase.from('system_config').upsert({
      id: 'default',
      max_discount_public: sysConf.maxDiscountPublic,
      max_discount_wholesale: sysConf.maxDiscountWholesale,
      max_discount_distributor: sysConf.maxDiscountDistributor,
      credit_days_allowed: sysConf.creditDaysAllowed,
      updated_at: new Date().toISOString()
    });
    results.system_config = errConf ? errConf.message : 'OK';


    // Check if any major error occurred (likely table doesn't exist yet before SQL is run)
    const errors = Object.entries(results).filter(([_, v]) => v !== 'OK');
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Algunas tablas aún no están creadas en Supabase. Ejecuta el script SQL en el Editor SQL de Supabase.',
        details: results
      };
    }

    return {
      success: true,
      message: '¡Todos los datos de prueba fueron sembrados e insertados con éxito en las tablas de Supabase!',
      details: results
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Error al conectar con Supabase',
      details: error
    };
  }
}

// Check real-time connection status with Supabase
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string; tablesCount?: number }> {
  try {
    const { count, error } = await supabase.from('raw_materials').select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          connected: false,
          message: 'Conectado a la API de Supabase, pero falta ejecutar el script SQL para crear las tablas.'
        };
      }
      return {
        connected: false,
        message: `Error de respuesta Supabase: ${error.message}`
      };
    }
    return {
      connected: true,
      message: 'Conectado y sincronizado con Supabase Cloud',
      tablesCount: count ?? 0
    };
  } catch (e: any) {
    return {
      connected: false,
      message: `Sin conexión a Supabase: ${e?.message || 'Error desconocido'}`
    };
  }
}

// Fetch all active users from Supabase Cloud safely without assuming created_at column exists
export async function fetchUsersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.warn('Supabase fetchUsers error:', error.message);
      throw error;
    }
    
    // Normalize and sanitize users
    const normalizedUsers = (data || []).map((u: any) => ({
      id: String(u.id || `u-${Math.random().toString(36).substr(2, 6)}`),
      name: u.name || 'Usuario',
      username: (u.username || u.name || 'usuario').toLowerCase().trim(),
      email: u.email || (u.username && u.username.includes('@') ? u.username : `${u.username || 'usuario'}@miauloo.com`),
      phone: u.phone || '',
      role: u.role || 'sales',
      pin: String(u.pin || '1234'),
      active: u.active !== undefined ? Boolean(u.active) : true,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      avatarUrl: u.avatar_url || '',
      jobTitle: u.job_title || '',
      department: u.department || '',
      bio: u.bio || '',
      createdAt: u.created_at || new Date().toISOString()
    }));

    return { success: true, data: normalizedUsers };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al obtener usuarios de Supabase' };
  }
}

// Directly update user role in Supabase and sync with local storage
export async function updateUserRoleInSupabase(userId: string, newRole: 'admin' | 'production' | 'warehouse' | 'sales' | 'delivery') {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al actualizar el rol en Supabase' };
  }
}

// Safely upsert a user into Supabase with schema fallback
export async function saveUserToSupabase(user: Partial<User> & {
  id: string;
  name: string;
  username: string;
  role: string;
  pin: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try full schema with profile fields
    const { error: fullErr } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email || `${user.username}@miauloo.com`,
      phone: user.phone || '',
      role: user.role,
      pin: user.pin,
      active: user.active ?? true,
      permissions: user.permissions || [],
      avatar_url: user.avatarUrl || '',
      job_title: user.jobTitle || '',
      department: user.department || '',
      bio: user.bio || ''
    });

    if (!fullErr) {
      return { success: true };
    }

    console.warn('Full schema user insert warning, attempting standard schema fallback:', fullErr.message);

    // 2. Fallback to standard columns
    const { error: standardErr } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email || `${user.username}@miauloo.com`,
      role: user.role,
      pin: user.pin,
      active: user.active ?? true,
      permissions: user.permissions || []
    });

    if (!standardErr) {
      return { success: true };
    }

    // 3. Fallback to core columns (id, name, username, role, pin)
    const { error: coreErr } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      pin: user.pin
    });

    if (coreErr) {
      console.error('Supabase core column user upsert failed:', coreErr.message);
      return { success: false, error: coreErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al guardar usuario en Supabase' };
  }
}

// Delete user from Supabase
export async function deleteUserFromSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar usuario' };
  }
}

// ==============================================================================
// PROVEEDORES (SUPPLIERS) CRUD & SYNC
// ==============================================================================

export async function fetchSuppliersFromSupabase(): Promise<{ success: boolean; data?: Supplier[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted: Supplier[] = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      rfc: s.rfc || '',
      contactName: s.contact_name || '',
      email: s.email || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || s.phone || '',
      address: s.address || '',
      category: s.category || 'Materia Prima',
      paymentTerms: s.payment_terms || 'Contado',
      creditDays: Number(s.credit_days || 0),
      creditLimit: Number(s.credit_limit || 0),
      currentDebt: Number(s.current_debt || 0),
      active: s.active !== undefined ? Boolean(s.active) : true,
      rating: Number(s.rating || 5),
      notes: s.notes || '',
      createdAt: s.created_at || new Date().toISOString()
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    console.warn('Supabase fetchSuppliers error:', e?.message);
    return { success: false, error: e?.message || 'Error al obtener proveedores' };
  }
}

export async function saveSupplierToSupabase(supplier: Supplier): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('suppliers').upsert({
      id: supplier.id,
      name: supplier.name,
      rfc: supplier.rfc || null,
      contact_name: supplier.contactName || null,
      email: supplier.email || null,
      phone: supplier.phone || null,
      whatsapp: supplier.whatsapp || supplier.phone || null,
      address: supplier.address || null,
      category: supplier.category || 'Materia Prima',
      payment_terms: supplier.paymentTerms || 'Contado',
      credit_days: supplier.creditDays || 0,
      credit_limit: supplier.creditLimit || 0,
      current_debt: supplier.currentDebt || 0,
      active: supplier.active ?? true,
      rating: supplier.rating || 5,
      notes: supplier.notes || null,
      created_at: supplier.createdAt || new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('saveSupplierToSupabase error:', e?.message);
    return { success: false, error: e?.message || 'Error al guardar proveedor en Supabase' };
  }
}

export async function deleteSupplierInSupabase(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar proveedor' };
  }
}

// ==============================================================================
// CLIENTES (CLIENTS) CRUD & SYNC
// ==============================================================================

export async function fetchClientsFromSupabase(): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted: Client[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      rfc: c.rfc || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || c.phone || '',
      address: c.address || '',
      priceList: c.price_list || 'Público',
      creditDays: Number(c.credit_days || 0),
      creditLimit: Number(c.credit_limit || 0),
      currentDebt: Number(c.current_debt || 0),
      createdAt: c.created_at || new Date().toISOString()
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    console.warn('Supabase fetchClients error:', e?.message);
    return { success: false, error: e?.message || 'Error al obtener clientes' };
  }
}

export async function saveClientToSupabase(client: Client): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('clients').upsert({
      id: client.id,
      name: client.name,
      rfc: client.rfc || null,
      email: client.email || null,
      phone: client.phone || null,
      whatsapp: client.whatsapp || client.phone || null,
      address: client.address || null,
      price_list: client.priceList || 'Público',
      credit_days: client.creditDays || 0,
      credit_limit: client.creditLimit || 0,
      current_debt: client.currentDebt || 0,
      created_at: client.createdAt || new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('saveClientToSupabase error:', e?.message);
    return { success: false, error: e?.message || 'Error al guardar cliente en Supabase' };
  }
}

export async function deleteClientInSupabase(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar cliente' };
  }
}

// ==============================================================================
// MATERIAS PRIMAS (RAW MATERIALS) CRUD & SYNC
// ==============================================================================

export async function fetchRawMaterialsFromSupabase(): Promise<{ success: boolean; data?: RawMaterial[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted: RawMaterial[] = (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      sku: m.sku || '',
      stock: Number(m.stock || 0),
      unit: m.unit || 'kg',
      minStock: Number(m.min_stock || 0),
      costPerUnit: Number(m.cost_per_unit || 0),
      salePrice: m.sale_price !== null && m.sale_price !== undefined ? Number(m.sale_price) : undefined,
      loteProveedor: m.lote_proveedor || '',
      expiryDate: m.expiry_date || '',
      active: m.active !== undefined ? Boolean(m.active) : true,
      notes: m.notes || ''
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    console.warn('Supabase fetchRawMaterials error:', e?.message);
    return { success: false, error: e?.message || 'Error al obtener materias primas' };
  }
}

export async function saveRawMaterialToSupabase(material: RawMaterial): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('raw_materials').upsert({
      id: material.id,
      name: material.name,
      sku: material.sku,
      stock: material.stock,
      unit: material.unit,
      min_stock: material.minStock,
      cost_per_unit: material.costPerUnit,
      sale_price: material.salePrice !== undefined ? material.salePrice : null,
      lote_proveedor: material.loteProveedor || null,
      expiry_date: material.expiryDate || null,
      active: material.active !== undefined ? material.active : true,
      notes: material.notes || null,
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('saveRawMaterialToSupabase error:', e?.message);
    return { success: false, error: e?.message || 'Error al guardar materia prima en Supabase' };
  }
}

export async function deleteRawMaterialInSupabase(materialId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('raw_materials').delete().eq('id', materialId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar materia prima' };
  }
}

// ==============================================================================
// FÓRMULAS / RECETAS CRUD & SYNC
// ==============================================================================

export async function fetchFormulasFromSupabase(): Promise<{ success: boolean; data?: Formula[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('formulas')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted: Formula[] = (data || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      batchSizeLiters: Number(f.batch_size_liters || 1000),
      ingredients: Array.isArray(f.ingredients) ? f.ingredients : [],
      packaging: Array.isArray(f.packaging) ? f.packaging : [],
      laborCost: Number(f.labor_cost || 0),
      otherCost: Number(f.other_cost || 0),
      active: f.active ?? true
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener recetas' };
  }
}

export async function saveFormulaToSupabase(formula: Formula): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('formulas').upsert({
      id: formula.id,
      name: formula.name,
      description: formula.description,
      batch_size_liters: formula.batchSizeLiters,
      ingredients: formula.ingredients,
      packaging: formula.packaging,
      labor_cost: formula.laborCost,
      other_cost: formula.otherCost,
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar fórmula' };
  }
}

export async function deleteFormulaInSupabase(formulaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('formulas').delete().eq('id', formulaId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar fórmula' };
  }
}

// ==============================================================================
// ÓRDENES DE PRODUCCIÓN CRUD & SYNC
// ==============================================================================

export async function fetchProductionOrdersFromSupabase(): Promise<{ success: boolean; data?: ProductionOrder[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: ProductionOrder[] = (data || []).map((po: any) => ({
      id: po.id,
      lote: po.lote || undefined,
      formulaId: po.formula_id,
      quantityLiters: Number(po.quantity_liters || 0),
      status: po.status || 'pending',
      createdAt: po.created_at || new Date().toISOString(),
      startedAt: po.started_at || undefined,
      completedAt: po.completed_at || undefined,
      preCheckPassed: Boolean(po.pre_check_passed),
      notes: po.notes || '',
      operator: po.operator_name || 'Operario',
      qaCheck: po.qa_check || undefined
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener órdenes de producción' };
  }
}

export async function saveProductionOrderToSupabase(order: ProductionOrder): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('production_orders').upsert({
      id: order.id,
      lote: order.lote || null,
      formula_id: order.formulaId,
      quantity_liters: order.quantityLiters,
      status: order.status,
      created_at: order.createdAt || new Date().toISOString(),
      started_at: order.startedAt || null,
      completed_at: order.completedAt || null,
      pre_check_passed: order.preCheckPassed,
      operator_name: order.operator,
      qa_check: order.qaCheck || null,
      notes: order.notes || null
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar orden de producción' };
  }
}

export async function deleteProductionOrderInSupabase(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('production_orders').delete().eq('id', orderId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar orden de producción' };
  }
}

// ==============================================================================
// VENTAS Y PEDIDOS CRUD & SYNC
// ==============================================================================

export async function fetchSalesFromSupabase(): Promise<{ success: boolean; data?: Sale[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: Sale[] = (data || []).map((s: any) => ({
      id: s.id,
      clientId: s.client_id,
      clientName: s.client_name,
      items: (Array.isArray(s.items) ? s.items : []).map((it: any) => ({
        id: String(it.id || ''),
        productName: String(it.productName || it.product_name || ''),
        quantity: Number(it.quantity || 0),
        unit: String(it.unit || 'pzs'),
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
        total: Number(it.total !== undefined && it.total !== null ? it.total : (Number(it.quantity || 0) * Number(it.unitPrice ?? it.unit_price ?? 0)))
      })),
      subtotal: Number(s.subtotal || 0),
      tax: Number(s.tax || 0),
      total: Number(s.total || 0),
      paymentType: s.payment_type || 'Contado',
      status: s.status || 'Cotización',
      billingType: s.billing_type || 'Remisión',
      cfdiStatus: s.cfdi_status || undefined,
      createdAt: s.created_at || new Date().toISOString(),
      creditDaysLeft: s.credit_days_left,
      amountPaid: Number(s.amount_paid || 0),
      notes: s.notes || undefined
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener ventas' };
  }
}

export async function saveSaleToSupabase(sale: Sale): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('sales').upsert({
      id: sale.id,
      client_id: sale.clientId,
      client_name: sale.clientName,
      items: sale.items,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      payment_type: sale.paymentType,
      status: sale.status,
      billing_type: sale.billingType,
      cfdi_status: sale.cfdiStatus || null,
      created_at: sale.createdAt || new Date().toISOString(),
      credit_days_left: sale.creditDaysLeft || 0,
      amount_paid: sale.amountPaid || 0
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar venta' };
  }
}

export async function deleteSaleInSupabase(saleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar venta' };
  }
}

// ==============================================================================
// ÓRDENES DE COMPRA (PURCHASE ORDERS) CRUD & SYNC
// ==============================================================================

export async function fetchPurchaseOrdersFromSupabase(): Promise<{ success: boolean; data?: PurchaseOrder[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: PurchaseOrder[] = (data || []).map((po: any) => ({
      id: po.id,
      supplierName: po.supplier_name,
      items: Array.isArray(po.items) ? po.items : [],
      subtotal: Number(po.subtotal || 0),
      tax: Number(po.tax || 0),
      total: Number(po.total || 0),
      status: po.status || 'draft',
      createdAt: po.created_at || new Date().toISOString(),
      receivedAt: po.received_at || undefined,
      invoiceNumber: po.invoice_number || undefined
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener órdenes de compra' };
  }
}

export async function savePurchaseOrderToSupabase(po: PurchaseOrder): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('purchase_orders').upsert({
      id: po.id,
      supplier_name: po.supplierName,
      items: po.items,
      subtotal: po.subtotal,
      tax: po.tax,
      total: po.total,
      status: po.status,
      created_at: po.createdAt || new Date().toISOString(),
      received_at: po.receivedAt || null,
      invoice_number: po.invoiceNumber || null
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar orden de compra' };
  }
}

export async function deletePurchaseOrderInSupabase(poId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('purchase_orders').delete().eq('id', poId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar orden de compra' };
  }
}

// ==============================================================================
// HOJAS DE TRASLADO (TRANSFER SHEETS) CRUD & SYNC
// ==============================================================================

export async function fetchTransferSheetsFromSupabase(): Promise<{ success: boolean; data?: TransferSheet[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('transfer_sheets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: TransferSheet[] = (data || []).map((ts: any) => ({
      id: ts.id,
      folio: ts.folio,
      date: ts.date,
      expeditedIn: ts.expedited_in || '',
      elaboratedBy: ts.elaborated_by || '',
      clientName: ts.client_name,
      destination: ts.destination || '',
      address: ts.address || '',
      cp: ts.cp || '',
      colonia: ts.colonia || '',
      fiscalRegimen: ts.fiscal_regimen || '',
      phone: ts.phone || '',
      clientNo: ts.client_no || '',
      rfc: ts.rfc || '',
      curp: ts.curp || '',
      paymentForm: ts.payment_form || '',
      operator: ts.operator || '',
      plateNo: ts.plate_no || '',
      items: (Array.isArray(ts.items) ? ts.items : []).map((it: any) => ({
        quantity: Number(it.quantity || 0),
        unit: String(it.unit || 'LTS'),
        description: String(it.description || ''),
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
        total: Number(it.total !== undefined && it.total !== null ? it.total : (Number(it.quantity || 0) * Number(it.unitPrice ?? it.unit_price ?? 0)))
      })),
      subtotal: Number(ts.subtotal || 0),
      tax: Number(ts.tax || 0),
      total: Number(ts.total || 0),
      notes: ts.notes || '',
      createdAt: ts.created_at || new Date().toISOString(),
      active: ts.active !== undefined ? Boolean(ts.active) : true
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener hojas de traslado' };
  }
}

export async function saveTransferSheetToSupabase(ts: TransferSheet): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('transfer_sheets').upsert({
      id: ts.id,
      folio: ts.folio,
      date: ts.date,
      expedited_in: ts.expeditedIn,
      elaborated_by: ts.elaboratedBy,
      client_name: ts.clientName,
      destination: ts.destination,
      address: ts.address || null,
      cp: ts.cp || null,
      colonia: ts.colonia || null,
      fiscal_regimen: ts.fiscalRegimen || null,
      phone: ts.phone || null,
      client_no: ts.clientNo || null,
      rfc: ts.rfc || null,
      curp: ts.curp || null,
      payment_form: ts.paymentForm || null,
      operator: ts.operator || null,
      plate_no: ts.plateNo || null,
      items: ts.items,
      subtotal: ts.subtotal,
      tax: ts.tax,
      total: ts.total,
      notes: ts.notes || null,
      created_at: ts.createdAt || new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar hoja de traslado' };
  }
}

export async function deleteTransferSheetInSupabase(tsId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('transfer_sheets').delete().eq('id', tsId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar hoja de traslado' };
  }
}

// ==============================================================================
// NOTAS DE VENTA (SALE NOTES) CRUD & SYNC
// ==============================================================================

export async function fetchSaleNotesFromSupabase(): Promise<{ success: boolean; data?: SaleNote[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('sale_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted: SaleNote[] = (data || []).map((sn: any) => ({
      id: sn.id,
      noteNo: sn.note_no,
      date: sn.date,
      clientName: sn.client_name,
      phone: sn.phone || '',
      city: sn.city || '',
      items: (Array.isArray(sn.items) ? sn.items : []).map((it: any) => ({
        pieces: Number(it.pieces || 0),
        product: String(it.product || ''),
        unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
        total: Number(it.total !== undefined && it.total !== null ? it.total : (Number(it.pieces || 0) * Number(it.unitPrice ?? it.unit_price ?? 0)))
      })),
      subtotal: Number(sn.subtotal || 0),
      tax: Number(sn.tax || 0),
      total: Number(sn.total || 0),
      notes: sn.notes || '',
      createdAt: sn.created_at || new Date().toISOString(),
      active: sn.active !== undefined ? Boolean(sn.active) : true
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener notas de venta' };
  }
}

export async function saveSaleNoteToSupabase(sn: SaleNote): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('sale_notes').upsert({
      id: sn.id,
      note_no: sn.noteNo,
      date: sn.date,
      client_name: sn.clientName,
      phone: sn.phone || null,
      city: sn.city || null,
      items: sn.items,
      subtotal: sn.subtotal,
      tax: sn.tax,
      total: sn.total,
      created_at: sn.createdAt || new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar nota de venta' };
  }
}

export async function deleteSaleNoteInSupabase(snId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('sale_notes').delete().eq('id', snId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar nota de venta' };
  }
}

// ==============================================================================
// RUTAS DE ENTREGA (DELIVERY ROUTES) CRUD & SYNC
// ==============================================================================

export async function saveDeliveryRouteToSupabase(route: DeliveryRoute): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('delivery_routes').upsert({
      id: route.id,
      sale_id: route.saleId,
      client_name: route.clientName,
      address: route.address,
      status: route.status,
      delivered_at: route.deliveredAt || null,
      evidence_signature: route.evidenceSignature || null,
      evidence_photo: route.evidencePhoto || null,
      payment_collected: route.paymentCollected || 0,
      payment_method: route.paymentMethod || null,
      items_summary: route.itemsSummary,
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar ruta de entrega' };
  }
}

export async function deleteDeliveryRouteInSupabase(routeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('delivery_routes').delete().eq('id', routeId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar ruta de entrega' };
  }
}

// ==============================================================================
// CUENTAS POR COBRAR (ACCOUNTS RECEIVABLE) CRUD & SYNC
// ==============================================================================

export async function fetchAccountsReceivableFromSupabase(): Promise<{ success: boolean; data?: AccountReceivable[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('accounts_receivable')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Also fetch all payments to associate them
    const { data: paymentsData } = await supabase
      .from('receivable_payments')
      .select('*')
      .order('date', { ascending: true });

    const paymentsByReceivable = new Map<string, ReceivablePayment[]>();
    (paymentsData || []).forEach((p: any) => {
      const pay: ReceivablePayment = {
        id: p.id,
        receivableId: p.receivable_id,
        clientId: p.client_id || undefined,
        date: p.date,
        amount: Number(p.amount || 0),
        paymentMethod: p.payment_method || 'Efectivo',
        reference: p.reference || '',
        receivedBy: p.received_by || '',
        notes: p.notes || '',
        createdAt: p.created_at || new Date().toISOString()
      };
      const list = paymentsByReceivable.get(p.receivable_id) || [];
      list.push(pay);
      paymentsByReceivable.set(p.receivable_id, list);
    });

    const formatted: AccountReceivable[] = (data || []).map((ar: any) => ({
      id: ar.id,
      folio: ar.folio,
      clientId: ar.client_id,
      clientName: ar.client_name,
      saleId: ar.sale_id || undefined,
      concept: ar.concept,
      issueDate: ar.issue_date,
      dueDate: ar.due_date,
      creditDays: Number(ar.credit_days || 30),
      totalAmount: Number(ar.total_amount || 0),
      amountPaid: Number(ar.amount_paid || 0),
      remainingBalance: Number(ar.remaining_balance || 0),
      status: ar.status || 'pendiente',
      notes: ar.notes || '',
      payments: paymentsByReceivable.get(ar.id) || [],
      active: ar.active !== undefined ? Boolean(ar.active) : true,
      createdAt: ar.created_at || new Date().toISOString(),
      updatedAt: ar.updated_at || undefined
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener cuentas por cobrar' };
  }
}

export async function saveAccountReceivableToSupabase(ar: AccountReceivable): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('accounts_receivable').upsert({
      id: ar.id,
      folio: ar.folio,
      client_id: ar.clientId,
      client_name: ar.clientName,
      sale_id: ar.saleId || null,
      concept: ar.concept,
      issue_date: ar.issueDate,
      due_date: ar.dueDate,
      credit_days: ar.creditDays,
      total_amount: ar.totalAmount,
      amount_paid: ar.amountPaid,
      remaining_balance: ar.remainingBalance,
      status: ar.status,
      notes: ar.notes || null,
      active: ar.active !== undefined ? ar.active : true,
      created_at: ar.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar cuenta por cobrar' };
  }
}

export async function deleteAccountReceivableInSupabase(arId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete payments first if not set to cascade
    await supabase.from('receivable_payments').delete().eq('receivable_id', arId);
    const { error } = await supabase.from('accounts_receivable').delete().eq('id', arId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar cuenta por cobrar' };
  }
}

// ==============================================================================
// PAGOS Y ABONOS (RECEIVABLE PAYMENTS) CRUD & SYNC
// ==============================================================================

export async function fetchReceivablePaymentsFromSupabase(receivableId?: string): Promise<{ success: boolean; data?: ReceivablePayment[]; error?: string }> {
  try {
    let query = supabase.from('receivable_payments').select('*').order('date', { ascending: false });
    if (receivableId) {
      query = query.eq('receivable_id', receivableId);
    }
    const { data, error } = await query;
    if (error) throw error;

    const formatted: ReceivablePayment[] = (data || []).map((p: any) => ({
      id: p.id,
      receivableId: p.receivable_id,
      clientId: p.client_id || undefined,
      date: p.date,
      amount: Number(p.amount || 0),
      paymentMethod: p.payment_method || 'Efectivo',
      reference: p.reference || '',
      receivedBy: p.received_by || '',
      notes: p.notes || '',
      createdAt: p.created_at || new Date().toISOString()
    }));

    return { success: true, data: formatted };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al obtener pagos de clientes' };
  }
}

export async function saveReceivablePaymentToSupabase(pay: ReceivablePayment): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('receivable_payments').upsert({
      id: pay.id,
      receivable_id: pay.receivableId,
      client_id: pay.clientId || null,
      date: pay.date,
      amount: pay.amount,
      payment_method: pay.paymentMethod,
      reference: pay.reference || null,
      received_by: pay.receivedBy,
      notes: pay.notes || null,
      created_at: pay.createdAt || new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al guardar abono de cliente' };
  }
}

export async function deleteReceivablePaymentInSupabase(payId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('receivable_payments').delete().eq('id', payId);
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error al eliminar pago' };
  }
}



