import Button from '@mui/material/Button';
import { Link, NavLink, Outlet } from 'react-router';
import { ColorModeToggle } from '../../components/ColorModeToggle';
import { Logo } from '../../components/Logo';
import { SkipLink } from '../../components/SkipLink';

const NAV = [
  { to: '/tipo-de-cambio', label: 'Tipo de cambio' },
  { to: '/seguridad', label: 'Seguridad' },
];

export default function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav
            aria-label="Principal"
            className="flex items-center gap-1 sm:gap-3"
          >
            <ul className="hidden list-none gap-4 p-0 sm:flex">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded px-1 py-2 text-sm font-medium underline-offset-4 hover:underline ${
                        isActive
                          ? 'text-brand underline dark:text-brand-light'
                          : ''
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <ColorModeToggle />
            {/* reloadDocument: la banca se abre en un documento nuevo con CSP por nonce (ADR-0021). */}
            <Button
              component={Link}
              to="/ingresar"
              reloadDocument
              variant="contained"
            >
              Ingresar
            </Button>
          </nav>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-black/10 py-8 text-sm dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:justify-between">
          <p className="m-0 opacity-80">
            © {new Date().getFullYear()} Qolqa Banca Digital · Proyecto
            demostrativo: banco ficticio, datos simulados.
          </p>
          <nav aria-label="Legal">
            <ul className="m-0 flex list-none gap-4 p-0">
              <li>
                <Link
                  to="/legal/privacidad"
                  className="underline-offset-4 hover:underline"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/cookies"
                  className="underline-offset-4 hover:underline"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <Link
                  to="/seguridad"
                  className="underline-offset-4 hover:underline"
                >
                  Seguridad
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
