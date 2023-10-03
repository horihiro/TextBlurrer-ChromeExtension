(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const blurredClassName = 'blurred';
  const keepClassName = '__keep_this';
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };

  const getElementsByNodeValue = (pattern, target) => {
    return Array.prototype.filter.call((target || document).childNodes, (n) => {
      return n.nodeName.toLowerCase() !== 'span' || !(n.classList.contains(blurredClassName));
    }).reduce((array, n) => {
      if (!n.nodeValue) {
        array.push(...getElementsByNodeValue(pattern, n));
        return array;
      }
      const result = n.nodeValue.match(pattern);
      if (!result) return array;
      array.push({
        exact: result[result.index] === result.input,
        node: n.parentNode
      });
      return array;
    }, []);
  };

  const blurByRegExpPatterns = (patterns) => {
    if (patterns.length === 0) return;
    const now = Date.now();
    patterns.forEach((pattern) => {
      console.debug(`Searching pattern ${pattern}`);
      getElementsByNodeValue(pattern, document.body)
      .reduce((prev, o) => {
        if (!prev.includes(o)
          && !exElmList.includes(o.node.nodeName.toLowerCase())
          && Array.prototype.filter.call(o.node.childNodes, (c) => {
            return c.nodeName === '#text' && pattern.test(c.nodeValue);
          }).length > 0
          && getStateOfContentEditable(o.node) !== 'true'
        ) prev.push(o);
        return prev;
      }, []).forEach((o) => {
        const n = o.node;
        if (n.classList.contains(blurredClassName)) return;
        const computedStyle = getComputedStyle(n);
        const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);

        // case of that the element doesn't contain nodes except the matched keyword,
        if (n.childNodes.length == 1
         && n.firstChild.nodeName === '#text'
         && o.exact
         && computedStyle.filter === 'none'
        ) {
          n.classList.add(blurredClassName);
          n.classList.add(keepClassName);
          if (size > 5) n.style.filter += ` blur(${size}px)`;
          return;
        }

        n.childNodes.forEach((c) => {
          if (c.nodeName !== "#text" || !pattern.test(c.nodeValue)) return;
          const textArray = c.nodeValue.split(pattern);
          const referenceNode = c.nextSibling;
          const matched = c.nodeValue.match(new RegExp(pattern.source, `g${pattern.flags}`));
          c.nodeValue = textArray.shift();

          textArray.forEach((t) => {
            const blurredSpan = document.createElement('span');
            blurredSpan.classList.add(blurredClassName);
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
    const m = w.document.querySelectorAll(`.${blurredClassName}`);
    if (m.length === 0) return;

    const now = Date.now();
    m.forEach((n) => {
      if (n.classList.contains(blurredClassName) && n.classList.contains(keepClassName)) {
        // restore class
        n.classList.remove(blurredClassName);
        n.classList.remove(keepClassName);
        if (n.classList.length == 0) n.removeAttribute('class');

        // restore style
        n.style.filter = n.style.filter.replace(/blur\([^\)]+\)/, '').trim();
        if (n.style.length == 0) n.removeAttribute('style');
        return;
      }
      const p = n.parentNode;
      n.childNodes.forEach((c) => {
        if (c.nodeName !== '#text') {
          p.insertBefore(c, n);
          return;
        }

        let textContainer = n.previousSibling;
        do {
          if (textContainer.nodeName !== '#text') {
            p.insertBefore(c, n);
            break;
          }
          if (textContainer.previousSibling && textContainer.nodeValue === '') {
            textContainer = textContainer.previousSibling;
            continue;
          }
          textContainer.nodeValue += c.nodeValue;

          if (n.nextSibling?.nodeName === '#text') {
            n.previousSibling.nodeValue += n.nextSibling.nodeValue;
            p.removeChild(n.nextSibling);
          }
          break;
        } while (true);
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