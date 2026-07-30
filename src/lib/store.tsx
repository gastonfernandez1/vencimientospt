import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { crearDatosEjemplo } from "./seed";
import type { Empresa, Ejercicio, Obligacion } from "./domain";

type Data = { empresas: Empresa[]; ejercicios: Ejercicio[]; obligaciones: Obligacion[] };

const KEY = "vencimientos-pt-v1";

type Ctx = {
  cargando: boolean;
  data: Data;
  guardarEmpresa: (e: Omit<Empresa, "id"> & { id?: string }) => void;
  eliminarEmpresa: (id: string) => void;
  guardarEjercicio: (e: Omit<Ejercicio, "id"> & { id?: string }) => void;
  eliminarEjercicio: (id: string) => void;
  guardarObligacion: (o: Omit<Obligacion, "id"> & { id?: string }) => void;
  eliminarObligacion: (id: string) => void;
  restaurarEjemplo: () => void;
};

const StoreContext = createContext<Ctx | null>(null);
const vacio: Data = { empresas: [], ejercicios: [], obligaciones: [] };
const nuevoId = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(vacio);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setData(raw ? (JSON.parse(raw) as Data) : crearDatosEjemplo());
    } catch {
      setData(crearDatosEjemplo());
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    if (cargando) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [data, cargando]);

  const value = useMemo<Ctx>(
    () => ({
      cargando,
      data,
      guardarEmpresa: (e) =>
        setData((d) => ({
          ...d,
          empresas: e.id
            ? d.empresas.map((x) => (x.id === e.id ? ({ ...x, ...e } as Empresa) : x))
            : [...d.empresas, { ...e, id: nuevoId() } as Empresa],
        })),
      eliminarEmpresa: (id) =>
        setData((d) => {
          const ejercicios = d.ejercicios.filter((x) => x.empresaId !== id);
          const ids = new Set(ejercicios.map((x) => x.id));
          return {
            empresas: d.empresas.filter((x) => x.id !== id),
            ejercicios,
            obligaciones: d.obligaciones.filter((o) => ids.has(o.ejercicioId)),
          };
        }),
      guardarEjercicio: (e) =>
        setData((d) => ({
          ...d,
          ejercicios: e.id
            ? d.ejercicios.map((x) => (x.id === e.id ? ({ ...x, ...e } as Ejercicio) : x))
            : [...d.ejercicios, { ...e, id: nuevoId() } as Ejercicio],
        })),
      eliminarEjercicio: (id) =>
        setData((d) => ({
          ...d,
          ejercicios: d.ejercicios.filter((x) => x.id !== id),
          obligaciones: d.obligaciones.filter((o) => o.ejercicioId !== id),
        })),
      guardarObligacion: (o) =>
        setData((d) => ({
          ...d,
          obligaciones: o.id
            ? d.obligaciones.map((x) => (x.id === o.id ? ({ ...x, ...o } as Obligacion) : x))
            : [...d.obligaciones, { ...o, id: nuevoId() } as Obligacion],
        })),
      eliminarObligacion: (id) =>
        setData((d) => ({ ...d, obligaciones: d.obligaciones.filter((x) => x.id !== id) })),
      restaurarEjemplo: () => setData(crearDatosEjemplo()),
    }),
    [data, cargando],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export type VistaObligacion = Obligacion & {
  empresa: Empresa;
  ejercicio: Ejercicio;
};

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
