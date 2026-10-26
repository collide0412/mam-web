# Măm design contract

## 1. Product and users

A Vietnamese meal journal that feels calm, quick and practical on a phone. Primary task: record what was eaten, then review a day. Also support an offline commuter and a keyboard/large-text user. No invented social activity, precision claims, medical advice or marketing dashboard clutter.

## 2. Visual direction and tokens

Warm paper with deep forest ink, botanical green actions and restrained orange nutrition accents. Native system sans-serif supports Vietnamese with no remote font request. Headings are confident, compact and left aligned. Food names and meal rows carry the screen; ornament is secondary.

CSS token contract (light / dark):

| Token | Light | Dark |
|---|---|---|
| bg | #f6f7f2 | #131c18 |
| surface | #ffffff | #1c2922 |
| surface-soft | #edf2e8 | #26382d |
| ink | #1d3329 | #edf4ed |
| muted | #5c6e63 | #acbdb0 |
| accent | #276349 | #a8d8b6 |
| accent-ink | #ffffff | #173322 |
| line | #d9e2d8 | #405448 |
| orange | #a34d20 | #f0ae80 |
| error | #b12828 | #ffabab |

Type sizes: 12, 14, 16, 18, 20, 24, 32, 40px; default 16px and 1.5 line-height. Font weights 400, 500, 600, 700. Space unit 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48. Corners 8, 12, 20, 28px; pills 999px. Main content maximum 1100px. Use neutral hairline borders for separation, no decorative accent stripes, no shadow-based card stacks. SVG icons at 20/24px with one consistent stroke style. No emoji controls.

## 3. Composition

Document is the only primary scroll owner. Min-height 100dvh; sticky app header; fixed mobile navigation with bottom safe-area padding and matching content clearance. On wide screens navigation sits in the header and content uses a purposeful two-column main/summary layout. No constrained phone screenshot floating on a desktop. Use minmax(0,1fr), wrapping text and intrinsic grids to survive 320px and zoom. Forms and dialogs scroll with the document, avoiding nested scroll traps.

Spatial reference: [StyleGallery layout catalog](https://github.com/changeroa/StyleGallery/blob/main/CATALOG.md), interpreted as a document-scrolling app shell with responsive split content. Existing Vite/React/CSS stack is retained.

## 4. Navigation and behavior

Four destinations: Hôm nay, Ghi món, Nhật ký, Cá nhân. A visible primary action records a meal. Today shows an energy ring, three macro bars, grouped meals and useful next action. Diary selects a local calendar day with previous/next and native date input; entries expose edit and delete, with undo after deletion. Search starts empty with the actual catalog or genuinely recent items; unmatched query displays no matches.

All save forms show pending, error and success states. Native labels, buttons, date/number/select inputs; focus-visible outline, 44px touch targets, escape/back navigation and reduced-motion support. Alerts are announced. Every route has a meaningful title and one h1. There is exactly one main landmark. Route transitions focus the page heading. No animation is essential to understanding data.

## 5. Reusable primitives

- Page heading: eyebrow, h1, contextual action; wraps naturally.
- Button: primary forest, secondary neutral border, text and destructive variants; disabled/pending states.
- Field: persistent label, native input, hint/error; no placeholder-only fields.
- Food/meal row: title, serving and category, nutrition trailing value, explicit edit action.
- Empty state: concise explanation plus applicable action; no fake populated data.
- Nutrition summary: numeric energy total and target, three macro labels with equivalent textual values; color is supplemental.
- Feedback: persistent inline error/status and optional undo action; no disappearing critical errors.
- Account panel: identifies local/cloud ownership and pending/error synchronization; offline label does not imply synchronization.

## 6. Content and acceptance

Vietnamese throughout. Catalog portions are explicitly approximate and unverified, with no confidence percentage or inferred monetary cost. Daily targets are user-entered starting values, editable and not presented as personalized prescriptions. Shared votes and allergen filtering are absent until real data supports them.

Verify 320/390px and desktop widths, light/dark, 200% text, long names, empty/populated/error states, keyboard, offline reload and actual add/edit/delete/undo. Performance and accessibility measurements must identify their tool/build; never invent a score or equate a static scan with assistive-technology testing.
