import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsableIniciales, SemaforoBadge, TipoBadge } from "@/components/app/badges";
import { ObligacionDialog } from "@/components/app/obligacion-dialog";
import { useObligacionesEnriquecidas, useStore, type VistaObligacion } from "@/lib/store";
import {
  ESTADOS,
  TIPOS_PRESENTACION,
  formatCierre,
  formatFecha,
  textoDias,
  semaforoDe,
  hoy,
  parseISO,
  type Estado,
  type Obligacion,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/obligaciones")({
  validateSearch: (search: Record<string, unknown>) => ({
    responsable: typeof search.responsable === "string" ? search.responsable : undefined,
    urgencia: (["vencidas", "criticas", "mes", "presentadas"] as const).includes(
      search.urgencia as never,
    )
      ? (search.urgencia as "vencidas" | "criticas" | "mes" | "presentadas")
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Obligaciones y filtros | Vencimientos PT" },
      {
        name: "description",
        content:
          "Tabla filtrable de obligaciones por cliente, responsable, estado, tipo de presentación y fecha.",
      },
      { property: "og:title", content: "Obligaciones | Vencimientos PT" },
      {
        property: "og:description",
        content: "Buscá y filtrá todas las obligaciones de Precios de Transferencia.",
      },
    ],
  }),
  component: ObligacionesPage,
});

const TODOS = "todos";

const URGENCIAS = {
  vencidas: "Vencidas",
  criticas: "Vencen en 7 días",
  mes: "Del mes en curso",
  presentadas: "Presentadas",
} as const;

type Urgencia = keyof typeof URGENCIAS;

function cumpleUrgencia(o: VistaObligacion, u: Urgencia) {
  if (u === "presentadas") return o.estado === "Presentado";
  if (u === "mes") {
    const n = hoy();
    const v = parseISO(o.vencimiento);
    return v.getFullYear() === n.getFullYear() && v.getMonth() === n.getMonth();
  }
  if (o.estado === "Presentado") return false;
  return semaforoDe(o) === (u === "vencidas" ? "vencido" : "critico");
}

type Campo =
  | "empresa"
  | "tipo"
  | "cierre"
  | "vencimiento"
  | "presentacion"
  | "responsable"
  | "estado";

type Orden = { campo: Campo; asc: boolean };

function valorDe(o: VistaObligacion, campo: Campo): string {
  switch (campo) {
    case "empresa":
      return o.empresa.nombre;
    case "tipo":
      return o.tipo;
    case "cierre":
      return o.ejercicio.cierre;
    case "vencimiento":
      return o.vencimiento;
    case "presentacion":
      return o.presentacion ?? "";
    case "responsable":
      return o.empresa.responsable;
    case "estado":
      return o.estado;
  }
}

function Columna({
  campo,
  orden,
  onSort,
  children,
}: {
  campo: Campo;
  orden: Orden;
  onSort: (campo: Campo) => void;
  children: React.ReactNode;
}) {
  const activa = orden.campo === campo;
  const Icono = !activa ? ChevronsUpDown : orden.asc ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(campo)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        aria-label={`Ordenar por ${campo}`}
      >
        {children}
        <Icono className={activa ? "size-3.5" : "size-3.5 opacity-40"} />
      </button>
    </TableHead>
  );
}

