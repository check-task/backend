# Copilot / AI Agent Instructions for Check-Task backend

Short, actionable notes to help an AI become productive in this repository.

- **Project root:** Node.js backend using ES Modules (`"type": "module"` in package.json).
- **Run:** `npm run start` (prod), `npm run dev` (nodemon for development).

## Big picture
- Minimal Express-based API scaffold. Key folders under `src/`:
  - `controllers/` — HTTP handling, map routes to service calls.
  - `services/` — Business logic (async functions preferred).
  - `repositories/` — Data access abstraction layer.
  - `dtos/` — Request/response shapes and any small validation helpers.
  - `errors/` — Centralized error definitions and error codes.
  - `utils/` — Small utilities (see `src/utils/CustomError.js`).

## Response & error conventions (must follow)
- `src/index.js` decorates `res` with two helpers: `res.success(success)` and `res.error({ errorCode, reason, data })`.
  - Use `res.success(...)` to return successful payloads: response JSON shape is `{ resultType: "SUCCESS", error: null, success }`.
  - Use `res.error(...)` (or throw an error that the global error middleware handles) for failures: middleware returns `{ resultType: "FAIL", error: { errorCode, reason, data }, success: null }`.
- Global error middleware expects thrown errors to include `statusCode`, `errorCode`, `reason`, and optional `data`.

## Error class
- `src/utils/CustomError.js` defines `class CustomError extends Error { constructor(statusCode, message) { ... } }` and is exported with CommonJS (`module.exports`).
- Note: repository uses ESM (`type: "module"`) but `CustomError.js` uses CommonJS. When modifying, prefer maintaining compatibility: either keep CommonJS for that file or convert to ESM consistently and update imports where used.

## Module style and gotchas
- `package.json` sets `type: "module"`. Default code is ESM (`import ... from '...'`).
- Be cautious when editing files that currently use `module.exports` / `require` vs `import` / `export` — changing one file may require updating its callers.
- `src/index.js` uses `cors()` but there is no `import cors from 'cors'` in the current file; if you add or modify middleware, ensure `cors` is imported and listed in `package.json` dependencies.

## Patterns & examples
- Controller → Service → Repository flow. Keep controllers thin and return or throw `CustomError` for failures.
- Example: Throwing an HTTP 404

```js
// inside a service
import CustomError from '../utils/CustomError.js' // if converted to ESM
// or const CustomError = require('../utils/CustomError') // if kept CommonJS
throw new CustomError(404, 'User not found');
```

The global middleware will send a failure JSON using `err.statusCode` and `err.message`.

## Developer workflows
- Start server: `npm run start`
- Dev (auto-reload): `npm run dev`
- No test runner configured; `npm test` is placeholder.

## Files to inspect when changing behavior
- `src/index.js` — response helpers, middleware, server start.
- `src/utils/CustomError.js` — error class implementation.
- `src/controllers/`, `src/services/`, `src/repositories/`, `src/errors/` — implement new routes/business logic here.

## Rule-of-thumb for AI edits
- Preserve existing module style unless making a coordinated conversion across callers.
- When adding middleware used at app-level (e.g., `cors`), ensure imports and `package.json` dependencies are updated.
- Keep API response shape compatible with `res.success` / `res.error` helpers.

If anything in this summary looks wrong or you want more examples (route, controller, service), tell me which area to expand.
