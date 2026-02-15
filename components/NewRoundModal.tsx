import React, { useState, useEffect } from 'react';
import { Player, PlayerId, RuleConfig, WinType, RoundResult } from '../types';
import { calculateRoundDeltas, calculateBaseValue } from '../services/scoringService';
import { X, Calculator, Edit3, AlertCircle } from 'lucide-react';

interface NewRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Record<PlayerId, Player>;
  dealerId: PlayerId;
  rules: RuleConfig;
  initialData?: RoundResult | null; // For editing mode
  onSubmit: (result: {
    type: 'CALCULATED' | 'MANUAL';
    deltas: Record<PlayerId, number>;
    winnerId: PlayerId | null;
    loserId: PlayerId | null;
    faan?: number;
    note?: string;
  }) => void;
  t: (key: any, params?: any) => string;
}

const NewRoundModal: React.FC<NewRoundModalProps> = ({ isOpen, onClose, players, dealerId, rules, initialData, onSubmit, t }) => {
  const [mode, setMode] = useState<'CALCULATED' | 'MANUAL'>('CALCULATED');
  
  // Mode A State
  const [winType, setWinType] = useState<WinType>(WinType.SelfDraw);
  const [winnerId, setWinnerId] = useState<PlayerId>(0);
  const [loserId, setLoserId] = useState<PlayerId>(1); // For discard
  const [faan, setFaan] = useState<number>(3); // Default starting value

  // Mode B State
  const [manualDeltas, setManualDeltas] = useState<Record<PlayerId, string>>({
    0: '0', 1: '0', 2: '0', 3: '0'
  });

  const [note, setNote] = useState('');

  // Derived State for Mode A Preview
  const [previewDeltas, setPreviewDeltas] = useState<Record<PlayerId, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });

  // Initialization Effect
  useEffect(() => {
    if (isOpen) {
       if (initialData) {
         // --- EDIT MODE ---
         setNote(initialData.note || '');
         
         if (initialData.type === 'MANUAL') {
            setMode('MANUAL');
            const stringDeltas: Record<PlayerId, string> = { 0:'0', 1:'0', 2:'0', 3:'0' };
            Object.entries(initialData.deltas).forEach(([k, v]) => {
                stringDeltas[parseInt(k) as PlayerId] = v.toString();
            });
            setManualDeltas(stringDeltas);
         } else {
            setMode('CALCULATED');
            setFaan(initialData.faan || rules.minFaan);
            
            // Infer WinType based on winner/loser
            if (initialData.winnerId === null) {
                setWinType(WinType.Draw);
            } else if (initialData.loserId === null) {
                setWinType(WinType.SelfDraw);
                setWinnerId(initialData.winnerId);
            } else {
                setWinType(WinType.Discard);
                setWinnerId(initialData.winnerId);
                setLoserId(initialData.loserId);
            }
         }
       } else {
         // --- CREATE MODE ---
         setMode('CALCULATED');
         setFaan(Math.max(rules.minFaan, 0));
         setNote('');
         setWinType(WinType.SelfDraw);
         setManualDeltas({ 0: '0', 1: '0', 2: '0', 3: '0' });
         // Reset winner to next player or dealer roughly? 
         // Just keeping default 0 is fine, user will select.
       }
    }
  }, [isOpen, rules, initialData]);

  useEffect(() => {
    if (mode === 'CALCULATED') {
      const deltas = calculateRoundDeltas(rules, winType, winnerId, winType === WinType.Discard ? loserId : null, faan, dealerId);
      setPreviewDeltas(deltas);
    }
  }, [mode, winType, winnerId, loserId, faan, rules, dealerId]);

  if (!isOpen) return null;

  const handleManualChange = (pid: PlayerId, val: string) => {
    setManualDeltas(prev => ({ ...prev, [pid]: val }));
  };

  const getManualSum = () => {
    return (Object.values(manualDeltas) as string[]).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const handleSubmit = () => {
    if (mode === 'CALCULATED') {
      // Validation: Discard cannot be same person
      if (winType === WinType.Discard && winnerId === loserId) {
        alert(t('errorSamePerson'));
        return;
      }
      onSubmit({
        type: 'CALCULATED',
        deltas: previewDeltas,
        winnerId: winType === WinType.Draw ? null : winnerId,
        loserId: winType === WinType.Discard ? loserId : null,
        faan: winType === WinType.Draw ? 0 : faan,
        note
      });
    } else {
      const sum = getManualSum();
      if (sum !== 0) {
        alert(t('errorZeroSum', { n: sum }));
        return;
      }
      const deltas: Record<PlayerId, number> = {
        0: parseInt(manualDeltas[0]) || 0,
        1: parseInt(manualDeltas[1]) || 0,
        2: parseInt(manualDeltas[2]) || 0,
        3: parseInt(manualDeltas[3]) || 0,
      };
      onSubmit({
        type: 'MANUAL',
        deltas,
        winnerId: null, // Manual doesn't strictly track winner logic
        loserId: null,
        note
      });
    }
    onClose();
  };

  const getWinTypeLabel = (type: WinType) => {
     switch(type) {
         case WinType.SelfDraw: return t('wtSelfDraw');
         case WinType.Discard: return t('wtDiscard');
         case WinType.Draw: return t('wtDraw');
         default: return type;
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? t('editRound') : t('newRound')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('CALCULATED')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 ${mode === 'CALCULATED' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
          >
            <Calculator size={18} /> {t('calcMode')}
          </button>
          <button
            onClick={() => setMode('MANUAL')}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 ${mode === 'MANUAL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
          >
            <Edit3 size={18} /> {t('manualMode')}
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          
          {mode === 'CALCULATED' ? (
            <>
              {/* Type Selection */}
              <div className="grid grid-cols-3 gap-2">
                {[WinType.SelfDraw, WinType.Discard, WinType.Draw].map(t => (
                  <button
                    key={t}
                    onClick={() => setWinType(t)}
                    className={`py-2 px-1 text-sm rounded-lg border font-medium transition-colors ${winType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {getWinTypeLabel(t)}
                  </button>
                ))}
              </div>

              {winType !== WinType.Draw && (
                <>
                  {/* Winner Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t('whoWon')}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.values(players) as Player[]).map(p => (
                        <button
                          key={p.id}
                          onClick={() => setWinnerId(p.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${winnerId === p.id ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'border-slate-200 hover:bg-slate-50'}`}
                        >
                          <span className="text-sm font-bold">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loser Selection (if Discard) */}
                  {winType === WinType.Discard && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('whoDiscard')}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(Object.values(players) as Player[]).map(p => (
                          <button
                            key={p.id}
                            disabled={p.id === winnerId}
                            onClick={() => setLoserId(p.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                              p.id === winnerId ? 'opacity-30 cursor-not-allowed bg-slate-100' :
                              loserId === p.id ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-sm font-bold">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Faan Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                      <span>{t('faanCount')}</span>
                      <span className="text-indigo-600 font-bold">
                        {calculateBaseValue(Math.min(faan, rules.maxFaan), rules.unitPrice)} $
                      </span>
                    </label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setFaan(Math.max(0, faan - 1))} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-xl font-bold text-slate-600">-</button>
                      <input
                        type="number"
                        value={faan}
                        onChange={(e) => setFaan(parseInt(e.target.value) || 0)}
                        className="flex-1 bg-transparent text-slate-900 text-center text-2xl font-bold py-2 border-b-2 border-slate-200 focus:border-indigo-600 outline-none"
                      />
                      <button onClick={() => setFaan(Math.min(13, faan + 1))} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-xl font-bold text-slate-600">+</button>
                    </div>
                    {faan < rules.minFaan && (
                      <p className="text-xs text-red-500 mt-1">{t('chickenHand', {n: rules.minFaan})}</p>
                    )}
                    {faan > rules.maxFaan && (
                      <p className="text-xs text-orange-500 mt-1">{t('limitHand', {n: rules.maxFaan})}</p>
                    )}
                  </div>

                  {/* Preview Calculation */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{t('expectedResult')}</p>
                    <div className="space-y-1">
                      {(Object.values(players) as Player[]).map(p => {
                        const val = previewDeltas[p.id];
                        if (val === 0) return null;
                        return (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span>{p.name}</span>
                            <span className={val > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                              {val > 0 ? '+' : ''}{val}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            // Mode B: Manual
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <p>{t('manualNote')}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {(Object.values(players) as Player[]).map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-20 font-medium truncate">{p.name}</span>
                    <input
                      type="number"
                      value={manualDeltas[p.id]}
                      onChange={(e) => handleManualChange(p.id, e.target.value)}
                      className="flex-1 bg-white text-slate-900 border rounded px-3 py-2 text-right font-mono"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div className={`flex justify-between items-center text-sm font-bold border-t pt-2 ${getManualSum() !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>{t('total')}:</span>
                <span>{getManualSum()}</span>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1">{t('note')}</label>
             <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder={t('notePlaceholder')}
             />
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50">
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            {initialData ? t('update') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRoundModal;