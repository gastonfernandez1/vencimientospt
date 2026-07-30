import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { semaforoDe } from "@/lib/domain";

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

  function crear() {
    if (!nombre.trim()) {
      toast.error("No fue posible guardar la información. Intentá nuevamente.", {
        description: "El nombre de la empresa es obligatorio.",
      });
      return;
    }
    guardarEmpresa({ nombre: nombre.trim(), cuit: cuit.trim() });
    toast.success("Los cambios fueron guardados correctamente.");
    setNombre("");
    setCuit("");
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

      {data.empresas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-lg font-semibold">Todavía no hay empresas cargadas.</p>
          <Button className="mt-4" onClick={() => setAbierto(true)}>
            Agregar empresa
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.empresas.map((e) => {
            const propias = obligaciones.filter((o) => o.empresa.id === e.id);
            const vencidas = propias.filter((o) => semaforoDe(o) === "vencido").length;
            const ejercicios = data.ejercicios.filter((x) => x.empresaId === e.id).length;
            return (
              <Card key={e.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{e.nombre}</p>
                      <p className="text-xs text-muted-foreground">CUIT {e.cuit || "—"}</p>
                    </div>
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
                  <p className="text-sm text-muted-foreground">
                    {ejercicios} ejercicio{ejercicios === 1 ? "" : "s"} · {propias.length} obligación
                    {propias.length === 1 ? "" : "es"}
                    {vencidas > 0 && <span className="text-vencido"> · {vencidas} vencida(s)</span>}
                  </p>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to="/empresas/$empresaId" params={{ empresaId: e.id }}>
                      <Building2 className="size-4" /> Ver detalle
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
            <DialogDescription>Cargá el nombre y el CUIT del cliente.</DialogDescription>
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
