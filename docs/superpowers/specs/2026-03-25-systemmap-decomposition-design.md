# SystemMap.tsx Decomposition Design

## Context

`SystemMap.tsx` is a 2,425-line monolith that implements the interactive graph visualization of the Massachusetts pretrial system using Cytoscape.js. It handles four view levels (landing, mechanism-expanded, DM-expanded, institution-expanded) with layout algorithms, event handling, and UI overlays all in one file.

This decomposition makes the graph code approachable for future maintainers who may not have deep dev experience or access to AI tooling. Every file should have one clear job and be understandable in isolation.

## Goals

1. Decompose into focused modules, each under 250 lines
2. Preserve all existing visual behavior (layout algorithms, event handling, styling)
3. Remove ~320 lines of dead/redundant code identified during review
4. Unify the three expanded views into a single parameterized concept
5. Make `SystemMap.tsx` a ~150-200 line orchestrator readable as a table of contents

## Non-Goals

- Simplifying the landing layout algorithm (corridor seeding, fcose config) — that is a separate follow-up where pieces are individually removed and visually verified
- Decomposing `DetailPanel.tsx` (tracked separately as M-20)
- Adding tests (tracked separately as H-7)

## Dead Code Removal

The following code is removed as part of this refactor:

| Item | Lines | Reason |
|------|-------|--------|
| `computeCircularPositions()` | ~200 | Positions computed but never consumed — `renderLanding` destructures only `elements` from `buildLanding`, discarding positions. Landing uses fcose, not preset positions. |
| `orderMechanismsForCircle()` | ~75 | Output feeds `computeCircularPositions` and determines element addition order, but cytoscape element order has no effect on layout. |
| `hashCode()` | ~7 | Only called within `computeCircularPositions`. |
| `hasRenderedRef` guard | ~20 | Graph data is not refetched. If it were, re-rendering with fresh data is correct behavior. |
| Deferred rendering `requestAnimationFrame` checks | ~15 | Container sizing check in all three `renderExpanded*` functions. Added during iteration but does not address a real failure mode. |
| Redundant `localStorage.setItem` | ~3 | Called on every node expansion; should be set once on first dismissal inside `HelpOverlay`. |

**Total: ~320 lines removed.**

## File Structure

```
components/graph/
  SystemMap.tsx              # Orchestrator (~150-200 lines)
  cytoscape-styles.ts        # Unchanged
  types.ts                   # ViewLevel, ExpandedViewType, SystemMapProps

  hooks/
    useCytoscapeInstance.ts   # Create, configure, destroy cytoscape + layoutRef
    useGraphEvents.ts         # Click, double-click, hover, mouseout, background tap, keyboard
    useGraphNavigation.ts     # View state machine, render dispatch, parent callbacks

  layouts/
    landingLayout.ts          # fcose config, seeding, corridor logic (named pipeline steps)
    expandedLayout.ts         # Unified tripartite layout for all expanded views
    edgeLabelSpacing.ts       # Post-layout edge label gap enforcement

  elements/
    landingElements.ts        # Build cytoscape elements for landing view
    expandedElements.ts       # Build elements for any expanded view (parameterized)

  ui/
    GraphControls.tsx         # Zoom in/out, fit-all, help toggle buttons
    GraphLegend.tsx           # Node shapes + institution color key
    GraphBreadcrumb.tsx       # "← System Map / Entity" with copy-link
    HelpOverlay.tsx           # First-visit hint (owns localStorage state)

  utils/
    dotIndicators.ts          # DM institution dot SVG generation + application
```

**Existing unchanged files** in `components/graph/`: `DetailPanel.tsx`, `QuoteSection.tsx`, `ReferenceSection.tsx`, `TimelineSection.tsx`.

## Module Design

### `types.ts`

Shared type definitions used across multiple modules:

