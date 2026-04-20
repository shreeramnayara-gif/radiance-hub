import { Button } from "@/components/ui/button";

const COMMON = ["CT", "MR", "XR", "CR", "DX", "US", "MG", "PT", "NM"];

export function ModalityFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (m: string) =>
    onChange(selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Modality</span>
      {COMMON.map((m) => (
        <button
          key={m}
          onClick={() => toggle(m)}
          className={`text-xs px-2.5 py-1 rounded-md border transition ${
            selected.includes(m)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {m}
        </button>
      ))}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
          Clear
        </Button>
      )}
    </div>
  );
}
