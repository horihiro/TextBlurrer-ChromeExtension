(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : ''; 
  };
  const blur = (keywords) => {
    if (w.__observer) return;
    const blurKeywords = (keywords) => {
      if (keywords.length === 0) return;
      keywords.forEach((keyword) => {
        console.log(`Searching keyword ${keyword}`);
        Array.prototype.filter.call($(`:contains("${keyword}")`), (n) => {
          return !exElmList.includes(n.nodeName.toLowerCase())
            && Array.prototype.filter.call(n.childNodes, (c) => {
              return c.nodeName === '#text' && c.data.includes(keyword);
            }).length > 0
            && getStateOfContentEditable(n) !== 'true';
        }).forEach((n) => {
          const re = new RegExp(keyword.replace(/([()?$])/g, "\\$1"), 'g');
          try {
            (!n.className || !n.className.includes('blurred')) && (n.innerHTML = n.innerHTML.replace(re, `<span class="blurred">${keyword}</span>`));
          } catch (e) {
            n.innerHTML = n.innerHTML.replace(re, ``);
          }
        });
      });
    }
    w.__observer = new MutationObserver(() => {
      blurKeywords(keywords);
    });
    w.__observer.observe(w.document,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
    blurKeywords(keywords);
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    const m = w.document.querySelectorAll('.blurred');
    if (m.length > 0) {
      Array.prototype.forEach.call(m, (n) => {
        !!n.parentNode && (n.parentNode.innerHTML = n.parentNode.innerHTML.replace(/<span class="blurred">([^<]*)<\/span>/g, '$1'))
      });
    }
    delete w.__observer
  }

  const initialStatus = await chrome.runtime.sendMessage({ request: 'getKeywordsToBeBlurred' });
  let keywordArray = initialStatus?.keywords?.split(/\n/).map(k => k.trim()).filter(k => k !== '') || [];
  initialStatus.status && blur(keywordArray);

  const port = chrome.runtime.connect({ name: 'updateKeywords' });
  port.onMessage.addListener((msg => {
    unblur();
    if (!msg.status && !msg.keywords) return;
    if (msg.keywords) keywordArray = msg.keywords.split(/\n/).map(k => k.trim()).filter(k => k !== '') || [];
    blur(keywordArray);
  }));
})();