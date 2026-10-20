import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../utils/imageUpload", () => ({ uploadRecipeImage: vi.fn() }));
vi.mock("../../../utils/aiIllustration", () => ({ generateAIIllustration: vi.fn() }));
vi.mock("../../../utils/photoCropSource", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../utils/photoCropSource")>();
  return { ...actual, loadCropSourceFromFile: vi.fn(), loadCropSourceFromUrl: vi.fn() };
});

import RecipeOptionsModal from "../RecipeOptionsModal";
import { uploadRecipeImage } from "../../../utils/imageUpload";
import { loadCropSourceFromFile, loadCropSourceFromUrl, PhotoSourceError } from "../../../utils/photoCropSource";
import type { Recipe } from "../../../hooks/useRecipes";

/* Menu d'une recette : la photo choisie passe par l'éditeur de recadrage
   avant l'envoi ; « Recadrer la photo » n'apparaît qu'avec une photo
   personnelle et renvoie une NOUVELLE image recadrée. Jsdom ne décode
   aucune image : la lecture de la photo est simulée (1600×900). */

const BUCKET = "https://abc.supabase.co/storage/v1/object/public/recipe-images/foyer-1/old.webp";
const BASE = { id: "r1", title: "Tarte", category: "Sucré", servings: 2, ingredients: [], steps: [] } as unknown as Recipe;
const BLOB = new Blob(["jpeg"], { type: "image/jpeg" });

const upload = vi.mocked(uploadRecipeImage);
const loadFile = vi.mocked(loadCropSourceFromFile);
const loadUrl = vi.mocked(loadCropSourceFromUrl);

function renderMenu(recipe: Recipe, extra: Partial<Parameters<typeof RecipeOptionsModal>[0]> = {}) {
  const props = {
    recipe,
    onClose: vi.fn(),
    onUpdateRecipe: vi.fn(),
    onRequestDelete: vi.fn(),
    householdId: "foyer-1",
    ...extra,
  };
  render(<RecipeOptionsModal {...props} />);
  return props;
}

const recropRow = () => document.querySelector<HTMLButtonElement>(".recipe-option-recrop");
const editor = () => document.querySelector(".photo-crop-modal");
const saveButton = () => {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".photo-crop-actions button");
  return buttons[buttons.length - 1];
};
const pickFile = (file: File) => {
  const input = document.querySelector<HTMLInputElement>(".recipe-options-modal input[type='file']")!;
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  upload.mockReset();
  loadFile.mockReset();
  loadUrl.mockReset();
  const source = async () => ({ blob: BLOB, url: "blob:photo", width: 1600, height: 900, release: () => {} });
  loadFile.mockImplementation(source);
  loadUrl.mockImplementation(source);
});
afterEach(cleanup);

describe("RecipeOptionsModal — « Recadrer la photo »", () => {
  it("absent sans image, ou avec une illustration IA hors du bucket", () => {
    renderMenu(BASE);
    expect(recropRow()).toBeNull();
    cleanup();
    renderMenu({ ...BASE, imageUrl: "https://image.pollinations.ai/prompt/tarte", imageSource: "ia" });
    expect(recropRow()).toBeNull();
  });

  it("présent avec une photo personnelle (source « photo » ou URL du bucket)", () => {
    renderMenu({ ...BASE, imageUrl: "https://x/photo.webp", imageSource: "photo" });
    expect(recropRow()).not.toBeNull();
    cleanup();
    renderMenu({ ...BASE, imageUrl: BUCKET });
    expect(recropRow()).not.toBeNull();
  });

  it("rouvre l'éditeur sur la photo en place, envoie une nouvelle image recadrée", async () => {
    upload.mockResolvedValue("https://x/new.webp");
    const props = renderMenu({ ...BASE, imageUrl: BUCKET, imageSource: "photo" });
    fireEvent.click(recropRow()!);
    expect(loadUrl).toHaveBeenCalledWith(BUCKET);
    await waitFor(() => expect(editor()).toBeInTheDocument());
    fireEvent.click(saveButton());
    await waitFor(() => expect(props.onUpdateRecipe).toHaveBeenCalledWith({ ...BASE, imageUrl: "https://x/new.webp", imageSource: "photo" }));
    expect(upload).toHaveBeenCalledWith(BLOB, "foyer-1", { crop: { x: 200, y: 0, w: 1200, h: 900 } });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("photo en ligne illisible (CORS, réseau) : message, pas d'éditeur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    loadUrl.mockRejectedValue(new PhotoSourceError("remote", "cors"));
    renderMenu({ ...BASE, imageUrl: BUCKET, imageSource: "photo" });
    fireEvent.click(recropRow()!);
    await waitFor(() => expect(document.querySelector(".recipe-options-error")).toBeInTheDocument());
    expect(editor()).toBeNull();
  });
});

describe("RecipeOptionsModal — « Ajouter ma propre photo »", () => {
  it("ouvre l'éditeur, n'envoie qu'à l'enregistrement, avec la zone choisie", async () => {
    upload.mockResolvedValue("https://x/p.webp");
    const props = renderMenu(BASE);
    pickFile(new File(["x"], "plat.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(editor()).toBeInTheDocument());
    expect(upload).not.toHaveBeenCalled();
    // Zoom à la glissière (×2, centré) : zone de 600×450 au centre de 1600×900.
    fireEvent.change(document.querySelector<HTMLInputElement>(".photo-crop-zoom input")!, { target: { value: "2" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(upload).toHaveBeenCalledWith(BLOB, "foyer-1", { crop: { x: 500, y: 225, w: 600, h: 450 } }));
    await waitFor(() => expect(props.onUpdateRecipe).toHaveBeenCalledWith({ ...BASE, imageUrl: "https://x/p.webp", imageSource: "photo" }));
  });

  it("échec de l'envoi : l'éditeur reste ouvert avec un message, recette inchangée", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    upload.mockRejectedValue(new Error("réseau"));
    const toast = vi.fn();
    const props = renderMenu(BASE, { showToast: toast });
    pickFile(new File(["x"], "plat.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(editor()).toBeInTheDocument());
    fireEvent.click(saveButton());
    await waitFor(() => expect(document.querySelector(".photo-crop-modal [role='alert']")).toBeInTheDocument());
    expect(props.onUpdateRecipe).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(editor()).toBeInTheDocument();
  });

  it("refuse un fichier qui n'est pas une image, et une image illisible", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderMenu(BASE);
    pickFile(new File(["x"], "a.txt", { type: "text/plain" }));
    expect(loadFile).not.toHaveBeenCalled();
    expect(document.querySelector(".recipe-options-error")).toBeInTheDocument();
    loadFile.mockRejectedValue(new PhotoSourceError("decode", "heic"));
    pickFile(new File(["x"], "a.heic", { type: "image/heic" }));
    await waitFor(() => expect(loadFile).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector(".recipe-options-error")).toBeInTheDocument());
    expect(editor()).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });
});
