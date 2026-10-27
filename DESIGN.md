---
name: ReserBUILD
description: Campus space booking set like an enlisted class on a printed schedule.
colors:
  paper: "#ffffff"
  panel: "#f6f6f4"
  ink: "#1c1c1c"
  ink-hover: "#333333"
  graphite: "#5c5c58"
  rule: "#e4e4e0"
  rule-taken: "#d2d2ce"
  shade: "#ececea"
  shade-ink: "#5f5f5b"
  closed: "#f5f5f3"
  off-peak: "#a9a9a4"
  danger: "#a8231b"
  danger-bg: "#fbeceb"
  ok: "#1d6b39"
  ok-bg: "#e9f4ed"
  warn: "#7a4e00"
  warn-bg: "#fbf3e1"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.333
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.333rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "\"tnum\""
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.556
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\""
  control:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.333
    fontFeature: "\"tnum\""
  block:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "\"tnum\""
rounded:
  block: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  row: "40px"
  gutter: "48px"
  target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.graphite}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.panel}"
  button-danger:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.danger}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.danger-bg}"
  button-quiet:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "44px"
  badge-neutral:
    backgroundColor: "{colors.shade}"
    textColor: "{colors.shade-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  notice:
    backgroundColor: "{colors.shade}"
    textColor: "{colors.shade-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  date-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 8px"
    height: "48px"
    width: "64px"
  date-chip-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  space-mark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    size: "40px"
  grid-block-yours:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.block}"
    rounded: "{rounded.block}"
    padding: "4px 6px"
  grid-block-taken:
    backgroundColor: "{colors.shade}"
    textColor: "{colors.shade-ink}"
    typography: "{typography.block}"
    rounded: "{rounded.block}"
    padding: "2px 4px"
  booking-block:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
  nav-link:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "44px"
---

# Design System: ReserBUILD

## Overview

**Creative North Star: "The Enlistment Grid"**

A booking is a block on your day, set like an enlisted class on a printed schedule. Every surface reads as a working printout: white paper, near-black ink, graphite for secondary facts, hairline rules every half hour, and a 2px ink rule under every heading that opens a section. There is no brand hue. Emphasis comes from ink density, weight, and the one inversion the system reserves: solid ink with white text means *yours* or *do this now*.

Density is operational, not airy. Pages are narrow single columns on phones (booking happens between classes) and widen to a three-part row layout for staff on desktop. Numbers are everywhere (times, pesos, references, deadlines) and every figure in the app sets in tabular figures so columns of times and amounts align like a timetable.

Color is a state channel only. Red, green, and amber each appear as a pale tint with a dark text tone, and only to say rejected or cancelled, confirmed or done, and waiting. Depth is flat throughout; structure comes from rules, tints, and the diagonal hatch for closed time.

**Key Characteristics:**
- Paper, ink, graphite, and hairline rules; no accent hue.
- 2px ink rule under every section heading, grid header, tally total, and fixed footer.
- Solid ink fill marks selection, ownership, and the primary action.
- One sans (Geist) at a compact ramp, tabular figures globally.
- Flat: no shadows anywhere.
- 44px minimum touch height on every control.

## Colors

A neutral printout palette with three state pairs; ink is the only emphasis.

### Primary
- **Schedule Ink** (ink): text, the 2px heading rule, primary buttons, the current date chip, the chosen space header, your selected block, the booking block, space marks, focus outline, selection highlight, and the peak segment of the charge bar.
- **Pressed Ink** (ink-hover): primary button hover only.

### Neutral
- **Paper** (paper): page ground, fixed footer, secondary and danger button fill, inputs.
- **Desk Gray** (panel): hover wash for rows, grid cells, secondary and quiet buttons; scrollbar track.
- **Graphite** (graphite): secondary text, hints, time labels, placeholders, input borders, disabled primary fill.
- **Hairline** (rule): half-hour grid lines, column dividers, list dividers, header bottom border, tally row lines, muted space-mark border.
- **Taken Gray** (shade) with **Taken Ink** (shade-ink): blocks booked by others, neutral badges and notices, a chosen but unavailable space header.
- **Taken Edge** (rule-taken): the 1px outline on taken blocks.
- **Closed Ground** (closed): the base of the diagonal hatch for hours with no rate.
- **Off-peak Gray** (off-peak): off-peak segments of the charge bar, beside ink peak segments.

