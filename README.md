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
npm run format:check
```

## Structure

- `src/domain.ts`: academic entities, dates, and data operations.
- `src/scheduling.ts`: pure available-time calculations from explicit planning windows and commitments.
- `src/storage.ts`: versioned browser persistence.
- `src/App.tsx`: navigation and manual planning screens.
- `src/AcademicUI.tsx`: reusable academic list and card components.
- `src/EditorModal.tsx`: validated create and edit forms.
- `src/config.ts`: product identity.

The application remains local and manual, with no accounts, external connectors, or device synchronization.

## Available-time engine (Phase 2.1)

`calculateAvailableTime(planningWindows, commitments)` returns chronological blocks with `date`, `startTime`, `endTime`, and `durationMinutes`. Windows and commitments use local `YYYY-MM-DD` dates and same-day `HH:mm` times. Overlapping or adjacent windows are treated as a union; merged commitments are subtracted from that union. Inputs are never modified.

Dates are assumed valid. Times must be between `00:00` and `23:59`, with end after start; invalid time intervals throw `RangeError`. Duration measures local clock minutes, without timezone or daylight-saving adjustments. Overnight intervals are not supported.

Planning windows must be supplied by the caller. This module does not infer or persist planning hours and is not connected to the UI or assignment placement.
