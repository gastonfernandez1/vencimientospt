import { cn } from "@/lib/utils";
import { SEMAFORO_LABEL, semaforoDe, type Estado, type Obligacion, type Semaforo } from "@/lib/domain";

const semaforoClases: Record<Semaforo, string> = {
  vencido: "bg-vencido-soft text-vencido border-vencido/30",
  critico: "bg-critico-soft text-critico border-critico/30",
  proximo: "bg-proximo-soft text-proximo border-proximo/30",
  presentado: "bg-presentado-soft text-presentado border-presentado/30",
};

export function puntoSemaforo(s: Semaforo) {
  return {
    vencido: "bg-vencido",
    critico: "bg-critico",
    proximo: "bg-proximo",
    presentado: "bg-presentado",
  }[s];
}

export function SemaforoBadge({ obligacion, className }: { obligacion: Obligacion; className?: string }) {
  const s = semaforoDe(obligacion);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        semaforoClases[s],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", puntoSemaforo(s))} />
      {SEMAFORO_LABEL[s]}
    </span>
  );
}

const estadoClases: Record<Estado, string> = {
  Pendiente: "bg-muted text-muted-foreground border-border",
  "En preparación": "bg-proximo-soft text-proximo border-proximo/30",
  "En revisión": "bg-proximo-soft text-proximo border-proximo/30",
  Presentado: "bg-presentado-soft text-presentado border-presentado/30",
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        estadoClases[estado],
      )}
    >
      {estado}
    </span>
  );
}
