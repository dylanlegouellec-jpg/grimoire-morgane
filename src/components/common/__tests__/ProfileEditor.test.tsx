import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : demandé par l'utilisateur — ajout d'un champ "Date de   */
/*  naissance" dans "Modifier le profil". Doit préremplir depuis            */
/*  profile.birth_date (tronqué aux 10 premiers caractères, PostgreSQL       */
/*  pouvant renvoyer un timestamp complet), et transmettre `birthDate` à       */
/*  saveProfile() tel quel à l'enregistrement.                                    */
/* ------------------------------------------------------------------ */

const saveProfileMock = vi.fn().mockResolvedValue({});
vi.mock("../../../utils/profile", () => ({
  saveProfile: (...args: unknown[]) => saveProfileMock(...args),
  uploadAvatar: vi.fn(),
}));

import ProfileEditor from "../ProfileEditor";

const USER = { id: "u1", email: "morgane@example.com" };

afterEach(() => {
  cleanup();
  saveProfileMock.mockClear();
});

describe("ProfileEditor — date de naissance", () => {
  it("prérempli le champ depuis profile.birth_date, même avec un timestamp complet", () => {
    render(
      <ProfileEditor user={USER} profile={{ birth_date: "2000-05-14T00:00:00" }} onClose={() => {}} />
    );
    expect((screen.getByLabelText("Date de naissance") as HTMLInputElement).value).toBe("2000-05-14");
  });

  it("part d'un champ vide quand le profil n'a pas encore de date de naissance", () => {
    render(<ProfileEditor user={USER} profile={{}} onClose={() => {}} />);
    expect((screen.getByLabelText("Date de naissance") as HTMLInputElement).value).toBe("");
  });

  it("transmet la date saisie à saveProfile() lors de l'enregistrement", async () => {
    render(<ProfileEditor user={USER} profile={{}} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Date de naissance"), { target: { value: "1995-11-02" } });

    fireEvent.click(screen.getByText("Enregistrer", { exact: false }));

    // Attend la fin complète du cycle (setSaving(false) après résolution de
    // saveProfile()), pas juste l'appel lui-même — sinon cette mise à jour
    // d'état survient après la fin du test, hors d'un act() (avertissement
    // React en test).
    await waitFor(() => expect(screen.queryByText("Enregistrement…")).not.toBeInTheDocument());
    expect(saveProfileMock.mock.calls[0][1]).toMatchObject({ birthDate: "1995-11-02" });
  });
});
