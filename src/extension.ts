// src/extension.ts
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // Register the command
  let disposable = vscode.commands.registerCommand(
    "split-view.openPreview",
    async () => {
      // Get the last visited URL from storage, or use default
      const defaultUrl = "https://example.com";
      const lastVisitedUrl =
        context.globalState.get<string>("lastVisitedUrl") || defaultUrl;

      const panel = vscode.window.createWebviewPanel(
        "splitView",
        `SplitView: ${lastVisitedUrl}`,
        vscode.ViewColumn.Beside, // Opens in split view
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      // Set the HTML content of the webview with the last visited URL
      updateWebviewContent(panel, lastVisitedUrl);

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case "alert":
              vscode.window.showErrorMessage(message.text);
              return;
            case "updateTitle":
              panel.title = `SplitView: ${message.url}`;
              return;
            case "urlChanged":
              // Save the new URL to storage
              context.globalState.update("lastVisitedUrl", message.url);
              return;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(disposable);
}

function updateWebviewContent(panel: vscode.WebviewPanel, url: string): void {
  panel.webview.html = getWebviewContent(url);
}

function getWebviewContent(url: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    
    <style>
      body,
      html {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      }

      .browser-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
      }

      .browser-toolbar {
        display: flex;
        padding: 8px;
        background-color: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .browser-searchbar {
        flex: 1;
        height: 28px;
        padding: 0 8px;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border);
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        margin-right: 8px;
      }

      .browser-button {
        width: 30px;
        height: 30px;
        border: none;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .browser-button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .browser-content {
        flex: 1;
        width: 100%;
        position: relative;
      }

      iframe {
        height: 100%;
        width: 100%;
        border: none;
      }

      .spinner {
        display: block;
        position: fixed;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 24px;
        border: 3px solid #346eeb;
        border-radius: 50%;
        border-top-color: #ffffff;
        animation: spin 1s ease-in-out infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Error Modal Styles */
      .error-modal {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      }

      .modal {
        background-color: var(--vscode-editor-background);
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border);
        width: 400px;
        max-width: 80%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        animation: fadeIn 0.2s ease-out;
      }

      .modal-header {
        background-color: var(
          --vscode-inputValidation-errorBackground,
          #ff3333
        );
        color: var(--vscode-inputValidation-errorForeground, #ffffff);
        padding: 12px;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: normal;
      }

      .close-button {
        background: none;
        border: none;
        font-size: 18px;
        color: var(--vscode-inputValidation-errorForeground, #ffffff);
        cursor: pointer;
      }

      .modal-body {
        padding: 16px;
        color: var(--vscode-foreground);
        line-height: 1.5;
      }

      .modal-footer {
        padding: 12px;
        border-top: 1px solid var(--vscode-panel-border);
        text-align: right;
      }

      .error-icon {
        margin-right: 8px;
      }

      .retry-btn {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .retry-btn:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <div class="browser-container">
      <div id="spinner" class="spinner"></div>
      <div class="browser-toolbar">
        <button id="refresh-button" class="browser-button" title="Refresh">
          ↻
        </button>
        <input
          type="text"
          id="url-input"
          class="browser-searchbar"
          value="${url}"
          placeholder="Enter URL (e.g., https://example.com)"
        />
        <button id="go-button" class="browser-button" title="Go">→</button>
      </div>
      <div class="browser-content">
        <!-- Error Modal - Rarely Useful -->
        <div id="error-modal" class="error-modal">
          <div class="modal">
            <div class="modal-header">
              <h3><span class="error-icon">⚠️</span> Error</h3>
              <button class="close-button" id="error-modal-close-btn">×</button>
            </div>
            <div class="modal-body">
              <p id="error-message">
                An unexpected error occurred while loading the page.
              </p>
            </div>
            <div class="modal-footer">
              <button id="retry-btn" class="retry-btn">Retry</button>
            </div>
          </div>
        </div>
        <iframe
          id="content-frame"
          src="${url}"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      const urlInput = document.getElementById("url-input");
      const refreshButton = document.getElementById("refresh-button");
      const goButton = document.getElementById("go-button");
      const spinner = document.getElementById("spinner");
      const contentFrame = document.getElementById("content-frame");
      const errorModal = document.getElementById("error-modal");
      const errorMessage = document.getElementById("error-message");
      const errorCloseBtn = document.getElementById("error-modal-close-btn");
      const retryBtn = document.getElementById("retry-btn");

      let currentUrl = "${url}";

      // Function to show error modal
      function showError(message) {
        errorMessage.textContent =
          message || "An unexpected error occurred while loading the page.";
        errorModal.style.display = "flex";
        spinner.style.display = "none";

        // Notify VSCode about the error
        vscode.postMessage({
          command: "error",
          message: message,
          url: currentUrl,
        });
      }

      // Function to hide error modal
      function hideError() {
        errorModal.style.display = "none";
      }

      // Function to load URL
      function loadUrl(url) {
        showLoading();
        hideError();

        try {
          // Validate URL
          new URL(url);

          // Add https:// if protocol is missing
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
            urlInput.value = url;
          }

          currentUrl = url;

          // Update iframe src
          contentFrame.src = url;

          // Update title
          vscode.postMessage({
            command: "updateTitle",
            url: url,
          });

          // Save the URL
          vscode.postMessage({
            command: "urlChanged",
            url: url,
          });
        } catch (e) {
          showError("Please enter a valid URL (e.g., https://example.com)");
        }
      }

      // Function to show loading spinner
      function showLoading() {
        spinner.style.display = "block";
      }

      // Hide loading spinner when iframe is loaded
      contentFrame.addEventListener("load", function (e) {
        spinner.style.display = "none";
      });

      // Handle iframe loading errors
      contentFrame.addEventListener("error", function (e) {
        showError(
          "Failed to load the page. The website might be unavailable or the connection was refused."
        );
      });

      // Go button click
      goButton.addEventListener("click", () => {
        loadUrl(urlInput.value);
      });

      // Refresh button click
      refreshButton.addEventListener("click", () => {
        loadUrl(contentFrame.src);
      });

      // Enter key in search bar
      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          loadUrl(urlInput.value);
        }
      });

      // Error modal close button
      errorCloseBtn.addEventListener("click", hideError);

      // Retry button
      retryBtn.addEventListener("click", () => {
        hideError();
        loadUrl(currentUrl);
      });

      // Handle window resize
      window.addEventListener("resize", function () {
        vscode.postMessage({
          command: "resize",
          width: document.body.clientWidth,
          height: document.body.clientHeight,
        });
      });

      // Handle messages from VSCode extension
      window.addEventListener("message", (event) => {
        const message = event.data;

        if (message.command === "showError") {
          showError(message.message);
        }
      });
    </script>
  </body>
</html>
`;
}

export function deactivate() {}
