---
name: Zyon TFT
description: Dense composition workspace, manual team planner and transparent overlay, version 0.4.
colors:
  graphite: "#0e1014"
  panel: "#161a21"
  selected-panel: "#1a1d23"
  rail: "#13161c"
  topbar: "#13161b"
  line: "#272d38"
  shell-line: "#252931"
  selected-line: "#645332"
  text: "#e8eaf0"
  muted: "#a6aebb"
  yellow: "#f3bd36"
  title-gold: "#efc14f"
  mint: "#65c7b2"
  navigation-active: "#302919"
  navigation-text: "#f3c44f"
  input: "#181c23"
  input-line: "#333944"
  primary-button: "#f0bb3b"
  primary-hover: "#ffcf60"
  primary-ink: "#201c11"
  secondary-button: "#252b35"
  secondary-hover: "#303846"
  secondary-line: "#3a4351"
  secondary-ink: "#dce3ed"
  board: "#191e24"
  board-line: "#303743"
  hex-line: "#3a424d"
  hex-fill: "#1c2229"
  selected-hex: "#e2bc57"
  table: "#161b23"
  table-head: "#1d232d"
  table-line: "#2a323f"
  table-hover: "#1d2531"
  pinned: "#3d321e"
  pinned-text: "#f0c24d"
  badge: "#2f2919"
  badge-text: "#ffdf76"
  badge-line: "#c9ac51"
  cost-one: "#828c9c"
  cost-two: "#51a584"
  cost-three: "#5b9bd7"
  cost-four: "#b178d8"
  cost-five: "#d5b34c"
typography:
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  row-title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 750
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  navigation:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "11px"
  section:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 750
  action:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 700
  table-label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "8px"
    fontWeight: 700
    letterSpacing: "0.035em"
  badge:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 750
    lineHeight: 1.1
rounded:
  equipment: "2px"
  small: "4px"
  portrait: "5px"
  control: "6px"
  navigation: "7px"
  table: "11px"
  panel: "12px"
spacing:
  tight: "4px"
  icon: "6px"
  small: "8px"
  control: "10px"
  content: "12px"
  group: "16px"
  section: "18px"
  workspace: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-button}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-button}"
    textColor: "{colors.secondary-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  search-field:
    backgroundColor: "{colors.input}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "37px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.navigation-text}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "0 11px"
    height: "40px"
  composition-row:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  board-panel:
    backgroundColor: "{colors.board}"
    rounded: "{rounded.panel}"
  catalog-table:
    backgroundColor: "{colors.table}"
    rounded: "{rounded.table}"
  shop-badge:
    backgroundColor: "{colors.badge}"
    textColor: "{colors.badge-text}"
    typography: "{typography.badge}"
    rounded: "{rounded.small}"
    padding: "5px 9px"
---

# Design System: Zyon TFT

## Overview

**Creative North Star: "The Compact TFT Workbench"**

Version 0.4 carries the established graphite, Manrope and restrained gold identity into a wider composition workspace, a large manual planner and searchable data tables. The six user-selected references 06–11 in `design/references/` govern the current surface hierarchy; 01–05 remain the earlier identity references. Portraits and equipment carry the information. Background splash art stays secondary. Navigation labels and the contextual pinned-plan aside give the desktop a stable frame.

The planner and transparent native overlay share the saved team: positions, equipment and manually chosen stars. Gold marks selection, pinning, carry emphasis and shop membership; mint marks active status. Curated guides retain dated attribution until edited into personal plans. Initial positions are local suggestions; manual positions are labeled as the user's plan. Trait totals exclude item and special-mechanic bonuses. Guide counts describe presence in the curated sample, never win rates. Demo-shop and experimental OCR states stay explicit.

**Key Characteristics:**

- Graphite surfaces, white/gray hierarchy and restrained gold emphasis.
- Wide horizontal composition rows, labeled desktop navigation and contextual aside.
- Large point-up hex board, compact champion/item pools and unit inspector.
- Searchable catalog tables with real traits, recipes and curated-guide counts.
- Flat workspace panels and a translucent floating overlay.

## Colors

