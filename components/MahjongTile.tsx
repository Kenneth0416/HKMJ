import React from 'react';

export type TileType = 'dot' | 'bamboo' | 'character' | 'wind' | 'dragon';
export type TileValue = number | 'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white';

interface MahjongTileProps {
  type: TileType;
  value: TileValue;
  size?: 'sm' | 'md';
}

const MahjongTile: React.FC<MahjongTileProps> = ({ type, value, size = 'md' }) => {
  // Size Definitions
  const width = size === 'md' ? 'w-10' : 'w-7'; // Slightly wider for better aspect ratio
  const height = size === 'md' ? 'h-14' : 'h-10'; // Taller standard aspect ratio
  
  // Colors
  const cRed = "#D81E06";
  const cGreen = "#008000";
  const cBlue = "#004080";

  // --- RENDERERS ---

  // 1. Dots (筒子) - Procedural SVG
  const renderDots = (val: number) => {
    const Circle = ({ cx, cy, color, hollow = false }: { cx: number, cy: number, color: string, hollow?: boolean }) => (
      <>
        <circle cx={cx} cy={cy} r={hollow ? 8.5 : 9} fill={hollow ? "none" : color} stroke={hollow ? color : "none"} strokeWidth={hollow ? 2 : 0} />
        {/* Shine effect */}
        {!hollow && <circle cx={cx + 3} cy={cy - 3} r={2} fill="white" fillOpacity={0.3} />}
        {/* Flower pattern inside huge dots */}
        {hollow && <circle cx={cx} cy={cy} r={2} fill={color} />} 
      </>
    );

    // Standard positions for 100x130 coordinate system
    const p = {
      tl: { cx: 25, cy: 25 }, tr: { cx: 75, cy: 25 },
      ml: { cx: 25, cy: 65 }, mm: { cx: 50, cy: 65 }, mr: { cx: 75, cy: 65 },
      bl: { cx: 25, cy: 105 }, br: { cx: 75, cy: 105 },
      tm: { cx: 50, cy: 25 }, bm: { cx: 50, cy: 105 },
      // Specifically for 7 and 8
      mid_l_upper: { cx: 25, cy: 50 }, mid_r_upper: { cx: 75, cy: 50 },
      mid_l_lower: { cx: 25, cy: 80 }, mid_r_lower: { cx: 75, cy: 80 },
    };

    let content = null;
    switch (val) {
      case 1: // Big Circle
        content = (
          <g>
            <circle cx={50} cy={65} r={30} fill="none" stroke={cRed} strokeWidth={2} />
            <circle cx={50} cy={65} r={20} fill={cRed} />
            <circle cx={50} cy={65} r={4} fill="white" />
            {/* Petals */}
            <path d="M50 35 L55 45 L50 48 L45 45 Z" fill={cRed} />
            <path d="M50 95 L55 85 L50 82 L45 85 Z" fill={cRed} />
            <path d="M80 65 L70 70 L67 65 L70 60 Z" fill={cRed} />
            <path d="M20 65 L30 70 L33 65 L30 60 Z" fill={cRed} />
          </g>
        );
        break;
      case 2:
        content = <><Circle cx={50} cy={30} color={cGreen} /><Circle cx={50} cy={100} color={cBlue} /></>;
        break;
      case 3:
        content = <><Circle cx={25} cy={25} color={cBlue} /><Circle cx={50} cy={65} color={cRed} /><Circle cx={75} cy={105} color={cGreen} /></>;
        break;
      case 4:
        content = <><Circle {...p.tl} color={cBlue} /><Circle {...p.tr} color={cGreen} /><Circle {...p.bl} color={cGreen} /><Circle {...p.br} color={cBlue} /></>;
        break;
      case 5:
        content = <><Circle {...p.tl} color={cBlue} /><Circle {...p.tr} color={cGreen} /><Circle {...p.mm} color={cRed} /><Circle {...p.bl} color={cGreen} /><Circle {...p.br} color={cBlue} /></>;
        break;
      case 6: // HK Style: Top Green, Bot Red usually, but let's stick to standard aesthetic
        content = (
          <>
            <Circle {...p.tl} color={cGreen} /><Circle {...p.tr} color={cGreen} />
            <Circle {...p.ml} color={cRed} /><Circle {...p.mr} color={cRed} />
            <Circle {...p.bl} color={cRed} /><Circle {...p.br} color={cRed} />
          </>
        );
        break;
      case 7: 
        content = (
           <>
             <path d="M20 30 L50 40 L80 30" stroke={cGreen} strokeWidth="2" fill="none" /> {/* Stylized top */}
             <Circle cx={25} cy={20} color={cGreen} /><Circle cx={50} cy={30} color={cGreen} /><Circle cx={75} cy={20} color={cGreen} />
             <Circle cx={25} cy={70} color={cRed} /><Circle cx={75} cy={70} color={cRed} />
             <Circle cx={25} cy={105} color={cRed} /><Circle cx={75} cy={105} color={cRed} />
           </>
        );
        break;
      case 8:
         content = (
          <>
            <Circle {...p.tl} color={cBlue} /><Circle {...p.tr} color={cBlue} />
            <Circle {...p.ml} color={cBlue} /><Circle {...p.mr} color={cBlue} />
            <Circle {...p.bl} color={cBlue} /><Circle {...p.br} color={cBlue} />
            <Circle cx={50} cy={45} color={cBlue} /><Circle cx={50} cy={85} color={cBlue} />
          </>
         );
         break;
      case 9:
         content = (
          <>
            <Circle {...p.tl} color={cGreen} /><Circle {...p.tm} color={cGreen} /><Circle {...p.tr} color={cGreen} />
            <Circle {...p.ml} color={cRed} /><Circle {...p.mm} color={cRed} /><Circle {...p.mr} color={cRed} />
            <Circle {...p.bl} color={cBlue} /><Circle {...p.bm} color={cBlue} /><Circle {...p.br} color={cBlue} />
          </>
         );
         break;
    }

    return (
      <svg viewBox="0 0 100 130" className="w-full h-full p-0.5">
         {content}
      </svg>
    );
  };

  // 2. Bamboo (索子)
  const renderBamboo = (val: number) => {
     // Helper for Stick
     const Stick = ({ x, y, color, vertical = true }: any) => (
        <rect 
          x={vertical ? x : x - 10} 
          y={vertical ? y : y + 10} 
          width={vertical ? 6 : 24} 
          height={vertical ? 24 : 6} 
          rx={3} 
          fill={color} 
        />
     );

     if (val === 1) {
       // Stylized Bird (Sparrow)
       return (
        <svg viewBox="0 0 100 130" className="w-full h-full">
           <g transform="translate(50, 65) scale(1.5)">
             {/* Body */}
             <path d="M-15 10 Q -25 5, -15 -10 Q -5 -25, 10 -15 Q 20 -10, 20 10 Q 15 25, 0 25 Z" fill={cGreen} />
             {/* Wing */}
             <path d="M-5 5 Q 5 5, 10 15 L -5 15 Z" fill={cRed} />
             {/* Tail */}
             <path d="M-15 10 L -25 20 L -20 25 Z" fill={cBlue} />
             {/* Eye */}
             <circle cx="5" cy="-10" r="2" fill="white" />
             <circle cx="5" cy="-10" r="1" fill="black" />
             {/* Beak */}
             <path d="M10 -10 L 15 -5 L 10 0" fill="#eab308" />
           </g>
        </svg>
       );
     }

     let content = null;
     switch (val) {
        case 2:
            content = <><Stick x={47} y={25} color={cBlue} /><Stick x={47} y={80} color={cGreen} /></>;
            break;
        case 3:
            content = <><Stick x={47} y={20} color={cBlue} /><Stick x={30} y={80} color={cGreen} /><Stick x={64} y={80} color={cGreen} /></>;
            break;
        case 4:
            content = (
                <>
                <Stick x={30} y={25} color={cBlue} /><Stick x={64} y={25} color={cGreen} />
                <Stick x={30} y={80} color={cGreen} /><Stick x={64} y={80} color={cBlue} />
                </>
            );
            break;
        case 5:
             content = (
                <>
                <Stick x={20} y={25} color={cGreen} /><Stick x={74} y={25} color={cBlue} />
                <Stick x={20} y={80} color={cBlue} /><Stick x={74} y={80} color={cGreen} />
                <Stick x={47} y={52} color={cRed} />
                </>
            );
            break;
        case 6:
             content = (
                <>
                <Stick x={30} y={25} color={cGreen} /><Stick x={47} y={25} color={cGreen} /><Stick x={64} y={25} color={cGreen} />
                <Stick x={30} y={80} color={cBlue} /><Stick x={47} y={80} color={cBlue} /><Stick x={64} y={80} color={cBlue} />
                </>
            );
            break;
        case 7:
            content = (
                <>
                <rect x={35} y={15} width={30} height={5} fill={cRed} />
                <Stick x={47} y={30} color={cRed} />
                <Stick x={30} y={55} color={cGreen} /><Stick x={47} y={55} color={cGreen} /><Stick x={64} y={55} color={cGreen} />
                <Stick x={30} y={90} color={cBlue} /><Stick x={47} y={90} color={cBlue} /><Stick x={64} y={90} color={cBlue} />
                </>
            );
            break;
        case 8: // Two "M" shapes ideally, but 8 sticks is easier for code
             content = (
                 <g transform="translate(0, 5)">
                    {/* Top M */}
                    <path d="M25 50 L40 20 L50 40 L60 20 L75 50" stroke={cGreen} strokeWidth="6" fill="none" strokeLinecap="round" />
                    {/* Bottom M */}
                    <path d="M25 100 L40 70 L50 90 L60 70 L75 100" stroke={cBlue} strokeWidth="6" fill="none" strokeLinecap="round" />
                 </g>
             );
             break;
         case 9:
             content = (
                <>
                <Stick x={30} y={15} color={cRed} /><Stick x={47} y={15} color={cBlue} /><Stick x={64} y={15} color={cGreen} />
                <Stick x={30} y={50} color={cRed} /><Stick x={47} y={50} color={cBlue} /><Stick x={64} y={50} color={cGreen} />
                <Stick x={30} y={85} color={cRed} /><Stick x={47} y={85} color={cBlue} /><Stick x={64} y={85} color={cGreen} />
                </>
             );
             break;
     }

     return (
        <svg viewBox="0 0 100 130" className="w-full h-full">
            {content}
        </svg>
     );
  };

  // 3. Characters (萬子)
  const renderCharacter = (val: number) => {
    const numMap: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '伍', 6: '六', 7: '七', 8: '八', 9: '九' };
    return (
      <div className="flex flex-col items-center justify-center h-full pt-1">
        <span className={`${size === 'md' ? 'text-2xl' : 'text-lg'} font-bold text-[#D81E06] font-[KaiTi,STKaiti,serif] leading-none mb-1`}>{numMap[val]}</span>
        <span className={`${size === 'md' ? 'text-3xl' : 'text-xl'} font-bold text-[#D81E06] font-[KaiTi,STKaiti,serif] leading-none`}>萬</span>
      </div>
    );
  };

  // 4. Winds & Dragons (番子)
  const renderHonor = (val: TileValue) => {
     if (type === 'wind') {
        const windMap: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
        return (
            <div className="flex items-center justify-center h-full">
              <span className={`${size === 'md' ? 'text-4xl' : 'text-2xl'} font-bold text-slate-900 font-[KaiTi,STKaiti,serif]`}>
                {windMap[val as string]}
              </span>
            </div>
        );
     }
     
     if (type === 'dragon') {
        if (val === 'white') {
            return (
                <div className="w-full h-full p-1.5 flex items-center justify-center">
                    <div className="w-full h-full border-[3px] border-[#004080] rounded-[2px]" />
                </div>
            )
        }
        const color = val === 'red' ? 'text-[#D81E06]' : 'text-[#008000]';
        const char = val === 'red' ? '中' : '發';
        return (
            <div className="flex items-center justify-center h-full">
              <span className={`${size === 'md' ? 'text-4xl' : 'text-2xl'} font-bold ${color} font-[KaiTi,STKaiti,serif]`}>
                {char}
              </span>
            </div>
        );
     }
     return null;
  };

  return (
    <div className={`${width} ${height} bg-white rounded-md shadow-[1px_2px_0_0_#cbd5e1] border border-slate-200 relative shrink-0 select-none`}>
       {/* 3D Depth Left/Bottom - handled by shadow and border mostly, but let's add the green backing effect */}
       <div className="absolute -bottom-1 -right-1 w-full h-full bg-[#065f46] rounded-md -z-10 rounded-tl-xl" />
       
       {/* Face */}
       <div className="w-full h-full bg-[#fdf6e3] rounded-[4px] overflow-hidden">
          {type === 'dot' && renderDots(value as number)}
          {type === 'bamboo' && renderBamboo(value as number)}
          {type === 'character' && renderCharacter(value as number)}
          {(type === 'wind' || type === 'dragon') && renderHonor(value)}
       </div>
    </div>
  );
};

export default MahjongTile;