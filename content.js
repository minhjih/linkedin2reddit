const PROCESSED_ATTRIBUTE = "data-l2r-processed";
const POST_SELECTOR =
  ".feed-shared-update-v2, article[data-urn^='urn:li:activity'], div[data-urn^='urn:li:activity']";
let isEnabled = true;
let isLocalOnly = false;

const detectLanguage = (text) => {
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) {
    return "ko";
  }
  return "en";
};

const getPostTextElement = (root) => {
  const selectors = [
    ".feed-shared-update-v2__description .update-components-text",
    ".feed-shared-update-v2__commentary .update-components-text",
    "[data-test-id='main-feed-activity-card__commentary']",
    ".update-components-text",
    ".feed-shared-update-v2__description",
    ".feed-shared-update-v2__commentary",
  ];

  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return null;
};

const anonymizeName = (root, language) => {
  const nameElement =
    root.querySelector(".update-components-actor__name") ||
    root.querySelector(".update-components-actor__title");
  if (!nameElement) {
    return null;
  }

  const originalName = nameElement.textContent?.trim();
  if (!originalName) {
    return null;
  }

  const replacement = language === "ko" ? "ㅇㅇ(Ip address)" : "u/Throwaway";
  nameElement.textContent = replacement;

  return originalName;
};

const applyStyle = (root, language) => {
  root.classList.add("l2r-post");
  root.classList.add(language === "ko" ? "l2r-dc" : "l2r-reddit");
};

const setLoadingState = (textElement) => {
  textElement.textContent = "Loading reality filter...";
  textElement.classList.add("l2r-loading");
};

const setErrorState = (textElement, message) => {
  textElement.textContent = message;
  textElement.classList.remove("l2r-loading");
};

const replacePostText = (textElement, newText) => {
  textElement.textContent = newText;
  textElement.classList.remove("l2r-loading");
};

const localRewrite = (text, language) => {
  if (language === "ko") {
    return `ㅋㅋ ${text}`
      .replace(/성장|도전|기회/g, "헛소리")
      .replace(/감사|고맙/g, "뭐함")
      .slice(0, 180);
  }

  return text
    .toLowerCase()
    .replace(/(thrilled|excited|honored|proud)/g, "lol")
    .replace(/(announce|announcement)/g, "posting")
    .replace(/(opportunity|journey|mission)/g, "job")
    .slice(0, 220);
};

const rewritePost = async (post) => {
  if (!isEnabled) {
    return;
  }

  if (post.getAttribute(PROCESSED_ATTRIBUTE)) {
    return;
  }

  const textElement = getPostTextElement(post);
  if (!textElement) {
    return;
  }

  const originalText = textElement.innerText?.trim();
  if (!originalText) {
    return;
  }

  post.setAttribute(PROCESSED_ATTRIBUTE, "true");

  const language = detectLanguage(originalText);
  const originalName = anonymizeName(post, language);
  const sanitizedText = originalName
    ? originalText.replaceAll(originalName, language === "ko" ? "ㅇㅇ" : "u/Throwaway")
    : originalText;

  applyStyle(post, language);
  setLoadingState(textElement);

  try {
    if (isLocalOnly) {
      replacePostText(textElement, localRewrite(sanitizedText, language));
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "REWRITE_TEXT",
      text: sanitizedText,
      language,
    });

    if (!response?.success) {
      const errorMessage = response?.error || "Rewrite failed";
      setErrorState(textElement, errorMessage);
      return;
    }

    replacePostText(textElement, response.text || sanitizedText);
  } catch (error) {
    console.error("Rewrite error", error);
    replacePostText(textElement, localRewrite(sanitizedText, language));
  }
};

const observeFeed = () => {
  chrome.storage.local
    .get({ enabled: true, localOnly: false })
    .then(({ enabled, localOnly }) => {
      isEnabled = enabled;
      isLocalOnly = localOnly;
    });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.enabled) {
      isEnabled = changes.enabled.newValue;
    }

    if (changes.localOnly) {
      isLocalOnly = changes.localOnly.newValue;
    }
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        if (node.matches?.(POST_SELECTOR)) {
          rewritePost(node);
        } else {
          node
            .querySelectorAll?.(POST_SELECTOR)
            .forEach((post) => rewritePost(post));
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document.querySelectorAll(POST_SELECTOR).forEach((post) => rewritePost(post));
};

const start = () => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeFeed, {
      once: true,
    });
  } else {
    observeFeed();
  }
};

start();