Frontmatter captures the reusable 0.4 values from `src/workspace.css` and inherited focus/status/badge roles in `src/styles.css`. The workspace overrides the older root palette locally; values describe the rendered surface rather than renaming the root CSS variables.

### Primary

- **Signal Yellow:** selected tab underlines, focus and membership signals.
- **Action Gold:** filled planner action, with a brighter hover state and dark ink.
- **Title Gold:** composition names and related plan emphasis.
- **Pinned Gold:** a dark tinted surface with gold text for the pinned action.

### Secondary

- **Status Mint:** active status, paired with text. A live dot does not imply OCR certainty.
- **Cost Gray, Green, Blue, Violet and Gold:** independent champion-cost encodings. The workspace uses its own observed cost border set; native overlay styling remains separately scoped.

### Neutral

- **Graphite, Panel and Selected Panel:** shell, ordinary rows and selected rows.
- **Rail and Topbar:** quiet navigation frame, bounded by thin shell lines.
- **White and Muted Gray:** primary hierarchy and supporting copy.
- **Board, Hex and Table:** close navy/graphite tones for game geometry and structured data.

**The Information Color Rule.** Keep cost, selection/pinning/membership and active-status meanings distinct. Never use color alone to imply detection certainty.

## Typography

**Font:** Manrope with Arial and sans-serif fallbacks. Local imports provide 400, 500, 600, 700 and 800. CSS also requests 650 and 750; these are observed source weights, rendered using available static faces.

### Hierarchy

- **Headline:** compact workspace heading, reducing to 23px at intermediate widths and 19px on mobile.
- **Title:** pinned-plan name; supporting settings headings use 15px.
- **Row title:** gold composition name, 13px below 1350px, 12px at the intermediate and mobile compact points, returning to 14px in the stacked tablet layout.
- **Body:** supporting workspace copy; settings/help copy uses a more open 1.8 line height.
- **Navigation / Section / Action:** labels, aside headings and compact actions.
- **Table label:** uppercase column headings with restrained tracking; table body uses 10px, principal unit names 11px.
- **Badge:** native shop membership label. Smaller preview sizes remain local density compromises.

Use sentence case for functional headings. Small uppercase provenance and state labels have a specific informational role.

## Layout

The desktop shell has internal scrolling, a labeled sidebar (176px), topbar (48px), content gutters (24px), statusbar (23px), and a fluid main column beside a contextual aside (278px) separated by 24px. The aside holds the pinned plan, planner action, overlay connection and shortcuts. The bottom test-shop drawer can collapse to release height. Composition rows reserve at least 171px for title, real traits, roster and actions; portraits are 44px inside 46px unit slots.

At 1700px and above, sidebar/aside widths become 192px/300px, content gaps/gutters 28px, portraits 49px and rows at least 185px. At 1350px and below, sidebar/aside widths become 150px/245px, gutters 18px and gap 17px. At 1100px and below, the sidebar becomes a 68px icon rail and the aside is 238px. At 850px and below, main and aside stack in document flow; the pinned plan remains after the main surface, while connection/shortcut/source extras hide. The titlebar create action moves to an explicit feed-toolbar button. At 540px and below, the rail is 48px, topbar 41px and content gutters 12px.

The planner gives the board the upper region: four staggered rows of seven hexes, a 148px trait column and fluid cells (aspect ratio 0.93). The pool and inspector below use a fluid column plus 245px; that inspector becomes 210px below 1350px and stacks before the pool below 1100px. Mobile hides the board's trait column, retains all 28 cells, and shows five pool units per row. Catalog tables retain a minimum 640px width on mobile inside their own scroll container, with sticky headings; they do not widen the document.

The native overlay uses a separate transparent, click-through layout: summary 24px from top/right, width 645px or 230px compact. Native cells are 55×65px, names 9px and equipment 17px. Shop membership badges follow the calibrated capture rectangle independently of workspace reflow.

## Elevation & Depth

Panels use one-pixel boundaries and tonal separation. The composition splash is masked and reduced to 0.16 opacity; pinned-plan art uses 0.32. The planner board adds a restrained radial green-gray wash. Selection has a local drop shadow on the chosen cell; floating toast and native overlay retain their established shadows. Unit names use dark text shadows for portrait legibility.

