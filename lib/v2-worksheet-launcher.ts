import type { LayoutV2Frame } from "@/lib/content-layout-v2";

export type V2WorksheetLauncherPayload = {
  kind: "WORKSHEET_LAUNCHER";
  version: 1;
  worksheetId: string;
  display: { label: string };
};

export function createV2WorksheetLauncherPayload(
  worksheetId: string,
): V2WorksheetLauncherPayload {
  return {
    kind: "WORKSHEET_LAUNCHER",
    version: 1,
    worksheetId: worksheetId.trim(),
    display: { label: "WORKSHEET" },
  };
}

export function getV2WorksheetLauncherPayload(
  frame: Pick<LayoutV2Frame, "type" | "payload">,
): V2WorksheetLauncherPayload | null {
  if (
    frame.type !== "WORKSHEET" ||
    !frame.payload ||
    typeof frame.payload !== "object" ||
    Array.isArray(frame.payload)
  ) {
    return null;
  }

  const value = frame.payload as Record<string, unknown>;
  const worksheetId =
    typeof value.worksheetId === "string"
      ? value.worksheetId.trim()
      : "";

  if (
    value.kind !== "WORKSHEET_LAUNCHER" ||
    value.version !== 1 ||
    !worksheetId
  ) {
    return null;
  }

  const display =
    value.display &&
    typeof value.display === "object" &&
    !Array.isArray(value.display)
      ? value.display as Record<string, unknown>
      : {};

  return {
    kind: "WORKSHEET_LAUNCHER",
    version: 1,
    worksheetId,
    display: {
      label:
        typeof display.label === "string" && display.label.trim()
          ? display.label.trim()
          : "WORKSHEET",
    },
  };
}
