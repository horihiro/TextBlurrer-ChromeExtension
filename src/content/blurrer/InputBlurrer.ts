import { DOMBlurrer } from './DOMBlurrer';
import { CLASS_NAME_BLURRED, CLASS_NAME_IGNORE, CLASS_NAME_KEEP, type BlurOptions } from './IBlurrer';

const CLASS_NAME_MASK_CONTAINER = 'tb-mask-container';
const CLASS_NAME_TEXT_LAYER = 'tb-mask-text-layer';
const ID_INPUT_CLONE = 'tb-input-clone';
const ID_BLURRER_INPUT_STYLE = 'tb-input-style';
const BLURRER_INPUT_STYLE = `.${CLASS_NAME_MASK_CONTAINER} {
  border: none !important;
  overflow: hidden !important;
}

#${ID_INPUT_CLONE}, .${CLASS_NAME_MASK_CONTAINER}, .${CLASS_NAME_TEXT_LAYER} {
  position: absolute !important;
  border: none !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

#${ID_INPUT_CLONE} {
  visibility: hidden !important;
  white-space-collapse: preserve !important;
}`;


export class InputBlurrer extends DOMBlurrer {

  private inputObjects: { element: HTMLInputElement, masks: any, isObserved: boolean, pattern: RegExp, options: BlurOptions, root: Element }[] = [];

