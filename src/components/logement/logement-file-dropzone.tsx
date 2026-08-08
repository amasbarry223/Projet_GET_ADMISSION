"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateUploadFile, formatFileSize, ACCEPTED_UPLOAD_EXTENSIONS } from "@/lib/file-validation";

/**
 * Zone de dépôt de fichier candidat : drag & drop + parcourir, validation taille/type
 * immédiate (avant tout envoi réseau), états visuels vide / valide / erreur.
 */
export function LogementFileDropzone({
  id,
  label,
  hint = "PDF, JPG, PNG — 10 Mo max",
  optional = false,
  keepExistingOnEdit = false,
  file,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  /** Vrai en mode correction : un fichier existant est déjà en place côté serveur. */
  keepExistingOnEdit?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate || disabled) return;
    const validationError = validateUploadFile(candidate);
    setError(validationError);
    onChange(validationError ? null : candidate);
  };

  const clear = () => {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const state: "empty" | "valid" | "error" = error ? "error" : file ? "valid" : "empty";

  const visuals = {
    empty: {
      border: "border-ligne border-dashed hover:border-lapis/50 hover:bg-porcelaine/60",
      icon: Upload,
      iconColor: "text-ardoise",
    },
    valid: {
      border: "border-vert/40 bg-vert/5",
      icon: CheckCircle2,
      iconColor: "text-vert",
    },
    error: {
      border: "border-carmin/40 bg-carmin/5",
      icon: AlertCircle,
      iconColor: "text-carmin",
    },
  }[state];

  const statusText =
    state === "valid" && file
      ? `${file.name} · ${formatFileSize(file.size)}`
      : state === "error"
        ? error
        : keepExistingOnEdit
          ? "Optionnel — conserve le fichier déjà transmis si non remplacé"
          : hint;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-ardoise">(optionnel)</span>}
      </Label>
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-md border p-3 transition-colors",
          visuals.border,
          dragging && !disabled && "border-lapis bg-lapis/5",
          disabled && "opacity-60",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
      >
        <div
          className={cn(
            "flex h-9 w-9 flex-none items-center justify-center rounded-md border border-ligne bg-card shadow-sm",
            visuals.iconColor,
          )}
        >
          <visuals.icon className="h-4 w-4" strokeWidth={1.5} />
        </div>

        <label htmlFor={id} className={cn("min-w-0 flex-1", !disabled && "cursor-pointer")}>
          <p className={cn("truncate text-xs", state === "error" ? "text-carmin" : "text-ardoise")}>{statusText}</p>
        </label>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS}
          className="sr-only"
          disabled={disabled}
          aria-label={`Téléverser : ${label}`}
          aria-invalid={state === "error"}
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {file ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-none border-carmin/30 text-carmin hover:bg-carmin/5"
            disabled={disabled}
            onClick={clear}
            aria-label={`Retirer le fichier : ${label}`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-none"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
            Parcourir
          </Button>
        )}
      </div>
    </div>
  );
}
