# Reference reproduction QA — 17 November 2026

Compact roster correction: the160px mode now renders every champion from the actual selected plan instead of carry-only artwork. Native verification asserts exact roster count, portraits inside the compact bounds, no isolated carry portrait, and working restoration. Build,149 unit tests and43 native captures passed; `.runtime/overlay-compact-roster-{build,unit,ui}.log`. Earlier design verdicts do not imply user approval of this change.

## Catalog visibility correction

Lucas rejected the two-card default. The overlay now renders the entire matching catalog immediately, with scrolling; the former Ver todas gate is removed. Buscar e ordenar only toggles search/sort controls. The native verification now asserts the complete catalog before opening controls and again after closing them at1672/1122/840/640. Build,149 unit tests and43 native captures/38 layout checks passed; logs `.runtime/overlay-full-catalog-{build,unit,ui}.log`. The earlier six-fix design verdict below does not imply user approval of this subsequent behavior correction.

final result: SHIP — six scored fixes only

The main application's listed card corrections remain resolved in its petroleum/turquoise scope. The latest two user-supplied images now directly authorize the black/graphite and electric-blue overlay implementation; the former pause for concept selection is superseded. The independent overlay review returned six fixes; the builder has applied its code batch and documentation scope corrections. The independent reviewer confirms SHIP for the six scored corrections: all resolved, with no introduced regressions. This is not whole-surface acceptance or final user visual approval.

## Current Overlay Evidence

- Authority: `design/references/overlay-selected-library.png` and `design/references/overlay-selected-team.png`; contract `design/OVERLAY-SELECTED-2026-11-17.md`.
- Source: `src/overlay-reference.css`, `src/GameGuide.tsx`, `src/OverlayComps.tsx`, `src/TftPanels.tsx` and `electron/guide-layout.cjs`.
- Latest evidence: `design/review/overlay-selected-2026-11-17/`,43 native captures and38 checks, `ok:true`, strict bitmap dimensions, disposable isolated profile and OCR fixture. Build and149 unit tests passed.
- Required modes: wide opened library/team at supplied reference dimensions, normal840/640 panels, compact160px and shop-only116×44. Restore preserves selected plan and game context.
- Implemented fix batch: detached short blue corner signature limited to library; card title sizing; native page headings/source placement; black/blue nested widgets; documentation separates retained turquoise main app from new overlay and removes obsolete pause. The independent final fix review resolves all six scored corrections, with no introduced regressions; it does not expand to whole-surface approval.
- The detector has two warnings for pinned navigation strip and tab underline devices found in the supplied reference. This is not a zero-warning or zero-primary claim.
- No publication, real-game verification, second-PC test or final visual user approval is claimed.

## Main Application Review — Historical Scope

## Findings

- **[P1, resolved] Compact library cards broke the horizontal composition.** The rejected user screenshot `C:/Users/Lucas/AppData/Local/Temp/codex-clipboard-5470b959-c0ad-4408-b267-97a613c0f154.png` and the original `main-library-1050.png` showed 164px cards with inset tall art, identity/metrics above and the roster below. This changed the source's reading order and first-viewport density. The replacement `main-library-1050.png`, captured at 15:31:02 local time, shows coherent art/identity/roster/decision columns, 128px rows, artwork flush to the card, compact roster wrapping inside its own track, and metrics grouped 2×2. This is an acceptable responsive translation of the chosen source.
- **[P2, resolved] Lunar Kayle lost the common row rhythm at 1536px.** The initial 15:26:51 `main-library-1536.png` showed its augment trio wrapping below style/level, growing the card beyond neighboring 106px rows. In the replacement captured at 15:46:00, the concise real style label, level and all three augments occupy one metadata line, and Kayle matches Ahri/Riftbeast in height and alignment. Replacement library captures at 15:45:54 (1672px) and 15:46:05 (1050px) preserve the correction without an observed regression in the affected geometry. Supplied checks corroborate 106px rows at 1672/1536 and 128px at 1050, with artwork height equal to card height and zero inset.
- **[Superseded overlay evidence]** The former eight-overlay-capture scope and concept-selection pause are historical. The current overlay authority and narrow six-fix verdict are recorded above.

## Comparison target and evidence

- Source visual truth: `design/references/selected-turquoise-interface.png`, 1672×941 pixels. This is the user's reproduction target, not a moodboard.
- Exact desktop comparison: `design/review/reference-2026-11-17/main-library-1672.png`, 1672×941 pixels and CSS viewport, DPR 1. Both images were opened together in one comparison input; no density normalization was needed.
- State: Portuguese dark library, first tier visible, actual catalog data, disposable authenticated account. The source contains illustrative TFT Helper branding and illustrative metadata. The user requires Zyon identity, actual data and a translucent Zyon logo as the sole card disclosure.
- All 27 named evidence files were visually opened and have the intended dimensions. These comprise library/filters/summary/priority/levels at 1672×941, 1536×1000 and 1050×820; planner/database/duo/settings at 1536×1000; and native team/library/summary/items at 840×800 and 640×800. None is blank, black, malformed or mismatched to its named state. Detail captures intentionally show the scrolled detail region.
- Full-view evidence: the same-size source and actual library reproduce a 192px labeled rail, 50px top bar, art-led header, full-width filters/feed, 42px tier bands, horizontal composition cards and right-hand metrics.
- Focused evidence: original-pixel first-card crops were displayed together, source above actual. Source crop `(230,383,480,108)`; actual crop `(230,384,480,108)`. This comparison resolves type character, splash crop, metadata and trait detail.
- Direct ground samples at `(205,500)`, `(205,700)`, `(1660,900)`: source `#0D151C`, `#0C121A`, `#0A1018`; actual `#0B1118` at all three points. The net ground preserves the source's deep petroleum value and temperature.

