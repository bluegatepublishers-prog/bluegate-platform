"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent, ReactNode } from "react";

import V2PageCanvas from "@/components/admin/books/editor/V2PageCanvas";
import V2TextFrame from "@/components/admin/books/editor/V2TextFrame";
import V2FrameContent from "@/components/content/v2/V2FrameContent";
import V2ReadAloudPlayer from "@/components/content/V2ReadAloudPlayer";
import V2ImageVisual from "@/components/content/v2/V2ImageVisual";
import type { ContentBlock, ContentDocument } from "@/lib/content-document";
import { buildV2NarrationManifest, getNarrationStatus } from "@/lib/content-narration";
import type { V2TextFramePatch, V2TextLayoutSpan } from "@/lib/content-layout-v2-text";
import {
  addV2Page,
  arrangeV2Frame,
  deleteV2Frame,
  duplicateV2Frame,
  getV2Frame,
  moveV2ChildToPage,
  moveV2FlowFrame,
  moveV2FrameToContainer,
  updateV2FrameLayer,
  updateV2PageLayout,
  createV2Frame,
  normalizeV2ImageTransform,
  V2_IMAGE_ZOOM_MAX,
  V2_IMAGE_ZOOM_MIN,
  reorderV2Page,
  setV2PageVisualMode,
  updateV2Frame,
  type LayoutV2Frame,
  type LayoutV2FrameGeometry,
  type LayoutV2FrameType,
} from "@/lib/content-layout-v2";

type ResourceOption = {
  id: string;
  title: string;
  type?: string | null;
  mimeType?: string | null;
};

type Props = {
  title: string;
  document: ContentDocument;
  resources: ResourceOption[];
  saveState: "saved" | "dirty" | "saving" | "error";
  dirty: boolean;
  error?: string;
  wordCount: number;
  zoom: number;
  blocks: ContentBlock[];
  renderBlock: (block: ContentBlock) => ReactNode;
  onTitleChange: (value: string) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (value: number) => void;
  onDocumentChange: (document: ContentDocument, message: string) => void;
  onFrameTextChange: (frame: LayoutV2Frame, value: string, spans?: V2TextLayoutSpan[], patch?: V2TextFramePatch) => void;
  onAddFrame: (type: LayoutV2FrameType, pageId: string, frame: LayoutV2Frame) => void;
  onUploadImage?: (file: File, title: string) => Promise<ResourceOption>;
};

