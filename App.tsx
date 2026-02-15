import React, { useState, useEffect, useRef } from 'react';
import { GameSession, PlayerId, Player, RoundResult, Wind, RuleConfig, WinType } from './types';
import { DEFAULT_RULES, MOCK_PLAYERS, SCORING_PRESETS } from './constants';
import { calculateBaseValue } from './services/scoringService';
import { getTranslation, Language, translations } from './translations';
import NewRoundModal from './components/NewRoundModal';
import NewGameModal from './components/NewGameModal';
import LandingPage from './components/LandingPage';
import PresetSelector from './components/PresetSelector';
import HKMJRules from './components/HKMJRules';
import { MahjongLogo } from './components/Logo';
import { History, Settings, User, Trash2, Coins, Save, RotateCw, Sigma, Edit2, Globe, BookOpen, Smartphone, Plus, LogOut, ScrollText, CheckCircle } from 'lucide-react';

// --- Toast Notification Component ---
const Toast = ({ message, visible }: { message: string; visible: boolean }) => (
  <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
    <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-medium">
      <CheckCircle size={20} />
      {message}
    </div>
  </div>
);

// --- Mobile Landscape Blocker Component ---
const LandscapeBlocker = () => (
  <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center hidden landscape:flex md:landscape:hidden">
    <div className="animate-spin-slow mb-4 text-emerald-400">
      <Smartphone size={48} className="rotate-90" />
    </div>
    <h3 className="text-xl font-bold mb-2">請使用直向瀏覽</h3>
    <p className="text-slate-400 text-sm">為了最佳體驗，請將您的手機轉為直向。</p>
  </div>
);

// --- Sidebar Navigation Item ---
const NavItem = ({ active, onClick, icon: Icon, label, className = '' }: any) => (
    <button
        onClick={onClick}
        className={`w-full p-3 flex flex-col lg:flex-row items-center lg:gap-3 rounded-xl transition-all ${
            active 
            ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-900/20' 
            : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
        } ${className}`}
    >
        <Icon size={24} className={active ? "text-emerald-400" : ""} />
        <span className="text-[10px] lg:text-sm font-bold mt-1 lg:mt-0">{label}</span>
    </button>
);

