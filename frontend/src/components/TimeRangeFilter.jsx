import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

const imgFrame10 = "https://www.figma.com/api/mcp/asset/7b965f30-eec9-48bf-b8e3-5ccfdd3e1b32";

export const TIME_RANGES = {
  '1h': { hours: 1 },
  '6h': { hours: 6 },
  '12h': { hours: 12 },
  '24h': { hours: 24 },
  '7d': { hours: 24 * 7 },
  '30d': { hours: 24 * 30 },
};

export default function TimeRangeFilter({ selectedRange = '24h', onChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (range) => {
    onChange(range);
    setIsOpen(false);
  };

  const selectedLabel = t(`timeRange.${selectedRange}`);

  return (
    <div className={cn("relative")} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center border border-neutral-200 rounded px-3 h-[34px] gap-2 hover:bg-neutral-50 transition-colors")}
      >
        <p className={cn("text-sm text-black")}>{selectedLabel}</p>
        <div className={cn("h-[18px] w-[18px]")}>
          <img alt="" className={cn("block h-full w-full")} src={imgFrame10} />
        </div>
      </button>

      {isOpen && (
        <div className={cn("absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[180px]")}>
          <div className={cn("py-1")}>
            {Object.keys(TIME_RANGES).map((key) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={cn(`w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors ${
                  selectedRange === key
                    ? 'bg-neutral-50 text-blue-600 font-medium'
                    : 'text-neutral-900'
                }`)}
              >
                {t(`timeRange.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
