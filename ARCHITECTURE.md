# Măm architecture and acceptance contract

Măm is a static React PWA. IndexedDB is the immediate source for the screen; Firebase Authentication identifies an optional cloud account, and Firestore stores only that account's profile and meals. GitHub Pages uses relative Vite assets and hash routes.

## Overhaul acceptance

- A new user can create a local journal without network access. Existing PIN-protected journals remain accessible.
- Search returns matching catalog foods, including Vietnamese without accents. Unknown queries show an honest empty state.
- A serving can be fractional. Add, edit, delete and undo preserve nutrition snapshots, meal category, local date and notes. Saving has pending/error/success feedback.
- Today and diary use the device's local calendar, group meals by category and calculate totals from saved entries.
- Name and daily nutrition targets are editable and validated. Catalog values are explicitly unverified estimates; no invented price, confidence percentage or group votes appear.
- Local reads never wait for Firestore. Cloud writes use a durable owner-specific outbox; deletion survives refresh; an in-flight acknowledgement cannot discard a newer edit.
- Account switches cannot show or upload another owner's data. Guest-to-account import requires an explicit choice and preserves the source journal.
- Light/dark themes, narrow/wide screens, keyboard interaction, offline reload, existing-data upgrade and Firebase rules are checked on their actual surfaces.

## Boundaries

Domain types and validation are shared by form, local repository and Firebase adapters. UI pages receive data and commands, without direct IndexedDB or Firestore writes. Session orchestration guards asynchronous updates against account changes. Sync status reports pending, sending and failed work; browser connectivity alone does not establish successful synchronization.

The catalog is bundled and usable offline. Its existing portion numbers have no verified primary nutrition provenance and must be described as estimates. This product is a personal journal, not a clinical nutrition prescription or an allergen safety checker.

Cloud delivery retries pending writes every 30 seconds. Collection hydration runs at account opening, reconnection, explicit refresh, and returning to the app after a minute; it does not reread the entire diary every 30 seconds. This is refresh-on-foreground synchronization, not a realtime collaborative feed. Complete history is hydrated for a personal journal; very large histories will need paginated or incremental remote reads before a broader rollout.

New meals can also use explicit user-entered portion nutrition when absent from the bundled catalog. Missing macro values are not guessed. Nutrition snapshots remain attached to each entry when the catalog changes. Device-local calendar days are derived from saved instants using the device timezone; travelling across timezones can move an entry to a different displayed day.

## External activation

Production project: `mam-app-877da`; web app: `1:837818293257:web:1d1c79247454655f6dacd8`. Do not create replacement projects/apps. Authentication uses Email/Password and Google. The user removed SMS sign-in to retain Spark; Phone is disabled in Firebase and absent from the app. Authorized domains include localhost and collide0412.github.io; 127.0.0.1 is not authorized for live OAuth. Emulator success does not prove real Google OAuth delivery. Production rules and frontend publication are recorded separately from local verification.
