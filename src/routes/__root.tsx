import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { CalendarDays, Building2, LayoutDashboard, ListChecks, ShieldCheck } from "lucide-react";
import { useEsAdmin } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vencimientos PT — Precios de Transferencia" },
      { name: "description", content: "Seguimiento de vencimientos de Declaraciones Juradas de Precios de Transferencia." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Vencimientos PT — Precios de Transferencia" },
      { property: "og:description", content: "Seguimiento de vencimientos de Declaraciones Juradas de Precios de Transferencia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Vencimientos PT — Precios de Transferencia" },
      { name: "twitter:description", content: "Seguimiento de vencimientos de Declaraciones Juradas de Precios de Transferencia." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31feea3e-afe8-4900-80bf-087fb448ef81/id-preview-2484ea58--735537cf-b7ff-4109-b59a-7a7d2c3d13b5.lovable.app-1785527156305.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/31feea3e-afe8-4900-80bf-087fb448ef81/id-preview-2484ea58--735537cf-b7ff-4109-b59a-7a7d2c3d13b5.lovable.app-1785527156305.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/obligaciones", label: "Obligaciones", icon: ListChecks },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/empresas", label: "Empresas", icon: Building2 },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const esAuth = useRouterState({ select: (s) => s.location.pathname === "/auth" });

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <div className="min-h-screen bg-background">
          <header
            className={`sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur ${
              esAuth ? "hidden" : ""
            }`}
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalendarDays className="size-4" />
                </span>
                <span className="font-display text-lg font-semibold leading-none">
                  Vencimientos PT
                </span>
              </Link>
              <Navegacion />
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  queryClient.clear();
                  window.location.href = "/auth";
                }}
                className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Salir
              </button>
            </div>
          </header>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <main className="mx-auto max-w-7xl px-4 py-8">
            <Outlet />
          </main>
        </div>
        <Toaster position="top-right" richColors />
      </>
    </QueryClientProvider>
  );
}

function Navegacion() {
  const esAdmin = useEsAdmin();
  const items = esAdmin
    ? [...navItems, { to: "/administracion", label: "Administración", icon: ShieldCheck } as const]
    : navItems;
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          activeProps={{ className: "bg-secondary text-foreground" }}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
