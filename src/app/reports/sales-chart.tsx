'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useState } from 'react';

const data = [
  { month: 'Jan', sales: Math.floor(Math.random() * 20000) + 10000 },
  { month: 'Feb', sales: Math.floor(Math.random() * 20000) + 10000 },
  { month: 'Mar', sales: Math.floor(Math.random() * 20000) + 10000 },
  { month: 'Apr', sales: Math.floor(Math.random() * 20000) + 10000 },
  { month: 'May', sales: Math.floor(Math.random() * 20000) + 10000 },
  { month: 'Jun', sales: Math.floor(Math.random() * 20000) + 10000 },
];


export function SalesChart() {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // This ensures the random data is generated only on the client-side
    // to avoid hydration mismatches.
    setChartData([
        { month: 'Jan', sales: Math.floor(Math.random() * 20000) + 10000 },
        { month: 'Feb', sales: Math.floor(Math.random() * 20000) + 10000 },
        { month: 'Mar', sales: Math.floor(Math.random() * 20000) + 10000 },
        { month: 'Apr', sales: Math.floor(Math.random() * 20000) + 10000 },
        { month: 'May', sales: Math.floor(Math.random() * 20000) + 10000 },
        { month: 'Jun', sales: Math.floor(Math.random() * 20000) + 10000 },
    ]);
  }, []);

  if (chartData.length === 0) {
    return <div style={{ height: 350 }} />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="month"
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
            formatter={(value) => `Rs. ${Number(value).toLocaleString()}`}
            indicator="dot"
             />}
        />
        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