## Required fidelity surfaces

1. **Fonts and typography — acceptable.** Inter's neo-grotesque character, heavy title, compact card heading, regular UI labels and strong metrics agree with the source. The focused card comparison confirms lettering character and hierarchy. The 40/34/30px title steps are coherent across the supplied desktop widths. No fallback-looking display face, material collision or unapproved lettering treatment was found. Real names can ellipsize at compact widths; the detail view preserves their identity.
2. **Spacing and layout rhythm — acceptable in the reviewed main scope.** The 1672px grid, approximately 106px rows, 12px row gaps, full-width feed and large-region proportions preserve the source. The new 1050px grid resolves the previous topology defect without losing readable decision metrics. Replacement evidence resolves Lunar Kayle's row-height inconsistency at 1536px. Details, named numbered priority items, planner, table, duo empty state and preferences use coherent spacing in the supplied evidence.
3. **Colors and visual tokens — acceptable.** Petroleum ground, subdued metallic borders, translucent tonal card gradients, turquoise selection and dark-on-turquoise primary actions follow the chosen reference. Game rarity/tier/item colors retain their semantic roles. The 181 detector advisories are not a clean-detector claim or an instruction to flatten the approved material. This reviewer ran no second detector.
4. **Image quality and asset fidelity — acceptable in reviewed main evidence.** Hero and carry images use real official splash raster assets, units use real HUD portraits, and traits/items remain actual game assets. The focused first-card comparison preserves the source subject and visual role with an official crop. No CSS-painted replacement scene, placeholder champion illustration or fake product art was observed. Zyon branding/logo substitution is explicitly authorized. The new 1050px artwork is flush to its card and no longer a separate inset rectangle.
5. **Copy and content — acceptable.** Real counts, published style/final-level/augment metadata and actual PivotTFT statistics replace the mock's illustrative data. AP/scaling chips, damage categories and metric values were not invented. Priority items are grouped, numbered and named. Existing overlay copy distinguishes consultation, the chosen plan and paused OCR; these historical captures do not claim live gameplay or a second-PC test.

## Interaction, accessibility and validation limits

`src/ZyonPieces.tsx` leaves the title as text and makes the Zyon disclosure a labeled button with `aria-expanded`; the extra arrow is absent. Native details have a labeled Zyon close control; choosing/removing the overlay plan remains an explicit textual action. Focus rules provide a turquoise 2px outline and reduced-motion rules are present. The screenshots expose filter states, selected detail modes, compact native navigation, an empty duo state and disabled undo.

The supplied `checks.json` reports `ok:true`, no horizontal overflow, no broken images and no console errors in its captured scenarios. The parent reports 148 existing engine tests and a successful build. This reviewer did not open a browser, start the application, recapture evidence, rerun engines or test live gameplay. Pointer/keyboard behavior, loading/error behavior and text zoom were inspected only where supported by supplied source/evidence. No approval of the forthcoming overlay redesign is implied.

## Comparison history

- Earlier flat/blue-round approval is invalid for this source and was not used as authority.
- The prior root report recorded builder corrections to art, rail spacing and duplicate disclosure. Its proposal to expand through the title is superseded by the user's explicit logo-only request; current source/captures preserve the latest request.
- This independent full review opened the source and actual 1672px library together, all 27 required captures and focused card crops. The user's additional 1050px screenshot confirmed P1 and explicitly rejected the rectangles.
- The parent changed the compact card to a continuous grid. The 15:31:02 1050px replacement visually resolves P1. The three replacement library captures at 15:45:54, 15:46:00 and 15:46:05 resolve P2 and preserve P1. All three exact paths were reopened for this main-only verdict pass; no new issue was hunted outside the fix batch.
- The user then expanded scope to a planned complete overlay redesign. The subsequent selected overlay project is now implemented and evidenced above.

## Implementation checklist

- Main listed fixes are resolved; preserve the verified geometry in the three replacement library captures.
- Preserve official raster art, real data, petroleum/turquoise material, labeled rail, full-width feed and logo-only disclosure.
- The selected overlay project is now implemented and captured; finish independent verification of the reported correction batch.
- Preserve the narrow SHIP disposition for the six scored corrections only; mechanical checks and that verdict do not establish whole-surface or user approval.

This is supplied-source-image reproduction. No generated comp round or accepted concept roll exists; generated comp state/spec/diffs, a FORM seed and a generated-world quality card are not authorities for this request.
