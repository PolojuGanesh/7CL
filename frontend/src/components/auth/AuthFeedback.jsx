function AuthFeedback({ message }) {
  if (!message) return null;

  return (
    <p className="auth-feedback" role="status">
      {message}
    </p>
  );
}

export default AuthFeedback;
