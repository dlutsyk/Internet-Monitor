import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

// Asset URLs from Figma
const imgFrame2 = "https://www.figma.com/api/mcp/asset/3dc66ba4-dacc-4a4d-8bcd-04ca855c51a1";
const imgFrame3 = "https://www.figma.com/api/mcp/asset/37a8aa32-2bfd-4a11-aea9-745eaacb3e02";
const imgFrame4 = "https://www.figma.com/api/mcp/asset/e2b5bf14-4b4b-4c0a-95c6-7688c2b37696";
const imgFrame5 = "https://www.figma.com/api/mcp/asset/53984e1a-2e96-46fb-b47a-f9cbf0c0a589";

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className={cn("bg-white border-r border-neutral-200 w-64 flex-shrink-0")}>
      <nav className={cn("p-4 flex flex-col gap-2")}>
        <div className={cn("bg-neutral-100 h-10 rounded-lg flex items-center gap-3 px-3")}>
          <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
            <img alt="" className={cn("block h-full w-full")} src={imgFrame2} />
          </div>
          <p className={cn("font-normal text-base text-neutral-900")}>
            {t('sidebar.realtimeMonitor')}
          </p>
        </div>
        <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
          <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
            <img alt="" className={cn("block h-full w-full")} src={imgFrame3} />
          </div>
          <p className={cn("font-normal text-base text-neutral-600")}>
            {t('sidebar.historicalReports')}
          </p>
        </div>
        <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
          <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
            <img alt="" className={cn("block h-full w-full")} src={imgFrame4} />
          </div>
          <p className={cn("font-normal text-base text-neutral-600")}>
            {t('sidebar.statistics')}
          </p>
        </div>
        <div className={cn("h-10 rounded-lg flex items-center gap-3 px-3")}>
          <div className={cn("h-4 w-4 flex items-center justify-center flex-shrink-0")}>
            <img alt="" className={cn("block h-full w-full")} src={imgFrame5} />
          </div>
          <p className={cn("font-normal text-base text-neutral-600")}>
            {t('sidebar.settings')}
          </p>
        </div>
      </nav>
    </aside>
  );
}
