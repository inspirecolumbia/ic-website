export type EmailTemplate = { subject: string; text: string; html: string };

// Matches the hardcoded production domain already used in app/sitemap.ts,
// app/robots.ts, and app/layout.tsx's metadataBase -- no env var for this
// anywhere in the codebase, so this follows the same established pattern
// rather than introducing a new one just for this link.
export const SITE_URL = "https://inspirecolumbia.org";

export function applicationAdminUrl(applicationId: string): string {
  return `${SITE_URL}/admin/applications/${applicationId}`;
}

function htmlParagraphs(lines: string[]): string {
  return lines.map((line) => `<p>${line}</p>`).join("\n");
}

// Built at resend.com/templates rather than inline HTML/text -- the alias
// and variable names are whatever was defined there, not something this
// code can introspect, so they're hand-pinned here to match. "Application
// Received" (published, variables: first_name, last_name matching
// applicationConfirmationTemplateVariables below) -- deliberately no
// {{{RESEND_UNSUBSCRIBE_URL}}} tag in it, since that's a transactional
// email and Resend only honors that tag for broadcasts/automations.
export const APPLICATION_CONFIRMATION_TEMPLATE_ALIAS = "application-received-1";

export function applicationConfirmationTemplateVariables(
  firstName: string,
  lastName: string
): Record<string, string> {
  return { first_name: firstName, last_name: lastName };
}

// Deliberately no statusChangeEmail here -- status changes are internal
// only and must never notify the applicant (see updateApplicationStatus in
// app/admin/actions.ts and tests/rls/... asserting no email fires on a
// status change).
export function staffAlertEmail(applicantName: string, jobTitle: string, applicationUrl: string): EmailTemplate {
  const subject = `New application: ${applicantName} for ${jobTitle}`;
  const lines = [`${applicantName} just applied for ${jobTitle}.`, `Review it here: ${applicationUrl}`];
  return { subject, text: lines.join("\n\n"), html: htmlParagraphs(lines) };
}
