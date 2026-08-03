import { cn } from "@/lib/utils";
import {
  SEMAFORO_LABEL,
  indiceTipo,
  iniciales,
  semaforoDe,
  type Estado,
  type Obligacion,
  type Semaforo,
} from "@/lib/domain";

const tipoClases: Record<number, string> = {
  1: "bg-tipo-1-soft text-tipo-1 border-tipo-1/25",
  2: "bg-tipo-2-soft text-tipo-2 border-tipo-2/25",
  3: "bg-tipo-3-soft text-tipo-3 border-tipo-3/25",
  4: "bg-tipo-4-soft text-tipo-4 border-tipo-4/25",
  5: "bg-tipo-5-soft text-tipo-5 border-tipo-5/25",
  6: "bg-tipo-6-soft text-tipo-6 border-tipo-6/25",
  7: "bg-tipo-7-soft text-tipo-7 border-tipo-7/25",
};

const tipoPunto: Record<number, string> = {
  1: "bg-tipo-1",
  2: "bg-tipo-2",
  3: "bg-tipo-3",
  4: "bg-tipo-4",
  5: "bg-tipo-5",
  6: "bg-tipo-6",
  7: "bg-tipo-7",
};

/** Chip destacado con el tipo de presentación. */
export function TipoBadge({ tipo, className }: { tipo: string; className?: string }) {
  const i = indiceTipo(tipo);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold leading-tight",
        tipoClases[i],
        className,
      )}
      title={tipo}
    >
      <span className={cn("size-2 shrink-0 rounded-sm", tipoPunto[i])} />
      <span className="truncate">{tipo}</span>
    </span>
  );
}

/** Iniciales del responsable, con el nombre completo en el tooltip. */
export function ResponsableIniciales({ nombre }: { nombre?: string }) {
  return (
    <span
      title={nombre || "Sin responsable"}
      aria-label={nombre || "Sin responsable"}
      className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-secondary-foreground"
    >
      {iniciales(nombre)}
    </span>
  );
}

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
