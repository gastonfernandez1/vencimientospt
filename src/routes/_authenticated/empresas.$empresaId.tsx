import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SemaforoBadge, TipoBadge } from "@/components/app/badges";
import { ObligacionDialog } from "@/components/app/obligacion-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  desdeMes,
  formatFY,
  formatFecha,
  type Obligacion,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/empresas/$empresaId")({
  head: () => ({
    meta: [
      { title: "Detalle de empresa | Vencimientos PT" },
      {
        name: "description",
        content: "Ejercicios fiscales y obligaciones de la empresa seleccionada.",
      },
      { property: "og:title", content: "Detalle de empresa | Vencimientos PT" },
      {
        property: "og:description",
        content: "Actualizá estados, responsables y fechas de cada obligación.",
      },
    ],
  }),
  component: EmpresaDetalle,
});

function EmpresaDetalle() {
  const { empresaId } = Route.useParams();
  const { cargando, data, esAdmin, guardarEmpresa, guardarEjercicio, eliminarEjercicio, eliminarObligacion } =
    useStore();
  const [dialogoEjercicio, setDialogoEjercicio] = useState(false);
  const [cierre, setCierre] = useState("");
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [responsable, setResponsable] = useState("");
  const [obligacionAbierta, setObligacionAbierta] = useState(false);
  const [obligacionEditada, setObligacionEditada] = useState<Obligacion | null>(null);
  const [ejercicioActivo, setEjercicioActivo] = useState<string | undefined>();

  const empresa = data.empresas.find((e) => e.id === empresaId);

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando vencimientos...</p>;
  }

  if (!empresa) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">No encontramos esta empresa.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/empresas">Volver a empresas</Link>
        </Button>
      </div>
    );
  }

  const ejercicios = data.ejercicios
    .filter((x) => x.empresaId === empresa.id)
    .sort((a, b) => b.cierre.localeCompare(a.cierre));

  const idsEjercicios = new Set(ejercicios.map((e) => e.id));
  const firmasDigitales = data.obligaciones
    .filter((o) => idsEjercicios.has(o.ejercicioId) && o.tipo === "Firma Digital")
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  const filaObligacion = (o: Obligacion) => (
    <div
      key={o.id}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
    >
      <SemaforoBadge obligacion={o} />
      <span className="min-w-[200px] flex-1">
        <TipoBadge tipo={o.tipo} />
      </span>
      <div className="text-sm">
        <p className="text-xs text-muted-foreground">Vencimiento</p>
        <p className="font-medium">{formatFecha(o.vencimiento)}</p>
      </div>
      {o.presentacion && (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Presentación</p>
          <p className="font-medium">{formatFecha(o.presentacion)}</p>
        </div>
      )}
      <div className="ml-auto flex">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Editar obligación"
          onClick={() => {
            setObligacionEditada(o);
            setEjercicioActivo(o.ejercicioId);
            setObligacionAbierta(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
        {esAdmin && (
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
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/empresas">
          <ArrowLeft className="size-4" /> Empresas
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{empresa.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            CUIT {empresa.cuit || "—"} · Responsable: {empresa.responsable || "sin asignar"}
          </p>
        </div>
        {esAdmin && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setNombre(empresa.nombre);
              setCuit(empresa.cuit);
              setResponsable(empresa.responsable || "");
              setEditandoEmpresa(true);
            }}
          >
            <Pencil className="size-4" /> Editar empresa
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCierre("");
              setDialogoEjercicio(true);
            }}
          >
            <Plus className="size-4" /> Nuevo ejercicio
          </Button>
        </div>
        )}
      </div>

      {firmasDigitales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firma Digital</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">{firmasDigitales.map(filaObligacion)}</CardContent>
        </Card>
      )}

      {ejercicios.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center text-muted-foreground">
          Esta empresa todavía no tiene ejercicios fiscales cargados.
        </div>
      )}

      {ejercicios.map((ej) => {
        const obligaciones = data.obligaciones
          .filter((o) => o.ejercicioId === ej.id && o.tipo !== "Firma Digital")
          .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
        return (
          <Card key={ej.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{formatFY(ej.cierre)}</CardTitle>
              {esAdmin && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setObligacionEditada(null);
                    setEjercicioActivo(ej.id);
                    setObligacionAbierta(true);
                  }}
                >
                  <Plus className="size-4" /> Obligación
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar ejercicio"
                  onClick={() => {
                    eliminarEjercicio(ej.id);
                    toast.success("Los cambios fueron guardados correctamente.");
                  }}
                >
                  <Trash2 className="size-4 text-vencido" />
                </Button>
              </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {obligaciones.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No existen obligaciones para este ejercicio.
                </p>
              )}
              {obligaciones.map(filaObligacion)}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dialogoEjercicio} onOpenChange={setDialogoEjercicio}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo ejercicio fiscal</DialogTitle>
            <DialogDescription>Indicá el mes y año de cierre del ejercicio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="cierre">Mes de cierre</Label>
            <Input
              id="cierre"
              type="month"
              value={cierre}
              onChange={(e) => setCierre(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoEjercicio(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!cierre) {
                  toast.error("No fue posible guardar la información. Intentá nuevamente.");
                  return;
                }
                guardarEjercicio({ empresaId: empresa.id, cierre: desdeMes(cierre) });
                toast.success("Los cambios fueron guardados correctamente.");
                setDialogoEjercicio(false);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editandoEmpresa} onOpenChange={setEditandoEmpresa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
            <DialogDescription>
              Actualizá el nombre, el CUIT o el responsable del cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="n">Nombre</Label>
              <Input id="n" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c">CUIT</Label>
              <Input id="c" value={cuit} onChange={(e) => setCuit(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Responsable</Label>
              <Select value={responsable} onValueChange={setResponsable}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {data.responsables.map((r) => (
                    <SelectItem key={r.id} value={r.nombre}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoEmpresa(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                guardarEmpresa({
                  id: empresa.id,
                  nombre: nombre.trim(),
                  cuit: cuit.trim(),
                  responsable,
                });
                toast.success("Los cambios fueron guardados correctamente.");
                setEditandoEmpresa(false);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ObligacionDialog
        open={obligacionAbierta}
        onOpenChange={setObligacionAbierta}
        obligacion={obligacionEditada}
        ejercicioIdInicial={ejercicioActivo}
        ejercicioFijo
      />
    </div>
  );
}
