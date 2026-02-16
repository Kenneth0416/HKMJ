import React, { useState, useEffect, useRef } from 'react';

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
  /** Use smart stepping: increment to next integer, decrement to prev integer or 0.5 */
  smartStep?: boolean;
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
  smartStep = false,
}) => {
  const colors = colorConfigs[colorScheme];

  // Internal state for handling typing - allows empty string during input
  const [inputValue, setInputValue] = useState<string>(String(value ?? ''));
  const isFocusedRef = useRef(false);
  const valueOnFocusRef = useRef<number>(value); // Remember value when focused

  // Sync external value to internal state when not focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputValue(String(value ?? ''));
    }
  }, [value]);

  const currentValue = value ?? defaultValue ?? min;

  const handleDecrement = () => {
    let newVal: number;

    if (smartStep) {
      // Smart decrement: go to previous integer or 0.5
      if (currentValue <= 0.5) {
        newVal = Math.max(min, 0.5);
      } else if (currentValue <= 1) {
        newVal = Math.max(min, 0.5);
      } else {
        // Decrement to previous integer
        newVal = Math.max(min, Math.floor(currentValue - 0.001));
      }
    } else {
      newVal = Math.max(min, currentValue - step);
    }

    const finalVal = isInteger ? Math.round(newVal) : newVal;
    onChange(finalVal);
  };

  const handleIncrement = () => {
    let newVal: number;

    if (smartStep) {
      // Smart increment: go to next integer
      if (currentValue < 0.5) {
        newVal = 0.5;
      } else if (currentValue < 1) {
        newVal = 1;
      } else {
        // Increment to next integer
        newVal = Math.min(max, Math.ceil(currentValue + 0.001));
      }
    } else {
      newVal = Math.min(max, currentValue + step);
    }

    const finalVal = isInteger ? Math.round(newVal) : newVal;
    onChange(finalVal);
  };

  const parseValue = (val: string): number | null => {
    if (val === '' || val === '-' || val === '.') return null;
    const parsed = isInteger ? parseInt(val, 10) : parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Always update internal input value for display
    setInputValue(rawVal);

    // Allow empty input during typing - don't call onChange
    if (rawVal === '') {
      return;
    }

    // Validate format before parsing
    const isValidFormat = isInteger
      ? /^-?\d*$/.test(rawVal)
      : /^-?\d*\.?\d*$/.test(rawVal);

    if (!isValidFormat) {
      return;
    }

    // Only update parent if we have a complete valid number
    const parsed = parseValue(rawVal);
    if (parsed !== null) {
      const clampedVal = Math.max(min, Math.min(max, parsed));
      onChange(isInteger ? Math.round(clampedVal) : clampedVal);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    // Remember the current value before editing
    valueOnFocusRef.current = value;
    // Select all text on focus for easy replacement
    const input = document.activeElement as HTMLInputElement;
    if (input) {
      input.select();
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;

    // Restore to value before focus if empty or invalid
    const parsed = parseValue(inputValue);
    if (parsed === null || parsed < min) {
      // Restore the original value from when focus started
      const restoreVal = valueOnFocusRef.current;
      onChange(restoreVal);
      setInputValue(String(restoreVal));
    } else if (parsed > max) {
      // Clamp to max if exceeded
      const clampedVal = isInteger ? Math.round(max) : max;
      onChange(clampedVal);
      setInputValue(String(clampedVal));
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
          type="text"
          inputMode="numeric"
          pattern={isInteger ? '[0-9]*' : '[0-9.]*'}
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
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
