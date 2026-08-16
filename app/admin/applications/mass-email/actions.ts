"use server";

import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import type { Database } from "@/lib/database.types";
import {
  getEmailTemplateVariables,
  listPublishedEmailTemplates,
  sendBatchTemplateEmails,
  type EmailTemplateSummary,
  type EmailTemplateVariable,
} from "@/lib/email/send";
import {
  buildMassEmailRecipients,
  chunkRecipients,
  MASS_EMAIL_RECIPIENT_CAP,
  parseAdditionalEmails,
  resolveRecipientVariables,
  type MassEmailApplicant,
} from "@/lib/mass-email";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

async function requireStaffOrAdmin(): Promise<string | { error: string }> {
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") return { error: "Not authorized." };
  return role;
}

export async function listMassEmailTemplates(): Promise<{ templates: EmailTemplateSummary[] } | { error: string }> {
  const role = await requireStaffOrAdmin();
  if (typeof role !== "string") return role;

  try {
    return { templates: await listPublishedEmailTemplates() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load templates." };
  }
}

export async function getMassEmailTemplateVariables(
  templateId: string
): Promise<{ variables: EmailTemplateVariable[] } | { error: string }> {
  const role = await requireStaffOrAdmin();
  if (typeof role !== "string") return role;

  try {
    return { variables: await getEmailTemplateVariables(templateId) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to load template variables." };
  }
}

type RecipientFilter = {
  status: ApplicationStatus;
  jobId: string | null;
  additionalEmailsRaw: string;
};

async function resolveApplicantRecipients(
  filter: RecipientFilter
): Promise<{ applicants: MassEmailApplicant[]; additionalEmails: string[]; invalidEmails: string[] }> {
  const supabase = createClerkSupabaseClient();
  let query = supabase
    .from("applications")
    .select("email, first_name, last_name")
    .eq("status", filter.status);
  if (filter.jobId) query = query.eq("job_id", filter.jobId);

  const { data } = await query;
  const applicants: MassEmailApplicant[] = (data ?? []).map((row) => ({
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
  }));

  const { emails: additionalEmails, invalid: invalidEmails } = parseAdditionalEmails(filter.additionalEmailsRaw);
  return { applicants, additionalEmails, invalidEmails };
}

export async function previewMassEmailRecipients(
  filter: RecipientFilter
): Promise<{ count: number; invalidEmails: string[] } | { error: string }> {
  const role = await requireStaffOrAdmin();
  if (typeof role !== "string") return role;

  const { applicants, additionalEmails, invalidEmails } = await resolveApplicantRecipients(filter);
  const recipients = buildMassEmailRecipients(applicants, additionalEmails);
  return { count: recipients.length, invalidEmails };
}

export type SendMassEmailInput = RecipientFilter & {
  templateId: string;
  variables: Record<string, string>;
};

export type SendMassEmailResult = {
  sentCount: number;
  failedCount: number;
  invalidEmails: string[];
};

export async function sendMassEmail(
  input: SendMassEmailInput
): Promise<SendMassEmailResult | { error: string }> {
  const role = await requireStaffOrAdmin();
  if (typeof role !== "string") return role;

  const { applicants, additionalEmails, invalidEmails } = await resolveApplicantRecipients(input);
  const recipients = buildMassEmailRecipients(applicants, additionalEmails);

  if (recipients.length === 0) return { error: "No recipients matched this filter." };
  if (recipients.length > MASS_EMAIL_RECIPIENT_CAP) {
    return { error: `This would email ${recipients.length} people, above the ${MASS_EMAIL_RECIPIENT_CAP} cap for a single send. Narrow the filter.` };
  }

  const items = recipients.map((recipient) => ({
    to: recipient.to,
    templateId: input.templateId,
    variables: resolveRecipientVariables(recipient, input.variables),
  }));

  let sentCount = 0;
  let failedCount = 0;
  for (const chunk of chunkRecipients(items)) {
    try {
      const result = await sendBatchTemplateEmails(chunk);
      sentCount += result.sentCount;
      failedCount += result.failed.length;
    } catch {
      // A whole chunk failing (e.g. Resend outage) still leaves any
      // earlier chunks sent -- reported as failures for this chunk rather
      // than aborting and losing the count of what already went out.
      failedCount += chunk.length;
    }
  }

  return { sentCount, failedCount, invalidEmails };
}
