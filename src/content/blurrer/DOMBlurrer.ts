import { CLASS_NAME_BLURRED, CLASS_NAME_IGNORE, CLASS_NAME_KEEP, type BlurOptions, type IBlurrer } from './IBlurrer';
import { diffChars } from 'diff';

const BLOCK_ELEMENT_NAMES = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'NOSCRIPT',
  'OL', 'P', 'PRE', 'SCRIPT', 'SECTION', 'TABLE', 'TFOOT', 'UL', 'VIDEO'
];

const SKIP_NODE_NAMES = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'HTML', 'TEXTAREA', 'TITLE', '#comment'];

const CLASS_PREFIX_BLURRED_GROUP = 'tb-blurred-group-';
const ATTR_NAME_ORIGINAL_TITLE = 'data-tb-original-title';
const CLASS_NAME_CODEMIRROR_EDITOR = 'cm-editor';
const ID_BLURRER_COMMON_STYLE = 'tb-common-style';
const BLURRER_COMMON_STYLE = `.${CLASS_NAME_BLURRED} {
  filter: blur(5px)!important;
}`;

export class DOMBlurrer implements IBlurrer {
  protected observer: MutationObserver;
  protected observedNodes: Element[] = [];
  startBlurring(pattern: RegExp, options: BlurOptions): void {
    this.blur(pattern, options, document.body);
  }

  stopBlurring(): void {
    if (!this.observer) return;
    this.observer.disconnect();
    delete this.observer

    const m = this.observedNodes.reduce((array, target) => {
      const BLURRER_COMMON_STYLE = target.querySelector(`#${ID_BLURRER_COMMON_STYLE}`);
      BLURRER_COMMON_STYLE && BLURRER_COMMON_STYLE.parentNode.removeChild(BLURRER_COMMON_STYLE);

      array.push(...Array.from(target.querySelectorAll(`.${CLASS_NAME_BLURRED}:not([class~="${CLASS_NAME_IGNORE}"]`)));
      return array;
    }, []);
    this.observedNodes.length = 0;

    if (m.length === 0) return;

    const now = Date.now();
    m.forEach((n) => {
      this.unblurCore(n);
    });
    console.debug(`Took ${Date.now() - now} ms`)
  }

