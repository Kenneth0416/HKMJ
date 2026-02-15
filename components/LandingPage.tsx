import React, { useState } from 'react';
import { Play, Plus, History, BookOpen, X } from 'lucide-react';
import { MahjongLogo } from './Logo';
import HKMJRules from './HKMJRules';

interface LandingPageProps {
  hasActiveSession: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  playerNames: string[];
  t: (key: any) => string;
}

const LandingPage: React.FC<LandingPageProps> = ({ hasActiveSession, onContinue, onNewGame, playerNames, t }) => {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50 z-0 pointer-events-none"></div>

      <div className="z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Col: Actions */}
        <div className="flex flex-col items-center lg:items-start lg:text-left">
            <div className="mb-8 flex flex-col lg:flex-row items-center gap-4 animate-fade-in-up">
                <div className="transform rotate-3 bg-white/80 backdrop-blur rounded-xl p-2 shadow-xl flex items-center justify-center">
                    <MahjongLogo size={80} className="text-emerald-600 leading-none block" />
                </div>
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight">{t('appTitle')}</h1>
                    <p className="text-slate-500 mt-1 text-lg">{t('appSubtitle')}</p>
                </div>
            </div>

            <div className="w-full max-w-sm space-y-4">
                {hasActiveSession && (
                <button 
                    onClick={onContinue}
                    className="w-full bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 p-4 rounded-xl flex items-center justify-between transition-all group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <Play size={20} className="ml-0.5" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold">{t('continueGame')}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">
                        {playerNames.join(', ')}
                        </div>
                    </div>
                    </div>
                    <History size={18} className="text-indigo-300" />
                </button>
                )}

                <button 
                onClick={onNewGame}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                <Plus size={24} />
                {t('newGame')}
                </button>
                
                <button
                 onClick={() => setShowRules(true)}
                 className="w-full bg-white border border-slate-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 p-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors lg:hidden"
                >
                    <BookOpen size={20} />
                    {t('readRules')}
                </button>

                <div className="mt-8 text-xs text-slate-400 lg:text-left pt-4">
                 {t('footer')}
                </div>
            </div>
        </div>

        {/* Right Col: Intro (Desktop) */}
        <div className="hidden lg:block bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="text-emerald-600" />
                {t('landingIntroTitle')}
            </h3>
            <p className="text-slate-600 leading-relaxed text-lg mb-6">
                {t('landingIntroDesc')}
            </p>
            <div>
                <button 
                  onClick={() => setShowRules(true)}
                  className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-100 transition-colors"
                >
                   {t('readRules')}
                </button>
            </div>
        </div>

      </div>

      {/* Rules Modal (Mobile & Desktop triggered) */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
             <div className="w-full max-w-2xl h-[85vh] flex">
                 <HKMJRules t={t} onClose={() => setShowRules(false)} className="w-full h-full" />
             </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
