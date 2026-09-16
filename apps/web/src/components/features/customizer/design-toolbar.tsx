'use client';
import { useRef } from 'react';
import { Type, Image as ImageIcon, Trash2, Smile, Palette, ImagePlus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const FONTS = [
  { id: 'Poppins', label: 'Redonda' },
  { id: 'Pacifico', label: 'Cursiva' },
  { id: 'Bebas Neue', label: 'Bold' },
  { id: 'Caveat', label: 'Manuscrita' },
];

const COLORS = ['#111111', '#ffffff', '#dc2626', '#7c3aed', '#0891b2', '#16a34a', '#eab308', '#db2777'];
const BG_COLORS = ['#ffffff', '#111111', '#fef3c7', '#fee2e2', '#dbeafe', '#dcfce7', '#f3e8ff', '#fce7f3'];

const STICKERS = ['⭐', '💖', '✨', '🔥', '🎌', '🌸', '💫', '🐉', '⚡', '🎀'];

interface DesignToolbarProps {
  onAddText: () => void;
  onAddSticker: (emoji: string) => void;
  onAddImage: (file: File) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onFontChange: (font: string) => void;
  onBgColorChange: (color: string) => void;
  onBgImage: (file: File) => void;
  onBgReset: () => void;
  currentColor: string;
  currentFont: string;
  currentBgColor: string;
  hasSelection: boolean;
}

export function DesignToolbar({
  onAddText, onAddSticker, onAddImage, onDelete,
  onColorChange, onFontChange, onBgColorChange, onBgImage, onBgReset,
  currentColor, currentFont, currentBgColor, hasSelection,
}: DesignToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" />Fondo (envuelve toda la taza)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onBgColorChange(c)}
              className={cn('w-7 h-7 rounded-full border-2 transition-transform', currentBgColor === c ? 'border-accent scale-110' : 'border-border')}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => bgFileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-md border border-border hover:border-foreground/50 hover:bg-secondary transition-colors text-xs">
            <ImagePlus className="w-3.5 h-3.5" />Imagen de fondo
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onBgImage(file);
                e.target.value = '';
              }}
            />
          </button>
          <button onClick={onBgReset} className="flex items-center justify-center gap-1.5 p-2 rounded-md border border-border hover:border-foreground/50 hover:bg-secondary transition-colors text-xs px-3">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={onAddText} className="flex flex-col items-center gap-1 p-3 rounded-md border border-border hover:border-foreground/50 hover:bg-secondary transition-colors">
          <Type className="w-5 h-5" />
          <span className="text-xs">Texto</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-3 rounded-md border border-border hover:border-foreground/50 hover:bg-secondary transition-colors">
          <ImageIcon className="w-5 h-5" />
          <span className="text-xs">Imagen</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddImage(file);
              e.target.value = '';
            }}
          />
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className="flex flex-col items-center gap-1 p-3 rounded-md border border-border hover:border-accent hover:bg-accent/10 hover:text-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">Eliminar</span>
        </button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Smile className="w-3.5 h-3.5" />Stickers</p>
        <div className="grid grid-cols-5 gap-1.5">
          {STICKERS.map((s) => (
            <button key={s} onClick={() => onAddSticker(s)} className="text-xl p-2 rounded-md border border-border hover:border-foreground/50 hover:bg-secondary transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Color de texto</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={cn('w-7 h-7 rounded-full border-2 transition-transform', currentColor === c ? 'border-accent scale-110' : 'border-border')}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Fuente (para texto seleccionado)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFontChange(f.id)}
              className={cn(
                'px-2 py-2 rounded-md border text-sm transition-colors',
                currentFont === f.id ? 'border-foreground bg-secondary' : 'border-border hover:border-foreground/50'
              )}
              style={{ fontFamily: f.id }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
