const PROCESSED_ATTRIBUTE = "data-l2r-processed";
let isEnabled = true;

const detectLanguage = (text) => {
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) {
    return "ko";
  }
  return "en";
};

const getPostTextElement = (root) => {
  return (
    root.querySelector(".feed-shared-update-v2__description .update-components-text") ||
    root.querySelector(".feed-shared-update-v2__commentary .update-components-text") ||
    root.querySelector(".update-components-text") ||
    root.querySelector(".feed-shared-update-v2__description") ||
    root.querySelector(".feed-shared-update-v2__commentary")
  );
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
    setErrorState(textElement, "Please set API Key in extension settings");
  }
};

const observeFeed = () => {
  chrome.storage.local.get({ enabled: true }).then(({ enabled }) => {
    isEnabled = enabled;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.enabled) {
      isEnabled = changes.enabled.newValue;
    }
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        if (node.matches?.(".feed-shared-update-v2")) {
          rewritePost(node);
        } else {
          node
            .querySelectorAll?.(".feed-shared-update-v2")
            .forEach((post) => rewritePost(post));
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document
    .querySelectorAll(".feed-shared-update-v2")
    .forEach((post) => rewritePost(post));
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
