console.log('Start service-worker.js');

const escapeRegExp = (str) => {
  return str.replace(/([\(\)\{\}\+\*\?\[\]\.\^\$\|\\\/])/g, '\\$1');
};

chrome.runtime.onConnect.addListener((port) => {
  console.debug(`onConnect: port ${JSON.stringify(port)}`);

  port.onMessage.addListener(async (message/* , sender, sendResponse */) => {
    console.log(message);
    const storageValue = await chrome.storage.local.get(['urlsInCurrentTab']);
    const urls = (storageValue).urlsInCurrentTab || [];
    await chrome.storage.local.set({ urlsInCurrentTab: [...urls, `^${escapeRegExp(message)}$`] });

  });
  port.onDisconnect.addListener((port) => {
    console.debug(JSON.stringify(port));
  });
  port.postMessage({ 'type': 'connected', tab: port.sender.tab });
});
