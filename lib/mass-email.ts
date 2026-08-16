import { EMAIL_PATTERN } from "@/lib/applications";

export const MASS_EMAIL_RECIPIENT_CAP = 500;
const BATCH_CHUNK_SIZE = 100;

export type MassEmailApplicant = {
  email: string;
  firstName: string;
  lastName: string;
};

export type MassEmailRecipient = {
  to: string;
  // Known only for applicants pulled from the database -- an
  // additional/manual email has no row to read a name from.
  firstName: string | null;
  lastName: string | null;
};

// Splits on commas, semicolons, or newlines so staff can paste from
// anywhere (a spreadsheet column, a comma-separated list, one-per-line)
// without needing to reformat first.
export function parseAdditionalEmails(raw: string): { emails: string[]; invalid: string[] } {
  const candidates = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const emails: string[] = [];
  const invalid: string[] = [];
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (EMAIL_PATTERN.test(normalized)) emails.push(normalized);
    else invalid.push(candidate);
  }
  return { emails, invalid };
}

// Applicant rows take priority over a manually-typed duplicate -- an
// applicant's real name is always better than sending them a second,
// nameless copy.
export function buildMassEmailRecipients(
  applicants: MassEmailApplicant[],
  additionalEmails: string[]
): MassEmailRecipient[] {
  const seen = new Map<string, MassEmailRecipient>();
  for (const applicant of applicants) {
    const email = applicant.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.set(email, { to: email, firstName: applicant.firstName, lastName: applicant.lastName });
  }
  for (const email of additionalEmails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.set(normalized, { to: normalized, firstName: null, lastName: null });
  }
  return [...seen.values()];
}

// Recipient-specific values (first/last name) win over the global value a
// staff member typed for that same variable key, so a template built
// around {{first_name}} personalizes automatically for known applicants
// and only falls back to the staff-provided value for manually-added
// emails with no name on file.
export function resolveRecipientVariables(
  recipient: MassEmailRecipient,
  globalValues: Record<string, string>
): Record<string, string> {
  const resolved = { ...globalValues };
  if (recipient.firstName !== null && "first_name" in resolved) resolved.first_name = recipient.firstName;
  if (recipient.lastName !== null && "last_name" in resolved) resolved.last_name = recipient.lastName;
  return resolved;
}

export function chunkRecipients<T>(items: T[], size = BATCH_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
