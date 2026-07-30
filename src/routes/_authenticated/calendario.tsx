import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { puntoSemaforo } from "@/components/app/badges";
import { useObligacionesEnriquecidas, useStore, type VistaObligacion } from "@/lib/store";
import { SEMAFORO_LABEL, formatFecha, semaforoDe, toISO, type Semaforo } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario mensual | Vencimientos PT" },
      {
        name: "description",
        content: "Vista calendario mensual de los vencimientos de Precios de Transferencia.",
      },
      { property: "og:title", content: "Calendario mensual | Vencimientos PT" },
      {
        property: "og:description",
        content: "Visualizá la carga de vencimientos día por día.",
      },
    ],
  }),
  component: CalendarioPage,
});

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LEYENDA: Semaforo[] = ["vencido", "critico", "proximo", "planificado", "presentado"];

function CalendarioPage() {
  const { cargando } = useStore();
  const obligaciones = useObligacionesEnriquecidas();
  const [ref, setRef] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const porDia = useMemo(() => {
    const map = new Map<string, VistaObligacion[]>();
    obligaciones.forEach((o) => {
      map.set(o.vencimiento, [...(map.get(o.vencimiento) ?? []), o]);
    });
    return map;
  }, [obligaciones]);

  const celdas = useMemo(() => {
    const primero = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const inicio = new Date(primero);
    const offset = (primero.getDay() + 6) % 7;
    inicio.setDate(primero.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [ref]);

  const hoyISO = toISO(new Date());
  const delDia = seleccion ? (porDia.get(seleccion) ?? []) : [];

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando vencimientos...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold capitalize">
            {ref.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vencimientos del mes ordenados por día.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setRef(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {LEYENDA.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${puntoSemaforo(s)}`} /> {SEMAFORO_LABEL[s]}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="pb-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
            {celdas.map((d) => {
              const iso = toISO(d);
              const items = porDia.get(iso) ?? [];
              const esMes = d.getMonth() === ref.getMonth();
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSeleccion(items.length ? iso : null)}
                  className={`min-h-24 bg-card p-2 text-left align-top transition-colors hover:bg-secondary/60 ${
                    esMes ? "" : "opacity-45"
                  } ${seleccion === iso ? "ring-2 ring-inset ring-primary" : ""}`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                      iso === hoyISO ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((o) => (
                      <div key={o.id} className="flex items-center gap-1">
                        <span className={`size-1.5 shrink-0 rounded-full ${puntoSemaforo(semaforoDe(o))}`} />
                        <span className="truncate text-[11px] leading-tight">{o.empresa.nombre}</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[11px] text-muted-foreground">+{items.length - 3} más</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {seleccion && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="text-lg font-semibold">Vencimientos del {formatFecha(seleccion)}</h2>
            {delDia.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className={`h-8 w-1 rounded-full ${puntoSemaforo(semaforoDe(o))}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.empresa.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.tipo} · {o.responsable} · {o.estado}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
