import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar al equipo | Vencimientos PT" },
      {
        name: "description",
        content: "Acceso del equipo de Precios de Transferencia al seguimiento de vencimientos.",
      },
      { property: "og:title", content: "Ingresar | Vencimientos PT" },
      { property: "og:description", content: "Acceso interno al panel de vencimientos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function ingresar() {
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      toast.error("No fue posible ingresar. Revisá el correo y la contraseña.");
      return;
    }
    navigate({ to: "/" });
  }

  async function registrarse() {
    setCargando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setCargando(false);
    if (error) {
      toast.error("No fue posible crear la cuenta. Intentá nuevamente.", {
        description: error.message,
      });
      return;
    }
    toast.success("Cuenta creada. Ya podés ingresar.");
  }

  async function conGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No fue posible ingresar con Google. Intentá nuevamente.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold">Vencimientos PT</h1>
          <p className="text-sm text-muted-foreground">
            Acceso interno del equipo de Precios de Transferencia.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="ingresar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ingresar">Ingresar</TabsTrigger>
                <TabsTrigger value="crear">Crear cuenta</TabsTrigger>
              </TabsList>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <TabsContent value="ingresar" className="m-0">
                  <Button className="w-full" disabled={cargando} onClick={ingresar}>
                    Ingresar
                  </Button>
                </TabsContent>
                <TabsContent value="crear" className="m-0">
                  <Button className="w-full" disabled={cargando} onClick={registrarse}>
                    Crear cuenta
                  </Button>
                </TabsContent>
                <Button variant="outline" className="w-full" onClick={conGoogle}>
                  Continuar con Google
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
