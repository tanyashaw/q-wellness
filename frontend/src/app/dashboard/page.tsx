"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTiles, useDashboard } from "@/components/KpiTiles";

export default function DashboardPage() {
  const data = useDashboard();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">Dashboard</h1>
        <p className="text-sm text-slate-500">All numbers come from the database. Revenue uses sample pricing.</p>
      </div>
      <KpiTiles data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Calls handled by AI (last 14 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eee4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="calls" name="Business hours" stackId="a" fill="#2a9d8f" />
                  <Bar dataKey="afterHours" name="After hours (would be missed)" stackId="a" fill="#e9a23b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bookings made by AI (last 14 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eee4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="phoneBookings" name="Phone" stroke="#1f7f75" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="reactivationBookings" name="Reactivation" stroke="#6f9262" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full w-full" />}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Call outcomes</CardTitle></CardHeader>
        <CardContent>
          {data ? (
            <div className="space-y-2">
              {data.outcomes.map((o) => {
                const total = data.outcomes.reduce((s, x) => s + x.count, 0) || 1;
                return (
                  <div key={o.outcome} className="flex items-center gap-3 text-sm">
                    <div className="w-32 capitalize text-slate-600">{o.outcome.replace("-", " ")}</div>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-sage-100">
                      <div className="h-full rounded-md bg-brand-500" style={{ width: `${(o.count / total) * 100}%` }} />
                    </div>
                    <div className="w-10 text-right font-medium">{o.count}</div>
                  </div>
                );
              })}
            </div>
          ) : <Skeleton className="h-24 w-full" />}
        </CardContent>
      </Card>
    </div>
  );
}