```ts
export type ViewLevel = 'landing' | 'expanded' | 'expanded-dm' | 'expanded-institution'
export type ExpandedViewType = 'mechanism' | 'dm' | 'institution'

export interface SystemMapProps {
  onNodeSelect?: (nodeId: string | null) => void
  onMechanismExpand?: (mechanismId: string | null) => void
  onDmExpand?: (dmId: string | null) => void
  onInstitutionExpand?: (institutionId: string | null) => void
  focusNodeId?: string | null
  focusCounter?: number
  resetCounter?: number
}
```

### `SystemMap.tsx` — Orchestrator

The main component wires hooks and UI sub-components together. A developer reads this to understand the overall flow, then follows imports to any specific concern.

**Responsibilities:**
- Read graph data and loading state from Redux
- Memoize `institutionColors`
- Wire `useCytoscapeInstance`, `useGraphNavigation`, `useGraphEvents`
- Handle external control effects (`focusNodeId`, `resetCounter`)
- Render cytoscape container + UI overlays
- Render loading spinner when `graphLoading && !graphData`

**Shape:**
```tsx
export default function SystemMap({ onNodeSelect, ... }: SystemMapProps) {
  const graphData = useSelector(selectGraphData)
  const graphLoading = useSelector(selectGraphLoading)
  const dispatch = useDispatch<AppDispatch>()
  const institutionColors = useMemo(...)

  const { cyRef, containerRef, layoutRef } = useCytoscapeInstance()

  const {
    currentLevel, expandedEntityName,
    renderLanding, renderExpanded,
  } = useGraphNavigation(cyRef, layoutRef, graphData, institutionColors, dispatch, {
    onNodeSelect, onMechanismExpand, onDmExpand, onInstitutionExpand,
  })

  useGraphEvents(cyRef, { currentLevel, graphData, institutionColors,
    renderLanding, renderExpanded, onNodeSelect, dispatch })

  // External control: focusNodeId triggers expanded view from Browse/Search
  useEffect(() => { ... }, [focusNodeId, focusCounter])
  // External control: resetCounter returns to landing from DetailPanel close
  useEffect(() => { ... }, [resetCounter])

  if (graphLoading && !graphData) return <LoadingSpinner />

  return (
    <Box>
      <div ref={containerRef} />
      <HelpOverlay />
      {currentLevel !== 'landing' && (
        <GraphBreadcrumb entityName={expandedEntityName} onReset={renderLanding} />
      )}
      <GraphLegend institutionColors={institutionColors} institutions={...} />
      <GraphControls cyRef={cyRef} />
    </Box>
  )
}
```

### `hooks/useCytoscapeInstance.ts`

Owns the cytoscape lifecycle.

**Responsibilities:**
- Create cytoscape instance with `cytoscapeStyles` when container mounts
- Register `cytoscape.use(fcose)` (module-level side effect)
- Manage `cyRef`, `containerRef`, `layoutRef`
- Destroy instance and stop active layout on unmount

**Interface:**
```ts
export function useCytoscapeInstance(): {
  cyRef: MutableRefObject<Core | null>
  containerRef: RefObject<HTMLDivElement | null>
  layoutRef: MutableRefObject<cytoscape.Layouts | null>
}
```

### `hooks/useGraphNavigation.ts`

View state machine and render dispatch. This is the central coordinator that decides what the graph shows.

**Responsibilities:**
- Manage `currentLevel`, `expandedMechanismId`, `expandedDmId`, `expandedInstitutionId` state
- Derive `expandedEntityName` for breadcrumb
- Expose `renderLanding()` — builds landing elements, applies decorations, runs fcose layout
- Expose `renderExpanded(viewType, entityId)` — builds expanded elements, computes positions, runs preset layout
- Call parent notification callbacks (`onMechanismExpand`, `onDmExpand`, `onInstitutionExpand`) when view changes
- Dispatch Redux `selectEntity`/`clearDetail` on navigation
- Use refs for callbacks to avoid stale closures in event handlers

