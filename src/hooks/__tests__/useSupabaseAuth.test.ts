import { describe, it, expect, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

vi.mock("../../utils/supabaseClient", () => ({ getSupabaseClient: () => null }));

import { keepSameUser } from "../useSupabaseAuth";

const user = (id: string, email: string) => ({ id, email }) as unknown as User;

describe("keepSameUser", () => {
  it("garde le même objet quand Supabase renvoie la même personne (renouvellement du jeton)", () => {
    const first = user("u1", "a@b.fr");
    expect(keepSameUser(first, user("u1", "a@b.fr"))).toBe(first);
  });

  it("prend le nouvel objet quand la personne ou son e-mail change", () => {
    const first = user("u1", "a@b.fr");
    const other = user("u2", "c@d.fr");
    const newEmail = user("u1", "z@b.fr");
    expect(keepSameUser(first, other)).toBe(other);
    expect(keepSameUser(first, newEmail)).toBe(newEmail);
  });

  it("renvoie null à la déconnexion", () => {
    expect(keepSameUser(user("u1", "a@b.fr"), null)).toBeNull();
  });
});
