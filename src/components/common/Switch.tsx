import { triggerHaptic } from "../../utils/helpers";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "on" : ""}`}
      onClick={() => { triggerHaptic(15); onChange(!checked); }}
    >
      <span className="switch-knob" />
    </button>
  );
}
