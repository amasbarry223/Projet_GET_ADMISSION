import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icône Apple Touch — marque GET Admission. */
export default function AppleIcon() {
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
          borderRadius: 36,
          color: "#FFFFFF",
          fontSize: 56,
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
