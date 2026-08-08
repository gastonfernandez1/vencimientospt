import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ESTADOS, TIPOS_PRESENTACION, type Estado } from "@/lib/domain";

type Fila = {
  linea: number;
  empresa: string;
  cuit: string;
  responsable: string;
  cierre: string; // YYYY-MM-01
  tipo: string;
  vencimiento: string; // YYYY-MM-DD
  estado: Estado;
  presentacion?: string;
  observaciones?: string;
};

const COLUMNAS = [
  "Empresa",
  "CUIT",
  "Responsable",
  "Cierre (MM/AAAA)",
  "Tipo de presentación",
  "Vencimiento (DD/MM/AAAA)",
  "Estado",
  "Fecha de presentación (DD/MM/AAAA)",
  "Observaciones",
];

const CLAVES = [
  "empresa",
  "cuit",
  "responsable",
  "cierre",
  "tipo",
  "vencimiento",
  "estado",
  "presentacion",
  "observaciones",
] as const;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function claveDeColumna(encabezado: string): (typeof CLAVES)[number] | null {
  const n = normalizar(encabezado);
  if (n.startsWith("empresa") || n.startsWith("cliente")) return "empresa";
  if (n.startsWith("cuit")) return "cuit";
  if (n.startsWith("responsable")) return "responsable";
  if (n.startsWith("cierre") || n.startsWith("periodo")) return "cierre";
  if (n.startsWith("tipo")) return "tipo";
  if (n.startsWith("vencimiento")) return "vencimiento";
  if (n.startsWith("estado")) return "estado";
  if (n.startsWith("fecha de presentacion") || n === "presentacion") return "presentacion";
  if (n.startsWith("observacion")) return "observaciones";
  return null;
}

function iso(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dia = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** Acepta Date de Excel, "DD/MM/AAAA" o "AAAA-MM-DD". */
function aFecha(valor: unknown): string | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) return iso(valor);
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  let m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const anio = Number(m[3]!.length === 2 ? `20${m[3]}` : m[3]);
    return iso(new Date(anio, Number(m[2]) - 1, Number(m[1])));
  }
  return null;
}

/** Acepta "MM/AAAA", "AAAA-MM" o una fecha completa; devuelve el 1° del mes. */
function aCierre(valor: unknown): string | null {
  if (valor instanceof Date && !isNaN(valor.getTime()))
    return iso(new Date(valor.getFullYear(), valor.getMonth(), 1));
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  let m = texto.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return iso(new Date(Number(m[2]), Number(m[1]) - 1, 1));
  m = texto.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return iso(new Date(Number(m[1]), Number(m[2]) - 1, 1));
  const completa = aFecha(texto);
  return completa ? `${completa.slice(0, 7)}-01` : null;
}

function aEstado(valor: unknown): Estado {
  const n = normalizar(String(valor ?? ""));
  const encontrado = ESTADOS.find((e) => normalizar(e) === n);
  return encontrado ?? "Pendiente";
}

function aTipo(valor: unknown): string {
  const n = normalizar(String(valor ?? ""));
  const encontrado = TIPOS_PRESENTACION.find((t) => normalizar(t) === n);
  return encontrado ?? String(valor ?? "").trim();
}

