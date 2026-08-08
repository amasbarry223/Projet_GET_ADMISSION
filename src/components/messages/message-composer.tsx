"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Loader2, X } from "lucide-react";
import { validateUploadFile, formatFileSize, ACCEPTED_UPLOAD_EXTENSIONS } from "@/lib/file-validation";
import { toast } from "sonner";

/** Composeur de message partagé — texte + pièce jointe optionnelle (PDF/JPG/PNG/WEBP, 10 Mo max). */
export function MessageComposer({
  onSend,
  placeholder = "Écrivez votre message…",
  disabled = false,
}: {
  onSend: (texte: string, fichier: File | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [input, setInput] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const error = validateUploadFile(candidate);
    if (error) {
      toast.error("Fichier refusé", { description: error });
      return;
    }
    setFile(candidate);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = input.trim();
    if (!texte && !file) return;
    setSending(true);
    try {
      await onSend(texte, file);
      setInput("");
      setFile(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-ligne">
      {file && (
        <div className="flex items-center gap-2 border-b border-ligne bg-porcelaine/60 px-3 py-2 text-xs text-ardoise">
          <Paperclip className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
          <span className="min-w-0 flex-1 truncate font-mono">{file.name}</span>
          <span className="flex-none opacity-70">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="flex-none text-carmin hover:opacity-70"
            onClick={() => setFile(null)}
            aria-label="Retirer la pièce jointe"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 p-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS}
          className="sr-only"
          disabled={disabled || sending}
          aria-label="Choisir un fichier à joindre"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-none"
          aria-label="Joindre un fichier"
          title="Joindre un fichier (PDF, JPG, PNG, WEBP — 10 Mo max)"
          disabled={disabled || sending}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4 text-ardoise" strokeWidth={1.5} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          aria-label="Votre message"
          disabled={disabled || sending}
        />
        <Button
          type="submit"
          size="icon"
          className="flex-none bg-lapis text-blanc hover:bg-lapis/90"
          aria-label="Envoyer"
          disabled={disabled || sending || (!input.trim() && !file)}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" strokeWidth={1.5} />
          )}
        </Button>
      </form>
    </div>
  );
}
