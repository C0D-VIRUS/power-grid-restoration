# GridRestore — Power Grid Fault Restoration Simulator

A DAA FA2 academic simulation demonstrating two graph algorithms in a power-distribution context:

- **Dijkstra's algorithm** finds a minimum-weight route through the currently enabled power lines. Disabled lines are excluded; all weights must be non-negative.
- **Greedy graph coloring** assigns repair jobs to time slots. Jobs connected by a conflict edge cannot share a slot. The number of slots is the result of this greedy coloring order, not a claim of globally optimal scheduling.

## What's included

- Three predefined, selectable networks: Campus, City, and Industrial.
- Interactive power-grid schematic; select a line and inject a fault or restore it.
- Select route source and destination, run Dijkstra, and use **Play steps**, **Pause steps**, **Previous**, **Next step**, or **Reveal result** to follow the algorithm before the final route is shown.
- Repair-job conflict graph with color-coded vertices. Remove a conflict by clicking the `×` marker on its edge; add conflicts with the job selectors; recalculate coloring to see the new slots.
- Repair queue, algorithm complexity labels, reset controls, and a simulation event log.
- A combined simulation that runs both algorithms against the selected network and its current fault/conflict settings.

The networks, weights, faults, and conflicts are illustrative data for teaching and demonstration. This is not a real electrical load-flow or safety-control system.

## Run locally

Requirements: Node.js 18+ recommended.

Terminal 1 — backend:
```bash
cd backend
npm install
npm run dev
```
Backend API: `http://localhost:5000/api`

Terminal 2 — frontend:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal, usually `http://localhost:5173/`.

Keep both terminals running. If the frontend says API OFFLINE, start/restart the backend and refresh the page.

## Demonstration sequence

1. Select a network.
2. Select a power line and click **Inject fault**.
3. Run Dijkstra and step through the trace to observe the changed route or unreachable result.
4. Open **Crew coloring**, add/remove conflict edges, and recalculate coloring.
5. Run the full simulation to show the routing trace and repair-slot assignment together. The final path is intentionally hidden until the Dijkstra trace reaches its last step.
6. To test an unreachable destination, disable every line connected to the destination (for the City scenario, disable E8, E10, and E11). The result should say **Unreachable** and explain that a connection must be restored.


## Verified workflow and troubleshooting

- The dashboard loads scenario data from the backend and sends Dijkstra, coloring, and combined-simulation requests to the API. Vite proxies `/api` to `http://localhost:5000`, so the frontend uses one consistent API path.
- `Run both algorithms` calculates the shortest route using currently enabled lines and creates a greedy conflict-free repair-slot plan. It reports unavailable lines and the result in the event log; it does not physically control a power grid or automatically mark repairs complete.
- Inject a fault by selecting an active line and choosing **Inject fault**, then run Dijkstra or both algorithms again. Choose **Restore line** to re-enable that line.
- Run backend checks with `npm test` from `backend`, and frontend production build with `npm run build` from `frontend`.
- If port 5000 is already occupied, stop the old backend terminal with `Ctrl+C` before starting another one. Keep both frontend and backend terminals open while using the dashboard.

## Connected fault-to-repair workflow

1. Choose a scenario and select a line that has a linked repair job (the line selector shows its job underneath the controls).
2. Click **Inject fault** to mark that line unavailable.
3. Click **Build recovery plan**. The frontend requests Dijkstra's route and the graph-coloring schedule from the backend. The matching repair job and its assigned slot are shown.
4. Click **Complete Slot N repair**. The backend checks the coloring assignment, restores the failed line(s) linked to jobs in that slot, and recalculates the route using the restored graph. The frontend then updates the grid and event log.

Repair jobs include an `edgeId` field linking each simulated job to the line it repairs. These links and job-conflict relationships are educational example data, not real utility maintenance records. Every predefined line is linked to exactly one repair job. The job/conflict relationships remain illustrative teaching data, not validated utility maintenance rules.

The new `POST /api/simulation/repair-slot` endpoint accepts `{ graph, slot, sourceId, targetId }` and returns the updated graph, repaired lines/jobs, new route, and updated schedule. Run `npm test` in `backend` to run the algorithm and scenario regression tests, including unreachable destinations, zero-weight edges, invalid weights, every single-line fault across all scenarios, conflict-slot validity, and complete line-to-job mapping.
