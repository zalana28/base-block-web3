import { useEffect, useState } from 'react';

interface ComboEffectProps {
  combo: number;
}

export default function ComboEffect({ combo }: ComboEffectProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (combo >= 2) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(t);
    }
  }, [combo]);

  if (!visible) return null;

  // Color escalation by tier (Area 1.3): green -> yellow -> orange -> magenta at 5+
  const tier = combo >= 5 ? 'magenta' : combo >= 4 ? 'orange' : combo >= 3 ? 'yellow' : 'green';

  return (
    <div className={`combo-popup combo-tier-${tier}`} key={combo}>
      <span className="combo-text">COMBO</span>
      <span className="combo-count">x{combo}</span>
    </div>
  );
}
