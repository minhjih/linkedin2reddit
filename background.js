const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

const getPromptForLanguage = (language) => {
  if (language === "ko") {
    return "You are a cynical user of DC Inside (Korean anonymous forum). Rewrite the following LinkedIn post into informal, cynical Korean slang (Banmal). Use endings like '음', '함', and add 'ㅋㅋ'. Keep it short.";
  }
  return "You are a cynical Redditor on r/antiwork. Rewrite the following LinkedIn corporate-speak into a sarcastic, raw, lower-case Reddit comment. Cut the fluff.";
};

const rewriteWithOpenAI = async (apiKey, prompt, text) => {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
};

const rewriteWithGemini = async (apiKey, prompt, text) => {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\n${text}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "REWRITE_TEXT") {
    return;
  }

  const { text, language } = message;

  const handleRewrite = async () => {
    const { provider, apiKey } = await chrome.storage.local.get({
      provider: "openai",
      apiKey: "",
    });

    if (!apiKey) {
      return {
        success: false,
        error: "Please set API Key in extension settings",
      };
    }

    const prompt = getPromptForLanguage(language);

    if (provider === "gemini") {
      const rewritten = await rewriteWithGemini(apiKey, prompt, text);
      return { success: true, text: rewritten };
    }

    const rewritten = await rewriteWithOpenAI(apiKey, prompt, text);
    return { success: true, text: rewritten };
  };

  handleRewrite()
    .then((result) => sendResponse(result))
    .catch((error) => {
      console.error("Rewrite failed", error);
      sendResponse({
        success: false,
        error: error.message || "Rewrite failed",
      });
    });

  return true;
});
