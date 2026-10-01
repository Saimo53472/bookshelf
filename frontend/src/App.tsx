import { Routes, Route, Link } from "react-router";
import SearchPage from "./pages/SearchPage";
import BookPage from "./pages/BookPage";

export default function App() {
  return (
    <>
      <header className="site-header">
        <Link to="/">Bookshelf</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/books/:olId" element={<BookPage />} />
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </main>
    </>
  );
}