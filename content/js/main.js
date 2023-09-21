(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };

  const getElementsByNodeValue = (value, target) => {
    const nodes = [];
    Array.prototype.filter.call((target || document).childNodes, (n) => {
      return n.nodeName.toLowerCase() !== 'span' || n.className !== 'blurred';
    }).forEach((n) => {
      !n.nodeValue && nodes.push(...getElementsByNodeValue(value, n));
      value.test(n.nodeValue) && nodes.push(n.parentNode);
    });
    return nodes;
  };

  const blurByRegExpPatterns = (patterns) => {
    if (patterns.length === 0) return;
    const now = Date.now();
    patterns.forEach((pattern) => {
      console.debug(`Searching pattern ${pattern}`);
      getElementsByNodeValue(pattern, document.body)
      .reduce((prev, n) => {
        if (!prev.includes(n)
          && !exElmList.includes(n.nodeName.toLowerCase())
          && Array.prototype.filter.call(n.childNodes, (c) => {
            return c.nodeName === '#text' && pattern.test(c.nodeValue);
          }).length > 0
          && getStateOfContentEditable(n) !== 'true'
        ) prev.push(n);
        return prev;
      }, []).forEach((n) => {
        if (n.className && `${n.className}`.includes('blurred')) return;
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
    console.debug(`Took ${Date.now() - now} ms`)
  };

  const blur = (keywords) => {
    if (w.__observer) return;
    w.__observer = new MutationObserver(() => {
      blurByRegExpPatterns(keywords);
    });
    w.__observer.observe(w.document, {
      childList: true,
      subtree: true,
      characterData: true
    });
    blurByRegExpPatterns(keywords);
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    delete w.__observer
    const m = w.document.querySelectorAll('.blurred');
    if (m.length === 0) return;

    const now = Date.now();
    m.forEach((n) => {
      const p = n.parentNode;
      p.childNodes.forEach((c) => {
        if (c.nodeName !== '#text' || c.nodeValue !== '' || c === p.firstChild) return
        p.removeChild(c);
      });
      n.childNodes.forEach((c) => {
        if (n.previousSibling.nodeName !== '#text' || c.nodeName !== '#text') {
          p.insertBefore(c, n);
          return;
        }
        n.previousSibling.nodeValue += c.nodeValue;

        if (n.nextSibling?.nodeName !== '#text') return;
        n.previousSibling.nodeValue += n.nextSibling.nodeValue;
        p.removeChild(n.nextSibling);
      });
      p.removeChild(n);
    });
    console.debug(`Took ${Date.now() - now} ms`)
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