# Măm overhaul verification — 2026-10-26

## Scope and current result

The rebuilt software passes local checks and bounded browser use. The user removed Phone/SMS from scope to retain Spark. Email/Password and Google remain enabled; Phone is confirmed Disabled. The user requested publishing to GitHub Pages; deployment and real Google success are pending the publication check below.

## Automated evidence

| Check | Observed result |
|---|---|
| Vitest | 49 passed, 0 failed; .omo/evidence/overhaul-tests-final.json |
| TypeScript / build | Strict tsc -b and Vite production build pass |
| Oxlint | Exit 0; one existing advisory for async IndexedDB initialization in useJournal |
| npm audit | Last checked: zero vulnerabilities after compatible updates and patched grpc-js override |
| Pages smoke | Relative assets/scope/start URL, valid 192/512 PNGs and service-worker artifact pass |
| Firebase emulators | Email/password, Google credential, owner CRUD/query, delete/undo, schema/boundary rejection and foreign/unauthenticated denial pass |
| Firestore rules | Dry-run compiled and deployed to mam-app-877da |

The current test count excludes five tests for the SMS feature withdrawn by the user. Tests still cover v2-to-v3 preservation, owner key collision, local reads during unresolved auth, revision races, stale refresh, failed-item isolation, identity rollback, legacy identity confirmation, optional PIN, auth cleanup, session changes, guest-import checkpoints, portion precision and export Blob serialization.

Rules SHA256: D7AFDB0F8340DB89E950130F1DD3C6E8F50E18DE8B1FA216797DB6F8F7BE1022. The maximum-array regression now passes two lists of 30 strings on create/update, invalid last-element types/length, 31-item rejection and valid newline strings. String-only matches calls reject non-string elements without coercion; padded known-valid strings avoid Firestore's 1,000-expression limit. Nested arrays are rejected by the SDK before a rules request.

The entry bundle is approximately 326 kB and Firebase remains a separate approximately 711 kB lazy chunk. PWA precaching can download that chunk in the background. A non-failing large-chunk warning remains. React Doctor produced advisory findings; no perfect performance score is claimed.

## Browser evidence

Edge was operated through the supported browser tool. The full overhaul checks before SMS removal observed:

- Local journal creation without PIN; Vietnamese search and honest no-results.
- Fractional portions, native local date/time selection, backdating and editing; a 0.01-to-1 portion edit retained 420 kcal / 28 g protein / 46 g carbs / 14 g fat.
- Delete/undo and reload persistence; explicit custom nutrition input.
- Guest copying into an emulator email account, remote tombstone delivery/undo and distinct account journals.
- Cross-tab sign-out returning the second tab to onboarding.
- Four main routes at 320, 390 and 1440 widths in both themes: 24 states, no horizontal overflow, one main/h1, correct route heading. Heading focus, editor return focus and skip-link behavior were checked.
- Reload with the origin server stopped, saving a goal and reloading again retained the goal and meal. This is origin unavailable, not a full network block.
- Explicit JSON download link; the browser connector cannot certify Blob filesystem downloads. A component test reads the generated Blob and verifies content and URL cleanup.

After removing SMS, fresh dark-mode local and email entry views were checked at 320 and 1440 widths. Measured scrollWidth equals clientWidth (305/305 for both narrow views, 1425/1425 for desktop email, 1440/1440 for desktop local). No Phone button remains. Screenshots/DOM evidence are in the tool transcript. Temporary viewport overrides were reset.

The real Google chooser opened, but a completed login is not yet certified. The unauthorized-domain alert was observed on a 127.0.0.1 tab. The localhost tab remained pending after its popup disappeared. The app-key public Auth config confirms localhost and collide0412.github.io as allowed; 127.0.0.1 is absent. Continue real OAuth testing on the published URL to eliminate local-tab confusion.

## Security and limits

Owner authority comes from request.auth.uid. Create/update share strict validators. Exercised cross-account and unauthenticated requests were denied; this is bounded testing, not a formal security proof.

Rules validate timestamp format; clients additionally require canonical calendar values. A malicious owner can still store an invalid calendar date directly in their own journal. Deletion uses retained tombstones. Last server-accepted write wins across devices; concurrent offline edits are not merged. Very large histories need pagination/incremental remote reads. Device timezone changes can move displayed dates. These limits are documented in ARCHITECTURE.md and PRIVACY.md.

No full WCAG, assistive-technology, real-device touch/DPR or Lighthouse certification is claimed. Browser overlays intercepted some narrow-window clicks; keyboard navigation succeeded without disabling extensions.

## Publication checkpoint

Repository: collide0412/mam-web. Target: https://collide0412.github.io/mam-web/. The existing workflow deploys pushes to main. All required Firebase secret names are present; local credentials and agent evidence remain ignored. At this report checkpoint the overhaul has not yet been pushed. Record the exact deployed source commit, workflow result, live asset identity and live Google/session result after publication.
