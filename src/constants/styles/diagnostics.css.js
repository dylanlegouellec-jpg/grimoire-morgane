/* ------------------------------------------------------------------ */
/*  PANNEAU DE DIAGNOSTICS — jauges de métriques, statut de connexion   */
/*  et mini console de logs (voir DiagnosticsPanelModal.jsx).           */
/* ------------------------------------------------------------------ */

export const DIAGNOSTICS_CSS = `
.diagnostics-metrics { display: flex; flex-direction: column; gap: 10px; }
.diagnostics-metric { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.diagnostics-metric-label { color: var(--ink-soft); font-size: 0.92rem; }
.diagnostics-metric-value { font-weight: 600; font-variant-numeric: tabular-nums; }

.diagnostics-tone-good { color: var(--forest); }
.diagnostics-tone-warn { color: var(--gold); }
.diagnostics-tone-bad { color: var(--wine); }

.diagnostics-status-dot { font-weight: 600; padding: 2px 10px; border-radius: 999px; font-size: 0.85rem; }
.diagnostics-status-dot--online { color: var(--forest); background: rgba(62,122,62,0.14); }
.diagnostics-status-dot--offline { color: var(--wine); background: rgba(124,50,50,0.14); }
.diagnostics-status-dot--checking { color: var(--gold); background: rgba(179,135,42,0.14); }

.diagnostics-log-header { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; }
.diagnostics-log-clear {
  background: none; border: none; color: var(--gold); font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 4px 6px;
}
.diagnostics-log {
  max-height: 220px; overflow-y: auto; background: var(--surface-soft); border: 1px solid var(--line);
  border-radius: 12px; padding: 8px 10px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.78rem;
}
.diagnostics-log-empty { margin: 4px 0; }
.diagnostics-log-entry { display: flex; gap: 8px; padding: 3px 0; border-bottom: 1px solid var(--line); }
.diagnostics-log-entry:last-child { border-bottom: none; }
.diagnostics-log-level { text-transform: uppercase; flex-shrink: 0; width: 52px; font-weight: 700; opacity: 0.8; }
.diagnostics-log-message { flex: 1; min-width: 0; word-break: break-word; white-space: pre-wrap; }
.diagnostics-log-entry--error .diagnostics-log-level,
.diagnostics-log-entry--error .diagnostics-log-message { color: var(--wine); }
.diagnostics-log-entry--warn .diagnostics-log-level,
.diagnostics-log-entry--warn .diagnostics-log-message { color: var(--gold); }
.diagnostics-log-entry--network .diagnostics-log-level,
.diagnostics-log-entry--network .diagnostics-log-message { color: var(--plum); }
`;
