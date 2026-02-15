import React from 'react';
import { Scroll, Info, BookOpen } from 'lucide-react';
import MahjongTile, { TileType, TileValue } from './MahjongTile';

interface HKMJRulesProps {
  t: (key: any) => string;
  onClose?: () => void;
  className?: string;
}

const HKMJRules: React.FC<HKMJRulesProps> = ({ t, onClose, className = '' }) => {
  
  // Helper to render a group of tiles
  const TileGroup = ({ tiles }: { tiles: { type: TileType, value: TileValue }[] }) => (
    <div className="flex gap-1">
        {tiles.map((tile, i) => (
            <MahjongTile key={i} type={tile.type} value={tile.value} size="sm" />
        ))}
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col ${className}`}>
      <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Scroll size={20} />
          {t('rulesTitle')}
        </div>
        {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-sm font-medium bg-emerald-700/50 px-3 py-1 rounded-full">
                {t('closeRules')}
            </button>
        )}
      </div>

      <div className="p-5 overflow-y-auto custom-scrollbar space-y-8">
        
        {/* Intro */}
        <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Info size={18} className="text-emerald-600"/>
                {t('howToScore')}
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                {t('scoreDesc')}
            </p>
        </div>

        {/* Basics */}
        <div>
             <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                {t('basicsTitle')}
            </h4>
            <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                    <div className="text-sm">
                        <span className="font-bold text-slate-700 block">{t('chow')} (順子)</span>
                        <span className="text-xs text-slate-500">同一花色，數字連續</span>
                    </div>
                    <TileGroup tiles={[
                        {type: 'character', value: 1},
                        {type: 'character', value: 2},
                        {type: 'character', value: 3},
                    ]} />
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                    <div className="text-sm">
                        <span className="font-bold text-slate-700 block">{t('pong')} (刻子)</span>
                        <span className="text-xs text-slate-500">三隻相同</span>
                    </div>
                    <TileGroup tiles={[
                        {type: 'dot', value: 6},
                        {type: 'dot', value: 6},
                        {type: 'dot', value: 6},
                    ]} />
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                    <div className="text-sm">
                        <span className="font-bold text-slate-700 block">{t('pair')} (眼)</span>
                        <span className="text-xs text-slate-500">兩隻相同，做將眼</span>
                    </div>
                    <TileGroup tiles={[
                        {type: 'dragon', value: 'red'},
                        {type: 'dragon', value: 'red'},
                    ]} />
                </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
                {t('winningHandDesc')}
            </p>
        </div>

        {/* Faan Table with Visuals */}
        <div>
             <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                {t('commonPatterns')}
            </h4>

            <div className="space-y-6">
                
                {/* 3 Faan */}
                <div>
                    <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold mb-3">{t('faan3')}</span>
                    
                    {/* Mixed One Suit */}
                    <div className="mb-4">
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('p_mixedOneSuit')}</div>
                        <div className="text-xs text-slate-500 mb-2">單一花色 + 番子 (東南西北中發白)</div>
                        <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg justify-center sm:justify-start">
                             <TileGroup tiles={[
                                 {type: 'bamboo', value: 1}, {type: 'bamboo', value: 2}, {type: 'bamboo', value: 3}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'bamboo', value: 6}, {type: 'bamboo', value: 6}, {type: 'bamboo', value: 6}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'wind', value: 'east'}, {type: 'wind', value: 'east'}, {type: 'wind', value: 'east'}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'dragon', value: 'green'}, {type: 'dragon', value: 'green'}
                             ]} />
                        </div>
                    </div>

                    {/* All Pongs */}
                    <div>
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('p_allPongs')}</div>
                        <div className="text-xs text-slate-500 mb-2">全部由刻子(三隻)組成，沒有順子</div>
                        <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg justify-center sm:justify-start">
                             <TileGroup tiles={[
                                 {type: 'dot', value: 2}, {type: 'dot', value: 2}, {type: 'dot', value: 2}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'character', value: 5}, {type: 'character', value: 5}, {type: 'character', value: 5}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'dragon', value: 'white'}, {type: 'dragon', value: 'white'}, {type: 'dragon', value: 'white'}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'bamboo', value: 9}, {type: 'bamboo', value: 9}
                             ]} />
                        </div>
                    </div>
                </div>

                {/* Limit */}
                <div>
                    <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold mb-3">{t('faan8')}</span>
                    
                    {/* All One Suit */}
                    <div className="mb-4">
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('p_allOneSuit')} (清一色)</div>
                        <div className="text-xs text-slate-500 mb-2">只有一種花色，沒有番子</div>
                        <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg justify-center sm:justify-start">
                             <TileGroup tiles={[
                                 {type: 'character', value: 1}, {type: 'character', value: 2}, {type: 'character', value: 3}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'character', value: 5}, {type: 'character', value: 5}, {type: 'character', value: 5}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'character', value: 8}, {type: 'character', value: 8}, {type: 'character', value: 8}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'character', value: 9}, {type: 'character', value: 9}
                             ]} />
                        </div>
                    </div>

                    {/* Dragons */}
                    <div>
                        <div className="text-sm font-bold text-slate-700 mb-1">{t('p_greatDragons')} (大三元)</div>
                        <div className="text-xs text-slate-500 mb-2">中、發、白 三組刻子齊全</div>
                        <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg justify-center sm:justify-start">
                             <TileGroup tiles={[
                                 {type: 'dragon', value: 'red'}, {type: 'dragon', value: 'red'}, {type: 'dragon', value: 'red'}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'dragon', value: 'green'}, {type: 'dragon', value: 'green'}, {type: 'dragon', value: 'green'}
                             ]} />
                             <TileGroup tiles={[
                                 {type: 'dragon', value: 'white'}, {type: 'dragon', value: 'white'}, {type: 'dragon', value: 'white'}
                             ]} />
                             <span className="self-center text-slate-400 text-xs px-2">+ 任意一組</span>
                        </div>
                    </div>
                </div>

                 {/* 1 Faan */}
                 <div>
                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold mb-2">{t('faan1')}</span>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                        <li>{t('p_noFlowers')} (無花)</li>
                        <li>{t('p_flowers')} (正花/正風)</li>
                        <li>{t('p_dragons_pong')} (中發白 任意一刻)</li>
                        <li>{t('p_self_wind')} (自己風位)</li>
                    </ul>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};

export default HKMJRules;