# GridRestore Fixes and Verification

## Behavior fixes

- Dijkstra now validates source/destination IDs, edge endpoints, and finite non-negative numeric weights before running.
- The UI does not reveal the final route or highlight its full path until the Dijkstra trace reaches the final step.
- Added Play/Pause steps, Previous, Next step, Reveal result, and a trace progress indicator.
- Added a clear unreachable-destination explanation when no enabled path connects source to target.
- Changing a line status clears stale route/crew/recovery results so the dashboard cannot present an old route as current.
- Changing the selected line or conflict graph clears a recovery plan that would otherwise refer to stale state.
- The repair-slot operation now reports only jobs attached to lines that were actually repaired.
- The conflict graph now lays out every job dynamically rather than assuming only F1–F5 exist.
- API graph validation rejects duplicate/missing line IDs, unknown endpoints, non-numeric or negative weights, and missing line status flags.

## Algorithm preservation

- Dijkstra remains the same array-based shortest-path algorithm with complexity O(V² + E).
- Greedy graph coloring remains the same degree-ordered greedy algorithm with complexity O(J²).
- The graph representation, disabled-edge behavior, repair-job conflict relationships, and existing scenario definitions are retained.

## Automated verification

Run `npm test` from `backend`. The current suite has 16 passing tests covering:

- Lowest-cost path selection.
- Disabled edges and unreachable destinations.
- Source equals destination and zero-weight edges.
- Invalid, negative, infinite, and non-numeric weights.
- Invalid source/destination IDs.
- Valid coloring for chain and triangle conflict graphs.
- Repair job / line mapping and conflict references in all scenarios.
- Every conflicting pair receiving different slots.
- Destination isolation in every predefined scenario.
- Every individual single-line fault in every scenario.
- Successful repair-slot restoration and rejection of empty repair slots.

The frontend JSX was syntax-checked with the installed TypeScript parser. A Vite production build could not be run in the editing environment because dependency installation timed out; run `npm install` and `npm run build` in `frontend` on the target machine as the final environment-specific check.

## Scope

This remains an academic simulation. It does not model electrical load flow, protection coordination, real crew availability, or real-world switching safety.
