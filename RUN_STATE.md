# Resume point — 2026-10-26

## Product

The mobile-first, static/local-first Măm PWA overhaul is complete. IndexedDB v3 stores owner-scoped journals with an atomic sync outbox. Firebase project `mam-app-877da`, app `1:837818293257:web:1d1c79247454655f6dacd8`, supplies optional Email/Password and Google accounts. SMS was withdrawn by the user to retain Spark; do not re-enable it.

Live Google sign-in, profile save reaching zero pending changes, and authenticated reload were verified on the published site. The earlier localhost chooser/domain problems are resolved historical observations, not an active blocker. See QA_REPORT.md for evidence and limits.

## Repository cleanup

Unused starter assets, demo components, obsolete scaffold reports and development-only React inspection dependencies have been removed. Tests, deployment scripts, security rules, migration data and product documentation are preserved. The three unused Hanoi CSVs now live under `data/hanoi/`, outside the deployed `public/` tree; SHA256 checks confirmed unchanged contents.

Validation: 49 tests pass before and after cleanup; strict TypeScript build, lint and Pages smoke pass. npm reports zero vulnerabilities; no remaining package version changed. The production output contains no CSV data files. Existing lint/chunk-size advisories remain documented in QA_REPORT.md. Cleanup is ready for commit/push to main and its automatic Pages deployment; the GitHub workflow records the deployment result.

## Operations

- Repository: https://github.com/collide0412/mam-web.git
- Product: https://collide0412.github.io/mam-web/
- Source overhaul: `e15d5b1`; live Google verification: `53ea4b1`.
- Node on this machine: `C:/Users/dangc/AppData/Local/mam-toolchain/node-v24.22.1-win-x64`.
- Preview servers and Firebase emulators are stopped. Do not clear browser storage; it may contain unsynced meals.
- Local environment, credentials, agent skills and `.omo/evidence/` are ignored by Git. No memory files were updated.
