import { test, expect } from "@playwright/test";
import { TEAM_6_PARENT_TITLE } from "@/lib/screening";
import {
  fillApplicationForm,
  submit,
  teamPreferencesFor,
  uniqueEmail,
  VALID_PDF,
  OVERSIZED_PDF,
  WRONG_TYPE_FILE,
  JOB_SLUG,
  pool,
  radioOption,
  eligibilityRadioOption,
} from "./helpers";
import { SCREENING_QUESTIONS } from "@/lib/screening";

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await page.goto(`/jobs/${JOB_SLUG}/apply`);
});

test.describe("happy path", () => {
  test("submits successfully with a regular team choice and valid documents", async ({ page }) => {
    await fillApplicationForm(page);
    await submit(page);

    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
  });

  test("picking team 6 reveals a required sub-track choice, and the resolved value is what gets stored", async ({
    page,
  }) => {
    const email = uniqueEmail("logistics");
    await fillApplicationForm(page, {
      email,
      teamChoices: ["Nonprofit Finances and Legal", "Technology and Web Development", TEAM_6_PARENT_TITLE],
      subTrack: "Logistics & Operations",
    });
    await submit(page);

    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();

    const teams = await teamPreferencesFor(email);
    expect(teams).toContain("Logistics & Operations");
    expect(teams).not.toContain(TEAM_6_PARENT_TITLE);
    expect(teams).not.toContain("Production");
  });

  test("year of study accepts free text via the Other option", async ({ page }) => {
    await fillApplicationForm(page, { yearOfStudy: "Other" });
    await page.getByPlaceholder("Enter your year of study").fill("Gap year");
    await submit(page);

    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
  });
});

test.describe("college field", () => {
  test("never offers Other as a school option", async ({ page }) => {
    const schoolOptions = await page.locator('label[for^="school-"]').allTextContents();
    expect(schoolOptions).toHaveLength(6);
    expect(schoolOptions).not.toContain("Other");

    const yearOfStudyOptions = await page.locator('label[for^="year_of_study-"]').allTextContents();
    expect(yearOfStudyOptions).toContain("Other");
  });
});

test.describe("team preference validation", () => {
  test("rejects fewer than 3 team preferences without clearing the rest of the form", async ({ page }) => {
    const { email } = await fillApplicationForm(page, {
      teamChoices: ["Nonprofit Finances and Legal", "Technology and Web Development"],
    });
    await submit(page);

    await expect(page.getByText("Please select 3 team preferences.")).toBeVisible();
    // The whole point of last session's persistence fix: everything already
    // entered should still be there, not wiped by the failed submission.
    await expect(page.locator("#first_name")).toHaveValue("Ada");
    await expect(page.locator("#last_name")).toHaveValue("Lovelace");
    await expect(page.locator("#email")).toHaveValue(email);
    await expect(page.locator("#phone")).toHaveValue("8035550100");
    await expect(page.locator("#major")).toHaveValue("Computer Science");
    await expect(radioOption(page, "University of South Carolina, Columbia")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(radioOption(page, "Junior")).toHaveAttribute("aria-checked", "true");
    await expect(eligibilityRadioOption(page, SCREENING_QUESTIONS.livesNearColumbia.question, "Yes")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("rejects team 6 without a chosen sub-track", async ({ page }) => {
    await fillApplicationForm(page, {
      teamChoices: ["Nonprofit Finances and Legal", "Technology and Web Development", TEAM_6_PARENT_TITLE],
      subTrack: null,
    });
    // Deliberately never click a sub-track option -- the resolved value
    // submitted for that slot is an empty string. app/jobs/actions.ts's
    // splitTeamPreferences() filters out falsy formData values before
    // validation ever sees them, so this surfaces as "only 2 preferences
    // given", not as an invalid-team-name error -- still correctly
    // rejected, just via the count check rather than the whitelist check.
    await submit(page);

    await expect(page.getByText("Please select 3 team preferences.")).toBeVisible();
  });

  test("excludes an already-picked team from the other two dropdowns", async ({ page }) => {
    await page.locator("#team_choice_1").click();
    await page.getByRole("option", { name: "Nonprofit Finances and Legal", exact: true }).click();

    await page.locator("#team_choice_2").click();
    await expect(page.getByRole("option", { name: "Nonprofit Finances and Legal", exact: true })).toHaveCount(0);
  });
});

test.describe("other server-side validation", () => {
  test("rejects a school email that doesn't match the selected school's domain", async ({ page }) => {
    // A well-formed but non-matching email (e.g. a personal gmail.com
    // address) rather than uniqueEmail()'s @example.com -- this is caught
    // client-side (lib/applications.ts) before ever reaching the RPC, so
    // the wording is that check's, not the RPC's own (differently worded)
    // "School email must match..." message.
    await fillApplicationForm(page, { schoolEmail: "ada@gmail.com" });
    await submit(page);

    await expect(page.getByText(/school email must be a/i)).toBeVisible();
  });

  test("rejects a second application from the same email for the same job", async ({ page }) => {
    const email = uniqueEmail("duplicate");
    await fillApplicationForm(page, { email });
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();

    await page.goto(`/jobs/${JOB_SLUG}/apply`);
    await fillApplicationForm(page, { email });
    await submit(page);

    await expect(page.getByText(/already submitted an application/i)).toBeVisible();
  });
});

test.describe("file uploads", () => {
  test("blocks submission natively when the resume is missing", async ({ page }) => {
    await fillApplicationForm(page, { resumeFile: null });

    const resumeInput = page.locator("#resume");
    await expect(resumeInput).toHaveAttribute("required", "");
    const isValid = await resumeInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test("rejects a non-PDF file for the resume", async ({ page }) => {
    await fillApplicationForm(page, { resumeFile: WRONG_TYPE_FILE });
    await submit(page);

    await expect(page.getByText(/resume must be a pdf file/i)).toBeVisible();
  });

  test("rejects an oversized transcript", async ({ page }) => {
    await fillApplicationForm(page, { transcriptFile: OVERSIZED_PDF });
    await submit(page);

    await expect(page.getByText(/transcript is too large/i)).toBeVisible();
  });

  test("accepts a valid PDF and shows its file name", async ({ page }) => {
    await page.locator("#resume").setInputFiles(VALID_PDF);
    await expect(page.getByText(VALID_PDF.name)).toBeVisible();
  });
});
