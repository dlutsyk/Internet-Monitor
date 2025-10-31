import { formatDistanceToNow } from 'date-fns';

import { formatLatency, formatMbps } from '../utils/format.js';

const statusColor = (status) => {
  switch (status) {
    case 'online':
      return 'badge--success';
    case 'offline':
      return 'badge--danger';
    default:
      return 'badge--muted';
  }
};

export default function LiveMetrics({ latest, connectionState }) {
  if (!latest) {
    return (
      <section className="card">
        <header className="card__header">
          <h2>Поточний стан</h2>
        </header>
        <div className="card__body">
          <p>Ще немає даних. Очікуємо перші вимірювання…</p>
        </div>
      </section>
    );
  }

  const recordedAt = new Date(latest.timestamp);

  return (
    <section className="card">
      <header className="card__header">
        <h2>Поточний стан</h2>
        <span className={`badge ${statusColor(latest.status)}`}>
          {latest.status === 'online' ? 'Онлайн' : 'Офлайн'}
        </span>
      </header>
      <div className="card__body grid">
        <div className="metric">
          <span className="metric__label">Завантаження</span>
          <span className="metric__value">{formatMbps(latest.downloadMbps)}</span>
        </div>
        <div className="metric">
          <span className="metric__label">Вивантаження</span>
          <span className="metric__value">{formatMbps(latest.uploadMbps)}</span>
        </div>
        <div className="metric">
          <span className="metric__label">Затримка</span>
          <span className="metric__value">{formatLatency(latest.latencyMs)}</span>
        </div>
        <div className="metric">
          <span className="metric__label">Пакетні втрати</span>
          <span className="metric__value">
            {latest.packetLoss === null || latest.packetLoss === undefined
              ? '—'
              : `${latest.packetLoss}%`}
          </span>
        </div>
      </div>
      <footer className="card__footer">
        <div className="card__meta">
          <span>Оновлено: {formatDistanceToNow(recordedAt, { addSuffix: true })}</span>
          <span>З&apos;єднання: {translateState(connectionState)}</span>
        </div>
        {latest.status !== 'online' && latest.error?.message && (
          <div className="alert alert--warning">
            Останнє вимірювання не вдалося: {latest.error.message}
          </div>
        )}
      </footer>
    </section>
  );
}

const translateState = (state) => {
  switch (state) {
    case 'open':
      return 'підключено';
    case 'connecting':
      return 'підключення…';
    case 'error':
      return 'помилка';
    case 'closed':
      return 'відключено';
    default:
      return 'невідомо';
  }
};
