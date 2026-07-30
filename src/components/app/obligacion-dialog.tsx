import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  ESTADOS,
  RESPONSABLES,
  TIPOS_PRESENTACION,
  formatCierre,
  type Estado,
  type Obligacion,
} from "@/lib/domain";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obligacion?: Obligacion | null;
  ejercicioIdInicial?: string;
};

export function ObligacionDialog({ open, onOpenChange, obligacion, ejercicioIdInicial }: Props) {
  const { data, guardarObligacion } = useStore();
  const [form, setForm] = useState({
    ejercicioId: "",
    tipo: TIPOS_PRESENTACION[0] as string,
    vencimiento: "",
    responsable: RESPONSABLES[0],
    estado: "Pendiente" as Estado,
    presentacion: "",
    observaciones: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      ejercicioId: obligacion?.ejercicioId ?? ejercicioIdInicial ?? data.ejercicios[0]?.id ?? "",
      tipo: obligacion?.tipo ?? TIPOS_PRESENTACION[0],
      vencimiento: obligacion?.vencimiento ?? "",
      responsable: obligacion?.responsable ?? RESPONSABLES[0],
      estado: obligacion?.estado ?? "Pendiente",
      presentacion: obligacion?.presentacion ?? "",
      observaciones: obligacion?.observaciones ?? "",
    });
  }, [open, obligacion, ejercicioIdInicial, data.ejercicios]);

  const empresasPorId = new Map(data.empresas.map((e) => [e.id, e]));

  function guardar() {
    if (!form.ejercicioId || !form.vencimiento) {
      toast.error("No fue posible guardar la información. Intentá nuevamente.", {
        description: "Elegí un ejercicio fiscal y una fecha de vencimiento.",
      });
      return;
    }
    guardarObligacion({
      id: obligacion?.id,
      ejercicioId: form.ejercicioId,
      tipo: form.tipo,
      vencimiento: form.vencimiento,
      responsable: form.responsable,
      estado: form.estado,
      presentacion: form.presentacion || undefined,
      observaciones: form.observaciones || undefined,
    });
    toast.success("Los cambios fueron guardados correctamente.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{obligacion ? "Editar obligación" : "Nueva obligación"}</DialogTitle>
          <DialogDescription>
            Registrá el tipo de presentación, la fecha de vencimiento y el responsable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Empresa y ejercicio fiscal</Label>
            <Select
              value={form.ejercicioId}
              onValueChange={(v) => setForm((f) => ({ ...f, ejercicioId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un ejercicio" />
              </SelectTrigger>
              <SelectContent>
                {data.ejercicios.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empresasPorId.get(e.empresaId)?.nombre ?? "—"} · cierre {formatFecha(e.cierre)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de presentación</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PRESENTACION.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="venc">Fecha de vencimiento</Label>
              <Input
                id="venc"
                type="date"
                value={form.vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, vencimiento: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pres">Fecha de presentación (opcional)</Label>
              <Input
                id="pres"
                type="date"
                value={form.presentacion}
                onChange={(e) => setForm((f) => ({ ...f, presentacion: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Responsable</Label>
              <Select
                value={form.responsable}
                onValueChange={(v) => setForm((f) => ({ ...f, responsable: v }))}
              >
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
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm((f) => ({ ...f, estado: v as Estado }))}
              >
                <SelectTrigger>
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
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obs">Observaciones</Label>
            <Textarea
              id="obs"
              rows={3}
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
