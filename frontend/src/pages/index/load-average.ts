export type LoadSeverity =
  | 'healthy'
  | 'increasing'
  | 'elevated'
  | 'nearCapacity'
  | 'aboveCapacity'
  | 'unavailable';

interface LoadAppearance {
  value: number | null;
  ratio: number | null;
  severity: LoadSeverity;
  color: string | null;
}

const healthyColor = 'var(--ant-color-success)';
const warningColor = 'var(--ant-color-warning)';
const nearCapacityColor = 'var(--ant-color-warning-active)';
const aboveCapacityColor = 'var(--ant-color-error)';

function interpolate(from: string, to: string, fraction: number): string {
  return `color-mix(in srgb, ${to} ${(fraction * 100).toFixed(3)}%, ${from})`;
}

export function loadAppearance(
  load: number | null | undefined,
  logicalCPUs: number | null | undefined,
  comparable = true,
): LoadAppearance {
  const value = typeof load === 'number' && Number.isFinite(load) && load >= 0 ? load : null;
  const neutral: LoadAppearance = { value, ratio: null, severity: 'unavailable', color: null };
  if (
    value === null ||
    !comparable ||
    typeof logicalCPUs !== 'number' ||
    !Number.isFinite(logicalCPUs) ||
    logicalCPUs <= 0
  )
    return neutral;
  const ratio = value / logicalCPUs;
  if (ratio > 1) return { value, ratio, severity: 'aboveCapacity', color: aboveCapacityColor };
  if (ratio >= 0.85) return { value, ratio, severity: 'nearCapacity', color: nearCapacityColor };
  if (ratio >= 0.7)
    return {
      value,
      ratio,
      severity: 'elevated',
      color: interpolate(warningColor, nearCapacityColor, (ratio - 0.7) / 0.15),
    };
  if (ratio > 0.5)
    return {
      value,
      ratio,
      severity: 'increasing',
      color: interpolate(healthyColor, warningColor, (ratio - 0.5) / 0.2),
    };
  return { value, ratio, severity: 'healthy', color: healthyColor };
}