### State pairs
- **Rejected Red** (danger / danger-bg): rejection, cancellation, destructive buttons, invalid field borders, error notices.
- **Confirmed Green** (ok / ok-bg): confirmed, checked in, success notices.
- **Waiting Amber** (warn / warn-bg): pending payment, payment being checked, deadlines.

### Named Rules
**The Ink Means Yours Rule.** A solid ink fill with paper text marks the user's own selection or block, the current item, or the one primary action. Only a free chosen space gets an ink header; a chosen but unavailable space gets Taken Gray.

**The State-Only Hue Rule.** Red, green, and amber appear only as state, always as a tint ground with its dark text tone. Never as decoration, never as an accent.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui, sans-serif)

**Character:** One workhorse sans, set compactly in bold and semibold, with tabular figures applied at the body so every time, price, and reference aligns.

### Hierarchy
- **Display** (700, 1.6rem): auth page titles (Sign in, Sign up).
- **Headline** (700, 1.333rem): page titles such as the booking day, My bookings, Payments to check, and the space name in the booking block; also the footer total.
- **Title** (600, 1rem): section headings over the 2px ink rule.
- **Figure** (700, 1.125rem): money and identifiers that must be read first: tally totals, payment amounts, space letters in the grid header.
- **Body** (400, 0.875rem): working text, list metadata, table rows, buttons (600), field labels (500).
- **Control** (400, 1rem): text inside inputs and selects, kept at 16px so phones do not zoom.
- **Label** (600, 0.75rem): badges, hints (400), grid time labels, date chip weekday.
- **Block** (600, 11px, tight leading): text inside grid blocks only ("Yours", "Taken", "A · 16:00–18:00 · ₱").

### Named Rules
**The Tabular Everywhere Rule.** Tabular figures are set on the body; never turn them off for prices, times, or references.

**The Weight Not Size Rule.** Hierarchy within a row is weight and ink versus graphite, not extra sizes. The ramp is fixed at the seven steps above.

## Layout

A centered column inside a 72rem (max-w-6xl) shell with 16px side padding. Booking keeps its working column at 48rem; booking detail sits at 42rem; lists at 48rem; auth at 24rem. Vertical rhythm uses 8px, 12px, 16px, 24px, and 32px gaps: 12px inside a section, 32px between sections on detail pages.

The day grid is the signature layout: a 48px time gutter then one equal column per space, 40px per half-hour row, hour labels in graphite with longer gutter ticks on the hour. The grid body scrolls inside a box capped at min(62vh, 36rem) and auto-scrolls the chosen block into view with one hour of context. On /book a fixed footer sits above a 2px ink rule with space, hours, total, pay-by, and the action; the page reserves bottom padding for it and respects the safe-area inset.

Responsive behavior changes at 640px (sm): the header nav wraps to its own full-width row below the product name on phones and inline above; the account shows initials on phones and full name on desktop; form field groups go from one column to two, three, or four. Staff queue rows become a three-part row at 1024px (lg).

## Elevation & Depth

Flat. No shadows exist in the build. Depth is conveyed by rules (hairline and 2px ink), tint grounds (Desk Gray, Taken Gray, state tints), and the inversion of ink fills. Closed time is drawn as a fine diagonal hatch (a 1px Hairline stroke every 7px at -45deg over Closed Ground), like a struck-out period on a timetable. A peak window is marked by a 2px ink line at 25% opacity across every column; the proposed time in columns other than the chosen one gets a 5% ink wash.

### Named Rules
**The Printout Rule.** Surfaces never lift. If something needs separation, draw a rule or change the ground.

## Shapes

Gently rounded rectangles at a small set of radii: 8px for buttons, inputs, notices, date chips, and the booking block; 6px for space marks; 4px for badges and the focus outline; 2px for blocks inside the grid, inset 4px from column edges so adjacent bookings read as separate. Fully rounded is used once, on the charge bar. Borders are 1px; the 2px rule is reserved for structural headings.

**The Space Letter Rule.** A space is drawn as its letter in a bold square at three fixed sizes (28px, 40px, 56px): ink fill by default, a Hairline outline with graphite letter when muted.

