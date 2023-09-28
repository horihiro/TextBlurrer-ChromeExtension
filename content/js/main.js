(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const blurredClassName = 'blurred';
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };

  const getElementsByNodeValue = (pattern, target) => {
    return Array.prototype.filter.call((target || document).childNodes, (n) => {
      return n.nodeName.toLowerCase() !== 'span' || !(n.classList.contains(blurredClassName));
    }).reduce((array, n) => {
      if (n.nodeName !== "#text") {
        array.push(...getElementsByNodeValue(pattern, n));
        // if (!array.some((o) => n.contains(o.node))) {
        // if (!array.some((o) => n == o.node)) {
        // if (!array.some((o) => n == o.node.parentNode && n.innerText.trim() === o.node.innerText.trim())) {
        const result = (pattern.source.length > 1 && !/^(?:\.|(?:\\[^\\])|(?:\[[^\]]+\]))(?:\?|\*|\+|\{,?1\}|\{1,(?:\d+)?\})?$/.test(pattern.source)) && n.textContent?.match(pattern);
        if (result) {
          array.push({
            splitted: true,
            node: n
          });
        }
        // }
        return array;
      }
      const result = inlineFormatting(n.textContent).match(pattern);
      if (result) {
        array.push({
          exact: result[result.index] === result.input,
          node: n.parentNode
        });
      }
      return array;
    }, []);
  };

  const getNextTextNode = (e, root) => {
    if (!e) return null;
    if (e.firstChild) return e.firstChild.nodeName === '#text' ? e.firstChild : getNextTextNode(e.firstChild, root);
    if (e.nextSibling) return e.nextSibling.nodeName === '#text' ? e.nextSibling : getNextTextNode(e.nextSibling, root);

    let parent = e.parentNode;
    while (parent != root && parent) {
      if (parent.nextSibling) return parent.nextSibling.nodeName === '#text' ? parent.nextSibling : getNextTextNode(parent.nextSibling, root);
      parent = parent.parentNode;
    }
    return null;
  }

  const getPreviousTextNode = (e, root) => {
    if (!e) return null;
    if (e.lastChild) return e.lastChild.nodeName === '#text' ? e.lastChild : getPreviousTextNode(e.lastChild, root);
    if (e.previousSibling) return e.previousSibling.nodeName === '#text' ? e.previousSibling : getPreviousTextNode(e.previousSibling, root);

    let parent = e.parentNode;
    while (parent != root && parent) {
      if (parent.previousSibling) return parent.previousSibling.nodeName === '#text' ? parent.previousSibling : getPreviousTextNode(parent.previousSibling, root);
      parent = parent.parentNode;
    }
    return null;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#how_does_css_process_whitespace
  const inlineFormatting = (str) => {
    return str
      .replace(/ *\n */g, '\n') // step.1
      .replace(/[\n\t]/g, ' ')  // step.2&3
      .replace(/ +/g, ' ')      // step.4
      .trim()                   // step.5
  }

  const inchworm = (e, pattern) => {
    let tail = e.firstChild.nodeName === '#text' ? e.firstChild : getNextTextNode(e.firstChild, e), head = getNextTextNode(tail, e);
    let result;
    do {
      let str = '';
      let pos = tail;
      do {
        str = `${str}${pos.parentNode.classList.contains(blurredClassName) ? '' : pos.textContent}`;
        result = inlineFormatting(str).match(pattern);
        if (result) break;
        pos = getNextTextNode(pos, e);
      } while (!result && pos);
      head = pos;
      if (!head) {
        tail = getNextTextNode(head, e);
        head = getNextTextNode(tail, e);
        continue;
      }

      str = '';
      pos = head;
      do {
        str = `${pos.parentNode.classList.contains(blurredClassName) ? '' : pos.textContent}${str}`;
        result = inlineFormatting(str).match(pattern);
        if (result) break;
        pos = getPreviousTextNode(pos, e);
      } while (pos);
      tail = pos;
      if (!tail) {
        tail = getNextTextNode(head, e);
        head = getNextTextNode(tail, e);
        continue;
      }

      const blurred1 = document.createElement('span');
      blurred1.classList.add(blurredClassName);
      blurred1.textContent = tail.textContent.slice(result.index);;
      tail.textContent = tail.textContent.slice(0, result.index);
      tail.parentNode.insertBefore(document.createTextNode(''), tail.nextSibling);
      tail.parentNode.insertBefore(blurred1, tail.nextSibling);
      pos = getNextTextNode(blurred1.firstChild, e);
      while (pos != head) {
        if (pos.textContent !== '') {
          const span = document.createElement('span');
          span.classList.add(blurredClassName);
          pos.parentNode.insertBefore(document.createTextNode(''), pos);
          pos.parentNode.insertBefore(span, pos);
          span.appendChild(pos);
        }
        pos = getNextTextNode(pos, e);
      }
      const blurred2 = document.createElement('span');
      const p = head.textContent.trim().length - inlineFormatting(str).length + result.index + result[0].length;
      blurred2.classList.add(blurredClassName);
      blurred2.textContent = head.textContent.slice(0, p);;
      head.textContent = head.textContent.slice(p);
      head.parentNode.insertBefore(document.createTextNode(''), head);
      head.parentNode.insertBefore(blurred2, head);

      tail = getNextTextNode(head, e);
      head = getNextTextNode(tail, e);
    } while (head && tail);
  }

  const blurByRegExpPatterns = (patterns) => {
    if (patterns.length === 0) return;
    const now = Date.now();
    patterns.forEach((pattern) => {
      console.debug(`Searching pattern ${pattern}`);
      let array = getElementsByNodeValue(pattern, document.body);
      console.debug('retrived:');
      console.debug(array);
      array = array.filter((o) => {
        return !exElmList.includes(o.node.nodeName.toLowerCase())
          && (Array.prototype.filter.call(o.node.childNodes, (c) => {
            return c.nodeName === '#text' && pattern.test(c.textContent);
          }).length > 0 || pattern.test(o.node.textContent))
          && getStateOfContentEditable(o.node) !== 'true'
      });
      [...new Set(array)].sort((a) => {
        return a.splitted ? 1 : -1;
      }).forEach((o) => {
        const n = o.node;
        if (n.classList.contains(blurredClassName)) return;

        const computedStyle = getComputedStyle(n);
        const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);

        // case of that the element doesn't contain nodes except the matched keyword,
        if (n.childNodes.length == 1
          && n.firstChild.nodeName === '#text'
          && o.exact
          && computedStyle.filter === 'none'
          && n.nodeName.toLowerCase() !== 'span'
        ) {
          n.classList.add(blurredClassName);
          if (size > 5) n.style.filter += ` blur(${size}px)`;
          return;
        }
        if (o.splitted) {
          inchworm(n, pattern);
          return;
        }

        n.childNodes.forEach((c) => {
          if (c.nodeName !== "#text" || !pattern.test(c.textContent)) return;
          const textArray = c.textContent.split(pattern);
          const referenceNode = c.nextSibling;
          const matched = c.textContent.match(new RegExp(pattern.source, `g${pattern.flags}`));
          c.textContent = textArray.shift();

          textArray.forEach((t) => {
            const blurredSpan = document.createElement('span');
            blurredSpan.classList.add(blurredClassName);
            blurredSpan.textContent = matched.shift();
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
      if (n.nodeName.toLowerCase() !== 'span' || n.classList.length > 1) {
        // restore class
        n.classList.remove(blurredClassName);
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
          if (textContainer.previousSibling && textContainer.textContent === '') {
            textContainer = textContainer.previousSibling;
            continue;
          }
          textContainer.textContent += c.textContent;

          if (n.nextSibling?.nodeName === '#text') {
            n.previousSibling.textContent += n.nextSibling.textContent;
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