import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Empresa, Ejercicio, Obligacion, Estado, Responsable } from "./domain";

type Data = {
  empresas: Empresa[];
  ejercicios: Ejercicio[];
  obligaciones: Obligacion[];
  responsables: Responsable[];
};
const vacio: Data = { empresas: [], ejercicios: [], obligaciones: [], responsables: [] };

async function cargarTodo(): Promise<Data> {
  const [empresas, ejercicios, obligaciones, responsables] = await Promise.all([
    supabase.from("empresas").select("*").order("nombre"),
    supabase.from("ejercicios").select("*").order("cierre", { ascending: false }),
    supabase.from("obligaciones").select("*").order("vencimiento"),
    supabase.from("responsables").select("*").order("nombre"),
  ]);
  if (empresas.error || ejercicios.error || obligaciones.error || responsables.error) {
    throw empresas.error ?? ejercicios.error ?? obligaciones.error ?? responsables.error;
  }
  return {
    responsables: (responsables.data ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      activo: r.activo,
    })),
    empresas: (empresas.data ?? []).map((e) => ({
      id: e.id,
      nombre: e.nombre,
      cuit: e.cuit,
      responsable: e.responsable ?? "",
    })),
    ejercicios: (ejercicios.data ?? []).map((e) => ({
      id: e.id,
      empresaId: e.empresa_id,
      cierre: e.cierre,
    })),
    obligaciones: (obligaciones.data ?? []).map((o) => ({
      id: o.id,
      ejercicioId: o.ejercicio_id,
      tipo: o.tipo,
      vencimiento: o.vencimiento,
      estado: o.estado as Estado,
      presentacion: o.presentacion ?? undefined,
      observaciones: o.observaciones ?? undefined,
    })),
  };
}

export function useStore() {
  return useStoreInterno();
}

async function cargarEsAdmin(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export function useEsAdmin(): boolean {
  const { data } = useQuery({ queryKey: ["rol-admin"], queryFn: cargarEsAdmin });
  return data ?? false;
}

function useStoreInterno() {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({ queryKey: ["datos"], queryFn: cargarTodo });
  const { data: esAdmin } = useQuery({ queryKey: ["rol-admin"], queryFn: cargarEsAdmin });

  const mutar = useMutation({
    mutationFn: async (accion: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await accion();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datos"] });
      toast.success("Los cambios fueron guardados correctamente.");
    },
    onError: () => toast.error("No fue posible guardar la información. Intentá nuevamente."),
  });

  return useMemo(
    () => ({
      cargando: isPending,
      error: isError,
      data: data ?? vacio,
      esAdmin: esAdmin ?? false,
      guardarResponsable: (r: { id?: string; nombre: string; activo?: boolean }) =>
        mutar.mutate(() =>
          r.id
            ? supabase
                .from("responsables")
                .update({ nombre: r.nombre, activo: r.activo ?? true })
                .eq("id", r.id)
            : supabase.from("responsables").insert({ nombre: r.nombre }),
        ),
      eliminarResponsable: (id: string) =>
        mutar.mutate(() => supabase.from("responsables").delete().eq("id", id)),
      guardarEmpresa: (e: Omit<Empresa, "id"> & { id?: string }) =>
        mutar.mutate(() =>
          e.id
            ? supabase
                .from("empresas")
                .update({ nombre: e.nombre, cuit: e.cuit, responsable: e.responsable })
                .eq("id", e.id)
            : supabase
                .from("empresas")
                .insert({ nombre: e.nombre, cuit: e.cuit, responsable: e.responsable }),
        ),
      eliminarEmpresa: (id: string) => mutar.mutate(() => supabase.from("empresas").delete().eq("id", id)),
      guardarEjercicio: (e: Omit<Ejercicio, "id"> & { id?: string }) =>
        mutar.mutate(() =>
          e.id
            ? supabase.from("ejercicios").update({ cierre: e.cierre }).eq("id", e.id)
            : supabase.from("ejercicios").insert({ empresa_id: e.empresaId, cierre: e.cierre }),
        ),
      eliminarEjercicio: (id: string) =>
        mutar.mutate(() => supabase.from("ejercicios").delete().eq("id", id)),
      guardarObligacion: (o: Omit<Obligacion, "id"> & { id?: string }) => {
        const fila = {
          ejercicio_id: o.ejercicioId,
          tipo: o.tipo,
          vencimiento: o.vencimiento,
          estado: o.estado,
          presentacion: o.presentacion ?? null,
          observaciones: o.observaciones ?? null,
        };
        mutar.mutate(() =>
          o.id
            ? supabase.from("obligaciones").update(fila).eq("id", o.id)
            : supabase.from("obligaciones").insert(fila),
        );
      },
      eliminarObligacion: (id: string) =>
        mutar.mutate(() => supabase.from("obligaciones").delete().eq("id", id)),
    }),
    [data, isPending, isError, mutar, esAdmin],
  );
}

export type VistaObligacion = Obligacion & { empresa: Empresa; ejercicio: Ejercicio };

export function useObligacionesEnriquecidas(): VistaObligacion[] {
  const { data } = useStore();
  return useMemo(() => {
    const ejercicios = new Map(data.ejercicios.map((e) => [e.id, e]));
    const empresas = new Map(data.empresas.map((e) => [e.id, e]));
    return data.obligaciones
      .map((o) => {
        const ejercicio = ejercicios.get(o.ejercicioId);
        const empresa = ejercicio ? empresas.get(ejercicio.empresaId) : undefined;
        if (!ejercicio || !empresa) return null;
        return { ...o, ejercicio, empresa };
      })
      .filter(Boolean)
      .sort((a, b) => a!.vencimiento.localeCompare(b!.vencimiento)) as VistaObligacion[];
  }, [data]);
}
