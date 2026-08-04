import { redirect } from "next/navigation";

/**
 * Login page — redirects straight to the app.
 * No login required for personal single-user deployment.
 */
export default function LoginPage() {
  redirect("/");
}
