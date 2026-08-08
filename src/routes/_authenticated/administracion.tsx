import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsableIniciales } from "@/components/app/badges";
import { ImportarExcel } from "@/components/app/importar-excel";
import { useStore } from "@/lib/store";
import { cambiarRolAdmin, listarUsuarios } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/administracion")({
  head: () => ({
    meta: [
      { title: "Administración del equipo | Vencimientos PT" },
      {
        name: "description",
        content:
          "Alta de responsables y asignación del perfil de administrador para el equipo de Precios de Transferencia.",
      },
      { property: "og:title", content: "Administración | Vencimientos PT" },
      {
        property: "og:description",
        content: "Gestioná responsables y permisos de administrador.",
      },
    ],
  }),
  component: AdministracionPage,
});

function AdministracionPage() {
  const { cargando, data, esAdmin, guardarResponsable, eliminarResponsable } = useStore();
  const [nuevo, setNuevo] = useState("");
  const queryClient = useQueryClient();
  const fetchUsuarios = useServerFn(listarUsuarios);
  const cambiarRol = useServerFn(cambiarRolAdmin);

  const usuarios = useQuery({
    queryKey: ["usuarios-equipo"],
    queryFn: () => fetchUsuarios(),
    enabled: esAdmin,
  });

  const mutarRol = useMutation({
    mutationFn: (v: { userId: string; esAdmin: boolean }) => cambiarRol({ data: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-equipo"] });
      toast.success("Los cambios fueron guardados correctamente.");
    },
    onError: () => toast.error("No fue posible actualizar el permiso. Intentá nuevamente."),
  });

  if (cargando) {
    return <p className="py-20 text-center text-muted-foreground">Cargando administración...</p>;
  }

  if (!esAdmin) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <h1 className="text-2xl font-semibold">Sección exclusiva de administradores</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pedile a un administrador que te otorgue el permiso para gestionar responsables.
        </p>
      </div>
    );
  }

  function agregar() {
    const nombre = nuevo.trim();
    if (!nombre) {
      toast.error("Ingresá el nombre del responsable.");
      return;
    }
    guardarResponsable({ nombre });
    setNuevo("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alta de responsables y permisos del equipo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="size-4" /> Responsables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-[240px] flex-1 gap-2">
              <Label htmlFor="nuevo">Nuevo responsable</Label>
              <Input
                id="nuevo"
                placeholder="Nombre y apellido"
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregar()}
              />
            </div>
            <Button onClick={agregar}>
              <Plus className="size-4" /> Agregar
            </Button>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border">
            {data.responsables.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <ResponsableIniciales nombre={r.nombre} />
                <span className="flex-1 truncate font-medium">{r.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {data.empresas.filter((e) => e.responsable === r.nombre).length} cliente(s)
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar responsable"
                  onClick={() => eliminarResponsable(r.id)}
                >
                  <Trash2 className="size-4 text-vencido" />
                </Button>
              </div>
            ))}
            {data.responsables.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay responsables cargados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Perfiles de acceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usuarios.isPending && <p className="text-sm text-muted-foreground">Cargando usuarios...</p>}
          {usuarios.isError && (
            <p className="text-sm text-vencido">No fue posible cargar los usuarios.</p>
          )}
          <div className="divide-y divide-border rounded-lg border border-border">
            {(usuarios.data ?? []).map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium">{u.email}</span>
                <span className="text-xs text-muted-foreground">
                  {u.esAdmin ? "Administrador" : "Miembro"}
                </span>
                <Switch
                  checked={u.esAdmin}
                  aria-label={`Administrador: ${u.email}`}
                  onCheckedChange={(v) => mutarRol.mutate({ userId: u.id, esAdmin: v })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ImportarExcel />
    </div>
  );
}
