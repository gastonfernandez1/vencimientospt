DROP POLICY "Usuarios ven roles" ON public.user_roles;

CREATE POLICY "Usuarios ven su propio rol"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.asignar_rol_inicial() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;