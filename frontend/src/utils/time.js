export const formatDurationMs = (ms) => {
  if (!ms || Number.isNaN(ms)) {
    return '—';
  }

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours) parts.push(`${hours} год`);
  if (minutes) parts.push(`${minutes} хв`);
  if (seconds && parts.length < 2) parts.push(`${seconds} с`);

  return parts.length ? parts.join(' ') : `${seconds} с`;
};
