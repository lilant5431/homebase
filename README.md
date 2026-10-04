# Homebase

Homebase is a local academic planner for classes, assignments, assessments, and fixed commitments.

## Run

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the URL shown by Vite. Data is stored in this browser's local storage. It persists across reloads in the same browser profile, but is not synchronized or backed up. Avoid clearing site data if you want to keep your plan.

Use **Explore with sample data** on the empty dashboard to try an example plan. Sample data is never loaded automatically.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

## Structure

- `src/domain.ts`: academic entities, dates, and data operations.
- `src/storage.ts`: versioned browser persistence.
- `src/App.tsx`: navigation and manual planning screens.
- `src/AcademicUI.tsx`: reusable academic list and card components.
- `src/EditorModal.tsx`: validated create and edit forms.
- `src/config.ts`: product identity.

Phase 1 is intentionally local and manual. It has no accounts, scheduling engine, external connectors, or device synchronization.