export default function V2DocumentWorkspace({
  title,
  document,
  resources,
  saveState,
  dirty,
  error = "",
  wordCount,
  zoom,
  blocks,
  renderBlock,
  onTitleChange,
  onSave,
  onUndo,
  onRedo,
  onZoomChange,
  onDocumentChange,
  onFrameTextChange,
  onAddFrame,
  onUploadImage,
}: Props) {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [cropFrameId, setCropFrameId] = useState<string | null>(null);
  const [semanticOverlay, setSemanticOverlay] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activePageId, setActivePageId] = useState(document.pageLayout?.pages[0]?.id ?? null);
  const layout = document.pageLayout;
  const narrationManifest = useMemo(() => buildV2NarrationManifest(document, "ADMIN_PREVIEW", { scopeId: title || "admin-preview" }), [document, title]);
  if (!layout) return null;

  const scale = Math.max(0.4, Math.min(2, zoom / 100));
  const activePageIndex = Math.max(0, layout.pages.findIndex((page) => page.id === activePageId));
  const activePage = layout.pages[activePageIndex] ?? layout.pages[0];
  const saveLabel = saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : dirty ? "Unsaved changes" : "Saved";
  const selectedRecord = selectedFrameId ? findV2FrameRecord(layout, selectedFrameId) : undefined;
  const selectedFrame = selectedRecord?.frame;
  const selectedParentId = selectedRecord?.parentId;
  const selectedPageId = selectedRecord?.pageId;
  const selectedImageFrame = selectedFrame?.type === "IMAGE" ? selectedFrame : null;
  const selectedTextFrame = selectedFrame?.type === "TEXT" ? selectedFrame : null;
  const selectedFlowFrame = selectedFrame && selectedFrame.type !== "TEXT" ? selectedFrame : null;
  const imageResources = resources.filter((resource) => resource.type === "IMAGE" || resource.type === "image" || resource.mimeType?.toLowerCase().startsWith("image/"));
  const audioResources = resources.filter((resource) => resource.type === "AUDIO" || resource.type === "audio" || resource.mimeType?.toLowerCase().startsWith("audio/"));
  const activeNarrationPage = activePage ? narrationManifest.pages.find((page) => page.pageId === activePage.id) : undefined;
  const narrationStatus = activePage && activeNarrationPage ? getNarrationStatus(activePage, activeNarrationPage) : "UNAVAILABLE";
  const narrationAudioUrls = Object.fromEntries(audioResources.map((resource) => [resource.id, "/api/admin/resources/" + encodeURIComponent(resource.id) + "/preview"]));

  const patchFrame = (frameId: string, patch: Partial<LayoutV2Frame>, message: string) => {
    const record = findV2FrameRecord(layout, frameId);
    if (!record) return;
    onDocumentChange({ ...document, pageLayout: updateV2Frame(layout, record.pageId, frameId, patch) }, message);
  };

  const applyArrange = (action: "FRONT" | "FORWARD" | "BACKWARD" | "BACK") => {
    if (!selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: arrangeV2Frame(layout, selectedPageId, selectedFrameId, action) }, "Visual order updated");
  };

  const applyLayer = (layer: LayoutV2Frame["layer"]) => {
    if (!selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: updateV2FrameLayer(layout, selectedPageId, selectedFrameId, layer) }, "Layer updated");
  };

  const moveFlow = (direction: -1 | 1) => {
    if (!selectedFrameId || !selectedPageId || selectedParentId) return;
    onDocumentChange({ ...document, pageLayout: moveV2FlowFrame(layout, selectedPageId, selectedFrameId, direction) }, direction < 0 ? "Flow item moved earlier" : "Flow item moved later");
  };

  const handleDropFrame = (frameId: string, containerId: string) => {
    if (!activePage) return;
    const nextLayout = moveV2FrameToContainer(layout, activePage.id, frameId, containerId);
    if (nextLayout !== layout) {
      setSelectedFrameId(frameId);
      onDocumentChange({ ...document, pageLayout: nextLayout }, "Frame moved into container");
    }
  };

  const addChildFrame = (type: "TEXT" | "IMAGE" | "VIDEO" | "TABLE") => {
    if (!selectedFrame || selectedFrame.type !== "EDUCATIONAL" || !selectedPageId) return;
    const child = createV2Frame(type, selectedPageId, {
      x: 18,
      y: 28 + (selectedFrame.children?.length ?? 0) * 22,
      width: Math.min(type === "TEXT" ? 260 : 180, selectedFrame.width),
      height: type === "TEXT" ? 72 : 110,
      zIndex: selectedFrame.children?.length ?? 0,
      layer: "CONTENT",
      layoutMode: "ABSOLUTE",
      ...(type === "IMAGE" || type === "VIDEO" ? { resourceId: resources[0]?.id } : {}),
      ...(type === "TEXT" ? { payload: "New container text" } : {}),
    });
    const nextLayout = updateV2PageLayout(layout, (pages) => pages.map((page) => page.id !== selectedPageId ? page : {
      ...page,
      frames: page.frames.map((frame) => frame.id === selectedFrame.id ? { ...frame, children: [...(frame.children ?? []), { ...child, parentId: frame.id }] } : frame),
    }));
    setSelectedFrameId(child.id);
    onDocumentChange({ ...document, pageLayout: nextLayout }, `${type[0]}${type.slice(1).toLowerCase()} child added`);
  };
  const patchImage = (frameId: string, patch: Partial<LayoutV2Frame>, message: string) => {
    patchFrame(frameId, patch, message);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedImageFrame || !onUploadImage) return;
    setUploadingImage(true);
    try {
      const resource = await onUploadImage(file, file.name.replace(/\.[^.]+$/, "") || "Image");
      patchImage(selectedImageFrame.id, { resourceId: resource.id, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced");
    } finally {
      setUploadingImage(false);
    }
  };

  const commitFrameGeometry = (pageId: string, frameId: string, geometry: LayoutV2FrameGeometry) => {
    onDocumentChange({ ...document, pageLayout: updateV2Frame(layout, pageId, frameId, geometry) }, "Frame position saved");
  };

  const detachSelectedChild = () => {
    if (!selectedParentId || !selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: moveV2ChildToPage(layout, selectedPageId, selectedParentId, selectedFrameId) }, "Child moved to page");
  };

  const duplicateSelected = () => {
    if (!selectedFrameId || !selectedPageId || selectedParentId) return;
    onDocumentChange({ ...document, pageLayout: duplicateV2Frame(layout, selectedPageId, selectedFrameId) }, "Frame duplicated");
  };

  const deleteSelected = () => {
    if (!selectedFrameId || !selectedPageId) return;
    onDocumentChange({ ...document, pageLayout: deleteV2Frame(layout, selectedPageId, selectedFrameId) }, "Frame deleted");
    setSelectedFrameId(null);
  };

  const attachNarration = (resourceId: string) => {
    if (!activePage || !activeNarrationPage) return;
    const narration = resourceId
      ? { ...(activePage.narration ?? {}), sourceHash: activeNarrationPage.sourceHash, resourceId, provider: "HUMAN", status: "READY" as const }
      : undefined;
    onDocumentChange({
      ...document,
      pageLayout: updateV2PageLayout(layout, (pages) => pages.map((page) => page.id === activePage.id ? { ...page, narration } : page)),
    }, resourceId ? "Human narration attached" : "Human narration detached");
  };
  const addPage = () => {
    const nextLayout = addV2Page(layout);
    const nextPage = nextLayout.pages[nextLayout.pages.length - 1];
    setActivePageId(nextPage?.id ?? activePageId);
    onDocumentChange({ ...document, pageLayout: nextLayout }, "Page added");
  };

  const moveActivePage = (direction: -1 | 1) => {
    if (!activePage) return;
    const nextLayout = reorderV2Page(layout, activePage.id, direction);
    onDocumentChange({ ...document, pageLayout: nextLayout }, direction < 0 ? "Page moved up" : "Page moved down");
  };

  const addFrame = (type: LayoutV2FrameType) => {
    if (!activePage) return;
    const offset = 24 + (activePage.frames.length % 8) * 22;
    const resourceId = type === "IMAGE" || type === "VIDEO" ? resources[0]?.id : undefined;
    const frame = createV2Frame(type, activePage.id, {
      x: offset,
      y: offset,
      width: Math.min(type === "TEXT" ? 420 : 320, activePage.width),
      height: Math.min(type === "TEXT" ? 150 : 180, activePage.height),
      zIndex: activePage.frames.reduce((maximum, entry) => Math.max(maximum, entry.zIndex), 0) + 1,
      layer: type === "SHAPE" ? "DESIGN" : "CONTENT",
      layoutMode: "ABSOLUTE",
      ...(resourceId ? { resourceId } : {}),
      ...(type === "TEXT" ? { payload: "New text frame" } : {}),
    });
    setSelectedFrameId(frame.id);
    onAddFrame(type, activePage.id, frame);
  };

  return (
    <div className="flex min-h-full min-w-0 flex-col bg-[#e7ebf0]" onKeyDown={(event) => { if (event.key === "Escape") setCropFrameId(null); }}>
      <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 shadow-sm">
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">Page Layout V2</span>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Module title"
          className="min-w-[12rem] flex-1 rounded-md border border-transparent px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:border-blue-300"
        />
        <div className="flex items-center gap-1">
          <button type="button" onClick={onUndo} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Undo</button>
          <button type="button" onClick={onRedo} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Redo</button>
          <button type="button" onClick={onSave} className="rounded-md bg-slate-950 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800">Save</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-3 py-2 text-xs">
        <span className="font-semibold text-slate-500">Insert:</span>
        {(["TEXT", "IMAGE", "TABLE", "VIDEO", "EDUCATIONAL"] as const).map((type) => (
          <button key={type} type="button" onClick={() => addFrame(type)} className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{type[0] + type.slice(1).toLowerCase()}</button>
        ))}
        <button type="button" onClick={addPage} className="ml-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100">Add Page</button>
        <span className="ml-auto flex items-center gap-1 text-slate-500">
          <button type="button" onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="rounded px-1 font-bold hover:bg-slate-100" aria-label="Zoom out">−</button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="rounded px-1 font-bold hover:bg-slate-100" aria-label="Zoom in">+</button>
          <button type="button" onClick={() => onZoomChange(70)} className="ml-1 rounded-md border border-slate-200 px-2 py-1 font-semibold hover:bg-slate-50">Fit page</button>
        </span>
      </div>

      {selectedImageFrame ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs" onKeyDown={(event) => { if (event.key === "Escape") setCropFrameId(null); }}>
          <span className="font-bold text-amber-900">Image</span>
          {(["FIT", "FILL", "CROP"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => { if (mode === "CROP") setCropFrameId(selectedImageFrame.id); else setCropFrameId(null); patchImage(selectedImageFrame.id, { fitMode: mode }, `${mode} mode selected`); }} className={`rounded-md border px-2 py-1 font-semibold ${selectedImageFrame.fitMode === mode ? "border-amber-500 bg-amber-200 text-amber-950" : "border-amber-200 bg-white text-amber-800"}`}>{mode[0] + mode.slice(1).toLowerCase()}</button>
          ))}
          <span className="ml-1 text-amber-700">Zoom</span>
          <button type="button" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.max(V2_IMAGE_ZOOM_MIN, (selectedImageFrame.zoom ?? 1) - 0.25) }, "Image zoom updated")} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-bold" aria-label="Zoom image out">−</button>
          <span className="min-w-10 text-center font-semibold text-amber-900">{(selectedImageFrame.zoom ?? 1).toFixed(2)}×</span>
          <button type="button" onClick={() => patchImage(selectedImageFrame.id, { fitMode: "CROP", zoom: Math.min(V2_IMAGE_ZOOM_MAX, (selectedImageFrame.zoom ?? 1) + 0.25) }, "Image zoom updated")} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-bold" aria-label="Zoom image in">+</button>
          <button type="button" onClick={() => { setCropFrameId(null); patchImage(selectedImageFrame.id, { fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image reset"); }} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">Reset</button>
          <label className="flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">
            <input type="checkbox" checked={selectedImageFrame.aspectLocked === true} onChange={(event) => patchImage(selectedImageFrame.id, { aspectLocked: event.target.checked }, "Image aspect lock updated")} />
            Aspect lock
          </label>
          <select aria-label="Replace image" value="" onChange={(event) => { const resource = imageResources.find((entry) => entry.id === event.target.value); if (resource) { setCropFrameId(null); patchImage(selectedImageFrame.id, { resourceId: resource.id, fitMode: "FIT", crop: { x: 0, y: 0, width: 1, height: 1 }, zoom: 1, offsetX: 0, offsetY: 0 }, "Image replaced"); } }} className="rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900"><option value="">Replace Image</option>{imageResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}</select>
          {onUploadImage ? <label className="cursor-pointer rounded-md border border-amber-200 bg-white px-2 py-1 font-semibold text-amber-900">{uploadingImage ? "Uploading…" : "Upload Image"}<input type="file" accept="image/*" className="sr-only" disabled={uploadingImage} onChange={(event) => void handleImageUpload(event)} /></label> : null}
          {cropFrameId === selectedImageFrame.id ? <span className="font-semibold text-amber-800">Crop mode · drag image</span> : null}
        </div>
      ) : null}
      {selectedTextFrame ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50 px-3 py-2 text-xs">
          <span className="font-bold text-blue-900">Text</span>
          {[ ["bold", "Bold"], ["italic", "Italic"], ["underline", "Underline"] ].map(([command, label]) => (
            <button key={command} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => globalThis.document.execCommand(command, false)} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">{label}</button>
          ))}
          <label className="flex items-center gap-1 font-semibold text-blue-800">Size
            <input type="number" min="8" max="96" value={selectedTextFrame.fontSize ?? 16} onChange={(event) => patchFrame(selectedTextFrame.id, { fontSize: Math.max(8, Math.min(96, Number(event.target.value) || 16)) }, "Text size updated")} className="w-14 rounded border border-blue-200 bg-white px-1 py-1" />
          </label>
          <select aria-label="Text direction" value={selectedTextFrame.direction ?? "LTR"} onChange={(event) => patchFrame(selectedTextFrame.id, { direction: event.target.value as LayoutV2Frame["direction"] }, "Text direction updated")} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">
            <option value="LTR">LTR</option><option value="RTL">RTL</option><option value="AUTO">Auto</option>
          </select>
          <select aria-label="Text alignment" value={selectedTextFrame.alignment ?? "left"} onChange={(event) => patchFrame(selectedTextFrame.id, { alignment: event.target.value as LayoutV2Frame["alignment"] }, "Text alignment updated")} className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <label className="flex items-center gap-1 font-semibold text-blue-800">Read order
            <input type="number" min="0" value={selectedTextFrame.readingOrder} onChange={(event) => patchFrame(selectedTextFrame.id, { readingOrder: Math.max(0, Number(event.target.value) || 0) }, "Reading order updated")} className="w-14 rounded border border-blue-200 bg-white px-1 py-1" />
          </label>
        </div>
      ) : null}
      {selectedFlowFrame ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-bold text-slate-700">Flow</span>
          <select aria-label="Object flow" value={selectedFlowFrame.layoutMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { layoutMode: event.target.value as LayoutV2Frame["layoutMode"] }, "Object flow updated")} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
            <option value="ABSOLUTE">Absolute</option><option value="FLOAT">Float</option><option value="INLINE">Inline</option>
          </select>
          <select aria-label="Text wrap" value={selectedFlowFrame.wrapMode} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapMode: event.target.value as LayoutV2Frame["wrapMode"] }, "Text wrap updated")} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700">
            <option value="NONE">No wrap</option><option value="WRAP_LEFT">Wrap left</option><option value="WRAP_RIGHT">Wrap right</option><option value="WRAP_BOTH">Wrap both</option><option value="BEHIND_TEXT">Behind text</option><option value="IN_FRONT_OF_TEXT">In front</option>
          </select>
          <label className="flex items-center gap-1 font-semibold text-slate-700">Gap
            <input type="number" min="0" max="96" value={selectedFlowFrame.wrapPadding ?? 8} onChange={(event) => patchFrame(selectedFlowFrame.id, { wrapPadding: Math.max(0, Math.min(96, Number(event.target.value) || 0)) }, "Wrap gap updated")} className="w-14 rounded border border-slate-200 bg-white px-1 py-1" />
          </label>
        </div>
      ) : null}
      {selectedFrame ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-xs" data-v2-authoring-controls="arrange">
          <span className="font-bold text-indigo-900">Arrange</span>
          {[ ["FRONT", "Bring to Front"], ["FORWARD", "Bring Forward"], ["BACKWARD", "Send Backward"], ["BACK", "Send to Back"] ].map(([action, label]) => (
            <button key={action} type="button" onClick={() => applyArrange(action as "FRONT" | "FORWARD" | "BACKWARD" | "BACK")} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">{label}</button>
          ))}
          <label className="flex items-center gap-1 font-semibold text-indigo-800">Layer
            <select aria-label="Frame layer" value={selectedFrame.layer} onChange={(event) => applyLayer(event.target.value as LayoutV2Frame["layer"])} className="rounded border border-indigo-200 bg-white px-2 py-1">
              <option value="BACKGROUND">Background</option><option value="CONTENT">Content</option><option value="DESIGN">Design</option><option value="INTERACTIVE">Interactive</option>
            </select>
          </label>
          <label className="flex items-center gap-1 font-semibold text-indigo-800">Reading Order
            <input type="number" min="0" value={selectedFrame.readingOrder} onChange={(event) => patchFrame(selectedFrame.id, { readingOrder: Math.max(0, Number(event.target.value) || 0) }, "Reading order updated")} className="w-14 rounded border border-indigo-200 bg-white px-1 py-1" />
          </label>
          <label className="flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800"><input type="checkbox" checked={selectedFrame.locked} onChange={(event) => patchFrame(selectedFrame.id, { locked: event.target.checked }, "Lock updated")} /> Lock</label>
          {(selectedFrame.layoutMode === "FLOW" || selectedFrame.layoutMode === "INLINE") && !selectedParentId ? <><button type="button" onClick={() => moveFlow(-1)} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Move Earlier</button><button type="button" onClick={() => moveFlow(1)} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Move Later</button></> : null}
          {selectedParentId ? <button type="button" onClick={detachSelectedChild} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-900">Move to Page</button> : null}
          {selectedFrame.type === "EDUCATIONAL" ? <span className="flex items-center gap-1"><span className="font-bold text-indigo-900">Container:</span>{(["TEXT", "IMAGE", "VIDEO", "TABLE"] as const).map((type) => <button key={type} type="button" onClick={() => addChildFrame(type)} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">+ {type[0] + type.slice(1).toLowerCase()}</button>)}</span> : null}
          {!selectedParentId ? <><button type="button" onClick={duplicateSelected} className="rounded-md border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800">Duplicate</button><button type="button" onClick={deleteSelected} className="rounded-md border border-rose-200 bg-white px-2 py-1 font-semibold text-rose-700">Delete</button></> : null}
        </div>
      ) : null}
      {error ? <div role="alert" className="mx-4 mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</div> : null}

      <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-600">Active page {activePageIndex + 1}</span>
        <button type="button" onClick={() => moveActivePage(-1)} disabled={activePageIndex === 0} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40">Move up</button>
        <button type="button" onClick={() => moveActivePage(1)} disabled={activePageIndex >= layout.pages.length - 1} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:opacity-40">Move down</button>
        <span data-testid="v2-save-state" className="ml-auto text-slate-500">{saveLabel} � {wordCount.toLocaleString("en-IN")} words</span>
      </div>

      <details className="mx-3 mt-3 rounded-lg border border-slate-300 bg-white text-xs" data-v2-object-navigator>
        <summary className="cursor-pointer px-3 py-2 font-bold text-slate-700">Page Objects</summary>
        <div className="grid gap-2 border-t border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-4">
          {layout.pages.map((page) => (
            <div key={page.id} className="min-w-0">
              <button type="button" onClick={() => setActivePageId(page.id)} className="mb-1 font-bold text-slate-600">Page {layout.pages.indexOf(page) + 1}</button>
              {(["BACKGROUND", "CONTENT", "DESIGN", "INTERACTIVE"] as const).map((layer) => {
                const layerFrames = page.frames.filter((frame) => frame.layer === layer).sort((a, b) => a.zIndex - b.zIndex);
                if (!layerFrames.length) return null;
                return <div key={layer} className="mb-1"><div className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{layerLabel(layer)}</div>{layerFrames.map((frame) => <div key={frame.id} className="pl-2"><button type="button" onClick={() => { setActivePageId(page.id); setSelectedFrameId(frame.id); }} className={`block max-w-full truncate rounded px-1 py-0.5 text-left font-semibold ${selectedFrameId === frame.id ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}>{frame.narrationLabel || frame.type}</button>{frame.children?.map((child) => <button key={child.id} type="button" onClick={() => { setActivePageId(page.id); setSelectedFrameId(child.id); }} className={`ml-3 block max-w-[90%] truncate rounded px-1 py-0.5 text-left text-[11px] ${selectedFrameId === child.id ? "bg-amber-100 text-amber-900" : "text-slate-500 hover:bg-slate-50"}`}>↳ {child.narrationLabel || child.type}</button>)}</div>)}</div>;
              })}
            </div>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-2 border-b border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs">
        <span className="font-semibold text-fuchsia-800">Page visual:</span>
        {activePage.visualMode === "EXACT_REPLICA" ? <><span className="rounded-full bg-fuchsia-200 px-2 py-1 font-bold text-fuchsia-900">Exact Replica</span><button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EDITABLE") }, "Page switched to Editable; replica source preserved")} className="rounded-md border border-fuchsia-200 bg-white px-2 py-1 font-semibold text-fuchsia-800">View as Editable</button></> : activePage.replica?.resourceId ? <button type="button" onClick={() => onDocumentChange({ ...document, pageLayout: setV2PageVisualMode(layout, activePage.id, "EXACT_REPLICA") }, "Page switched to Exact Replica; semantic frames preserved")} className="rounded-md border border-fuchsia-200 bg-white px-2 py-1 font-semibold text-fuchsia-800">Use Replica</button> : <span className="text-slate-500">Editable</span>}
        {activePage.visualMode === "EXACT_REPLICA" ? <label className="ml-auto flex items-center gap-1 font-semibold text-fuchsia-800"><input type="checkbox" checked={semanticOverlay} onChange={(event) => setSemanticOverlay(event.target.checked)} /> Semantic Overlay</label> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-blue-200 bg-blue-50 px-3 py-2 text-xs">
        <span className="font-bold text-blue-900">Read Aloud</span>
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-600">Page status: {narrationStatus.replaceAll("_", " ")}</span>
        <label className="flex items-center gap-1 font-semibold text-blue-800">Human audio
          <select aria-label="Attach human narration" value={activePage?.narration?.resourceId ?? ""} onChange={(event) => attachNarration(event.target.value)} className="rounded border border-blue-200 bg-white px-2 py-1">
            <option value="">No attached audio</option>
            {audioResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
          </select>
        </label>
        <div className="min-w-[18rem] flex-1"><V2ReadAloudPlayer manifest={narrationManifest} audioUrls={narrationAudioUrls} /></div>
      </div>      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-fit min-w-[min(100%,520px)] flex-col gap-8">
          {layout.pages.map((page, index) => (
            <div key={page.id} onClick={() => setActivePageId(page.id)} className={activePage?.id === page.id ? "rounded-xl ring-2 ring-indigo-300 ring-offset-4 ring-offset-[#e7ebf0]" : "rounded-xl"}>
              <V2PageCanvas
                page={page}
                scale={scale}
                pageNumber={index + 1}
                selectedFrameId={selectedFrameId}
                renderFrame={(frame, frames) => renderV2Frame(frame, frames, page.width, page.height, blocks, renderBlock, onFrameTextChange, frame.id === cropFrameId, scale, semanticOverlay, (patch: Partial<LayoutV2Frame>, message: string) => patchImage(frame.id, patch, message), () => setCropFrameId(frame.id))}
                onSelectFrame={(frameId) => {
                  setActivePageId(page.id);
                  setSelectedFrameId(frameId);
                }}
                onClearSelection={() => setSelectedFrameId(null)}
                onCommitGeometry={(frameId, geometry) => commitFrameGeometry(page.id, frameId, geometry)}
                onDropFrame={handleDropFrame}
                semanticOverlay={semanticOverlay}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function layerLabel(layer: LayoutV2Frame["layer"]) {
  return layer[0] + layer.slice(1).toLowerCase();
}

function findV2FrameRecord(layout: NonNullable<ContentDocument["pageLayout"]>, frameId: string) {
  for (const page of layout.pages) {
    const frame = getV2Frame(layout, page.id, frameId);
    if (frame) {
      const parent = page.frames.find((entry) => entry.children?.some((child) => child.id === frameId));
      return { frame, pageId: page.id, parentId: parent?.id };
    }
  }
  return undefined;
}

function renderV2Frame(
  frame: LayoutV2Frame,
  frames: LayoutV2Frame[],
  pageWidth: number,
  pageHeight: number,
  blocks: ContentBlock[],
  renderBlock: (block: ContentBlock) => ReactNode,
  onFrameTextChange: (frame: LayoutV2Frame, value: string, spans?: V2TextLayoutSpan[], patch?: V2TextFramePatch) => void,
  cropMode: boolean,
  scale: number,
  semanticOverlay: boolean,
  onPatch: (patch: Partial<LayoutV2Frame>, message: string) => void,
  onEnterCrop: () => void,
) {
  if (frame.renderMode === "SEMANTIC_ONLY" && semanticOverlay) {
    return <div data-v2-semantic-overlay="true" className="h-full w-full border border-dashed border-fuchsia-500/80 bg-fuchsia-200/10 p-1 text-[10px] font-bold text-fuchsia-700">{frame.type}</div>;
  }
  const block = frame.contentRef?.blockId ? blocks.find((entry) => entry.id === frame.contentRef?.blockId) : undefined;
  if (frame.type === "TEXT") {
    return <V2TextFrame frame={frame} block={block} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} onTextChange={(value, spans, patch) => onFrameTextChange(frame, value, spans, patch)} />;
  }

  if (frame.type === "IMAGE") return <V2ImageFrame frame={frame} block={block} cropMode={cropMode} scale={scale} onPatch={onPatch} onEnterCrop={onEnterCrop} />;
  if (frame.type === "SHAPE" || frame.type === "VIDEO" || block) {
    return <V2FrameContent frame={frame} frames={frames} block={block} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => `/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} renderBlock={renderBlock} />;
  }
  return <V2FrameContent frame={frame} frames={frames} pageWidth={pageWidth} pageHeight={pageHeight} resourceUrlResolver={(resourceId) => `/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} />;
}

function V2ImageFrame({
  frame,
  block,
  cropMode,
  scale,
  onPatch,
  onEnterCrop,
}: {
  frame: LayoutV2Frame;
  block?: ContentBlock;
  cropMode: boolean;
  scale: number;
  onPatch: (patch: Partial<LayoutV2Frame>, message: string) => void;
  onEnterCrop: () => void;
}) {
  const resourceId = frame.resourceId ?? frame.contentRef?.resourceId ?? (block && "resourceId" in block ? block.resourceId : undefined);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draftOffset, setDraftOffset] = useState<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  // Shared V2ImageVisual owns FIT/FILL/CROP rendering via getV2CropImagePercentages, object-contain, and object-cover.
  const transform = normalizeV2ImageTransform({ crop: frame.crop, zoom: frame.zoom, offsetX: draftOffset?.x ?? frame.offsetX, offsetY: draftOffset?.y ?? frame.offsetY });
  if (!resourceId) return <div className="flex h-full w-full items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">Image resource unavailable</div>;
  if (failed) return <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">Image unavailable</div>;
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropMode) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: transform.offsetX, offsetY: transform.offsetY };
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setDraftOffset({ x: Math.max(-1, Math.min(1, pan.offsetX + (event.clientX - pan.startX) / Math.max(1, frame.width * scale))), y: Math.max(-1, Math.min(1, pan.offsetY + (event.clientY - pan.startY) / Math.max(1, frame.height * scale))) });
  };
  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const next = draftOffset ?? { x: pan.offsetX, y: pan.offsetY };
    onPatch({ offsetX: next.x, offsetY: next.y }, "Image position saved");
    panRef.current = null;
    setDraftOffset(null);
  };
  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-100 ${cropMode ? "cursor-grab ring-2 ring-amber-400 ring-inset" : ""}`} onDoubleClick={onEnterCrop} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} tabIndex={cropMode ? 0 : -1} onKeyDown={(event) => { if (!cropMode) return; const step = event.shiftKey ? 0.05 : 0.01; const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 } : event.key === "ArrowRight" ? { x: step, y: 0 } : event.key === "ArrowUp" ? { x: 0, y: -step } : event.key === "ArrowDown" ? { x: 0, y: step } : null; if (!delta) return; event.preventDefault(); onPatch({ offsetX: Math.max(-1, Math.min(1, transform.offsetX + delta.x)), offsetY: Math.max(-1, Math.min(1, transform.offsetY + delta.y)) }, "Image position saved"); }}>
      <V2ImageVisual frame={{ ...frame, offsetX: draftOffset?.x ?? frame.offsetX, offsetY: draftOffset?.y ?? frame.offsetY }} src={`/api/admin/resources/${encodeURIComponent(resourceId)}/preview`} loaded={loaded} failed={failed} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </div>
  );
}
