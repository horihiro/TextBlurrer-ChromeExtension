document.addEventListener('DOMContentLoaded', async (e) => {
  const { status, keywords, mode, matchCase, showValue, blurInput, blurTitle, exclusionUrls } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase', 'showValue', 'blurInput', 'blurTitle', 'exclusionUrls']));

  const applyButton = document.querySelector('#applyButton');
  const patternInput = document.querySelector('#patternInput');
  const statusCheckbox = document.querySelector('#statusCheckbox');
  const caseCheckbox = document.querySelector('#caseCheckbox');
  const regexpCheckbox = document.querySelector('#regexpCheckbox');
  const showValueCheckbox = document.querySelector('#showValueCheckbox');
  const blurInputCheckbox = document.querySelector('#blurInputCheckbox');
  const blurTitleCheckbox = document.querySelector('#blurTitleCheckbox');
  const _bufferTextArea = document.querySelector('#_bufferTextArea');
  const addUrlsInCurrentTab = document.querySelector('#addUrlsInCurrentTab');
  const exclusionInput = document.querySelector('#exclusionInput');

  const COLOR_DEFAULT = getComputedStyle(_bufferTextArea).getPropertyValue('background-color');
  const COLOR_WARNING = '#FFA500';
  const COLOR_ERROR = '#FF4500';

  const minRowTextArea = 10;
  const styleTextArea = getComputedStyle(patternInput);
  const textAreaPaddingLeft = parseInt(styleTextArea.getPropertyValue('padding-left'));
  const textAreaPaddingTop = parseInt(styleTextArea.getPropertyValue('padding-top'));
  const textAreaLineHeight = parseInt(styleTextArea.getPropertyValue('line-height'));

  let savedKeywords = '';
  let savedExclusionUrls = ''
  let savedMatchCase = false;
  let savedMode = false;
  let savedShowValue = false;
  let savedBlurInput = false;
  let savedBlurTitle = false;
  const validationResults = {};

  const escapeRegExp = (str) => {
    return str.replace(/([\(\)\{\}\+\*\?\[\]\.\^\$\|\\])/g, '\\$1');
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 's' && ((e.ctrlKey && !e.metaKey) || (!e.ctrlKey && e.metaKey))) {
      e.preventDefault();
      applyButton.click();
      return;
    }
    if (e.key === 'F' && e.altKey && e.shiftKey) {
      const textarea = document.querySelector('#tab-exclusion:checked~#tab-panel-exclusion textarea')
                    || document.querySelector('#tab-keywords:checked~#tab-panel-keywords textarea');
      textarea.focus();
      textarea.value = textarea.value.split(/\n/).filter(l => l.trim() !== '').join('\n');
      e.preventDefault();
      return;
    }
  });

  addUrlsInCurrentTab.addEventListener('click', async (e) => {
    const urlInfo = {
      returnFromTop: false,
      numOfChildren: 0,
      escapedUrls: []
    };
    const onMessageListener = async (message, sender, sendResponse) => {
      if (message.method !== 'getUrlResponse') return;

      urlInfo.returnFromTop ||= message.isTop;
      urlInfo.numOfChildren += message.numOfChildren;
      urlInfo.escapedUrls.push(`^${escapeRegExp(message.url)}$`);

      if (!urlInfo.returnFromTop || urlInfo.numOfChildren + 1 != urlInfo.escapedUrls.length) return;

      chrome.runtime.onMessage.removeListener(onMessageListener);

      if (!urlInfo.escapedUrls.reduce((added, escapedUrl) => {
        const currentValue = exclusionInput.value.split(/\n/);
        if (currentValue.includes(escapedUrl)) return added || false;
        exclusionInput.value = exclusionInput.value.trimEnd() + '\n' + escapedUrl;
        return true;
      }, false)) return;

      await renderBackground({ target: exclusionInput });
      applyButton.disabled = false;
      exclusionInput.focus();
    };
    chrome.runtime.onMessage.addListener(onMessageListener);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, { method: 'getUrl' });
  });

  const hasCaptureGroups = (regexStr) => {
    return new Promise((resolve) => {
      if (regexStr === '') resolve(false);
      try {
        const simpler = new RegExp(regexStr).source.replace(/\\.|\[[^\]]*\]/g, "x");
        resolve(/\((?:[^?]|(?=\?<[^!>]+>))/.test(simpler));
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
      resolve(result == 0 ? 1 : result);
    });
  };

  const validateLines = async (textarea, onlyLineCounting) => {
    const lines = textarea.value.split(/\n/);
    return await lines.reduce(async (prev, curr) => {
      const numOfLine = await getLineCountForRenderedText(textarea, curr);
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

  const renderBackground = async (e) => {
    const lines = e.target.value.split(/\n/);
    if (lines.length == 0) {
      applyButton.disabled = false;
      return;
    }
    if (regexpCheckbox.checked) {
      applyButton.disabled = false;
    }
    validationResults[e.target.id] = await validateLines(e.target, !regexpCheckbox.checked);
    applyButton.disabled = !validationResults[e.target.id].every(r => r.isValid) ||
      (
        patternInput.value === savedKeywords &&
        exclusionInput.value === savedExclusionUrls &&
        caseCheckbox.checked === savedMatchCase &&
        showValueCheckbox.checked === savedShowValue &&
        regexpCheckbox.checked === savedMode &&
        blurInputCheckbox.checked === savedBlurInput &&
        blurTitleCheckbox.checked === savedBlurTitle
      );
    const re = /\*(\d+)( - [\d.]+px\))$/;
    const bgColors = validationResults[e.target.id].reduce((prev, curr, pos, array) => {
      const backgroundColor = curr.isValid ? (!curr.reason ? COLOR_DEFAULT : COLOR_WARNING) : COLOR_ERROR;
      if (pos == 0) {
        prev.push(`${backgroundColor} calc(var(--l)*0 - ${e.target.scrollTop}px) calc(var(--l)*${curr.numOfLine} - ${e.target.scrollTop}px)`);
        return prev;
      }
      const start = parseInt(prev[prev.length - 1].match(re)[1]);
      if (curr.isValid == array[pos - 1].isValid && !!curr.reason == !!array[pos - 1].reason) {
        prev[prev.length - 1] = prev[prev.length - 1].replace(re, `*${start + curr.numOfLine}$2`);
        return prev;
      }
      prev.push(`${backgroundColor} calc(var(--l)*${start} - ${e.target.scrollTop}px) calc(var(--l)*${start + curr.numOfLine} - ${e.target.scrollTop}px)`);
      return prev;
    }, []);
    if (bgColors.length > 0) {
      const start = parseInt(bgColors[bgColors.length - 1].match(re)[1]);
      bgColors.push(`${COLOR_DEFAULT} calc(var(--l)*${start} - ${e.target.scrollTop}px) calc(var(--l)*${start + 1} - ${e.target.scrollTop}px)`);
      e.target.setAttribute('rows', start > minRowTextArea ? start : minRowTextArea);
    }

    document.querySelector(`head > style#style-${e.target.id}`).innerHTML = `
textarea#${e.target.id} {
  background: linear-gradient(
  ${bgColors.join(',\n  ')}
  ) 0 8px no-repeat, ${COLOR_DEFAULT};
}`;
  }

  applyButton.addEventListener('click', async (e) => {
    await chrome.storage.local.set({
      'status': !statusCheckbox.checked ? 'disabled' : '',
      'keywords': patternInput.value,
      'exclusionUrls': exclusionInput.value,
      'mode': regexpCheckbox.checked ? 'regexp' : 'text',
      'matchCase': caseCheckbox.checked,
      'showValue': showValueCheckbox.checked,
      'blurInput': blurInputCheckbox.checked,
      'blurTitle': blurTitleCheckbox.checked,
    });
    patternInput.focus();
    savedKeywords = patternInput.value;
    savedExclusionUrls = exclusionInput.value;
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
      patternInput.disabled =
      exclusionInput.disabled = !e.target.checked;
    validationResults[patternInput.id] = await validateLines(patternInput, !regexpCheckbox.checked);
    validationResults[exclusionInput.id] = await validateLines(exclusionInput, !regexpCheckbox.checked);

    applyButton.disabled = !e.target.checked || !validationResults[patternInput.id].every(r => r.isValid) || !validationResults[exclusionInput.id].every(r => r.isValid);

    await chrome.storage.local.set({
      "status": !e.target.checked ? 'disabled' : ''
    });
    if (!e.target.checked) {
      document.querySelector(`head > style#style-${patternInput.id}`).innerHTML = '';
      document.querySelector(`head > style#style-${exclusionInput.id}`).innerHTML = '';
      return;
    }

    await renderBackground({ target: patternInput });
    await renderBackground({ target: exclusionInput });

    patternInput.focus();
  });
  regexpCheckbox.addEventListener('change', async (e) => {
    patternInput.focus();
    patternInput.style.background = COLOR_DEFAULT;

    patternInput.style.background = '';
    await renderBackground({ target: patternInput });
  });
  caseCheckbox.addEventListener('change', async (e) => {
    await renderBackground({ target: patternInput });
  });

  showValueCheckbox.addEventListener('change', async (e) => {
    await renderBackground({ target: patternInput });
    patternInput.focus();
  });

  blurInputCheckbox.addEventListener('change', async (e) => {
    await renderBackground({ target: patternInput });
    patternInput.focus();
  });

  blurTitleCheckbox.addEventListener('change', async (e) => {
    await renderBackground({ target: patternInput });
    patternInput.focus();
  });

  const onScroll = (e) => {
    if (e.target.scrollLeft < textAreaPaddingLeft) e.target.scrollLeft = 0;
    if (e.target.scrollTop < textAreaPaddingTop) e.target.scrollTop = 0;
  }
  const onMouseMove = (e) => {
    if (e.offsetY + e.target.scrollTop - textAreaPaddingTop < 0) return;
    const row = parseInt((e.offsetY + e.target.scrollTop - textAreaPaddingTop) / textAreaLineHeight) + 1;
    if (e.target.pointedRow == row) return;
    e.target.pointedRow = row;
    validationResults[e.target.id].reduce((prev, curr) => {
      if (prev < 0) return -1;
      prev -= curr.numOfLine;
      if (prev > 0) {
        e.target.title = '';
        return prev;
      }
      e.target.setAttribute('title', curr.reason || '');
      return -1;
    }, row);
  };
  const onMouseOut = (e) => {
    e.target.pointedRow = -1;
  };
  document.head.appendChild(document.createElement('style'));
  document.head.lastChild.setAttribute('id', `style-${patternInput.id}`);
  patternInput.addEventListener('scroll', renderBackground);
  patternInput.addEventListener('scroll', onScroll);
  patternInput.addEventListener('input', renderBackground);
  patternInput.addEventListener('mousemove', onMouseMove, false);
  patternInput.addEventListener('mouseout', onMouseOut);

  document.head.appendChild(document.createElement('style'));
  document.head.lastChild.setAttribute('id', `style-${exclusionInput.id}`);
  exclusionInput.addEventListener('scroll', renderBackground);
  exclusionInput.addEventListener('scroll', onScroll);
  exclusionInput.addEventListener('input', renderBackground);
  exclusionInput.addEventListener('mousemove', onMouseMove, false);
  exclusionInput.addEventListener('mouseout', onMouseOut);

  statusCheckbox.checked = status !== 'disabled';
  savedMatchCase = caseCheckbox.checked = matchCase;
  savedShowValue = showValueCheckbox.checked = showValue;
  savedBlurInput = blurInputCheckbox.checked = blurInput;
  savedBlurTitle = blurTitleCheckbox.checked = blurTitle;
  savedMode = regexpCheckbox.checked = mode === 'regexp';
  savedKeywords = patternInput.value = keywords || '';
  savedExclusionUrls = exclusionInput.value = exclusionUrls || '';

  caseCheckbox.disabled =
    blurInputCheckbox.disabled =
    blurTitleCheckbox.disabled =
    showValueCheckbox.disabled =
    regexpCheckbox.disabled =
    patternInput.disabled =
    exclusionInput.disabled =
    applyButton.disabled = !statusCheckbox.checked;

  patternInput.focus();
  if (statusCheckbox.checked) {
    await renderBackground({ target: patternInput });
    await renderBackground({ target: exclusionInput });
  }
  applyButton.disabled = true;
});
