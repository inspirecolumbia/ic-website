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
