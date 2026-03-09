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

4. **Full local stack:** Start the backend first (`cd backend-server && make up`), then run `npm run dev:local` so the frontend talks to your local Django API at `http://127.0.0.1:8080`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (uses deployed API) |
| `npm run dev:local` | Dev server pointing at local backend (port 8080) |
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
│   │   ├── graph/             # System map components (Cytoscape, detail panel)
│   │   ├── search/            # Search bar component
│   │   └── layout/            # Layout and error boundary
│   ├── themes/
│   │   └── theme.ts           # MUI theme customization
│   ├── types/
│   │   ├── models.ts          # TypeScript interfaces for API data
│   │   └── general.d.ts       # General type declarations
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

The graph visualization uses Cytoscape.js:

- **`SystemMap.tsx`** — Main component: initializes Cytoscape, handles layout and interactions
- **`cytoscape-styles.ts`** — Node/edge visual styles (colors, shapes, sizes by entity type)
- **`DetailPanel.tsx`** — Side panel showing details for the selected node

Graph data comes from the `/api/v1/graph/` endpoint via `graphSlice.ts`. Nodes have `primary_type` (Mechanism, Decision Maker, Institution) and `secondary_type` for styling.

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
| `VITE_API_DOMAIN_URL` | Backend API base URL | `http://127.0.0.1:8080/` |

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
