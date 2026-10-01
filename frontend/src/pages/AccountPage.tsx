import { useAuth } from "../auth/AuthContext";

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section>
      <h1>Your account</h1>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
    </section>
  );
}