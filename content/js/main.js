(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea'];
  const blurredClassName = 'blurred';
  const keepClassName = '__keep_this';
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };
  const inputs = [];

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
    [...document.querySelectorAll('input')].reduce((inputs, input) => {
      const inputObj = (() => {
        const array = inputs.filter((inputObj) => inputObj.element == input);
        if (array.length > 0) return array[0];
        inputs.push({ element: input, masks: {} });
        return inputs[inputs.length - 1];
      })();
      if (inputObj.inputHandler) return inputs;
      inputObj.inputHandler = inputOnInput.bind({ patterns });
      input.addEventListener('input', inputObj.inputHandler);
      input.addEventListener('focus', inputOnFocus);
      input.addEventListener('blur', inputOnBlur);
      input.dispatchEvent(new InputEvent('input', { data: input.value }));
      return inputs;
    }, inputs);
    console.debug(`Took ${Date.now() - now} ms`)
  };

  const inputOnInput = function (e) {
    const input = e.target;
    this.patterns.forEach((pattern) => {
      const inputObj = inputs.filter(i => i.element == input)[0];
      if (!inputObj) return;

      const patternStr = `/${pattern.source}/${pattern.flags}`;
      if (!inputObj.masks[patternStr]) inputObj.masks[patternStr] = [];
      while (inputObj.masks[patternStr].length > 0) {
        inputObj.masks[patternStr][0].parentNode && inputObj.masks[patternStr][0].parentNode.removeChild(inputObj.masks[patternStr][0]);
        inputObj.masks[patternStr].shift();
      }
      inputObj.masks[patternStr].length = 0;

      if (!pattern.test(input.value)) return;

      // const clone = document.querySelector("#__inputClone");
      const clone = (() => {
        return document.querySelector('#__inputClone') || document.createElement('div');
      })();
      if (!clone.parentNode) {
        clone.id = '__inputClone';
        document.body.appendChild(clone);
      }
      clone.textCotent = '';
      const inputStyle = getComputedStyle(input);
      while (clone.firstChild) {
        clone.removeChild(clone.firstChild);
      }
      for (let s in inputStyle) {
        if (!isNaN(parseInt(s))) continue;
        if (!['display', 'position', 'visibility', 'top', 'left', 'overflow', 'white-space'].includes(s)) clone.style.setProperty(s, inputStyle.getPropertyValue(s));
      }

      const inputBoundingBox = input.getBoundingClientRect();
      const size = Math.floor(parseFloat(inputStyle.fontSize) / 4);

      const textArray = input.value.split(pattern);
      const matched = input.value.match(new RegExp(pattern.source, `g${pattern.flags}`));
      clone.appendChild(document.createTextNode(textArray.shift()));
      const referenceNode = clone.lastChild.nextSibling;
      const parentBoundingBox = clone.getBoundingClientRect();
      textArray.forEach((t) => {
        const blurredSpan = document.createElement('span');
        blurredSpan.classList.add(blurredClassName);
        blurredSpan.textContent = matched.shift();
        if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
        clone.insertBefore(blurredSpan, referenceNode);
        clone.insertBefore(document.createTextNode(t), referenceNode);

        const mask = document.createElement('div');
        mask.classList.add('mask');
        mask.appendChild(document.createElement('div'));
        mask.lastChild.classList.add('textLayer');
        mask.lastChild.textContent = blurredSpan.textContent;
        mask.lastChild.style.setProperty('width', '100%');
        mask.lastChild.style.setProperty('height', '100%');
        input.parentNode.appendChild(mask);

        const blurredBoundingBox = blurredSpan.getBoundingClientRect();

        for (let s in inputStyle) {
          if (!isNaN(parseInt(s))) continue;
          if (!['position', 'filter', 'margin', 'padding', 'border', 'top', 'left', 'overflow', 'height', 'width', 'outline'].includes(s)) {
            mask.style.setProperty(s, inputStyle.getPropertyValue(s));
          }
        }

        mask.style.setProperty('left', `${blurredSpan.offsetLeft + input.offsetLeft + parseFloat(inputStyle.getPropertyValue('border-left-width'))}px`);
        mask.style.setProperty('top', `${input.offsetTop + input.offsetHeight - blurredSpan.offsetHeight - parseFloat(inputStyle.getPropertyValue('border-bottom-width'))}px`);
        const maskBoundingBox = mask.getBoundingClientRect();
        mask.style.setProperty('width', `${inputBoundingBox.width + inputBoundingBox.left - maskBoundingBox.left - parseFloat(inputStyle.getPropertyValue('padding-left')) > blurredBoundingBox.width
          ? blurredBoundingBox.width
          : inputBoundingBox.width + inputBoundingBox.left - maskBoundingBox.left - parseFloat(inputStyle.getPropertyValue('padding-left')) > 0
            ? inputBoundingBox.width + inputBoundingBox.left - maskBoundingBox.left - parseFloat(inputStyle.getPropertyValue('padding-left'))
            : 0}px`);
        mask.style.setProperty('height', `${blurredBoundingBox.height}px`);
        mask.style.setProperty('z-index', `${parseInt(inputStyle.getPropertyValue) + 1}`);
        mask.style.setProperty('border', 'none');

        mask.style.setProperty('background-color', getBackgroundColorAlongDOMTree(input));
        e.isTrusted && mask.style.setProperty('display', 'none');

        inputObj.masks[patternStr].push(mask);
      });
    });
  }
  const getBackgroundColorAlongDOMTree = (element) => {
    const computedStyle = getComputedStyle(element);
    return (!/(?:^| )rgba *\( *\d+ *, *\d+ *, *\d+ *, *0 *\)(?:$| )/.test(computedStyle.getPropertyValue('background-color')))
      ? computedStyle.getPropertyValue('background-color')
      : getBackgroundColorAlongDOMTree(element.parentNode);
  }
  const inputOnFocus = (e) => {
    const input = e.target;
    const inputObj = inputs.filter(i => i.element == input)[0];
    if (!inputObj) return;
    for (let p in inputObj.masks) {
      inputObj.masks[p].forEach(m => m.style.setProperty('display', 'none'));
    }
  }
  const inputOnBlur = (e) => {
    const input = e.target;
    const inputObj = inputs.filter(i => i.element == input)[0];
    if (!inputObj) return;
    for (let p in inputObj.masks) {
      inputObj.masks[p].forEach(m => m.style.setProperty('display', ''));
    }
  }
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
    const inputClone = (() => {
      return document.querySelector('#__inputClone') || document.createElement('div');
    })();
    if (!inputClone.parentNode) {
      inputClone.id = '__inputClone';
      document.body.appendChild(inputClone);
    }

    blurByRegExpPatterns(keywords);
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    delete w.__observer

    inputs.forEach((inputObj) => {
      inputObj.element.removeEventListener('input', inputObj.inputHandler);
      inputObj.element.removeEventListener('focus', inputOnFocus);
      inputObj.element.removeEventListener('blur', inputOnBlur);
      inputObj.inputHandler = null;
    });

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