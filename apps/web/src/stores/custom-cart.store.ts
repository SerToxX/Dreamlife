import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomCartItem {
  tempId: string;      // id local, solo para la lista antes de enviar
  tipo: string;
  descripcion: string;
  referencias?: string;
  imagenUrl?: string;   // vista previa (ej. render 3D de la taza)
  notas?: string;       // detalle interno (ej. JSON del diseño del editor 3D)
  resumen: string;       // texto corto para mostrar en la lista ("Camiseta — negro, talla M")
}

interface CustomCartState {
  items: CustomCartItem[];
  addItem: (item: Omit<CustomCartItem, 'tempId'>) => void;
  removeItem: (tempId: string) => void;
  clear: () => void;
}

export const useCustomCartStore = create<CustomCartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, { ...item, tempId: crypto.randomUUID() }] })),
      removeItem: (tempId) => set((s) => ({ items: s.items.filter((i) => i.tempId !== tempId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'dreamlife-custom-cart' },
  ),
);
