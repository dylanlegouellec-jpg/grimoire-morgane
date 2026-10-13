import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../utils/notifications", () => ({
  showLocalNotification: vi.fn(() => Promise.resolve()),
  requestNotificationPermission: vi.fn(),
}));
vi.mock("../../../hooks/useWakeLock", () => ({ default: () => {} }));
vi.mock("../../../utils/imageUpload", () => ({ uploadRecipeImage: vi.fn() }));

import CookMode from "../CookMode";
import CookPhotoPrompt from "../CookPhotoPrompt";
import { uploadRecipeImage } from "../../../utils/imageUpload";
import { resetCookTimersForTests } from "../../../utils/cookTimers";
import type { Recipe } from "../../../hooks/useRecipes";

/* Photo du plat en fin de mode cuisine, proposée seulement pour une recette
   sans photo : envoi via uploadRecipeImage (simulé), recette inchangée en
   cas d'échec. Sélecteurs par classes / data-testid : indépendants des textes. */

const BASE = {
  id: "r1",
  title: "Tarte",
  servings: 2,
  ingredients: [],
  steps: ["Étaler la pâte", "Cuire"],
} as unknown as Recipe;

const photo = () => new File(["x"], "plat.jpg", { type: "image/jpeg" });
const pick = (testId: string, file: File = photo()) =>
  fireEvent.change(screen.getByTestId(testId), { target: { files: [file] } });

const upload = vi.mocked(uploadRecipeImage);

beforeEach(() => {
  upload.mockReset();
  resetCookTimersForTests();
});
afterEach(() => {
  cleanup();
  resetCookTimersForTests();
});

describe("CookPhotoPrompt", () => {
  it("sans photo : envoie, met à jour la recette et affiche un toast", async () => {
    let resolve!: (url: string) => void;
    upload.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const onUpdate = vi.fn();
    const toast = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} householdId="h1" showToast={toast} />);

    pick("cook-photo-camera");
    // Pendant l'envoi : boutons désactivés.
    const buttons = document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn");
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(upload).toHaveBeenCalledWith(expect.any(File), "h1");

    resolve("https://x/photo.webp");
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ ...BASE, imageUrl: "https://x/photo.webp", imageSource: "photo" }));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".cookmode-photo-saved")).toBeInTheDocument();
    document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn").forEach((b) => expect(b).not.toBeDisabled());
  });

  it("le champ appareil photo vise la caméra arrière, la galerie non", () => {
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={vi.fn()} />);
    expect(screen.getByTestId("cook-photo-camera")).toHaveAttribute("capture", "environment");
    expect(screen.getByTestId("cook-photo-gallery")).not.toHaveAttribute("capture");
  });

  it("« Reprendre une photo » remplace directement celle qui vient d'être envoyée", async () => {
    upload.mockResolvedValueOnce("https://x/1.webp").mockResolvedValueOnce("https://x/2.webp");
    const onUpdate = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} />);
    pick("cook-photo-camera");
    await waitFor(() => expect(document.querySelector(".cookmode-photo-saved")).toBeInTheDocument());
    pick("cook-photo-gallery");
    expect(upload).toHaveBeenLastCalledWith(expect.any(File), null);
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2));
    expect(onUpdate.mock.calls[1][0]).toMatchObject({ imageUrl: "https://x/2.webp", imageSource: "photo" });
  });

  it("échec de l'envoi : message d'erreur, recette non modifiée", async () => {
    upload.mockRejectedValue(new Error("réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onUpdate = vi.fn();
    const toast = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} showToast={toast} />);
    pick("cook-photo-camera");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    document.querySelectorAll<HTMLButtonElement>(".cookmode-photo-btn").forEach((b) => expect(b).not.toBeDisabled());
  });

  it("hors-ligne : aucun envoi tenté, message d'erreur", () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const onUpdate = vi.fn();
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={onUpdate} />);
    pick("cook-photo-camera");
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("refuse un fichier qui n'est pas une image", () => {
    render(<CookPhotoPrompt recipe={BASE} onUpdateRecipe={vi.fn()} />);
    pick("cook-photo-gallery", new File(["x"], "a.txt", { type: "text/plain" }));
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("CookMode — photo du plat", () => {
  it("visible en fin de liste, mise en avant quand toutes les étapes sont cochées", () => {
    render(<CookMode recipe={BASE} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    const section = document.querySelector(".cookmode-photo") as HTMLElement;
    expect(section).toBeInTheDocument();
    expect(section).not.toHaveClass("ready");
    document.querySelectorAll<HTMLElement>(".cookmode-step-card").forEach((c) => fireEvent.click(c));
    expect(document.querySelector(".cookmode-photo")).toHaveClass("ready");
  });

  it("absente si la recette a déjà une photo personnelle", () => {
    render(<CookMode recipe={{ ...BASE, imageUrl: "https://x/old.webp", imageSource: "photo" }} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
  });

  it("absente si la recette a une illustration IA (ou une ancienne photo sans source)", () => {
    const { unmount } = render(<CookMode recipe={{ ...BASE, imageUrl: "https://x/ia.png", imageSource: "ia" }} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
    unmount();
    render(<CookMode recipe={{ ...BASE, imageUrl: "https://x/old.jpg" }} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
  });

  it("reste affichée après l'envoi de la photo (même si la recette reçue change)", async () => {
    upload.mockResolvedValue("https://x/new.webp");
    const { rerender } = render(<CookMode recipe={BASE} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    pick("cook-photo-camera");
    await waitFor(() => expect(document.querySelector(".cookmode-photo-saved")).toBeInTheDocument());
    rerender(<CookMode recipe={{ ...BASE, imageUrl: "https://x/new.webp", imageSource: "photo" }} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo-saved")).toBeInTheDocument();
  });

  it("absente si le mode cuisine n'a pas de quoi enregistrer la recette", () => {
    render(<CookMode recipe={BASE} onClose={() => {}} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
  });

  it("seulement sur le dernier groupe d'étapes", () => {
    const grouped = {
      ...BASE,
      steps: [{ isSection: true, title: "A" }, "un", { isSection: true, title: "B" }, "deux"],
    } as unknown as Recipe;
    render(<CookMode recipe={grouped} onClose={() => {}} onUpdateRecipe={vi.fn()} />);
    expect(document.querySelector(".cookmode-photo")).not.toBeInTheDocument();
    fireEvent.click(document.querySelectorAll(".group-nav-btn")[1]);
    expect(document.querySelector(".cookmode-photo")).toBeInTheDocument();
  });
});