**Render sequence for landing:**
1. Stop active layout, remove elements
2. Build elements via `buildLandingElements()`
3. Add elements to cy
4. Apply dot indicators to DM nodes
5. Color DM borders by primary institution
6. Apply institution colors and enlarge institution nodes
7. Pin institutions at fixed positions
8. Seed DM positions (corridor logic)
9. Seed mechanism positions
10. Build relative placement constraints
11. Configure and run fcose layout
12. On layout stop: fit to viewport

**Render sequence for expanded views (unified):**
1. Stop active layout, remove elements
2. Build elements via `buildExpandedElements(viewType, entityId)`
3. Add elements to cy
4. Apply dot indicators + institution colors
5. Compute positions via `computeExpandedPositions(viewType, entityId, data)`
6. Run preset layout with animation
7. On layout stop: `ensureEdgeLabelsFit()` (for mechanism and DM views), fit to viewport

**Interface:**
```ts
export function useGraphNavigation(
  cyRef: MutableRefObject<Core | null>,
  layoutRef: MutableRefObject<cytoscape.Layouts | null>,
  graphData: GraphData | null,
  institutionColors: Map<string, string>,
  dispatch: AppDispatch,
  callbacks: {
    onNodeSelect?: (id: string | null) => void
    onMechanismExpand?: (id: string | null) => void
    onDmExpand?: (id: string | null) => void
    onInstitutionExpand?: (id: string | null) => void
  },
): {
  currentLevel: ViewLevel
  currentLevelRef: MutableRefObject<ViewLevel>
  expandedEntityName: string
  renderLanding: () => void
  renderExpanded: (viewType: ExpandedViewType, entityId: string) => void
}
```

### `hooks/useGraphEvents.ts`

All cytoscape event registration. Registered once on cy instance creation. Uses refs to access latest state without stale closures.

**Event handlers:**

| Event | Behavior |
|-------|----------|
| `tap` on node | Landing: expand to the clicked entity's view. Expanded views: select entity for detail panel (DM click toggles `active-dm` class in mechanism-expanded view). |
| `dbltap` on node | Navigate between expanded views (e.g., mechanism-expanded → DM-expanded). |
| `mouseover` on edge | Landing only: add `hover-edge` class to show relationship label. |
| `mouseover` on node | Highlight connected nodes/edges, dim others. Landing institution hover highlights members + their mechanisms. Landing DM hover reveals hidden secondary membership edges. |
| `mouseout` on node | Clear all highlighting, remove `revealed` class from hidden edges. |
| `tap` on background | Return to landing from any expanded view. |
| `Escape` key | Return to landing from any expanded view. |

**Interface:**
```ts
export function useGraphEvents(
  cyRef: MutableRefObject<Core | null>,
  options: {
    currentLevelRef: MutableRefObject<ViewLevel>
    graphDataRef: MutableRefObject<GraphData | null>
    institutionColorsRef: MutableRefObject<Map<string, string>>
    renderLanding: () => void
    renderExpanded: (viewType: ExpandedViewType, entityId: string) => void
    onNodeSelect: (id: string) => void
    dispatch: AppDispatch
  },
): void
```

### `layouts/landingLayout.ts`

The landing view layout pipeline, preserved intact from the current implementation. Each step is a named, exported function so individual pieces can be removed and visually tested.

**Exported functions:**

```ts
// Pipeline steps (operate on cy instance, called in order)
export function pinInstitutions(
  cy: Core, institutionColors: Map<string, string>, radius: number
): FixedNodeConstraint[]

export function seedDmPositions(
  cy: Core, data: GraphData, institutionColors: Map<string, string>,
  instPositions: Map<string, Position>, instMemberCount: Map<string, number>
): void

export function seedMechanismPositions(
  cy: Core, data: GraphData, instPositions: Map<string, Position>,
  instMemberCount: Map<string, number>
): void

export function buildPlacementConstraints(
  cy: Core, mechCorridors: Map<string, CorridorData>
): RelativePlacementConstraint[]

export function buildFcoseOptions(
  cy: Core, data: GraphData,
  fixedNodeConstraint: FixedNodeConstraint[],
  relativePlacementConstraint: RelativePlacementConstraint[],
  instMemberCount: Map<string, number>,
  triInstMechIds: Set<string>
): LayoutOptions

// Orchestrator: calls all above in order
export function applyLandingLayout(
  cy: Core, data: GraphData, institutionColors: Map<string, string>
): void
```

