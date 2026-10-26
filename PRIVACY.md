# Privacy and local data

Măm is a static, local-first PWA. Personal profiles and meal entries are stored in the browser's IndexedDB; the bundled catalog works without a server.

- GitHub Pages hosts static application files. Optional Firebase Authentication and Firestore use project mam-app-877da.
- Local journals do not upload records or create new cloud outbox entries. The Firebase SDK is loaded for account operations.
- Cloud journals synchronize only with the matching Firebase UID, at users/{uid} and users/{uid}/meals/{mealId}. Pending changes remain on the device until that account can synchronize.
- Email/password and Google authentication are processed by Firebase. Account passwords are not stored in the meal database. Firebase maintains its authentication session in browser storage.
- A six-digit device PIN is optional for new journals. Its hash is kept in localStorage. It is a convenience screen lock, not encryption or a substitute for Firebase Authentication.
- Signing out removes the active identity and PIN, while keeping cached data and pending writes. Signing into another account does not upload the previous owner's records. Tabs on the same browser origin share the active identity.
- Guest-to-account copying requires an explicit user choice. It creates new meal IDs under the chosen account, preserves the source records and checkpoints unfinished copying locally.
- Meal deletion is a soft deletion. A tombstone is retained locally and in Firestore for synchronization and undo. The legacy IndexedDB meal store is retained as a migration archive. This action is not a permanent purge of all copies.
- JSON exports contain the current profile and visible journal in plain text. They are created on the device and are not uploaded by Măm. Keep downloaded files private.
- Clearing site data can permanently remove local journals and unsent changes. A cloud copy exists only after successful synchronization; being online does not prove delivery.
- Catalog nutrition is an unverified estimate, not a clinical recommendation or an allergen safety claim. Manually entered nutrition comes from the user's chosen source.
- No remote analytics SDK is initialized by Măm. Firebase authentication and Firestore requests still involve Google's services.

See QA_REPORT.md for tested behavior and deployment limitations.
