document.addEventListener('DOMContentLoaded', async (e) => {
  const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle']));

  const applyButton = document.querySelector('#applyButton');
  const patternInput = document.querySelector('#patternInput');
  const statusCheckbox = document.querySelector('#statusCheckbox');
  const caseCheckbox = document.querySelector('#caseCheckbox');
  const regexpCheckbox = document.querySelector('#regexpCheckbox');
  const showValueCheckbox = document.querySelector('#showValueCheckbox');
  const blurInputCheckbox = document.querySelector('#blurInputCheckbox');
  const blurTitleCheckbox = document.querySelector('#blurTitleCheckbox');
  const _bufferTextArea = document.querySelector('#_bufferTextArea');

  const COLOR_DEFAULT = getComputedStyle(_bufferTextArea).getPropertyValue('background-color');
  const COLOR_WARNING = '#FFA500';
  const COLOR_ERROR = '#FF4500';

  const minRowTextArea = 10;
  const styleTextArea = getComputedStyle(patternInput);
  const textAreaPaddingLeft = parseInt(styleTextArea.getPropertyValue('padding-left'));
  const textAreaPaddingTop = parseInt(styleTextArea.getPropertyValue('padding-top'));
  const textAreaLineHeight = parseInt(styleTextArea.getPropertyValue('line-height'));

  let savedKeywords = '';
  let savedMatchCase = false;
  let savedMode = false;
  let savedShowValue = false;
  let savedBlurInput = false;
  let savedBlurTitle = false;
  let validationResults = [];
  let pointedRow = -1;

  const hasCaptureGroups = (regexStr) => {
    return new Promise((resolve) => {
      if (regexStr === '') resolve(false);
      try {
        const simpler = new RegExp(regexStr).source.replace(/\\.|\[[^\]]*\]/g, "x");
        resolve(/\([^?]/.test(simpler) || /\(\?</.test(simpler));
      } catch {
        resolve(true);
      }
    });
  }
  const validateRegExp = (pattern) => {
    return new Promise((resolve) => {
      if (pattern === '') resolve(true);
      try {
        new RegExp(pattern);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  // based on https://stackoverflow.com/questions/3697096/finding-number-of-lines-in-an-html-textarea#answer-45252132
  const getLineCountForRenderedText = (textarea, text) => {
    return new Promise((resolve) => {
      const cs = window.getComputedStyle(textarea);
      const pl = parseInt(cs.paddingLeft);
      const pr = parseInt(cs.paddingRight);
      const lh = parseInt(cs.lineHeight);

      // [cs.lineHeight] may return 'normal', which means line height = font size.
      if (isNaN(lh)) lh = parseInt(cs.fontSize);

      // Copy content width.
      _bufferTextArea.style.width = (textarea.clientWidth - pl - pr) + 'px';

      // Copy text properties.
      _bufferTextArea.style.font = cs.font;
      _bufferTextArea.style.letterSpacing = cs.letterSpacing;
      _bufferTextArea.style.whiteSpace = cs.whiteSpace;
      _bufferTextArea.style.wordBreak = cs.wordBreak;
      _bufferTextArea.style.wordSpacing = cs.wordSpacing;
      _bufferTextArea.style.wordWrap = cs.wordWrap;

      // Copy value.
      _bufferTextArea.value = text;

      const result = Math.floor(_bufferTextArea.scrollHeight / lh);
      if (result == 0) result = 1;
      resolve(result);
    });
  };

  const validateLines = async (lines, onlyLineCounting) => {
    return await lines.reduce(async (prev, curr) => {
      const numOfLine = await getLineCountForRenderedText(patternInput, curr);
      const array = await prev;
      const result = {
        numOfLine,
        isValid: true
      };
      if (onlyLineCounting) {
        // if (curr.length == 1) result.reason = 'Warning:\n  One character matching might cause performance issue.';
      } else if (!(await validateRegExp(curr))) {
        result.isValid = false;
        result.reason = 'Error:\n  Failed to create RegExp object.\n  Check if this is a valid regular expression string.';
      } else if (await hasCaptureGroups(curr)) {
        result.isValid = false;
        result.reason = 'Error:\n  This string might contain capture-group that should be non-capture-group.\n  Replace a pair of `(` and `)` to `(?:` and `)`.';
      } else if (/^(?:\.|(?:\\[^\\])|(?:\[[^\]]+\]))(?:\?|\*|\+|\{,?1\}|\{1,(?:\d+)?\})?$/.test(curr)) {
        result.reason = 'Warning:\n  One character matching might cause performance issue.';
      }
      array.push(result);
      return array;
    }, []);
  }

  const renderBackground = async () => {
    const lines = patternInput.value.split(/\n/);
    if (lines.length == 0) {
      applyButton.disabled = false;
      return;
    }
    if (regexpCheckbox.checked) {
      applyButton.disabled = false;
    }
    validationResults = await validateLines(lines, !regexpCheckbox.checked);
    applyButton.disabled = !validationResults.every(r => r.isValid) ||
    (
      patternInput.value === savedKeywords &&
      caseCheckbox.checked === savedMatchCase &&
      showValueCheckbox.checked === savedShowValue &&
      regexpCheckbox.checked === savedMode && 
      blurInputCheckbox.checked === savedBlurInput && 
      blurTitleCheckbox.checked === savedBlurTitle
    );
    const re = /\*(\d+)( - [\d.]+px\))$/;
    const bgColors = validationResults.reduce((prev, curr, pos, array) => {
      const backgroundColor = curr.isValid ? (!curr.reason ? COLOR_DEFAULT : COLOR_WARNING) : COLOR_ERROR;
      if (pos == 0) {
        prev.push(`${backgroundColor} calc(var(--l)*0 - ${patternInput.scrollTop}px) calc(var(--l)*${curr.numOfLine} - ${patternInput.scrollTop}px)`);
        return prev;
      }
      const start = parseInt(prev[prev.length - 1].match(re)[1]);
      if (curr.isValid == array[pos - 1].isValid && !!curr.reason == !!array[pos - 1].reason) {
        prev[prev.length - 1] = prev[prev.length - 1].replace(re, `*${start + curr.numOfLine}$2`);
        return prev;
      }
      prev.push(`${backgroundColor} calc(var(--l)*${start} - ${patternInput.scrollTop}px) calc(var(--l)*${start + curr.numOfLine} - ${patternInput.scrollTop}px)`);
      return prev;
    }, []);
    if (bgColors.length > 0) {
      const start = parseInt(bgColors[bgColors.length - 1].match(re)[1]);
      bgColors.push(`${COLOR_DEFAULT} calc(var(--l)*${start} - ${patternInput.scrollTop}px) calc(var(--l)*${start + 1} - ${patternInput.scrollTop}px)`);
      patternInput.setAttribute('rows', start > minRowTextArea ? start : minRowTextArea);
    }

    document.querySelector('head > style').innerHTML = `
textarea#${patternInput.id} {
  background: linear-gradient(
  ${bgColors.join(',\n  ')}
  ) 0 8px no-repeat, ${COLOR_DEFAULT};
}`;
  }

  applyButton.addEventListener('click', async (e) => {
    await chrome.storage.local.set({
      'status': !statusCheckbox.checked ? 'disabled' : '',
      'keywords': patternInput.value,
      'mode': regexpCheckbox.checked ? 'regexp' : 'text',
      'matchCase': caseCheckbox.checked,
      'showValue': showValueCheckbox.checked,
      'blurInput': blurInputCheckbox.checked,
      'blurTitle': blurTitleCheckbox.checked,
    });
    patternInput.focus();
    savedKeywords = patternInput.value;
    savedMode = regexpCheckbox.checked;
    savedMatchCase = caseCheckbox.checked;
    savedShowValue = showValueCheckbox.checked;
    savedBlurInput = blurInputCheckbox.checked;
    savedBlurTitle = blurTitleCheckbox.checked;
    e.target.disabled = true;
  });

  statusCheckbox.addEventListener('change', async (e) => {
    caseCheckbox.disabled =
      showValueCheckbox.disabled =
      blurInputCheckbox.disabled =
      blurTitleCheckbox.disabled = 
      regexpCheckbox.disabled =
      patternInput.disabled = !e.target.checked;
    applyButton.disabled = !e.target.checked || !validationResults.every(r => r.isValid);

    await chrome.storage.local.set({
      "status": !e.target.checked ? 'disabled' : ''
    });
    if (!e.target.checked) {
      document.querySelector('head > style').innerHTML = '';
      return;
    }

    await renderBackground();

    patternInput.focus();
  });
  regexpCheckbox.addEventListener('change', async (e) => {
    patternInput.focus();
    patternInput.style.background = COLOR_DEFAULT;

    patternInput.style.background = '';
    await renderBackground();
  });
  caseCheckbox.addEventListener('change', async (e) => {
    await renderBackground();
    patternInput.focus();
  });

  showValueCheckbox.addEventListener('change', async (e) => {
    await renderBackground();
    patternInput.focus();
  });

  blurInputCheckbox.addEventListener('change', async (e) => {
    await renderBackground();
    patternInput.focus();
  });

  blurTitleCheckbox.addEventListener('change', async (e) => {
    await renderBackground();
    patternInput.focus();
  });

  patternInput.addEventListener('scroll', renderBackground);
  patternInput.addEventListener('scroll', () => {
    if (patternInput.scrollLeft < textAreaPaddingLeft) patternInput.scrollLeft = 0;
    if (patternInput.scrollTop < textAreaPaddingTop) patternInput.scrollTop = 0;
  });
  patternInput.addEventListener('input', renderBackground);
  patternInput.addEventListener('mousemove', (e) => {
    if (e.offsetY + patternInput.scrollTop - textAreaPaddingTop < 0) return;
    const row = parseInt((e.offsetY + patternInput.scrollTop - textAreaPaddingTop) / textAreaLineHeight) + 1;
    if (pointedRow == row) return;
    pointedRow = row;
    validationResults.reduce((prev, curr) => {
      if (prev < 0) return -1;
      prev -= curr.numOfLine;
      if (prev > 0) {
        patternInput.title = '';
        return prev;
      }
      patternInput.setAttribute('title', curr.reason || '');
      return -1;
    }, row);
  }, false);
  patternInput.addEventListener('mouseout', () => {
    pointedRow = -1;
  });

  statusCheckbox.checked = status !== 'disabled';
  savedMatchCase = caseCheckbox.checked = matchCase;
  savedShowValue = showValueCheckbox.checked = showValue;
  savedBlurInput = blurInputCheckbox.checked = blurInput;
  savedBlurTitle = blurTitleCheckbox.checked = blurTitle;
  savedMode = regexpCheckbox.checked = mode === 'regexp';
  savedKeywords = patternInput.value = keywords || '';


  caseCheckbox.disabled =
    blurInputCheckbox.disabled =
    blurTitleCheckbox.disabled =
    showValueCheckbox.disabled =
    regexpCheckbox.disabled =
    patternInput.disabled =
    applyButton.disabled = !statusCheckbox.checked;

  patternInput.focus();
  if (statusCheckbox.checked) {
    await renderBackground(patternInput.value.split(/\n/));
  }
  applyButton.disabled = true;
});