A developer who wants to understand the landing layout reads `applyLandingLayout` — a short sequence of named calls. To understand corridor logic, they read `seedDmPositions`. To experiment, they comment out one step.

### `layouts/expandedLayout.ts`

Unified tripartite layout for all three expanded views. The differences between mechanism/DM/institution views are configuration, not separate algorithms.

**Core concept:** Given a focus entity, arrange it with two groups of connected entities. The barycenter heuristic (6 iterations) reorders the groups to minimize edge crossings. Entities are positioned in vertical stacks or parabolic curves.

**Configuration per view type:**

| Parameter | Mechanism | DM | Institution |
|-----------|-----------|-----|-------------|
| Focus position | Right (250, 0) | Center (0, 0) | Left (-200, 0) |
| Left group | Institutions | Institutions | (focus is here) |
| Right group | (focus is here) | Mechanisms (parabolic) | Mechanisms (parabolic) |
| Center group | DMs (vertical stack) | (focus is here) | DMs (vertical stack) |

**Interface:**
```ts
export function computeExpandedPositions(
  viewType: ExpandedViewType,
  focusEntityId: string,
  data: GraphData,
): Map<string, { x: number; y: number }>
```

### `layouts/edgeLabelSpacing.ts`

Post-layout adjustment that pushes outer nodes away from center nodes when edge labels would overlap. Extracted as-is from the current implementation.

```ts
export function ensureEdgeLabelsFit(cy: Core): void
```

### `elements/landingElements.ts`

Builds the cytoscape `ElementDefinition[]` array for the landing view. Pure function, no cytoscape dependency.

**Elements constructed:**
- All mechanism nodes (at origin, layout positions them)
- All DM nodes
- All institution nodes
- Mechanism↔DM relationship edges (`landing-edge` class)
- Primary membership edges (`membership-edge` class, DM→institution with `_bestInstitution` data)
- Secondary/hidden membership edges (`hidden-membership-edge` class)
- Gravity edges (`gravity-edge` class, weighted by DM affiliation count per institution)

**Interface:**
```ts
export function buildLandingElements(
  data: GraphData,
  institutionColors: Map<string, string>,
): ElementDefinition[]
```

Note: The current `buildLanding` also calls `computeCircularPositions` and `orderMechanismsForCircle` and returns positions. Since positions are never consumed, the new version drops these calls entirely. Elements are added in natural data order (cytoscape element order does not affect layout).

### `elements/expandedElements.ts`

Unified element builder for all three expanded views. Parameterized by view type and focus entity ID.

**Core logic:** Given a focus entity, find connected entities through the graph edges and memberships, then build nodes with appropriate classes and edges.

| View type | Center node class | Connected entities |
|-----------|------------------|--------------------|
| `mechanism` | `center-mechanism` | DMs via edges → their primary institutions via memberships |
| `dm` | `center-dm` | Mechanisms via edges → primary institutions via memberships |
| `institution` | `center-institution` | Primary DMs via memberships → their mechanisms via edges |

**Interface:**
```ts
export function buildExpandedElements(
  viewType: ExpandedViewType,
  focusEntityId: string,
  data: GraphData,
  institutionColors: Map<string, string>,
): ElementDefinition[]
```

### `ui/GraphControls.tsx`

Floating buttons for zoom in, zoom out, fit-all, and help toggle. Receives `cyRef` for zoom operations.

```tsx
interface GraphControlsProps {
  cyRef: RefObject<Core | null>
  onToggleHelp: () => void
}
```

### `ui/GraphLegend.tsx`

Node type legend (mechanism/DM/institution shapes) plus institution color key with primary/external dot indicators.

