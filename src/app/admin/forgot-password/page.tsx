import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/admin/auth-shell";
import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter the email you sign in with and we'll send you a link to choose a new password."
      footer={
        <Link href="/admin/login" className="text-charcoal underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
