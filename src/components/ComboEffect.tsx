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

  return (
    <div className="combo-popup" key={combo}>
      <span className="combo-text">COMBO</span>
      <span className="combo-count">x{combo}</span>
    </div>
  );
}
