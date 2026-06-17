import { EspaceShell } from "@/components/espace/shell";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return <EspaceShell>{children}</EspaceShell>;
}
