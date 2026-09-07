import { InputHTMLAttributes, ReactNode, forwardRef, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ visible, onVisibleChange, ...props }, ref) => {
    const [internal, setInternal] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const shown = visible ?? internal;

    function attach(node: HTMLInputElement | null) {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
    }

    function toggle() {
      const next = !shown;
      setInternal(next);
      onVisibleChange?.(next);
      const node = inputRef.current;
      if (node) {
        const caret = node.value.length;
        node.focus();
        requestAnimationFrame(() => {
          try { node.setSelectionRange(caret, caret); } catch { }
        });
      }
    }

    return (
      <Input
        ref={attach}
        type={shown ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            tabIndex={-1}
            onClick={toggle}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-brand-green-deep focus-visible:outline-none focus-visible:shadow-focus"
          >
            {shown ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