```tsx
interface GraphLegendProps {
  institutionColors: Map<string, string>
  institutions: { id: string; name: string }[]
}
```

Note: Receives the filtered institution list rather than full `graphData`, keeping its dependency surface minimal.

### `ui/GraphBreadcrumb.tsx`

Shows "← System Map / Entity Name" with a copy-link button. Manages its own `linkCopied` tooltip state internally.

```tsx
interface GraphBreadcrumbProps {
  entityName: string
  onReset: () => void
}
```

### `ui/HelpOverlay.tsx`

First-visit hint overlay. Owns its own `localStorage`-backed visibility state. The redundant `localStorage.setItem` calls currently scattered across every render function are consolidated here.

```tsx
interface HelpOverlayProps {
  visible: boolean
  onDismiss: () => void
}
```

### `utils/dotIndicators.ts`

Three functions extracted as-is. Pure utilities with no React or state dependency.

```ts
const DOT_SIZE = 10

export function generateDotSvg(color: string, filled: boolean): string
export function computeDmDots(
  dmId: string, data: GraphData, institutionColors: Map<string, string>
): string[]
export function applyDotIndicators(
  node: cytoscape.NodeSingular, data: GraphData, institutionColors: Map<string, string>
): void
```

## Data Flow

```
Redux (graphData) ──→ SystemMap.tsx (orchestrator)
                          │
                          ├─→ useCytoscapeInstance (cy lifecycle)
                          │
                          ├─→ useGraphNavigation (view state + render)
                          │     ├─→ elements/* (build ElementDefinition[])
                          │     ├─→ layouts/* (compute positions, run layout)
                          │     └─→ utils/dotIndicators (apply decorations)
                          │
                          ├─→ useGraphEvents (user interaction → navigation)
                          │
                          └─→ ui/* (visual overlays, receive props)
```

## Ref Management

The current code uses 8 separate `useRef` + `useEffect` pairs to keep event handlers from seeing stale closures. In the new design:

- `useGraphNavigation` exposes `currentLevelRef` alongside `currentLevel`
- `useGraphEvents` receives refs (not values) for anything accessed inside event handlers
- The ref synchronization effects live inside their respective hooks, not in the orchestrator
- This reduces the orchestrator's complexity and makes the ref pattern local to where it's needed

## Estimated File Sizes

| Module | Lines (est.) |
|--------|-------------|
| `types.ts` | ~15 |
| `SystemMap.tsx` | ~150-200 |
| `useCytoscapeInstance.ts` | ~50 |
| `useGraphNavigation.ts` | ~200 |
| `useGraphEvents.ts` | ~200 |
| `landingLayout.ts` | ~350 |
| `expandedLayout.ts` | ~200 |
| `edgeLabelSpacing.ts` | ~50 |
| `landingElements.ts` | ~120 |
| `expandedElements.ts` | ~120 |
| `GraphControls.tsx` | ~80 |
| `GraphLegend.tsx` | ~70 |
| `GraphBreadcrumb.tsx` | ~60 |
| `HelpOverlay.tsx` | ~50 |
| `dotIndicators.ts` | ~70 |
| **Total** | **~1,785** |

Down from 2,425 lines (740 lines removed: 320 dead code + 420 duplication from unifying expanded views).

## Risk Assessment

**Low risk:** This is a structural refactor. All algorithms are preserved. The only behavioral changes are:
- Removing dead code (positions that were computed but discarded)
- Removing redundant `localStorage` writes
- Removing `hasRenderedRef` (no behavioral impact since data isn't refetched)
- Removing deferred rendering checks (no observed failure mode)

**Verification:** Run `npm run dev:local` and visually verify:
1. Landing view renders with correct neighborhoods and groupings
2. Click any node → expanded view animates correctly
3. Double-click navigates between expanded views
4. Hover highlights work (connected nodes, dimming, hidden edge reveal)
5. Breadcrumb, legend, controls, help overlay all function
6. Escape and background click return to landing
7. Browse → focus node navigation works
