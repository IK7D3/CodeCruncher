chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download-json") {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || "quera_problem.json",
      saveAs: false
    });
  }
});
