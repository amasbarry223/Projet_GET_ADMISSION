"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PieceState } from "@/components/dossier/wizard/types";

export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 text-sm text-foreground", mono && "font-mono")}>{value}</p>
    </div>
  );
}

export function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 py-1 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function UploadZone({
  libelle,
  state,
  loading,
  disabled,
  obligatoire = true,
  onUpload,
}: {
  libelle: string;
  state: PieceState;
  loading?: boolean;
  disabled?: boolean;
  obligatoire?: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const config = {
    manquante: {
      border: "border-border border-dashed hover:border-primary/50 hover:bg-muted/50",
      icon: Upload,
      iconColor: "text-muted-foreground",
      label: "Glissez votre fichier ici ou cliquez pour parcourir",
      sub: obligatoire
        ? "Obligatoire · PDF, JPG, PNG · 10 Mo max"
        : "Optionnel · PDF, JPG, PNG · 10 Mo max",
      action: "Téléverser",
    },
    televersee: {
      border: "border-vert-vif/40 bg-vert-vif/5",
      icon: CheckCircle2,
      iconColor: "text-vert-vif",
      label: "Fichier téléversé",
      sub: "Téléversé",
      action: "Remplacer",
    },
    validee: {
      border: "border-vert-vif/40 bg-vert-vif/5",
      icon: CheckCircle2,
      iconColor: "text-vert-vif",
      label: "Fichier validé par l'agence",
      sub: "Validé",
      action: "Remplacer",
    },
    a_corriger: {
      border: "border-primary/40 bg-primary/5",
      icon: AlertCircle,
      iconColor: "text-primary",
      label: "Pièce à corriger",
      sub: "À corriger",
      action: "Retéléverser",
    },
  }[state];

  return (
    <div
      className={cn(
        "rounded-md border p-4 transition-colors",
        config.border,
        disabled && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 flex-none items-center justify-center rounded-md border border-border bg-background shadow-sm",
            config.iconColor,
          )}
        >
          <config.icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {libelle}
            {!obligatoire && (
              <Badge variant="outline" className="ml-2 font-mono text-[9px] uppercase">
                Optionnel
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{config.label}</p>
          <p className={cn("mt-0.5 font-mono text-[10px] uppercase", config.iconColor)}>
            {config.sub}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
          className="sr-only"
          disabled={disabled || loading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={loading || disabled}
          className="flex-none"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
          )}
          {config.action}
        </Button>
      </div>
    </div>
  );
}
