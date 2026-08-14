import { applicationStatusLabel } from "@/lib/applications";
import type { Database } from "@/lib/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

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

export function statusChangeEmail(firstName: string, jobTitle: string, status: ApplicationStatus): EmailTemplate {
  const label = applicationStatusLabel(status);
  const subject = `Update on your ${jobTitle} application`;
  const lines = [
    `Hi ${firstName},`,
    `Your application for ${jobTitle} has been updated to: ${label}.`,
    "If you have any questions, just reply to this email.",
  ];
  return { subject, text: lines.join("\n\n"), html: htmlParagraphs(lines) };
}

export function staffAlertEmail(applicantName: string, jobTitle: string): EmailTemplate {
  const subject = `New application: ${applicantName} for ${jobTitle}`;
  const lines = [
    `${applicantName} just applied for ${jobTitle}.`,
    "Review it in the admin dashboard under Applications.",
  ];
  return { subject, text: lines.join("\n\n"), html: htmlParagraphs(lines) };
}
