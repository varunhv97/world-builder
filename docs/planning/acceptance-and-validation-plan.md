# Acceptance and Validation Plan

## Definition of done

V1 is complete only when critical scenarios pass on the supported device matrix, there are no unresolved high-severity defects, security/access-control checks pass, and the project owner accepts the validated build.

## Validation layers

1. Unit tests for LOKA codecs/validation, commands, inverse patches, terrain rules, merge detection, and migrations.
2. Integration tests for auth, RLS isolation, checkpoint/worklog recovery, cloud sync, conflicts, storage failures, and server authorization.
3. End-to-end tests for account flows, creation, editing, undo/redo, deletion, autosave/recovery, responsive layouts, and keyboard paths.
4. Manual visual/usability review for 3D interaction, approved layout intent, canvas hierarchy, warnings, touch behavior, and readability.
5. Release checks for dependencies, migrations, backup/restore, monitoring, and staged deployment.

## Critical scenarios

- Accounts protect credentials and sessions; one account cannot read or modify another account's data, including through direct API or storage requests.
- Generated worlds are reproducible from the same seed and controls, and reopen without content loss or silent schema downgrade.
- Each completed gesture is exactly undoable and redoable. Crash, refresh, offline, and restart recover committed local work from checkpoint plus worklog.
- Compaction produces a valid LOKA snapshot; a failed compaction leaves a prior valid snapshot recoverable.
- Connected devices synchronize ordered changes; non-overlapping edits merge, while real collisions preserve both versions.
- All core editing operations work across desktop, tablet, and phone layouts, with keyboard alternatives and WCAG 2.2 AA UI expectations.

## Performance targets

On a representative medium-complexity world and current mid-range laptop: library feedback within 1 second; workspace shell/preview within 2 seconds; nearby-terrain interaction within 5 seconds; brush preview within 100 ms; at least 30 FPS interactive sculpting (60 FPS target); local durability within 250 ms; and sync state within 10 seconds under normal connectivity.

## Approval

Approved by the project owner on 2026-09-05. Public snapshot updated 2026-09-05.
