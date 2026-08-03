-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'miembro');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Usuarios ven roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestionan roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Los usuarios existentes quedan como administradores
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- Nuevos usuarios: miembro
CREATE OR REPLACE FUNCTION public.asignar_rol_inicial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'miembro')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_rol
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.asignar_rol_inicial();

-- Responsables
CREATE TABLE public.responsables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsables TO authenticated;
GRANT ALL ON public.responsables TO service_role;
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipo ve responsables" ON public.responsables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestionan responsables" ON public.responsables
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_responsables_updated_at
BEFORE UPDATE ON public.responsables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.responsables (nombre)
SELECT DISTINCT responsable FROM public.empresas
WHERE coalesce(responsable, '') <> ''
ON CONFLICT DO NOTHING;

-- Nuevas reglas de acceso para empresas / ejercicios / obligaciones
DROP POLICY IF EXISTS "Equipo gestiona empresas" ON public.empresas;
CREATE POLICY "Equipo ve empresas" ON public.empresas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins crean empresas" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins editan empresas" ON public.empresas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins eliminan empresas" ON public.empresas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Equipo gestiona ejercicios" ON public.ejercicios;
CREATE POLICY "Equipo ve ejercicios" ON public.ejercicios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins crean ejercicios" ON public.ejercicios
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins editan ejercicios" ON public.ejercicios
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins eliminan ejercicios" ON public.ejercicios
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Equipo gestiona obligaciones" ON public.obligaciones;
CREATE POLICY "Equipo ve obligaciones" ON public.obligaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Equipo actualiza obligaciones" ON public.obligaciones
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins crean obligaciones" ON public.obligaciones
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins eliminan obligaciones" ON public.obligaciones
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));