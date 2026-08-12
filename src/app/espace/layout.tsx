import { EspaceShell } from "@/components/espace/shell";
import { EspaceThemeProvider } from "@/components/espace/espace-theme-provider";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <EspaceThemeProvider>
      <div className="min-h-screen bg-porcelaine text-encre antialiased selection:bg-lapis/20">
        <EspaceShell>{children}</EspaceShell>
      </div>
    </EspaceThemeProvider>
  );
}
