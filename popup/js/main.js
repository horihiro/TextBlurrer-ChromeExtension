document.addEventListener('DOMContentLoaded', async (e) => {
  const applyButton = document.querySelector('#applyButton');
  const patternInput = document.querySelector('#patternInput');
  const statusCheckbox = document.querySelector('#statusCheckbox');
  const caseCheckbox = document.querySelector('#caseCheckbox');
  const regexpCheckbox = document.querySelector('#regexpCheckbox');
  const _bufferTextArea = document.querySelector('#_bufferTextArea')

  let savedKeywords = '';
  let savedMatchCase = false;
  let savedMode = false;
  applyButton.addEventListener('click', async (e) => {
    await chrome.storage.local.set({
      'status': !statusCheckbox.checked ? 'disabled' : '',
      'keywords': patternInput.value,
      'mode': regexpCheckbox.checked ? 'regexp' : 'text',
      'matchCase': caseCheckbox.checked
    });
    patternInput.focus();
    savedKeywords = patternInput.value;
    savedMode = regexpCheckbox.checked;
    savedMatchCase =caseCheckbox.checked;
    e.target.disabled = true;
  });

  statusCheckbox.addEventListener('change', async (e) => {
    caseCheckbox.disabled = 
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
    patternInput.style.background = '#444';

    patternInput.style.background = '';
    await renderBackground();
    if (e.target.checked) {
      return;
    }
    document.querySelector('head > style').innerHTML = '';2719467
  });
  caseCheckbox.addEventListener('change', async (e) => {
    await renderBackground();
    patternInput.focus();
  });
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
      } else if (!(await validateRegExp(curr))) {
        result.isValid = false;
        result.reason = 'Failed to create RegExp object.\nCheck if this is a valid regular expression string.';
      } else if (await hasCaptureGroups(curr)) {
        result.isValid = false;
        result.reason = 'This string might contain capture-group that should be non-capture-group.\nReplace a pair of `(` and `)` to `(?:` and `)`.';
      }
      array.push(result);
      return array;
    }, []);
  }

  let validationResults = [];
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
    applyButton.disabled = !validationResults.every(r => r.isValid) || (patternInput.value === savedKeywords && caseCheckbox.checked === savedMatchCase && regexpCheckbox.checked === savedMode);
    const re = /\*(\d+)( - \d+px\))$/;
    const bgColors = validationResults.reduce((prev, curr, pos, array) => {
      const backgroundColor = curr.isValid ?  '#444' :  '#FF4500';
      if (pos == 0) {
        prev.push(`${backgroundColor} calc(var(--l)*0 - ${patternInput.scrollTop}px) calc(var(--l)*${curr.numOfLine} - ${patternInput.scrollTop}px)`);
        return prev;
      }
      const start = parseInt(prev[prev.length - 1].match(re)[1]);
      if (curr.isValid == array[pos-1].isValid) {
        prev[prev.length - 1] = prev[prev.length - 1].replace(re, `*${start + curr.numOfLine}$2`);
        return prev;
      }
      prev.push(`${backgroundColor} calc(var(--l)*${start} - ${patternInput.scrollTop}px) calc(var(--l)*${start + curr.numOfLine} - ${patternInput.scrollTop}px)`);
      return prev;
    }, []);
    if (bgColors.length > 0) {
      const start = parseInt(bgColors[bgColors.length - 1].match(re)[1]);
      bgColors.push(`#444 calc(var(--l)*${start} - ${patternInput.scrollTop}px) calc(var(--l)*${start + 1} - ${patternInput.scrollTop}px)`);
      patternInput.setAttribute('rows', start > 10 ? start : 10);
    } 

    document.querySelector('head > style').innerHTML = `
textarea#${patternInput.id} {
  background: linear-gradient(
  ${bgColors.join(',\n  ')}
  ) 0 8px no-repeat, #444;
}`;
  }

  patternInput.addEventListener('scroll', renderBackground);
  patternInput.addEventListener('scroll', () => {
    if (patternInput.scrollLeft < 11) patternInput.scrollLeft = 0;
    if (patternInput.scrollTop < 14) patternInput.scrollTop = 0;
  });
  patternInput.addEventListener('input', renderBackground);
  let pointedRow = -1;
  patternInput.addEventListener('mousemove', (e) => {
    patternInput.title = '';
    const row = parseInt((e.offsetY + patternInput.scrollTop - 10) / 20) + 1;
    if (pointedRow == row) return;
    validationResults.reduce((prev, curr) => {
      if (prev < 0) return -1;
      prev -= curr.numOfLine;
      if (prev > 0) return prev;
      patternInput.title = curr.reason || '';
      return -1;
    }, row);
    console.log(row);
  }, false);
  patternInput.addEventListener('mousemove', () => {
    pointedRow = -1;
  });

  const { status, keywords, mode, matchCase } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase']));
  statusCheckbox.checked = status !== 'disabled';
  savedMatchCase = caseCheckbox.checked = matchCase;
  savedMode = regexpCheckbox.checked = mode === 'regexp';
  savedKeywords = patternInput.value = keywords || '';
  

  caseCheckbox.disabled =
    regexpCheckbox.disabled =
    patternInput.disabled =
    applyButton.disabled = !statusCheckbox.checked;

  patternInput.focus();
  if (statusCheckbox.checked && regexpCheckbox.checked) {
    await renderBackground(patternInput.value.split(/\n/));
  }
  applyButton.disabled = true;
});
