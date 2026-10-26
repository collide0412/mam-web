# Resume point — 2026-10-26

## Active goal

Overhaul Măm into an accessible, mobile-first, static/local-first PWA backed by the existing Firebase project. The user authorized rebuilding UI/backend, then explicitly withdrew SMS to avoid a paid Firebase plan. Authentication scope is now Email/Password and Google only.

Status: LIVE_GOOGLE_QA. Source commit e15d5b1ebceb90ba51680f82d00ff88524f88b45 was pushed to main. Deploy to GitHub Pages run 40270865304 completed successfully, including 49 tests, lint, typecheck, build and Pages smoke. The live page loaded index-B8o8WbIe.js, matching the CI build. The old PWA initially served cached UI, then a reload loaded the new UI without clearing data. Goal is active; no billing or Phone activation blocker remains in scope.

## Current implementation and checks

- Four-route light/dark UI; meal search, manual input, fractional portions, local dates, notes, edit/delete/undo, goals, optional PIN, JSON export and explicit guest import.
- IndexedDB v3 migration, owner-scoped records, atomic local/outbox writes, durable tombstones, revision-safe acknowledgement, account-change guards and lazy Firebase.
- Firebase project mam-app-877da, web app 1:837818293257:web:1d1c79247454655f6dacd8. Email/Password and Google enabled. User briefly enabled Phone, then asked to omit SMS; Phone is now confirmed Disabled in Console. Spark retained; no SMS regions or test numbers were configured.
- Removed PhoneSignIn, SMS SDK adapters, consent CSS, five obsolete Phone tests and the Phone smoke scenario. 49 tests pass; strict typecheck/build/Pages smoke pass. Lint exits 0 with the existing useJournal advisory. Auth/Firestore emulator smoke passes email, Google credentials, ownership/schema/boundary checks and delete/undo; emulator execution exited cleanly.
- Firestore rules already deployed. SHA256 D7AFDB0F8340DB89E950130F1DD3C6E8F50E18DE8B1FA216797DB6F8F7BE1022.
- Before SMS removal, all 24 main-route/theme/viewport states passed and an origin-unavailable PWA reload preserved data. The changed authentication screen was rechecked in dark mode at 320 and 1440 widths: local and email views have no horizontal overflow and no Phone button.

## Google QA and publication

The real Google chooser opened on localhost. User reported loading, then an unauthorized-domain error. DOM evidence places the domain error on 127.0.0.1:4179, while the localhost:4179 tab remained pending. Public Auth config fetched using the app's Web key confirms project number 837818293257 and authorized domains localhost, mam-app-877da.firebaseapp.com, mam-app-877da.web.app and collide0412.github.io. 127.0.0.1 is not authorized. Real Google OAuth success is not yet certified; use one published URL to eliminate test-tab confusion.

Repository origin is https://github.com/collide0412/mam-web.git. The overhaul is committed and pushed as e15d5b1ebceb90ba51680f82d00ff88524f88b45. All required VITE_FIREBASE_* secret names exist. Pages is live at https://collide0412.github.io/mam-web/. The compiled live entry's public Web key was checked without printing it: Auth configuration returned HTTP 200, project number 837818293257 and collide0412.github.io allowed. The original old public tab was refreshed to the new UI after confirming its fields were empty, releasing the old database connection without deleting storage.

Next: user is selecting Google in popup 1434514073, opened from live app tab 1434514070 at https://collide0412.github.io/mam-web/. Both tabs are marked handoff. Verify live cloud session/sync, update this checkpoint and QA_REPORT, commit the final documentation evidence, and close the goal only when the revised scope is proven. The GitHub connector filters workflow queries to PR events, so gh CLI was used for the push-triggered deployment. Workflow: https://github.com/collide0412/mam-web/actions/runs/40270865304.

## Running surfaces and tools

Node: C:/Users/dangc/AppData/Local/mam-toolchain/node-v24.22.1-win-x64. Java: C:/Users/dangc/AppData/Local/mam-toolchain/jdk-21.0.12.1+1-jre/bin.

Preview servers 4178 and 4179 were stopped after verifying their task commands/PIDs. Temporary local QA tabs were closed and viewport overrides reset. Console user tab 1434513996 remains open; the project overview QA tab was closed. Original public tab 1434513922 is now on the new UI. Live app 1434514070 and Google popup 1434514073 are the current handoff. Emulators are stopped. Do not restart local previews to complete this live OAuth check.

Evidence is under ignored .omo/evidence/. The two earlier implementation agents stopped at a usage limit; root completed integration. Do not restart workers or re-run finished checks without a changed requirement, failure or unresolved risk. No memory files were updated.
