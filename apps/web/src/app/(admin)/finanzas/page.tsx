'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, TrendingDown, Wallet, Search, X, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

type Tab = 'ingresos' | 'egresos' | 'resumen';

const PIE_COLORS = ['#dc2626', '#f97316', '#eab308', '#0891b2', '#7c3aed', '#db2777', '#16a34a', '#64748b'];

export default function FinanzasPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('resumen');

  // ── Filtros globales (aplican a las 3 vistas) ──
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = { from: from || undefined, to: to || undefined };

  const { data: resumen } = useQuery({
    queryKey: ['fin-resumen', from, to],
    queryFn: () => api.get('/finance/summary', { params }).then((r) => r.data),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <AdminPageHeader icon={<Wallet className="w-5 h-5" />} title="Finanzas" subtitle="Ingresos, egresos y resumen del negocio" gradient="green" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-md px-2 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-xs outline-none w-[110px]" />
            <span className="text-muted-foreground text-xs">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-xs outline-none w-[110px]" />
          </div>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Selector de 3 secciones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <TabCard
          active={tab === 'ingresos'}
          onClick={() => setTab('ingresos')}
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ingresos"
          value={formatPrice(resumen?.ingresos ?? 0)}
          colorClass="text-green-600 dark:text-green-400"
        />
        <TabCard
          active={tab === 'egresos'}
          onClick={() => setTab('egresos')}
          icon={<TrendingDown className="w-5 h-5" />}
          label="Egresos"
          value={formatPrice(resumen?.gastos ?? 0)}
          colorClass="text-accent"
        />
        <TabCard
          active={tab === 'resumen'}
          onClick={() => setTab('resumen')}
          icon={<Wallet className="w-5 h-5" />}
          label="Resumen"
          value={formatPrice(resumen?.gananciaNeta ?? 0)}
          colorClass="text-foreground"
        />
      </div>

      {tab === 'ingresos' && <IngresosView from={from} to={to} onChanged={() => { qc.invalidateQueries({ queryKey: ['fin-resumen'] }); }} />}
      {tab === 'egresos' && <EgresosView from={from} to={to} onChanged={() => { qc.invalidateQueries({ queryKey: ['fin-resumen'] }); }} />}
      {tab === 'resumen' && <ResumenView resumen={resumen} from={from} to={to} />}
    </div>
  );
}

function TabCard({ active, onClick, icon, label, value, colorClass }: any) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className={`transition-all ${active ? 'border-foreground ring-1 ring-foreground' : 'hover:border-foreground/40'}`}>
        <CardContent className="p-4">
          <div className={`flex items-center gap-2 mb-1 ${colorClass}`}>{icon}<p className="text-sm font-medium text-foreground">{label}</p></div>
          <p className="text-xl sm:text-2xl font-bold">{value}</p>
        </CardContent>
      </Card>
    </button>
  );
}

// ══════════════════════════ INGRESOS ══════════════════════════
function IngresosView({ from, to, onChanged }: { from: string; to: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ descripcion: '', monto: '', categoria: '', fecha: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['fin-ingresos', from, to, search, categoria],
    queryFn: () => api.get('/finance/ingresos', { params: { from: from || undefined, to: to || undefined, search: search || undefined, categoria: categoria || undefined } }).then((r) => r.data),
  });

  const categorias = useMemo(() => {
    const set = new Set<string>((data?.data ?? []).map((i: any) => i.categoria).filter(Boolean));
    return Array.from(set);
  }, [data]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/finance/ingresos', { descripcion: form.descripcion, monto: Number(form.monto), categoria: form.categoria || 'general', fecha: form.fecha || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-ingresos'] });
      onChanged();
      setShowModal(false);
      setForm({ descripcion: '', monto: '', categoria: '', fecha: '' });
      toast({ title: '✅ Ingreso registrado' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por descripción o producto..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-10 bg-input border border-border rounded-md px-3 text-sm sm:w-48" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          <option value="ventas">Ventas</option>
          {categorias.filter((c) => c !== 'ventas').map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus className="w-4 h-4" />Agregar ingreso</Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['Fecha', 'Descripción', 'Producto(s)', 'Categoría', 'Origen', 'Monto'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !data?.data?.length ? <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Sin ingresos registrados en este rango</td></tr>
            : data.data.map((i: any) => (
              <tr key={i.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(i.fecha)}</td>
                <td className="p-3">{i.descripcion || '—'}</td>
                <td className="p-3 text-muted-foreground text-xs">{i.productos?.length ? i.productos.join(', ') : '—'}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{i.categoria}</span></td>
                <td className="p-3 text-muted-foreground text-xs">{i.tipo === 'venta' ? 'Venta' : `Manual${i.usuario ? ' · ' + i.usuario : ''}`}</td>
                <td className="p-3 font-bold text-green-600 dark:text-green-400 whitespace-nowrap">+ {formatPrice(i.monto)}</td>
              </tr>
            ))}
          </tbody>
          {!!data?.data?.length && (
            <tfoot><tr className="border-t border-border bg-secondary/30">
              <td colSpan={5} className="p-3 text-right font-medium text-sm">Total ({data.cantidad})</td>
              <td className="p-3 font-bold text-green-600 dark:text-green-400">{formatPrice(data.total)}</td>
            </tr></tfoot>
          )}
        </table>
      </CardContent></Card>

      {showModal && (
        <Modal title="Registrar ingreso" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Monto (S/.)" type="number" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} />
              <Input placeholder="Categoría" value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha</label>
              <input type="date" className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm mt-1" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
            </div>
          </div>
          <Button onClick={() => mutate()} disabled={isPending || !form.descripcion || !form.monto} className="w-full mt-4">Guardar ingreso</Button>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════ EGRESOS ══════════════════════════
function EgresosView({ from, to, onChanged }: { from: string; to: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ descripcion: '', monto: '', categoria: '', fecha: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['fin-egresos', from, to, search, categoria],
    queryFn: () => api.get('/finance/gastos', { params: { from: from || undefined, to: to || undefined, search: search || undefined, categoria: categoria || undefined } }).then((r) => r.data),
  });

  const categorias = useMemo(() => {
    const set = new Set<string>((data?.data ?? []).map((g: any) => g.categoria).filter(Boolean));
    return Array.from(set);
  }, [data]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/finance/gastos', { descripcion: form.descripcion, monto: Number(form.monto), categoria: form.categoria || 'general', fecha: form.fecha || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-egresos'] });
      onChanged();
      setShowModal(false);
      setForm({ descripcion: '', monto: '', categoria: '', fecha: '' });
      toast({ title: '✅ Egreso registrado' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por descripción..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-10 bg-input border border-border rounded-md px-3 text-sm sm:w-48" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus className="w-4 h-4" />Agregar egreso</Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">{['Fecha', 'Descripción', 'Categoría', 'Registrado por', 'Monto'].map((h) => <th key={h} className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            : !data?.data?.length ? <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Sin egresos registrados en este rango</td></tr>
            : data.data.map((g: any) => (
              <tr key={g.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(g.fecha)}</td>
                <td className="p-3">{g.descripcion || '—'}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{g.categoria ?? 'general'}</span></td>
                <td className="p-3 text-muted-foreground text-xs">{g.usuario?.nombre ?? '—'}</td>
                <td className="p-3 font-bold text-accent whitespace-nowrap">- {formatPrice(g.monto)}</td>
              </tr>
            ))}
          </tbody>
          {!!data?.data?.length && (
            <tfoot><tr className="border-t border-border bg-secondary/30">
              <td colSpan={4} className="p-3 text-right font-medium text-sm">Total ({data.cantidad})</td>
              <td className="p-3 font-bold text-accent">{formatPrice(data.total)}</td>
            </tr></tfoot>
          )}
        </table>
      </CardContent></Card>

      {showModal && (
        <Modal title="Registrar egreso" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Monto (S/.)" type="number" value={form.monto} onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))} />
              <Input placeholder="Categoría" value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha</label>
              <input type="date" className="h-10 w-full bg-input border border-border rounded-md px-3 text-sm mt-1" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
            </div>
          </div>
          <Button onClick={() => mutate()} disabled={isPending || !form.descripcion || !form.monto} className="w-full mt-4">Guardar egreso</Button>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════ RESUMEN ══════════════════════════
const GRANULARIDADES: { id: 'dia' | 'semana' | 'mes' | 'anio'; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
];

function ResumenView({ resumen, from, to }: { resumen: any; from: string; to: string }) {
  const [granularidad, setGranularidad] = useState<'dia' | 'semana' | 'mes' | 'anio'>('mes');

  const { data: serie, isLoading: loadingSerie } = useQuery({
    queryKey: ['fin-serie', granularidad, from, to],
    queryFn: () => api.get('/finance/serie', { params: { granularidad, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });

  if (!resumen) return <p className="text-muted-foreground text-sm">Cargando resumen...</p>;

  const pieData = (resumen.categoriasEgresos ?? []).map((c: any) => ({ name: c.categoria, value: c.monto }));
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Ingresos" value={formatPrice(resumen.ingresos)} colorClass="text-green-600 dark:text-green-400" />
        <Kpi label="Egresos" value={formatPrice(resumen.gastos)} colorClass="text-accent" />
        <Kpi label="Ganancia neta" value={formatPrice(resumen.gananciaNeta)} colorClass="text-foreground" />
        <Kpi label="Ventas registradas" value={String(resumen.cantidadVentas)} colorClass="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <p className="font-medium text-sm">Ingresos vs. Egresos</p>
            <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-md p-0.5">
              {GRANULARIDADES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGranularidad(g.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${granularidad === g.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {loadingSerie ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={40} />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Egresos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <p className="font-medium mb-4 text-sm">Egresos por categoría</p>
          {!pieData.length ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin egresos en este rango</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatPrice(value)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${colorClass}`}>{value}</p>
    </CardContent></Card>
  );
}

// ══════════════════════════ MODAL ══════════════════════════
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
