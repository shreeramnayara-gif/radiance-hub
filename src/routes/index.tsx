import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { cmsService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Layers, Workflow, Sparkles, Brain } from "lucide-react";
import logo from "@/assets/aspire-logo.png";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const FALLBACK = {
  brand: { name: "Aspire Reporting Hub", tagline: "Reporting, refined." },
  hero: {
    headline: "Quality\nin every read.",
    subheadline: "A modern reporting hub built for clinicians who value clarity, speed, and craft.",
    ctaLabel: "Sign in",
    ctaHref: "/login",
  },
  nav: [
    { label: "Platform", href: "#platform" },
    { label: "Studio", href: "#studio" },
    { label: "Contact", href: "#contact" },
  ],
  contact: { email: "hello@aspirereporting.health", phone: "", address: "" },
  footer: {
    copyright: `© ${new Date().getFullYear()} Aspire Reporting Hub`,
    links: [],
  },
};

function LandingPage() {
  const { isAuthenticated, login, enableDevBypass, isDevBypass } = useAuth();
  const { data } = useQuery({
    queryKey: ["cms", "landing"],
    queryFn: () => cmsService.getLanding().catch(() => null),
  });
  const cms = data ?? FALLBACK;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="Aspire" width={32} height={32} className="h-8 w-8 transition-transform group-hover:scale-110 group-hover:rotate-3" />
            <span className="font-display font-bold tracking-tight text-base">{cms.brand.name.split(" ")[0]}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {cms.nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-px after:bg-primary after:transition-all hover:after:w-full">{n.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="rounded-full"><Link to="/app">Open studio <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => login()} className="rounded-full hidden sm:inline-flex">Sign in</Button>
                <Button size="sm" onClick={() => login()} className="rounded-full px-5">Sign up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        <div className="absolute -z-10 top-20 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-[radial-gradient(circle,_var(--primary)_0%,_transparent_65%)] opacity-20 blur-3xl" />
        <div className="absolute -z-10 top-40 right-10 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,_var(--accent)_0%,_transparent_70%)] opacity-30 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>New · Clinician-first reporting workspace</span>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-75" />
              <img src={logo} alt="" width={128} height={128} className="relative h-28 w-28 drop-shadow-2xl" />
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight max-w-4xl whitespace-pre-line bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent">
              {cms.hero.headline}
            </h1>

            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {cms.hero.subheadline}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              {isAuthenticated ? (
                <Button size="lg" asChild className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20">
                  <Link to="/app">Open studio <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => login()} className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20">
                    Sign up <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => login()} className="rounded-full px-8 h-12 text-base bg-card/40 backdrop-blur">
                    Sign in
                  </Button>
                </>
              )}
              <Button size="lg" variant="ghost" asChild className="rounded-full px-8 h-12 text-base">
                <a href="#platform">Discover</a>
              </Button>
            </div>

            {!isAuthenticated && !isDevBypass && (
              <button
                onClick={enableDevBypass}
                className="mt-8 text-xs text-muted-foreground/70 hover:text-primary underline underline-offset-4 transition-colors"
              >
                Preview workspace (dev bypass · no Keycloak required)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* PLATFORM */}
      <section id="platform" className="border-t border-border/60 relative">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" /> The Platform
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Everything you need.<br />
              <span className="text-muted-foreground">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid gap-px bg-border rounded-3xl overflow-hidden md:grid-cols-3 shadow-xl shadow-primary/5">
            {[
              { icon: Layers, title: "Connected", body: "One workspace for every case, every team, every signature." },
              { icon: Workflow, title: "Orchestrated", body: "Cases move from intake to finalization with quiet precision." },
              { icon: Activity, title: "Insightful", body: "Live signals on throughput, turnaround, and team performance." },
            ].map((f) => (
              <div key={f.title} className="bg-card p-10 group hover:bg-accent/30 transition-colors relative">
                <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STUDIO BAND */}
      <section id="studio" className="border-t border-border/60 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--sidebar-primary)_0%,_transparent_60%)] opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--sidebar-primary)_0%,_transparent_55%)] opacity-25" />
        <div className="mx-auto max-w-7xl px-6 py-24 relative grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sidebar-primary font-semibold mb-4">The Studio</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Built for the people who read.
            </h2>
            <p className="text-sidebar-foreground/70 text-lg leading-relaxed mb-8 max-w-lg">
              Aspire is shaped around the rhythm of a working clinician — keyboard-first, distraction-free, and deeply respectful of your time.
            </p>
            <Button size="lg" variant="secondary" onClick={() => login()} className="rounded-full px-8">
              Get started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-sidebar-primary/30 to-transparent border border-sidebar-border p-1 shadow-2xl">
              <div className="w-full h-full rounded-[22px] bg-sidebar-accent/40 backdrop-blur grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--sidebar-primary)_0%,_transparent_70%)] opacity-30" />
                <img src={logo} alt="" width={240} height={240} className="relative h-56 w-56 opacity-95 drop-shadow-2xl" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--primary)_0%,_transparent_60%)] opacity-10" />
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">
            Ready when you are.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Sign in to access your workspace.
          </p>
          <div className="mt-10">
            <Button size="lg" onClick={() => login()} className="rounded-full px-10 h-12 text-base shadow-xl shadow-primary/25">
              Sign in <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Aspire" width={28} height={28} className="h-7 w-7" loading="lazy" />
            <span className="font-display font-semibold tracking-tight">{cms.brand.name}</span>
          </Link>
          <div className="text-sm text-muted-foreground">{cms.contact.email}</div>
          <div className="text-sm text-muted-foreground">{cms.footer.copyright}</div>
        </div>
      </footer>
    </div>
  );
}
