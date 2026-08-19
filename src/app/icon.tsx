import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

/** Favicon navigateur & Google Search — marque GET Admission (carré vert 48x48). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3CA936",
          borderRadius: 8,
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: 800,
          fontFamily: "Arial, Helvetica, sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        GET
      </div>
    ),
    { ...size }
  );
}
