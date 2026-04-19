import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cmsService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import type { LandingCms } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/app/cms")({
  component: CmsEditor,
});

function CmsEditor() {
  const { roles } = useAuth();
  const allowed = roles.includes(ROLES.SUPER_ADMIN);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms", "landing"],
    queryFn: () => cmsService.getLanding(),
    enabled: allowed,
  });
  const [draft, setDraft] = useState<LandingCms | null>(null);

  useEffect(() => { if (data) setDraft(data); }, [data]);

  const save = useMutation({
    mutationFn: (d: LandingCms) => cmsService.saveLanding(d),
    onSuccess: () => { toast.success("Landing page saved"); qc.invalidateQueries({ queryKey: ["cms"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!allowed) {
    return <div className="p-8"><h1 className="text-2xl font-display font-bold">Restricted</h1><p className="text-sm text-muted-foreground mt-2">Super Admin only.</p></div>;
  }
  if (isLoading) return <div className="p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading CMS…</div>;
  if (error || !draft) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold">Landing CMS</h1>
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Could not load CMS content. Backend must expose <code>GET /cms/landing</code> and <code>PUT /cms/landing</code>.
          {error ? ` Error: ${(error as Error).message}` : ""}
        </div>
      </div>
    );
  }

  const update = (patch: Partial<LandingCms>) => setDraft({ ...draft, ...patch });

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">CMS</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Landing Page</h1>
        <p className="text-sm text-muted-foreground mt-2">Edits publish immediately via <code>PUT /cms/landing</code>. Version: {draft.version}.</p>
      </header>

      <div className="space-y-6">
        <Section title="Brand">
          <Field label="Name"><Input value={draft.brand.name} onChange={(e) => update({ brand: { ...draft.brand, name: e.target.value } })} /></Field>
          <Field label="Tagline"><Input value={draft.brand.tagline} onChange={(e) => update({ brand: { ...draft.brand, tagline: e.target.value } })} /></Field>
        </Section>
        <Section title="Hero">
          <Field label="Headline"><Input value={draft.hero.headline} onChange={(e) => update({ hero: { ...draft.hero, headline: e.target.value } })} /></Field>
          <Field label="Subheadline"><Textarea rows={3} value={draft.hero.subheadline} onChange={(e) => update({ hero: { ...draft.hero, subheadline: e.target.value } })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CTA Label"><Input value={draft.hero.ctaLabel} onChange={(e) => update({ hero: { ...draft.hero, ctaLabel: e.target.value } })} /></Field>
            <Field label="CTA Href"><Input value={draft.hero.ctaHref} onChange={(e) => update({ hero: { ...draft.hero, ctaHref: e.target.value } })} /></Field>
          </div>
        </Section>
        <Section title="Contact">
          <Field label="Email"><Input value={draft.contact.email} onChange={(e) => update({ contact: { ...draft.contact, email: e.target.value } })} /></Field>
          <Field label="Phone"><Input value={draft.contact.phone ?? ""} onChange={(e) => update({ contact: { ...draft.contact, phone: e.target.value } })} /></Field>
        </Section>
        <Section title="Footer">
          <Field label="Copyright"><Input value={draft.footer.copyright} onChange={(e) => update({ footer: { ...draft.footer, copyright: e.target.value } })} /></Field>
        </Section>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-display font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
