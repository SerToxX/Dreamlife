/**
 * Parseo de filtros de fecha para queries (?from=&to=).
 *
 * Bug que resuelve: cuando el front envía solo la fecha ("2026-08-06", sin hora),
 * `new Date("2026-08-06")` se interpreta como medianoche UTC. Para un negocio en
 * Perú (UTC-5), eso equivale a las 7:00 p.m. del día anterior — así que un filtro
 * "hasta hoy" terminaba excluyendo casi todo el día de hoy (ventas/gastos
 * registrados en la tarde/noche quedaban fuera del rango). Esto hacía que
 * Finanzas y Reportes mostraran números distintos, o incluso 0, según qué tanto
 * de "hoy" quedaba dentro o fuera del corte.
 *
 * Junto con la variable de entorno TZ=America/Lima en docker-compose, estas
 * funciones aseguran que "hasta el 2026-08-06" cubra el día completo en hora
 * local, y que "desde el 2026-08-06" arranque en la medianoche local real.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseFromDate(value?: string): Date | undefined {
  if (!value) return undefined;
  return DATE_ONLY.test(value) ? new Date(`${value}T00:00:00.000`) : new Date(value);
}

export function parseToDate(value?: string): Date | undefined {
  if (!value) return undefined;
  return DATE_ONLY.test(value) ? new Date(`${value}T23:59:59.999`) : new Date(value);
}
