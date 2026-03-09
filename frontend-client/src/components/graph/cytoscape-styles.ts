import type { StylesheetStyle } from 'cytoscape'

export const cytoscapeStyles: StylesheetStyle[] = [
  // Mechanism nodes (purple)
  {
    selector: 'node[primary_type="Mechanism"]',
    style: {
      'background-color': '#5525E3',
      shape: 'roundrectangle',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '140px',
      'font-size': '12px',
      'font-weight': 600,
      color: '#ffffff',
      width: '160px',
      height: '60px',
      'border-width': 0,
    },
  },
  // Decision Maker nodes (diamond — flowchart decision symbol)
  {
    selector: 'node[primary_type="Decision Maker"]',
    style: {
      'background-color': '#000F35',
      shape: 'diamond',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '90px',
      'font-size': '11px',
      'font-weight': 600,
      color: '#ffffff',
      width: '140px',
      height: '100px',
      'border-width': 0,
    },
  },
  // Institution nodes (circle — reinforces membership dot indicators)
  {
    selector: 'node[primary_type="Institution"]',
    style: {
      'background-color': '#4A5568',
      shape: 'ellipse',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '75px',
      'font-size': '11px',
      'font-weight': 700,
      color: '#ffffff',
      width: '95px',
      height: '95px',
      'border-width': 2,
      'border-color': '#ffffff',
    },
  },
  // Center institution in expanded view
  {
    selector: 'node.center-institution',
    style: {
      width: '130px',
      height: '130px',
      'font-size': '13px',
      'font-weight': 700,
      'text-max-width': '95px',
    },
  },
  // Center mechanism in expanded view
  {
    selector: 'node.center-mechanism',
    style: {
      width: '200px',
      height: '75px',
      'font-size': '14px',
      'font-weight': 700,
      'text-max-width': '180px',
    },
  },
  // DM nodes in expanded view
  {
    selector: 'node.expanded-dm',
    style: {},
  },
  // Center DM in DM-centric expanded view
  {
    selector: 'node.center-dm',
    style: {
      width: '180px',
      height: '130px',
      'font-size': '13px',
      'font-weight': 700,
      'text-max-width': '110px',
    },
  },
  // Clicked DM in expanded view
  {
    selector: 'node.active-dm',
    style: {
      'border-width': 3,
      'border-color': '#8891ED',
    },
  },
  // Selected node
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#8891ED',
    },
  },
  // Edges — default
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#6b6088',
      'target-arrow-color': '#6b6088',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      opacity: 0.35,
    },
  },
  // Hidden membership edges — invisible by default, shown on DM hover
  {
    selector: 'edge.hidden-membership-edge',
    style: {
      opacity: 0,
      width: 0,
      'target-arrow-shape': 'none',
      'events': 'no',
    },
  },
  // Invisible gravity edges (mechanism→institution) — layout only, never rendered
  {
    selector: 'edge.gravity-edge',
    style: {
      opacity: 0,
      width: 0,
      'target-arrow-shape': 'none',
      'events': 'no',
    },
  },
  // Landing view mechanism↔DM edges — subtle but visible
  {
    selector: 'edge.landing-edge',
    style: {
      opacity: 0.2,
      'target-arrow-shape': 'none',
    },
  },
  // Edge hover — show label on mouseover
  {
    selector: 'edge.hover-edge',
    style: {
      width: 2.5,
      opacity: 1,
      'line-color': '#5525E3',
      'target-arrow-color': '#5525E3',
      label: 'data(relationship_type)',
      'font-size': '10px',
      'text-background-color': '#F2EDF4',
      'text-background-opacity': 0.95,
      'text-background-padding': '3px',
      color: '#000F35',
      'text-rotation': 'autorotate',
    },
  },
  // Edges in expanded view — visible relationship type labels
  {
    selector: 'edge.expanded-edge',
    style: {
      width: 2.5,
      opacity: 0.85,
      label: 'data(relationship_type)',
      'font-size': '10px',
      'text-wrap': 'wrap',
      'text-max-width': '200px',
      'text-background-color': '#F2EDF4',
      'text-background-opacity': 0.95,
      'text-background-padding': '3px',
      color: '#000F35',
      'text-rotation': 'autorotate',
    },
  },
  // Institution membership edges — subtle, no label
  {
    selector: 'edge.membership-edge',
    style: {
      width: 1.5,
      opacity: 0.4,
      'line-color': '#4A5568',
      'target-arrow-color': '#4A5568',
      'target-arrow-shape': 'triangle',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 4] as never,
      'curve-style': 'bezier',
    },
  },
  // Dimmed state
  {
    selector: '.dimmed',
    style: { opacity: 0.12 },
  },
  // Highlighted node
  {
    selector: 'node.highlighted',
    style: { opacity: 1 },
  },
  // Highlighted edge — show relationship label
  {
    selector: 'edge.highlighted',
    style: {
      opacity: 1,
      width: 2.5,
      'line-color': '#5525E3',
      'target-arrow-color': '#5525E3',
      label: 'data(relationship_type)',
      'font-size': '9px',
      'text-background-color': '#F2EDF4',
      'text-background-opacity': 0.95,
      'text-background-padding': '2px',
      color: '#000F35',
      'text-rotation': 'autorotate',
    },
  },
]
