-- Los miembros (no admin) solo pueden actualizar estado y presentacion de una obligación,
-- aunque la policy de UPDATE los deje pasar a nivel de fila. Esto refuerza a nivel de
-- base de datos lo que la UI ya restringe.
CREATE OR REPLACE FUNCTION public.restringir_actualizacion_obligaciones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.ejercicio_id IS DISTINCT FROM OLD.ejercicio_id
    OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.vencimiento IS DISTINCT FROM OLD.vencimiento
    OR NEW.observaciones IS DISTINCT FROM OLD.observaciones
  THEN
    RAISE EXCEPTION 'Solo un administrador puede modificar ese campo de la obligación.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.restringir_actualizacion_obligaciones() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_restringir_actualizacion_obligaciones
BEFORE UPDATE ON public.obligaciones
FOR EACH ROW EXECUTE FUNCTION public.restringir_actualizacion_obligaciones();
