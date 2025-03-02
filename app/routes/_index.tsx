import { useState } from "react";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Form } from "@remix-run/react";
import axios from "axios";

// Define types for our data structures
interface WikiArticle {
  title: string;
  extract: string;
  url: string;
  pageid: number;
}

interface SearchResult {
  title: string;
  snippet: string;
  pageid: number;
}

interface WikiData {
  currentArticle: WikiArticle;
  searchResults: SearchResult[];
}

// Wikipedia API search result type
interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
  // Other possible properties with specific types
  ns?: number;
  size?: number;
  wordcount?: number;
  timestamp?: string;
}

export const meta: MetaFunction = () => {
  return [
    { title: "Wiki Search" },
    {
      name: "description",
      content: "Search for Wikipedia pages related to your query",
    },
  ];
};

// Function to fetch Wikipedia data
async function fetchWikiData(searchTerm: string): Promise<WikiData | null> {
  if (!searchTerm) return null;

  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        format: "json",
        list: "search",
        srsearch: searchTerm,
        utf8: 1,
        origin: "*",
      },
    });

    if (response.data.query && response.data.query.search.length > 0) {
      // Get all search results
      const results = response.data.query.search as WikiSearchResult[];

      // Get the first result's content by default
      const firstResult = results[0];

      // Get the page content for the first result
      const pageResponse = await axios.get(
        "https://en.wikipedia.org/w/api.php",
        {
          params: {
            action: "query",
            format: "json",
            prop: "extracts|info|categories",
            exintro: 1,
            explaintext: 1,
            inprop: "url",
            pageids: firstResult.pageid,
            origin: "*",
          },
        }
      );

      const pageId = firstResult.pageid;
      const page = pageResponse.data.query.pages[pageId];

      return {
        currentArticle: {
          title: page.title,
          extract: page.extract,
          url: page.fullurl,
          pageid: pageId,
        },
        searchResults: results.map((result: WikiSearchResult) => ({
          title: result.title,
          snippet: result.snippet.replace(/<\/?span[^>]*>/g, ""),
          pageid: result.pageid,
        })),
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching Wikipedia data:", error);
    return null;
  }
}

// Function to fetch a specific article by page ID
export async function fetchArticleById(
  pageId: number
): Promise<WikiArticle | null> {
  try {
    const pageResponse = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        format: "json",
        prop: "extracts|info|categories",
        exintro: 1,
        explaintext: 1,
        inprop: "url",
        pageids: pageId,
        origin: "*",
      },
    });

    const page = pageResponse.data.query.pages[pageId];

    return {
      title: page.title,
      extract: page.extract,
      url: page.fullurl,
      pageid: pageId,
    };
  } catch (error) {
    console.error("Error fetching article by ID:", error);
    return null;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("q");
  const articleId = url.searchParams.get("articleId");

  // If we have an article ID, fetch that specific article
  if (articleId) {
    const article = await fetchArticleById(parseInt(articleId, 10));
    // Get the search term from the URL to maintain the search results
    if (searchTerm) {
      const wikiData = await fetchWikiData(searchTerm);
      return json({
        wikiData:
          wikiData && article
            ? {
                ...wikiData,
                currentArticle: article,
              }
            : null,
      });
    }
    return json({
      wikiData: article ? { currentArticle: article, searchResults: [] } : null,
    });
  }

  // Otherwise, perform a search
  if (!searchTerm) {
    return json({ wikiData: null });
  }

  const wikiData = await fetchWikiData(searchTerm);
  return json({ wikiData });
}

export default function Index() {
  const { wikiData } = useLoaderData<typeof loader>();
  const [inputValue, setInputValue] = useState("");
  const submit = useSubmit();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(event.currentTarget);
  };

  // Format the extract with paragraphs
  const formatExtract = (extract: string) => {
    return extract.split("\n\n").map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph}
      </p>
    ));
  };

  // Handle article selection
  const handleArticleSelect = (articleId: number) => {
    const formData = new FormData();
    formData.append("articleId", articleId.toString());
    if (inputValue) {
      formData.append("q", inputValue);
    }
    submit(formData, { method: "get" });
  };

  return (
    <div className="flex flex-col h-screen bg-wiki-bg text-black">
      {/* Wikipedia-like header */}
      <header className="bg-wiki-header border-b border-wiki-border py-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-wiki">Wiki Search</h1>
          <div className="text-sm text-wiki-link">Wikipedia Article Search</div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {wikiData ? (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Search results sidebar */}
              <div className="md:w-1/3 lg:w-1/4">
                <div className="bg-wiki-header border border-wiki-border rounded p-4 mb-4">
                  <h2 className="text-lg font-wiki mb-2 border-b border-wiki-border pb-2">
                    Search Results
                  </h2>
                  <ul className="space-y-3">
                    {wikiData.searchResults &&
                      wikiData.searchResults.map((result: SearchResult) => (
                        <li
                          key={result.pageid}
                          className="border-b border-wiki-border pb-2 last:border-0"
                        >
                          <button
                            onClick={() => handleArticleSelect(result.pageid)}
                            className={`text-left w-full ${
                              wikiData.currentArticle.pageid === result.pageid
                                ? "font-bold text-wiki-blue"
                                : "text-wiki-link"
                            } hover:underline`}
                          >
                            {result.title}
                          </button>
                          <p
                            className="text-sm text-gray-600 mt-1"
                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                          />
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Article content */}
              <div className="md:w-2/3 lg:w-3/4">
                <div className="wiki-article">
                  {/* Wikipedia-like article header */}
                  <h1 className="text-3xl font-wiki border-b border-wiki-border pb-2 mb-4">
                    {wikiData.currentArticle.title}
                  </h1>

                  {/* Wikipedia-like article content */}
                  <div className="wiki-content font-wiki-sans text-base leading-relaxed">
                    {formatExtract(wikiData.currentArticle.extract)}

                    <div className="mt-6 pt-4 border-t border-wiki-border">
                      <a
                        href={wikiData.currentArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-wiki-link hover:underline"
                      >
                        Read full article on Wikipedia
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-wiki-header border border-wiki-border rounded p-6 text-center">
              <h2 className="text-xl font-wiki mb-4">Welcome to Wiki Search</h2>
              <p className="text-gray-700">
                Enter some words in the search box below to find Wikipedia
                articles related to your query.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed search input at the bottom */}
      <footer className="bg-wiki-header border-t border-wiki-border py-4 px-4 sticky bottom-0">
        <div className="max-w-6xl mx-auto">
          <Form
            method="get"
            onSubmit={handleSubmit}
            className="flex items-center"
          >
            <input
              type="text"
              name="q"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter search terms..."
              className="flex-1 px-4 py-2 border border-wiki-border rounded-l-md focus:outline-none focus:ring-2 focus:ring-wiki-blue"
              required
            />
            <button
              type="submit"
              className="bg-wiki-blue hover:bg-blue-700 text-white px-4 py-2 rounded-r-md transition-colors"
            >
              Search
            </button>
          </Form>
        </div>
      </footer>
    </div>
  );
}
