import { describe, expect, it, vi } from "vitest";
import {
  createDeletionHandler,
  type Dependencies,
} from "../supabase/functions/delete-firebase-account/handler";
import { createRevenueCatDeletion } from "../supabase/functions/delete-firebase-account/revenuecat";

const origin = "https://unpause-studio.web.app";
const authFailure = (code: string) =>
  Object.assign(new Error("private provider details"), { code });
function setup() {
  let exists = true;
  const receipts = new Set<string>();
  const sequence: string[] = [];
  const deps: Dependencies = {
    verify: vi.fn(async (_token, revoked) => {
      if (revoked && !exists) throw authFailure("auth/user-not-found");
      return { uid: "owner-uid", auth_time: 900 };
    }),
    deleteFirebase: vi.fn(async () => {
      sequence.push("firebase");
      exists = false;
    }),
    deleteRevenueCat: vi.fn(async () => {
      sequence.push("revenuecat");
      return "deleted" as const;
    }),
    consumeAttempt: vi.fn(async () => true),
    hasReceipt: vi.fn(async (hash) => receipts.has(hash)),
    prepareReceipt: vi.fn(async (hash) => {
      sequence.push("receipt");
      receipts.add(hash);
    }),
    now: () => 1_000_000,
  };
  const handler = createDeletionHandler(deps, new Set([origin]));
  const request = (
    body: unknown = { confirmation: "DELETE_MY_ACCOUNT" },
    token = "signed-token",
  ) =>
    handler(
      new Request("https://api.example/delete", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }),
    );
  return { deps, request, sequence, handler };
}
describe("Firebase deletion HTTP security and retries", () => {
  it("deletes only the verified UID, after billing and durable receipt, and tolerates a lost success response", async () => {
    const { request, deps, sequence } = setup();
    expect(await (await request()).json()).toEqual({ deleted: true });
    expect(sequence).toEqual(["revenuecat", "receipt", "firebase"]);
    expect(deps.deleteFirebase).toHaveBeenCalledWith("owner-uid");
    expect(deps.verify).toHaveBeenCalledWith("signed-token", true);
    expect(await (await request()).json()).toEqual({ deleted: true });
    expect(deps.deleteFirebase).toHaveBeenCalledTimes(1);
    expect((await request(undefined, "different-signed-token")).status).toBe(
      401,
    );
    expect(deps.prepareReceipt).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });
  it.each(["uid", "email", "customer_id", "app_user_id"])(
    "rejects attempted foreign %s selectors before authentication",
    async (field) => {
      const { request, deps } = setup();
      expect(
        (
          await request({
            confirmation: "DELETE_MY_ACCOUNT",
            [field]: "victim",
          })
        ).status,
      ).toBe(400);
      expect(deps.verify).not.toHaveBeenCalled();
    },
  );
  it.each([
    "auth/invalid-id-token",
    "auth/id-token-revoked",
    "auth/id-token-expired",
    "auth/user-disabled",
  ])("rejects %s without provider deletion", async (code) => {
    const { request, deps } = setup();
    vi.mocked(deps.verify).mockRejectedValue(authFailure(code));
    const result = await request();
    expect(result.status).toBe(401);
    expect(await result.text()).not.toContain("private provider details");
    expect(deps.deleteRevenueCat).not.toHaveBeenCalled();
  });
  it.each([699, 1001, Number.NaN])(
    "requires a recent, non-future auth_time: %s",
    async (auth_time) => {
      const { request, deps } = setup();
      vi.mocked(deps.verify).mockResolvedValue({ uid: "owner-uid", auth_time });
      expect((await request()).status).toBe(401);
      expect(deps.deleteRevenueCat).not.toHaveBeenCalled();
    },
  );
  it("retains Firebase during queued asynchronous RevenueCat deletion", async () => {
    const { request, deps } = setup();
    vi.mocked(deps.deleteRevenueCat).mockResolvedValue("pending");
    const result = await request();
    expect(result.status).toBe(202);
    expect((await result.json()).deleted).toBe(false);
    expect(deps.deleteFirebase).not.toHaveBeenCalled();
    expect(deps.prepareReceipt).not.toHaveBeenCalled();
  });
  it("retains Firebase when RevenueCat or receipt persistence fails", async () => {
    for (const method of ["deleteRevenueCat", "prepareReceipt"] as const) {
      const { request, deps } = setup();
      vi.mocked(deps[method]).mockRejectedValue(
        new Error("provider unavailable"),
      );
      expect((await request()).status).toBe(503);
      expect(deps.deleteFirebase).not.toHaveBeenCalled();
    }
  });
  it("retries a partial failure without reporting false success", async () => {
    const { request, deps } = setup();
    vi.mocked(deps.deleteFirebase).mockRejectedValueOnce(
      new Error("Firebase down"),
    );
    expect((await request()).status).toBe(503);
    expect(await (await request()).json()).toEqual({ deleted: true });
    expect(deps.deleteRevenueCat).toHaveBeenCalledTimes(2);
  });
  it("rate limits before any provider mutation", async () => {
    const { request, deps } = setup();
    vi.mocked(deps.consumeAttempt).mockResolvedValue(false);
    const result = await request();
    expect(result.status).toBe(429);
    expect(result.headers.get("Retry-After")).toBe("60");
    expect(deps.deleteRevenueCat).not.toHaveBeenCalled();
  });
  it("rejects foreign origins, invalid methods, malformed JSON and oversized bodies", async () => {
    const { handler, request, deps } = setup();
    expect(
      (
        await handler(
          new Request("https://api.example", {
            headers: { Origin: "https://attacker.example" },
          }),
        )
      ).status,
    ).toBe(403);
    expect((await handler(new Request("https://api.example"))).status).toBe(
      405,
    );
    expect((await request("x".repeat(2000))).status).toBe(413);
    expect(
      (
        await handler(
          new Request("https://api.example", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer x",
            },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(deps.verify).not.toHaveBeenCalled();
  });
  it("allows native requests without Origin and exact web preflight only", async () => {
    const { handler } = setup();
    const preflight = await handler(
      new Request("https://api.example", {
        method: "OPTIONS",
        headers: { Origin: origin },
      }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    const native = await handler(
      new Request("https://api.example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer native",
        },
        body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
      }),
    );
    expect(native.status).toBe(200);
    expect(native.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function billing(responses: Response[]) {
  const calls: { url: string; method: string }[] = [];
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method || "GET" });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    },
  );
  return {
    calls,
    deleteCustomer: createRevenueCatDeletion(
      "proj-unpause",
      "server-test-secret",
      fetcher,
    ),
  };
}
const projects = () =>
  json({ object: "list", items: [{ id: "proj-unpause" }], next_page: null });
describe("RevenueCat v2 deletion completion", () => {
  it("confirms project before accepting an already absent customer", async () => {
    const { deleteCustomer, calls } = billing([
      projects(),
      json({ object: "error", type: "resource_missing" }, 404),
    ]);
    expect(await deleteCustomer("own/uid")).toBe("deleted");
    expect(calls[1].url).toContain("own%2Fuid");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });
  it("does not treat queued deletion as completion", async () => {
    const { deleteCustomer } = billing([
      projects(),
      json({}),
      json({}),
      json({}),
    ]);
    expect(await deleteCustomer("uid")).toBe("pending");
  });
  it("requires observed absence after the queued operation", async () => {
    const { deleteCustomer, calls } = billing([
      projects(),
      json({}),
      json({}),
      json({ object: "error", type: "resource_missing" }, 404),
    ]);
    expect(await deleteCustomer("uid")).toBe("deleted");
    expect(calls.map((call) => call.method)).toEqual([
      "GET",
      "GET",
      "DELETE",
      "GET",
    ]);
  });
  it.each([401, 403, 429, 500, 503])(
    "rejects provider status %s rather than deleting Firebase",
    async (status) => {
      const { deleteCustomer } = billing([
        projects(),
        json({}),
        json({}, status),
      ]);
      await expect(deleteCustomer("uid")).rejects.toThrow();
    },
  );
  it("rejects a generic HTTP 404 that is not a RevenueCat missing-resource response", async () => {
    const { deleteCustomer } = billing([projects(), json({}, 404)]);
    await expect(deleteCustomer("uid")).rejects.toThrow();
  });
  it("rejects missing/wrong projects and pagination redirects before customer access", async () => {
    for (const response of [
      json({ object: "list", items: [], next_page: null }),
      json({
        object: "list",
        items: [],
        next_page: "https://attacker.example/v2/projects",
      }),
    ]) {
      const { deleteCustomer, calls } = billing([response]);
      await expect(deleteCustomer("uid")).rejects.toThrow();
      expect(calls).toHaveLength(1);
    }
  });
});
