/** Eine kurze, stabile Gerätebezeichnung aus dem gespeicherten User-Agent. */
export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return '';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /CriOS|Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : '';
  const platform = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : '';
  return [browser, platform].filter(Boolean).join(' · ');
}
