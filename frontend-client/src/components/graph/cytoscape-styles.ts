import type { StylesheetStyle } from 'cytoscape'

export const cytoscapeStyles: StylesheetStyle[] = [
  // Mechanism nodes — large circles on the outer ring, colored per group
  // by applyNodeDecorations (this gray is the pre-decoration fallback)
  {
    selector: 'node[primary_type="Mechanism"]',
    style: {
      'background-color': '#4A5568',
      shape: 'ellipse',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '110px',
      'font-size': '12px',
      'font-weight': 700,
      color: '#ffffff',
      width: '150px',
      height: '150px',
      'border-width': 0,
    },
  },
  // Decision Maker nodes — gold diamonds, group dots applied as decorations
  {
    selector: 'node[primary_type="Decision Maker"]',
    style: {
      'background-color': '#E8C97E',
      shape: 'diamond',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '90px',
      'font-size': '11px',
      'font-weight': 600,
      color: '#000F35',
      width: '140px',
      height: '100px',
      'border-width': 2,
      'border-color': '#000F35',
    },
  },
  // Institution nodes — navy rounded rectangles in the center grid
  {
    selector: 'node[primary_type="Institution"]',
    style: {
      'background-color': '#000F35',
      shape: 'roundrectangle',
      label: 'data(name)',
      'font-family': '"Source Sans 3", sans-serif',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '140px',
      'font-size': '11px',
      'font-weight': 700,
      color: '#ffffff',
      width: '160px',
      height: '70px',
      'border-width': 0,
    },
  },
  // Center entity variants for expanded views
  {
    selector: 'node.center-institution',
    style: { width: '180px', height: '80px', 'font-size': '13px', 'font-weight': 700, 'text-max-width': '160px' },
  },
  {
    selector: 'node.center-mechanism',
    style: { width: '170px', height: '170px', 'font-size': '13px', 'font-weight': 700, 'text-max-width': '130px' },
  },
  {
    selector: 'node.center-dm',
    style: { width: '180px', height: '130px', 'font-size': '13px', 'font-weight': 700, 'text-max-width': '110px' },
  },
  // Clicked DM in expanded view
  {
    selector: 'node.active-dm',
    style: { 'border-width': 3, 'border-color': '#5525E3' },
  },
  // Selected node
  {
    selector: 'node:selected',
    style: { 'border-width': 3, 'border-color': '#5525E3' },
  },
  // Edges — faint by default so ~100 edges read as texture, not hairball
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#6b6088',
      'target-arrow-color': '#6b6088',
      'target-arrow-shape': 'none',
      'curve-style': 'bezier',
      opacity: 0.1,
    },
  },
  // Membership edges (Institution → DM) — dashed to distinguish from roles
  {
    selector: 'edge.membership-edge',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 4] as never,
      'line-color': '#4A5568',
      'target-arrow-color': '#4A5568',
    },
  },
  // Edge hover — full opacity, arrow, label
  {
    selector: 'edge.hover-edge',
    style: {
      width: 2.5,
      opacity: 1,
      'line-color': '#5525E3',
      'target-arrow-color': '#5525E3',
      'target-arrow-shape': 'triangle',
      label: 'data(relationship_type)',
      'font-size': '10px',
      'text-background-color': '#F2EDF4',
      'text-background-opacity': 0.95,
      'text-background-padding': '3px',
      color: '#000F35',
      'text-rotation': 'autorotate',
    },
  },
  // Edges in expanded view — visible with relationship labels + arrows
  {
    selector: 'edge.expanded-edge',
    style: {
      width: 2.5,
      opacity: 0.85,
      'target-arrow-shape': 'triangle',
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
  // Membership edges inside expanded views stay visible
  {
    selector: 'edge.membership-edge.expanded-membership',
    style: { opacity: 0.55, 'target-arrow-shape': 'triangle' },
  },
  // Dimmed state
  {
    selector: '.dimmed',
    style: { opacity: 0.08 },
  },
  // Highlighted node
  {
    selector: 'node.highlighted',
    style: { opacity: 1 },
  },
  // Highlighted edge — full opacity, arrow, relationship label
  {
    selector: 'edge.highlighted',
    style: {
      opacity: 1,
      width: 2.5,
      'line-color': '#5525E3',
      'target-arrow-color': '#5525E3',
      'target-arrow-shape': 'triangle',
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
