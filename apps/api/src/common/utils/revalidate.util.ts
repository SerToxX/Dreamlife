/**
 * Avisa al frontend (Next.js) que revalide una página cacheada (ISR) porque
 * sus datos cambiaron. Fire-and-forget: nunca bloquea ni falla la petición
 * que la dispara (registro de cliente, creación de producto, etc.) si el
 * frontend está caído o la variable de entorno no está configurada.
 */
export function revalidateWebPath(path: string): void {
  const secret = process.env.REVALIDATE_SECRET;
  const webUrl = process.env.FRONTEND_URL;
  if (!secret || !webUrl) return;

  fetch(`${webUrl}/api/revalidate?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(path)}`, {
    method: 'POST',
  }).catch(() => {
    // Silencioso: la página igual se refresca sola al vencer su revalidate normal.
  });
}
