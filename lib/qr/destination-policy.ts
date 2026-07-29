import { isIP } from "node:net";

const LOOP_ROUTE_PREFIX = "/qr/r/";

export class QrDestinationPolicyError extends Error {
  constructor(
    message: string,
    public readonly reasonCode: string,
  ) {
    super(message);
    this.name = "QrDestinationPolicyError";
  }
}

function externalHostAllowlist() {
  return (process.env.QR_ALLOWED_EXTERNAL_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatchesRule(hostname: string, rule: string) {
  if (rule.startsWith("*.")) {
    const suffix = rule.slice(2);
    return hostname !== suffix && hostname.endsWith(`.${suffix}`);
  }

  return hostname === rule;
}

export function normalizeApprovedExternalUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new QrDestinationPolicyError(
      "An external URL is required.",
      "EXTERNAL_URL_REQUIRED",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new QrDestinationPolicyError(
      "The external URL is invalid.",
      "INVALID_EXTERNAL_URL",
    );
  }

  if (parsed.protocol !== "https:") {
    throw new QrDestinationPolicyError(
      "External QR destinations must use HTTPS.",
      "UNSAFE_EXTERNAL_PROTOCOL",
    );
  }

  if (
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== "443")
  ) {
    throw new QrDestinationPolicyError(
      "The external URL contains unsupported credentials or a port.",
      "UNSAFE_EXTERNAL_AUTHORITY",
    );
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isIP(hostname) !== 0
  ) {
    throw new QrDestinationPolicyError(
      "IP-address and local destinations are not allowed.",
      "UNSAFE_EXTERNAL_HOST",
    );
  }

  const allowlist = externalHostAllowlist();
  if (
    allowlist.length === 0 ||
    !allowlist.some((rule) => hostMatchesRule(hostname, rule))
  ) {
    throw new QrDestinationPolicyError(
      "The external domain has not been approved.",
      "EXTERNAL_DOMAIN_NOT_APPROVED",
    );
  }

  if (
    (hostname === "edoralearning.in" ||
      hostname.endsWith(".edoralearning.in")) &&
    parsed.pathname.toLowerCase().startsWith(LOOP_ROUTE_PREFIX)
  ) {
    throw new QrDestinationPolicyError(
      "A QR redirect cannot target another QR redirect.",
      "QR_REDIRECT_LOOP",
    );
  }

  parsed.hostname = hostname;
  parsed.hash = "";

  return {
    url: parsed.toString(),
    host: hostname,
  };
}

export function normalizeInternalRoute(value: unknown) {
  if (typeof value !== "string") {
    throw new QrDestinationPolicyError(
      "An internal route is required.",
      "INTERNAL_ROUTE_REQUIRED",
    );
  }

  const route = value.trim();
  if (
    !route.startsWith("/") ||
    route.startsWith("//") ||
    route.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(route)
  ) {
    throw new QrDestinationPolicyError(
      "The internal route is invalid.",
      "INVALID_INTERNAL_ROUTE",
    );
  }

  const parsed = new URL(route, "https://edoralearning.in");
  if (parsed.pathname.toLowerCase().startsWith(LOOP_ROUTE_PREFIX)) {
    throw new QrDestinationPolicyError(
      "A QR redirect cannot target another QR redirect.",
      "QR_REDIRECT_LOOP",
    );
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function safeResourceDestination(
  value: string,
  requestUrl: string,
) {
  let parsed: URL;
  try {
    parsed = new URL(value, requestUrl);
  } catch {
    throw new QrDestinationPolicyError(
      "The Resource destination is invalid.",
      "INVALID_RESOURCE_URL",
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new QrDestinationPolicyError(
      "The Resource destination uses an unsafe protocol.",
      "UNSAFE_RESOURCE_PROTOCOL",
    );
  }

  return parsed.toString();
}
