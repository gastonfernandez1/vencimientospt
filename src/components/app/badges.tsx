import { cn } from "@/lib/utils";
import {
  indiceTipo,
  iniciales,
  semaforoDe,
  textoSemaforo,
  type Estado,
  type Obligacion,
  type Semaforo,
} from "@/lib/domain";

const tipoTexto: Record<number, string> = {
  1: "text-tipo-1",
  2: "text-tipo-2",
  3: "text-tipo-3",
  4: "text-tipo-4",
  5: "text-tipo-5",
  6: "text-tipo-6",
  7: "text-tipo-7",
};

const tipoBarra: Record<number, string> = {
  1: "bg-tipo-1",
  2: "bg-tipo-2",
  3: "bg-tipo-3",
  4: "bg-tipo-4",
  5: "bg-tipo-5",
  6: "bg-tipo-6",
  7: "bg-tipo-7",
};

/** Tipo de presentación: barra de color + texto, sin recuadro (se diferencia de Urgencia). */
export function TipoBadge({ tipo, className }: { tipo: string; className?: string }) {
  const i = indiceTipo(tipo);
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-2 text-xs font-medium", className)}
      title={tipo}
    >
      <span className={cn("h-4 w-[3px] shrink-0 rounded-full", tipoBarra[i])} />
      <span className={cn("truncate", tipoTexto[i])}>{tipo}</span>
    </span>
  );
}

/** Iniciales del responsable, con el nombre completo en el tooltip. */
export function ResponsableIniciales({ nombre }: { nombre?: string }) {
  return (
    <span
      title={nombre || "Sin responsable"}
      aria-label={nombre || "Sin responsable"}
      className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-secondary text-[11px] font-semibold text-secondary-foreground"
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
  neutro: "bg-muted text-muted-foreground border-border",
};

export function puntoSemaforo(s: Semaforo) {
  return {
    vencido: "bg-vencido",
    critico: "bg-critico",
    proximo: "bg-proximo",
    presentado: "bg-presentado",
    neutro: "bg-muted-foreground",
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
      {textoSemaforo(obligacion)}
    </span>
  );
}

const estadoClases: Record<Estado, string> = {
  Pendiente: "bg-muted text-muted-foreground border-border",
  "En preparación": "bg-proximo-soft text-proximo border-proximo/30",
  "En revisión": "bg-proximo-soft text-proximo border-proximo/30",
  Presentado: "bg-presentado-soft text-presentado border-presentado/30",
  "Presentación fuera de término": "bg-vencido-soft text-vencido border-vencido/30",
  CIA: "bg-secondary text-secondary-foreground border-border",
  "N/A": "bg-muted text-muted-foreground border-border",
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
