import type { Buffer } from "node:buffer";

export type QrImageFormat = "png" | "svg";
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export type QrImageOptions = {
  format: QrImageFormat;
  size: number;
  margin: number;
  errorCorrection: QrErrorCorrection;
};

type QrCodeLibrary = {
  toBuffer(
    value: string,
    options: Record<string, unknown>,
  ): Promise<Buffer>;
  toString(
    value: string,
    options: Record<string, unknown>,
  ): Promise<string>;
};

// `qrcode` is pure JavaScript. Keeping the narrow runtime contract here avoids
// adding a second package solely for ambient TypeScript declarations.
const qrCode = require("qrcode") as QrCodeLibrary;

export const QR_PERMANENT_ORIGIN = "https://edoralearning.in";

export function permanentQrUrl(publicCode: string) {
  return `${QR_PERMANENT_ORIGIN}/qr/r/${encodeURIComponent(publicCode)}`;
}

export function safeQrFilename(
  name: string,
  publicCode: string,
  format: QrImageFormat,
) {
  const safeName =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "qr-code";
  const safeCode =
    publicCode.replace(/[^A-Z0-9]/gi, "").slice(0, 32) || "code";
  return `${safeName}-${safeCode}.${format}`;
}

function generationOptions(options: QrImageOptions) {
  return {
    width: options.size,
    margin: options.margin,
    errorCorrectionLevel: options.errorCorrection,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  };
}

function assertSafeSvg(svg: string) {
  if (
    /<(?:script|foreignObject|metadata)\b/i.test(svg) ||
    /\b(?:href|xlink:href)\s*=/i.test(svg) ||
    /<!DOCTYPE|<\?xml/i.test(svg)
  ) {
    throw new Error("Generated SVG contained unsupported markup.");
  }
  return svg;
}

export async function generateQrImage(
  value: string,
  options: QrImageOptions,
) {
  const shared = generationOptions(options);
  if (options.format === "png") {
    return qrCode.toBuffer(value, {
      ...shared,
      type: "png",
    });
  }

  const svg = await qrCode.toString(value, {
    ...shared,
    type: "svg",
  });
  return assertSafeSvg(svg);
}
