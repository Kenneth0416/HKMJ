import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, LayoutTemplate, Sliders } from 'lucide-react';
import { Language } from '../translations';

interface Preset {
  names: Record<Language, string>;
  descriptions: Record<Language, string>;
  rules: any;
}

interface PresetSelectorProps {
  presets: Preset[];
  onSelect: (index: number) => void;
  lang: Language;
  t: (key: any) => string;
  currentPresetId?: number; // Currently selected preset ID
}

const presetAnimationStyles = `
@keyframes accordionExpand {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 256px;
  }
}
@keyframes accordionCollapse {
  from {
    opacity: 1;
    max-height: 256px;
  }
  to {
    opacity: 0;
    max-height: 0;
  }
}
@keyframes itemFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.preset-accordion-open {
  animation: accordionExpand 0.25s ease-out forwards;
}
.preset-accordion-close {
  animation: accordionCollapse 0.2s ease-in forwards;
}
.preset-item-animate {
  opacity: 0;
  animation: itemFadeIn 0.2s ease-out forwards;
}
`;

const PresetSelector: React.FC<PresetSelectorProps> = ({ presets, onSelect, lang, t, currentPresetId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Inject animation styles once
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = presetAnimationStyles;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Determine if current settings match a preset
  const isCustom = currentPresetId === undefined || currentPresetId === null || currentPresetId === -1;
  const selectedPreset = !isCustom ? presets[currentPresetId] : null;

  const handleSelect = (index: number) => {
    onSelect(index);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Backdrop to close on click outside */}
      {shouldRender && (
        <div
          className={`fixed inset-0 z-10 cursor-default transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border rounded-xl p-3 flex items-center justify-between transition-all shadow-sm group ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-indigo-200 hover:border-indigo-300'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-lg shrink-0 transition-colors duration-200 ${isCustom ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {isCustom ? <Sliders size={20} /> : <LayoutTemplate size={20} />}
          </div>
          <div className="text-left truncate">
            {selectedPreset ? (
              <>
                <div className="font-bold text-slate-800 text-sm">{selectedPreset.names[lang]}</div>
                <div className="text-xs text-slate-500 truncate">{selectedPreset.descriptions[lang]}</div>
              </>
            ) : (
              <>
                <div className="font-bold text-amber-700 text-sm">
                  {lang === 'zh-HK' ? '自訂設定' : 'Custom Settings'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {lang === 'zh-HK' ? '已手動調整參數' : 'Manually adjusted parameters'}
                </div>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {shouldRender && (
        <div
          className={`absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-50 origin-top ${isOpen ? 'preset-dropdown' : 'opacity-0 scale-95 -translate-y-2 transition-all duration-200'}`}
        >
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className={`w-full text-left p-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group ${isOpen ? 'preset-item' : ''}`}
              style={isOpen ? { animationDelay: `${index * 40}ms` } : undefined}
            >
              <div className="flex-1">
                <div className={`text-sm font-bold transition-colors duration-150 ${currentPresetId === index ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                    {preset.names[lang]}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {preset.descriptions[lang]}
                </div>
              </div>
              <div className={`transition-all duration-200 ${currentPresetId === index ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                <Check size={16} className="text-indigo-600 ml-2" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetSelector;
