import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoBadge, ResponsableIniciales, TipoBadge, puntoSemaforo } from "@/components/app/badges";
import { ObligacionDialog } from "@/components/app/obligacion-dialog";
import { useObligacionesEnriquecidas, useStore, type VistaObligacion } from "@/lib/store";
import {
  estaCerrada,
  formatCierre,
  formatFecha,
  semaforoDe,
  textoDias,
  hoy,
  parseISO,
} from "@/lib/domain";

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
  const { cargando, data, esAdmin } = useStore();
  const obligaciones = useObligacionesEnriquecidas();
  const [abierto, setAbierto] = useState(false);

  const resumen = useMemo(() => {
    const pendientes = obligaciones.filter((o) => !estaCerrada(o.estado));
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
      const cur = porResponsable.get(o.empresa.responsable) ?? { total: 0, vencidas: 0 };
      cur.total += 1;
      if (semaforoDe(o) === "vencido") cur.vencidas += 1;
      porResponsable.set(o.empresa.responsable, cur);
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
        {esAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setAbierto(true)}>
              <Plus className="size-4" /> Nueva obligación
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          titulo="Vencidas"
          valor={resumen.vencidas.length}
          detalle="Requieren acción inmediata"
          tono="vencido"
          icono={AlertTriangle}
          urgencia="vencidas"
        />
        <Indicador
          titulo="Vencen en 7 días"
          valor={resumen.criticas.length}
          detalle="Prioridad alta de la semana"
          tono="critico"
          icono={CalendarClock}
          urgencia="criticas"
        />
        <Indicador
          titulo="Del mes en curso"
          valor={resumen.delMes.length}
          detalle="Carga de trabajo del período"
          tono="proximo"
          icono={CalendarClock}
          urgencia="mes"
        />
        <Indicador
          titulo="Presentadas"
          valor={resumen.presentadas.length}
          detalle={`Sobre ${obligaciones.length} obligaciones`}
          tono="presentado"
          icono={CheckCircle2}
          urgencia="presentadas"
        />
      </div>

      <PanelVencimientos
        vencidas={resumen.vencidas}
        proximas={resumen.pendientes.filter((o) => semaforoDe(o) !== "vencido")}
      />

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
            <Link
              key={nombre}
              to="/obligaciones"
              search={{ responsable: nombre }}
              className="rounded-lg border border-border bg-secondary/40 p-4 transition-colors hover:bg-secondary"
            >
              <p className="font-medium">{nombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {info.total} pendiente{info.total === 1 ? "" : "s"}
                {info.vencidas > 0 && (
                  <span className="text-vencido"> · {info.vencidas} vencida{info.vencidas === 1 ? "" : "s"}</span>
                )}
              </p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">Ver asignaciones →</p>
            </Link>
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

function PanelVencimientos({
  vencidas,
  proximas,
}: {
  vencidas: VistaObligacion[];
  proximas: VistaObligacion[];
}) {
  const [vista, setVista] = useState<"proximos" | "vencidos">(
    vencidas.length > 0 ? "vencidos" : "proximos",
  );
  const items = vista === "vencidos" ? vencidas : proximas;

  const grupos = useMemo(() => {
    const mapa = new Map<string, VistaObligacion[]>();
    items.forEach((o) => {
      const clave = o.vencimiento.slice(0, 7);
      const lista = mapa.get(clave) ?? [];
      lista.push(o);
      mapa.set(clave, lista);
    });
    return [...mapa.entries()]
      .sort((a, b) => (vista === "vencidos" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])))
      .map(([clave, filas]) => {
        const [y, m] = clave.split("-").map(Number);
        const titulo = new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
        });
        return [titulo, filas] as const;
      });
  }, [items, vista]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">
          {vista === "vencidos" ? "Obligaciones vencidas" : "Próximos vencimientos"}
        </CardTitle>
        <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
          {(
            [
              ["proximos", `Próximos (${proximas.length})`],
              ["vencidos", `Vencidos (${vencidas.length})`],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setVista(valor)}
              aria-pressed={vista === valor}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                vista === valor
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 && (
          <p className="px-6 pb-6 text-base text-muted-foreground">
            {vista === "vencidos"
              ? "No hay obligaciones vencidas. Buen trabajo."
              : "No hay vencimientos próximos."}
          </p>
        )}
        {grupos.map(([titulo, filas]) => (
          <section key={titulo}>
            <div className="flex items-baseline justify-between border-y border-border bg-secondary/60 px-6 py-1.5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {titulo}
              </h3>
              <span className="text-sm text-muted-foreground">{filas.length}</span>
            </div>
            <ul className="divide-y divide-border">
              {filas.map((o) => (
                <li key={o.id}>
                  <Link
                    to="/empresas/$empresaId"
                    params={{ empresaId: o.empresa.id }}
                    className="grid grid-cols-[3px_auto_minmax(0,1fr)_auto] items-center gap-x-3 px-6 py-2 transition-colors hover:bg-secondary/50 sm:grid-cols-[3px_auto_minmax(0,1.1fr)_minmax(0,1fr)_auto_auto] sm:gap-x-4"
                  >
                    <span className={`h-8 w-[3px] rounded-full ${puntoSemaforo(semaforoDe(o))}`} />
                    <ResponsableIniciales nombre={o.empresa.responsable} />
                    <span className="truncate text-[15px] font-semibold leading-tight">
                      {o.empresa.nombre}
                      <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                        {formatCierre(o.ejercicio.cierre)}
                      </span>
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <TipoBadge tipo={o.tipo} className="text-[13px]" />
                    </span>
                    <span className="text-right text-[15px] font-medium tabular-nums">
                      {formatFecha(o.vencimiento)}
                      <span className="ml-2 hidden text-[13px] font-normal text-muted-foreground lg:inline">
                        {textoDias(o)}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <EstadoBadge estado={o.estado} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  tono,
  icono: Icono,
  urgencia,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  tono: "vencido" | "critico" | "proximo" | "presentado";
  icono: React.ComponentType<{ className?: string }>;
  urgencia: "vencidas" | "criticas" | "mes" | "presentadas";
}) {
  const clases = {
    vencido: "text-vencido bg-vencido-soft",
    critico: "text-critico bg-critico-soft",
    proximo: "text-proximo bg-proximo-soft",
    presentado: "text-presentado bg-presentado-soft",
  }[tono];
  return (
    <Link to="/obligaciones" search={{ urgencia }} className="block">
      <Card className="transition-colors hover:bg-secondary/50">
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
    </Link>
  );
}
