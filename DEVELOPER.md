Developer quickstart
====================

This project is a Next.js (App Router) TypeScript app used to explore GA4 data. This short guide helps a new contributor (non-coder) run and make simple UI changes.

Run locally
-----------

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Run checks: `npm run check`

If you don't have Google Analytics credentials, open `src/app/page.tsx` and mock API responses or use the local mock server (not included).

Where to edit the UI
--------------------
- `src/components/` — small, focused components for the UI (charts, tables, chat, toggles).
- `src/app/` — pages and route handlers.
- `src/lib/` — services and hooks that fetch data; avoid editing these unless you understand GA APIs.

How to change a label
---------------------
1. Find the component in `src/components/` (e.g., `AnalyticsSetup.tsx`).
2. Edit the text and save; the dev server will hot-reload.
3. Run `npm run check` to ensure no TypeScript errors were introduced.

If you get stuck, open an issue with the change you want and include a screenshot.

Short notes
-----------
- Logging uses `src/lib/logger.ts` for server-side logs; some client-side components still use `console.error` for simplicity.
- Types: GA responses are partially untyped; avoid changing analytics parsing without tests.
