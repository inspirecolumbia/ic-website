import { applicationStatusLabel, type ApplicationListRow } from "@/lib/applications";
import { formatDateTime } from "@/lib/history";

export type ApplicationExportRow = {
  name: string;
  email: string;
  phone: string;
  school: string;
  schoolEmail: string;
  major: string;
  yearOfStudy: string;
  gpa: string;
  jobTitle: string;
  status: string;
  submittedAt: string;
  screeningAnswers: string;
};

// One joined "Screening Answers" text column rather than per-question
// columns -- different jobs can have different screening questions, so a
// fixed column set would break across jobs.
export function applicationsToExportRows(
  apps: ApplicationListRow[],
  screeningByApp: Map<string, { question: string; answer: string }[]>
): ApplicationExportRow[] {
  return apps.map((app) => {
    const answers = screeningByApp.get(app.id) ?? [];
    return {
      name: `${app.firstName} ${app.lastName}`,
      email: app.email,
      phone: app.phone ?? "",
      school: app.school ?? "",
      schoolEmail: app.schoolEmail ?? "",
      major: app.major ?? "",
      yearOfStudy: app.yearOfStudy ?? "",
      gpa: app.gpa != null ? String(app.gpa) : "",
      jobTitle: app.jobTitle,
      status: applicationStatusLabel(app.status),
      submittedAt: formatDateTime(app.createdAt),
      screeningAnswers: answers.map((a) => `${a.question}: ${a.answer}`).join("\n"),
    };
  });
}
