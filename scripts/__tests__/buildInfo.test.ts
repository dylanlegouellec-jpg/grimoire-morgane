import { describe, it, expect } from "vitest";
import { getBuildInfo } from "../buildInfo";

describe("getBuildInfo", () => {
  const now = new Date("2026-10-07T17:48:27.000Z");

  it("prend les 7 premiers caractères du commit fourni par Vercel", () => {
    const info = getBuildInfo({ VERCEL_GIT_COMMIT_SHA: "f986dbcab0123456789" } as NodeJS.ProcessEnv, now);
    expect(info.commit).toBe("f986dbc");
  });

  it("donne l'instant de construction en ISO 8601 (UTC)", () => {
    const info = getBuildInfo({ VERCEL_GIT_COMMIT_SHA: "abcdef0123" } as NodeJS.ProcessEnv, now);
    expect(info.builtAt).toBe("2026-10-07T17:48:27.000Z");
  });

  it("sans variable Vercel, demande à git ; le résultat reste un identifiant court ou « dev »", () => {
    const info = getBuildInfo({} as NodeJS.ProcessEnv, now);
    expect(info.commit).toMatch(/^([0-9a-f]{7}|dev)$/);
  });
});