  blur(pattern: RegExp, options: BlurOptions, target: Element) {
    const observed = target || document.body;

    const style = document.createElement('style');
    style.innerHTML = BLURRER_COMMON_STYLE;
    style.id = ID_BLURRER_COMMON_STYLE;
    !observed.querySelector(`#${style.id}`) && (observed == document.body ? document.head : observed).appendChild(style);
    this.observedNodes.push(observed);
    if (!this.observer) {
      this.observer = new MutationObserver((records) => {
        if (!records.some(record => {
          return ['characterData', 'attributes'].includes(record.type) || record.removedNodes.length > 0 || Array.from(record.addedNodes).some(node => {
            return !SKIP_NODE_NAMES.includes(node.nodeName);
          });
        })) return;
        const targets = records.reduce((targets, record) => {
          if (SKIP_NODE_NAMES.includes(record.target.nodeName)) return targets;
          const isContained = targets.some((target) => {
            return target.contains(record.target);
          });
          if (isContained) return targets;
          let blockElement = record.target;
          while (blockElement && !BLOCK_ELEMENT_NAMES.includes(blockElement.nodeName) && blockElement.parentNode) {
            blockElement = blockElement.parentNode;
          }
          if (!blockElement) return targets;
          const array = targets.reduce((prev, target) => {
            if (!blockElement.contains(target) && target != blockElement) {
              prev.push(target)
            }
            return prev;
          }, [] as Node[]);
          array.push(blockElement);
          return array;
        }, [] as Node[]);
        this.observer.disconnect();
        targets.forEach(target => this.blurByRegExpPattern(pattern, options, target));
        this.observedNodes.forEach((target) => {
          this.observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
          });
        });
      });
    }
    this.blurByRegExpPattern(pattern, options, observed)
    this.observer.observe(observed, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  blurByRegExpPattern(pattern, options, target: Node) {
    const now = Date.now();

    if (target instanceof Element) {
      if (target.classList && target.classList.contains(CLASS_NAME_BLURRED) && !pattern.test(target.textContent)) {
        if (!Array.from(target.classList).some((className) => className.startsWith(CLASS_PREFIX_BLURRED_GROUP))) this.unblurCore(target);
        else {
          const groupedClass = Array.from(target.classList).filter((className) => className.startsWith(CLASS_PREFIX_BLURRED_GROUP))[0];
          const blurredGroup = document.querySelectorAll(`.${groupedClass}`);
          !pattern.test(Array.from(blurredGroup).map((blurred) => blurred.textContent).join('')) && blurredGroup.forEach((blurred) => {
            this.unblurCore(blurred);
          });
        }
      }
      target.querySelectorAll(`.${CLASS_NAME_BLURRED}:not([class~="${CLASS_NAME_IGNORE}"])`).forEach((n) => { this.unblurCore(n) });
    }
    this.blockAndBlur(pattern, target || document.body, options);

    this.blurInShadowRoot(pattern, options, target);

    console.debug(`Took ${Date.now() - now} ms`)
  }

  blurInShadowRoot(pattern, options, target) {
    target.shadowRoot && this.blur(pattern, options, target.shadowRoot);
    Array.from(target.childNodes).filter((e: Node) => !SKIP_NODE_NAMES.includes(e.nodeName)).forEach((n: Node) => {
      n.nodeName !== '#text' && this.blurInShadowRoot(pattern, options, n);
    });
  };
  blockAndBlur(pattern, target, options) {
    let textNode = this.getNextTextNode(target, target), pos = 0;
    if (!textNode) return;
    let _startsFrom = 0;
    const blockedContents = this.blockContents(target).map((l, index) => {
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
      const contents = this.inlineFormatting(l.contents)
      const startsFrom = _startsFrom;
      const matches: { keyword: string, index: number }[] = [];
      let start = 0;
      while (true) {
        const match = contents.slice(start).match(pattern);
        if (!match || match[0].length == 0) break;
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
      const diff = diffChars(original, formatted);
      block.matches && block.matches.forEach((match) => {
        const positions = this.getPositionFromDiff(diff, [match.index, match.index + match.keyword.length - 1]);

        const startIndex = blockedContents[block.index].startsFrom + positions[0];
        while (pos <= startIndex) {
          textNode = this.getNextTextNode(textNode, target);
          pos += textNode.textContent.length;
        }
        const from = {
          node: textNode,
          index: 0,
        };
        const textNodeArray = [textNode];

        const endIndex = blockedContents[block.index].startsFrom + positions[1];
        while (pos <= endIndex) {
          textNode = this.getNextTextNode(textNode, target);
          textNodeArray.push(textNode);
          pos += textNode.textContent.length;
        }
        const to = {
          node: textNode,
          index: 0,
        };
        const str1 = textNodeArray.map(t => t.textContent).join('');
        const str2 = this.inlineFormatting(str1);
        const partialDiff = diffChars(str1, str2);
        const partialMatch = str2.match(pattern) || str2.match(match.keyword);
        const partialPositions = this.getPositionFromDiff(partialDiff, [partialMatch.index, partialMatch.index + partialMatch[0].length - 1]);
        from.index = partialPositions[0];
        to.index = to.node.textContent.length - (str1.length - partialPositions[1]);

        const nodeBeforeBlurred = document.createTextNode(from.node.textContent.slice(0, from.index));
        const nodeAfterBlurred = document.createTextNode(to.node.textContent.slice(to.index + 1));
        const insertNodes: { node: Node, refNode: Node, target: Node }[] = [];
        const removeNodes: Node[] = [];
        if (!from.node.parentNode || !to.node.parentNode
          || this.shouldBeSkipped(from.node) || this.shouldBeSkipped(to.node)) return;

        const currentRange = this.getCuretPosition(from.node);
        if (from.node == to.node) {
          const computedStyle = getComputedStyle(from.node.parentNode);
          const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);
          if (from.node.textContent === match.keyword && from.node.parentNode.childNodes.length == 1 && computedStyle.filter === 'none') {
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

          let workingTextNode = this.getNextTextNode(from.node, target);
          removeNodes.push(from.node);
          while (workingTextNode != to.node) {
            const nodeBlurred = document.createElement('span');
            nodeBlurred.textContent = workingTextNode.textContent;
            nodeBlurred.classList.add(CLASS_NAME_BLURRED);
            nodeBlurred.classList.add(`${CLASS_PREFIX_BLURRED_GROUP}${now}`);
            insertNodes.push({ node: nodeBlurred, refNode: workingTextNode, target: workingTextNode.parentNode });
            removeNodes.push(workingTextNode);
            workingTextNode = this.getNextTextNode(workingTextNode, target);
          }

          const nodeBlurredTo = document.createElement('span');
          nodeBlurredTo.classList.add(CLASS_NAME_BLURRED);
          nodeBlurredTo.classList.add(`${CLASS_PREFIX_BLURRED_GROUP}${now}`);
          nodeBlurredTo.textContent = to.node.textContent.slice(0, to.index + 1);
          insertNodes.push({ node: nodeBlurredTo, refNode: to.node, target: to.node.parentNode });
          insertNodes.push({ node: nodeAfterBlurred, refNode: to.node, target: to.node.parentNode });
          removeNodes.push(to.node);
        }
        insertNodes.reduce((p, n) => {
          n.target.insertBefore(n.node, n.refNode);
          if (currentRange?.endContainer && removeNodes.includes(currentRange.endContainer) && n.node.textContent && p + n.node.textContent.length >= currentRange.endOffset) {
            currentRange.startOffset = currentRange.endOffset = currentRange.endOffset - p;
            currentRange.endContainer = currentRange.startContainer = n.node.nodeName === '#text' ? n.node : Array.from(n.node.childNodes).findLast(n => n.nodeName === '#text');
            this.setCuretPosition(currentRange);
          }
          if (!this.isBlurred(n.node)) return n.node.textContent ? p + n.node.textContent.length : p;
          const element = n.node.nodeName === '#text' ? n.node.parentNode as HTMLElement : n.node as HTMLElement;
          options?.showValue && element.setAttribute('title', match.keyword);
          const computedStyle = getComputedStyle(element);
          const size = Math.floor(parseFloat(computedStyle.fontSize) / 4);
          if (size > 5) element.style.filter += ` blur(${size}px)`;
          return n.node.textContent ? p + n.node.textContent.length : p
        }, 0);
        removeNodes.forEach((n) => {
          n.parentNode?.removeChild(n);
        });
        textNode = nodeAfterBlurred;
      });
    });
  }

  getNextTextNode(e, root) {
    if (!e) return null;
    if (e.firstChild && !SKIP_NODE_NAMES.includes(e.nodeName)) return e.firstChild.nodeName === '#text' ? e.firstChild : this.getNextTextNode(e.firstChild, root);
    if (e.nextSibling) return e.nextSibling.nodeName === '#text' ? e.nextSibling : this.getNextTextNode(e.nextSibling, root);
    let parent = e.parentNode;
    while (parent != root && parent) {
      if (parent.nextSibling) return parent.nextSibling.nodeName === '#text' ? parent.nextSibling : this.getNextTextNode(parent.nextSibling, root);
      parent = parent.parentNode;
    }
    return null;
  }

  blockContents(node: Node) {
    return Array.from(node.childNodes).reduce((lines, child) => {
      if (SKIP_NODE_NAMES.includes(child.nodeName)) return lines;
      if (child.nodeType >= 3) {
        lines[lines.length - 1] += child.textContent;
      } else {
        const childText = this.blockContents(child);
        !BLOCK_ELEMENT_NAMES.includes(child.nodeName) && (lines[lines.length - 1] += childText.shift());
        lines.push(...childText);
        BLOCK_ELEMENT_NAMES.includes(child.nodeName) && lines.push('');
      }
      return lines;
    }, [""]);
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#how_does_css_process_whitespace
  inlineFormatting(str) {
    return str ? str
      .replace(/ *\n */g, '\n') // step.1
      .replace(/[\n\t]/g, ' ')  // step.2&3
      .replace(/ +/g, ' ')      // step.4
      .trim()                   // step.5
      .replace(/\u00a0/g, ' ')  // additional
      : ''
  }

  getPositionFromDiff(diff, positions) {
    let posPre = 0, posPost = 0, index = 0;
    const ret: number[] = [];

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

  shouldBeSkipped(node) {
    if (node.nodeType !== 1) return this.shouldBeSkipped(node.parentNode);

    if (this.isBlurred(node)) {
      console.debug(`Skipped. Reason: Already blurred`);
      return true;
    }
    if (SKIP_NODE_NAMES.includes(node.nodeName)) {
      console.debug(`Skipped. Reason: The nodeName is ${node.nodeName}`);
      return true;
    }
    if (!!node.closest(`.${CLASS_NAME_CODEMIRROR_EDITOR}`)) {
      console.debug(`Skipped. Reason: CodeMirror`);
      return true;
    }
    if (getComputedStyle(node).visibility === 'hidden' || node.offsetWidth === 0 || node.offsetHeight === 0 || node.getClientRects().length === 0 ){
      console.debug(`Skipped. Reason: The node is invisible`);
      return true;
    }
    // if (node.isContentEditable) {
    //   console.debug(`Skipped. Reason: The node is contentEditable`);
    //   return true;
    // }
    return false;
  }

  isBlurred(node) {
    return !!(node.nodeType == 1 ? node : node.parentNode).closest(`.${CLASS_NAME_BLURRED}`)
  }

  unblurCore(n) {
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
    const currentRange = this.getCuretPosition(n);

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
        if (currentRange) {
          switch (currentRange.endContainer) {
            case c:
              currentRange.endContainer = currentRange.startContainer = textContainer;
              currentRange.startOffset += (textContainer.textContent.length - c.textContent.length);
              currentRange.endOffset += (textContainer.textContent.length - c.textContent.length);
            case textContainer:
              this.setCuretPosition(currentRange);
          }
        }

        if (n.nextSibling?.nodeName === '#text') {
          n.previousSibling.textContent += n.nextSibling.textContent;
          if (currentRange) {
            switch (currentRange.endContainer) {
              case n.nextSibling:
                currentRange.endContainer = currentRange.startContainer = n.previousSibling;
                currentRange.endOffset = currentRange.startOffset = n.previousSibling.textContent.length - n.nextSibling.textContent.length + currentRange.startOffset;
              case n.previousSibling:
                this.setCuretPosition(currentRange);
            }
          }
          p.removeChild(n.nextSibling);
        }
        break;
      } while (true);
    });
    p.removeChild(n);
  }
  getCuretPosition(target): { startContainer: Node | null, startOffset: number, endContainer: Node | null, endOffset: number } | null {
    const selection = window.getSelection();
    if (!selection) return null;
    if (!target.isContentEditable && (!target.parentNode || !target.parentNode.isContentEditable) || selection.rangeCount == 0) return null;
    return {
      startContainer: selection.anchorNode,
      startOffset: selection.anchorOffset,
      endContainer: selection.focusNode,
      endOffset: selection.focusOffset,
    };
  }
  setCuretPosition(newRange) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(newRange.startContainer, newRange.startOffset);
    range.setEnd(newRange.endContainer, newRange.endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  };
}