/** Current v2 deletion is queued. Never delete Firebase until a read confirms absence. */
export function createRevenueCatDeletion(
  projectId: string,
  secret: string,
  request: typeof fetch = fetch,
) {
  const root = "https://api.revenuecat.com/v2";
  const call = (url: string, method = "GET") =>
    request(url, {
      method,
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
  const isAbsent = async (response: Response) => {
    if (response.status !== 404) return false;
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("object" in body) ||
      body.object !== "error" ||
      !("type" in body) ||
      body.type !== "resource_missing"
    )
      throw new Error("Unrecognized billing not-found response");
    return true;
  };
  return async (uid: string): Promise<"deleted" | "pending"> => {
    // An invalid project can also return 404. Verify its existence/access separately
    // before accepting a missing customer, without loading other customer profiles.
    let cursor: string | null = `${root}/projects?limit=100`;
    let found = false;
    for (let page = 0; cursor && page < 10; page++) {
      const projects = await call(cursor);
      if (projects.status !== 200)
        throw new Error("Billing provider unavailable");
      const data = await projects.json();
      if (data.object !== "list" || !Array.isArray(data.items))
        throw new Error("Invalid billing response");
      if (data.items.some((item: { id?: string }) => item.id === projectId)) {
        found = true;
        break;
      }
      if (data.next_page) {
        const next = new URL(data.next_page, root);
        if (
          next.origin !== "https://api.revenuecat.com" ||
          next.pathname !== "/v2/projects"
        )
          throw new Error("Invalid billing pagination");
        cursor = next.href;
      } else cursor = null;
    }
    if (!found) throw new Error("Billing project unavailable");
    const customerUrl = `${root}/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(uid)}`;
    const existing = await call(customerUrl);
    if (await isAbsent(existing)) return "deleted";
    if (existing.status !== 200)
      throw new Error("Billing provider unavailable");
    const queued = await call(customerUrl, "DELETE");
    if (queued.status !== 200 && queued.status !== 404)
      throw new Error("Billing deletion unavailable");
    const remaining = await call(customerUrl);
    if (await isAbsent(remaining)) return "deleted";
    if (remaining.status === 200) return "pending";
    throw new Error("Billing verification unavailable");
  };
}
