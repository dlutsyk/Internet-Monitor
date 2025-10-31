import { formatDistanceToNow } from 'date-fns';

import { formatLatency, formatMbps } from '../utils/format.js';

export default function RecentActivity({ recent }) {
  const items = recent.slice(-12).reverse();

  return (
    <section className="card">
      <header className="card__header">
        <h2>Останні вимірювання</h2>
      </header>
      <div className="card__body">
        {items.length === 0 && <p>Дані відсутні.</p>}
        <ul className="list list--timeline">
          {items.map((item) => (
            <li key={item.timestamp} className={`list__item list__item--${item.status}`}>
              <div className="list__time">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </div>
              <div className="list__content">
                {item.status === 'online' ? (
                  <span>
                    {formatMbps(item.downloadMbps)} ↓ / {formatMbps(item.uploadMbps)} ↑,{' '}
                    {formatLatency(item.latencyMs)} затримка
                  </span>
                ) : (
                  <span>З&apos;єднання недоступне</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
