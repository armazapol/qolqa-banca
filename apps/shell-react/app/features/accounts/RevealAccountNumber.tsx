import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useState } from 'react';
import { revealAccountNumber } from './queries';

const VISIBLE_MS = 30_000;

/**
 * Número de cuenta enmascarado por defecto (ADR-0011). Al revelarlo, el BFF
 * lo audita; se oculta solo a los 30 s y nunca se guarda en caché.
 */
export function RevealAccountNumber({
  accountId,
  masked,
}: {
  accountId: string;
  masked: string;
}) {
  const [full, setFull] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!full) return;
    const timer = window.setTimeout(() => setFull(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [full]);

  const toggle = async () => {
    if (full) return setFull(null);
    setLoading(true);
    try {
      setFull(await revealAccountNumber(accountId));
    } finally {
      setLoading(false);
    }
  };

  const label = full
    ? 'Ocultar número de cuenta'
    : 'Mostrar número de cuenta completo';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono tabular-nums" aria-live="polite">
        {full ?? masked}
      </span>
      <Tooltip title={label}>
        <IconButton
          size="small"
          onClick={toggle}
          disabled={loading}
          aria-label={label}
        >
          {full ? (
            <VisibilityOffOutlined fontSize="small" />
          ) : (
            <VisibilityOutlined fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </span>
  );
}
