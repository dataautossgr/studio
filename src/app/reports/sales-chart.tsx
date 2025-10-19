'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';

const data = [
  { day: 'Mon', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Tue', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Wed', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Thu', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Fri', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Sat', sales: Math.floor(Math.random() * 5000) + 1000 },
  { day: 'Sun', sales: Math.floor(Math.random() * 5000) + 1000 },
];

export function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Rs. ${Number(value) / 1000}k`}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent
            formatter={(value) => `Rs. ${Number(value).toLocaleString()}`,
            indicator: "dot"
             />}
        />
        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
