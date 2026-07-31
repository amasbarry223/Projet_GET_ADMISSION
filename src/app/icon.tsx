import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon navigateur — marque GET Admission (carré vert). */
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
          borderRadius: 6,
          color: "#FFFFFF",
          fontSize: 11,
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
