import { EspaceShell } from "@/components/espace/shell";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
      <EspaceShell>{children}</EspaceShell>
    </div>
  );
}
