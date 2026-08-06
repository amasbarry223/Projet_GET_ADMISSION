import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

type BrandLogoProps = {
  /** Hauteur visuelle en px (largeur auto) */
  height?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Logo officiel GET Admission (bandeau vert + slogan dans l'image).
 * Variantes : nav ~28–36px, auth/footer ~48–64px.
 */
export function BrandLogo({ height = 36, className, priority }: BrandLogoProps) {
  // Ratio approx. de l'asset (bandeau + slogan, ~1024×284)
  const width = Math.round(height * 3.6);
  return (
    <Image
      src={LOGO_SRC}
      alt="GET Admission — Obtenir votre admission à l'étranger en toute sérénité"
      width={width}
      height={height}
      className={cn("h-auto w-auto object-contain object-left", className)}
      style={{ height, width: "auto" }}
      {...(priority !== undefined ? { priority } : {})}
    />
  );
}
