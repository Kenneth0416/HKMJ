import React, { useState, useEffect, useRef } from 'react';
import { GameSession, PlayerId, Player, RoundResult, Wind, RuleConfig, WinType } from './types';
import { DEFAULT_RULES, MOCK_PLAYERS, SCORING_PRESETS, ROUND_WINDS_ORDER, ROUND_WIND_NAMES, DEFAULT_HORSE_CONFIG } from './constants';
import { calculateBaseValue } from './services/scoringService';
import { getTranslation, Language, translations } from './translations';
import NewRoundModal from './components/NewRoundModal';
import NewGameModal from './components/NewGameModal';
import LandingPage from './components/LandingPage';
import PresetSelector from './components/PresetSelector';
import HKMJRules from './components/HKMJRules';
import { MahjongLogo } from './components/Logo';
import { History, Settings, User, Trash2, Coins, Save, RotateCw, Edit2, Globe, BookOpen, Smartphone, Plus, LogOut, ScrollText, CheckCircle, Users, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// Check if running on native platform
const isNative = Capacitor.isNativePlatform();

// Animation keyframes for horse settings
const animationStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0);
  }
}
`;

// --- Toast Notification Component ---

type ToastType = 'success' | 'delete' | 'edit' | 'info';

const Toast = ({ message, visible, type = 'success' }: { message: string; visible: boolean; type?: ToastType }) => {
  const styles: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-emerald-600', icon: <CheckCircle size={20} /> },
    delete: { bg: 'bg-red-500', icon: <Trash2 size={20} /> },
    edit: { bg: 'bg-indigo-600', icon: <Edit2 size={20} /> },
    info: { bg: 'bg-slate-700', icon: <Sparkles size={20} /> },
  };

  const style = styles[type];

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <div className={`${style.bg} text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 font-medium`}>
        {style.icon}
        {message}
      </div>
    </div>
  );
};

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

  // Inject animation keyframes
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = animationStyles;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  // --- Native platform optimizations ---
  useEffect(() => {
    if (isNative) {
      // Disable overscroll/bounce behavior only
      document.body.style.overscrollBehavior = 'none';
    }
  }, []);

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
      // Migration: add roundWind and dealerCount if missing
      if (!parsed.roundWind) parsed.roundWind = 'EAST';
      if (parsed.dealerCount === undefined) parsed.dealerCount = 0;
      // Migration: add horse config if missing
      if (!parsed.rules.horse) {
        parsed.rules.horse = DEFAULT_HORSE_CONFIG;
      }
      return parsed;
    }
    return {
      players: MOCK_PLAYERS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<PlayerId, Player>),
      rounds: [],
      dealerId: 0 as PlayerId,
      rules: DEFAULT_RULES,
      roundWind: 'EAST' as const,
      dealerCount: 0
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SCORE' | 'RULES' | 'HISTORY' | 'SETTINGS'>('SCORE');
  const [isSeatEditorOpen, setIsSeatEditorOpen] = useState(false);

  // Delete Modal State
  const [roundToDelete, setRoundToDelete] = useState<string | null>(null);

  // Edit State
  const [editingRound, setEditingRound] = useState<RoundResult | null>(null);

  // Settings Tab Local State
  const [editingRules, setEditingRules] = useState<RuleConfig>(session.rules);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [isHorseSettingsOpen, setIsHorseSettingsOpen] = useState(false);

  // Seat Editor State
  const [editingSeats, setEditingSeats] = useState<PlayerId[]>([0, 1, 2, 3]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToastNotification = (message: string, type: ToastType = 'success') => {
    setToastMessage(message);
    setToastType(type);
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
        rules: DEFAULT_RULES,
        roundWind: 'EAST',
        dealerCount: 0
    });
    setView('GAME');
    setIsNewGameModalOpen(false);
  };

  const handleSaveRound = (result: Partial<RoundResult> & { deltas: Record<PlayerId, number> }) => {
    setSession(prev => {
      const newPlayers = { ...prev.players };
      let updatedRounds = [...prev.rounds];
      let newDealerId = prev.dealerId;
      let newRoundWind = prev.roundWind;
      let newDealerCount = prev.dealerCount;

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
        note: result.note,
        horseHits: result.horseHits
      };

      // 4. Update Rounds Array
      if (editingRound) {
         updatedRounds = updatedRounds.map(r => r.id === editingRound.id ? roundObj : r);
      } else {
         updatedRounds = [roundObj, ...updatedRounds]; // Add new to top
      }

      // 5. Update Dealer Logic (HKMJ rules)
      // - If dealer wins (self-draw or discard), dealer continues (dealerCount++)
      // - If non-dealer wins, dealer passes to next player
      // - If draw (流局), dealer passes to next player (過莊)
      // - After dealer passes 4 times (back to original East), advance to next round wind
      if (!editingRound && roundObj.type === 'CALCULATED') {
        if (roundObj.winnerId === null) {
          // Draw (流局) - pass dealer (過莊)
          newDealerId = ((prev.dealerId + 1) % 4) as PlayerId;
          newDealerCount = 0;

          // Check if we've completed a full round
          if (newDealerId === 0) {
            const currentWindIndex = ROUND_WINDS_ORDER.indexOf(prev.roundWind);
            const nextWindIndex = (currentWindIndex + 1) % 4;
            newRoundWind = ROUND_WINDS_ORDER[nextWindIndex];
          }
        } else if (roundObj.winnerId === prev.dealerId) {
          // Dealer wins - dealer continues
          newDealerCount++;
        } else {
          // Non-dealer wins - pass dealer
          newDealerId = ((prev.dealerId + 1) % 4) as PlayerId;
          newDealerCount = 0;

          // Check if we've completed a full round
          if (newDealerId === 0) {
            const currentWindIndex = ROUND_WINDS_ORDER.indexOf(prev.roundWind);
            const nextWindIndex = (currentWindIndex + 1) % 4;
            newRoundWind = ROUND_WINDS_ORDER[nextWindIndex];
          }
        }
      }

      // Note: Player winds (門風) - configurable via windFollowsDealer
      // When enabled, dealer is always East, others follow in order
      if (prev.rules.windFollowsDealer && newDealerId !== prev.dealerId) {
        const winds = [Wind.East, Wind.South, Wind.West, Wind.North];
        Object.keys(newPlayers).forEach(pid => {
          const playerId = parseInt(pid) as PlayerId;
          const relativePos = (playerId - newDealerId + 4) % 4;
          newPlayers[playerId].wind = winds[relativePos];
        });
      }

      return {
        ...prev,
        players: newPlayers,
        rounds: updatedRounds,
        dealerId: newDealerId,
        roundWind: newRoundWind,
        dealerCount: newDealerCount
      };
    });

    // Reset Edit State
    setEditingRound(null);

    // Show success toast
    showToastNotification(editingRound ? '紀錄已更新' : '紀錄已新增', editingRound ? 'edit' : 'success');
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
    showToastNotification('紀錄已刪除', 'delete');
  };

  const handleEditClick = (round: RoundResult) => {
    setEditingRound(round);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRound(null);
  };

  // Seat Editor Functions
  const openSeatEditor = () => {
    // Initialize with current player order (by seat/wind)
    const currentOrder = [0, 1, 2, 3] as PlayerId[];
    setEditingSeats(currentOrder);
    setIsSeatEditorOpen(true);
  };

  const swapSeats = (index1: number, index2: number) => {
    setEditingSeats(prev => {
      const newOrder = [...prev];
      [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];
      return newOrder;
    });
  };

  const handleSaveSeats = () => {
    setSession(prev => {
      const newPlayers = { ...prev.players };

      // Create a mapping of new positions
      const winds = [Wind.East, Wind.South, Wind.West, Wind.North];
      const oldPlayers = { ...prev.players };

      // Reassign players to new seats
      editingSeats.forEach((playerId, seatIndex) => {
        newPlayers[seatIndex as PlayerId] = {
          ...oldPlayers[playerId],
          id: seatIndex as PlayerId,
          wind: winds[seatIndex]
        };
      });

      // Update dealerId to match the new position of the current dealer
      const oldDealerId = prev.dealerId;
      const newDealerIndex = editingSeats.indexOf(oldDealerId);
      const newDealerId = (newDealerIndex >= 0 ? newDealerIndex : 0) as PlayerId;

      return {
        ...prev,
        players: newPlayers,
        dealerId: newDealerId
      };
    });

    setIsSeatEditorOpen(false);
    showToastNotification('座位已更新');
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
      <div className="min-h-screen">
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
      </div>
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
      <Toast message={toastMessage} visible={showToast} type={toastType} />

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
               active={activeTab === 'RULES'}
               onClick={() => setActiveTab('RULES')}
               icon={BookOpen}
               label={t('tabRules')}
               className="xl:hidden"
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
               label={t('cancel')}
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
                        {/* Round Wind Indicator */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                {ROUND_WIND_NAMES[session.roundWind][lang]}
                            </span>
                            <span className="text-slate-400 text-sm">
                                {lang === 'zh-HK' ? `第 ${session.dealerCount + 1} 巡` : `Hand ${session.dealerCount + 1}`}
                            </span>
                            <button
                                onClick={openSeatEditor}
                                className="ml-2 p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                                title={lang === 'zh-HK' ? '編輯座位' : 'Edit Seats'}
                            >
                                <Users size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                            {[0, 1, 3, 2].map(playerId => {
                                const p = session.players[playerId as PlayerId];
                                const scoreColor = p.score > 0 ? 'text-green-600' : p.score < 0 ? 'text-red-600' : 'text-slate-600';
                                const isDealer = p.id === session.dealerId;
                                return (
                                <div key={p.id} className={`bg-white p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm border relative overflow-hidden group transition-colors ${isDealer ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}>
                                    <div className="flex flex-row lg:flex-col items-center lg:items-start gap-2 mb-1 md:mb-2">
                                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm border ${isDealer ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {p.wind}
                                    </div>
                                    <span className="font-bold text-slate-800 truncate text-sm md:text-base">{p.name}</span>
                                    </div>
                                    <div className={`text-2xl md:text-3xl font-mono font-bold tracking-tight ${scoreColor}`}>
                                    {p.score > 0 ? '+' : ''}{p.score}
                                    </div>
                                    {/* Dealer Indicator */}
                                    {isDealer && (
                                        <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                            莊
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. SCROLLABLE BOTTOM: Recent History */}
                <div className="flex-1 min-h-0 px-4 md:px-8 pb-24 md:pr-24 flex flex-col">
                    <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
                        {/* Section Header - Fixed */}
                        <div className="shrink-0 mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <ScrollText size={16} className="text-indigo-500" />
                                {t('recentHistory')}
                            </h3>
                            <button onClick={() => setActiveTab('HISTORY')} className="text-xs text-indigo-600 font-bold hover:underline">
                                {t('tabHistory')} →
                            </button>
                        </div>

                        {/* History Card - Scrollable */}
                        <div className="flex-1 min-h-0 max-h-[calc(100%-2.5rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
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

            {/* TAB: RULES (Mobile & Tablet only - XL has sidebar) */}
            {activeTab === 'RULES' && (
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 pb-24 xl:hidden">
                <div className="max-w-2xl mx-auto">
                    <HKMJRules t={t} className="w-full" />
                </div>
            </div>
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

                    {/* Horse (跑馬仔) Settings - Touch-optimized responsive card */}
                    <div className={`mb-6 md:mb-8 rounded-2xl md:rounded-3xl transition-all duration-300 ${editingRules.horse?.enabled ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-lg shadow-amber-100/50' : 'bg-white border border-slate-200 shadow-sm hover:border-amber-200'}`}>
                      {/* Header - Always visible, larger touch target */}
                      <div
                        className="p-4 md:p-5 flex items-center justify-between cursor-pointer active:bg-amber-50/50 md:active:bg-transparent transition-colors"
                        onClick={() => {
                          setEditingRules(prev => ({
                            ...prev,
                            horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, enabled: !prev.horse?.enabled }
                          }));
                          setHasUnsavedSettings(true);
                        }}
                      >
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all duration-300 ${editingRules.horse?.enabled ? 'bg-amber-400 text-white shadow-lg shadow-amber-300/50' : 'bg-slate-100 text-slate-400'}`}>
                            <Sparkles size={22} className="md:w-6 md:h-6" />
                          </div>
                          <div>
                            <div className={`font-bold text-base md:text-lg transition-colors duration-300 ${editingRules.horse?.enabled ? 'text-amber-900' : 'text-slate-700'}`}>
                              {t('horseEnabled')}
                            </div>
                            <div className={`text-xs md:text-sm transition-colors duration-300 ${editingRules.horse?.enabled ? 'text-amber-600' : 'text-slate-400'}`}>
                              {editingRules.horse?.enabled
                                ? (lang === 'zh-HK' ? `${editingRules.horse.horseCount} 馬 · 每馬 ${editingRules.horse.perHorseValue} 底` : `${editingRules.horse.horseCount} horses · ${editingRules.horse.perHorseValue} unit each`)
                                : (lang === 'zh-HK' ? '點擊啟用跑馬仔' : 'Tap to enable horses')}
                            </div>
                          </div>
                        </div>
                        {/* Toggle Switch - Larger for touch */}
                        <div
                          className={`w-16 h-9 md:w-14 md:h-8 rounded-full transition-all duration-300 ${editingRules.horse?.enabled ? 'bg-amber-500 shadow-lg shadow-amber-300/50' : 'bg-slate-200'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingRules(prev => ({
                                ...prev,
                                horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, enabled: !prev.horse?.enabled }
                              }));
                              setHasUnsavedSettings(true);
                            }}
                            className="w-full h-full"
                          >
                            <div className={`w-7 h-7 md:w-6 md:h-6 bg-white rounded-full shadow-lg transition-all duration-300 mt-1 ${editingRules.horse?.enabled ? 'translate-x-8 md:translate-x-7' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      {editingRules.horse?.enabled && (
                        <div className="px-4 pb-4 md:px-5 md:pb-5 animate-[slideDown_0.3s_ease-out]">
                          <div className="pt-4 md:pt-5 border-t border-amber-200/50 space-y-5 md:space-y-6">
                            {/* Row 1: Horse Count & Per Horse Value - Full width on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 animate-[slideIn_0.3s_ease-out_0.05s_both]">
                              <div>
                                <label className="text-xs md:text-sm font-semibold text-amber-700 block mb-2">{t('horseCount')}</label>
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button
                                    onClick={() => {
                                      const newCount = Math.max(1, (editingRules.horse?.horseCount || 4) - 1);
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, horseCount: newCount }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className="w-12 h-12 md:w-11 md:h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-xl md:text-lg hover:bg-amber-50 active:scale-90 md:active:scale-95 transition-all touch-manipulation"
                                  >−</button>
                                  <input
                                    type="number"
                                    min="1"
                                    max="13"
                                    value={editingRules.horse?.horseCount ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Allow empty input during typing
                                      if (val === '') {
                                        setEditingRules(prev => ({
                                          ...prev,
                                          horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, horseCount: undefined as any }
                                        }));
                                      } else {
                                        const parsed = parseInt(val);
                                        if (!isNaN(parsed)) {
                                          setEditingRules(prev => ({
                                            ...prev,
                                            horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, horseCount: Math.min(13, Math.max(1, parsed)) }
                                          }));
                                          setHasUnsavedSettings(true);
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Restore default on blur if empty or invalid
                                      const val = e.target.value;
                                      if (val === '' || parseInt(val) < 1) {
                                        setEditingRules(prev => ({
                                          ...prev,
                                          horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, horseCount: 4 }
                                        }));
                                        setHasUnsavedSettings(true);
                                      }
                                    }}
                                    className="flex-1 h-12 md:h-11 bg-white text-amber-900 border-2 border-amber-200 rounded-xl text-center font-bold text-xl md:text-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const newCount = Math.min(13, (editingRules.horse?.horseCount || 4) + 1);
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, horseCount: newCount }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className="w-12 h-12 md:w-11 md:h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-xl md:text-lg hover:bg-amber-50 active:scale-90 md:active:scale-95 transition-all touch-manipulation"
                                  >+</button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs md:text-sm font-semibold text-amber-700 block mb-2">{t('perHorseValue')} ({lang === 'zh-HK' ? '底' : 'unit'})</label>
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button
                                    onClick={() => {
                                      const newVal = Math.max(0.5, (editingRules.horse?.perHorseValue || 1) - 0.5);
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, perHorseValue: newVal }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className="w-12 h-12 md:w-11 md:h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-xl md:text-lg hover:bg-amber-50 active:scale-90 md:active:scale-95 transition-all touch-manipulation"
                                  >−</button>
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={editingRules.horse?.perHorseValue ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Allow empty input during typing
                                      if (val === '') {
                                        setEditingRules(prev => ({
                                          ...prev,
                                          horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, perHorseValue: undefined as any }
                                        }));
                                      } else {
                                        const parsed = parseFloat(val);
                                        if (!isNaN(parsed)) {
                                          setEditingRules(prev => ({
                                            ...prev,
                                            horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, perHorseValue: Math.max(0.5, parsed) }
                                          }));
                                          setHasUnsavedSettings(true);
                                        }
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Restore default on blur if empty or invalid
                                      const val = e.target.value;
                                      if (val === '' || parseFloat(val) < 0.5) {
                                        setEditingRules(prev => ({
                                          ...prev,
                                          horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, perHorseValue: 1 }
                                        }));
                                        setHasUnsavedSettings(true);
                                      }
                                    }}
                                    className="flex-1 h-12 md:h-11 bg-white text-amber-900 border-2 border-amber-200 rounded-xl text-center font-bold text-xl md:text-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const newVal = (editingRules.horse?.perHorseValue || 1) + 0.5;
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, perHorseValue: newVal }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className="w-12 h-12 md:w-11 md:h-11 rounded-xl bg-white border-2 border-amber-200 text-amber-600 font-bold text-xl md:text-lg hover:bg-amber-50 active:scale-90 md:active:scale-95 transition-all touch-manipulation"
                                  >+</button>
                                </div>
                              </div>
                            </div>

                            {/* Payout Mode - Larger buttons for touch */}
                            <div className="animate-[slideIn_0.3s_ease-out_0.1s_both]">
                              <label className="text-xs md:text-sm font-semibold text-amber-700 block mb-2 md:mb-3">{t('horsePayoutMode')}</label>
                              <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {(['ADD_UNITS', 'ADD_FAAN', 'MULTIPLIER'] as const).map((mode) => (
                                  <button
                                    key={mode}
                                    onClick={() => {
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, payoutMode: mode }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className={`py-3.5 md:py-3 px-2 md:px-3 text-sm md:text-xs rounded-xl border-2 font-semibold transition-all duration-200 touch-manipulation ${
                                      editingRules.horse?.payoutMode === mode
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50 active:scale-90 md:active:scale-95'
                                    }`}
                                  >
                                    {t(mode === 'ADD_UNITS' ? 'addUnits' : mode === 'ADD_FAAN' ? 'addFaan' : 'multiplier')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Liability */}
                            <div className="animate-[slideIn_0.3s_ease-out_0.15s_both]">
                              <label className="text-xs md:text-sm font-semibold text-amber-700 block mb-2 md:mb-3">{t('horseLiability')}</label>
                              <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {(['ALL_PAY', 'DISCARDER_PAYS', 'SPLIT_PAY'] as const).map((liability) => (
                                  <button
                                    key={liability}
                                    onClick={() => {
                                      setEditingRules(prev => ({
                                        ...prev,
                                        horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, liability }
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className={`py-3.5 md:py-3 px-2 md:px-3 text-sm md:text-xs rounded-xl border-2 font-semibold transition-all duration-200 touch-manipulation ${
                                      editingRules.horse?.liability === liability
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50 active:scale-90 md:active:scale-95'
                                    }`}
                                  >
                                    {t(liability === 'ALL_PAY' ? 'allPay' : liability === 'DISCARDER_PAYS' ? 'discarderPays' : 'splitPay')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Cap Applies - Larger touch target */}
                            <div className="flex items-center justify-between py-2 animate-[slideIn_0.3s_ease-out_0.2s_both]">
                              <div className="flex items-center gap-2">
                                <span className="text-sm md:text-base font-semibold text-amber-700">{t('horseCapApplies')}</span>
                                <span className="hidden sm:inline text-xs text-amber-500/70">({lang === 'zh-HK' ? '上限生效' : 'Cap applies'})</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingRules(prev => ({
                                    ...prev,
                                    horse: { ...DEFAULT_HORSE_CONFIG, ...prev.horse, capApplies: !prev.horse?.capApplies }
                                  }));
                                  setHasUnsavedSettings(true);
                                }}
                                className={`w-14 h-8 rounded-full transition-all duration-300 touch-manipulation ${editingRules.horse?.capApplies ? 'bg-amber-500 shadow-lg shadow-amber-300/50' : 'bg-amber-200'}`}
                              >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 mt-1 ${editingRules.horse?.capApplies ? 'translate-x-7' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Configuration */}
                    <div className="space-y-6 mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{t('parameters')}</h3>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

                        {/* Wind Follows Dealer Toggle */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-slate-700 block">{lang === 'zh-HK' ? '門風跟莊轉' : 'Wind Follows Dealer'}</span>
                                    <span className="text-xs text-slate-400">{lang === 'zh-HK' ? '莊家永遠是東位' : 'Dealer is always East'}</span>
                                </div>
                                <button
                                    onClick={() => {
                                      setEditingRules(prev => ({
                                        ...prev,
                                        windFollowsDealer: !prev.windFollowsDealer
                                      }));
                                      setHasUnsavedSettings(true);
                                    }}
                                    className={`w-14 h-8 rounded-full transition-colors ${editingRules.windFollowsDealer ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${editingRules.windFollowsDealer ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
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

            <button
                onClick={() => setActiveTab('RULES')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'RULES' ? 'text-indigo-600 bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
                <BookOpen size={22} strokeWidth={activeTab === 'RULES' ? 2.5 : 2} /> <span className="text-[10px]">{t('tabRules')}</span>
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

      {/* Delete Confirmation Modal */}
      {roundToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setRoundToDelete(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
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

      {/* Seat Editor Modal */}
      {isSeatEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsSeatEditorOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-700 p-4 text-white flex items-center gap-2">
              <Users size={20} />
              <h2 className="text-lg font-bold">{lang === 'zh-HK' ? '編輯座位' : 'Edit Seats'}</h2>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-500 mb-4">
                {lang === 'zh-HK' ? '長按並拖拽卡片調整座位' : 'Long press and drag to reorder'}
              </p>

              <div className="space-y-2 relative" ref={(container) => {
                // Store container ref for bounds calculation
                if (container) {
                  (window as any).__seatEditorContainer = container;
                }
              }}>
                {editingSeats.map((playerId, index) => {
                  const player = session.players[playerId];
                  const winds = [Wind.East, Wind.South, Wind.West, Wind.North];
                  const isDealer = playerId === session.dealerId;
                  const isDragging = draggedIndex === index;
                  const isDragTarget = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;

                  const handleTouchStart = (e: React.TouchEvent) => {
                    const touch = e.touches[0];
                    setTouchStartY(touch.clientY);
                    setDragOffsetY(0);
                  };

                  const handleTouchMove = (e: React.TouchEvent) => {
                    const touch = e.touches[0];
                    if (touchStartY === null) return;

                    const clientY = touch.clientY;
                    const deltaY = clientY - touchStartY;

                    // Start dragging if moved enough
                    if (Math.abs(deltaY) > 5 && draggedIndex === null) {
                      setDraggedIndex(index);
                    }

                    if (draggedIndex !== null) {
                      setDragOffsetY(deltaY);

                      // Use insertion point algorithm - compare with midY of each card
                      const elements = document.querySelectorAll('[data-seat-card]');
                      const rects = Array.from(elements).map(el => el.getBoundingClientRect());
                      const cardHeight = rects[0]?.height || 56;

                      // Find insertion index based on clientY position
                      let newInsertIndex = draggedIndex;

                      for (let i = 0; i < rects.length; i++) {
                        const rect = rects[i];
                        const midY = rect.top + rect.height / 2;

                        if (i < draggedIndex) {
                          // Cards above: if clientY is above their midpoint, insert here
                          if (clientY < midY) {
                            newInsertIndex = i;
                            break;
                          }
                        } else if (i > draggedIndex) {
                          // Cards below: if clientY is below their midpoint, insert after them
                          if (clientY > midY) {
                            newInsertIndex = i;
                          }
                        }
                      }

                      if (newInsertIndex !== dragOverIndex) {
                        setDragOverIndex(newInsertIndex);
                      }
                    }
                  };

                  const handleTouchEnd = () => {
                    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                      setEditingSeats(prev => {
                        const newOrder = [...prev];
                        const draggedItem = newOrder[draggedIndex];
                        // Remove dragged item
                        newOrder.splice(draggedIndex, 1);
                        // Insert at new position
                        newOrder.splice(dragOverIndex, 0, draggedItem);
                        return newOrder;
                      });
                      // Update draggedIndex to new position for continuous dragging
                      setDraggedIndex(dragOverIndex);
                    } else {
                      setDraggedIndex(null);
                    }
                    setDragOverIndex(null);
                    setTouchStartY(null);
                    setDragOffsetY(0);
                  };

                  // Calculate translateY for visual feedback
                  let translateY = 0;
                  if (isDragging) {
                    translateY = dragOffsetY;
                  } else if (draggedIndex !== null && dragOverIndex !== null) {
                    // Shift cards between draggedIndex and dragOverIndex
                    if (dragOverIndex < draggedIndex) {
                      // Moving up: cards in between shift down
                      if (index >= dragOverIndex && index < draggedIndex) {
                        translateY = 56;
                      }
                    } else {
                      // Moving down: cards in between shift up
                      if (index > draggedIndex && index <= dragOverIndex) {
                        translateY = -56;
                      }
                    }
                  }

                  return (
                    <div
                      key={playerId}
                      data-seat-card
                      draggable
                      onDragStart={(e) => {
                        setDraggedIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          setEditingSeats(prev => {
                            const newOrder = [...prev];
                            [newOrder[draggedIndex], newOrder[index]] = [newOrder[index], newOrder[draggedIndex]];
                            return newOrder;
                          });
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        transform: `translateY(${translateY}px) scale(${isDragging ? 1.03 : 1})`,
                        zIndex: isDragging ? 50 : 1,
                        opacity: isDragging ? 0.95 : 1,
                        pointerEvents: isDragging ? 'none' : 'auto',
                        boxShadow: isDragging ? '0 12px 40px rgba(99,102,241,0.3)' : undefined,
                        transition: isDragging
                          ? 'box-shadow 0.15s, opacity 0.15s'
                          : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 touch-none select-none ${
                        isDragging ? 'border-indigo-500 bg-white' :
                        'border-slate-200 bg-white hover:border-indigo-200 active:scale-[0.98]'
                      } ${isDealer ? 'ring-2 ring-indigo-200' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border shrink-0 transition-colors ${
                        isDragging ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        {winds[index]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-bold truncate block transition-colors ${isDragging ? 'text-indigo-700' : 'text-slate-800'}`}>
                          {player.name}
                        </span>
                        {isDealer && <span className="text-xs text-indigo-600">莊家</span>}
                      </div>
                      <div className={`flex flex-col gap-0.5 shrink-0 transition-colors ${isDragging ? 'text-indigo-400' : 'text-slate-300'}`}>
                        <div className="w-4 h-0.5 bg-current rounded" />
                        <div className="w-4 h-0.5 bg-current rounded" />
                        <div className="w-4 h-0.5 bg-current rounded" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visual guide */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span>{lang === 'zh-HK' ? '桌面：拖拽卡片 · 手機：長按後拖動' : 'Desktop: Drag · Mobile: Long press & drag'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-100">
              <button
                onClick={() => setIsSeatEditorOpen(false)}
                className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveSeats}
                className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('confirm')}
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