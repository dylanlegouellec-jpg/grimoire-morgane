import { describe, it, expect } from "vitest";
import { CODE_DOCS, CODE_GROUPS, CODE_OVERVIEW, groupOfPath, shortRole } from "../../../constants/codeMap";

/* ------------------------------------------------------------------ */
/*  GARDE-FOU DE MAINTENANCE du Panneau de Diagnostics > "Code de l'app".  */
/*  La liste des fichiers vient du build (scripts/codeMap.ts) ; les         */
/*  descriptions sont écrites à la main (constants/codeMap.ts). Ces tests    */
/*  échouent quand les deux divergent : un fichier ajouté sans description,   */
/*  ou une description restée après la suppression/le renommage d'un fichier.  */
/* ------------------------------------------------------------------ */

const paths = __GRIMOIRE_CODE__.files.map((f) => f.path);

describe("descriptions du code", () => {
  it("décrit chaque fichier du projet (ajouter un fichier = ajouter sa ligne dans constants/codeMap.ts)", () => {
    const missing = paths.filter((p) => !CODE_DOCS[p]);
    expect(missing).toEqual([]);
  });

  it("ne garde aucune description d'un fichier qui n'existe plus (supprimé ou renommé)", () => {
    const orphans = Object.keys(CODE_DOCS).filter((p) => !paths.includes(p));
    expect(orphans).toEqual([]);
  });

  it("range chaque fichier dans un dossier d'affichage", () => {
    const withoutGroup = paths.filter((p) => !groupOfPath(p));
    expect(withoutGroup).toEqual([]);
  });

  it("n'a aucun dossier d'affichage vide", () => {
    const used = new Set(paths.map((p) => groupOfPath(p)?.id));
    expect(CODE_GROUPS.filter((g) => !used.has(g.id)).map((g) => g.id)).toEqual([]);
  });

  it("a des descriptions non vides qui se terminent par un point", () => {
    const bad = Object.entries(CODE_DOCS).filter(([, text]) => !text.trim() || !text.trim().endsWith("."));
    expect(bad.map(([p]) => p)).toEqual([]);
  });

  it("a un identifiant unique par dossier d'affichage", () => {
    const ids = CODE_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a un texte pour chaque étape de la vue d'ensemble", () => {
    expect(CODE_OVERVIEW.length).toBeGreaterThan(0);
    CODE_OVERVIEW.forEach((step) => {
      expect(step.title.trim()).not.toBe("");
      expect(step.text.trim()).not.toBe("");
    });
  });
});

describe("groupOfPath", () => {
  it("choisit le préfixe le plus long (styles > constantes, composants partagés > composants)", () => {
    expect(groupOfPath("src/constants/styles/theme.css.ts")?.id).toBe("styles");
    expect(groupOfPath("src/constants/motion.ts")?.id).toBe("constants");
    expect(groupOfPath("src/components/common/Seal.tsx")?.id).toBe("comp-common");
  });

  it("préfère un chemin exact (fichiers de la racine, point d'entrée)", () => {
    expect(groupOfPath("index.html")?.id).toBe("root");
    expect(groupOfPath("src/main.tsx")?.id).toBe("src-root");
  });

  it("renvoie null pour un chemin inconnu", () => {
    expect(groupOfPath("ailleurs/fichier.ts")).toBeNull();
  });
});

describe("shortRole", () => {
  it("garde la première phrase", () => {
    expect(shortRole("Première phrase. Deuxième phrase.")).toBe("Première phrase");
  });

  it("retire le point final d'une description d'une seule phrase", () => {
    expect(shortRole("Une seule phrase.")).toBe("Une seule phrase");
  });
});
