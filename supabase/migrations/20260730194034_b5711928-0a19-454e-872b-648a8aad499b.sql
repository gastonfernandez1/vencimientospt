CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipo gestiona empresas" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cierre date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ejercicios TO authenticated;
GRANT ALL ON public.ejercicios TO service_role;
ALTER TABLE public.ejercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipo gestiona ejercicios" ON public.ejercicios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.obligaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  vencimiento date NOT NULL,
  responsable text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Pendiente',
  presentacion date,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligaciones TO authenticated;
GRANT ALL ON public.obligaciones TO service_role;
ALTER TABLE public.obligaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipo gestiona obligaciones" ON public.obligaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_ejercicios_empresa ON public.ejercicios(empresa_id);
CREATE INDEX idx_obligaciones_ejercicio ON public.obligaciones(ejercicio_id);
CREATE INDEX idx_obligaciones_vencimiento ON public.obligaciones(vencimiento);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_obligaciones_updated_at BEFORE UPDATE ON public.obligaciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.empresas (id, nombre, cuit) VALUES
 ('11111111-1111-4111-8111-000000000001', 'Agroexport Pampa S.A.', '30-71234567-9'),
 ('11111111-1111-4111-8111-000000000002', 'Litio Andino S.R.L.', '30-70987654-3'),
 ('11111111-1111-4111-8111-000000000003', 'Farmalab Argentina S.A.', '30-68741235-1'),
 ('11111111-1111-4111-8111-000000000004', 'Tecnosur Software S.A.', '30-71765432-8'),
 ('11111111-1111-4111-8111-000000000005', 'Distribuidora del Plata S.A.', '30-69874512-4');

INSERT INTO public.ejercicios (id, empresa_id, cierre) VALUES
 ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', '2025-06-30'),
 ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000001', '2024-06-30'),
 ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-000000000002', '2025-12-31'),
 ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-000000000003', '2025-09-30'),
 ('22222222-2222-4222-8222-000000000005', '11111111-1111-4111-8111-000000000004', '2025-12-31'),
 ('22222222-2222-4222-8222-000000000006', '11111111-1111-4111-8111-000000000005', '2025-03-31');

INSERT INTO public.obligaciones (ejercicio_id, tipo, vencimiento, responsable, estado, presentacion, observaciones) VALUES
 ('22222222-2222-4222-8222-000000000001', 'Firma Digital', CURRENT_DATE - 18, 'Sofía Martínez', 'Pendiente', NULL, 'Falta renovar el token del apoderado.'),
 ('22222222-2222-4222-8222-000000000001', 'F.2668 / F.2672', CURRENT_DATE - 5, 'Julián Pereyra', 'En revisión', NULL, NULL),
 ('22222222-2222-4222-8222-000000000001', 'Estudio de Precios de Transferencia', CURRENT_DATE + 3, 'Carla Domínguez', 'En preparación', NULL, NULL),
 ('22222222-2222-4222-8222-000000000001', 'Informe Maestro', CURRENT_DATE + 21, 'Matías Rossi', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000002', 'F.2668 / F.2672', CURRENT_DATE - 240, 'Sofía Martínez', 'Presentado', CURRENT_DATE - 242, NULL),
 ('22222222-2222-4222-8222-000000000002', 'Estudio de Precios de Transferencia', CURRENT_DATE - 250, 'Carla Domínguez', 'Presentado', CURRENT_DATE - 252, NULL),
 ('22222222-2222-4222-8222-000000000003', 'Firma Digital', CURRENT_DATE + 6, 'Lucía Fernández', 'En preparación', NULL, NULL),
 ('22222222-2222-4222-8222-000000000003', 'F.8097 – Informe País por País', CURRENT_DATE + 12, 'Matías Rossi', 'Pendiente', NULL, 'Grupo con casa matriz en España.'),
 ('22222222-2222-4222-8222-000000000003', 'F.8096 – Informe UEC', CURRENT_DATE + 45, 'Lucía Fernández', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000004', 'F.2668 / F.2672', CURRENT_DATE + 1, 'Julián Pereyra', 'En revisión', NULL, NULL),
 ('22222222-2222-4222-8222-000000000004', 'Estudio de Precios de Transferencia', CURRENT_DATE + 9, 'Sofía Martínez', 'En preparación', NULL, NULL),
 ('22222222-2222-4222-8222-000000000004', 'Informe presentación CBCR', CURRENT_DATE + 60, 'Carla Domínguez', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000005', 'Firma Digital', CURRENT_DATE - 2, 'Matías Rossi', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000005', 'Informe Maestro', CURRENT_DATE + 25, 'Lucía Fernández', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000005', 'F.2668 / F.2672', CURRENT_DATE + 90, 'Julián Pereyra', 'Pendiente', NULL, NULL),
 ('22222222-2222-4222-8222-000000000006', 'Estudio de Precios de Transferencia', CURRENT_DATE - 35, 'Carla Domínguez', 'Presentado', CURRENT_DATE - 37, NULL),
 ('22222222-2222-4222-8222-000000000006', 'F.2668 / F.2672', CURRENT_DATE + 15, 'Sofía Martínez', 'En preparación', NULL, NULL),
 ('22222222-2222-4222-8222-000000000006', 'Informe presentación CBCR', CURRENT_DATE + 120, 'Matías Rossi', 'Pendiente', NULL, NULL);