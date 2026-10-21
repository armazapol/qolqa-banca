import { Link } from 'react-router';

/**
 * Isotipo: una qolqa (almacén inca circular con techo cónico).
 * El SVG es decorativo; el nombre accesible lo da el texto del enlace.
 */
export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg font-bold text-brand no-underline dark:text-brand-light"
    >
      <svg
        aria-hidden="true"
        width="32"
        height="32"
        viewBox="0 0 32 32"
        className="shrink-0"
      >
        <rect
          width="32"
          height="32"
          rx="8"
          className="fill-brand dark:fill-brand-light"
        />
        <path d="M7 15 16 7l9 8z" className="fill-gold" />
        <rect x="9" y="15" width="14" height="10" rx="2" fill="#fff" />
        <rect
          x="14"
          y="19"
          width="4"
          height="6"
          rx="1"
          className="fill-brand"
        />
      </svg>
      <span className="text-lg tracking-tight">Qolqa</span>
    </Link>
  );
}
