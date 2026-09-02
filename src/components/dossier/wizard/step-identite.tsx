"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  CheckCircle2,
  Loader2,
  Eye,
  ShieldCheck,
  CreditCard,
  BookUser,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UserKycData = {
  kycType?: string | null;
  kycNumero?: string | null;
  kycRectoPath?: string | null;
  kycVerifie?: boolean;
};

export function DossierStepIdentite({
  kycData,
  isEditable,
  onSaveKycInfo,
  onUploadKycFile,
}: {
  kycData: UserKycData | null;
  isEditable: boolean;
  onSaveKycInfo: (data: { kycType: string; kycNumero: string }) => Promise<boolean>;
  onUploadKycFile: (file: File, side: "recto") => Promise<boolean>;
}) {
  const [localType, setLocalType] = React.useState<string | null>(null);
  const [localNumero, setLocalNumero] = React.useState<string | null>(null);
  const [savingInfo, setSavingInfo] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const kycType = localType ?? kycData?.kycType ?? "passeport";
  const kycNumero = localNumero ?? kycData?.kycNumero ?? "";

  const hasRecto = Boolean(kycData?.kycRectoPath);
  const isKycComplete = Boolean(kycNumero.trim() && hasRecto);

  const handleTypeChange = async (newType: string) => {
    setLocalType(newType);
    if (isEditable) {
      setSavingInfo(true);
      await onSaveKycInfo({ kycType: newType, kycNumero });
      setSavingInfo(false);
    }
  };

  const handleNumeroBlur = async () => {
    if (!isEditable) return;
    if (localNumero !== null && localNumero !== (kycData?.kycNumero || "")) {
      setSavingInfo(true);
      await onSaveKycInfo({ kycType, kycNumero });
      setSavingInfo(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!isEditable || uploading) return;
    setUploading(true);
    await onUploadKycFile(file, "recto");
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.75} />
          Pièce d&apos;identité officielle (KYC)
        </h2>
        <p className="text-sm text-muted-foreground">
          Renseignez et téléversez votre document d&apos;identité en cours de validité. Il sera automatiquement lié à votre profil.
        </p>
      </div>

      {/* Type et Numéro de document */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kyc-type" className="text-xs font-semibold text-foreground">
              Type de document d&apos;identité
            </Label>
            <Select
              value={kycType}
              onValueChange={handleTypeChange}
              disabled={!isEditable || savingInfo}
            >
              <SelectTrigger id="kyc-type" className="bg-background">
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passeport">
                  <span className="flex items-center gap-2">
                    <BookUser className="h-4 w-4 text-primary" />
                    Passeport
                  </span>
                </SelectItem>
                <SelectItem value="cni">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Carte Nationale d&apos;Identité (CNI)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="kyc-numero" className="text-xs font-semibold text-foreground">
                Numéro du document
              </Label>
              {savingInfo && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement...
                </span>
              )}
            </div>
            <Input
              id="kyc-numero"
              placeholder={kycType === "cni" ? "Ex: CI00123456" : "Ex: 12AA34567"}
              className="font-mono bg-background"
              value={kycNumero}
              disabled={!isEditable}
              onChange={(e) => setLocalNumero(e.target.value)}
              onBlur={handleNumeroBlur}
            />
          </div>
        </div>

        {/* Indicateur de conformité / Statut */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
          <div className="flex items-center gap-2">
            {isKycComplete ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5 py-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                KYC complet et prêt
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1.5 py-0.5">
                Incomplet : numéro & document requis
              </Badge>
            )}
            {kycData?.kycVerifie && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Certifié par l&apos;équipe
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {kycType === "cni" ? "CNI (Recto suffisant)" : "Passeport (Page photo)"}
          </span>
        </div>
      </div>

      {/* Zone d'upload du document */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">
          {kycType === "cni"
            ? "Scan ou photo de votre Carte d'Identité (Recto)"
            : "Scan ou photo de votre Passeport (Page d'identité)"}
        </Label>

        <div
          aria-disabled={!isEditable || uploading}
          tabIndex={isEditable && !uploading ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (isEditable && !uploading) inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (isEditable && !uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!isEditable || uploading) return;
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelected(file);
          }}
          onClick={() => {
            if (isEditable && !uploading) inputRef.current?.click();
          }}
          className={cn(
            "group relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border p-6 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            hasRecto
              ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
              : "border-dashed border-border bg-card hover:border-primary/50 hover:bg-muted/30",
            dragging && "border-primary bg-primary/5 ring-2 ring-primary/20",
            (!isEditable || uploading) && "pointer-events-none opacity-70 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            disabled={!isEditable || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Téléversement et sécurisation du fichier...</p>
            </div>
          ) : hasRecto ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Document d&apos;identité téléversé avec succès
                </p>
                <p className="text-xs text-muted-foreground">
                  Fichier prêt · Cliquez pour remplacer si nécessaire (PDF, JPG, PNG)
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-background shadow-2xs"
                  onClick={() => window.open("/api/profile/kyc?side=recto", "_blank")}
                >
                  <Eye className="h-3.5 w-3.5 text-primary" /> Voir le document
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => inputRef.current?.click()}
                  disabled={!isEditable}
                >
                  <Upload className="h-3.5 w-3.5" /> Remplacer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Upload className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Glissez votre document ici ou <span className="text-primary underline font-semibold">parcourez</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Obligatoire · Format PDF, JPG ou PNG (10 Mo max)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
