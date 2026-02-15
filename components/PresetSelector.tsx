import React, { useState } from 'react';
import { ChevronDown, Check, LayoutTemplate } from 'lucide-react';
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
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ presets, onSelect, lang, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onSelect(index);
    setIsOpen(false);
  };

  const selectedPreset = selectedIndex !== null ? presets[selectedIndex] : null;

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
          <div className={`p-2 rounded-lg shrink-0 ${selectedPreset ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
            <LayoutTemplate size={20} />
          </div>
          <div className="text-left truncate">
            {selectedPreset ? (
              <>
                <div className="font-bold text-slate-800 text-sm">{selectedPreset.names[lang]}</div>
                <div className="text-xs text-slate-500 truncate">{selectedPreset.descriptions[lang]}</div>
              </>
            ) : (
              <span className="text-slate-500 font-medium text-sm">{t('selectPreset')}</span>
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
                <div className={`text-sm font-bold ${selectedIndex === index ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {preset.names[lang]}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    {preset.descriptions[lang]}
                </div>
              </div>
              {selectedIndex === index && (
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