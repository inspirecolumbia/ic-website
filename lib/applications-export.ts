import { applicationStatusLabel, type ApplicationListRow } from "@/lib/applications";
import { formatDateTime } from "@/lib/history";
import { SCREENING_QUESTIONS } from "@/lib/screening";

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
  livesNearColumbia: string;
  authorizedToWork: string;
  needsVisaSponsorship: string;
  interestInJoining: string;
};

function findAnswer(answers: { question: string; answer: string }[], questionText: string): string {
  return answers.find((a) => a.question === questionText)?.answer ?? "";
}

// One column per screening question, not a single joined text blob --
// screening questions are a fixed, global set (see SCREENING_QUESTIONS in
// lib/screening.ts, "no per-job configuration exists or is planned"), so
// there's no risk of the column set breaking across jobs the way a
// per-job template would introduce. If that ever changes (branch 20's
// template builder), this needs revisiting.
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
      livesNearColumbia: findAnswer(answers, SCREENING_QUESTIONS.livesNearColumbia.question),
      authorizedToWork: findAnswer(answers, SCREENING_QUESTIONS.authorizedToWork.question),
      needsVisaSponsorship: findAnswer(answers, SCREENING_QUESTIONS.needsVisaSponsorship.question),
      interestInJoining: findAnswer(answers, SCREENING_QUESTIONS.whatAppeals.question),
    };
  });
}