export default function App() {
  // --- State ---
  const [view, setView] = useState<'HOME' | 'GAME'>('HOME');
  
  // Language State
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('hkmj_lang') as Language) || 'zh-HK';
  });

  useEffect(() => {
    localStorage.setItem('hkmj_lang', lang);
  }, [lang]);

  // Translation Helper
  const t = (key: keyof typeof translations['zh-HK'], params?: Record<string, string | number>) => {
    return getTranslation(lang, key, params);
  };

  const [session, setSession] = useState<GameSession>(() => {
    // Try local storage or default
    const saved = localStorage.getItem('hkmj_session');
    // Migration: if saved rules has baseValueMap, replace with unitPrice default
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.rules && 'baseValueMap' in parsed.rules) {
        parsed.rules = DEFAULT_RULES; // Reset rules for migration safety
      }
      return parsed;
    }
    return {
      players: MOCK_PLAYERS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<PlayerId, Player>),
      rounds: [],
      dealerId: 0 as PlayerId,
      rules: DEFAULT_RULES
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SCORE' | 'HISTORY' | 'SETTINGS'>('SCORE');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  
  // Delete Modal State
  const [roundToDelete, setRoundToDelete] = useState<string | null>(null);

  // Edit State
  const [editingRound, setEditingRound] = useState<RoundResult | null>(null);
  
  // Settings Tab Local State
  const [editingRules, setEditingRules] = useState<RuleConfig>(session.rules);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  // Sync session rules to editing state when session changes (or tab opens)
  useEffect(() => {
    setEditingRules(session.rules);
    setHasUnsavedSettings(false);
  }, [session.rules]);

  // Persist State
  useEffect(() => {
    localStorage.setItem('hkmj_session', JSON.stringify(session));
  }, [session]);

  // --- Actions ---

  const handleStartNewGame = (names: string[]) => {
    const newPlayers: Record<PlayerId, Player> = {
        0: { id: 0, name: names[0], score: 0, wind: Wind.East },
        1: { id: 1, name: names[1], score: 0, wind: Wind.South },
        2: { id: 2, name: names[2], score: 0, wind: Wind.West },
        3: { id: 3, name: names[3], score: 0, wind: Wind.North },
    };

    setSession({
        players: newPlayers,
        rounds: [],
        dealerId: 0, // Reset to East
        rules: DEFAULT_RULES
    });
    setView('GAME');
    setIsNewGameModalOpen(false);
  };

  const handleSaveRound = (result: Partial<RoundResult> & { deltas: Record<PlayerId, number> }) => {
    setSession(prev => {
      const newPlayers = { ...prev.players };
      let updatedRounds = [...prev.rounds];
      let newDealerId = prev.dealerId;

      // 1. If Editing, first revert the effects of the old round
      if (editingRound) {
         Object.entries(editingRound.deltas).forEach(([pid, delta]) => {
            newPlayers[parseInt(pid) as PlayerId].score -= (delta as number);
         });
         // We will replace the round in the array later
      }

      // 2. Apply new deltas
      Object.entries(result.deltas).forEach(([pid, delta]) => {
        newPlayers[parseInt(pid) as PlayerId].score += (delta as number);
      });

      // 3. Construct the Round Object
      const roundObj: RoundResult = {
        id: editingRound ? editingRound.id : Date.now().toString(),
        timestamp: editingRound ? editingRound.timestamp : Date.now(), // Keep original timestamp if edit
        type: result.type || 'MANUAL',
        winnerId: result.winnerId ?? null,
        loserId: result.loserId ?? null,
        faan: result.faan,
        deltas: result.deltas,
        note: result.note
      };

      // 4. Update Rounds Array
      if (editingRound) {
         updatedRounds = updatedRounds.map(r => r.id === editingRound.id ? roundObj : r);
      } else {
         updatedRounds = [roundObj, ...updatedRounds]; // Add new to top
      }

      // 5. Update Dealer Logic
      if (!editingRound && roundObj.type === 'CALCULATED' && roundObj.winnerId !== null) {
          if (roundObj.winnerId !== prev.dealerId) {
             newDealerId = ((prev.dealerId + 1) % 4) as PlayerId;
          }
      }

      return {
        ...prev,
        players: newPlayers,
        rounds: updatedRounds,
        dealerId: newDealerId
      };
    });
    
    // Reset Edit State
    setEditingRound(null);
  };

  const confirmDeleteRound = () => {
    if (!roundToDelete) return;
    const roundId = roundToDelete;

    setSession(prev => {
      // Find again in current state for safety
      const roundToDeleteObj = prev.rounds.find(r => r.id === roundId);
      if (!roundToDeleteObj) return prev;

      const newPlayers = { ...prev.players };
      // Revert scores
      Object.entries(roundToDeleteObj.deltas).forEach(([pid, delta]) => {
        newPlayers[parseInt(pid) as PlayerId].score -= (delta as number);
      });

      return {
        ...prev,
        players: newPlayers,
        rounds: prev.rounds.filter(r => r.id !== roundId)
      };
    });
    
    setRoundToDelete(null);
  };

  const handleEditClick = (round: RoundResult) => {
    setEditingRound(round);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRound(null);
  };

  const handleSaveSettings = () => {
    setSession(prev => ({ ...prev, rules: editingRules }));
    setHasUnsavedSettings(false);
    showToastNotification(t('rulesUpdated'));
  };

  const handleResetSettings = () => {
    if(window.confirm(t('resetConfirm'))) {
        setEditingRules(DEFAULT_RULES);
        setHasUnsavedSettings(true);
    }
  };

  const applyPreset = (presetIndex: number) => {
    const preset = SCORING_PRESETS[presetIndex];
    if (preset) {
        setEditingRules(prev => ({
            ...prev,
            ...preset.rules,
            presetId: presetIndex // Save the preset ID
        }));
        setHasUnsavedSettings(true);
    }
  };

  const updateRuleValue = <K extends keyof RuleConfig>(key: K, value: RuleConfig[K]) => {
    setEditingRules(prev => ({ ...prev, [key]: value, presetId: undefined })); // Mark as custom when manually changing
    setHasUnsavedSettings(true);
  };

  // --- Render Helpers ---

  const RoundItem = ({ round }: { round: RoundResult }) => {
    const winner = round.winnerId !== null ? session.players[round.winnerId].name : null;
    const loser = round.loserId !== null ? session.players[round.loserId].name : null;

    let desc = '';
    if (round.type === 'MANUAL') {
        desc = t('manualAdjustment');
    } else if (round.winnerId === null) {
        desc = t('draw');
    } else {
        desc = `${winner} ${t('won')} (${round.faan}${t('faanSuffix')})`;
    }

    let subDesc = '';
    if (round.type === 'CALCULATED') {
        if (round.loserId !== null) subDesc = `${loser} ${t('discardBy')}`;
        else if (round.winnerId !== null) subDesc = t('selfDraw');
    }
    if (round.note) subDesc += ` • ${round.note}`;

    return (
      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-sm flex justify-between items-center group hover:border-indigo-200 transition-colors">
        <div className="flex flex-col flex-1">
           <span className="font-bold text-slate-700">
             {desc}
           </span>
           <span className="text-xs text-slate-400">
             {subDesc}
           </span>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">
              {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex gap-1 pl-2 border-l border-slate-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditClick(round)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                >
                    <Edit2 size={14} />
                </button>
                <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     setRoundToDelete(round.id);
                   }}
                   className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
      </div>
    );
  };

  // --- Views ---

  if (view === 'HOME') {
    return (
      <>
        <LandscapeBlocker />
        <LandingPage 
          hasActiveSession={session.rounds.length > 0 || Object.values(session.players).some(p => p.score !== 0)}
          playerNames={Object.values(session.players).map(p => p.name)}
          onContinue={() => setView('GAME')}
          onNewGame={() => setIsNewGameModalOpen(true)}
          t={t}
        />
        <NewGameModal
          isOpen={isNewGameModalOpen}
          onClose={() => setIsNewGameModalOpen(false)}
          onSubmit={handleStartNewGame}
          t={t}
        />
      </>
    );
  }

  // --- Game View UI ---
  // Layout Logic:
  // Mobile (< md): Top Header, Bottom Nav, Center Content
  // Tablet/Desktop (>= md): Left Sidebar, Center Content, Right Rules (only on XL)
  
  return (
    <div className="flex h-[100dvh] w-full bg-slate-100 overflow-hidden text-slate-900 font-sans">

      <LandscapeBlocker />

      {/* Toast Notification */}
      <Toast message={toastMessage} visible={showToast} />

      {/* --- LEFT SIDEBAR (Tablet/Desktop) --- */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-indigo-900 text-white shrink-0 transition-all duration-300 z-20">
          {/* Logo */}
          <div className="p-4 h-20 flex items-center justify-center lg:justify-start gap-3 border-b border-indigo-800/50 cursor-pointer hover:bg-indigo-800/50 transition-colors" onClick={() => setView('HOME')}>
             <MahjongLogo size={32} className="text-white shrink-0" />
             <div className="hidden lg:block overflow-hidden">
               <h1 className="font-bold text-lg leading-tight truncate">{t('appTitle')}</h1>
               <p className="text-indigo-300 text-[10px] truncate">{t('appSubtitle')}</p>
             </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-6 flex flex-col gap-2 px-2 overflow-y-auto scrollbar-hide">
             <NavItem
               active={activeTab === 'SCORE'}
               onClick={() => setActiveTab('SCORE')}
               icon={User}
               label={t('tabScore')}
             />
             <NavItem
               active={false} // Always opens modal or drawer, not a persistent tab in sidebar mode usually
               onClick={() => setIsRulesModalOpen(true)}
               icon={BookOpen}
               label={t('tabRules')}
               className="xl:hidden" // Hide on XL where right sidebar exists
             />
             <NavItem
               active={activeTab === 'HISTORY'}
               onClick={() => setActiveTab('HISTORY')}
               icon={History}
               label={t('tabHistory')}
             />
             
             <div className="flex-1 my-2 border-t border-indigo-800/30 mx-2"></div>
             
             <NavItem
               active={activeTab === 'SETTINGS'}
               onClick={() => setActiveTab('SETTINGS')}
               icon={Settings}
               label={t('tabSettings')}
             />
             <NavItem
               active={false}
               onClick={() => setView('HOME')}
               icon={LogOut}
               label={t('cancel')} // Using 'Cancel' as exit text or icon
               className="mt-auto opacity-50 hover:opacity-100"
             />
          </nav>

          {/* Footer */}
           <div className="p-4 text-center text-indigo-400 text-[10px] hidden lg:block">
              {t('footer')}
           </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50 md:bg-white md:rounded-l-3xl shadow-2xl z-0">
        
        {/* Mobile Header (Hidden on MD+) */}
        <header className="md:hidden bg-indigo-700 text-white p-4 flex justify-between items-center shadow-md shrink-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={() => setView('HOME')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <MahjongLogo size={24} className="text-white" /> 
                    <span className="font-bold text-lg">{t('appTitle')}</span>
                </button>
            </div>
        </header>

        {/* Content Area - Uses Flex Column, but no global overflow-auto here. 
            Overflow is handled per-tab to ensure layout control. */}
        <main className="flex-1 flex flex-col overflow-hidden relative w-full">
            
            {/* Mobile FAB - Global (Visible on all tabs) */}
            <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl border-4 border-slate-100 transition-transform active:scale-95"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>

            {/* Tablet/Desktop FAB - Visible only on Score tab (or could be global if desired) */}
            {activeTab === 'SCORE' && (
                <div className="hidden md:block absolute bottom-8 right-8 z-30">
                        <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl w-16 h-16 flex items-center justify-center shadow-2xl shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:-translate-y-1 transition-all"
                    >
                            <Plus size={32} strokeWidth={3} />
                    </button>
                </div>
            )}
                
            {/* TAB: SCORE - SPLIT LAYOUT */}
            {activeTab === 'SCORE' && (
            <>
                {/* 1. FIXED TOP: Player Scores */}
                <div className="shrink-0 p-4 md:p-8 pb-4 md:pb-6 bg-slate-50/80 backdrop-blur-sm z-10">
                    <div className="max-w-6xl mx-auto w-full">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                            {(Object.values(session.players) as Player[]).map(p => {
                                const scoreColor = p.score > 0 ? 'text-green-600' : p.score < 0 ? 'text-red-600' : 'text-slate-600';
                                return (
                                <div key={p.id} className="bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-indigo-300 transition-colors">
                                    <div className="flex flex-row lg:flex-col items-center lg:items-start gap-2 mb-1 md:mb-2">
                                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs md:text-sm border border-slate-200">
                                        {p.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-800 truncate text-sm md:text-base">{p.name}</span>
                                    </div>
                                    <div className={`text-2xl md:text-3xl font-mono font-bold tracking-tight ${scoreColor}`}>
                                    {p.score > 0 ? '+' : ''}{p.score}
                                    </div>
                                    {/* Decorative Wind */}
                                    <div className="absolute top-1 right-2 opacity-10 text-2xl font-serif select-none pointer-events-none text-slate-900">
                                        {p.wind}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. SCROLLABLE BOTTOM: Recent History */}
                <div className="flex-1 min-h-0 px-4 md:px-8 pb-24 md:pb-8 flex flex-col">
                    <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
                        {/* Section Header - Fixed */}
                        <div className="shrink-0 mb-3 md:mb-4 flex items-center justify-between">
                            <h3 className="text-sm md:text-base font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <ScrollText size={16} className="text-indigo-500" />
                                {t('recentHistory')}
                            </h3>
                            <button onClick={() => setActiveTab('HISTORY')} className="text-xs text-indigo-600 font-bold hover:underline">
                                {t('tabHistory')} →
                            </button>
                        </div>

                        {/* History Card - Scrollable */}
                        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-2">
                                {session.rounds.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                        <History size={48} className="mb-4 opacity-20" />
                                        <p className="text-sm">{t('noRounds')}</p>
                                    </div>
                                ) : (
                                    session.rounds.slice(0, 10).map((round, idx) => (
                                        <RoundItem key={round.id} round={round} />
                                    ))
                                )}
                                {session.rounds.length > 10 && (
                                    <div className="text-center py-4">
                                        <button
                                            onClick={() => setActiveTab('HISTORY')}
                                            className="text-xs text-slate-400 hover:text-indigo-600 font-medium"
                                        >
                                            View all history...
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
            )}

            {/* TAB: HISTORY (Full) */}
            {activeTab === 'HISTORY' && (
            <>
                {/* Fixed Header */}
                <div className="shrink-0 p-4 md:p-8 pb-0 md:pb-2 bg-slate-50 md:bg-white">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-slate-800 hidden md:block">{t('tabHistory')}</h2>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-8 pb-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="space-y-4 pt-2">
                        {session.rounds.map(round => (
                            <div key={round.id} className="group relative">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold mb-1 ${round.type === 'MANUAL' ? 'bg-amber-100 text-amber-700' : round.winnerId === null ? 'bg-slate-100 text-slate-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {round.type === 'MANUAL' ? t('manual') : round.winnerId === null ? t('draw') : `${round.faan} ${t('faanSuffix')}`}
                                    </span>
                                    {round.note && <div className="text-sm italic text-slate-600 mt-1">{round.note}</div>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400">{new Date(round.timestamp).toLocaleTimeString()}</span>
                                    
                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditClick(round)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded">
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRoundToDelete(round.id);
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2 pt-2 border-t border-slate-100">
                                    {Object.entries(round.deltas).map(([pid, d]) => {
                                    const delta = d as number;
                                    if (delta === 0) return null;
                                    return (
                                        <div key={pid} className="flex justify-between md:flex-col md:items-start">
                                        <span className="text-slate-500 text-xs">{session.players[parseInt(pid) as PlayerId].name}</span>
                                        <span className={`font-mono font-bold text-base ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {delta > 0 ? '+' : ''}{delta}
                                        </span>
                                        </div>
                                    )
                                    })}
                                </div>
                            </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            </>
            )}

            {/* TAB: SETTINGS (Editable) */}
            {activeTab === 'SETTINGS' && (
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-10 pb-32">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">{t('rulesConfig')}</h2>
                        <button 
                        onClick={handleResetSettings}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-full hover:text-indigo-600 transition-colors"
                        title={t('resetRules')}
                        >
                        <RotateCw size={20} />
                        </button>
                    </div>

                    {/* Language Selector */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 text-slate-700 font-bold">
                            <Globe size={20} className="text-indigo-600" />
                            {t('language')}
                        </div>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                            <button 
                            onClick={() => setLang('zh-HK')} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'zh-HK' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                            >
                            繁體
                            </button>
                            <button 
                            onClick={() => setLang('en')} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${lang === 'en' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                            >
                            EN
                            </button>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-6 rounded-2xl mb-8 shadow-sm">
                        <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm text-indigo-600 border border-indigo-50">
                                <Settings size={18} /> 
                            </div>
                            {t('quickPreset')}
                        </h3>
                        
                        <PresetSelector
                            presets={SCORING_PRESETS}
                            onSelect={applyPreset}
                            lang={lang}
                            t={t}
                            currentPresetId={editingRules.presetId}
                        />
                    </div>

                    {/* Formula & Price Configuration */}
                    <div className="space-y-6 mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{t('parameters')}</h3>
                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-start gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-indigo-600 mt-0.5 bg-white p-2 rounded-lg shadow-sm">
                                    <Sigma size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-slate-400 font-mono mb-1 uppercase">{t('scoringFormula')}</div>
                                    <div className="font-bold text-slate-800 text-base md:text-lg">
                                        {t('formulaText')}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">{t('unitPrice')}</label>
                                    <p className="text-xs text-slate-400 mb-2">{t('baseValue')}</p>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input 
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={editingRules.unitPrice}
                                            onChange={(e) => updateRuleValue('unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-xl px-4 pl-8 py-3 font-mono font-bold text-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <span className="font-bold text-slate-700 block text-sm mb-2">{t('minFaan')}</span>
                                        <input 
                                            type="number" 
                                            value={editingRules.minFaan}
                                            onChange={(e) => updateRuleValue('minFaan', Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-3 text-center font-bold text-lg focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-bold text-slate-700 block text-sm mb-2">{t('maxFaan')}</span>
                                        <input 
                                            type="number" 
                                            value={editingRules.maxFaan}
                                            onChange={(e) => updateRuleValue('maxFaan', parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-3 text-center font-bold text-lg focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Preview Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-4 shadow-sm">
                            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 py-3 px-6 uppercase tracking-wider">
                            <div>{t('faan')}</div>
                            <div className="col-span-2 text-right">{t('chips')}</div>
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {[...Array(11)].map((_, i) => (
                                <div key={i} className={`flex justify-between items-center px-6 py-3 border-b border-slate-50 last:border-0 ${i < editingRules.minFaan || i > editingRules.maxFaan ? 'opacity-30 bg-slate-50' : 'bg-white'}`}>
                                    <span className="font-mono text-sm text-slate-600 font-medium">
                                        {i} {t('faanSuffix')} 
                                        {i === editingRules.maxFaan && <span className="text-[10px] ml-1 text-red-500 bg-red-50 px-1 rounded border border-red-100">{t('cap')}</span>}
                                        {i === editingRules.minFaan && <span className="text-[10px] ml-1 text-green-500 bg-green-50 px-1 rounded border border-green-100">{t('min')}</span>}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {calculateBaseValue(Math.min(Math.max(i, editingRules.minFaan), editingRules.maxFaan), editingRules.unitPrice)}
                                    </span>
                                </div>
                                ))}
                                {editingRules.maxFaan >= 10 && (
                                     <div className="text-center py-2 text-xs text-slate-400 bg-slate-50">
                                         ...
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Save Button - Fixed at bottom of settings */}
                    <div className={`fixed bottom-20 md:bottom-0 left-0 md:left-20 lg:left-64 right-0 xl:right-96 p-3 md:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between transition-all duration-300 z-[25] ${hasUnsavedSettings ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center gap-2 text-amber-600">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium">有未儲存的變更</span>
                        </div>
                        <button
                        onClick={handleSaveSettings}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 md:px-6 md:py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold active:scale-95 transition-all"
                        >
                        <Save size={18} /> {t('saveSettings')}
                        </button>
                    </div>
                </div>
            </div>
            )}

        </main>

        {/* Mobile Bottom Nav (Hidden on MD+) */}
        <nav className="md:hidden absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around py-2 pb-5 z-20 text-xs font-medium text-slate-500">
            <button 
            onClick={() => setActiveTab('SCORE')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'SCORE' ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
            <User size={22} strokeWidth={activeTab === 'SCORE' ? 2.5 : 2} /> <span className="text-[10px]">{t('tabScore')}</span>
            </button>

            {/* Rules Button */}
            <button 
                onClick={() => setIsRulesModalOpen(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-50"
            >
                <BookOpen size={22} /> <span className="text-[10px]">{t('tabRules')}</span>
            </button>

            <button 
            className="w-12" 
            disabled 
            /* Spacer for FAB */ 
            />
            <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'HISTORY' ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
            <History size={22} strokeWidth={activeTab === 'HISTORY' ? 2.5 : 2} /> <span className="text-[10px]">{t('tabHistory')}</span>
            </button>
            <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'SETTINGS' ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
            <Settings size={22} strokeWidth={activeTab === 'SETTINGS' ? 2.5 : 2} /> <span className="text-[10px]">{t('tabSettings')}</span>
            </button>
        </nav>

      </div>

      {/* --- RIGHT SIDEBAR: RULES (XL Desktop Only) --- */}
      <aside className="hidden xl:flex w-96 bg-white border-l border-slate-200 shrink-0 flex-col z-10 shadow-xl">
           <HKMJRules t={t} className="h-full border-0 rounded-none shadow-none" />
      </aside>

      {/* Rules Modal (Mobile & Tablet) */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm xl:hidden">
             <div className="w-full max-w-md h-[80vh] flex flex-col animate-fade-in-up">
                 <HKMJRules t={t} onClose={() => setIsRulesModalOpen(false)} className="w-full h-full" />
             </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roundToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('deleteRoundTitle')}</h3>
            <p className="text-slate-600 mb-4 text-sm">{t('deleteConfirmBody')}</p>
            
            {/* Impact List */}
            <div className="bg-slate-50 rounded-lg p-3 mb-6 space-y-2">
                {(() => {
                    const r = session.rounds.find(rd => rd.id === roundToDelete);
                    if (!r) return null;
                    return Object.entries(r.deltas)
                        .filter(([_, delta]) => (delta as number) !== 0)
                        .map(([pid, delta]) => {
                           const player = session.players[parseInt(pid) as PlayerId];
                           const amount = -(delta as number);
                           return (
                               <div key={pid} className="flex justify-between text-sm">
                                   <span className="text-slate-600">{player.name}</span>
                                   <span className={`font-mono font-bold ${amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                       {amount > 0 ? '+' : ''}{amount}
                                   </span>
                               </div>
                           );
                        });
                })()}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRoundToDelete(null)} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                {t('cancel')}
              </button>
              <button onClick={confirmDeleteRound} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition-colors">
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewRoundModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        players={session.players}
        dealerId={session.dealerId}
        rules={session.rules}
        initialData={editingRound}
        onSubmit={handleSaveRound}
        t={t}
      />
    </div>
  );
}