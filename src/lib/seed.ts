import { toISO, type Empresa, type Ejercicio, type Obligacion, type Estado } from "./domain";

function offset(dias: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

export function crearDatosEjemplo(): {
  empresas: Empresa[];
  ejercicios: Ejercicio[];
  obligaciones: Obligacion[];
} {
  const empresas: Empresa[] = [
    { id: "e1", nombre: "Agroexport Pampa S.A.", cuit: "30-71234567-9" },
    { id: "e2", nombre: "Litio Andino S.R.L.", cuit: "30-70987654-3" },
    { id: "e3", nombre: "Farmalab Argentina S.A.", cuit: "30-68741235-1" },
    { id: "e4", nombre: "Tecnosur Software S.A.", cuit: "30-71765432-8" },
    { id: "e5", nombre: "Distribuidora del Plata S.A.", cuit: "30-69874512-4" },
  ];

  const ejercicios: Ejercicio[] = [
    { id: "x1", empresaId: "e1", cierre: "2025-06-30" },
    { id: "x2", empresaId: "e1", cierre: "2024-06-30" },
    { id: "x3", empresaId: "e2", cierre: "2025-12-31" },
    { id: "x4", empresaId: "e3", cierre: "2025-09-30" },
    { id: "x5", empresaId: "e4", cierre: "2025-12-31" },
    { id: "x6", empresaId: "e5", cierre: "2025-03-31" },
  ];

  const base: Array<[string, string, number, string, Estado, string?]> = [
    ["x1", "Firma Digital", -18, "Sofía Martínez", "Pendiente", "Falta renovar el token del apoderado."],
    ["x1", "F.2668 / F.2672", -5, "Julián Pereyra", "En revisión"],
    ["x1", "Estudio de Precios de Transferencia", 3, "Carla Domínguez", "En preparación"],
    ["x1", "Informe Maestro", 21, "Matías Rossi", "Pendiente"],
    ["x2", "F.2668 / F.2672", -240, "Sofía Martínez", "Presentado"],
    ["x2", "Estudio de Precios de Transferencia", -250, "Carla Domínguez", "Presentado"],
    ["x3", "Firma Digital", 6, "Lucía Fernández", "En preparación"],
    ["x3", "F.8097 – Informe País por País", 12, "Matías Rossi", "Pendiente", "Grupo con casa matriz en España."],
    ["x3", "F.8096 – Informe UEC", 45, "Lucía Fernández", "Pendiente"],
    ["x4", "F.2668 / F.2672", 1, "Julián Pereyra", "En revisión"],
    ["x4", "Estudio de Precios de Transferencia", 9, "Sofía Martínez", "En preparación"],
    ["x4", "Informe presentación CBCR", 60, "Carla Domínguez", "Pendiente"],
    ["x5", "Firma Digital", -2, "Matías Rossi", "Pendiente"],
    ["x5", "Informe Maestro", 25, "Lucía Fernández", "Pendiente"],
    ["x5", "F.2668 / F.2672", 90, "Julián Pereyra", "Pendiente"],
    ["x6", "Estudio de Precios de Transferencia", -35, "Carla Domínguez", "Presentado"],
    ["x6", "F.2668 / F.2672", 15, "Sofía Martínez", "En preparación"],
    ["x6", "Informe presentación CBCR", 120, "Matías Rossi", "Pendiente"],
  ];

  const obligaciones: Obligacion[] = base.map(([ejercicioId, tipo, dias, responsable, estado, obs], i) => ({
    id: `o${i + 1}`,
    ejercicioId,
    tipo,
    vencimiento: offset(dias),
    responsable,
    estado,
    presentacion: estado === "Presentado" ? offset(dias - 2) : undefined,
    observaciones: obs,
  }));

  return { empresas, ejercicios, obligaciones };
}
