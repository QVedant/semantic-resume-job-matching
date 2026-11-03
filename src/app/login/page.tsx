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
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mb-8 opacity-70">Students, recruiters and placement officers all log in here.</p>
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
