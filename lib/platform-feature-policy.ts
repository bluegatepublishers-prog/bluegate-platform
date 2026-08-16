export type PlatformFeatureReadiness = {
  implemented: boolean;
  active: boolean;
};

export function getPublisherFeatureEnablementError(
  feature: PlatformFeatureReadiness,
  enabled: boolean,
) {
  if (!enabled) return null;
  if (!feature.implemented || !feature.active) {
    return "Feature is not ready for publisher access.";
  }
  return null;
}
