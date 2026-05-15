import { useEffect, useState } from "react";
import "./App.css";

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL;

function App() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${STRAPI_URL}/api/articles?populate=cover`)
      .then((res) => {
        if (!res.ok) throw new Error(`Strapi responded ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setArticles(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  return (
    <main>
      <h1>Course Notes</h1>
      {articles.map((article) => (
        <article key={article.documentId}>
          <h2>{article.title}</h2>
          <p>
            <em>{article.excerpt}</em>
          </p>
          <p>{article.body}</p>
          {article.cover && (
            <img
              src={`${STRAPI_URL}${article.cover.url}`}
              alt={article.title}
              style={{ maxWidth: "100%" }}
            />
          )}
        </article>
      ))}
    </main>
  );
}

export default App;
