'use strict';

import { escapeRegExp } from '../utils/common';
import type { IBlurrer } from './blurrer/IBlurrer';
import { DOMBlurrer } from './blurrer/DOMBlurrer';
import { TitleBlurrer } from './blurrer/TitleBlurrer';
import { InputBlurrer } from './blurrer/InputBlurrer';

(async () => {
  const blurrers: IBlurrer[] = [
    new DOMBlurrer(),
    new TitleBlurrer(),
    new InputBlurrer()
  ];

  const keywords2RegExp = (keywords: string, mode: string, matchCase: boolean): RegExp => {
    return new RegExp(
      (keywords || '').split(/\n/)
        .filter(k =>
          !!k.trim() && (
            mode !== 'regexp' ||
            !new RegExp(k).test('')
          )
        )
        .map(k => `(?:${mode === 'regexp' ? k.trim() : escapeRegExp(k.trim())})`)
        .join('|'),
      matchCase ? '' : 'i'
    );
  };
  const init = async () => {
    const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle, exclusionUrls }
      = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle', 'exclusionUrls']));

    blurrers.forEach(blurrer => {
      try { blurrer.stopBlurring(); }
      catch (e) { console.error(e); }
    });
    if (status === 'disabled' || !keywords || keywords.trim() === '') return;
    const exclusionUrlArray = exclusionUrls ? exclusionUrls.split(/\n/).filter(l => !!l) : [];
    if (exclusionUrlArray.length > 0 && new RegExp(exclusionUrlArray.map(l => `(?:${l})`).join('|')).test(location.href)) return;

    const pattern = keywords2RegExp(keywords, mode, !!matchCase);
    try {
      blurrers.find(blurrer => blurrer instanceof DOMBlurrer)?.startBlurring(pattern, { showValue: !!showValue });
    } catch (e) {
      console.error(e);
    }
    try {
      blurInput && blurrers.find(blurrer => blurrer instanceof InputBlurrer)?.startBlurring(pattern, { showValue: !!showValue });
    } catch (e) {
      console.error(e);
    }
    try {
      blurTitle && blurrers.find(blurrer => blurrer instanceof TitleBlurrer)?.startBlurring(pattern, { showValue: !!showValue });
    } catch (e) {
      console.error(e);
    }
  };
  const send2popup = async (message) => {
    chrome.runtime.sendMessage(message);
  }

  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.method === 'getUrl') {
      await send2popup({
        method: 'getUrlResponse',
        isTop: window.top === window,
        numOfChildren: Array.from(document.querySelectorAll('iframe,frame')).filter(f => /^https?:\/\//.test(f.getAttribute('src'))).length,
        url: location.href
      });
    }
  });
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    await init();
  });
  await init();
})();