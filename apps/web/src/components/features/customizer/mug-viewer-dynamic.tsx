'use client';
import dynamic from 'next/dynamic';

// Fabric.js + Three.js necesitan canvas/WebGL del navegador — nunca en el servidor.
export const MugViewerDynamic = dynamic(
  () => import('./mug-viewer').then((m) => m.MugViewer),
  { ssr: false, loading: () => <div className="h-[260px] sm:h-[320px] rounded-md bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">Cargando taza 3D...</div> },
);
