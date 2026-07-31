ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS responsable text NOT NULL DEFAULT '';

UPDATE public.empresas e
SET responsable = sub.responsable
FROM (
  SELECT ej.empresa_id, o.responsable, count(*) AS c
  FROM public.obligaciones o
  JOIN public.ejercicios ej ON ej.id = o.ejercicio_id
  WHERE coalesce(o.responsable, '') <> ''
  GROUP BY ej.empresa_id, o.responsable
) sub
WHERE sub.empresa_id = e.id AND e.responsable = '';

ALTER TABLE public.obligaciones DROP COLUMN IF EXISTS responsable;