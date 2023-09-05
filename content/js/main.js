(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };

  const getElementsByNodeValue = (value, target) => {
    const nodes = [];
    (target || document).childNodes.forEach((n) => {
      !n.nodeValue && nodes.push(...getElementsByNodeValue(value, n));
      (value.constructor.name === 'RegExp' && value.test(n.nodeValue)) && nodes.push(n.parentNode);
    });
    return nodes;
  };

  const blurByRegExpPatterns = (patterns) => {
    if (patterns.length === 0) return;
    patterns.forEach((pattern) => {
      console.debug(`Searching pattern ${pattern}`);
      getElementsByNodeValue(pattern, document.body).filter((n) => {
        return !exElmList.includes(n.nodeName.toLowerCase())
          && Array.prototype.filter.call(n.childNodes, (c) => {
            return c.nodeName === '#text' && pattern.test(c.nodeValue);
          }).length > 0
          && getStateOfContentEditable(n) !== 'true';
      }).forEach((n) => {
        if (n.className && n.className.includes('blurred')) return;
        const size = Math.floor(parseFloat(getComputedStyle(n).fontSize) / 4);
        n.childNodes.forEach((c) => {
          if (c.nodeName !== "#text" || !pattern.test(c.nodeValue)) return;
          const referenceNode = c.nextSibling;
          const textArray = c.nodeValue.split(pattern);
          const matched = c.nodeValue.match(new RegExp(pattern.source, `g${pattern.flags}`));
          c.nodeValue = textArray.shift();

          textArray.forEach((t) => {
            const blurredSpan = document.createElement('span');
            blurredSpan.className = 'blurred';
            blurredSpan.innerText = matched.shift();
            if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
            c.parentNode.insertBefore(blurredSpan, referenceNode);
            c.parentNode.insertBefore(document.createTextNode(t), referenceNode);
          });
        });
      })
    });
  };

  const blur = (keywords) => {
    if (w.__observer) return;
    w.__observer = new MutationObserver(() => {
      blurByRegExpPatterns(keywords);
    });
    w.__observer.observe(w.document,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
    blurByRegExpPatterns(keywords);
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    delete w.__observer
    const m = w.document.querySelectorAll('.blurred');
    if (m.length === 0) return;

    m.forEach((n) => {
      const p = n.parentNode;
      n.childNodes.forEach((c) => {
        p.insertBefore(c, n);
      });
      p.removeChild(n);
      for (let i = p.childNodes.length - 1; i >= 1; i--) {
        const c = p.childNodes[i];
        const s = p.childNodes[i - 1];
        if (!s || c.nodeName !== '#text' || s.nodeName !== '#text') continue;
        s.nodeValue += c.nodeValue;
        c.nodeValue = "";
      }
    });
  };

  const escapeRegExp = (str) => {
    return str.replace(/([\(\)\{\}\+\*\?\[\]\.\^\$\|\\])/g, '\\$1');
  };

  const str2RegExpArray = (str, mode, matchCase) => {
    const stringArray = (str || '').split(/\n/).map(k => k.trim()).filter(k => k !== '') || [];
    return mode === 'regexp' ? (
      stringArray.map(matchCase ? (k => new RegExp(k)) : (k => new RegExp(k, 'i')))
    ) : (
      stringArray.map(matchCase ? (k => new RegExp(escapeRegExp(k))) : (k => new RegExp(escapeRegExp(k), 'i')))
    );
  };

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    const { status, keywords, mode, matchCase } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase']));
    unblur();
    if (status === 'disabled') return;
    blur(str2RegExpArray(keywords, mode, !!matchCase));
  });
  const { status, keywords, mode, matchCase } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase']));
  if (status === 'disabled') return;
  blur(str2RegExpArray(keywords, mode, !!matchCase));
})();