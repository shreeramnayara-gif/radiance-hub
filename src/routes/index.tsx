import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cmsService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Lock, Users, FileImage, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const FALLBACK = {
  brand: { name: "Aspire Reporting Hub", tagline: "Teleradiology, engineered for hospitals." },
  hero: {
    headline: "Hospital-grade teleradiology workflow.",
    subheadline:
      "OIDC-secured. Orthanc-powered. OHIF-enabled. Aspire orchestrates studies, radiologists, and billing — without ever exposing patient origin to the reporting clinician.",
    ctaLabel: "Sign in",
    ctaHref: "/login",
  },
  nav: [
    { label: "Workflow", href: "#workflow" },
    { label: "Security", href: "#security" },
    { label: "Contact", href: "#contact" },
  ],
  contact: { email: "ops@aspirereporting.health", phone: "", address: "" },
  footer: {
    copyright: `© ${new Date().getFullYear()} Aspire Reporting Hub`,
    links: [],
  },
};

function LandingPage() {
  const { isAuthenticated, login } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "landing"],
    queryFn: () => cmsService.getLanding().catch(() => null),
  });

  const cms = data ?? FALLBACK;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-display font-bold">A</div>
            <div className="font-display font-semibold tracking-tight">{cms.brand.name}</div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {cms.nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition">{n.label}</a>
            ))}
          </nav>
          {isAuthenticated ? (
            <Button asChild size="sm"><Link to="/app">Open dashboard</Link></Button>
          ) : (
            <Button size="sm" onClick={() => login()}>Sign in</Button>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--accent),_transparent_60%)] opacity-60" />
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              OIDC-secured · HIPAA-aware architecture
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-[1.05] tracking-tight">
              {cms.hero.headline}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">{cms.hero.subheadline}</p>
            <div className="mt-8 flex gap-3">
              <Button size="lg" onClick={() => (isAuthenticated ? null : login())} asChild={isAuthenticated}>
                {isAuthenticated ? <Link to="/app">Open dashboard</Link> : <span>{cms.hero.ctaLabel}</span>}
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#workflow">See workflow</a>
              </Button>
            </div>
            {isLoading && <p className="mt-4 text-xs text-muted-foreground">Loading site content…</p>}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileImage, title: "Orthanc-driven studies", body: "Live DICOM ingestion. Modality-aware Free Pool. Anonymized referral context for radiologists." },
            { icon: Activity, title: "Strict state machine", body: "Free Pool → Assigned → In Reporting → Submitted → Finalized. Audit-logged at every step." },
            { icon: Wallet, title: "User-specific billing", body: "Per-radiologist payouts and per-client invoices. Recalculated on edits, returns, or rate-card changes." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-clinical)]">
              <f.icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Security and identity</h2>
            <p className="mt-4 text-muted-foreground">Single source of truth: your OIDC provider. Aspire never stores or sees plaintext passwords. Role claims drive UI access. All sessions are JWT-only.</p>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              { icon: Lock, t: "OpenID Connect only", d: "Login, logout, password reset all flow through your IdP." },
              { icon: Users, t: "Approval-gated accounts", d: "Super Admin must approve every new user; certificates verified before activation." },
              { icon: ShieldCheck, t: "Radiologist anonymity", d: "Hospital and centre identity stripped from radiologist views." },
            ].map((i) => (
              <li key={i.t} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <i.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{i.t}</div>
                  <div className="text-muted-foreground">{i.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer id="contact" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-sm text-muted-foreground">
          <div>{cms.footer.copyright}</div>
          <div>{cms.contact.email}</div>
        </div>
      </footer>
    </div>
  );
}
