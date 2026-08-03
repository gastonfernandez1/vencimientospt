import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function verificarAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export type UsuarioEquipo = { id: string; email: string; esAdmin: boolean };

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioEquipo[]> => {
    await verificarAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const roles = await supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin");
    const admins = new Set((roles.data ?? []).map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "(sin correo)",
      esAdmin: admins.has(u.id),
    }));
  });

export const cambiarRolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; esAdmin: boolean }) => input)
  .handler(async ({ data, context }) => {
    await verificarAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.esAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      if (data.userId === context.userId) throw new Error("No podés quitarte el rol de administrador.");
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw error;
    }
    return { ok: true };
  });
