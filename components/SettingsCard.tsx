import React from 'react';

type ColorScheme = 'slate' | 'amber' | 'indigo';

interface SettingsCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  activeColor?: ColorScheme;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  onClick?: () => void;
  expandable?: boolean;
  isExpanded?: boolean;
}

const colorConfigs: Record<ColorScheme, {
  card: string;
  iconBg: string;
  titleColor: string;
  subtitleColor: string;
}> = {
  slate: {
    card: 'bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 shadow-lg shadow-slate-100/50',
    iconBg: 'bg-slate-500 text-white shadow-lg shadow-slate-300/50',
    titleColor: 'text-slate-900',
    subtitleColor: 'text-slate-600',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-lg shadow-amber-100/50',
    iconBg: 'bg-amber-400 text-white shadow-lg shadow-amber-300/50',
    titleColor: 'text-amber-900',
    subtitleColor: 'text-amber-600',
  },
  indigo: {
    card: 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-lg shadow-indigo-100/50',
    iconBg: 'bg-indigo-500 text-white shadow-lg shadow-indigo-300/50',
    titleColor: 'text-indigo-900',
    subtitleColor: 'text-indigo-600',
  },
};

const inactiveConfig = {
  card: 'bg-white border border-slate-200 shadow-sm hover:border-indigo-200',
  iconBg: 'bg-slate-100 text-slate-400',
  titleColor: 'text-slate-700',
  subtitleColor: 'text-slate-400',
};

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  subtitle,
  icon,
  isActive = false,
  activeColor = 'indigo',
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  onClick,
}) => {
  const colors = isActive ? colorConfigs[activeColor] : inactiveConfig;

  return (
    <div
      className={`
        rounded-2xl md:rounded-3xl transition-all duration-300 overflow-hidden
        ${colors.card}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      {(title || icon) && (
        <div className={`p-4 md:p-5 flex items-center justify-between ${headerClassName} ${onClick ? 'active:bg-opacity-50 transition-colors' : ''}`}>
          <div className="flex items-center gap-3 md:gap-4">
            {icon && (
              <div className={`
                p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all duration-300
                ${colors.iconBg}
              `}>
                {icon}
              </div>
            )}
            <div>
              {title && (
                <div className={`font-bold text-base md:text-lg transition-colors duration-300 ${colors.titleColor}`}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div className={`text-xs md:text-sm transition-colors duration-300 ${colors.subtitleColor}`}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  );
};

export default SettingsCard;
