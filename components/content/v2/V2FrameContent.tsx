import type { ReactNode } from "react";

import type { ContentBlock } from "@/lib/content-document";
import type { LayoutV2Frame } from "@/lib/content-layout-v2";

import V2EducationalButtonVisual, {
  isV2EducationalButtonBlock,
} from "@/components/content/v2/V2EducationalButtonVisual";

import V2ImageVisual from "@/components/content/v2/V2ImageVisual";
import V2TextVisual from "@/components/content/v2/V2TextVisual";
import V2TableVisual from "@/components/content/v2/V2TableVisual";
import V2VideoVisual from "@/components/content/v2/V2VideoVisual";
import V2ShapeVisual from "@/components/content/v2/V2ShapeVisual";

import V2AssessmentLauncherVisual from "@/components/content/v2/V2AssessmentLauncherVisual";
import V2WorksheetLauncherVisual from "@/components/content/v2/V2WorksheetLauncherVisual";

import {
  getV2FrameResourceId,
} from "@/lib/content-layout-v2-rendering";

import {
  getV2VideoDisplayMode,
} from "@/lib/content-layout-v2";

import {
  getV2WorksheetLauncherPayload,
} from "@/lib/v2-worksheet-launcher";

export default function V2FrameContent({
  frame,
  frames,
  block,
  pageWidth,
  pageHeight,
  resourceUrlResolver,
  renderBlock,
  renderFrame,
  onPayloadChange,
  videoPresentation = "AUTHORING",
}: {
  frame: LayoutV2Frame;
  frames: LayoutV2Frame[];
  block?: ContentBlock;
  pageWidth: number;
  pageHeight: number;
  resourceUrlResolver: (
    resourceId: string,
  ) => string | null;
  renderBlock?: (
    block: ContentBlock,
  ) => ReactNode;
  renderFrame?: (
    frame: LayoutV2Frame,
    frames: LayoutV2Frame[],
  ) => ReactNode;
  onPayloadChange?: (
    payload: Record<string, unknown>,
  ) => void;
  videoPresentation?:
    | "AUTHORING"
    | "DELIVERY"
    | "PREVIEW";
}) {
  /*
   * ---------------------------------------------------------
   * Interactive launcher frames MUST be detected before the
   * generic Educational / Worksheet frame fallback.
   * ---------------------------------------------------------
   */

  // frame.type === "ASSESSMENT_LAUNCHER" is intentionally handled before legacy educational frames.
  if (
    frame.type ===
    "ASSESSMENT_LAUNCHER"
  ) {
    return (
      <V2AssessmentLauncherVisual
        frame={frame}
        openable={
          videoPresentation !==
          "AUTHORING"
        }
        mode={
          videoPresentation ===
          "PREVIEW"
            ? "PREVIEW"
            : "STUDENT"
        }
      />
    );
  }

  /*
   * A WORKSHEET frame can mean two different things:
   *
   * 1. legacy/static Worksheet educational object
   * 2. interactive V2 Worksheet Launcher
   *
   * Therefore payload identification MUST happen before
   * the generic WORKSHEET rendering branch below.
   */
  const worksheetLauncher =
    getV2WorksheetLauncherPayload(
      frame,
    );

  if (worksheetLauncher) {
    return (
      <V2WorksheetLauncherVisual
        frame={frame}
        openable={
          videoPresentation !==
          "AUTHORING"
        }
        mode={
          videoPresentation ===
          "PREVIEW"
            ? "PREVIEW"
            : "STUDENT"
        }
      />
    );
  }

  /*
   * Existing Educational Block behavior starts here.
   * Do not move launcher detection below this branch.
   */
  if (
    block &&
    isV2EducationalButtonBlock(
      block,
    )
  ) {
    return (
      <V2EducationalButtonVisual
        frame={frame}
        block={block}
        openable={
          videoPresentation ===
          "DELIVERY"
        }
        overlayContent={
          renderBlock?.(block)
        }
      />
    );
  }

  /*
   * Legacy/static educational-object frames.
   *
   * WORKSHEET remains here intentionally so old Worksheet
   * content keeps its existing behavior. Interactive
   * Worksheet Launchers have already returned above.
   */
  if (
    [
      "EDUCATIONAL",
      "ACTIVITY",
      "WORKSHEET",
      "EXERCISE",
    ].includes(frame.type)
  ) {
    return (
      <V2EducationalButtonVisual
        frame={frame}
        block={block}
        openable={
          videoPresentation ===
          "DELIVERY"
        }
      />
    );
  }

  if (frame.type === "TEXT") {
    return (
      <div
        data-v2-delivery-text-container
        className="relative h-full w-full max-w-full overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <V2TextVisual
            frame={frame}
            block={block}
            frames={frames}
            pageWidth={
              pageWidth
            }
            pageHeight={
              pageHeight
            }
          />
        </div>

        {frame.children?.map(
          (child) =>
            renderFrame?.(
              child,
              frame.children ?? [],
            ) ?? null,
        )}
      </div>
    );
  }

  if (frame.type === "IMAGE") {
    const resourceId =
      getV2FrameResourceId(
        frame,
      ) ??
      (block &&
      "resourceId" in block
        ? block.resourceId
        : undefined);

    return (
      <V2ImageVisual
        frame={frame}
        src={
          resourceId
            ? resourceUrlResolver(
                resourceId,
              )
            : null
        }
        alt={
          frame.altText ??
          frame.narrationLabel ??
          ""
        }
      />
    );
  }

  if (frame.type === "SHAPE") {
    const payload =
      frame.payload &&
      typeof frame.payload ===
        "object"
        ? (frame.payload as Record<
            string,
            unknown
          >)
        : {};

    return (
      <V2ShapeVisual
        payload={payload}
        frame={frame}
        editable={
          videoPresentation ===
            "AUTHORING" &&
          Boolean(
            onPayloadChange,
          )
        }
        onTextChange={(
          text,
        ) =>
          onPayloadChange?.({
            ...payload,
            text,
          })
        }
      />
    );
  }

  if (frame.type === "VIDEO") {
    const resourceId =
      getV2FrameResourceId(
        frame,
      ) ??
      (block &&
      "resourceId" in block &&
      typeof block.resourceId ===
        "string"
        ? block.resourceId
        : undefined) ??
      (block?.type === "media" &&
      block.targetType ===
        "RESOURCE"
        ? block.targetId
        : undefined);

    const src = resourceId
      ? resourceUrlResolver(
          resourceId,
        )
      : null;

    return src ? (
      <V2VideoVisual
        frame={frame}
        src={src}
        displayMode={
          getV2VideoDisplayMode(
            frame,
          )
        }
        presentation={
          videoPresentation ===
          "AUTHORING"
            ? "AUTHORING"
            : "DELIVERY"
        }
      />
    ) : (
      <Unavailable label="Video resource unavailable" />
    );
  }

  if (frame.type === "TABLE") {
    const payload =
      frame.payload &&
      typeof frame.payload ===
        "object"
        ? (frame.payload as Record<
            string,
            unknown
          >)
        : {};

    return (
      <V2TableVisual
        payload={payload}
        onChange={
          onPayloadChange
        }
      />
    );
  }

  if (block && renderBlock) {
    return (
      <div
        data-v2-bounded-block
        className="h-full w-full max-w-full overflow-auto p-2"
      >
        {renderBlock(block)}
      </div>
    );
  }

  return (
    <Unavailable
      label={`${frame.type} frame`}
    />
  );
}

function Unavailable({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">
      {label}
    </div>
  );
}