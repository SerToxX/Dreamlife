'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import * as THREE from 'three';
import { RotateCw, Download, Image as ImageIcon, Type } from 'lucide-react';
import { MugScene } from './mug-scene';

const DESIGN_W = 900;
const DESIGN_H = 480;

function descargar(dataUrl: string, nombre: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface ElementoDetectado {
  tipo: 'imagen' | 'texto';
  src?: string; // solo imágenes
  texto?: string; // solo texto/emoji
}

/**
 * Reconstruye la taza en 3D (rotable, igual que en el editor) a partir del
 * JSON del diseño guardado — usado en los detalles de pedido del admin y del
 * cliente, para poder ver la taza real en vez de solo una foto plana.
 *
 * `forAdmin`: además muestra botones para descargar exactamente las imágenes
 * que el cliente subió (archivo original, no la vista renderizada) y el
 * diseño plano completo — pensado solo para el panel de administración.
 */
export function MugViewer({ disenoJson, forAdmin = false }: { disenoJson: any; forAdmin?: boolean }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [elementos, setElementos] = useState<ElementoDetectado[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasElRef.current || !disenoJson) return;

    const canvas = new FabricCanvas(canvasElRef.current, {
      width: DESIGN_W, height: DESIGN_H, backgroundColor: '#ffffff',
    });
    fabricRef.current = canvas;

    canvas.loadFromJSON(disenoJson)
      .then(() => {
        canvas.renderAll();
        const tex = new THREE.CanvasTexture(canvas.getElement());
        tex.colorSpace = THREE.SRGBColorSpace;
        canvas.on('after:render', () => { tex.needsUpdate = true; });
        setTexture(tex);

        // Extrae cada elemento tal cual lo dejó el cliente: imágenes (archivo
        // original en base64) y textos/emojis (el carácter/texto exacto).
        const detectados: ElementoDetectado[] = canvas.getObjects().map((obj: any) => {
          if (obj.type === 'image') {
            const src = typeof obj.getSrc === 'function' ? obj.getSrc() : obj._element?.src ?? obj.src;
            return { tipo: 'imagen' as const, src };
          }
          return { tipo: 'texto' as const, texto: obj.text ?? '' };
        });
        setElementos(detectados);
      })
      .catch(() => setError(true));

    return () => { canvas.dispose(); };
  }, [disenoJson]);

  if (error) return <p className="text-xs text-muted-foreground text-center py-8">No se pudo cargar el diseño 3D de este pedido</p>;

  const imagenes = elementos.filter((e) => e.tipo === 'imagen' && e.src);
  const textos = elementos.filter((e) => e.tipo === 'texto' && e.texto?.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[260px] sm:h-[320px] rounded-md overflow-hidden bg-gradient-to-b from-secondary/40 to-secondary/10">
        <MugScene texture={texture} />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full border border-border pointer-events-none">
          <RotateCw className="w-3 h-3" />Arrastra para girar
        </div>
        {/* Canvas 2D oculto: solo se usa para generar la textura, nunca se muestra */}
        <canvas ref={canvasElRef} className="hidden" />
      </div>

      {forAdmin && (imagenes.length > 0 || textos.length > 0) && (
        <div className="p-3 rounded-md border border-border flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Elementos exactos que usó el cliente</p>

          {imagenes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {imagenes.map((img, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded border border-border/60">
                  <img src={img.src} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 bg-secondary" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-1"><ImageIcon className="w-3 h-3" />Imagen {i + 1}</span>
                  <button
                    onClick={() => descargar(img.src!, `taza-imagen-${i + 1}.png`)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-secondary flex-shrink-0"
                  >
                    <Download className="w-3 h-3" />Descargar
                  </button>
                </div>
              ))}
            </div>
          )}

          {textos.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs">
              <Type className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-muted-foreground">Texto/stickers: <span className="text-foreground font-medium">{textos.map((t) => t.texto).join('  ')}</span></p>
            </div>
          )}

          <button
            onClick={() => fabricRef.current && descargar(fabricRef.current.toDataURL({ format: 'png', multiplier: 2 }), 'taza-diseno-completo.png')}
            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary mt-1"
          >
            <Download className="w-3.5 h-3.5" />Descargar diseño plano completo (para imprenta)
          </button>
        </div>
      )}
    </div>
  );
}
