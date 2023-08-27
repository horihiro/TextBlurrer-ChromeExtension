// console.log('Start service-worker.js');

// chrome.runtime.onConnect.addListener((port) => {
//   if (port.name !== 'updateKeywords') return;

//   chrome.storage.onChanged.addListener(async (changes, area) => {
//     if (area !== 'local' || !changes.keywords && !changes.status) return;

//     try {
//       port.postMessage({
//         keywords: changes.keywords?.newValue || undefined,
//         status: changes.status?.newValue || undefined
//       });
//     } catch (e) {
//       console.error(e);
//     }
//   });
// });

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (!sender.tab || request.request !== "getKeywordsToBeBlurred") return;

//   chrome.storage.local.get(["keywords"], (k) => {
//     chrome.storage.local.get(["status"], (s) => {
//       sendResponse({ keywords: k.keywords, status: s.status });
//     });
//   });
//   return true;
// });

// // Workaround for keeping service worker active 
// // `Bug exploit` in https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension#answer-66618269
// const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
// chrome.runtime.onStartup.addListener(keepAlive);
// keepAlive();