  blur(pattern: RegExp, options: BlurOptions, target: Element) {
    const observed = target || document.body;

    const style = document.createElement('style');
    style.innerHTML = BLURRER_INPUT_STYLE;
    style.id = ID_BLURRER_INPUT_STYLE;
    !observed.querySelector(`#${style.id}`) && (observed == document.body ? document.head : observed).appendChild(style);
    this.observedNodes.push(observed);

    if (!this.observer) {
      this.observer = new MutationObserver((records) => {
        this.blurInput(pattern, options, target);
      });
    }
    this.blurInput(pattern, options, target);
    this.observer.observe(observed, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  stopBlurring(): void {
    if (!this.observer) return;

    this.observer.disconnect();
    delete this.observer

    this.inputObjects.forEach((inputObj) => {
      inputObj.element.removeEventListener('input', this.inputOnInput);
      inputObj.element.removeEventListener('focus', this.inputOnFocus);
      inputObj.element.removeEventListener('blur', this.inputOnBlur);
    });
    this.inputObjects.length = 0;
    const m = this.observedNodes.reduce((array, target) => {
      const BLURRER_INPUT_STYLE = target.querySelector(`#${ID_BLURRER_INPUT_STYLE}`);
      BLURRER_INPUT_STYLE && BLURRER_INPUT_STYLE.parentNode.removeChild(BLURRER_INPUT_STYLE);

      array.push(...Array.from(target.querySelectorAll(`.${CLASS_NAME_MASK_CONTAINER}`)));
      array.push(...Array.from(target.querySelectorAll(`#${ID_INPUT_CLONE}`)));
      return array;
    }, []);
    this.observedNodes.length = 0;

    if (m.length === 0) return;
    const now = Date.now();
    m.forEach((mask) => {
      mask.parentNode && mask.parentNode.removeChild(mask);
    });

    console.debug(`Took ${Date.now() - now} ms`);
  }

  static getBackgroundColorAlongDOMTree(element): string {
    if (element == document) return '';
    const computedStyle = getComputedStyle(element);
    return (!/(?:^| )rgba *\( *\d+ *, *\d+ *, *\d+ *, *0 *\)(?:$| )/.test(computedStyle.getPropertyValue('background-color')))
      ? computedStyle.getPropertyValue('background-color').replace(/rgba *\( *(\d+) *, *(\d+) *, *(\d+) *, *[^)]+ *\)/, 'rgb($1, $2, $3)')
      : InputBlurrer.getBackgroundColorAlongDOMTree(element.parentNode);
  }

  blurInput(pattern: RegExp, options: BlurOptions, target: Element): void {
    if (!['HTMLBodyElement', 'ShadowRoot'].includes(Object.prototype.toString.call(target).slice(8, -1))) return;
    this.inputObjects = [...Array.from(target.querySelectorAll('input'))].reduce((inputs, input) => {
      const inputObj = (() => {
        const array = inputs.filter((inputObj) => inputObj.element == input);
        if (array.length > 0) return array[0];
        inputs.push({
          element: input,
          masks: {},
          isObserved: false,
          root: target,
          pattern,
          options,
        });
        return inputs[inputs.length - 1];
      })();
      if (inputObj.isObserved) return inputs;
      inputObj.isObserved = true;
      inputObj.element.addEventListener('input', this.inputOnInput.bind(inputObj));
      inputObj.element.addEventListener('focus', this.inputOnFocus.bind(this));
      inputObj.element.addEventListener('blur', this.inputOnBlur.bind(this));
      inputObj.element.dispatchEvent(new InputEvent('input', { data: inputObj.element.value }));
      return inputs;
    }, this.inputObjects);
    this.blurInShadowRoot(pattern, options, target);
  }

  inputOnInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const inputObj = (this as unknown) as {options: BlurOptions, pattern: RegExp, root: Element, masks: {}}; // .inputObjects.filter(i => i.element == input)[0];
    if (!inputObj) return;

    const { options, pattern, root } = inputObj;

    const patternStr = `/${pattern.source}/${pattern.flags}`;
    if (!inputObj.masks[patternStr]) inputObj.masks[patternStr] = [];
    while (inputObj.masks[patternStr].length > 0) {
      inputObj.masks[patternStr][0].parentNode && inputObj.masks[patternStr][0].parentNode.removeChild(inputObj.masks[patternStr][0]);
      inputObj.masks[patternStr].shift();
    }
    inputObj.masks[patternStr].length = 0;

    if (!pattern.test(input.value)) return;

    const clone = ((): HTMLElement => {
      return root.querySelector(`#${ID_INPUT_CLONE}`) || document.createElement('div');
    })();
    if (!clone.parentNode) {
      clone.id = ID_INPUT_CLONE;
      clone.classList.add(CLASS_NAME_IGNORE);
      root.appendChild(clone);
    }
    clone.textContent = '';
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
      blurredSpan.classList.add(CLASS_NAME_IGNORE);
      blurredSpan.textContent = matched.shift();
      if (size > 5) blurredSpan.style.filter = `blur(${size}px)`;
      clone.insertBefore(blurredSpan, referenceNode);
      clone.insertBefore(document.createTextNode(t), referenceNode);

      const mask = document.createElement('div');
      mask.classList.add(CLASS_NAME_MASK_CONTAINER);
      mask.classList.add(CLASS_NAME_IGNORE);
      const content = document.createElement('div');
      content.classList.add(CLASS_NAME_TEXT_LAYER);
      content.classList.add(CLASS_NAME_BLURRED);
      content.classList.add(CLASS_NAME_IGNORE);
      content.textContent = blurredSpan.textContent;
      content.style.setProperty('width', '100%');
      content.style.setProperty('height', '100%');
      options?.showValue && content.setAttribute('title', blurredSpan.textContent);
      mask.addEventListener('click', () => {
        input.focus();
      })
      input.parentNode.appendChild(mask);
      mask.appendChild(content);

      const blurredBoundingBox = blurredSpan.getBoundingClientRect();

      for (let s in inputStyle) {
        if (!isNaN(parseInt(s))) continue;
        if (!['position', 'filter', 'margin', 'padding', 'border', 'top', 'left', 'overflow', 'height', 'width', 'outline', 'inset', 'line-height'].includes(s)) {
          mask.style.setProperty(s, inputStyle.getPropertyValue(s));
        }
      }

      mask.style.setProperty('line-height', 'normal');
      const verticalGap = parseFloat(inputStyle.getPropertyValue('height')) - parseFloat(inputStyle.getPropertyValue('font-size'));
      const isBorderBox = inputStyle.getPropertyValue('box-sizing') === 'border-box';
      mask.style.setProperty('left', `${blurredSpan.offsetLeft + input.offsetLeft
        + (isBorderBox ? 0 : parseFloat(inputStyle.getPropertyValue('border-left-width')))
        }px`);
      mask.style.setProperty('top', `${
        input.offsetTop + (isBorderBox ? 0 : parseFloat(inputStyle.getPropertyValue('border-top-width')) + parseFloat(inputStyle.getPropertyValue('padding-top'))) + verticalGap / 2}px`);
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

      mask.style.setProperty('background-color', InputBlurrer.getBackgroundColorAlongDOMTree(input));
      e.isTrusted && mask.style.setProperty('display', 'none');

      inputObj.masks[patternStr].push(mask);
    });
  }

  inputOnFocus(e) {
    const input = e.target;
    const inputObj = this.inputObjects.filter(i => i.element == input)[0];
    if (!inputObj) return;
    for (let p in inputObj.masks) {
      inputObj.masks[p].forEach(m => m.style.setProperty('display', 'none'));
    }
  }

  inputOnBlur(e) {
    const input = e.target;
    const inputObj = this.inputObjects.filter(i => i.element == input)[0];
    if (!inputObj) return;
    for (let p in inputObj.masks) {
      inputObj.masks[p].forEach(m => m.style.setProperty('display', ''));
    }
  }
}