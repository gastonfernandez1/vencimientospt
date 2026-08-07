export const TIPOS_PRESENTACION = [
  "Firma Digital",
  "F.2668 / F.2672",
  "Estudio de Precios de Transferencia",
  "Informe Maestro",
  "F.8097 – Informe País por País",
  "F.8096 – Informe UEC",
  "Informe presentación CBCR",
] as const;
export type TipoPresentacion = (typeof TIPOS_PRESENTACION)[number];

export const ESTADOS = [
  "Pendiente",
  "En preparación",
  "En revisión",
  "Presentado",
  "Presentación fuera de término",
  "CIA",
  "N/A",
] as const;
export type Estado = (typeof ESTADOS)[number];

/** Estados que implican que la obligación ya está resuelta (no urgente). */
export const ESTADOS_CERRADOS: readonly Estado[] = [
  "Presentado",
  "Presentación fuera de término",
  "CIA",
  "N/A",
];

/** Estados en los que corresponde cargar la fecha de presentación. */
export const ESTADOS_CON_PRESENTACION: readonly Estado[] = [
  "Presentado",
  "Presentación fuera de término",
];

export function estaCerrada(estado: Estado): boolean {
  return ESTADOS_CERRADOS.includes(estado);
}

/** Iniciales de un responsable, ej. "Sofía Martínez" -> "SM". */
export function iniciales(nombre?: string): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  return partes
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Índice estable (1..7) de color para cada tipo de presentación. */
export function indiceTipo(tipo: string): number {
  const i = (TIPOS_PRESENTACION as readonly string[]).indexOf(tipo);
  if (i >= 0) return (i % 7) + 1;
  let h = 0;
  for (const c of tipo) h = (h * 31 + c.charCodeAt(0)) % 7;
  return h + 1;
}

export type Responsable = { id: string; nombre: string; activo: boolean };

export type Empresa = { id: string; nombre: string; cuit: string; responsable: string };
export type Ejercicio = { id: string; empresaId: string; cierre: string };
export type Obligacion = {
  id: string;
  ejercicioId: string;
  tipo: string;
  vencimiento: string;
  estado: Estado;
  presentacion?: string;
  observaciones?: string;
};

export type Semaforo = "presentado" | "vencido" | "critico" | "proximo" | "neutro";

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  presentado: "Presentado",
  vencido: "Vencido",
  critico: "Vence en 7 días",
  proximo: "Próximo",
  neutro: "Sin vencimiento",
};

export function hoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISO(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function formatFecha(value?: string): string {
  if (!value) return "—";
  const d = parseISO(value);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Cierre de ejercicio: sólo mes y año (ej. "06/2025"). */
export function formatCierre(value?: string): string {
  if (!value) return "—";
  const d = parseISO(value);
  return d.toLocaleDateString("es-AR", { month: "2-digit", year: "numeric" });
}

/** Título de ejercicio fiscal (ej. "FY 12/2025"). */
export function formatFY(value?: string): string {
  return value ? `FY ${formatCierre(value)}` : "FY —";
}

/** "2025-06-30" -> "2025-06" (valor para <input type="month">) */
export function aMes(value?: string): string {
  return value ? value.slice(0, 7) : "";
}

/** "2025-06" -> "2025-06-01" (valor almacenado como fecha) */
export function desdeMes(value: string): string {
  return value ? `${value}-01` : "";
}

export function diasRestantes(vencimiento: string): number {
  const diff = parseISO(vencimiento).getTime() - hoy().getTime();
  return Math.round(diff / 86400000);
}

export function semaforoDe(o: Obligacion): Semaforo {
  if (o.estado === "Presentado") return "presentado";
  if (o.estado === "Presentación fuera de término") return "vencido";
  if (o.estado === "CIA" || o.estado === "N/A") return "neutro";
  const dias = diasRestantes(o.vencimiento);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  const v = parseISO(o.vencimiento);
  const n = hoy();
  if (v.getFullYear() === n.getFullYear() && v.getMonth() === n.getMonth()) return "proximo";
  return "proximo";
}

export function textoDias(o: Obligacion): string {
  if (estaCerrada(o.estado)) return o.estado;
  const d = diasRestantes(o.vencimiento);
  if (d < 0) return `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`;
  if (d === 0) return "Vence hoy";
  return `En ${d} día${d === 1 ? "" : "s"}`;
}

/** Texto del semáforo acorde a la fecha real de vencimiento. */
export function textoSemaforo(o: Obligacion): string {
  if (o.estado === "Presentado") return "Presentado";
  if (o.estado === "Presentación fuera de término") return "Fuera de término";
  if (o.estado === "CIA") return "CIA";
  if (o.estado === "N/A") return "N/A";
  const d = diasRestantes(o.vencimiento);
  if (d < 0) return "Vencido";
  if (d === 0) return "Vence hoy";
  if (d <= 7) return `Vence en ${d} día${d === 1 ? "" : "s"}`;
  const v = parseISO(o.vencimiento);
  const n = hoy();
  if (v.getFullYear() === n.getFullYear() && v.getMonth() === n.getMonth()) return "Vence este mes";
  return `Vence ${formatCierre(o.vencimiento)}`;
}
