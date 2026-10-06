import { useState } from "react";
import { useAuth } from "../../contexts/useAuth.js";
import { ApiError } from "../../api.js";
import AuthFeedback from "./AuthFeedback.jsx";
import AuthLayout from "./AuthLayout.jsx";

function RegisterPage() {
  const [message, setMessage] = useState("");
  const { register } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("The passwords do not match. Check both fields and try again.");
      return;
    }

    try {
      await register({
        name: form.elements.name.value,
        email: form.elements.email.value,
        password,
      });
      window.location.assign("/overview");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not connect to 7CL. Check that the API server is running.");
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Join the league and start building your dream team."
      variant="register"
      footer={<>Already have an account? <a href="/login">Log in</a></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Full name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            minLength={2}
            required
          />
        </label>
        <label className="auth-field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Enter your password again"
            minLength={8}
            required
          />
        </label>
        <button className="button button-gold auth-submit" type="submit">Create account <span aria-hidden="true">→</span></button>
        <AuthFeedback message={message} />
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
