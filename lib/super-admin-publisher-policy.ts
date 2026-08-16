export type PublisherCreationInput = {
  name: string;
  slug: string;
  shortName: string | null;
  supportEmail: string | null;
};

export function normalizePublisherSlug(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function parsePublisherCreationInput(input: {
  name: unknown;
  slug: unknown;
  shortName?: unknown;
  supportEmail?: unknown;
}): PublisherCreationInput {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
  const slug = normalizePublisherSlug(input.slug);
  const shortName = String(input.shortName ?? "").trim().replace(/\s+/g, " ").slice(0, 60) || null;
  const supportEmail = String(input.supportEmail ?? "").trim().toLowerCase().slice(0, 254) || null;

  if (!name) throw new Error("Publisher name is required.");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug)) {
    throw new Error("Use a lowercase slug with letters, numbers, and hyphens.");
  }
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    throw new Error("Enter a valid support email or leave it blank.");
  }

  return { name, slug, shortName, supportEmail };
}
export type PublisherCreateState = {
  ok: boolean;
  message: string;
};

export const initialPublisherCreateState: PublisherCreateState = {
  ok: false,
  message: "",
};
