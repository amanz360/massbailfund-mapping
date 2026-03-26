# Mass Bail Fund - Frontend Client

React SPA built with TypeScript, Material UI, and Cytoscape.js for interactive system map visualization.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm (included with Node.js)

Verify installation:

```bash
node --version   # v20.x.x
npm --version
```

## Getting Started

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend-client
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the dev server:**

   ```bash
   # Connect to local backend (run backend-server first)
   npm run dev:local

   # Or connect to production API
   npm run dev
   ```

   The app is available at [http://localhost:5174](http://localhost:5174).

4. **Full local stack:** Start the backend first (`cd backend-server && make up`), then run `npm run dev:local` so the frontend talks to your local Django API at `http://127.0.0.1:8090`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (default API URL) |
| `npm run dev:local` | Dev server pointing at local backend (port 8090) |
| `npm run dev:live` | Dev server proxying to deployed API (avoids CORS) |
| `npm run build` | Production build (TypeScript check + Vite build) |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
frontend-client/
├── index.html                 # HTML entry point (OpenGraph tags, fonts)
├── public/                    # Static assets (logo)
├── src/
│   ├── main.tsx               # App entry point (renders <App />)
│   ├── App.tsx                # Router setup, data loading on mount
│   ├── api/
│   │   ├── api.ts             # Axios instance (base URL from VITE_API_DOMAIN_URL)
│   │   └── entities.ts        # API service functions (fetchGraph, fetchMechanisms, etc.)
│   ├── store/
│   │   ├── store.ts           # Redux store configuration
│   │   └── slices/
│   │       ├── graphSlice.ts  # System map graph state + async thunk
│   │       ├── browseSlice.ts # Browse/wiki page state
│   │       └── detailSlice.ts # Detail panel state
│   ├── views/
│   │   ├── Landing.tsx        # Landing page
│   │   ├── Home.tsx           # System map view (main visualization)
│   │   └── Browse.tsx         # Browse/wiki view
│   ├── contexts/
│   │   └── BrowseDataContext.ts # Browse data context + useBrowseData hook
│   ├── components/
│   │   ├── graph/             # System map graph (see "Graph Architecture" below)
│   │   ├── search/            # Search bar component
│   │   └── layout/            # Layout and error boundary
│   ├── themes/
│   │   └── theme.ts           # MUI theme customization
│   ├── types/
│   │   └── models.ts          # TypeScript interfaces for API data
│   └── utils/
│       └── entities.ts        # Data transformation utilities
├── vite.config.ts             # Vite config (React plugin, Emotion JSX)
├── tsconfig.json              # TypeScript config
└── eslint.config.js           # ESLint config
```

## Routes

| Path | View | Description |
|------|------|-------------|
| `/` | Landing | Landing page with project intro |
| `/map` | Home | Interactive system map (Cytoscape graph) |
| `/browse/*` | Browse | Wiki-style browse view of all entities |

The app uses `HashRouter` — all routes are prefixed with `#` in the URL (e.g., `app.example.com/#/map`).

## Common Modifications

### Adding a new page/route

1. Create the view component in `src/views/MyPage.tsx`
2. Add the route in `src/App.tsx` inside the `<Routes>` block:
   ```tsx
   <Route path="/my-page" element={<MyPage />} />
   ```
   Place it inside or outside the `<PublicLayout>` route depending on whether it needs the shared nav/layout.

### Adding a new API call

1. Add the function in `src/api/entities.ts`:
   ```ts
   export const fetchMyData = () =>
     api.get<MyType[]>('v1/my-endpoint/').then(r => r.data)
   ```
2. Define the TypeScript type in `src/types/models.ts`
3. If it needs global state, create an async thunk in the relevant slice or create a new slice

### Working with Redux state

State is managed with Redux Toolkit. The pattern:

1. **Slices** live in `src/store/slices/` — each has state, reducers, and async thunks
2. **Async thunks** call API functions and store the result in state
3. **Components** use `useSelector` to read state and `useDispatch` to trigger actions
4. **Store types** (`RootState`, `AppDispatch`) are exported from `src/store/store.ts`

To add new state:
1. Create a slice in `src/store/slices/mySlice.ts` using `createSlice` and `createAsyncThunk`
2. Add the reducer to `src/store/store.ts`

### Modifying the system map graph

The graph visualization uses [Cytoscape.js](https://js.cytoscape.org/) and lives in `src/components/graph/`. It's organized into focused modules so you can find and modify any aspect without reading the whole system.

**Start here:** `SystemMap.tsx` is the orchestrator (~145 lines). It wires together hooks, UI overlays, and the Cytoscape container. Read it to understand the overall flow, then follow imports into whichever module you need.

#### Graph architecture

```
components/graph/
  SystemMap.tsx           # Orchestrator — wires hooks + UI components
  types.ts                # Shared types (ViewLevel, ExpandedViewType, SystemMapProps)
  cytoscape-styles.ts     # Node/edge visual styles (colors, shapes, sizes, view-specific classes)

  hooks/
    useGraphNavigation.ts # View state, Cytoscape lifecycle, render dispatch
    useGraphEvents.ts     # Click, double-click, hover, keyboard handlers

  layouts/
    landingLayout.ts      # Landing view: layout pipeline orchestrator + node decorations
    landingSeeding.ts     # Landing view: DM corridor seeding + mechanism placement
    expandedLayout.ts     # Expanded views: tripartite column layout with barycenter ordering
    edgeLabelSpacing.ts   # Post-layout edge label gap enforcement

  elements/               # Cytoscape element construction (pure functions)
    landingElements.ts    # Build nodes + edges for landing view
    expandedElements.ts   # Build nodes + edges for any expanded view

  ui/                     # Presentational overlays (standard React components)
    GraphControls.tsx     # Zoom in/out, fit-all, help buttons
    GraphLegend.tsx       # Node shapes + institution color key
    GraphBreadcrumb.tsx   # "← System Map / Entity" navigation
    HelpOverlay.tsx       # First-visit hint

  utils/
    dotIndicators.ts      # DM institution dot SVG indicators
    graphHelpers.ts       # Shared utilities (node creation, edge traversal, institution heuristics)
```

#### Common graph tasks

| Task | Where to look |
|------|--------------|
| Change how the landing layout arranges nodes | `layouts/landingLayout.ts` (pipeline) and `layouts/landingSeeding.ts` (position seeding) |
| Tune spacing between DMs or mechanisms | `layouts/landingSeeding.ts` — constants at top of file (`DM_OFFSET`, `DM_SPREAD`, `MECH_SPREAD`, etc.) |
| Change what happens when you click a node | `hooks/useGraphEvents.ts` — tap handler |
| Change hover highlighting behavior | `hooks/useGraphEvents.ts` — mouseover handler |
| Modify the legend | `ui/GraphLegend.tsx` — self-contained, no graph knowledge needed |
| Change node/edge colors or shapes | `cytoscape-styles.ts` (static) or `layouts/landingLayout.ts` `applyNodeDecorations` (data-driven) |
| Change which nodes/edges appear in a view | `elements/landingElements.ts` or `elements/expandedElements.ts` |
| Change how expanded views position nodes | `layouts/expandedLayout.ts` |
| Adjust the detail panel | `DetailPanel.tsx` (separate from the graph system) |

#### How the graph works

1. **Data** arrives from `/api/v1/graph/` via Redux (`graphSlice.ts`). It contains nodes (Mechanism, Decision Maker, Institution), edges (relationships between them), and memberships (DM-to-institution affiliations).

2. **Elements** are built from this data by pure functions in `elements/`. Each function returns a Cytoscape `ElementDefinition[]` array — the nodes and edges that should appear in the graph.

3. **Layout** computes where nodes should be positioned. The landing view uses a deterministic preset layout — every position is computed directly from the data with no physics simulation. The pipeline in `landingLayout.ts` runs these steps:
   1. Pin institutions at evenly-spaced circle positions (radius scales with data)
   2. Seed DMs near their best institution, pulled toward secondary institutions
   3. Place multi-institution mechanisms at the average of their connected DM positions
   4. Place single-institution mechanisms alongside their institution on the circle arc
   5. Nudge overlapping nodes apart (institutions stay pinned)
   6. Animate from origin to final positions

   Expanded views use a tripartite column layout with barycenter edge-crossing minimization.

4. **Events** handle user interaction. Click navigates between views, double-click drills deeper, hover highlights related nodes and reveals hidden secondary membership edges.

5. **UI overlays** (legend, breadcrumb, controls, help) are standard React components layered on top of the Cytoscape canvas.

### Theming and styling

The app uses Material UI with Emotion:

- **Theme:** Defined in `src/themes/theme.ts` — colors, typography, component overrides
- **Component styling:** Use MUI's `sx` prop or Emotion's `styled()` for custom components
- **Global baseline:** `<CssBaseline />` in `App.tsx` normalizes styles

### Adding a new component

1. Create the component in the appropriate directory under `src/components/`
2. Use functional components with TypeScript interfaces for props
3. Use MUI components where possible for consistency

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_DOMAIN_URL` | Backend API base URL | `http://127.0.0.1:8090/` |

Set at build time (prefix `VITE_` exposes it to client code via `import.meta.env`).

## Learning Resources

If you're new to the frontend stack:

- [React Docs](https://react.dev/learn) — Start with "Thinking in React" and the tutorial
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Focus on "Everyday Types" and "Narrowing"
- [Redux Toolkit Quick Start](https://redux-toolkit.js.org/tutorials/quick-start) — createSlice, createAsyncThunk, configureStore
- [Material UI Getting Started](https://mui.com/material-ui/getting-started/) — Component library, theming, sx prop
- [Cytoscape.js](https://js.cytoscape.org/) — Graph theory library powering the system map
- [Vite Guide](https://vite.dev/guide/) — Build tool, dev server, environment variables
- [React Router](https://reactrouter.com/) — Client-side routing
