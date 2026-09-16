import { test, expect } from "@playwright/test";
import { sampleData } from "../../src/domain/samples";
import { parseBackup } from "../../src/domain/projects";

test("large histories remain paginated and reachable after reload", async ({
  page,
}) => {
  const data = sampleData();
  const project = data.projects[0];
  project.title = "Long-running studio project";
  project.isSample = false;
  project.checkpoints = Array.from({ length: 300 }, (_, index) => ({
    ...project.checkpoints[0],
    id: `archive-${index}`,
    createdAt: new Date(Date.now() - index * 60000).toISOString(),
    stoppedAt:
      `Recorded note ${index}. ${"A saved detail. ".repeat(260)}`.slice(
        0,
        3990,
      ),
    nextStep: "A small next step. ".repeat(50),
    materials: "In the project box. ".repeat(95),
    blocker: "Measure before cutting. ".repeat(80),
  }));
  data.projects = [project];
  const serialized = JSON.stringify(data);
  expect(serialized.length).toBeGreaterThan(2_000_000);
  parseBackup(serialized);
  await page.addInitScript((value) => {
    if (!localStorage.getItem("@unpause/data/v1")) {
      localStorage.setItem("@unpause/data/v1", value);
    }
  }, serialized);
  await page.goto("/");
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await page
    .getByRole("button", { name: `Open ${project.title}`, exact: true })
    .click();
  await expect(
    page.getByText("Notes page 1 of 30", { exact: true }),
  ).toBeAttached();
  const history = page
    .getByText("The story so far", { exact: true })
    .locator("..");
  await expect(history.getByText(/^Recorded note/)).toHaveCount(10);
  await page.getByRole("button", { name: "Older notes", exact: true }).click();
  await expect(
    page.getByText("Notes page 2 of 30", { exact: true }),
  ).toBeVisible();
  await expect(history.getByText(/^Recorded note 10\./)).toHaveCount(1);
  await expect(history.getByText(/^Recorded note 0\./)).toHaveCount(0);
  await page.getByRole("button", { name: "Newer notes", exact: true }).click();
  await expect(history.getByText(/^Recorded note 0\./)).toHaveCount(1);
  await page.reload();
  await page.getByRole("tab", { name: "Little moments", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: `View checkpoint for ${project.title}`,
      exact: true,
    }),
  ).toHaveCount(10);
  await page.getByRole("button", { name: "Older notes", exact: true }).click();
  await expect(
    page.getByText("Notes page 2 of 30", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^Recorded note 10\./)).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: `View checkpoint for ${project.title}`,
      exact: true,
    }),
  ).toHaveCount(10);
});
