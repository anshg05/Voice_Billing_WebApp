var CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async function(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing GEMINI_API_KEY in Netlify environment variables" })
    };
  }

  try {
    var body = JSON.parse(event.body || "{}");
    var prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Prompt is required" })
      };
    }

    var response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1
        }
      })
    });

    var data = await response.json();

    if (!response.ok || data.error) {
      throw new Error((data && data.error && data.error.message) || "Gemini request failed");
    }

    var raw = (((data || {}).candidates || [])[0] || {}).content;
    var text = raw && raw.parts && raw.parts[0] && raw.parts[0].text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    var parsedItems = JSON.parse(text.trim().replace(/```json|```/g, "").trim());

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(parsedItems)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error && error.message ? error.message : "Failed to parse with Gemini"
      })
    };
  }
};
