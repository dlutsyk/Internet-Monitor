import { cn } from '../utils/cn';
import { formatMbps } from '../utils/format';
import useAnimatedNumber from '../hooks/useAnimatedNumber';
import { useTranslation } from 'react-i18next';

// Asset URL from Figma
const imgFrame6 = "https://www.figma.com/api/mcp/asset/e2b5bf14-4b4b-4c0a-95c6-7688c2b37696";

export default function SpeedTestCard({
  isTestingSpeed,
  countdown,
  testResult,
  testError,
  latest,
  stats
}) {
  const { t } = useTranslation();

  // Animate download and upload speeds
  const animatedDownload = useAnimatedNumber(
    testResult?.downloadMbps || latest?.downloadMbps || 0,
    600,
    2
  );
  const animatedUpload = useAnimatedNumber(testResult?.uploadMbps || 0, 600, 2);

  return (
    <div className={cn(`bg-white border rounded-lg p-6 transition-all duration-300 ${
      isTestingSpeed || testResult ? 'border-blue-500 border-2 shadow-lg scale-[1.02]' : 'border-neutral-200 scale-100'
    }`)}>
      <div className={cn("flex justify-between items-start mb-2")}>
        <div className={cn("flex items-center gap-2")}>
          <p className={cn("text-sm text-neutral-600 transition-colors duration-200")}>
            {isTestingSpeed ? t('speedTest.title') : t('speedTest.currentSpeed')}
          </p>
          {isTestingSpeed && (
            <div className={cn("bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 animate-pulse")}>
              {countdown > 0 && (
                <span className={cn("font-bold transition-all duration-300")}>{countdown}s</span>
              )}
              <span>{t('speedTest.testing')}</span>
            </div>
          )}
        </div>
        <div className={cn("h-4 w-4 transition-transform duration-200 hover:scale-110")}>
          <img alt="" className={cn("block h-full w-full")} src={imgFrame6} />
        </div>
      </div>

      {isTestingSpeed && testResult ? (
        // Test mode: show both download and upload with real-time updates
        <div className={cn("space-y-3 animate-fadeIn")}>
          <div>
            <div className={cn("flex items-baseline gap-2")}>
              <p className={cn("text-2xl text-blue-600 font-semibold transition-all duration-300 transform")}>
                {testResult.downloadMbps ? formatMbps(animatedDownload) : '—'}
              </p>
              <p className={cn("text-xs text-neutral-500 uppercase tracking-wide")}>
                {t('speedTest.download')}
              </p>
            </div>
          </div>
          <div>
            <div className={cn("flex items-baseline gap-2")}>
              <p className={cn("text-2xl text-blue-600 font-semibold transition-all duration-300 transform")}>
                {testResult.uploadMbps ? formatMbps(animatedUpload) : '—'}
              </p>
              <p className={cn("text-xs text-neutral-500 uppercase tracking-wide")}>
                {t('speedTest.upload')}
              </p>
            </div>
          </div>
          <p className={cn("text-sm text-neutral-600 pt-1 transition-opacity duration-200")}>
            {testResult.status === 'online'
              ? t('speedTest.testResult', { seconds: countdown })
              : t('speedTest.testFailed')}
          </p>
        </div>
      ) : isTestingSpeed ? (
        // Testing but no result yet
        <div className={cn("flex flex-col items-center justify-center py-4 animate-fadeIn")}>
          <div className={cn("animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-3")} />
          <p className={cn("text-sm text-neutral-600")}>
            {t('speedTest.runningTest')}
          </p>
        </div>
      ) : (
        // Normal mode: show current speed
        <div className={cn("transition-all duration-300")}>
          <p className={cn("text-2xl text-neutral-900 mb-2 transition-all duration-500 transform")}>
            {latest?.downloadMbps ? formatMbps(animatedDownload) : '—'}
          </p>
          <p className={cn("text-sm text-neutral-600 transition-opacity duration-200")}>
            {latest && stats && latest.downloadMbps && stats.avgDownload
              ? t('speedTest.fromAvg', { percent: ((latest.downloadMbps - stats.avgDownload) / stats.avgDownload * 100).toFixed(1) })
              : latest?.status === 'offline'
              ? t('speedTest.offline')
              : t('speedTest.loading')}
          </p>
        </div>
      )}

      {testError && (
        <p className={cn("text-sm text-red-500 mt-2 animate-fadeIn")}>
          {t('speedTest.error', { message: testError })}
        </p>
      )}
    </div>
  );
}
