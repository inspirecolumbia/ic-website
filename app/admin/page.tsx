import { auth } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";

export default async function AdminPage() {
  await auth.protect();
  const { sessionClaims } = await auth();
  const role = sessionClaims?.user_role as string | undefined;

  if (!role || !["member", "staff", "admin"].includes(role)) {
    return <p>Your account doesn&apos;t have a role assigned yet. Contact an admin.</p>;
  }

  const supabase = createClerkSupabaseClient();
  const { data: jobs } = await supabase.from("jobs").select("*").order("display_order");

  return (
    <div>
      <p>Signed in as {role}</p>
      <pre>{JSON.stringify(jobs, null, 2)}</pre>
    </div>
  );
}
