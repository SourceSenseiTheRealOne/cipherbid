# CipherBid Taste redesign

## Design read

CipherBid is a trust-first privacy protocol for crypto-native users, judges, and builders. The redesign uses a sharp editorial-industrial language built from black-chrome surfaces, bone text, one signal-green accent, and restrained interaction feedback.

## Dials

- `DESIGN_VARIANCE: 7` - asymmetric marketing composition, disciplined product layouts.
- `MOTION_INTENSITY: 3` - tactile hover, focus, and active feedback only.
- `VISUAL_DENSITY: 5` - compact enough for protocol facts without becoming a dashboard cockpit.

## Mode

Visual overhaul with strict content and information-architecture preservation.

## Current audit

### Preserve

- Routes: `/`, `/create`, `/demo/setup`, and `/auction?id=<positive-u64>`.
- Existing copy, punctuation, and privacy language.
- Form labels, field order, accessible names, and touch targets.
- Wallet discovery, account/network validation, Ready X custody, recovery handling, public RPC reads, transaction orchestration, and receipt links.
- Real live-auction reader as the homepage's functional visual.

### Retire

- Purple primary actions and blue-purple outer glow.
- Decorative grid background and purple radial spotlight.
- Repeated rounded-card containers at every hierarchy level.
- Mono uppercase eyebrow above nearly every heading.
- Four equal feature cards beneath the homepage reader.
- Mixed green/purple state language.
- Oversized 96px hero type that crowds the live product visual.

## Visual system

### Palette

- Canvas: deep graphite, never pure black.
- Primary surface: black chrome.
- Raised surface: cool graphite.
- Text: bone and steel.
- Accent/status: one signal green.
- Warning/error: amber remains semantic and is not used decoratively.

Purple is removed from the visual language. Green means actionable, verified, selected, or focused.

### Typography

- Compact system grotesk stack for display and UI.
- Monospace only for addresses, transaction hashes, chain IDs, numeric protocol data, and compact technical labels.
- Hero headline stays within two desktop lines and does not exceed the live reader's visual weight.

### Geometry

- Panels: 4px radius.
- Inputs and buttons: 2px radius.
- Pills: reserved for real network, finality, compatibility, and settlement states.
- Elevation comes from border hierarchy and inset highlights, not outer glow or large shadows.

### Layout

- Homepage: asymmetric 7/5 split. The real auction reader is the visual anchor. Protocol traits become one divider-based proof strip instead of four cards.
- Create and bidder setup: editorial route intro followed by a sticky wallet rail and a wider work surface.
- Auction: preserve the existing 12-column information architecture while flattening nested cards and strengthening lot, settlement, and receipt hierarchy.
- Loading and errors use the same shell and token system.
- Every multi-column composition collapses explicitly to one column below 768px.

### Motion and interaction

- No scroll hijacking, marquee, ambient loops, or pointer physics.
- Hover and active states use border/color plus at most a 1px transform.
- Focus rings use signal green and remain visible.
- `prefers-reduced-motion` disables transitions and transforms.

## Accessibility and runtime contracts

- Preserve one `main` landmark per route.
- Preserve role/name contracts and form labels.
- Keep interactive targets at least 44px.
- Keep all public routes free of unintended horizontal overflow at 390px.
- Preserve keyboard reachability and visible focus.
- No private values, recovery contents, wallet notes, or proof internals enter visual fixtures.

## Scope guard

Allowed changes:

- Global visual tokens and CSS.
- Presentation-only class names and structural wrappers that preserve semantics.

- Visual regression contracts and browser checks.

Forbidden changes:

- Contracts, ABIs, transaction calls, state machines, wallet capability logic, provider configuration, recovery cryptography, manifest values, evidence, submission hashes, or business logic.
- Route slugs, query contracts, primary form labels, form order, or wallet actions.
- Fake auction data, fake transaction receipts, stock photos, or generated protocol claims.

## Verification

- Focused visual/semantic RED to GREEN contracts.
- Full frontend formatting, lint, TypeScript, tests, Playwright, normal build, and Pages build.
- Cairo gates unchanged and green.
- Real Chromium verification on desktop and a true 390px viewport: route status, keyboard focus, no overflow, no console/page errors, and reduced-motion stability.
- Exact design-only changed-path review before staged promotion through `development`, `staging`, and `main`.
