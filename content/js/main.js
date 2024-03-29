(async () => {
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea', '#comment'];
  const blurredClassName = 'tb_blurred_class';
  const keepClassName = 'tb_keep_this_class';
  const originalTitleAttributeName = 'data-tb-original-title';
  const maskContainerClassName = 'tb_mask_container_class';
  const textLayerClassName = 'tb_mask_text_layer_class';
  const inputCloneId = 'tb_input_clone';
  const globalStyleId = '__blurring_style';
  const globalStyle = `.${blurredClassName} {
  filter: blur(5px)!important;
}
.${maskContainerClassName} {
  border: none!important;
  overflow: hidden!important;
}

#${inputCloneId}, .${maskContainerClassName}, .${textLayerClassName} {
  position: absolute!important;
  border: none!important;
  overflow: hidden!important;
  white-space: nowrap!important;
}

#${inputCloneId} {
  visibility: hidden!important;
  white-space-collapse: preserve!important;
}`;
  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };
  const inputs = [];

  const getTextContentRecursive = (target, options) => {
    const textContent = !target.childNodes ? target.textContent : Array.prototype.reduce.call(target.childNodes, (allTextContent, node) => {
      if (options?.exclusives?.nodeNames?.includes(node.nodeName.toLowerCase()) || options?.exclusives?.nodes?.includes(node)) return allTextContent;
      if (node.nodeName === '#text') return `${allTextContent}${node.textContent}`;
      return `${allTextContent}${getTextContentRecursive(node, options)}`;
    }, '');
    return textContent;
  };

  const getElementsByNodeValue = (pattern, target, options) => {
    return Array.prototype.filter.call((target || document.body).childNodes, (n) => {
      return !exElmList.includes(n.nodeName.toLowerCase()) && (n.nodeName.toLowerCase() !== 'span' || !(n.classList.contains(blurredClassName)));
    }).reduce((array, n) => {
      if (n.nodeName !== "#text") {
        if (n.shadowRoot) {
          blur(pattern, options, n.shadowRoot);
        }
        array.push(...getElementsByNodeValue(pattern, n, options));
        const nodearray = array.map(o => o.node);
        const textContent = getTextContentRecursive(n, { exclusives: { nodes: nodearray, nodeNames: exElmList } });
        if (pattern.source.length <= 1 || /^(?:\.|(?:\\[^\\])|(?:\[[^\]]+\]))(?:\?|\*|\+|\{,?1\}|\{1,(?:\d+)?\})?$/.test(pattern.source)) return array;
        const result = inlineFormatting(textContent).match(pattern);
        if (result) {
          !nodearray.includes(n) && array.push({
            keyword: result[0],
            splitted: true,
            node: n
          });
        }
        return array;
      }
      const result = inlineFormatting(n.textContent).match(pattern);
      if (result) {
        array.push({
          keyword: result[0],
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
    return str ? str
      .replace(/ *\n */g, '\n') // step.1
      .replace(/[\n\t]/g, ' ')  // step.2&3
      .replace(/ +/g, ' ')      // step.4
      .trim()                   // step.5
      : ''
  }

  const inchworm = (e, pattern, keyword, options) => {
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

      const reStartWithSpaces = /^(\s+).*/;
      const blurred1 = document.createElement('span');
      const numOfLeftSpacesInTail = reStartWithSpaces.test(tail.textContent) ? tail.textContent.replace(reStartWithSpaces, '$1').length : 0;
      blurred1.classList.add(blurredClassName);
      blurred1.textContent = tail.textContent.slice(result.index + numOfLeftSpacesInTail);
      options?.showValue && blurred1.setAttribute('title', keyword);
      tail.textContent = tail.textContent.slice(0, result.index + numOfLeftSpacesInTail);
      tail.parentNode.insertBefore(document.createTextNode(''), tail.nextSibling);
      tail.parentNode.insertBefore(blurred1, tail.nextSibling);
      pos = getNextTextNode(blurred1.firstChild, e);
      while (pos && pos != head) {
        if (pos.textContent !== '') {
          const span = document.createElement('span');
          span.classList.add(blurredClassName);
          options?.showValue && span.setAttribute('title', keyword);
          pos.parentNode.insertBefore(document.createTextNode(''), pos);
          pos.parentNode.insertBefore(span, pos);
          span.appendChild(pos);
        }
        pos = getNextTextNode(pos, e);
      }
      const blurred2 = document.createElement('span');
      const numOfLeftSpacesInHead = reStartWithSpaces.test(head.textContent) ? head.textContent.replace(reStartWithSpaces, '$1').length : 0;
      const p = head.textContent.trim().length - inlineFormatting(str).length + result.index + result[0].length + numOfLeftSpacesInHead;
      blurred2.classList.add(blurredClassName);
      blurred2.textContent = head.textContent.slice(0, p);
      options?.showValue && blurred2.setAttribute('title', keyword);
      head.textContent = head.textContent.slice(p);
      head.parentNode.insertBefore(document.createTextNode(''), head);
      head.parentNode.insertBefore(blurred2, head);

      tail = getNextTextNode(head, e);
      head = getNextTextNode(tail, e);
    } while (head && tail);
  }

  const blurByRegExpPattern = (pattern, options, target) => {
    const now = Date.now();

    if (target.classList && target.classList.contains(blurredClassName)) {
      unblurCore(target);
    }
    const targetObjects = getElementsByNodeValue(pattern, target || document.body, options).filter((o) => {
      return (Array.prototype.filter.call(o.node.childNodes, (c) => {
        return c.nodeName === '#text' && pattern.test(inlineFormatting(c.textContent));
      }).length > 0 || pattern.test(inlineFormatting(o.node.textContent)))
        && getStateOfContentEditable(o.node) !== 'true'
    });
    [...new Set(targetObjects)].sort((a) => {
      return !a.exact ? 1 : a.splitted ? 1 : -1;
    }).forEach((o) => {
      const n = o.node;
      if (n.classList.contains(blurredClassName)) return;

      const computedStyle = getComputedStyle(n);
      const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);

      // case of that the element doesn't contain nodes except the matched keyword,
      if (o.exact
        && Array.prototype.every.call(n.childNodes, c => c.nodeName === '#text')
        && computedStyle.filter === 'none'
      ) {
        n.classList.add(blurredClassName);
        n.classList.add(keepClassName);
        if (options?.showValue) {
          const originalTitle = n.getAttribute('title');
          if (originalTitle) {
            n.setAttribute('data-tb-original-title', originalTitle);
          }
          n.setAttribute('title', o.keyword);
        }
        if (size > 5) n.style.filter += ` blur(${size}px)`;
        return;
      }
      if (o.splitted) {
        inchworm(n, pattern, o.keyword, options);
        return;
      }

      const reKeyword = new RegExp(escapeRegExp(o.keyword).replace(/ +/, '\\s+'));
      n.childNodes.forEach((c) => {
        if (c.nodeName !== "#text" || !reKeyword.test(c.textContent)) return;
        const textArray = c.textContent.split(reKeyword);
        const referenceNode = c.nextSibling;
        const matched = c.textContent.match(new RegExp(reKeyword.source, `g${reKeyword.flags}`));
        c.textContent = textArray.shift();

        textArray.forEach((t) => {
          const blurredSpan = document.createElement('span');
          blurredSpan.classList.add(blurredClassName);
          blurredSpan.textContent = matched.shift();
          options?.showValue && blurredSpan.setAttribute('title', o.keyword);
          if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
          c.parentNode.insertBefore(blurredSpan, referenceNode);
          c.parentNode.insertBefore(document.createTextNode(t), referenceNode);
        });
      });
    })

    options?.blurInput && ['HTMLBodyElement', 'ShadowRoot'].includes(Object.prototype.toString.call(target).slice(8, -1)) && [...target.querySelectorAll('input')].reduce((inputs, input) => {
      const inputObj = (() => {
        const array = inputs.filter((inputObj) => inputObj.element == input);
        if (array.length > 0) return array[0];
        inputs.push({ element: input, masks: {} });
        return inputs[inputs.length - 1];
      })();
      if (inputObj.inputHandler) return inputs;
      inputObj.inputHandler = inputOnInput.bind({ pattern, root: target, options });
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
    const options = this.options;

    const inputObj = inputs.filter(i => i.element == input)[0];
    if (!inputObj) return;
    const pattern = this.pattern;

    const patternStr = `/${pattern.source}/${pattern.flags}`;
    if (!inputObj.masks[patternStr]) inputObj.masks[patternStr] = [];
    while (inputObj.masks[patternStr].length > 0) {
      inputObj.masks[patternStr][0].parentNode && inputObj.masks[patternStr][0].parentNode.removeChild(inputObj.masks[patternStr][0]);
      inputObj.masks[patternStr].shift();
    }
    inputObj.masks[patternStr].length = 0;

    if (!pattern.test(input.value)) return;

    const clone = (() => {
      return this.root.querySelector(`#${inputCloneId}`) || document.createElement('div');
    })();
    if (!clone.parentNode) {
      clone.id = inputCloneId;
      this.root.appendChild(clone);
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
    textArray.forEach((t) => {
      const blurredSpan = document.createElement('span');
      blurredSpan.classList.add(blurredClassName);
      blurredSpan.textContent = matched.shift();
      if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
      clone.insertBefore(blurredSpan, referenceNode);
      clone.insertBefore(document.createTextNode(t), referenceNode);

      const mask = document.createElement('div');
      mask.classList.add(maskContainerClassName);
      mask.appendChild(document.createElement('div'));
      mask.lastChild.classList.add(textLayerClassName);
      mask.lastChild.textContent = blurredSpan.textContent;
      mask.lastChild.style.setProperty('width', '100%');
      mask.lastChild.style.setProperty('height', '100%');
      input.parentNode.appendChild(mask);
      options?.showValue && mask.lastChild.setAttribute('title', blurredSpan.textContent);
      mask.addEventListener('click', () => {
        input.focus();
      })

      const blurredBoundingBox = blurredSpan.getBoundingClientRect();

      for (let s in inputStyle) {
        if (!isNaN(parseInt(s))) continue;
        if (!['position', 'filter', 'margin', 'padding', 'border', 'top', 'left', 'overflow', 'height', 'width', 'outline'].includes(s)) {
          mask.style.setProperty(s, inputStyle.getPropertyValue(s));
        }
      }

      const verticalGap = (parseFloat(inputStyle.getPropertyValue('height')) - parseFloat(inputStyle.getPropertyValue('font-size')));
      const isBorderBox = inputStyle.getPropertyValue('box-sizing') === 'border-box';
      mask.style.setProperty('left', `${blurredSpan.offsetLeft + input.offsetLeft
        + (isBorderBox ? 0 : parseFloat(inputStyle.getPropertyValue('border-left-width')))
        }px`);
      mask.style.setProperty('top', `${input.offsetTop + input.offsetHeight - blurredSpan.offsetHeight
        - (verticalGap > 0 ? verticalGap / 2 : 0)
        - (isBorderBox ? - parseFloat(inputStyle.getPropertyValue('border-top-width')) : parseFloat(inputStyle.getPropertyValue('border-bottom-width')))
        - parseFloat(inputStyle.getPropertyValue('padding-bottom'))
        }px`);
      const maskBoundingBox = mask.getBoundingClientRect();
      const tmpWidth = inputBoundingBox.width + inputBoundingBox.left - maskBoundingBox.left - parseFloat(inputStyle.getPropertyValue('border-left-width'));
      mask.style.setProperty('width', `${tmpWidth > blurredBoundingBox.width
        ? blurredBoundingBox.width
        : tmpWidth > 0
          ? tmpWidth
          : 0}px`);
      mask.style.setProperty('height', `${blurredBoundingBox.height}px`);
      mask.style.setProperty('z-index', `${parseInt(inputStyle.getPropertyValue('z-index')) + 1}`);
      mask.style.setProperty('border', 'none');

      mask.style.setProperty('background-color', getBackgroundColorAlongDOMTree(input));
      e.isTrusted && mask.style.setProperty('display', 'none');

      inputObj.masks[patternStr].push(mask);
    });
  }
  const getBackgroundColorAlongDOMTree = (element) => {
    if (element == document) return '';
    const computedStyle = getComputedStyle(element);
    return (!/(?:^| )rgba *\( *\d+ *, *\d+ *, *\d+ *, *0 *\)(?:$| )/.test(computedStyle.getPropertyValue('background-color')))
      ? computedStyle.getPropertyValue('background-color').replace(/rgba *\( *(\d+) *, *(\d+) *, *(\d+) *, *[^)]+ *\)/, 'rgb($1, $2, $3)')
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
  const observedNodes = [];
  const blur = (pattern, options, target) => {
    const observed = target || document.body;
    if (observedNodes.includes(observed)) return;

    const style = document.createElement('style');
    style.innerHTML = globalStyle;
    style.id = globalStyleId;
    !observed.querySelector(`#${style.id}`) && (observed == document.body ? document.head : observed).appendChild(style);
    observedNodes.push(observed);
    if (!w.__observer) {
      w.__observer = new MutationObserver((records) => {
        const targets = records.reduce((targets, record) => {
          const isContained = targets.some((target) => {
            return target.contains(record.target);
          });
          if (isContained) return targets;
          const array = targets.reduce((prev, target) => {
            if (!record.target.contains(target) && target != record.target) {
              prev.push(target)
            }
            return prev;
          }, []);
          array.push(record.target);
          return array;
        }, []);
        targets.forEach(target => blurByRegExpPattern(pattern, options, target));
      });
    }
    w.__observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true
    });

    const inputClone = (() => {
      return document.querySelector(`#${inputCloneId}`) || document.createElement('div');
    })();
    if (!inputClone.parentNode) {
      inputClone.id = inputCloneId;
      document.body.appendChild(inputClone);
    }

    blurByRegExpPattern(pattern, options, observed);
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    delete w.__observer

    inputs.map(i => i.masks).forEach((masks) => {
      for (let pattern in masks) {
        masks[pattern].forEach((mask) => {
          mask.parentNode.removeChild(mask);
        })
      }
    });
    inputs.length = 0;

    const m = observedNodes.reduce((array, target) => {
      const globalStyle = target.querySelector(`#${globalStyleId}`);
      globalStyle && globalStyle.parentNode.removeChild(globalStyle);
      const inputClone = target.querySelector(`#${inputCloneId}`);
      inputClone && inputClone.parentNode.removeChild(inputClone);

      array.push(...target.querySelectorAll(`.${blurredClassName}`));
      return array;
    }, []);
    observedNodes.length = 0;

    if (m.length === 0) return;

    const now = Date.now();
    m.forEach((n) => {
      unblurCore(n);
    });
    console.debug(`Took ${Date.now() - now} ms`)
  };
  
  const unblurCore = (n) => {
    if (n.classList.contains(blurredClassName) && n.classList.contains(keepClassName)) {
      // restore title
      const originalTitle = n.getAttribute(originalTitleAttributeName);
      if (originalTitle) {
        n.setAttribute('title', originalTitle);
        n.removeAttribute(originalTitleAttributeName);
      }
      else n.removeAttribute('title');

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
        if (!textContainer || textContainer.nodeName !== '#text') {
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
  };

  const unblurTabTitle = () => {
    const title = document.querySelector('title');
    if (!title) return;
    if (title.getAttribute(originalTitleAttributeName)) {
      title.textContent = title.getAttribute(originalTitleAttributeName);
      title.removeAttribute(originalTitleAttributeName);
    }
    if (!w.__titleObserver) return;
    w.__titleObserver.disconnect();
    delete w.__titleObserver;
  };

  const blurTabTitleCore = (pattern, target) => {
    const title = target.textContent;
    let result = title.match(pattern);
    while (result) {
      const mask = new Array(result[0].length).fill('*').join('');
      target.textContent = target.textContent.replace(result[0], mask);
      result = target.textContent.match(pattern);
      if (!target.getAttribute(originalTitleAttributeName)) {
        target.setAttribute(originalTitleAttributeName, title);
      }
    }
  };

  const blurTabTitle = (pattern) => {
    if (!w.__titleObserver) {
      w.__titleObserver = new MutationObserver((records) => {
        records.some((record) => {
          return Array.from(record.addedNodes).some((node) => {
            if (node.nodeName === 'TITLE') {
              blurTabTitleCore(pattern, node);
              return true;
            } else if (node.nodeName === "#text" && node.parentNode.nodeName === "TITLE") {
              blurTabTitleCore(pattern, node.parentNode);
              return true;
            }
            return false;
          });
        });
      });
    }
    w.__titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    })
    const title = document.querySelector('title');
    if (!title) return;
    blurTabTitleCore(pattern, title);
  };

  const escapeRegExp = (str) => {
    return str.replace(/([\(\)\{\}\+\*\?\[\]\.\^\$\|\\])/g, '\\$1');
  };

  const keywords2RegExp = (keywords, mode, matchCase) => {
    return new RegExp(
      (keywords || '').split(/\n/).filter(k => !!k.trim()).map(k => `(?:${mode === 'regexp' ? k.trim() : escapeRegExp(k.trim())})`).join('|'),
      matchCase ? '' : 'i'
    );
  };

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle']));
    unblur();
    unblurTabTitle();
    if (status === 'disabled' || !keywords || keywords.trim() === '') return;
    const pattern = keywords2RegExp(keywords, mode, !!matchCase);
    blur(pattern, { showValue, blurInput });
    blurTitle && blurTabTitle(pattern);
  });
  const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle']));
  if (status === 'disabled' || !keywords || keywords.trim() === '') return;
  window.addEventListener('resize', () => {
    inputs.forEach((input) => {
      input.element.dispatchEvent(new InputEvent('input', { data: input.value }));
    });
  })
  const pattern = keywords2RegExp(keywords, mode, !!matchCase);
  blur(pattern, { showValue, blurInput });
  blurTitle && blurTabTitle(pattern)
})();