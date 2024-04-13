console.log('Start service-worker.js');

chrome.runtime.onConnect.addListener((port) => {
  console.debug(`onConnect: port ${JSON.stringify(port)}`);

  port.onMessage.addListener(async (message/* , sender, sendResponse */) => {
    const storageValue = await chrome.storage.local.get(['urlsInCurrentTab']);
    const urls = (storageValue).urlsInCurrentTab || [];
    await chrome.storage.local.set({ urlsInCurrentTab: [...urls, message] });

  });
  port.onDisconnect.addListener((port) => {
  });
  port.postMessage({ 'type': 'connected', tab: port.sender.tab });
});
