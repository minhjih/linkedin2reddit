# Privacy Policy

**Linkedin2Reddit** is a client-side Chrome extension that rewrites LinkedIn post text using a user-selected LLM provider. We are committed to protecting your privacy. This policy explains what data is handled and how.

## Data We Handle
- **User-provided API key**: Stored locally in `chrome.storage.local` on your device. It is never sent to any server other than the selected LLM provider for authentication.
- **LinkedIn post text**: Sent to the selected LLM provider (OpenAI or Google Gemini) solely to generate a rewritten version.
- **Provider selection**: Stored locally in `chrome.storage.local`.

## Data We Do NOT Collect
- We do not collect or store any personal data on external servers.
- We do not track your browsing history.
- We do not sell or share data with third parties.

## Third-Party Services
The extension may send LinkedIn post text to the following providers based on your selection:
- **OpenAI** (`https://api.openai.com/`)
- **Google Gemini** (`https://generativelanguage.googleapis.com/`)

Please review their respective privacy policies for how they handle data.

## Data Security
All data is processed locally in your browser, except the text sent to the selected LLM API for rewriting. Your API key remains stored locally in your browser profile.

## Changes to This Policy
We may update this policy if the extension behavior changes. The latest version will always be available in this repository.

## Contact
If you have questions, please open an issue in this GitHub repository.
