import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { server } from './msw';

expect.extend(toHaveNoViolations);

// El código usa URLs relativas (/api/...) como en el navegador; en jsdom se resuelven contra este origen.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
