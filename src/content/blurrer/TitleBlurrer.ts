import type { BlurOptions, IBlurrer } from './IBlurrer';

export class TitleBlurrer implements IBlurrer {
  private ATTR_NAME_ORIGINAL_TITLE:string = 'data-original-title';
  private observer: MutationObserver | null = null;

  startBlurring(pattern: RegExp, options: BlurOptions): void {
    if (!this.observer) {
      this.observer = new MutationObserver((records) => {
        records.some((record) => {
          return Array.from(record.addedNodes).some((node) => {
            if (node.nodeName === 'TITLE') {
              this.blur(pattern, options, node);
              return true;
            } else if (node.nodeName === "#text" && node.parentNode && node.parentNode.nodeName === "TITLE") {
              this.blur(pattern, options, node.parentNode);
              return true;
            }
            return false;
          });
        });
      });
    }
    const title = document.querySelector('title');
    title && this.blur(pattern, options, title);
    this.observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
  stopBlurring(): void {
    const title = document.querySelector('title');
    if (!title) return;
    if (title.getAttribute(this.ATTR_NAME_ORIGINAL_TITLE)) {
      title.textContent = title.getAttribute(this.ATTR_NAME_ORIGINAL_TITLE);
      title.removeAttribute(this.ATTR_NAME_ORIGINAL_TITLE);
    }
    if (!this.observer) return;
    this.observer.disconnect();
    this.observer = null;
  }

  blur(pattern, options, target) {
    const title = target.textContent;
    let result = title.match(pattern);
    let start = 0;
    while (result && result[0].length > 0) {
      const mask = new Array(result[0].length).fill('*').join('');
      target.textContent = target.textContent.replace(result[0], mask);
      start += result.index + mask.length;
      result = target.textContent.slice(start).match(pattern);
      if (!target.getAttribute(this.ATTR_NAME_ORIGINAL_TITLE)) {
        target.setAttribute(this.ATTR_NAME_ORIGINAL_TITLE, title);
      }
    }
  }
};
