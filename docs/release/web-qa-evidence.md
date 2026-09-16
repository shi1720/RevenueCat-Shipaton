# Web data and accessibility verification

Verified September 16, 2026 against the exported app at `http://127.0.0.1:4173`. Tests run in Chromium desktop and Pixel 7 browser emulation with two workers. These are browser checks, not native hardware, billing, or store-publication evidence.

## Commands and results

```sh
npx playwright test tests/e2e/data-and-accessibility.spec.ts --workers=2
# 12 passed, 8.0 seconds

npx playwright test tests/e2e/data-and-accessibility.spec.ts --workers=2 --grep '320px'
# 2 passed, 1.9 seconds after the heading-wrap correction

npx tsc --noEmit
# Passed before the final heading-only adjustment
```

The full 12-test run preceded the final heading-bounds assertion. A visual review found a clipped heading even though document width stayed within the viewport. The targeted rerun then verified the stronger assertion against the corrected build. Run the entire repository suite again when creating a release candidate.

## Behaviors demonstrated

| Scenario | Observed outcome |
| --- | --- |
| Add a photo using the browser file picker | App accepts the original 32 × 32 PNG test fixture and shows the photo |
| Reload a saved project | Photo and context remain visible |
| Export a portable backup | Downloaded JSON contains embedded JPEG data rather than a temporary object URL |
| Erase, import, and reload | Original project, next step, and photo return after explicit replacement confirmation |
| Independently decode backup image | Embedded image decodes to the expected 32 × 32 dimensions |
| Cancel project deletion, full erase, and valid replacement import | Original project and materials note remain after reload |
| Import a malformed record | User receives an explicit rejection and current data remains unchanged |
| Start a second project while a session runs | Guard preserves the first project’s session, including after reload |
| Combine energy and time | Gentle work remains eligible at higher energy levels, while time still excludes longer work |
| Automated accessibility | Zero axe violations tagged WCAG 2 A/AA and WCAG 2.1 A/AA on dashboard, project detail, and project form in both browser profiles |
| 320px layout | Dashboard, project detail, and form stay within document width and visible heading bounds |

Tests live in `tests/e2e/data-and-accessibility.spec.ts`. The fixture `tests/fixtures/project-photo.png` is an original programmatically generated checker image used only for testing. It has no external image dependency or license requirement.

## Review findings and fixes

The first axe pass exposed navigation tabs without their required tablist parent, muted text with insufficient contrast, and inappropriate modal ARIA markup. The root implementation corrected those issues. A subsequent complete axe run passed in desktop and mobile browser profiles.

The first narrow screenshot showed “Good to have you back” clipped at 320px. Its right edge measured approximately 382.64px despite the document reporting a 320px width. Constraining the header’s flex child fixed the wrapping. A new per-heading geometry assertion now catches this class of clipped-content regression. The final screenshot shows the full heading on two lines.

Screenshots and accessibility scans wait for fonts and finite CSS animations to settle. Earlier mid-animation captures were not used as final visual evidence. The final narrow dashboard, detail, and form were visually inspected.

## Limits

Automated axe checks cover only detectable rules in the scanned states. They do not certify complete WCAG conformance, screen-reader quality, keyboard focus behavior, every screen, dynamic type, or native accessibility. Native camera permissions, physical-device reminders, native photo-file cleanup, actual purchases, signed-store installation, and account flows with real credentials still require separate verification.

The fixture exercises a small valid image and a single-project backup. Large archives, interrupted native writes, and media cleanup have separate unit/release checks. A browser emulation profile does not establish that the app behaves identically on a physical Pixel, Galaxy, or iPhone.
