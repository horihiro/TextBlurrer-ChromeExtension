(async () => {
  const src = chrome.runtime.getURL('util/common.js');
  const { escapeRegExp } = await import(src);
  const w = window;
  const exElmList = ['html', 'title', 'script', 'noscript', 'style', 'meta', 'link', 'head', 'textarea', '#comment'];
  const CLASS_NAME_BLURRED = 'tb-blurred';
  const CLASS_PREFIX_BLURRED_GROUP = 'tb-blurred-group-';
  const CLASS_NAME_KEEP = 'tb-keep-this';
  const ATTR_NAME_ORIGINAL_TITLE = 'data-tb-original-title';
  const CLASS_NAME_MASK_CONTAINER = 'tb-mask-container';
  const CLASS_NAME_TEXT_LAYER = 'tb-mask-text-layer';
  const ID_INPUT_CLONE = 'tb-input-clone';
  const ID_GLOBAL_STYLE = '__blurring-style';
  const GLOBAL_STYLE = `.${CLASS_NAME_BLURRED} {
  filter: blur(5px)!important;
}
.${CLASS_NAME_MASK_CONTAINER} {
  border: none!important;
  overflow: hidden!important;
}

#${ID_INPUT_CLONE}, .${CLASS_NAME_MASK_CONTAINER}, .${CLASS_NAME_TEXT_LAYER} {
  position: absolute!important;
  border: none!important;
  overflow: hidden!important;
  white-space: nowrap!important;
}

#${ID_INPUT_CLONE} {
  visibility: hidden!important;
  white-space-collapse: preserve!important;
}`;

  const send2popup = async (message) => {
    chrome.runtime.sendMessage(message);
  }

  chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.method === 'getUrl') {
      await send2popup({
        method: 'getUrlResponse',
        isTop: window.top === window,
        numOfChildren: window.frames.length,
        url: location.href
      });
    }
  });

  const getStateOfContentEditable = (element) => {
    if (element.contentEditable && element.contentEditable !== 'inherit') return element.contentEditable;
    return element.parentNode ? getStateOfContentEditable(element.parentNode) : '';
  };
  const inputs = [];

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

  const BLOCK_ELEMENT_NAMES = ['ADDRESS', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'NOSCRIPT', 'SCRIPT', 'PL', 'P', 'PRE', 'TABLE', 'UL'];
  const blockContents = (node) => {
    return Array.from(node.childNodes).reduce((lines, child) => {
      if (child.nodeType == 8) {
        return lines;
      } if (child.nodeType >= 3) {
        lines[lines.length - 1] += child.textContent;
      } else {
        const childText = blockContents(child);
        !BLOCK_ELEMENT_NAMES.includes(child.nodeName) && (lines[lines.length - 1] += childText.shift());
        lines.push(...childText);
        BLOCK_ELEMENT_NAMES.includes(child.nodeName) && lines.push('');
      }
      return lines;
    }, [""]);
  }

  const getPositionFromDiff = (diff, positions) => {
    let posPre = 0, posPost = 0, index = 0;
    const ret = [];

    diff.some((df) => {
      if (!df.added) posPre += df.count;
      if (!df.removed) posPost += df.count;
      while (true) {
        if (posPost <= positions[index] - 1 || index >= positions.length) break;

        ret.push(posPre - posPost + positions[index]);
        index++;
      }
      return index >= positions.length;
    });
    return ret;
  }

  const isBlurred = (node) => {
    do {
      if (node.classList?.contains(CLASS_NAME_BLURRED)) return true;
      node = node.parentNode;
    } while (node);
    return false;
  }

  const getElementsToBeBlurred = (pattern, target, options) => {
    let textNode = getNextTextNode(target, target), pos = 0;
    if (!textNode) return;
    let _startsFrom = 0;
    const blockedContents = blockContents(target).map((l, index) => {
      const startsFrom = _startsFrom;
      _startsFrom += l.length;
      return {
        index,
        contents: l,
        startsFrom,
      }
    });
    _startsFrom = 0;
    const formattedBlockedContents = blockedContents.map(l => {
      const contents = inlineFormatting(l.contents)
      const startsFrom = _startsFrom;
      const matches = [];
      let start = 0;
      while (true) {
        const match = contents.slice(start).match(pattern);
        if (!match) break;
        matches.push({
          keyword: match[0],
          index: start + match.index,
        });
        start += match.index + match[0].length;
      }
      _startsFrom += contents.length;
      return {
        index: l.index,
        contents,
        matches: matches.length > 0 ? matches : null,
        startsFrom,
      }
    });
    textNode = target;
    formattedBlockedContents.filter(l => !!l.matches).forEach((block) => {
      const formatted = block.contents;
      const original = blockedContents[block.index].contents;
      const diff = Diff.diffChars(original, formatted);
      block.matches && block.matches.forEach((match) => {
        const positions = getPositionFromDiff(diff, [match.index, match.index + match.keyword.length - 1]);

        const startIndex = blockedContents[block.index].startsFrom + positions[0];
        while (pos <= startIndex) {
          textNode = getNextTextNode(textNode, target);
          pos += textNode.textContent.length;
        }
        const from = {
          node: textNode,
          index: 0,
        };
        const textNodeArray = [textNode];

        const endIndex = blockedContents[block.index].startsFrom + positions[1];
        while (pos <= endIndex) {
          textNode = getNextTextNode(textNode, target);
          textNodeArray.push(textNode);
          pos += textNode.textContent.length;
        }
        const to = {
          node: textNode,
          index: 0,
        };
        const str1 = textNodeArray.map(t => t.textContent).join('');
        const str2 = inlineFormatting(str1);
        const partialDiff = Diff.diffChars(str1, str2);
        const partialMatch = str2.match(pattern) || str2.match(match.keyword);
        const partialPositions = getPositionFromDiff(partialDiff, [partialMatch.index, partialMatch.index + partialMatch[0].length - 1]);
        from.index = partialPositions[0];
        to.index = to.node.textContent.length - (str1.length - partialPositions[1]);

        const nodeBeforeBlurred = document.createTextNode(from.node.textContent.slice(0, from.index));
        const nodeAfterBlurred = document.createTextNode(to.node.textContent.slice(to.index + 1));
        const insertNodes = [];
        const removeNodes = [];
        if (!from.node.parentNode || !to.node.parentNode
          || exElmList.includes(from.node.parentNode.nodeName.toLowerCase()) || exElmList.includes(from.node.parentNode.nodeName.toLowerCase())
          || isBlurred(from.node.parentNode) || isBlurred(to.node.parentNode)) return;

        if (from.node == to.node) {
          const computedStyle = getComputedStyle(from.node.parentNode);
          const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);
          if (from.node.textContent === match.keyword && computedStyle.filter === 'none') {
            from.node.parentNode.classList.add(CLASS_NAME_BLURRED);
            from.node.parentNode.classList.add(CLASS_NAME_KEEP);
            if (options?.showValue) {
              const originalTitle = from.node.parentNode.getAttribute('title');
              if (originalTitle) {
                from.node.parentNode.setAttribute('data-tb-original-title', originalTitle);
              }
              from.node.parentNode.setAttribute('title', match.keyword);
            }
            if (size > 5) from.node.parentNode.style.filter += ` blur(${size}px)`;
            return;
          }
          const nodeBlurred = document.createElement('span');
          nodeBlurred.classList.add(CLASS_NAME_BLURRED);
          nodeBlurred.textContent = from.node.textContent.slice(from.index, to.index + 1);
          options?.showValue && nodeBlurred.setAttribute('title', match.keyword);
          insertNodes.push({ node: nodeBeforeBlurred, refNode: from.node, target: from.node.parentNode });
          insertNodes.push({ node: nodeBlurred, refNode: from.node, target: from.node.parentNode });
          insertNodes.push({ node: nodeAfterBlurred, refNode: from.node, target: from.node.parentNode });
          removeNodes.push(from.node);
        } else {
          const now = Date.now();

          const nodeBlurredFrom = document.createElement('span');
          nodeBlurredFrom.classList.add(CLASS_NAME_BLURRED);
          nodeBlurredFrom.classList.add(`${CLASS_PREFIX_BLURRED_GROUP}${now}`);
          nodeBlurredFrom.textContent = from.node.textContent.slice(from.index);
          insertNodes.push({ node: nodeBeforeBlurred, refNode: from.node, target: from.node.parentNode });
          insertNodes.push({ node: nodeBlurredFrom, refNode: from.node, target: from.node.parentNode });

          let workingTextNode = getNextTextNode(from.node, target);
          removeNodes.push(from.node);
          while (workingTextNode != to.node) {
            const nodeBlurred = document.createElement('span');
            nodeBlurred.textContent = workingTextNode.textContent;
            nodeBlurred.classList.add(CLASS_NAME_BLURRED);
            nodeBlurred.classList.add(`${CLASS_PREFIX_BLURRED_GROUP}${now}`);
            insertNodes.push({ node: nodeBlurred, refNode: workingTextNode, target: workingTextNode.parentNode });
            removeNodes.push(workingTextNode);
            workingTextNode = getNextTextNode(workingTextNode, target);
          }

          const nodeBlurredTo = document.createElement('span');
          nodeBlurredTo.classList.add(CLASS_NAME_BLURRED);
          nodeBlurredTo.classList.add(`${CLASS_PREFIX_BLURRED_GROUP}${now}`);
          nodeBlurredTo.textContent = to.node.textContent.slice(0, to.index + 1);
          insertNodes.push({ node: nodeBlurredTo, refNode: to.node, target: to.node.parentNode });
          insertNodes.push({ node: nodeAfterBlurred, refNode: to.node, target: to.node.parentNode });
          removeNodes.push(to.node);
        }
        insertNodes.forEach((n) => {
          n.target.insertBefore(n.node, n.refNode);
          if (!isBlurred(n.node)) return;
          const node = n.node.nodeName === '#text' ? n.node.parentNode : n.node;
          options?.showValue && node.setAttribute('title', match.keyword);
          const computedStyle = getComputedStyle(node);
          const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);
          if (size > 5) node.style.filter += ` blur(${size}px)`;
        });
        removeNodes.forEach((n) => {
          n.parentNode.removeChild(n);
        });
        textNode = nodeAfterBlurred;
      });
    });
  };

  const blurByRegExpPattern = (pattern, options, target) => {
    const now = Date.now();

    if (target.classList && target.classList.contains(CLASS_NAME_BLURRED) && !pattern.test(target.textContent)) {
      if (!Array.from(target.classList).some((className) => className.startsWith(CLASS_PREFIX_BLURRED_GROUP))) unblurCore(target);
      else {
        const groupedClass = Array.from(target.classList).filter((className) => className.startsWith(CLASS_PREFIX_BLURRED_GROUP))[0];
        const blurredGroup = document.querySelectorAll(`.${groupedClass}`);
        !pattern.test(Array.from(blurredGroup).map((blurred) => blurred.textContent).join('')) && blurredGroup.forEach((blurred) => {
          unblurCore(blurred);
        });
      }
    }
    getElementsToBeBlurred(pattern, target || document.body, options);

    const blurInShadowRoot = (target) => {
      target.shadowRoot && blur(pattern, options, target.shadowRoot);
      target.childNodes.forEach((n) => {
        n.nodeName !== '#text' && blurInShadowRoot(n);
      });
    };
    blurInShadowRoot(target);

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
      return this.root.querySelector(`#${ID_INPUT_CLONE}`) || document.createElement('div');
    })();
    if (!clone.parentNode) {
      clone.id = ID_INPUT_CLONE;
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
      blurredSpan.classList.add(CLASS_NAME_BLURRED);
      blurredSpan.textContent = matched.shift();
      if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
      clone.insertBefore(blurredSpan, referenceNode);
      clone.insertBefore(document.createTextNode(t), referenceNode);

      const mask = document.createElement('div');
      mask.classList.add(CLASS_NAME_MASK_CONTAINER);
      mask.appendChild(document.createElement('div'));
      mask.lastChild.classList.add(CLASS_NAME_TEXT_LAYER);
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
      mask.lastChild.classList.add(CLASS_NAME_BLURRED);
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
    style.innerHTML = GLOBAL_STYLE;
    style.id = ID_GLOBAL_STYLE;
    !observed.querySelector(`#${style.id}`) && (observed == document.body ? document.head : observed).appendChild(style);
    observedNodes.push(observed);
    if (!w.__observer) {
      w.__observer = new MutationObserver((records) => {
        if (!records.some(record => {
          return record.removedNodes.length > 0 || Array.from(record.addedNodes).some(node => {
            return !['SCRIPT', 'STYLE', '#comment'].includes(node.nodeName);
          });
        })) return;
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
        w.__observer.disconnect();
        targets.forEach(target => blurByRegExpPattern(pattern, options, target));
        observedNodes.forEach((target) => {
          w.__observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true
          });
        });
      });
    }
    const inputClone = (() => {
      return document.querySelector(`#${ID_INPUT_CLONE}`) || document.createElement('div');
    })();
    if (!inputClone.parentNode) {
      inputClone.id = ID_INPUT_CLONE;
      document.body.appendChild(inputClone);
    }

    blurByRegExpPattern(pattern, options, observed);
    w.__observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };
  const unblur = () => {
    if (!w.__observer) return;
    w.__observer.disconnect();
    delete w.__observer

    inputs.forEach((inputObj) => {
      inputObj.element.removeEventListener('input', inputObj.inputHandler);
      inputObj.element.removeEventListener('focus', inputOnFocus);
      inputObj.element.removeEventListener('blur', inputOnBlur);
      for (let pattern in inputObj.masks) {
        inputObj.masks[pattern].forEach((mask) => {
          mask.parentNode.removeChild(mask);
        })
      }
    });
    inputs.length = 0;

    const m = observedNodes.reduce((array, target) => {
      const GLOBAL_STYLE = target.querySelector(`#${ID_GLOBAL_STYLE}`);
      GLOBAL_STYLE && GLOBAL_STYLE.parentNode.removeChild(GLOBAL_STYLE);
      const inputClone = target.querySelector(`#${ID_INPUT_CLONE}`);
      inputClone && inputClone.parentNode.removeChild(inputClone);

      array.push(...target.querySelectorAll(`.${CLASS_NAME_BLURRED}`));
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
    if (n.classList.contains(CLASS_NAME_BLURRED) && n.classList.contains(CLASS_NAME_KEEP)) {
      // restore title
      const originalTitle = n.getAttribute(ATTR_NAME_ORIGINAL_TITLE);
      if (originalTitle) {
        n.setAttribute('title', originalTitle);
        n.removeAttribute(ATTR_NAME_ORIGINAL_TITLE);
      }
      else n.removeAttribute('title');

      // restore class
      n.classList.remove(CLASS_NAME_BLURRED);
      n.classList.remove(CLASS_NAME_KEEP);
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
    if (title.getAttribute(ATTR_NAME_ORIGINAL_TITLE)) {
      title.textContent = title.getAttribute(ATTR_NAME_ORIGINAL_TITLE);
      title.removeAttribute(ATTR_NAME_ORIGINAL_TITLE);
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
      if (!target.getAttribute(ATTR_NAME_ORIGINAL_TITLE)) {
        target.setAttribute(ATTR_NAME_ORIGINAL_TITLE, title);
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
    const title = document.querySelector('title');
    title && blurTabTitleCore(pattern, title);
    w.__titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    })
  };

  const keywords2RegExp = (keywords, mode, matchCase) => {
    return new RegExp(
      (keywords || '').split(/\n/).filter(k => !!k.trim()).map(k => `(?:${mode === 'regexp' ? k.trim() : escapeRegExp(k.trim())})`).join('|'),
      matchCase ? '' : 'i'
    );
  };

  const init = async () => {
    const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle, exclusionUrls } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle', 'exclusionUrls']));
    unblur();
    unblurTabTitle();
    if (status === 'disabled' || !keywords || keywords.trim() === '') return;
    if (exclusionUrls && exclusionUrls.split(/\n/).length > 0 && exclusionUrls.split(/\n/).filter(l => !!l).some((url) => new RegExp(url).test(location.href))) return;

    const pattern = keywords2RegExp(keywords, mode, !!matchCase);
    blur(pattern, { showValue, blurInput });
    blurTitle && blurTabTitle(pattern);
  };
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    await init();
  });
  await init();
})();