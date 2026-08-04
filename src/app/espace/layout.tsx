import { EspaceShell } from "@/components/espace/shell";
import { ForceLightDocument } from "@/components/site/force-light-document";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-porcelaine text-encre antialiased selection:bg-lapis/20">
      <ForceLightDocument />
      <EspaceShell>{children}</EspaceShell>
    </div>
  );
}
