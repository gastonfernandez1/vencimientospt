import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { EstadoBadge, SemaforoBadge } from "@/components/app/badges";
import { ObligacionDialog } from "@/components/app/obligacion-dialog";
import { useObligacionesEnriquecidas, useStore } from "@/lib/store";
import {
  ESTADOS,
  RESPONSABLES,
  TIPOS_PRESENTACION,
  formatFecha,
  textoDias,
  type Estado,
  type Obligacion,
} from "@/lib/domain";

export const Route = createFileRoute("/obligaciones")({
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

function ObligacionesPage() {
  const { cargando, guardarObligacion, eliminarObligacion } = useStore();
  const obligaciones = useObligacionesEnriquecidas();
  const [busqueda, setBusqueda] = useState("");
  const [empresa, setEmpresa] = useState(TODOS);
  const [responsable, setResponsable] = useState(TODOS);
  const [estado, setEstado] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [editando, setEditando] = useState<Obligacion | null>(null);
  const [abierto, setAbierto] = useState(false);

  const empresas = useMemo(
    () =>
      [...new Map(obligaciones.map((o) => [o.empresa.id, o.empresa])).values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    [obligaciones],
  );

  const filtradas = obligaciones.filter((o) => {
    const q = busqueda.trim().toLowerCase();
    if (
      q &&
      ![o.empresa.nombre, o.empresa.cuit, o.tipo, o.responsable, o.observaciones ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (empresa !== TODOS && o.empresa.id !== empresa) return false;
    if (responsable !== TODOS && o.responsable !== responsable) return false;
    if (estado !== TODOS && o.estado !== estado) return false;
    if (tipo !== TODOS && o.tipo !== tipo) return false;
    if (desde && o.vencimiento < desde) return false;
    if (hasta && o.vencimiento > hasta) return false;
    return true;
  });

  function limpiar() {
    setBusqueda("");
    setEmpresa(TODOS);
    setResponsable(TODOS);
    setEstado(TODOS);
    setTipo(TODOS);
    setDesde("");
    setHasta("");
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
            {filtradas.length} de {obligaciones.length} obligaciones
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="size-4" /> Nueva obligación
        </Button>
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
            {RESPONSABLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
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
          <div className="grid gap-2">
            <Label htmlFor="desde">Vence desde</Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hasta">Vence hasta</Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={limpiar}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urgencia</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo de presentación</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <SemaforoBadge obligacion={o} />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{o.empresa.nombre}</p>
                    <p className="text-xs text-muted-foreground">{o.empresa.cuit}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px]">{o.tipo}</TableCell>
                  <TableCell className="text-sm">{formatFecha(o.ejercicio.cierre)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{formatFecha(o.vencimiento)}</p>
                    <p className="text-xs text-muted-foreground">{textoDias(o)}</p>
                  </TableCell>
                  <TableCell className="text-sm">{formatFecha(o.presentacion)}</TableCell>
                  <TableCell className="text-sm">{o.responsable}</TableCell>
                  <TableCell>
                    <Select
                      value={o.estado}
                      onValueChange={(v) => {
                        guardarObligacion({ ...o, estado: v as Estado });
                        toast.success("Los cambios fueron guardados correctamente.");
                      }}
                    >
                      <SelectTrigger className="h-8 w-[150px]">
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
                      variant="ghost"
                      aria-label="Editar obligación"
                      onClick={() => {
                        setEditando(o);
                        setAbierto(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar obligación"
                      onClick={() => {
                        eliminarObligacion(o.id);
                        toast.success("Los cambios fueron guardados correctamente.");
                      }}
                    >
                      <Trash2 className="size-4 text-vencido" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 && (
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
