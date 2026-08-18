import { EMAIL_PATTERN } from "@/lib/applications";

export const MASS_EMAIL_RECIPIENT_CAP = 500;
export const MASS_EMAIL_SCHEDULE_MAX_DAYS = 30;
const BATCH_CHUNK_SIZE = 100;

// key -> the applicant field it auto-fills from, for the two names Resend
// templates commonly use. Any other key is either a global (same-for-
// everyone) value or, if the template defines a fallback, left unset so
// Resend's own fallback applies.
const AUTO_FILL_KEYS = new Set(["first_name", "last_name"]);

export type MassEmailApplicant = {
  applicationId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type MassEmailRecipient = {
  to: string;
  // Known only for applicants pulled from the database -- an
  // additional/manual email has no row to read a name from, and no
  // application to log a send against.
  applicationId: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type MassEmailTemplateVariable = {
  key: string;
  fallbackValue: string | number | null;
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
    seen.set(email, {
      to: email,
      applicationId: applicant.applicationId,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
    });
  }
  for (const email of additionalEmails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.set(normalized, { to: normalized, applicationId: null, firstName: null, lastName: null });
  }
  return [...seen.values()];
}

function autoValueFor(recipient: MassEmailRecipient, key: string): string | null {
  if (key === "first_name") return recipient.firstName;
  if (key === "last_name") return recipient.lastName;
  return null;
}

// Builds the exact variables object to send for one recipient: a known
// applicant's first_name/last_name always wins over whatever staff typed
// for that key, a manually-added recipient (or any other key) falls back
// to the staff-provided global value, and if neither exists the key is
// omitted entirely so Resend's own template fallback_value (if the
// template defines one) applies instead of sending an empty string.
export function resolveRecipientVariables(
  recipient: MassEmailRecipient,
  templateVariables: MassEmailTemplateVariable[],
  globalValues: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const variable of templateVariables) {
    const auto = AUTO_FILL_KEYS.has(variable.key) ? autoValueFor(recipient, variable.key) : null;
    if (auto) {
      resolved[variable.key] = auto;
      continue;
    }
    const globalValue = globalValues[variable.key]?.trim();
    if (globalValue) resolved[variable.key] = globalValue;
  }
  return resolved;
}

export type VariableCoverage = {
  key: string;
  autoFillsFor: number;
  missingFor: number;
};

// For each template variable, reports how many of the given recipients
// would actually get a value (per-recipient auto-fill, a staff-provided
// global value, or the template's own fallback) versus how many would get
// nothing -- surfaced in the UI so staff know before sending whether a
// variable "will work for the user I am sending it to."
export function checkVariableCoverage(
  recipients: MassEmailRecipient[],
  templateVariables: MassEmailTemplateVariable[],
  globalValues: Record<string, string>
): VariableCoverage[] {
  return templateVariables.map((variable) => {
    const hasFallback = variable.fallbackValue !== null && variable.fallbackValue !== "";
    const globalValue = globalValues[variable.key]?.trim();
    let autoFillsFor = 0;
    let missingFor = 0;
    for (const recipient of recipients) {
      const auto = AUTO_FILL_KEYS.has(variable.key) ? autoValueFor(recipient, variable.key) : null;
      if (auto) {
        autoFillsFor++;
        continue;
      }
      if (globalValue || hasFallback) continue;
      missingFor++;
    }
    return { key: variable.key, autoFillsFor, missingFor };
  });
}

export function chunkRecipients<T>(items: T[], size = BATCH_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Resend accepts a scheduled send up to 30 days out -- validated here too
// (not just left to the API) so staff see a clear error before the round
// trip rather than a raw Resend error message.
export function isValidScheduledAt(iso: string, now: Date = new Date()): boolean {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  if (target.getTime() <= now.getTime()) return false;
  const maxMs = MASS_EMAIL_SCHEDULE_MAX_DAYS * 24 * 60 * 60 * 1000;
  return target.getTime() - now.getTime() <= maxMs;
}
