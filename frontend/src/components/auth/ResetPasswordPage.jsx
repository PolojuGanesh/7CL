import { useState } from "react";
import { ApiError, apiRequest } from "../../api.js";
import AuthFeedback from "./AuthFeedback.jsx";
import AuthLayout from "./AuthLayout.jsx";

function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    try {
      if (resetToken) {
        if (form.elements.password.value !== form.elements.confirmPassword.value) {
          setMessage("The passwords do not match. Check both fields and try again.");
          return;
        }
        const result = await apiRequest("/auth/reset-password", {
          method: "POST",
          body: { token: resetToken, password: form.elements.password.value },
        });
        setMessage(`${result.message} You can now log in.`);
        setResetToken("");
        window.history.replaceState({}, "", "/reset-password");
      } else {
        const result = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: { email: form.elements.email.value },
        });
        if (result.developmentResetToken) {
          setResetToken(result.developmentResetToken);
          window.history.replaceState({}, "", `/reset-password?token=${encodeURIComponent(result.developmentResetToken)}`);
          setMessage(`${result.message} Enter a new password below.`);
        } else {
          setMessage(result.message);
        }
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not connect to 7CL. Check that the API server is running.");
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      description={resetToken ? "Choose a new password for your 7CL account." : "Enter your account email to continue with password recovery. Recovery is available in development only."}
      variant="reset"
      footer={<>Remembered your password? <a href="/login">Back to log in</a></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {!resetToken && <label className="auth-field">
          <span>Email address</span>
          <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
        </label>}
        {resetToken && <>
          <label className="auth-field">
            <span>New password</span>
            <input type="password" name="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
          </label>
          <label className="auth-field">
            <span>Confirm new password</span>
            <input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} placeholder="Enter the new password again" required />
          </label>
        </>}
        <button className="button button-gold auth-submit" type="submit">{resetToken ? "Update password" : "Continue"} <span aria-hidden="true">→</span></button>
        <AuthFeedback message={message} />
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
