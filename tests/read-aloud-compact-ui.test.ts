import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getV2AuthoringVoiceOptions } from "../components/content/V2ReadAloudPlayer";

const read = (path: string) => readFileSync(path, "utf8");

test("authoring voice grouping keeps English/Hindi voices and detects Hindi by language", () => {
  const options = getV2AuthoringVoiceOptions([
    {
      voiceURI: "heera",
      name: "Microsoft Heera",
      lang: "en-IN",
    },
    {
      voiceURI: "ravi",
      name: "Microsoft Ravi",
      lang: "en-IN",
    },
    {
      voiceURI: "hindi",
      name: "Actual Hindi",
      lang: "hi-IN",
    },
    {
      voiceURI: "other",
      name: "Device Other",
      lang: "fr-FR",
    },
  ] as SpeechSynthesisVoice[]);

  assert.deepEqual(
    options.map((voice) => voice.category),
    [
      "Indian English",
      "Indian English",
      "Hindi",
    ],
  );

  assert.deepEqual(
    options.map((voice) => voice.label),
    [
      "Microsoft Heera",
      "Microsoft Ravi",
      "Actual Hindi",
    ],
  );
});

test("compact player keeps controls, late voice discovery, and truthful Hindi fallback", () => {
  const player = read(
    "components/content/V2ReadAloudPlayer.tsx",
  );

  assert.match(
    player,
    /data-v2-read-aloud-player/,
  );

  assert.match(
    player,
    /<optgroup key=\{category\} label=\{category\}>/,
  );

  assert.match(
    player,
    /Hindi voice unavailable on this device\./,
  );

  assert.match(
    player,
    /voiceschanged/,
  );

  assert.match(
    player,
    /onvoiceschanged/,
  );

  assert.match(
    player,
    /aria-label="Play Read Aloud"/,
  );

  assert.match(
    player,
    /aria-label=\{status === "PAUSED" \? "Resume Read Aloud" : "Pause Read Aloud"\}/,
  );

  assert.match(
    player,
    /aria-label="Stop Read Aloud"/,
  );

  assert.match(
    player,
    /aria-label="Restart Read Aloud"/,
  );

  assert.match(
    player,
    /pageContext/,
  );

  assert.doesNotMatch(
    player,
    /lang.startsWith\("zh"\)|lang.startsWith\("it"\)|lang.startsWith\("fr"\)|lang.startsWith\("de"\)/,
  );
});

test("Review authoring resolves narration from the original absolute Book page", () => {
  const workspace = read(
    "components/admin/books/editor/V2DocumentWorkspace.tsx",
  );

  const inspector = read(
    "components/admin/books/editor/ReadAloudPageInspector.tsx",
  );

  assert.match(
    workspace,
    /data-v2-read-aloud-panel/,
  );

  /*
   * Hierarchy-filtered views retain the absolute Book page
   * identity through activePageView.
   */
  assert.match(
    workspace,
    /activePageView\?\.absolutePageNumber/,
  );

  assert.match(
    workspace,
    /activeAbsolutePageNumber/,
  );

  /*
   * Read Aloud text must still come from persisted
   * page-level readAloud metadata.
   */
  assert.match(
    workspace,
    /readAloud\?\.text\s*\?\?\s*""/,
  );

  /*
   * Do not regress to directly treating activePage as
   * the authoritative narration source in filtered views.
   */
  assert.doesNotMatch(
    workspace,
    /pageText=\{activePage\.readAloud\?\.text \?\? ""\}/,
  );

  /*
   * The old duplicate ReadAloudControls UI must remain removed.
   */
  assert.doesNotMatch(
    workspace,
    /<ReadAloudControls/,
  );

  assert.doesNotMatch(
    workspace,
    /aria-expanded=\{narrationOpen\}/,
  );

  /*
   * Review uses the compact V2 Read Aloud player.
   */
  assert.match(
    workspace,
    /<V2ReadAloudPlayer/,
  );

  assert.match(
    workspace,
    /pageContext=\{pageCountLabel\}/,
  );

  /*
   * Advanced narration authoring remains available,
   * but collapsed by default.
   */
  assert.match(
    workspace,
    /data-v2-read-aloud-advanced/,
  );

  assert.match(
    workspace,
    /Browser TTS previews semantic text/,
  );

  assert.match(
    workspace,
    /Segment-level mapping/,
  );

  assert.doesNotMatch(
    workspace,
    /<details open data-v2-read-aloud-advanced/,
  );

  /*
   * Reading Text inspector is also collapsed by default.
   */
  assert.match(
    inspector,
    /<details className=/,
  );

  assert.doesNotMatch(
    inspector,
    /<details open/,
  );
});