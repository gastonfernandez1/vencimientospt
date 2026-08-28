import { describe, expect, it } from "vitest";
import {
  aMes,
  desdeMes,
  diasRestantes,
  estaCerrada,
  formatCierre,
  formatFecha,
  formatFY,
  hoy,
  iniciales,
  indiceTipo,
  parseISO,
  semaforoDe,
  textoDias,
  textoSemaforo,
  toISO,
  type Obligacion,
} from "./domain";

function obligacion(overrides: Partial<Obligacion> = {}): Obligacion {
  return {
    id: "1",
    ejercicioId: "e1",
    tipo: "Estudio de Precios de Transferencia",
    vencimiento: toISO(hoy()),
    estado: "Pendiente",
    ...overrides,
  };
}

function diasDesdeHoy(dias: number): string {
  const d = hoy();
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

describe("parseISO / toISO", () => {
  it("hace un roundtrip sin desplazamiento de zona horaria", () => {
    expect(toISO(parseISO("2026-03-05"))).toBe("2026-03-05");
  });

  it("interpreta año, mes y día en horario local (no UTC)", () => {
    const d = parseISO("2026-01-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe("diasRestantes", () => {
  it("es 0 para hoy", () => {
    expect(diasRestantes(toISO(hoy()))).toBe(0);
  });

  it("es negativo para fechas pasadas", () => {
    expect(diasRestantes(diasDesdeHoy(-5))).toBe(-5);
  });

  it("es positivo para fechas futuras", () => {
    expect(diasRestantes(diasDesdeHoy(10))).toBe(10);
  });
});

describe("estaCerrada", () => {
  it("considera cerrados Presentado, fuera de término, CIA y N/A", () => {
    expect(estaCerrada("Presentado")).toBe(true);
    expect(estaCerrada("Presentación fuera de término")).toBe(true);
    expect(estaCerrada("CIA")).toBe(true);
    expect(estaCerrada("N/A")).toBe(true);
  });

  it("no considera cerrados los estados en curso", () => {
    expect(estaCerrada("Pendiente")).toBe(false);
    expect(estaCerrada("En preparación")).toBe(false);
    expect(estaCerrada("En revisión")).toBe(false);
  });
});

describe("iniciales", () => {
  it("toma la inicial de las primeras dos palabras", () => {
    expect(iniciales("Sofía Martínez")).toBe("SM");
  });

  it("funciona con un solo nombre", () => {
    expect(iniciales("Carla")).toBe("C");
  });

  it("devuelve — cuando no hay nombre", () => {
    expect(iniciales(undefined)).toBe("—");
    expect(iniciales("   ")).toBe("—");
  });
});

describe("indiceTipo", () => {
  it("es estable para el mismo tipo", () => {
    const a = indiceTipo("Informe Maestro");
    const b = indiceTipo("Informe Maestro");
    expect(a).toBe(b);
  });

  it("cae siempre en el rango 1..7", () => {
    for (const tipo of ["Informe Maestro", "Tipo desconocido", "Otro más raro"]) {
      const i = indiceTipo(tipo);
      expect(i).toBeGreaterThanOrEqual(1);
      expect(i).toBeLessThanOrEqual(7);
    }
  });
});

describe("aMes / desdeMes", () => {
  it("convierte fecha completa a mes y viceversa", () => {
    expect(aMes("2025-06-30")).toBe("2025-06");
    expect(desdeMes("2025-06")).toBe("2025-06-01");
  });

  it("devuelve string vacío para entradas vacías", () => {
    expect(aMes(undefined)).toBe("");
    expect(desdeMes("")).toBe("");
  });
});

describe("formatFecha / formatCierre / formatFY", () => {
  it("formatea fechas en es-AR", () => {
    expect(formatFecha("2026-03-05")).toBe("05/03/2026");
    expect(formatCierre("2025-06-30")).toBe("06/2025");
    expect(formatFY("2025-06-30")).toBe("FY 06/2025");
  });

  it("devuelve — cuando falta el valor", () => {
    expect(formatFecha(undefined)).toBe("—");
    expect(formatCierre(undefined)).toBe("—");
    expect(formatFY(undefined)).toBe("FY —");
  });
});

describe("semaforoDe", () => {
  it("es 'presentado' cuando el estado es Presentado", () => {
    expect(semaforoDe(obligacion({ estado: "Presentado", vencimiento: diasDesdeHoy(-30) }))).toBe(
      "presentado",
    );
  });

  it("es 'vencido' cuando el estado es fuera de término", () => {
    expect(
      semaforoDe(obligacion({ estado: "Presentación fuera de término", vencimiento: diasDesdeHoy(-1) })),
    ).toBe("vencido");
  });

  it("es 'neutro' para CIA y N/A sin importar la fecha", () => {
    expect(semaforoDe(obligacion({ estado: "CIA", vencimiento: diasDesdeHoy(-100) }))).toBe("neutro");
    expect(semaforoDe(obligacion({ estado: "N/A", vencimiento: diasDesdeHoy(100) }))).toBe("neutro");
  });

  it("es 'vencido' cuando la fecha ya pasó y sigue pendiente", () => {
    expect(semaforoDe(obligacion({ estado: "Pendiente", vencimiento: diasDesdeHoy(-1) }))).toBe(
      "vencido",
    );
  });

  it("es 'critico' dentro de los próximos 7 días", () => {
    expect(semaforoDe(obligacion({ estado: "Pendiente", vencimiento: diasDesdeHoy(7) }))).toBe(
      "critico",
    );
  });

  it("es 'proximo' más allá de los 7 días", () => {
    expect(semaforoDe(obligacion({ estado: "Pendiente", vencimiento: diasDesdeHoy(8) }))).toBe(
      "proximo",
    );
  });
});

describe("textoDias / textoSemaforo", () => {
  it("describe correctamente vencido, hoy y en N días", () => {
    expect(textoDias(obligacion({ vencimiento: diasDesdeHoy(-1) }))).toBe("Vencido hace 1 día");
    expect(textoDias(obligacion({ vencimiento: diasDesdeHoy(-3) }))).toBe("Vencido hace 3 días");
    expect(textoDias(obligacion({ vencimiento: diasDesdeHoy(0) }))).toBe("Vence hoy");
    expect(textoDias(obligacion({ vencimiento: diasDesdeHoy(1) }))).toBe("En 1 día");
    expect(textoDias(obligacion({ vencimiento: diasDesdeHoy(5) }))).toBe("En 5 días");
  });

  it("para estados cerrados devuelve el estado en vez de la cuenta de días", () => {
    expect(textoDias(obligacion({ estado: "CIA", vencimiento: diasDesdeHoy(-10) }))).toBe("CIA");
  });

  it("textoSemaforo distingue vencido/hoy/próximo/este mes", () => {
    expect(textoSemaforo(obligacion({ vencimiento: diasDesdeHoy(-1) }))).toBe("Vencido");
    expect(textoSemaforo(obligacion({ vencimiento: diasDesdeHoy(0) }))).toBe("Vence hoy");
    expect(textoSemaforo(obligacion({ vencimiento: diasDesdeHoy(3) }))).toBe("Vence en 3 días");
  });
});
