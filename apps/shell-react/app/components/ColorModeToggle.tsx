import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlined from '@mui/icons-material/SettingsBrightnessOutlined';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

const NEXT = { system: 'light', light: 'dark', dark: 'system' } as const;
const LABELS = {
  system: 'Tema del sistema',
  light: 'Tema claro',
  dark: 'Tema oscuro',
} as const;

/** Alterna sistema → claro → oscuro. La preferencia se guarda en localStorage (MUI). */
export function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();
  // En SSR mode es undefined hasta montar: se evita un desajuste de hidratación.
  if (!mode)
    return <span className="inline-block size-10" aria-hidden="true" />;

  const Icon =
    mode === 'dark'
      ? DarkModeOutlined
      : mode === 'light'
        ? LightModeOutlined
        : SettingsBrightnessOutlined;
  const label = `${LABELS[mode]}. Cambiar a ${LABELS[NEXT[mode]].toLowerCase()}`;

  return (
    <Tooltip title={LABELS[mode]}>
      <IconButton onClick={() => setMode(NEXT[mode])} aria-label={label}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
}
