import { describe, it, expect, vi, afterEach } from "vitest";
import handler from "../keep-alive";

function fakeRes() {
  const out: { code?: number; body?: unknown } = {};
  return { out, res: { status: (code: number) => ({ json: (body: unknown) => { out.code = code; out.body = body; } }) } };
}

afterEach(() => vi.unstubAllGlobals());

describe("/api/keep-alive", () => {
  it("fait une seule petite lecture dans la base et répond ok", async () => {
    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { out, res } = fakeRes();
    await handler({ method: "GET" }, res);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/rest\/v1\/recipes\?select=id&limit=1$/);
    expect((init.headers as Record<string, string>).apikey).toBeTruthy();
    expect(init.method ?? "GET").toBe("GET");
    expect(out.code).toBe(200);
    expect(out.body).toMatchObject({ ok: true, status: 200 });
  });

  it("signale une base injoignable sans planter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("réseau"); }));
    const { out, res } = fakeRes();
    await handler({ method: "GET" }, res);
    expect(out.code).toBe(502);
    expect(out.body).toMatchObject({ ok: false, error: "réseau" });
  });

  it("refuse autre chose qu'une lecture", async () => {
    const { out, res } = fakeRes();
    await handler({ method: "POST" }, res);
    expect(out.code).toBe(405);
  });
});
