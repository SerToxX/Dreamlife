'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, IText, FabricText, FabricImage, Rect } from 'fabric';
import * as THREE from 'three';
import { RotateCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { formatPrice } from '@/lib/utils';
import { useCustomCartStore } from '@/stores/custom-cart.store';
import { MugScene } from './mug-scene';
import type { RootState } from '@react-three/fiber';
import { DesignToolbar } from './design-toolbar';

const DESIGN_W = 900;
const DESIGN_H = 480;
const PRECIO_BASE = 35;
const PRECIO_POR_ELEMENTO = 3;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MugCustomizer() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const threeStateRef = useRef<RootState | null>(null);

  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [elementCount, setElementCount] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);
  const [color, setColor] = useState('#111111');
  const [font, setFont] = useState('Poppins');
  const [bgColor, setBgColor] = useState('#ffffff');

  // ── Configura el canvas de Fabric.js y el puente hacia la textura 3D ──
  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new FabricCanvas(canvasElRef.current, {
      width: DESIGN_W,
      height: DESIGN_H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Marcas de costura a los dos bordes (no interactivas, no se exportan):
    // el diseño envuelve toda la taza, así que el borde izquierdo y el
    // derecho de este canvas se unen justo detrás del asa.
    const seamStyle = { top: 0, width: 2, height: DESIGN_H, fill: '#d4d4d4', opacity: 0.7, selectable: false, evented: false, excludeFromExport: true };
    canvas.add(new Rect({ left: 0, ...seamStyle }));
    canvas.add(new Rect({ left: DESIGN_W - 2, ...seamStyle }));

    const tex = new THREE.CanvasTexture(canvas.getElement());
    tex.colorSpace = THREE.SRGBColorSpace;
    setTexture(tex);

    const markDirty = () => { tex.needsUpdate = true; };
    const syncSelection = () => setHasSelection(!!canvas.getActiveObject());
    const syncCount = () => setElementCount(canvas.getObjects().filter((o) => !o.excludeFromExport).length);

    canvas.on('after:render', markDirty);
    canvas.on('object:added', syncCount);
    canvas.on('object:removed', syncCount);
    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', syncSelection);

    canvas.renderAll();

    return () => {
      canvas.dispose();
      tex.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Borrar con la tecla Delete/Backspace (evitando interferir mientras se escribe texto) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject() as any;
      if (!active || active.isEditing) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new IText('Tu texto', {
      left: DESIGN_W / 2 - 90, top: DESIGN_H / 2 - 30,
      fontFamily: font, fontSize: 52, fill: color,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [font, color]);

  const addSticker = useCallback((emoji: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const sticker = new FabricText(emoji, {
      left: DESIGN_W / 2 - 40, top: DESIGN_H / 2 - 40, fontSize: 90,
    });
    canvas.add(sticker);
    canvas.setActiveObject(sticker);
    canvas.renderAll();
  }, []);

  const addImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
      const maxDim = 220;
      const w = img.width || maxDim;
      const h = img.height || maxDim;
      const scale = Math.min(maxDim / w, maxDim / h);
      img.set({
        left: DESIGN_W / 2 - (w * scale) / 2,
        top: DESIGN_H / 2 - (h * scale) / 2,
        scaleX: scale, scaleY: scale,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    } catch {
      toast({ title: 'No se pudo cargar la imagen', variant: 'destructive' });
    }
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (!active.length) return;
    canvas.discardActiveObject();
    canvas.remove(...active);
    canvas.renderAll();
  }, []);

  const handleColorChange = useCallback((c: string) => {
    setColor(c);
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject() as any;
    if (active) {
      active.set('fill', c);
      canvas!.renderAll();
    }
  }, []);

  const handleFontChange = useCallback((f: string) => {
    setFont(f);
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject() as any;
    if (active && (active.type === 'i-text' || active.type === 'text' || active.type === 'textbox')) {
      active.set('fontFamily', f);
      canvas!.renderAll();
    }
  }, []);

  const handleBgColorChange = useCallback((c: string) => {
    setBgColor(c);
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = c;
    canvas.renderAll();
  }, []);

  // La imagen de fondo se estira para cubrir todo el canvas — como ese
  // canvas envuelve los 360° de la taza, la imagen "se acopla" alrededor
  // de todo el cuerpo, no solo un parche.
  const handleBgImage = useCallback(async (file: File) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
      img.set({
        scaleX: DESIGN_W / (img.width || DESIGN_W),
        scaleY: DESIGN_H / (img.height || DESIGN_H),
        originX: 'left', originY: 'top', left: 0, top: 0,
      });
      canvas.backgroundImage = img;
      canvas.renderAll();
    } catch {
      toast({ title: 'No se pudo cargar la imagen de fondo', variant: 'destructive' });
    }
  }, []);

  const handleBgReset = useCallback(() => {
    setBgColor('#ffffff');
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
  }, []);

  const precioEstimado = PRECIO_BASE + elementCount * PRECIO_POR_ELEMENTO;
  const addToCustomCart = useCustomCartStore((s) => s.addItem);

  const agregarAlCarrito = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) { toast({ title: 'El editor no está listo', variant: 'destructive' }); return; }

    // Vista previa: se renderiza SIEMPRE desde un ángulo fijo de 3/4 (no la
    // vista libre del usuario, que a veces queda muy de frente/pegada al
    // diseño y termina pareciendo una foto plana en vez de una taza).
    // Se envuelve en try/catch porque si el usuario cargó una imagen, en
    // algunos navegadores el canvas queda "contaminado" (tainted) y
    // toDataURL() lanza una excepción — sin este try/catch, eso bloqueaba
    // por completo el botón de agregar, sin avisar qué pasó.
    let preview3d: string | undefined;
    const three = threeStateRef.current;
    if (three) {
      try {
        const aspect = three.size.width / three.size.height;
        const camSnapshot = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
        camSnapshot.position.set(2.0, 0.9, 1.7);
        camSnapshot.lookAt(0, 0, 0);
        three.gl.render(three.scene, camSnapshot);
        preview3d = three.gl.domElement.toDataURL('image/jpeg', 0.85);
        // Se restaura la cámara real para que la vista del usuario no salte.
        three.gl.render(three.scene, three.camera);
      } catch {
        toast({ title: 'No se pudo generar la vista previa 3D', description: 'Tu pedido se envía igual, sin imagen de referencia', variant: 'destructive' });
      }
    }

    const disenoJson = canvas.toJSON();
    const descripcion = `Taza personalizada — ${elementCount} elemento(s) de diseño. Precio estimado: ${formatPrice(precioEstimado)}`;
    addToCustomCart({
      tipo: 'Taza',
      descripcion,
      imagenUrl: preview3d,
      notas: JSON.stringify({ producto: 'Taza', elementCount, precioEstimado, disenoJson }),
      resumen: `Taza — ${elementCount} elemento(s), est. ${formatPrice(precioEstimado)}`,
    });
    toast({ title: '✅ Taza agregada a tu lista', description: 'Puedes seguir agregando más productos personalizados' });
  }, [elementCount, precioEstimado, addToCustomCart]);

  return (
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
      {/* Vista 3D */}
      <Card className="overflow-hidden">
        <div className="h-[360px] sm:h-[440px] bg-gradient-to-b from-secondary/40 to-secondary/10 relative">
          <MugScene texture={texture} onReady={(state) => { threeStateRef.current = state; }} />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border">
            <RotateCw className="w-3 h-3" />Arrastra para girar · Scroll para zoom
          </div>
        </div>
        <CardContent className="p-4 border-t border-border">
          <canvas ref={canvasElRef} className="w-full h-auto border border-border rounded-md" style={{ maxWidth: '100%' }} />
          <p className="text-xs text-muted-foreground mt-2 text-center">Área de diseño — envuelve los 360° de la taza, se refleja en vivo</p>
        </CardContent>
      </Card>

      {/* Toolbar + precio + enviar */}
      <div className="flex flex-col gap-4">
        <Card><CardContent className="p-5">
          <DesignToolbar
            onAddText={addText}
            onAddSticker={addSticker}
            onAddImage={addImage}
            onDelete={deleteSelected}
            onColorChange={handleColorChange}
            onFontChange={handleFontChange}
            onBgColorChange={handleBgColorChange}
            onBgImage={handleBgImage}
            onBgReset={handleBgReset}
            currentColor={color}
            currentFont={font}
            currentBgColor={bgColor}
            hasSelection={hasSelection}
          />
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Precio base</span>
            <span className="text-sm">{formatPrice(PRECIO_BASE)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{elementCount} elemento(s) × {formatPrice(PRECIO_POR_ELEMENTO)}</span>
            <span className="text-sm">{formatPrice(elementCount * PRECIO_POR_ELEMENTO)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border mb-4">
            <span className="font-bold">Estimado</span>
            <span className="font-bold text-xl text-gradient-brand">{formatPrice(precioEstimado)}</span>
          </div>
          <Button variant="gradient" className="w-full gap-2 h-12 text-base" onClick={agregarAlCarrito}>
            <Plus className="w-4 h-4" />Agregar a mi lista
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">El precio es estimado. Te confirmamos el total exacto por este medio. Puedes agregar más productos antes de enviar tu pedido.</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
