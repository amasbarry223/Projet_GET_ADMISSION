import { Paperclip, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chip de pièce jointe affiché dans une bulle de message, avec prévisualisation image et téléchargement. */
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
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(nom);
  const inlineUrl = downloadUrl.includes("?")
    ? `${downloadUrl}&disposition=inline`
    : `${downloadUrl}?disposition=inline`;

  return (
    <div className="mb-2 space-y-1">
      {isImage && (
        <a
          href={inlineUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md border border-ligne/40 max-w-[240px] max-h-[160px] bg-porcelaine/30 hover:opacity-95 transition-opacity"
        >
          <img
            src={inlineUrl}
            alt={nom}
            className="w-full h-full object-cover max-h-[160px]"
          />
        </a>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
          mine ? "border-blanc/25 bg-blanc/5 text-blanc" : "border-ligne bg-card text-encre",
        )}
      >
        <Paperclip className="h-3.5 w-3.5 flex-none text-ardoise" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{nom}</span>
        {taille && <span className="flex-none opacity-70 text-[10px]">{taille}</span>}
        <a
          href={inlineUrl}
          target="_blank"
          rel="noreferrer"
          className="p-1 hover:text-lapis"
          title="Visualiser"
        >
          <Eye className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
        </a>
        <a
          href={downloadUrl}
          download
          className="p-1 hover:text-lapis"
          title="Télécharger"
        >
          <Download className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}
