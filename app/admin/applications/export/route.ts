import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import ExcelJS from "exceljs";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { applicationRowToApplication, type ApplicationListRow } from "@/lib/applications";
import { applicationsToExportRows } from "@/lib/applications-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPLICATIONS_FETCH_CAP = 100;

const COLUMNS: { key: keyof ReturnType<typeof applicationsToExportRows>[number]; header: string; width: number }[] = [
  { key: "name", header: "Name", width: 24 },
  { key: "email", header: "Email", width: 28 },
  { key: "phone", header: "Phone", width: 16 },
  { key: "school", header: "School", width: 32 },
  { key: "schoolEmail", header: "School email", width: 28 },
  { key: "major", header: "Major", width: 24 },
  { key: "yearOfStudy", header: "Year of study", width: 16 },
  { key: "gpa", header: "GPA", width: 8 },
  { key: "jobTitle", header: "Job", width: 24 },
  { key: "status", header: "Status", width: 16 },
  { key: "submittedAt", header: "Submitted", width: 20 },
  { key: "screeningAnswers", header: "Screening Answers", width: 60 },
];

export async function GET(request: NextRequest) {
  // Route Handlers don't run through app/admin/layout.tsx's auth.protect(),
  // so unlike everything under app/admin/**/page.tsx, this check is not
  // optional here -- confirmed by reading proxy.ts, which is bare
  // clerkMiddleware() with no route protection of its own.
  await auth.protect();
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;
  if (role !== "staff" && role !== "admin") {
    return NextResponse.json({ error: "Only staff and admins can export applications." }, { status: 403 });
  }

  const jobId = request.nextUrl.searchParams.get("job");

  const supabase = createClerkSupabaseClient();
  let applicationsQuery = supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(APPLICATIONS_FETCH_CAP);
  if (jobId) applicationsQuery = applicationsQuery.eq("job_id", jobId);

  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase.from("jobs").select("id, title"),
    applicationsQuery,
  ]);

  const jobTitles = new Map((jobs ?? []).map((job) => [job.id, job.title]));
  const rows: ApplicationListRow[] = (applications ?? []).map((row) => ({
    ...applicationRowToApplication(row),
    jobTitle: jobTitles.get(row.job_id) ?? "Deleted job",
  }));

  const applicationIds = rows.map((row) => row.id);
  const { data: screeningAnswers } = applicationIds.length
    ? await supabase
        .from("application_screening_answers")
        .select("application_id, question, answer")
        .in("application_id", applicationIds)
    : { data: [] };

  const screeningByApp = new Map<string, { question: string; answer: string }[]>();
  for (const answer of screeningAnswers ?? []) {
    const existing = screeningByApp.get(answer.application_id) ?? [];
    existing.push({ question: answer.question, answer: answer.answer });
    screeningByApp.set(answer.application_id, existing);
  }

  const exportRows = applicationsToExportRows(rows, screeningByApp);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Applications");
  sheet.columns = COLUMNS.map(({ key, header, width }) => ({ key, header, width }));
  sheet.addRows(exportRows);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  const filenameJobPart = jobId
    ? `-${(jobTitles.get(jobId) ?? "job").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "";
  const filename = `applications${filenameJobPart}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
