import { triggerHaptic } from "../../utils/helpers";

export default function Switch({ checked, onChange, label }) {
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
