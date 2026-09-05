# UI/UX Specification

## Information architecture

1. Authentication: email/password sign-up, login, recovery, and verification state.
2. World Library: private worlds, search, create, open, and basic management.
3. Create World: guided generation of one bounded terrain area.
4. Creator Workspace: primary 3D editing, inspection, status, and safety flows.
5. Account: profile and account security.

## Workspace and flows

Creation starts with a name, terrain-character preset, four understandable generator controls, and a visible reproducible seed. The creator previews terrain, creates it, and enters a workspace where local autosave begins immediately.

Sculpting provides raise, lower, smooth, and flatten modes with brush radius, strength, and falloff. Rivers are drawn and node-edited directly on terrain, with advisory feedback about source elevation, downhill flow, and drainage. A creator may deliberately preserve a fantasy exception.

Desktop uses a canvas-first layout: top bar, left tool rail, dominant center 3D canvas, contextual right inspector, and restrained bottom control shelf. Tablets use an adjustable inspector overlay; phones use a bottom tool tray and inspector sheet without removing core editing operations.

## Visual and accessibility direction

The interface uses warm parchment/off-white surfaces, restrained slate borders, deep-violet interactions, green saved state, and amber/red advisory state. Terrain provides the drama; chrome remains calm and direct.

The target is WCAG 2.2 AA. The editor must have keyboard-accessible paths for canvas operations, visible focus, accessible dialogs, non-color-only statuses/warnings, 44×44px touch targets, associated form errors, and reduced-motion support.

## Approval

Approved by the project owner on 2026-09-05. Public snapshot updated 2026-09-05.
