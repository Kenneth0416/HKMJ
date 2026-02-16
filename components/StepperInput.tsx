import React from 'react';

type ColorScheme = 'slate' | 'amber' | 'indigo';

interface StepperInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  isInteger?: boolean;
  prefix?: string;
  colorScheme?: ColorScheme;
  className?: string;
  inputClassName?: string;
}

const colorConfigs: Record<ColorScheme, {
  button: string;
  input: string;
  focus: string;
}> = {
  slate: {
    button: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
    input: 'bg-slate-50 text-slate-900 border-slate-200',
    focus: 'focus:border-indigo-400 focus:ring-indigo-100',
  },
  amber: {
    button: 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50',
    input: 'bg-white text-amber-900 border-amber-200',
    focus: 'focus:border-amber-400 focus:ring-amber-100',
  },
  indigo: {
    button: 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100',
    input: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    focus: 'focus:border-indigo-400 focus:ring-indigo-100',
  },
};

const StepperInput: React.FC<StepperInputProps> = ({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  defaultValue,
  isInteger = true,
  prefix,
  colorScheme = 'slate',
  className = '',
  inputClassName = '',
}) => {
  const colors = colorConfigs[colorScheme];
  const currentValue = value ?? defaultValue ?? min;

  const handleDecrement = () => {
    const newVal = Math.max(min, currentValue - step);
    onChange(isInteger ? Math.round(newVal) : newVal);
  };

  const handleIncrement = () => {
    const newVal = Math.min(max, currentValue + step);
    onChange(isInteger ? Math.round(newVal) : newVal);
  };

  const parseValue = (val: string): number | null => {
    if (val === '') return null;
    const parsed = isInteger ? parseInt(val, 10) : parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseValue(e.target.value);
    if (parsed !== null) {
      const clampedVal = Math.max(min, Math.min(max, parsed));
      onChange(isInteger ? Math.round(clampedVal) : clampedVal);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseValue(e.target.value);
    if (parsed === null || parsed < min) {
      onChange(defaultValue ?? min);
    }
  };

  const buttonBase = 'w-12 h-12 md:w-11 md:h-11 rounded-xl border-2 font-bold text-xl md:text-lg active:scale-90 md:active:scale-95 transition-all touch-manipulation';

  return (
    <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        className={`${buttonBase} ${colors.button}`}
      >
        −
      </button>
      <div className="flex-1 relative">
        {prefix && (
          <span className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 font-bold text-lg ${
            colorScheme === 'amber' ? 'text-amber-400' :
            colorScheme === 'indigo' ? 'text-indigo-400' : 'text-slate-400'
          }`}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`
            w-full h-12 md:h-11 text-center font-bold text-xl md:text-lg
            border-2 rounded-xl focus:ring-2 outline-none transition-all
            ${colors.input} ${colors.focus}
            ${prefix ? 'px-4 pl-8 md:pl-9' : ''}
            ${inputClassName}
          `}
        />
      </div>
      <button
        type="button"
        onClick={handleIncrement}
        className={`${buttonBase} ${colors.button}`}
      >
        +
      </button>
    </div>
  );
};

export default StepperInput;
