import { useState } from 'react';
import { format } from 'date-fns';

import { formatLatency, formatMbps, formatPercentage, formatTimestamp } from '../utils/format.js';
import { formatDurationMs } from '../utils/time.js';
import { getReport } from '../services/api.js';

const limitRecords = 200;

export default function HistoryReport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fromDate = from ? new Date(from).toISOString() : null;
      const toDate = to ? new Date(to).toISOString() : null;

      const data = await getReport(fromDate, toDate);
      setSummary(data.summary ?? null);
      setRecords(Array.isArray(data.records) ? data.records.slice(-limitRecords) : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>Звіт за період</h2>
          <p className="card__description">
            Оберіть часовий проміжок, щоб проаналізувати стабільність інтернету.
          </p>
        </div>
      </header>
      <div className="card__body">
        <form className="form form--inline" onSubmit={handleSubmit}>
          <label className="form__field">
            Від
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="form__field">
            До
            <input
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Завантаження…' : 'Показати'}
          </button>
        </form>

        {error && <div className="alert alert--error">{error.message}</div>}

        {summary && (
          <div className="report">
            <div className="report__grid">
              <ReportItem label="Вимірювань" value={summary.totalSamples} />
              <ReportItem label="Офлайн подій" value={summary.downtime?.events ?? 0} />
              <ReportItem
                label="Сумарний простій"
                value={formatDurationMs(summary.downtime?.durationMs ?? 0)}
              />
              <ReportItem
                label="Uptime"
                value={formatPercentage(summary.uptimePercent)}
              />
              <ReportItem
                label="Max завантаження"
                value={formatMbps(summary.download?.max)}
              />
              <ReportItem
                label="Min завантаження"
                value={formatMbps(summary.download?.min)}
              />
              <ReportItem
                label="Max вивантаження"
                value={formatMbps(summary.upload?.max)}
              />
              <ReportItem
                label="Min вивантаження"
                value={formatMbps(summary.upload?.min)}
              />
              <ReportItem
                label="Середня затримка"
                value={formatLatency(summary.latency?.avg)}
              />
            </div>

            {Boolean(summary.speedDrops?.count) && (
              <div className="report__section">
                <h3>Просадки швидкості</h3>
                <p>
                  Виявлено {summary.speedDrops.count} суттєвих просадок
                  (пороги: {summary.speedDrops.thresholdMbps ?? '—'} Мбіт/с або{' '}
                  {summary.speedDrops.thresholdPercent ?? '—'}%).
                </p>
                <ul className="list list--timeline">
                  {summary.speedDrops.events.map((event) => (
                    <li key={event.timestamp}>
                      <span>{formatTimestamp(event.timestamp)}</span>
                      <span>
                        {formatMbps(event.previousMbps)} → {formatMbps(event.currentMbps)} (
                        {formatPercentage(event.dropPercent)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {records.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Час</th>
                  <th>Статус</th>
                  <th>Завантаження</th>
                  <th>Вивантаження</th>
                  <th>Затримка</th>
                  <th>Втрати</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const time = format(new Date(record.timestamp), 'yyyy-MM-dd HH:mm:ss');
                  return (
                    <tr key={record.timestamp}>
                      <td>{time}</td>
                      <td>
                        <span className={`badge badge--${record.status}`}>
                          {record.status === 'online' ? 'Онлайн' : 'Офлайн'}
                        </span>
                      </td>
                      <td>{formatMbps(record.downloadMbps)}</td>
                      <td>{formatMbps(record.uploadMbps)}</td>
                      <td>{formatLatency(record.latencyMs)}</td>
                      <td>
                        {record.packetLoss === null || record.packetLoss === undefined
                          ? '—'
                          : `${record.packetLoss}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ReportItem({ label, value }) {
  return (
    <div className="report__item">
      <span className="report__label">{label}</span>
      <span className="report__value">{value ?? '—'}</span>
    </div>
  );
}
