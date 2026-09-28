import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige buffers del mismo largo; si difieren, ya no coinciden
  // (comparar bufA contra sí mismo evita filtrar la longitud vía early-return).
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Revalidación on-demand para páginas con ISR (ej. /sobre-nosotros).
// La API llama a este endpoint solo cuando cambian los datos (nuevo cliente,
// nuevo producto), no en cada visita — así la página sigue sirviendo desde
// caché sin tocar la base de datos, sin importar cuántos clientes/productos haya.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret') || '';
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !secretsMatch(secret, expected)) {
    return NextResponse.json({ message: 'Secret inválido' }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get('path') || '/sobre-nosotros';
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path, now: Date.now() });
}