**The Flat Workspace Rule.** Use borders and tone to divide ordinary panels. Reserve floating shadows for feedback, selected game geometry and the overlay.

## Shapes

Small rounded portraits and equipment contrast with softly rounded panels. Navigation uses a modest radius; table/pool containers sit between controls and large composition panels. Point-up hex clipping defines the board, with inset portraits and cost edges. Status dots are circular. Icons are inline SVG line art. Preserve the existing compact geometry when adding controls.

## Components

### Buttons

Gold actions are compact, full-width controls inside the aside; secondary actions use a cool raised fill and thin line. Pinned controls use a dark gold tint. Hover changes tone, color and border over 160ms with ease timing; pressed brightness is 0.94. Disabled opacity is 0.45. Keyboard focus uses a two-pixel Signal Yellow outline, offset by three pixels. Reduced motion removes transitions and animations.

### Inputs / Fields

Search pairs a line icon with an input inside a bounded dark field. Workspace search and selects are 37px high; planner name is 33px with a 40-character limit. Keep accessible names for compact fields. Empty catalog results include an explicit clear-filters action.

### Navigation

Desktop navigation pairs icons and visible labels, with a dark warm active fill and gold text. Labels collapse below 1100px while accessible button names remain. Tab bars use a two-pixel gold underline. The mobile feed-toolbar create control stays visible when the header action collapses.

### Composition Rows and Aside

The title, actual traits and roster lead; source/patch and strategy data support them. Portrait equipment sits at the lower edge. Expand reveals strategy/editor detail and a planner action. The right aside is a compact pinned-plan summary with art, roster, primary planner action and connection context. Personal edits remove guide attribution. Never fill reference-shaped spaces with invented ranks, win rates or popularity.

### Manual Planner and Shared Board

Choose a cell, then a pool unit; drag from the pool or move existing units by drag/drop. The inspector sets zero to three manual stars, equips at most three items, selects carry or removes a unit. Rename, equipment, stars, roster and movement all create a personal plan and persist locally. Copy/import exchanges versioned Zyon JSON through the clipboard. These stars describe intent, never live upgrade detection. Saved positions/items/stars appear in the shared native board; initial positions remain clearly labeled suggestions until manual placement. Traits show the six largest unit counts and disclose excluded bonuses.

### Catalog Tables

Champions show cost, real traits, suggested role and presence among the curated guides; trait links filter champions and a plus action opens the planner. Traits show catalog breakpoints and related units. Items show category, component recipe and units equipped in curated guides. Use compact rows (57px), 35px principal portraits and 28px related-unit portraits. Sticky headers, row hover, search/filter controls and empty states keep the density usable.

### Shop and Status

The five-slot simulated shop is a collapsible laboratory. Cost frames and a separate gold match outline distinguish the unit from membership in the pinned plan; badges pair icon and text. Empty slots keep explicit labels. Detection uncertainty clears highlights. The overlay connection state, simulated-shop label and dated source remain adjacent to their surfaces.

## Do's and Don'ts

### Do:

- **Do** prioritize portraits, names, equipment and the shared plan over background art.
- **Do** preserve the desktop navigation and contextual aside, with access retained through responsive reflow.
- **Do** distinguish initial suggestions, saved manual choices, curated attribution and experimental detection.
- **Do** retain visible focus, reduced motion, accessible icon labels and native click-through behavior.

### Don't:

- **Don't** restore olive navigation or cream-filled surfaces from the rejected prototype.
- **Don't** invent win rates, upgrade detection, imported guide positions or complete trait bonuses.
- **Don't** add decorative eyebrow headings or floating shadows to ordinary rows.
- **Don't** promote tiny mobile board/footer labels into general typography targets.

Not canonized: some mobile board/footer and badge labels remain 5–7px; these are current density limitations. Native overlay and legacy screenshot-proof surfaces retain their own older palette/cost styling. This documentation records the 0.4 workspace without repairing or promoting unrelated pre-existing drift.
