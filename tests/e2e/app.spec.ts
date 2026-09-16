import { test, expect } from "@playwright/test";
test("complete project lifecycle persists across reloads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Make room for my projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add your first project", exact: true })
    .click();
  await page
    .getByLabel("Project name", { exact: true })
    .fill("Window herb box");
  await page.getByRole("button", { name: "Garden", exact: true }).click();
  await page
    .getByLabel("A little about it", { exact: true })
    .fill("A cedar box for the kitchen herbs.");
  await page
    .getByLabel("Your next tiny step", { exact: true })
    .fill("Line the base with the cut mesh.");
  await page
    .getByLabel("Where are the pieces?", { exact: true })
    .fill("On the balcony shelf.");
  await page
    .getByRole("button", { name: "Give it a place", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Window herb box", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Let’s make a little", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Return to your session", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause & leave a note", exact: true })
    .click();
  await page
    .getByLabel("Where did you stop?", { exact: true })
    .fill("Mesh is in. Drainage holes are clear.");
  await page
    .getByLabel("What’s the next tiny step?", { exact: true })
    .fill("Add the first layer of potting mix.");
  await page
    .getByRole("button", { name: "Save my place", exact: true })
    .click();
  await expect(
    page.getByText("Add the first layer of potting mix.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as finished", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Make a little more", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your shelf", exact: true }).click();
  await page.getByRole("button", { name: "Finished", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Window herb box", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("sample studio time matching, free cap and honest unavailable purchases", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample studio", exact: true })
    .click();
  await page.getByRole("button", { name: "10 minutes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open The Sunday tote", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Postcards from nowhere",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "45 minutes", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open A home for the records",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Make this studio yours?", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep things as they are", exact: true })
    .click();
  await page.getByRole("tab", { name: "Your corner", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore Studio", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Studio purchases are not available in this build.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore purchases", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("tab", { name: "Your corner", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in or create an account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }).last(),
  ).toBeDisabled();
});
test("empty form validation and edited next-step persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Make room for my projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add your first project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Give it a place", exact: true })
    .click();
  await expect(
    page.getByText("Give your project a name.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Project name", { exact: true }).fill("Fix the lamp");
  await page
    .getByLabel("Your next tiny step", { exact: true })
    .fill("Find the replacement shade.");
  await page
    .getByRole("button", { name: "Give it a place", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page
    .getByLabel("Your next tiny step", { exact: true })
    .fill("Attach the new shade.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Attach the new shade.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Fix the lamp", exact: true })
    .click();
  await expect(
    page.getByText("Attach the new shade.", { exact: true }),
  ).toBeVisible();
});
