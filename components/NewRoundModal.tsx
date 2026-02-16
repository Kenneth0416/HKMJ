import React, { useState, useEffect } from 'react';
import { Player, PlayerId, RuleConfig, WinType, RoundResult } from '../types';
import { calculateRoundDeltas, calculateBaseValue, calculateHorseBonusPerPlayer } from '../services/scoringService';
import { X, Calculator, Edit3, AlertCircle, Sparkles } from 'lucide-react';

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
    horseHits?: number;
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
  const [horseHits, setHorseHits] = useState<number>(0); // 跑馬仔中馬數

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
         setHorseHits(initialData.horseHits || 0);

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
         setHorseHits(0);
         setManualDeltas({ 0: '0', 1: '0', 2: '0', 3: '0' });
         // Reset winner to next player or dealer roughly?
         // Just keeping default 0 is fine, user will select.
       }
    }
  }, [isOpen, rules, initialData]);

  useEffect(() => {
    if (mode === 'CALCULATED') {
      const deltas = calculateRoundDeltas(rules, winType, winnerId, winType === WinType.Discard ? loserId : null, faan, dealerId, horseHits);
      setPreviewDeltas(deltas);
    }
  }, [mode, winType, winnerId, loserId, faan, rules, dealerId, horseHits]);

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
        note,
        horseHits: horseHits > 0 ? horseHits : undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? t('editRound') : t('newRound')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
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

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
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
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 flex justify-between items-center">
                      <span>{t('faanCount')}</span>
                      <span className="text-emerald-600 font-bold text-lg">
                        ${calculateBaseValue(Math.min(faan, rules.maxFaan), rules.unitPrice)}
                      </span>
                    </label>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setFaan(Math.max(0, faan - 1))}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 border-2 border-red-200 flex items-center justify-center text-3xl sm:text-4xl font-bold text-red-500 active:scale-95 transition-all shadow-sm"
                      >
                        −
                      </button>
                      <div className="flex-1 max-w-[120px] sm:max-w-[160px]">
                        <input
                          type="number"
                          value={faan}
                          onChange={(e) => setFaan(parseInt(e.target.value) || 0)}
                          className="w-full bg-white text-slate-900 text-center text-4xl sm:text-5xl font-bold py-3 rounded-2xl border-2 border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none shadow-inner"
                        />
                      </div>
                      <button
                        onClick={() => setFaan(Math.min(13, faan + 1))}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-green-50 hover:bg-green-100 active:bg-green-200 border-2 border-green-200 flex items-center justify-center text-3xl sm:text-4xl font-bold text-green-500 active:scale-95 transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                    <div className="mt-3 text-center">
                      {faan < rules.minFaan ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          {t('chickenHand', {n: rules.minFaan})}
                        </span>
                      ) : faan > rules.maxFaan ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          {t('limitHand', {n: rules.maxFaan})}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {t('minFaan')}: {rules.minFaan} · {t('maxFaan')}: {rules.maxFaan}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horse (跑馬仔) Input - Only show if enabled and not Draw */}
                  {rules.horse?.enabled && winType !== WinType.Draw && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
                      <label className="block text-sm font-semibold text-amber-800 mb-3 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-500" />
                          {t('horseHits')}
                        </span>
                        {horseHits > 0 && (() => {
                          const horseBonusPerPlayer = calculateHorseBonusPerPlayer(rules.horse!, horseHits, rules.unitPrice);
                          const totalHorseBonus = horseBonusPerPlayer * 3; // 胡家收 3 家份
                          return (
                            <span className="text-amber-600 font-bold text-sm">
                              +${totalHorseBonus} {t('horseBonus')}
                            </span>
                          );
                        })()}
                      </label>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setHorseHits(Math.max(0, horseHits - 1))}
                          className="w-12 h-12 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border-2 border-amber-300 flex items-center justify-center text-2xl font-bold text-amber-600 active:scale-95 transition-all"
                        >
                          −
                        </button>
                        <div className="flex-1 max-w-[100px]">
                          <div className="text-center text-3xl font-bold text-amber-700">
                            {t('horseHitsLabel', { n: horseHits })}
                          </div>
                          <div className="text-center text-xs text-amber-500 mt-1">
                            0 - {rules.horse.horseCount}
                          </div>
                        </div>
                        <button
                          onClick={() => setHorseHits(Math.min(rules.horse?.horseCount || 4, horseHits + 1))}
                          className="w-12 h-12 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border-2 border-amber-300 flex items-center justify-center text-2xl font-bold text-amber-600 active:scale-95 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

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

        {/* Fixed Bottom Button */}
        <div className="p-4 border-t bg-white rounded-b-xl shrink-0">
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            {initialData ? t('update') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRoundModal;