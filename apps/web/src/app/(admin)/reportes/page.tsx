'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, MapPin, Calendar, ShoppingBag } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/shared/admin-page-header';

const PIE_COLORS = ['#dc2626', '#f97316', '#eab308', '#0891b2', '#7c3aed', '#db2777', '#16a34a', '#64748b'];
const GRANULARIDADES: { id: 'dia' | 'semana' | 'mes' | 'anio'; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
];

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

export default function ReportesPage() {
  // Mismo patrón de filtro de fechas que Finanzas: rango global opcional + granularidad para el gráfico principal
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [granularidad, setGranularidad] = useState<'dia' | 'semana' | 'mes' | 'anio'>('mes');

  const params = { from: from || undefined, to: to || undefined };

  const { data: resumen } = useQuery({ queryKey: ['rep-resumen', from, to], queryFn: () => api.get('/finance/summary', { params }).then((r) => r.data) });
  const { data: serie, isLoading: loadingSerie } = useQuery({
    queryKey: ['rep-serie', granularidad, from, to],
    queryFn: () => api.get('/finance/serie', { params: { ...params, granularidad } }).then((r) => r.data),
  });
  const { data: byLoc } = useQuery({ queryKey: ['rep-loc', from, to], queryFn: () => api.get('/reports/by-location', { params }).then((r) => r.data) });
  const { data: byChannel } = useQuery({ queryKey: ['rep-canal', from, to], queryFn: () => api.get('/reports/by-channel', { params }).then((r) => r.data) });
  const { data: top } = useQuery({ queryKey: ['rep-top', from, to], queryFn: () => api.get('/reports/top-products', { params }).then((r) => r.data) });

  const ingresos = resumen?.ingresos ?? 0;
  const egresos = resumen?.gastos ?? 0;
  const ganancia = resumen?.gananciaNeta ?? 0;
  const margenPct = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <AdminPageHeader icon={<BarChart2 className="w-5 h-5" />} title="Reportes" subtitle="Análisis financiero del negocio" gradient="blue" />
        {/* Mismo filtro de fechas que la pantalla de Finanzas */}
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

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card><CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /><p className="text-xs sm:text-sm text-muted-foreground">Ingresos</p></div>
          <p className="text-xl sm:text-3xl font-bold">{formatPrice(ingresos)}</p>
          <p className="text-xs text-muted-foreground mt-1">{resumen?.cantidadVentas ?? 0} ventas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-accent" /><p className="text-xs sm:text-sm text-muted-foreground">Egresos</p></div>
          <p className="text-xl sm:text-3xl font-bold">{formatPrice(egresos)}</p>
          <p className="text-xs text-muted-foreground mt-1">{resumen?.cantidadGastos ?? 0} gastos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4" /><p className="text-xs sm:text-sm text-muted-foreground">Ganancia neta</p></div>
          <p className={cn('text-xl sm:text-3xl font-bold', ganancia < 0 && 'text-accent')}>{formatPrice(ganancia)}</p>
          <p className="text-xs text-muted-foreground mt-1">{margenPct.toFixed(1)}% margen</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4" /><p className="text-xs sm:text-sm text-muted-foreground">Ticket promedio</p></div>
          <p className="text-xl sm:text-3xl font-bold">{formatPrice(resumen?.cantidadVentas ? ingresos / resumen.cantidadVentas : 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">por venta</p>
        </CardContent></Card>
      </div>

      {/* Gráfica financiera con granularidad (idéntico a Finanzas) */}
      <Card className="mb-4">
        <CardContent className="p-5">
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
          <div className="h-72">
            {loadingSerie ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={48} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
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
        </CardContent>
      </Card>

      {/* Donas: egresos por categoría + ventas por canal */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card><CardContent className="p-5">
          <p className="font-medium mb-4 text-sm">Egresos por categoría</p>
          <DonutChart data={(resumen?.categoriasEgresos ?? []).map((c: any) => ({ name: c.categoria, value: c.monto }))} />
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <p className="font-medium mb-4 text-sm">Ventas por canal</p>
          <DonutChart data={(byChannel ?? []).map((c: any) => ({ name: c.nombre, value: c.total }))} />
        </CardContent></Card>
      </div>

      {/* Barras horizontales: ubicación + top productos */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" />Ventas por ubicación</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBarChart data={(byLoc ?? []).map((l: any) => ({ name: l.nombre ?? 'Sin asignar', value: l.total }))} color="hsl(var(--primary))" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="w-4 h-4" />Top productos (unidades vendidas)</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBarChart data={(top ?? []).slice(0, 8).map((p: any) => ({ name: p.item?.producto?.nombre ?? 'Producto', value: p.unidades ?? 0 }))} color="#0891b2" isUnits />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin datos en este rango</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {filtered.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number) => formatPrice(value)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChart({ data, color, isUnits }: { data: { name: string; value: number }[]; color: string; isUnits?: boolean }) {
  if (!data.length || data.every((d) => d.value === 0)) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin datos en este rango</div>;
  const height = Math.max(64, data.length * 34);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" tickFormatter={(v) => (isUnits ? v : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={110} tickFormatter={(v) => (v.length > 16 ? v.slice(0, 16) + '…' : v)} />
          <Tooltip
            formatter={(value: number) => (isUnits ? `${value} unidades` : formatPrice(value))}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            cursor={{ fill: 'hsl(var(--secondary))' }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
