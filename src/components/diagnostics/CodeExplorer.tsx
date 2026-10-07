import { useId, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { EASE_OUT } from "../../constants/motion";
import { CODE_DOCS, CODE_GROUPS, CODE_OVERVIEW, groupOfPath, shortRole } from "../../constants/codeMap";
import { useTranslation } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  CODE DE L'APP — section du Panneau de Diagnostics                    */
/*  Des menus déroulants imbriqués : un par DOSSIER, puis un par FICHIER   */
/*  à l'intérieur. Un fichier replié montre son nom, sa taille et la         */
/*  première phrase de sa description ; déplié, il montre la description      */
/*  complète, son chemin, ce qu'il utilise et ce qui l'utilise.                */
/*                                                                               */
/*  La liste des fichiers, leur taille et leurs liens d'import sont calculés       */
/*  au build (scripts/codeMap.ts, constante __GRIMOIRE_CODE__) ; les                */
/*  descriptions sont écrites à la main (constants/codeMap.ts). Les fichiers de       */
/*  tests ne sont pas listés, seulement comptés.                                       */
/* ------------------------------------------------------------------ */

// Au-delà, les liens d'import d'un fichier sont résumés par "+N autres" :
// un fichier très utilisé (constants/motion.ts, helpers.ts) en a des dizaines.
const MAX_LINK_CHIPS = 10;

interface DisclosureProps {
  className?: string;
  /** Reçoit l'état ouvert/fermé pour pouvoir changer le contenu de l'en-tête. */
  header: (open: boolean) => ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

// Un menu déroulant : un en-tête-bouton accessible (aria-expanded) et un
// panneau dont la hauteur s'anime. Sans animation si "Réduire les
// animations" est activé.
function Disclosure({ className = "", header, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className={`code-disclosure ${className}`}>
      <button
        type="button"
        className="code-disclosure-header"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          triggerHaptic(10);
          setOpen((v) => !v);
        }}
      >
        {header(open)}
        <ChevronDown size={16} className={`code-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className="code-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.26, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

// "index.ts" seul ne dit rien (il y en a six) : on y ajoute son dossier.
function displayName(path: string): string {
  const name = baseName(path);
  if (!name.startsWith("index.")) return name;
  const parts = path.split("/");
  return parts.length > 1 ? `${parts[parts.length - 2]}/${name}` : name;
}

function LinkList({ title, paths, emptyLabel, moreLabel }: { title: string; paths: string[]; emptyLabel: string; moreLabel: (count: number) => string }) {
  const shown = paths.slice(0, MAX_LINK_CHIPS);
  const hidden = paths.length - shown.length;
  return (
    <>
      <p className="code-links-title">{title} ({paths.length})</p>
      {paths.length === 0 ? (
        <p className="code-text code-text-muted">{emptyLabel}</p>
      ) : (
        <div className="code-chips">
          {shown.map((p) => (
            <span key={p} className="code-chip" title={p}>{displayName(p)}</span>
          ))}
          {hidden > 0 && <span className="code-chip code-chip--more">{moreLabel(hidden)}</span>}
        </div>
      )}
    </>
  );
}

interface CodeFile {
  path: string;
  lines: number;
  imports: string[];
  importedBy: string[];
}

export default function CodeExplorer() {
  const { t } = useTranslation();
  const { files, testFileCount } = __GRIMOIRE_CODE__;

  const groups = useMemo(
    () =>
      CODE_GROUPS.map((group) => ({
        group,
        files: files.filter((f) => groupOfPath(f.path)?.id === group.id) as CodeFile[],
      })).filter((entry) => entry.files.length > 0),
    [files]
  );
  const totalLines = useMemo(() => files.reduce((sum, f) => sum + f.lines, 0), [files]);

  const plural = (count: number) => (count > 1 ? "s" : "");
  const filesLabel = (count: number) => t("diagnostics.codeFiles", { count, plural: plural(count) });
  const linesLabel = (count: number) => t("diagnostics.codeLines", { count: count.toLocaleString(), plural: plural(count) });
  const moreLabel = (count: number) => t("diagnostics.codeMore", { count });

  return (
    <div className="code-explorer">
      <p className="hint code-intro">{t("diagnostics.codeIntro")}</p>
      <p className="code-total">
        {filesLabel(files.length)} · {linesLabel(totalLines)}
        {testFileCount > 0 && <> · {t("diagnostics.codeTestsHidden", { count: testFileCount })}</>}
      </p>

      <Disclosure
        className="code-disclosure--overview"
        header={() => <span className="code-disclosure-title"><span className="code-group-title">{t("diagnostics.codeOverviewTitle")}</span></span>}
      >
        <div className="code-panel-inner">
          {CODE_OVERVIEW.map((step) => (
            <div key={step.title} className="code-overview-step">
              <p className="code-overview-title">{step.title}</p>
              <p className="code-text">{step.text}</p>
            </div>
          ))}
        </div>
      </Disclosure>

      {groups.map(({ group, files: groupFiles }) => {
        const groupLines = groupFiles.reduce((sum, f) => sum + f.lines, 0);
        return (
          <Disclosure
            key={group.id}
            header={() => (
              <>
                <span className="code-disclosure-title">
                  <span className="code-group-title">{group.title}</span>
                </span>
                <span className="code-meta">{filesLabel(groupFiles.length)} · {linesLabel(groupLines)}</span>
              </>
            )}
          >
            <div className="code-group-body">
              <p className="code-text code-group-summary">{group.summary}</p>
              <div className="code-group-files">
                {groupFiles.map((file) => {
                  const description = CODE_DOCS[file.path];
                  return (
                    <Disclosure
                      key={file.path}
                      className="code-disclosure--file"
                      header={(open) => (
                        <>
                          <span className="code-disclosure-title">
                            <span className="code-file-name">{baseName(file.path)}</span>
                            {!open && description && <span className="code-file-role">{shortRole(description)}</span>}
                          </span>
                          <span className="code-meta">{linesLabel(file.lines)}</span>
                        </>
                      )}
                    >
                      <div className="code-panel-inner">
                        <p className="code-path">{file.path}</p>
                        <p className="code-text">{description || t("diagnostics.codeNoDescription")}</p>
                        <LinkList title={t("diagnostics.codeUses")} paths={file.imports} emptyLabel={t("diagnostics.codeNoFile")} moreLabel={moreLabel} />
                        <LinkList title={t("diagnostics.codeUsedBy")} paths={file.importedBy} emptyLabel={t("diagnostics.codeNoFile")} moreLabel={moreLabel} />
                      </div>
                    </Disclosure>
                  );
                })}
              </div>
            </div>
          </Disclosure>
        );
      })}
    </div>
  );
}
