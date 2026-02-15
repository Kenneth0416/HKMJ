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

const PresetSelector: React.FC<PresetSelectorProps> = ({ presets, onSelect, lang, t, currentPresetId }) => {
  const [isOpen, setIsOpen] = useState(false);

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
      {isOpen && (
        <div
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border rounded-xl p-3 flex items-center justify-between transition-all shadow-sm group ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-indigo-200 hover:border-indigo-300'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-lg shrink-0 ${isCustom ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
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
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-50 animate-fade-in-down">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className="w-full text-left p-3 hover:bg-indigo-50 transition-colors flex items-center justify-between group"
            >
              <div className="flex-1">
                <div className={`text-sm font-bold ${currentPresetId === index ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {preset.names[lang]}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {preset.descriptions[lang]}
                </div>
              </div>
              {currentPresetId === index && (
                <Check size={16} className="text-indigo-600 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetSelector;
