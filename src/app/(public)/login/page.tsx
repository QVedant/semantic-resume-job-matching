import AuthLayout from "@/components/AuthLayout";
import LoginForm from "@/components/LoginForm";

type Props = { searchParams: Promise<{ next?: string }> };

// Only allow redirects back to a page on THIS site ("/student/..."). A link
// like /login?next=https://evil.example must not send users elsewhere
// after they log in (an "open redirect").
function safeNext(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <AuthLayout title="Welcome" accent="back" subtitle="Students, recruiters and placement officers all log in here.">
      <LoginForm next={safeNext(next)} />
    </AuthLayout>
  );
}
