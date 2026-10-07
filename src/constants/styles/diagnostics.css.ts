/* ------------------------------------------------------------------ */
/*  PANNEAU DE DIAGNOSTICS — jauges de métriques, statut de connexion   */
/*  et mini console de logs (voir DiagnosticsPanelModal.tsx) et menus déroulants du code (CodeExplorer.tsx).           */
/* ------------------------------------------------------------------ */

export const DIAGNOSTICS_CSS: string = `
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

/* --- Code de l'app (CodeExplorer.tsx) : menus déroulants dossier > fichier --- */
.code-explorer { display: flex; flex-direction: column; gap: 8px; }
.code-intro { margin: 0 6px; }
.code-total { margin: 0 6px 4px; font-size: 0.85rem; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.code-disclosure { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--surface); }
.code-disclosure--file { border-radius: 10px; background: var(--surface-strong); }
.code-disclosure-header {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: none; border: none; padding: 11px 14px; cursor: pointer; text-align: left; color: var(--ink);
}
.code-disclosure--file > .code-disclosure-header { padding: 9px 12px; }
.code-disclosure-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.code-group-title { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.4px; line-height: 1.3; }
.code-file-name { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.8rem; font-weight: 600; word-break: break-all; }
.code-file-role {
  font-size: 0.82rem; color: var(--ink-soft); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.code-meta { font-family: 'EB Garamond', serif; font-size: 0.78rem; font-style: italic; color: var(--ink-soft); flex-shrink: 0; text-align: right; }
.code-chevron { color: var(--ink-soft); transition: transform 0.2s ease; flex-shrink: 0; }
.code-chevron.open { transform: rotate(180deg); }
.code-panel { overflow: hidden; }
.code-panel-inner { padding: 2px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.code-group-body { padding-bottom: 10px; }
.code-group-summary { padding: 0 14px 10px; }
.code-group-files { padding: 0 8px; display: flex; flex-direction: column; gap: 6px; }
.code-text { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--ink); }
.code-text-muted { color: var(--ink-soft); font-style: italic; }
.code-path { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.72rem; color: var(--ink-soft); word-break: break-all; }
.code-links-title {
  margin: 6px 0 0; font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 1px;
  text-transform: uppercase; color: var(--ink-soft);
}
.code-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.code-chip {
  font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.72rem;
  padding: 3px 8px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft);
}
.code-chip--more { font-family: 'EB Garamond', serif; font-style: italic; font-size: 0.78rem; }
.code-overview-step { margin-bottom: 4px; }
.code-overview-title { margin: 0 0 3px; font-family: 'Cinzel', serif; font-size: 0.74rem; letter-spacing: 0.4px; color: var(--gold); }
`;