export function ImportarExcel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [resumen, setResumen] = useState<string | null>(null);

  async function descargarPlantilla() {
    const XLSX = await import("xlsx");
    const ejemplo = [
      COLUMNAS,
      [
        "Cliente Ejemplo S.A.",
        "30-12345678-9",
        "Sofía Martínez",
        "12/2025",
        "Estudio de Precios de Transferencia",
        "30/06/2026",
        "Pendiente",
        "",
        "",
      ],
      [
        "Cliente Ejemplo S.A.",
        "30-12345678-9",
        "Sofía Martínez",
        "12/2025",
        "F.2668 / F.2672",
        "15/07/2026",
        "Presentado",
        "10/07/2026",
        "Presentado en término",
      ],
    ];
    const hoja = XLSX.utils.aoa_to_sheet(ejemplo);
    hoja["!cols"] = COLUMNAS.map(() => ({ wch: 28 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Obligaciones");
    XLSX.writeFile(libro, "plantilla-vencimientos-pt.xlsx");
  }

  async function procesarArchivo(file: File) {
    setProcesando(true);
    setErrores([]);
    setResumen(null);
    try {
      const XLSX = await import("xlsx");
      const libro = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const hoja = libro.Sheets[libro.SheetNames[0]!];
      if (!hoja) throw new Error("El archivo no tiene hojas.");
      const bruto = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });

      const fallos: string[] = [];
      const filas: Fila[] = [];

      bruto.forEach((registro, i) => {
        const linea = i + 2;
        const fila: Record<string, unknown> = {};
        Object.entries(registro).forEach(([col, valor]) => {
          const clave = claveDeColumna(col);
          if (clave) fila[clave] = valor;
        });

        const empresa = String(fila["empresa"] ?? "").trim();
        if (!empresa) return; // fila vacía
        const cierre = aCierre(fila["cierre"]);
        const vencimiento = aFecha(fila["vencimiento"]);
        const tipo = aTipo(fila["tipo"]);
        if (!cierre) {
          fallos.push(`Fila ${linea}: cierre inválido (usá MM/AAAA).`);
          return;
        }
        if (!vencimiento) {
          fallos.push(`Fila ${linea}: vencimiento inválido (usá DD/MM/AAAA).`);
          return;
        }
        if (!tipo) {
          fallos.push(`Fila ${linea}: falta el tipo de presentación.`);
          return;
        }
        filas.push({
          linea,
          empresa,
          cuit: String(fila["cuit"] ?? "").trim(),
          responsable: String(fila["responsable"] ?? "").trim(),
          cierre,
          tipo,
          vencimiento,
          estado: aEstado(fila["estado"]),
          presentacion: aFecha(fila["presentacion"]) ?? undefined,
          observaciones: String(fila["observaciones"] ?? "").trim() || undefined,
        });
      });

      if (filas.length === 0) {
        setErrores(fallos.length ? fallos : ["No se encontraron filas válidas para importar."]);
        return;
      }

      // Empresas existentes
      const { data: empresasBD, error: e1 } = await supabase.from("empresas").select("id, nombre");
      if (e1) throw e1;
      const mapaEmpresas = new Map(
        (empresasBD ?? []).map((e) => [normalizar(e.nombre), e.id as string]),
      );

      let empresasNuevas = 0;
      for (const nombre of new Set(filas.map((f) => f.empresa))) {
        if (mapaEmpresas.has(normalizar(nombre))) continue;
        const base = filas.find((f) => f.empresa === nombre)!;
        const { data, error } = await supabase
          .from("empresas")
          .insert({ nombre, cuit: base.cuit, responsable: base.responsable })
          .select("id")
          .single();
        if (error) throw error;
        mapaEmpresas.set(normalizar(nombre), data.id);
        empresasNuevas += 1;
      }

      // Ejercicios existentes
      const { data: ejerciciosBD, error: e2 } = await supabase
        .from("ejercicios")
        .select("id, empresa_id, cierre");
      if (e2) throw e2;
      const mapaEjercicios = new Map(
        (ejerciciosBD ?? []).map((e) => [`${e.empresa_id}|${e.cierre}`, e.id as string]),
      );

      let ejerciciosNuevos = 0;
      for (const f of filas) {
        const empresaId = mapaEmpresas.get(normalizar(f.empresa))!;
        const clave = `${empresaId}|${f.cierre}`;
        if (mapaEjercicios.has(clave)) continue;
        const { data, error } = await supabase
          .from("ejercicios")
          .insert({ empresa_id: empresaId, cierre: f.cierre })
          .select("id")
          .single();
        if (error) throw error;
        mapaEjercicios.set(clave, data.id);
        ejerciciosNuevos += 1;
      }

      const nuevasObligaciones = filas.map((f) => ({
        ejercicio_id: mapaEjercicios.get(`${mapaEmpresas.get(normalizar(f.empresa))}|${f.cierre}`)!,
        tipo: f.tipo,
        vencimiento: f.vencimiento,
        estado: f.estado,
        presentacion: f.presentacion ?? null,
        observaciones: f.observaciones ?? null,
      }));
      const { error: e3 } = await supabase.from("obligaciones").insert(nuevasObligaciones);
      if (e3) throw e3;

      queryClient.invalidateQueries({ queryKey: ["datos"] });
      setErrores(fallos);
      setResumen(
        `Se importaron ${nuevasObligaciones.length} obligaciones, ${empresasNuevas} empresas nuevas y ${ejerciciosNuevos} ejercicios nuevos.`,
      );
      toast.success("La importación se completó correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("No fue posible importar el archivo. Revisá el formato e intentá nuevamente.");
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="size-4" /> Importar desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Cargá un archivo .xlsx o .csv con una fila por obligación. La primera fila debe tener los
            encabezados y las columnas pueden estar en cualquier orden:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Empresa</strong> (obligatoria): si no existe, se crea
              automáticamente.
            </li>
            <li>
              <strong className="text-foreground">CUIT</strong> y{" "}
              <strong className="text-foreground">Responsable</strong>: se usan sólo al crear la empresa.
            </li>
            <li>
              <strong className="text-foreground">Cierre</strong>: mes y año, formato MM/AAAA (ej. 12/2025).
            </li>
            <li>
              <strong className="text-foreground">Tipo de presentación</strong>: {TIPOS_PRESENTACION.join(", ")}.
            </li>
            <li>
              <strong className="text-foreground">Vencimiento</strong> y{" "}
              <strong className="text-foreground">Fecha de presentación</strong>: formato DD/MM/AAAA (la
              segunda es opcional).
            </li>
            <li>
              <strong className="text-foreground">Estado</strong>: {ESTADOS.join(", ")}. Si queda vacío se
              carga como Pendiente.
            </li>
            <li>
              <strong className="text-foreground">Observaciones</strong>: texto libre opcional.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={descargarPlantilla}>
            <Download className="size-4" /> Descargar plantilla
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={procesando}>
            <Upload className="size-4" /> {procesando ? "Importando..." : "Seleccionar archivo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void procesarArchivo(file);
            }}
          />
        </div>

        {resumen && (
          <p className="rounded-lg border border-presentado/30 bg-presentado-soft px-4 py-3 text-sm text-presentado">
            {resumen}
          </p>
        )}
        {errores.length > 0 && (
          <div className="rounded-lg border border-vencido/30 bg-vencido-soft px-4 py-3 text-sm text-vencido">
            <p className="font-medium">Filas omitidas:</p>
            <ul className="mt-1 list-disc pl-5">
              {errores.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {errores.length > 10 && <li>y {errores.length - 10} más...</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
