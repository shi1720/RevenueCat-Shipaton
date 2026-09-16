import { expect, test } from "@playwright/test";

const families = [
  "DMSans_400Regular",
  "DMSans_500Medium",
  "DMSans_700Bold",
  "Fraunces_500Medium",
  "Fraunces_500Medium_Italic",
];

test("brand fonts are actual font responses and register successfully", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Make room for my projects",
      exact: true,
    }),
  ).toBeVisible();
  const urls = await page.evaluate(() =>
    Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .filter((rule) => rule instanceof CSSFontFaceRule)
          .map(
            (rule) =>
              (rule as CSSFontFaceRule).style
                .getPropertyValue("src")
                .match(/url\(["']?([^"')]+)/)?.[1],
          )
          .filter((url): url is string => Boolean(url));
      } catch {
        return [];
      }
    }),
  );
  expect(urls).toHaveLength(5);
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).not.toContain("text/html");
    const data = await response.body();
    expect(data.subarray(0, 4).toString("hex")).toBe("00010000");
  }
  const status = await page.evaluate(async (names) => {
    await Promise.all(
      names.map((name) => document.fonts.load(`16px "${name}"`)),
    );
    return names.map((name) => ({
      name,
      loaded: document.fonts.check(`16px "${name}"`),
      face: Array.from(document.fonts).find(
        (face) => face.family.replaceAll('"', "") === name,
      )?.status,
    }));
  }, families);
  expect(status.every((font) => font.loaded && font.face === "loaded")).toBe(
    true,
  );
});

test("failed font delivery leaves a usable app with explicit system font fallbacks", async ({
  page,
}) => {
  await page.route(/\.ttf(?:\?.*)?$/, (route) => route.abort("failed"));
  await page.goto("/");
  const button = page.getByRole("button", {
    name: "Make room for my projects",
    exact: true,
  });
  await expect(button).toBeVisible();
  // Read the actual rendered button label because its style explicitly uses
  // the body typography token. A missing custom family must not select Times.
  const computed = await button.evaluate(
    (element) =>
      getComputedStyle(
        element.querySelector('[dir="auto"]') ||
          element.lastElementChild ||
          element,
      ).fontFamily,
  );
  expect(computed).toContain("sans-serif");
  await button.click();
  await expect(
    page.getByRole("button", { name: "Add your first project", exact: true }),
  ).toBeVisible();
});
