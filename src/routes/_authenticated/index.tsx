import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge, puntoSemaforo } from "@/components/app/badges";
import { ObligacionDialog } from "@/components/app/obligacion-dialog";
import { useObligacionesEnriquecidas, useStore, type VistaObligacion } from "@/lib/store";
import { formatFecha, semaforoDe, textoDias, hoy, parseISO } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard de vencimientos | Vencimientos PT" },
      {
        name: "description",
        content:
          "Indicadores, obligaciones vencidas y próximos vencimientos de Precios de Transferencia en una sola pantalla.",
      },
      { property: "og:title", content: "Dashboard de vencimientos | Vencimientos PT" },
      {
        property: "og:description",
        content: "Priorizá los vencimientos de Precios de Transferencia del equipo.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { cargando, data } = useStore();
  const obligaciones = useObligacionesEnriquecidas();
  const [abierto, setAbierto] = useState(false);

  const resumen = useMemo(() => {
    const pendientes = obligaciones.filter((o) => o.estado !== "Presentado");
    const vencidas = pendientes.filter((o) => semaforoDe(o) === "vencido");
    const criticas = pendientes.filter((o) => semaforoDe(o) === "critico");
    const n = hoy();
    const delMes = obligaciones.filter((o) => {
      const v = parseISO(o.vencimiento);
      return v.getFullYear() === n.getFullYear() && v.getMonth() === n.getMonth();
    });
    const presentadas = obligaciones.filter((o) => o.estado === "Presentado");
    const porResponsable = new Map<string, { total: number; vencidas: number }>();
    pendientes.forEach((o) => {
      const cur = porResponsable.get(o.responsable) ?? { total: 0, vencidas: 0 };
      cur.total += 1;
      if (semaforoDe(o) === "vencido") cur.vencidas += 1;
      porResponsable.set(o.responsable, cur);
    });
    return {
      pendientes,
      vencidas,
      criticas,
      delMes,
      presentadas,
      porResponsable: [...porResponsable.entries()].sort((a, b) => b[1].total - a[1].total),
    };
  }, [obligaciones]);

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando vencimientos...</p>;
  }

  if (data.empresas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <h1 className="text-2xl font-semibold">Todavía no hay empresas cargadas.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cargá la primera empresa para comenzar el seguimiento de vencimientos.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/empresas">Agregar empresa</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Panel de vencimientos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAbierto(true)}>
            <Plus className="size-4" /> Nueva obligación
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          titulo="Vencidas"
          valor={resumen.vencidas.length}
          detalle="Requieren acción inmediata"
          tono="vencido"
          icono={AlertTriangle}
        />
        <Indicador
          titulo="Vencen en 7 días"
          valor={resumen.criticas.length}
          detalle="Prioridad alta de la semana"
          tono="critico"
          icono={CalendarClock}
        />
        <Indicador
          titulo="Del mes en curso"
          valor={resumen.delMes.length}
          detalle="Carga de trabajo del período"
          tono="proximo"
          icono={CalendarClock}
        />
        <Indicador
          titulo="Presentadas"
          valor={resumen.presentadas.length}
          detalle={`Sobre ${obligaciones.length} obligaciones`}
          tono="presentado"
          icono={CheckCircle2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListaObligaciones
          titulo="Obligaciones vencidas"
          vacio="No hay obligaciones vencidas. Buen trabajo."
          items={resumen.vencidas}
        />
        <ListaObligaciones
          titulo="Próximos vencimientos"
          vacio="No hay vencimientos próximos."
          items={resumen.pendientes
            .filter((o) => semaforoDe(o) !== "vencido")
            .slice(0, 8)}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Carga por responsable
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/obligaciones">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resumen.porResponsable.map(([nombre, info]) => (
            <div key={nombre} className="rounded-lg border border-border bg-secondary/40 p-4">
              <p className="font-medium">{nombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {info.total} pendiente{info.total === 1 ? "" : "s"}
                {info.vencidas > 0 && (
                  <span className="text-vencido"> · {info.vencidas} vencida{info.vencidas === 1 ? "" : "s"}</span>
                )}
              </p>
            </div>
          ))}
          {resumen.porResponsable.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay obligaciones pendientes asignadas.</p>
          )}
        </CardContent>
      </Card>

      <ObligacionDialog open={abierto} onOpenChange={setAbierto} />
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  tono,
  icono: Icono,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  tono: "vencido" | "critico" | "proximo" | "presentado";
  icono: React.ComponentType<{ className?: string }>;
}) {
  const clases = {
    vencido: "text-vencido bg-vencido-soft",
    critico: "text-critico bg-critico-soft",
    proximo: "text-proximo bg-proximo-soft",
    presentado: "text-presentado bg-presentado-soft",
  }[tono];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-1 font-display text-3xl font-semibold">{valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
        </div>
        <span className={`flex size-9 items-center justify-center rounded-lg ${clases}`}>
          <Icono className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function ListaObligaciones({
  titulo,
  items,
  vacio,
}: {
  titulo: string;
  items: VistaObligacion[];
  vacio: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{vacio}</p>}
        {items.map((o) => (
          <Link
            key={o.id}
            to="/empresas/$empresaId"
            params={{ empresaId: o.empresa.id }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/60"
          >
            <span className={`h-10 w-1 rounded-full ${puntoSemaforo(semaforoDe(o))}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{o.empresa.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {o.tipo} · {o.responsable}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatFecha(o.vencimiento)}</p>
              <p className="text-xs text-muted-foreground">{textoDias(o)}</p>
            </div>
            <EstadoBadge estado={o.estado} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
