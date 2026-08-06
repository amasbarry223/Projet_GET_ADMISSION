import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

function isSvgSrc(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false;
  return src.split("?")[0]?.toLowerCase().endsWith(".svg") ?? false;
}

/**
 * Image Next.js compatible avec les logos SVG locaux.
 * L'optimizer `/_next/image` renvoie 400 pour les SVG sans config —
 * on bascule alors en <img> natif (comme le marquee partenaires).
 */
export function MediaImage({
  src,
  alt,
  className,
  ...props
}: ImageProps) {
  if (isSvgSrc(src)) {
    const width = typeof props.width === "number" ? props.width : undefined;
    const height = typeof props.height === "number" ? props.height : undefined;
    const fill = Boolean(props.fill);

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={typeof src === "string" ? src : ""}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
      />
    );
  }

  return <Image src={src} alt={alt} className={className} {...props} />;
}
