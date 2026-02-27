import { useState, useEffect } from 'react';

interface AnalyticsSummary {
  period: string;
  totalMessages: number;
  dailyCounts: { date: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  feedbackSummary: { up: number; down: number };
  knowledgeGaps: string[];
  staffMetrics?: { userId: string; name: string; totalMessages: number; avgSatisfaction: number; escalations: number }[];
  hourlyCounts?: number[];
  knowledgeEffectiveness?: { noteId: string; title: string; citations: number; thumbsDown: number }[];
  sla?: { total: number; breached: number; avgResponseMin: number };
}

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'staff' | 'knowledge' | 'heatmap'>('overview');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`, { credentials: 'include' })
      .then(r => r.json() as Promise<AnalyticsSummary>)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Date', 'Messages'],
      ...data.dailyCounts.map(d => [d.date, String(d.count)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinsen-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="tab-loading">Loading analytics…</div>;
  if (!data) return <div className="empty-state">Failed to load analytics.</div>;

  const maxDaily = Math.max(...data.dailyCounts.map(d => d.count), 1);
  const feedbackTotal = data.feedbackSummary.up + data.feedbackSummary.down;
  const satisfactionRate = feedbackTotal > 0
    ? Math.round((data.feedbackSummary.up / feedbackTotal) * 100)
    : 0;

  return (
    <div className="analytics-tab">
      <div className="tab-toolbar">
        <div className="period-selector">
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              className={`btn-sm ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="analytics-nav">
          {(['overview', 'staff', 'knowledge', 'heatmap'] as const).map(s => (
            <button key={s} className={`btn-sm ${activeSection === s ? 'active' : ''}`} onClick={() => setActiveSection(s)}>
              {s === 'overview' ? '📊 Overview' : s === 'staff' ? '👥 Staff' : s === 'knowledge' ? '📚 Knowledge' : '🗓 Heatmap'}
            </button>
          ))}
          <button className="btn-sm" onClick={exportCSV} title="Export CSV">📥 CSV</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value">{data.totalMessages}</span>
          <span className="kpi-label">Total Messages</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{Math.round(data.totalMessages / Math.max(days, 1))}</span>
          <span className="kpi-label">Avg/Day</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{satisfactionRate}%</span>
          <span className="kpi-label">Satisfaction ({data.feedbackSummary.up}👍 / {data.feedbackSummary.down}👎)</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{data.knowledgeGaps.length}</span>
          <span className="kpi-label">Knowledge Gaps</span>
        </div>
        {data.sla && (
          <>
            <div className="kpi-card">
              <span className="kpi-value">{data.sla.avgResponseMin}m</span>
              <span className="kpi-label">Avg Escalation Response</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value" style={{ color: data.sla.breached > 0 ? 'var(--red-500)' : 'var(--green-500)' }}>
                {data.sla.breached}/{data.sla.total}
              </span>
              <span className="kpi-label">SLA Breaches</span>
            </div>
          </>
        )}
      </div>

      {activeSection === 'overview' && (
        <>
          {/* Daily Volume Chart */}
          <div className="chart-section">
            <h3>📈 Daily Message Volume</h3>
            <div className="bar-chart">
              {data.dailyCounts.slice(-30).map(d => (
                <div key={d.date} className="bar-col" title={`${d.date}: ${d.count} messages`}>
                  <div className="bar" style={{ height: `${(d.count / maxDaily) * 100}%` }}>
                    {d.count > 0 && <span className="bar-value">{d.count}</span>}
                  </div>
                  <span className="bar-label">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Intents */}
          <div className="chart-section">
            <h3>🎯 Top Intents</h3>
            <div className="intent-list">
              {data.topIntents.slice(0, 12).map(i => {
                const maxIntent = data.topIntents[0]?.count || 1;
                return (
                  <div key={i.intent} className="intent-row">
                    <span className="intent-name">{i.intent}</span>
                    <div className="intent-bar-bg">
                      <div className="intent-bar" style={{ width: `${(i.count / maxIntent) * 100}%` }} />
                    </div>
                    <span className="intent-count">{i.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Knowledge Gaps */}
          {data.knowledgeGaps.length > 0 && (
            <div className="chart-section">
              <h3>🕳️ Knowledge Gaps (Unanswered Queries)</h3>
              <div className="gap-list">
                {data.knowledgeGaps.map((gap, i) => (
                  <div key={i} className="gap-item">"{gap}"</div>
                ))}
              </div>
              <small>These queries returned no results. Consider adding knowledge notes for them.</small>
            </div>
          )}
        </>
      )}

      {activeSection === 'staff' && (
        <div className="chart-section">
          <h3>👥 Staff Performance</h3>
          {data.staffMetrics && data.staffMetrics.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Messages</th>
                  <th>Satisfaction</th>
                  <th>Escalations</th>
                </tr>
              </thead>
              <tbody>
                {data.staffMetrics.map(s => (
                  <tr key={s.userId}>
                    <td>{s.name}</td>
                    <td>{s.totalMessages}</td>
                    <td>
                      <span style={{ color: s.avgSatisfaction >= 80 ? 'var(--green-500)' : s.avgSatisfaction >= 50 ? 'var(--yellow-500)' : 'var(--red-500)' }}>
                        {s.avgSatisfaction}%
                      </span>
                    </td>
                    <td>{s.escalations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No staff metrics yet. Metrics populate as users interact.</div>
          )}
        </div>
      )}

      {activeSection === 'knowledge' && (
        <div className="chart-section">
          <h3>📚 Knowledge Effectiveness</h3>
          {data.knowledgeEffectiveness && data.knowledgeEffectiveness.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Citations</th>
                  <th>👎 Count</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {data.knowledgeEffectiveness.map(k => {
                  const health = k.thumbsDown === 0 ? '🟢' : k.thumbsDown <= 2 ? '🟡' : '🔴';
                  return (
                    <tr key={k.noteId}>
                      <td>{k.title}</td>
                      <td>{k.citations}</td>
                      <td>{k.thumbsDown}</td>
                      <td>{health}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No knowledge effectiveness data yet.</div>
          )}
        </div>
      )}

      {activeSection === 'heatmap' && (
        <div className="chart-section">
          <h3>🗓 Usage Heatmap (Hour of Day)</h3>
          {data.hourlyCounts ? (
            <div className="heatmap-grid">
              {data.hourlyCounts.map((count, hour) => {
                const maxHourly = Math.max(...data.hourlyCounts!, 1);
                const intensity = count / maxHourly;
                return (
                  <div
                    key={hour}
                    className="heatmap-cell"
                    title={`${hour}:00 - ${count} messages`}
                    style={{
                      backgroundColor: `rgba(37, 99, 235, ${Math.max(intensity, 0.05)})`,
                      color: intensity > 0.5 ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    <div className="heatmap-hour">{String(hour).padStart(2, '0')}</div>
                    <div className="heatmap-count">{count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No hourly data available.</div>
          )}
        </div>
      )}
    </div>
  );
}
