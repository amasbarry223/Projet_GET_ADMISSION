"use client";

/**
 * Error boundary racine Next.js — remplace le layout root en cas d’échec critique.
 * Doit fournir ses propres balises <html> et <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F7F5F0",
          color: "#1A1A1A",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              margin: "0 auto 16px",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(196, 58, 58, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
            aria-hidden
          >
            !
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Une erreur critique est survenue.</h1>
          <p style={{ marginTop: 8, color: "#5C5C5C", fontSize: 14, lineHeight: 1.5 }}>
            L&apos;application n&apos;a pas pu se charger correctement. Réessayez ou revenez à l&apos;accueil.
          </p>
          {error?.digest ? (
            <p style={{ marginTop: 12, fontSize: 10, fontFamily: "monospace", color: "#5C5C5C" }}>
              Réf. {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: 6,
                background: "#3CA936",
                color: "#fff",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{
                borderRadius: 6,
                border: "1px solid #D9D4C9",
                background: "#fff",
                color: "#1A1A1A",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
