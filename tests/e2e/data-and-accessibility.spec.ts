import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";

const photoPath = path.resolve("tests/fixtures/project-photo.png");
const title = "Patchwork bookmark";

async function settleUi(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const finite = document
      .getAnimations()
      .filter(
        (animation) => animation.effect?.getTiming().iterations !== Infinity,
      );
    await Promise.all(
      finite.map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function ready(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Make room for my projects", exact: true })
    .click();
  await settleUi(page);
}

async function createProject(page: Page, name = title, withPhoto = false) {
  const first = page.getByRole("button", {
    name: "Add your first project",
    exact: true,
  });
  if (await first.isVisible()) await first.click();
  else
    await page
      .getByRole("button", { name: "New project", exact: true })
      .first()
      .click();
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page
    .getByLabel("Your next tiny step", { exact: true })
    .fill("Sew the short edge with violet thread.");
  await page
    .getByLabel("Where are the pieces?", { exact: true })
    .fill("In the small basket on the desk.");
  if (withPhoto) {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Add a project photo", exact: true })
      .click();
    await (await chooser).setFiles(photoPath);
    await expect(
      page.getByRole("img", { name: "Your project photo", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Give it a place", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await settleUi(page);
}

async function corner(page: Page) {
  await page.getByRole("tab", { name: "Your corner", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your corner.", exact: true }),
  ).toBeVisible();
}

async function openProject(page: Page, name = title) {
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await page.getByRole("button", { name: `Open ${name}`, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function chooseImport(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import a backup", exact: true })
    .click();
  await (await chooser).setFiles(file);
}

test("photo survives reload and portable backup restores into an empty studio", async ({
  page,
}, testInfo) => {
  await ready(page);
  await createProject(page, title, true);
  const photo = page.getByRole("img", {
    name: "Sewing project photo",
    exact: true,
  });
  await expect(photo).toBeVisible();
  await page.reload();
  await openProject(page);
  await expect(photo).toBeVisible();

  await corner(page);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export a backup", exact: true })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(
    /^unpause-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const backupPath = testInfo.outputPath("portable-backup.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup.projects).toHaveLength(1);
  expect(backup.projects[0].title).toBe(title);
  expect(backup.projects[0].coverUri).toMatch(/^data:image\/jpeg;base64,/);
  expect(backup.projects[0].coverUri).not.toContain("blob:");
  expect(backup.activeSession).toBeNull();

  await page
    .getByRole("button", { name: "Erase local projects", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Open ${title}`, exact: true }),
  ).toHaveCount(0);
  await corner(page);
  await chooseImport(page, backupPath);
  await expect(
    page.getByText("Replace this device’s studio?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await openProject(page);
  await expect(photo).toBeVisible();
  await expect(
    page.getByText("Sew the short edge with violet thread.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await openProject(page);
  await expect(photo).toBeVisible();
  // Decode the exported image independently of any cached browser object URL.
  const dimensions = await page.evaluate(async (uri: string) => {
    const image = new Image();
    image.src = uri;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, backup.projects[0].coverUri);
  expect(dimensions).toEqual({ width: 32, height: 32 });
});

test("malformed backup and cancelled destructive actions preserve projects", async ({
  page,
}) => {
  await ready(page);
  await createProject(page);
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep things as they are", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await corner(page);
  await page
    .getByRole("button", { name: "Erase local projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Keep things as they are", exact: true })
    .click();
  await chooseImport(page, {
    name: "empty-but-valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        projects: [],
        activeSession: null,
        hasOnboarded: true,
        displayName: "",
      }),
    ),
  });
  await expect(
    page.getByText("Replace this device’s studio?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep things as they are", exact: true })
    .click();
  await chooseImport(page, {
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"projects":[{"title":"damaged"}]}'),
  });
  await expect(
    page
      .getByText(
        "This file is not a valid Unpause backup. Your existing projects have not been changed.",
        { exact: true },
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Replace this device’s studio?", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await openProject(page);
  await expect(
    page.getByText("In the small basket on the desk.", { exact: true }),
  ).toBeVisible();
});

test("a second project cannot steal the current making session", async ({
  page,
}) => {
  await ready(page);
  await createProject(page, "First handoff");
  await page
    .getByRole("button", { name: "Let’s make a little", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await createProject(page, "Second handoff");
  await page
    .getByRole("button", { name: "Let’s make a little", exact: true })
    .click();
  await expect(
    page
      .getByText(
        "You have a session open in another project. Leave a checkpoint there before starting this one.",
        { exact: true },
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Return to your session", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "First handoff", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause & leave a note", exact: true }),
  ).toBeVisible();
});

test("dashboard, project form, and detail meet automated WCAG A/AA checks", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample studio", exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  const scan = async (state: string) => {
    await settleUi(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await testInfo.attach(`axe-${state}`, {
      body: JSON.stringify(result.violations, null, 2),
      contentType: "application/json",
    });
    expect
      .soft(
        result.violations.map((v) => ({
          rule: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        `${state} accessibility violations`,
      )
      .toEqual([]);
  };
  await scan("dashboard");
  await page
    .getByRole("button", { name: "Open The Sunday tote", exact: true })
    .click();
  await scan("detail");
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toBeVisible();
  await scan("project-form");
});

test("available energy narrows time-matched projects without hiding gentler work", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample studio", exact: true })
    .click();
  await page.getByRole("button", { name: "45 minutes", exact: true }).click();
  await page
    .getByRole("button", { name: "Gentle energy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open The Sunday tote", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Postcards from nowhere",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Open A home for the records",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Steady energy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open The Sunday tote", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Postcards from nowhere",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open A home for the records",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Focused energy", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Open A home for the records",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "10 minutes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open The Sunday tote", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open A home for the records",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("320px layout keeps dashboard, detail, and form within the viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await ready(page);
  const assertNoOverflow = async (state: string) => {
    await settleUi(page);
    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      body: document.body.scrollWidth,
      root: document.documentElement.scrollWidth,
    }));
    expect
      .soft(widths.body, `${state} body width`)
      .toBeLessThanOrEqual(widths.viewport + 1);
    expect
      .soft(widths.root, `${state} root width`)
      .toBeLessThanOrEqual(widths.viewport + 1);
    for (const heading of await page.getByRole("heading").all()) {
      if (!(await heading.isVisible())) continue;
      const bounds = await heading.boundingBox();
      if (bounds) {
        expect
          .soft(
            bounds.x + bounds.width,
            `${state} heading fits without clipping`,
          )
          .toBeLessThanOrEqual(widths.viewport + 1);
      }
    }
    await page.screenshot({
      path: testInfo.outputPath(`narrow-${state}.png`),
      fullPage: true,
    });
  };
  await assertNoOverflow("empty");
  await createProject(page);
  await assertNoOverflow("detail");
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await expect(page.getByLabel("Project name", { exact: true })).toBeVisible();
  await assertNoOverflow("form");
});
