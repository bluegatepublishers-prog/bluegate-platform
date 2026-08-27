import "server-only";

import { buildSmartBookContentsFromManifest } from "@/lib/smart-book-contents";
import type { SmartBookReleaseManifestV2 } from "@/lib/smart-book-release-manifest";

/**
 * Loads the immutable V2 table of contents for a published Smart Book.
 *
 * The release manifest is the only runtime source for hierarchy. Existing
 * V1 rows are intentionally unavailable until the Publisher republishes them.
 */
export function getSmartBookContents(
  _bookId: string,
  options: { manifest: SmartBookReleaseManifestV2 },
) {
  return buildSmartBookContentsFromManifest(options.manifest);
}