function ObligacionesPage() {
  const { cargando, data, esAdmin, guardarObligacion, eliminarObligacion } = useStore();
  const busquedaUrl = Route.useSearch();
  const obligaciones = useObligacionesEnriquecidas();
  const [busqueda, setBusqueda] = useState("");
  const [empresa, setEmpresa] = useState(TODOS);
  const [responsable, setResponsable] = useState(busquedaUrl.responsable ?? TODOS);
  const [estado, setEstado] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [cierre, setCierre] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [urgencia, setUrgencia] = useState<Urgencia | undefined>(busquedaUrl.urgencia);
  const [editando, setEditando] = useState<Obligacion | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [orden, setOrden] = useState<{ campo: Campo; asc: boolean }>({
    campo: "vencimiento",
    asc: true,
  });

  const empresas = useMemo(
    () =>
      [...new Map(obligaciones.map((o) => [o.empresa.id, o.empresa])).values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    [obligaciones],
  );

  const cierres = useMemo(
    () =>
      [...new Set(obligaciones.map((o) => o.ejercicio.cierre.slice(0, 7)))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [obligaciones],
  );

  const filtradas = obligaciones.filter((o) => {
    const q = busqueda.trim().toLowerCase();
    if (
      q &&
      ![o.empresa.nombre, o.empresa.cuit, o.tipo, o.empresa.responsable, o.observaciones ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (empresa !== TODOS && o.empresa.id !== empresa) return false;
    if (responsable !== TODOS && o.empresa.responsable !== responsable) return false;
    if (estado !== TODOS && o.estado !== estado) return false;
    if (tipo !== TODOS && o.tipo !== tipo) return false;
    if (cierre !== TODOS && o.ejercicio.cierre.slice(0, 7) !== cierre) return false;
    if (desde && o.vencimiento.slice(0, 7) < desde) return false;
    if (hasta && o.vencimiento.slice(0, 7) > hasta) return false;
    if (urgencia && !cumpleUrgencia(o, urgencia)) return false;
    return true;
  });

  const ordenadas = [...filtradas].sort((a, b) => {
    const r = valorDe(a, orden.campo).localeCompare(valorDe(b, orden.campo), "es", {
      sensitivity: "base",
      numeric: true,
    });
    return orden.asc ? r : -r;
  });

  function ordenarPor(campo: Campo) {
    setOrden((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: true }));
  }

  function limpiar() {
    setBusqueda("");
    setEmpresa(TODOS);
    setResponsable(TODOS);
    setEstado(TODOS);
    setTipo(TODOS);
    setCierre(TODOS);
    setDesde("");
    setHasta("");
    setUrgencia(undefined);
  }

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando vencimientos...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Obligaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ordenadas.length} de {obligaciones.length} obligaciones
          </p>
          {urgencia && (
            <button
              type="button"
              onClick={() => setUrgencia(undefined)}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
            >
              {URGENCIAS[urgencia]} · quitar filtro ✕
            </button>
          )}
        </div>
        {esAdmin && (
          <Button
            onClick={() => {
              setEditando(null);
              setAbierto(true);
            }}
          >
            <Plus className="size-4" /> Nueva obligación
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="grid gap-2 md:col-span-3 lg:col-span-2">
            <Label htmlFor="q">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="q"
                className="pl-9"
                placeholder="Empresa, CUIT, responsable u observación"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <Filtro label="Cliente" value={empresa} onChange={setEmpresa}>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro label="Responsable" value={responsable} onChange={setResponsable}>
            {data.responsables.map((r) => (
              <SelectItem key={r.id} value={r.nombre}>
                {r.nombre}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro label="Estado" value={estado} onChange={setEstado}>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro label="Tipo de presentación" value={tipo} onChange={setTipo}>
            {TIPOS_PRESENTACION.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro label="Fecha de cierre" value={cierre} onChange={setCierre}>
            {cierres.map((c) => (
              <SelectItem key={c} value={c}>
                {formatCierre(`${c}-01`)}
              </SelectItem>
            ))}
          </Filtro>
          <div className="grid gap-2">
            <Label htmlFor="desde">Vence desde</Label>
            <Input
              id="desde"
              type="month"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hasta">Vence hasta</Label>
            <Input
              id="hasta"
              type="month"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={limpiar}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-4 text-sm [&_td]:py-2 [&_th]:h-9">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urgencia</TableHead>
                <Columna campo="empresa" orden={orden} onSort={ordenarPor}>
                  Empresa
                </Columna>
                <Columna campo="tipo" orden={orden} onSort={ordenarPor}>
                  Tipo de presentación
                </Columna>
                <Columna campo="cierre" orden={orden} onSort={ordenarPor}>
                  Cierre
                </Columna>
                <Columna campo="vencimiento" orden={orden} onSort={ordenarPor}>
                  Vencimiento
                </Columna>
                <Columna campo="presentacion" orden={orden} onSort={ordenarPor}>
                  Presentación
                </Columna>
                <Columna campo="responsable" orden={orden} onSort={ordenarPor}>
                  Responsable
                </Columna>
                <Columna campo="estado" orden={orden} onSort={ordenarPor}>
                  Estado
                </Columna>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="whitespace-nowrap">
                    <SemaforoBadge obligacion={o} />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium leading-tight">{o.empresa.nombre}</p>
                    <p className="text-xs text-muted-foreground">{o.empresa.cuit}</p>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <TipoBadge tipo={o.tipo} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatCierre(o.ejercicio.cierre)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="font-medium leading-tight">{formatFecha(o.vencimiento)}</p>
                    <p className="text-xs text-muted-foreground">{textoDias(o)}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatFecha(o.presentacion)}</TableCell>
                  <TableCell>
                    <ResponsableIniciales nombre={o.empresa.responsable} />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.estado}
                      onValueChange={(v) => {
                        guardarObligacion({ ...o, estado: v as Estado });
                        toast.success("Los cambios fueron guardados correctamente.");
                      }}
                    >
                      <SelectTrigger className="h-7 w-[138px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      className="size-7"
                      variant="ghost"
                      aria-label="Editar obligación"
                      onClick={() => {
                        setEditando(o);
                        setAbierto(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {esAdmin && (
                      <Button
                        size="icon"
                        className="size-7"
                        variant="ghost"
                        aria-label="Eliminar obligación"
                        onClick={() => {
                          eliminarObligacion(o.id);
                          toast.success("Los cambios fueron guardados correctamente.");
                        }}
                      >
                        <Trash2 className="size-4 text-vencido" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {ordenadas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    No existen obligaciones para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ObligacionDialog open={abierto} onOpenChange={setAbierto} obligacion={editando} />
    </div>
  );
}

function Filtro({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}
