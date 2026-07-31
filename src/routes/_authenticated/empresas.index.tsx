import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useObligacionesEnriquecidas, useStore } from "@/lib/store";
import { RESPONSABLES, semaforoDe } from "@/lib/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas y clientes | Vencimientos PT" },
      {
        name: "description",
        content: "Gestión de empresas, CUIT y ejercicios fiscales del equipo de Precios de Transferencia.",
      },
      { property: "og:title", content: "Empresas | Vencimientos PT" },
      { property: "og:description", content: "Administrá clientes y sus ejercicios fiscales." },
    ],
  }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const { cargando, data, guardarEmpresa, eliminarEmpresa } = useStore();
  const obligaciones = useObligacionesEnriquecidas();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [responsable, setResponsable] = useState(RESPONSABLES[0]);
  const [busqueda, setBusqueda] = useState("");

  const empresasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? data.empresas.filter(
          (e) =>
            e.nombre.toLowerCase().includes(q) ||
            e.cuit.toLowerCase().includes(q) ||
            e.responsable.toLowerCase().includes(q),
        )
      : data.empresas;
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [data.empresas, busqueda]);

  function crear() {
    if (!nombre.trim()) {
      toast.error("No fue posible guardar la información. Intentá nuevamente.", {
        description: "El nombre de la empresa es obligatorio.",
      });
      return;
    }
    guardarEmpresa({ nombre: nombre.trim(), cuit: cuit.trim(), responsable });
    toast.success("Los cambios fueron guardados correctamente.");
    setNombre("");
    setCuit("");
    setResponsable(RESPONSABLES[0]);
    setAbierto(false);
  }

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando vencimientos...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.empresas.length} cliente{data.empresas.length === 1 ? "" : "s"} en seguimiento
          </p>
        </div>
        <Button onClick={() => setAbierto(true)}>
          <Plus className="size-4" /> Agregar empresa
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre, CUIT o responsable..."
        value={busqueda}
        onChange={(ev) => setBusqueda(ev.target.value)}
        className="max-w-sm"
      />

      {data.empresas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-lg font-semibold">Todavía no hay empresas cargadas.</p>
          <Button className="mt-4" onClick={() => setAbierto(true)}>
            Agregar empresa
          </Button>
        </div>
      ) : (
        <Card className="divide-y divide-border overflow-hidden py-0">
          {empresasFiltradas.map((e) => {
            const propias = obligaciones.filter((o) => o.empresa.id === e.id);
            const vencidas = propias.filter((o) => semaforoDe(o) === "vencido").length;
            const ejercicios = data.ejercicios.filter((x) => x.empresaId === e.id).length;
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50"
              >
                <Link
                  to="/empresas/$empresaId"
                  params={{ empresaId: e.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.nombre}</span>
                  <span className="hidden w-36 shrink-0 text-xs text-muted-foreground sm:block">
                    {e.cuit || "—"}
                  </span>
                  <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground lg:block">
                    {e.responsable || "Sin responsable"}
                  </span>
                  <span className="hidden w-28 shrink-0 text-xs text-muted-foreground md:block">
                    {ejercicios} ejerc.
                  </span>
                  <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">
                    {propias.length} oblig.
                    {vencidas > 0 && <span className="text-vencido"> · {vencidas} venc.</span>}
                  </span>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar empresa"
                  onClick={() => {
                    eliminarEmpresa(e.id);
                    toast.success("Los cambios fueron guardados correctamente.");
                  }}
                >
                  <Trash2 className="size-4 text-vencido" />
                </Button>
              </div>
            );
          })}
          {empresasFiltradas.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hay empresas que coincidan con la búsqueda.
            </p>
          )}
        </Card>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
            <DialogDescription>
              Cargá el nombre, el CUIT y el responsable del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                placeholder="30-12345678-9"
                value={cuit}
                onChange={(ev) => setCuit(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsable</Label>
              <Select value={responsable} onValueChange={setResponsable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSABLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={crear}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
