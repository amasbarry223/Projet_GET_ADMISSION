import { Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chip de pièce jointe affiché dans une bulle de message, avec lien de téléchargement. */
export function MessageAttachment({
  nom,
  taille,
  downloadUrl,
  mine,
}: {
  nom: string;
  taille?: string | null | undefined;
  downloadUrl: string;
  mine: boolean;
}) {
  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "mb-1.5 flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
        mine ? "border-blanc/25 hover:bg-blanc/10" : "border-ligne hover:bg-porcelaine",
      )}
    >
      <Paperclip className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
      <span className="min-w-0 flex-1 truncate font-mono">{nom}</span>
      {taille && <span className="flex-none opacity-70">{taille}</span>}
      <Download className="h-3.5 w-3.5 flex-none opacity-70" strokeWidth={1.5} />
    </a>
  );
}
