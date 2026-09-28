/**
 * CORS_ORIGINS admite varios orígenes separados por coma (necesario porque
 * ahora el mismo front-end se sirve en 3 subdominios: dreamlifeperu.com,
 * www.dreamlifeperu.com y admin.dreamlifeperu.com — `origin` de NestJS solo
 * acepta un string literal, no una lista, así que hace falta un callback).
 * Si CORS_ORIGINS no está definida, cae a FRONTEND_URL (que ya existe) para
 * no romper despliegues que aún no actualizaron sus variables de entorno.
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function corsOriginCallback(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}
