import { expect, test } from "@playwright/test";

test("unsaved project edits can be kept or explicitly discarded without changing saved data", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Make room for my projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add your first project", exact: true })
    .click();
  await page.getByLabel("Project name", { exact: true }).fill("Keep my draft");
  await page
    .getByLabel("Your next tiny step", { exact: true })
    .fill("Pin the two pieces.");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Discard your unsaved changes?",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep things as they are", exact: true })
    .click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Keep my draft",
  );
  await page
    .getByRole("button", { name: "Give it a place", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Keep my draft", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page
    .getByLabel("Project name", { exact: true })
    .fill("An edit I will discard");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Keep my draft", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Keep my draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open An edit I will discard",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("discarding a checkpoint draft keeps its running session and existing next step", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample studio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open The Sunday tote", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Let’s make a little", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause & leave a note", exact: true })
    .click();
  await page
    .getByLabel("What’s the next tiny step?", { exact: true })
    .fill("Do not save this draft.");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Do not save this draft.", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Return to your session", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toBeVisible();
});

test("small-phone dashboard surfaces a useful next action and form controls fit at 320px", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample studio", exact: true })
    .click();
  await page.getByRole("button", { name: "10 minutes", exact: true }).click();
  const pickUp = page.getByRole("button", {
    name: "Pick up the sunday tote",
    exact: true,
  });
  await expect(pickUp).toBeVisible();
  const box = await pickUp.boundingBox();
  expect(box!.y + box!.height).toBeLessThan(600);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: `artifacts/screenshots/iteration2-${testInfo.project.name}-320-dashboard.png`,
  });
  await pickUp.click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  const close = await page
    .getByRole("button", { name: "Close dialog", exact: true })
    .boundingBox();
  expect(close!.width).toBeGreaterThanOrEqual(44);
  expect(close!.height).toBeGreaterThanOrEqual(44);
  await page
    .getByRole("button", { name: "focused", exact: true })
    .scrollIntoViewIfNeeded();
  const energy = await page
    .getByRole("button", { name: "focused", exact: true })
    .boundingBox();
  expect(energy!.x).toBeGreaterThanOrEqual(0);
  expect(energy!.x + energy!.width).toBeLessThanOrEqual(320);
});
