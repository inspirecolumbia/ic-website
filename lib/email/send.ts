import { Resend } from "resend";

export type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// Lazily constructed so importing this module never requires
// RESEND_API_KEY to be set (e.g. during a build or a unit test run that
// never actually calls sendEmail).
let client: Resend | null = null;
function getClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

// Every caller wraps this in a try/catch and swallows failures -- a Resend
// outage must never turn a successful application submission or status
// update into a user-facing error, same reasoning as the orphaned-upload
// handling elsewhere in this codebase. This function itself stays honest
// about failures (it throws), the swallowing is the caller's job.
export async function sendEmail(input: EmailInput): Promise<void> {
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!from) throw new Error("RESEND_FROM_ADDRESS is not configured.");

  const { error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (error) throw new Error(error.message);
}

export type EmailTemplateSummary = { id: string; name: string; alias: string | null };

// Only published templates are offered to staff -- a draft has no live
// content to send. Resend's list endpoint caps at 100 per page; this
// project has a small, hand-curated set of templates, so a single page is
// assumed sufficient rather than paginating.
export async function listPublishedEmailTemplates(): Promise<EmailTemplateSummary[]> {
  const { data, error } = await getClient().templates.list({ limit: 100 });
  if (error) throw new Error(error.message);
  return (data?.data ?? [])
    .filter((template) => template.status === "published")
    .map((template) => ({ id: template.id, name: template.name, alias: template.alias }));
}

export type EmailTemplateVariable = {
  key: string;
  type: "string" | "number";
  fallbackValue: string | number | null;
};

export async function getEmailTemplateVariables(templateId: string): Promise<EmailTemplateVariable[]> {
  const { data, error } = await getClient().templates.get(templateId);
  if (error) throw new Error(error.message);
  return (data?.variables ?? []).map((variable) => ({
    key: variable.key,
    type: variable.type,
    fallbackValue: variable.fallback_value,
  }));
}

export type BatchTemplateEmailInput = {
  to: string;
  templateId: string;
  variables: Record<string, string | number>;
};

export type BatchSendResult = {
  sentCount: number;
  failed: { index: number; error: string }[];
};

// Resend's batch endpoint caps at 100 emails per request (see
// lib/mass-email.ts's chunking) and rejects a mix of `template` with
// `html`/`text` per item, same constraint as sendTemplateEmail above.
// `batchValidation: "permissive"` is what makes one bad recipient not fail
// every other email in the same chunk -- without it, Resend's documented
// behavior is "if any email within the payload is invalid, the entire
// request fails."
export async function sendBatchTemplateEmails(items: BatchTemplateEmailInput[]): Promise<BatchSendResult> {
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!from) throw new Error("RESEND_FROM_ADDRESS is not configured.");
  if (items.length === 0) return { sentCount: 0, failed: [] };

  const { data, error } = await getClient().batch.send<{ batchValidation: "permissive" }>(
    items.map((item) => ({
      from,
      to: item.to,
      template: { id: item.templateId, variables: item.variables },
    })),
    { batchValidation: "permissive" }
  );
  if (error) throw new Error(error.message);

  const failed = (data?.errors ?? []).map((entry) => ({ index: entry.index, error: entry.message }));
  return { sentCount: items.length - failed.length, failed };
}

export type TemplateEmailInput = {
  to: string;
  templateId: string;
  variables: Record<string, string | number>;
};

// For emails sent via a template built at resend.com/templates instead of
// inline HTML/text -- the send-email API rejects a payload that mixes
// `template` with `html`/`text`/`react`, so this is a separate call rather
// than an extra field on sendEmail's input.
export async function sendTemplateEmail(input: TemplateEmailInput): Promise<void> {
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!from) throw new Error("RESEND_FROM_ADDRESS is not configured.");

  const { error } = await getClient().emails.send({
    from,
    to: input.to,
    template: {
      id: input.templateId,
      variables: input.variables,
    },
  });

  if (error) throw new Error(error.message);
}
