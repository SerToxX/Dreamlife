function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return undefined;
  const parts = host.split('.');
  return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : undefined;
}

export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  let cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
  if (domain) cookie += `; Domain=${domain}`;
  if (window.location.protocol === 'https:') cookie += '; Secure';
  document.cookie = cookie;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  setCookie(name, '', -1);
}