## Components

### Buttons
Plain, firm, and full-height for thumbs.
- **Shape:** 8px radius, 44px minimum height, 16px side padding, 0.875rem semibold label.
- **Primary:** ink fill, paper text; hover Pressed Ink; disabled Graphite fill at 70% opacity with not-allowed cursor.
- **Secondary:** paper fill, 1px ink border, ink text; hover Desk Gray.
- **Danger:** paper fill, 1px Rejected Red border and text; hover the red tint.
- **Quiet:** underlined ink text with no border; hover Desk Gray.
- **Motion:** 150ms color transitions only. Busy states swap the label ("Verifying…") and disable the button.

### Badges
- **Style:** 4px radius, 2px 8px padding, 0.75rem semibold, no wrap, tint ground with matching dark text: neutral, ok, warn, danger, or ink.

### Notices
- **Style:** 8px radius, 10px 12px padding, body size, same tone pairs as badges; danger notices are alerts, others are status.

### Inputs / Fields
- **Style:** paper fill, 1px Graphite border, 8px radius, 44px tall, 12px side padding, 16px text, graphite placeholder.
- **Focus:** the global 2px ink outline at 2px offset.
- **Error:** border turns Rejected Red; the action's error notice sits under the fields above the submit.
- **Field:** label (0.875rem medium) above the control, optional hint (0.75rem graphite) below, 6px between.

### Section
A heading over a 2px ink rule with an optional right-aligned action or fact (Balance, counts), then content 12px below. Used for every block of a working page.

### Navigation
- **Style:** 0.875rem medium links, 44px tall, 12px side padding, with a transparent 2px bottom border.
- **States:** hover shows a Hairline underline bar; current page gets an ink bar and semibold.
- **Header:** paper, 1px Hairline bottom border, bold product name, account and underlined Sign out at right.

### Date Strip
A horizontal scroll of 64 by 48px chips (weekday in label size over date in semibold base), 1px Hairline border, hover ink border; the current day is solid ink. The strip fades out at its right edge to signal more days.

### Day Grid (signature)
- **Header:** each space letter (bold, 1.125rem) over its quote or availability in label size, all on a 2px ink rule. The free chosen space inverts to ink.
- **Blocks:** taken by others are Taken Gray with a Taken Edge outline and "Taken"; your existing booking is paper with an ink outline and semibold "Yours"; the selection is solid ink with "space · time" and the price in bold. The selection animates top and height over 200ms ease-out.
- **Cells:** every half-hour cell is a link that moves the selection, hover Desk Gray.

### Charge Tally (signature)
A 10px fully rounded bar split into segments proportional to minutes, ink for peak and Off-peak Gray for off-peak, 2px apart; then a table of segments with time range, peak/off-peak in graphite, hours × rate in graphite, and amount, on Hairline row rules; total row under a 2px ink rule with the total at Figure size.

### Booking Block
The booking's identity as a solid ink card: a 56px paper square with the space letter in ink, then space name (Headline), the long date, and the time range in semibold 1.125rem. Status badge and people count sit below it on paper.

### Lists
Rows separated by Hairline dividers, a space mark at left, semibold primary line over a truncated graphite line, amount and status at right; whole rows are links with a Desk Gray hover.

## Do's and Don'ts

### Do:
- **Do** put a 2px ink rule under every section heading, the grid header, the tally total, and the fixed booking footer.
- **Do** reserve solid ink fill for yours, current, and the primary action.
- **Do** keep every interactive control at least 44px tall.
- **Do** show money with the peso sign and tabular figures, aligned right in tables.
- **Do** draw closed hours with the diagonal hatch and taken time as Taken Gray blocks in place, never as hidden rows.
- **Do** say state with a tint ground and its dark text tone, paired with words ("Rejected", "Waiting for payment").

### Don't:
- **Don't** introduce an accent hue; red, green, and amber carry state and nothing else.
- **Don't** use shadows or lifted cards; separate with rules and grounds.
- **Don't** present spaces as a list of room cards with Book buttons; time comes first, on the grid.
- **Don't** use Ateneo brand assets, the university logo or seal, or guessed official colors.
- **Don't** set text inside the grid below the 11px block size.
