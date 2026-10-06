import { useState } from "react";
import { useAuth } from "../../contexts/useAuth.js";
import { ApiError } from "../../api.js";
import AuthFeedback from "./AuthFeedback.jsx";
import AuthLayout from "./AuthLayout.jsx";

function LoginPage() {
  const [message, setMessage] = useState("");
  const { login } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("");
    try {
      await login({ email: form.get("email"), password: form.get("password") });
      window.location.assign("/overview");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not connect to 7CL. Check that the API server is running.");
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to your account and get back in the game."
      variant="login"
      footer={<>New to the league? <a href="/register">Create an account</a></>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </label>
        <button className="button button-gold auth-submit" type="submit">Log in <span aria-hidden="true">→</span></button>
        <AuthFeedback message={message} />
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
