'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Users, Package, AlertTriangle, TrendingUp, DollarSign, TrendingDown, Store, Warehouse, LayoutDashboard } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/shared/admin-page-header';
import { formatPrice, cn } from '@/lib/utils';

type Periodo = 'hoy' | 'semana' | 'mes' | 'anio';

const PERIODOS: { id: Periodo; label: string; chartLabel: string }[] = [
  { id: 'hoy', label: 'Hoy', chartLabel: 'últimas 24h' },
  { id: 'semana', label: 'Semana', chartLabel: 'últimos 7 días' },
  { id: 'mes', label: 'Mes', chartLabel: 'últimos 30 días' },
  { id: 'anio', label: 'Año', chartLabel: 'últimos 12 meses' },
];

const PIE_COLORS = ['#dc2626', '#f97316', '#eab308', '#0891b2', '#7c3aed', '#db2777', '#16a34a', '#64748b'];
const CANAL_LABEL: Record<string, string> = { ONLINE: 'Online', TIENDA: 'Tienda', EVENTO: 'Evento' };

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dash-sum', periodo],
    queryFn: () => api.get('/dashboard/summary', { params: { periodo } }).then((r) => r.data),
  });
  const { data: chart, isLoading: loadingChart } = useQuery({
    queryKey: ['dash-chart', periodo],
    queryFn: () => api.get('/dashboard/sales-chart', { params: { periodo } }).then((r) => r.data),
  });
  const { data: top } = useQuery({
    queryKey: ['dash-top', periodo],
    queryFn: () => api.get('/dashboard/top-products', { params: { periodo } }).then((r) => r.data),
  });
  const { data: expCat } = useQuery({
    queryKey: ['dash-exp-cat', periodo],
    queryFn: () => api.get('/dashboard/expenses-by-category', { params: { periodo } }).then((r) => r.data),
  });
  const { data: revChan } = useQuery({
    queryKey: ['dash-rev-chan', periodo],
    queryFn: () => api.get('/dashboard/revenue-by-channel', { params: { periodo } }).then((r) => r.data),
  });
  const { data: stockHealth } = useQuery({
    queryKey: ['dash-stock-health'],
    queryFn: () => api.get('/dashboard/stock-health').then((r) => r.data),
  });

  const periodoActual = PERIODOS.find((p) => p.id === periodo)!;
  const ingresos = summary?.ingresos ?? 0;
  const egresos = summary?.egresos ?? 0;
  const ganancia = summary?.gananciaNeta ?? 0;
  const margenPct = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;

  const kpis = [
    { label: 'Ingresos', value: formatPrice(ingresos), sub: `${summary?.ventasPeriodo?.cantidad ?? 0} ventas`, icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
    { label: 'Egresos', value: formatPrice(egresos), sub: `del período`, icon: TrendingDown, color: 'text-accent' },
    { label: 'Ganancia neta', value: formatPrice(ganancia), sub: `${margenPct.toFixed(1)}% margen`, icon: DollarSign, color: ganancia >= 0 ? '' : 'text-accent' },
    { label: 'Pedidos pendientes', value: summary?.pedidosPendientes ?? 0, sub: 'por procesar', icon: ShoppingBag },
    { label: 'Clientes', value: summary?.totalClientes ?? 0, sub: 'activos', icon: Users },
    { label: 'Alertas stock', value: summary?.alertasStock ?? 0, sub: 'bajo mínimo', icon: AlertTriangle, color: (summary?.alertasStock ?? 0) > 0 ? 'text-accent' : '' },
  ];

  const canalData = (revChan ?? []).map((r: any) => ({ name: CANAL_LABEL[r.canal] ?? r.canal, value: r.monto }));
  const expCatData = (expCat ?? []).map((c: any) => ({ name: c.categoria, value: c.monto }));
  const stockData = stockHealth ? [
    { name: 'Saludable', value: stockHealth.ok, color: '#16a34a' },
    { name: 'Stock bajo', value: stockHealth.bajo, color: '#eab308' },
    { name: 'Agotado', value: stockHealth.agotado, color: '#dc2626' },
  ].filter((d) => d.value > 0) : [];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <AdminPageHeader icon={<LayoutDashboard className="w-5 h-5" />} title="Dashboard" subtitle={`Resumen del negocio · ${periodoActual.chartLabel}`} gradient="brand" />
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-2">
            <Store className="w-4 h-4" />Ir a la tienda
          </Button>
        </Link>
      </div>

      {/* Tabs período */}
      <div className="inline-flex border border-border rounded-lg p-0.5 mb-5 bg-card">
        {PERIODOS.map((p) => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} className={cn(
            'px-3 sm:px-4 py-1.5 text-sm rounded-md transition-colors',
            periodo === p.id ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
          )}>{p.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <Icon className={cn('w-4 h-4 flex-shrink-0', color || 'text-muted-foreground')} />
            </div>
            <p className={cn('text-lg sm:text-xl font-bold', color)}>{isLoading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Gráfica ingresos vs egresos */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ingresos vs Egresos — {periodoActual.chartLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loadingChart ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" interval={chart?.length > 15 ? Math.ceil(chart.length / 10) : 0} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={48} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--secondary))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="egresos" name="Egresos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown row */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Productos más vendidos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5">
              {!top?.length ? <p className="text-muted-foreground text-sm text-center py-4">Sin datos en este período</p>
              : top.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-secondary text-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center text-sm">
                    {p.item?.imagenes?.[0]?.url ? <img src={p.item.imagenes[0].url} className="w-full h-full object-cover" /> : '🎌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.item?.producto?.nombre ?? 'Producto'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.item?.codigoSku}</p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0">{p.totalVendido} uds.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Warehouse className="w-4 h-4" />Salud de inventario</CardTitle></CardHeader>
          <CardContent>
            {!stockData.length ? <p className="text-muted-foreground text-sm text-center py-4">Sin stock registrado</p> : (
              <div className="h-52 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stockData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {stockData.map((d, idx) => <Cell key={idx} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} items`} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ingresos por canal</CardTitle></CardHeader>
          <CardContent>
            {!canalData.length ? <p className="text-muted-foreground text-sm text-center py-4">Sin datos</p> : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={canalData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {canalData.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPrice(value)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Egresos por categoría</CardTitle></CardHeader>
          <CardContent>
            {!expCatData.length ? <p className="text-muted-foreground text-sm text-center py-4">Sin gastos en período</p> : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expCatData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {expCatData.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPrice(value)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
