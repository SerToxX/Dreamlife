import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;        // id del ProductoItem
  sku: string;
  nombre: string;
  precio: number;
  imagen?: string;
  variante?: string;
  diseno?: string;
  qty: number;
  stock: number;      // stock disponible al momento de agregar/actualizar
}

interface CartState {
  items: CartItem[];
  carritoId: number | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clear: () => void;
  setCarritoId: (id: number) => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      carritoId: null,

      addItem: (item) =>
        set((s) => ({
          items: s.items.find((i) => i.id === item.id)
            ? s.items.map((i) =>
                i.id === item.id
                  ? { ...i, stock: item.stock, qty: Math.min(i.qty + item.qty, item.stock) }
                  : i,
              )
            : [...s.items, { ...item, qty: Math.min(item.qty, item.stock) }],
        })),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.id !== id)
            : s.items.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, i.stock ?? Infinity) } : i)),
        })),

      clear: () => set({ items: [], carritoId: null }),

      setCarritoId: (id) => set({ carritoId: id }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.precio * i.qty, 0),

      count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    { name: 'dreamlife-cart' },
  ),
);
