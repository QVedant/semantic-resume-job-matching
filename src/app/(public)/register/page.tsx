import AuthLayout from "@/components/AuthLayout";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your"
      accent="account"
      subtitle="Students and recruiters can sign up here. Placement officer accounts are created by the college."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
