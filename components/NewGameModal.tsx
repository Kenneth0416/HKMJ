import React, { useState } from 'react';
import { Wind } from '../types';
import { WINDS_ORDER } from '../constants';
import { Users } from 'lucide-react';

interface NewGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (names: string[]) => void;
  t: (key: any) => string;
}

const NewGameModal: React.FC<NewGameModalProps> = ({ isOpen, onClose, onSubmit, t }) => {
  const [names, setNames] = useState<string[]>(['', '', '', '']);

  if (!isOpen) return null;

  const handleNameChange = (index: number, val: string) => {
    const newNames = [...names];
    newNames[index] = val;
    setNames(newNames);
  };

  const handleSubmit = () => {
    // Fill empty names with defaults
    const finalNames = names.map((n, i) => n.trim() || `${t('player')} ${i + 1}`);
    onSubmit(finalNames);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-700 p-4 text-white flex items-center gap-2">
          <Users size={20} />
          <h2 className="text-lg font-bold">{t('newGameTitle')}</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 mb-2">{t('enterNames')}</p>
          
          {WINDS_ORDER.map((wind, index) => (
            <div key={wind} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-100 shrink-0">
                {wind}
              </div>
              <input
                type="text"
                value={names[index]}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`${t('player')} ${index + 1}`}
                className="flex-1 bg-transparent text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none py-1 px-2 transition-colors placeholder:text-slate-400"
              />
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors"
          >
            {t('start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGameModal;