import { escapeRegExp } from '../util/common.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add_keyword',
    title: 'Add this as blurry keyword',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async(info, tab) => {
  if (info.menuItemId === 'add_keyword') {
    const keywords = (await chrome.storage.local.get(['keywords'])).keywords?.split(/\n/) || [];
    (keywords.length === 1 && keywords[0] === '') && keywords.pop();
    const addingKeyword = (await chrome.storage.local.get(['mode']))?.mode === 'regexp' ? escapeRegExp(info.selectionText) : info.selectionText;
    !keywords.includes(addingKeyword) && keywords.push(addingKeyword);
    await chrome.storage.local.set({ 'keywords': keywords.join('\n').replace(/\u00a0/g, ' ') });
    chrome.runtime.sendMessage({ method: 'reload' });
  }
});