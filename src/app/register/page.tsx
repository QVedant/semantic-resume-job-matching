import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Create an account</h1>
      <p className="mb-8 opacity-70">
        Students and recruiters can sign up here. Placement officer accounts are created by the
        college.
      </p>
      <RegisterForm />
    </main>
  );
}
