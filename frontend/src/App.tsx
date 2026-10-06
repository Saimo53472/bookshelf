import { Routes, Route, Link } from "react-router";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import SearchPage from "./pages/SearchPage";
import BookPage from "./pages/BookPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import ShelfPage from "./pages/ShelfPage";

function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        Bookshelf
      </Link>
      <nav>
        {loading ? null : user ? (
          <>
            <Link to="/shelf">My shelf</Link>
            <Link to="/account">{user.username}</Link>
            <button className="link-button" onClick={() => void logout()}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/books/:olId" element={<BookPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/shelf"
            element={
              <RequireAuth>
                <ShelfPage />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </main>
    </>
  );
}