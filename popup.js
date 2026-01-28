const providerSelect = document.getElementById("provider");
const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");
const enabledToggle = document.getElementById("enabled");
const localOnlyToggle = document.getElementById("localOnly");

const showStatus = (message, type) => {
  status.textContent = message;
  status.className = `status ${type}`;
};

const loadSettings = async () => {
  const { provider, apiKey, enabled, localOnly } = await chrome.storage.local.get({
    provider: "openai",
    apiKey: "",
    enabled: true,
    localOnly: false,
  });
  providerSelect.value = provider;
  apiKeyInput.value = apiKey;
  enabledToggle.checked = enabled;
  localOnlyToggle.checked = localOnly;
};

const saveSettings = async () => {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const enabled = enabledToggle.checked;
  const localOnly = localOnlyToggle.checked;

  if (!apiKey && !localOnly) {
    showStatus("API key is required.", "error");
    return;
  }

  saveButton.disabled = true;
  try {
    await chrome.storage.local.set({ provider, apiKey, enabled, localOnly });
    showStatus("Saved!", "success");
  } catch (error) {
    console.error("Failed to save settings", error);
    showStatus("Error saving settings.", "error");
  } finally {
    saveButton.disabled = false;
  }
};

saveButton.addEventListener("click", saveSettings);

loadSettings().catch((error) => {
  console.error("Failed to load settings", error);
  showStatus("Error loading settings.", "error");
});
