import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";

interface KeypadProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
  /** Puts the d-pad on the right and the numbers on the left. */
  dpadOnRight: boolean;
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export const Keypad = ({ onKeyDown, onKeyUp, dpadOnRight }: KeypadProps) => {
  const bind = (key: string) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      // Capture so a finger sliding off the button still releases the key.
      event.currentTarget.setPointerCapture(event.pointerId);
      onKeyDown(key);
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      onKeyUp(key);
    },
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      onKeyUp(key);
    },
  });

  const key = (name: string, className: string, label: string, children: ReactNode) => (
    <button key={name} className={className} type="button" aria-label={label} {...bind(name)}>
      {children}
    </button>
  );

  const dpad = (
    <div className="keypad-dpad" key="dpad">
      {key("UP", "key-up", "위", <ArrowUp />)}
      {key("LEFT", "key-left", "왼쪽", <ArrowLeft />)}
      {key("OK", "key-ok", "확인", "OK")}
      {key("RIGHT", "key-right", "오른쪽", <ArrowRight />)}
      {key("DOWN", "key-down", "아래", <ArrowDown />)}
      {key("CLR", "key-clr", "지우기", "CLR")}
    </div>
  );
  const numpad = (
    <div className="keypad-numpad" key="numpad">
      {NUMPAD_KEYS.map(name => key(name, "", name, name))}
    </div>
  );

  // Reordered in the DOM rather than with row-reverse, so focus order keeps
  // matching what is on screen.
  return (
    <div className="keypad" aria-label="앱 키패드">
      {dpadOnRight ? [numpad, dpad] : [dpad, numpad]}
    </div>
  );
};
