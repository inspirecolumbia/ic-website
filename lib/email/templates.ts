export type EmailTemplate = { subject: string; text: string; html: string };

function htmlParagraphs(lines: string[]): string {
  return lines.map((line) => `<p>${line}</p>`).join("\n");
}

// Built at resend.com/templates rather than inline HTML/text -- the alias
// and variable names are whatever was defined there, not something this
// code can introspect, so they're hand-pinned here to match.
export const APPLICATION_CONFIRMATION_TEMPLATE_ALIAS = "application-confirmation";

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
export function staffAlertEmail(applicantName: string, jobTitle: string): EmailTemplate {
  const subject = `New application: ${applicantName} for ${jobTitle}`;
  const lines = [
    `${applicantName} just applied for ${jobTitle}.`,
    "Review it in the admin dashboard under Applications.",
  ];
  return { subject, text: lines.join("\n\n"), html: htmlParagraphs(lines) };
}
