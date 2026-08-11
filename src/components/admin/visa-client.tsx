"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { formatDateFR } from "@/lib/format";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Search,
  Loader2,
  FileCheck,
  Mail,
  Phone,
  Globe,
  AlertTriangle,
} from "lucide-react";

export type AdminVisaItem = {
  id: string;
  candidatId: string;
  candidatNom: string;
  candidatEmail: string;
  candidatTelephone: string;
  candidatNationalite: string;
  statut: "ACCORDE" | "REFUSE";
  fichierVisaUrl?: string | null;
  motifRefus?: string | null;
  remarqueAdmin?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function AdminVisaClient({ initialData }: { initialData: AdminVisaItem[] }) {
  const [visas, setVisas] = React.useState<AdminVisaItem[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedImage, setSelectedImage] = React.useState<{ url: string; title: string } | null>(null);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/visa");
      if (res.ok) {
        const data = await res.json();
        setVisas(data.visas ?? []);
      }
    } catch {
      toast.error("Erreur de rafraîchissement de la liste des visas");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredVisas = visas.filter((v) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      v.candidatNom.toLowerCase().includes(q) ||
      v.candidatEmail.toLowerCase().includes(q) ||
      v.candidatNationalite.toLowerCase().includes(q) ||
      (v.motifRefus && v.motifRefus.toLowerCase().includes(q))
    );
  });

  const accordes = filteredVisas.filter((v) => v.statut === "ACCORDE");
  const meconformes = filteredVisas.filter((v) => v.statut === "REFUSE");

  return (
    <div className="space-y-6">
      {/* Visionneuse d'image modal pour les visas scannés */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir/80 backdrop-blur-xs p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-blanc rounded-2xl p-6 overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-ligne pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-encre">{selectedImage.title}</h3>
                <p className="text-xs text-ardoise">Aperçu officiel du visa consulaire</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(selectedImage.url, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" /> Ouvrir / Télécharger
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  onClick={() => setSelectedImage(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-porcelaine/50 rounded-xl p-4 min-h-[300px]">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lapis">
            <FileCheck className="h-4 w-4" /> Back-Office Admin · Suivi Consulaire
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-encre sm:text-3xl font-display">
            Gestion des Visas Candidats
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            Consultez les visas scannés accordés et traitez les déclarations de refus de visa.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 px-4 text-xs font-semibold gap-2 self-start sm:self-auto"
          onClick={() => void refreshData()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Rafraîchir
        </Button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ardoise" />
          <Input
            placeholder="Rechercher un candidat, un e-mail, une nationalité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs border-ligne"
          />
        </div>
      </div>

      {/* Onglets principal */}
      <Tabs defaultValue="accordes" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-porcelaine/60 p-1">
          <TabsTrigger value="accordes" className="text-xs font-semibold gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-vert" /> Visas Acceptés ({accordes.length})
          </TabsTrigger>
          <TabsTrigger value="refuses" className="text-xs font-semibold gap-2">
            <XCircle className="h-3.5 w-3.5 text-carmin" /> Visas Refusés ({meconformes.length})
          </TabsTrigger>
        </TabsList>

        {/* Onglet VISAS ACCEPTÉS */}
        <TabsContent value="accordes">
          {accordes.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-ligne bg-blanc">
              <CheckCircle2 className="mx-auto h-10 w-10 text-vert/40" />
              <p className="mt-3 text-sm font-semibold text-encre">Aucun visa accordé à afficher</p>
              <p className="mt-1 text-xs text-ardoise">
                Aucun candidat n&apos;a encore téléversé de visa accordé correspondant à vos critères.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accordes.map((item) => (
                <Card key={item.id} className="p-5 border-ligne bg-blanc shadow-xs hover:border-vert/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-ligne/60 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vert/10 text-vert font-bold text-sm">
                          {item.candidatNom.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-encre">{item.candidatNom}</p>
                          <Badge className="mt-0.5 bg-vert/10 text-vert font-mono text-[9px] uppercase border-vert/20">
                            Visa Accordé
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-ardoise">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-lapis" />
                        <span className="truncate">{item.candidatEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-lapis" />
                        <span>{item.candidatTelephone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-lapis" />
                        <span>{item.candidatNationalite}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-ligne/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ardoise">
                      {formatDateFR(item.updatedAt)}
                    </span>
                    {item.fichierVisaUrl && (
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold bg-vert text-blanc hover:bg-vert/90 gap-1.5"
                        onClick={() =>
                          setSelectedImage({
                            url: `/api/visa/file?userId=${item.candidatId}&disposition=inline`,
                            title: `Visa — ${item.candidatNom}`,
                          })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir l&apos;image du Visa
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet VISAS REFUSÉS */}
        <TabsContent value="refuses">
          {meconformes.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-ligne bg-blanc">
              <XCircle className="mx-auto h-10 w-10 text-carmin/40" />
              <p className="mt-3 text-sm font-semibold text-encre">Aucun refus de visa enregistré</p>
              <p className="mt-1 text-xs text-ardoise">
                Aucune déclaration de refus de visa n&apos;a été enregistrée pour l&apos;instant.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {meconformes.map((item) => (
                <Card key={item.id} className="p-5 border-carmin/20 bg-blanc shadow-xs hover:border-carmin/40 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ligne/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-carmin/10 text-carmin font-bold text-sm shrink-0">
                        {item.candidatNom.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-encre">{item.candidatNom}</p>
                          <Badge className="bg-carmin/10 text-carmin font-mono text-[9px] uppercase border-carmin/20">
                            Visa Refusé
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-ardoise">
                          <span>📧 {item.candidatEmail}</span>
                          <span>📞 {item.candidatTelephone}</span>
                          <span>🌍 {item.candidatNationalite}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-ardoise shrink-0">
                      Déclaré le {formatDateFR(item.updatedAt)}
                    </div>
                  </div>

                  <div className="mt-4 bg-carmin/5 p-4 rounded-xl border border-carmin/20">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-carmin shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-encre uppercase tracking-wider">
                          Motif officiel du refus transmis par le candidat :
                        </p>
                        <p className="mt-1.5 text-xs text-carmin font-mono bg-blanc p-3 rounded-lg border border-carmin/20 whitespace-pre-wrap">
                          {item.motifRefus || "Aucun motif précisé."}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
