import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

// Asset URLs from Figma
const imgFrame = "https://www.figma.com/api/mcp/asset/91d2fffa-fc79-41c6-82d3-a8284e948488";
const imgFrame1 = "https://www.figma.com/api/mcp/asset/fcfd6a69-7f48-4c81-ae33-e4839b12b786";

export default function Header({
  connectionState,
  reconnectAttempts = 0,
  onReconnect,
  isTestingSpeed,
  countdown,
  onTestSpeed
}) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ua' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <div className={cn("bg-white border-b border-neutral-200 h-[75px] w-full flex-shrink-0")}>
      <div className={cn("flex items-center justify-between h-full px-6")}>
        {/* Logo and Title */}
        <div className={cn("flex items-center gap-3")}>
          <div className={cn("h-6 w-[30px] flex items-center justify-center")}>
            <img alt="Logo" className={cn("block h-full w-full")} src={imgFrame} />
          </div>
          <p className={cn("font-normal text-xl text-neutral-900")}>
            {t('header.title')}
          </p>
        </div>

        {/* Connection Status and Buttons */}
        <div className={cn("flex items-center gap-4")}>
          <ConnectionStatusIndicator
            connectionState={connectionState}
            reconnectAttempts={reconnectAttempts}
            onReconnect={onReconnect}
          />

          <button
            onClick={onTestSpeed}
            className={cn(`h-[42px] px-4 rounded-lg flex items-center gap-2 transition-colors ${
              isTestingSpeed
                ? 'bg-red-500 hover:bg-red-600 border border-red-600'
                : 'bg-blue-500 hover:bg-blue-600 border border-blue-600'
            }`)}
          >
            <div className={cn("h-4 w-4 flex items-center justify-center")}>
              {isTestingSpeed ? (
                countdown > 0 ? (
                  <div className={cn("text-white text-xs font-bold w-4 h-4 flex items-center justify-center")}>
                    {countdown}
                  </div>
                ) : (
                  <div className={cn("animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent")} />
                )
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 1v6M8 7l3-3M8 7L5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11c0 2.761 2.239 5 5 5s5-2.239 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <p className={cn("font-normal text-base text-white")}>
              {isTestingSpeed
                ? (countdown > 0
                  ? t('header.buttons.cancelWithCountdown', { seconds: countdown })
                  : t('header.buttons.cancel'))
                : t('header.buttons.testSpeed')}
            </p>
          </button>

          <button
            onClick={toggleLanguage}
            className={cn("bg-white border border-neutral-300 h-[42px] px-4 rounded-lg flex items-center gap-2 hover:bg-neutral-50 transition-colors")}
          >
            <p className={cn("font-medium text-base text-neutral-700")}>
              {i18n.language === 'en' ? 'EN' : 'UA'}
            </p>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className={cn("bg-neutral-100 border border-neutral-200 h-[42px] px-4 rounded-lg flex items-center gap-2")}>
            <div className={cn("h-4 w-4 flex items-center justify-center")}>
              <img alt="" className={cn("block h-full w-full")} src={imgFrame1} />
            </div>
            <p className={cn("font-normal text-base text-neutral-700")}>
              {t('header.buttons.exportReport')}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
