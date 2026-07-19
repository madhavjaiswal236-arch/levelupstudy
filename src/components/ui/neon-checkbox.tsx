import React from "react";

interface NeonCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: "cyan" | "green" | "rose" | "amber" | "purple";
  className?: string;
  children?: React.ReactNode;
}

export function NeonCheckbox({
  id,
  checked,
  onChange,
  color = "cyan",
  className = "",
  children,
}: NeonCheckboxProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const colorClass = `neon-${color}`;

  return (
    <div
      id={id}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      className={`neon-checkbox-container ${colorClass} ${checked ? "checked" : ""} ${className}`}
    >
      <div className="neon-checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M20 6L9 17L4 12"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {children && (
        <span className="neon-checkbox-label">
          {children}
        </span>
      )}
    </div>
  );
}
