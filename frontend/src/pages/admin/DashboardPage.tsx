import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/api/client';
import type { Dashboard, TicketStatus } from '@/api/types';
import { PageHeader } from '@/layout/AppShell';
import { formatShortDate } from '@/lib/format';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/labels';
import { Card, EmptyState, ErrorState, LoadingState } from '@/ui';

const STATUS_COLORS: Record<TicketStatus, string> = {
  NEW: '#0284c7',
  ASSIGNED: '#4f46e5',
  IN_PROGRESS: '#d97706',
  WAITING_USER: '#9333ea',
  RESOLVED: '#059669',
  CLOSED: '#68738c',
};
const ON_TIME = '#059669';
const BREACHED = '#dc2626';
const NEUTRAL = '#245ad6';
const AXIS = { fontSize: 12, fill: '#535c73' };

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0 p-5">
      <h2 className="mb-4 font-semibold text-ink-900">{title}</h2>
      <div className="h-64">{children}</div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? 'text-ink-900'}`}>
        {value}
      </p>
    </Card>
  );
}

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/dashboard'),
  });

  if (dashboard.isPending) return <LoadingState />;
  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  const { totals, byStatus, sla, agentLoad, createdByDay } = dashboard.data;
  if (totals.all === 0) return <EmptyState title="Данных для графиков пока нет" />;

  const statusData = byStatus.map((row) => ({ ...row, label: STATUS_LABELS[row.status] }));
  const slaData = sla.byPriority.map((row) => ({
    ...row,
    label: PRIORITY_LABELS[row.priority],
  }));
  const loadData = agentLoad.map((row) => ({ ...row, label: row.agent.fullName.split(' ')[0] }));
  const dayData = createdByDay.map((row) => ({ ...row, label: formatShortDate(row.date) }));

  return (
    <>
      <PageHeader title="Дашборд" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Всего заявок" value={totals.all} />
        <Stat label="Открыто" value={totals.open} />
        <Stat label="Просрочено" value={totals.overdue} tone="text-red-700" />
        <Stat label="Создано сегодня" value={totals.createdToday} />
        <Stat label="Соблюдение SLA" value={`${sla.compliancePercent}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Заявки по статусам">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="#eceef2" />
              <XAxis
                dataKey="label"
                tick={AXIS}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={55}
              />
              <YAxis tick={AXIS} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Заявок" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {statusData.map((row) => (
                  <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Просрочки SLA по приоритетам">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slaData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="#eceef2" />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="onTime"
                name="В срок"
                stackId="sla"
                fill={ON_TIME}
                isAnimationActive={false}
              />
              <Bar
                dataKey="breached"
                name="Просрочено"
                stackId="sla"
                fill={BREACHED}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Нагрузка на исполнителей">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="#eceef2" />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="open" name="В работе" fill={NEUTRAL} isAnimationActive={false} />
              <Bar dataKey="overdue" name="Просрочено" fill={BREACHED} isAnimationActive={false} />
              <Bar dataKey="resolved" name="Решено" fill={ON_TIME} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Новые заявки за 14 дней">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dayData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="#eceef2" />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="Заявок"
                stroke={NEUTRAL}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}
