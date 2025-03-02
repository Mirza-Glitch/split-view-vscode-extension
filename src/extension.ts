import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // Register the command
  let disposable = vscode.commands.registerCommand(
    "split-view.openPreview",
    async () => {
      // Create and show the webview panel with default URL
      const defaultUrl = "https://example.com";
      const url = new URL(defaultUrl);

      const panel = vscode.window.createWebviewPanel(
        "splitView",
        `SplitView: ${url.host}`,
        vscode.ViewColumn.Beside, // Opens in split view
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      // Set the HTML content of the webview with the default URL
      updateWebviewContent(panel, defaultUrl);

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
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SplitView</title>
    <style>
      body, html {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
      }
      
      iframe {
        height: 100%;
        width: 100%;
        border: none;
      }
    </style>
  </head>
  <body>
    <div class="browser-container">
      <div class="browser-toolbar">
        <button id="refresh-button" class="browser-button" title="Refresh">↻</button>
        <input type="text" id="url-input" class="browser-searchbar" value="${url}" placeholder="Enter URL (e.g., https://example.com)">
        <button id="go-button" class="browser-button" title="Go">→</button>
      </div>
      <div class="browser-content">
        <iframe id="content-frame" src="${url}" sandbox="allow-scripts allow-same-origin allow-forms" allow="autoplay; encrypted-media"></iframe>
      </div>
    </div>
    
    <script>
      const vscode = acquireVsCodeApi();
      const urlInput = document.getElementById('url-input');
      const refreshButton = document.getElementById('refresh-button');
      const goButton = document.getElementById('go-button');
      const contentFrame = document.getElementById('content-frame');
      
      // Function to load URL
      function loadUrl(url) {
        try {
          // Validate URL
          new URL(url);
          
          // Add https:// if protocol is missing
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            urlInput.value = url;
          }
          
          // Update iframe src
          contentFrame.src = url;
          
          // Update title
          vscode.postMessage({
            command: 'updateTitle',
            url: url
          });
          
        } catch (e) {
          vscode.postMessage({
            command: 'alert',
            text: 'Please enter a valid URL (e.g., https://example.com)'
          });
        }
      }
      
      // Go button click
      goButton.addEventListener('click', () => {
        loadUrl(urlInput.value);
      });
      
      // Refresh button click
      refreshButton.addEventListener('click', () => {
        contentFrame.src = contentFrame.src;
      });
      
      // Enter key in search bar
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          loadUrl(urlInput.value);
        }
      });
      
      // Handle iframe load errors
      contentFrame.onerror = function() {
        vscode.postMessage({
          command: 'alert',
          text: 'Failed to load the webpage. Check the URL and try again.'
        });
      };
      
      // Handle window resize
      window.addEventListener('resize', function() {
        vscode.postMessage({
          command: 'resize',
          width: document.body.clientWidth,
          height: document.body.clientHeight
        });
      });
    </script>
  </body>
  </html>`;
}

export function deactivate() {}
