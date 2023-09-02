document.addEventListener('DOMContentLoaded', async (e) => {
  const applyButton = document.querySelector('#applyButton');
  const patternInput = document.querySelector('#patternInput');
  const statusCheckbox = document.querySelector('#statusCheckbox');
  const caseCheckbox = document.querySelector('#caseCheckbox');
  const regexpCheckbox = document.querySelector('#regexpCheckbox')

  applyButton.addEventListener('click', async (e) => {
    await chrome.storage.local.set({
      'status': !statusCheckbox.checked ? 'disabled' : '',
      'keywords': patternInput.value,
      'mode': regexpCheckbox.checked ? 'regexp' : 'text',
      'matchCase': caseCheckbox.checked
    });
    patternInput.focus();
  });

  statusCheckbox.addEventListener('change', async (e) => {
    caseCheckbox.disabled =
      regexpCheckbox.disabled =
      patternInput.disabled =
      applyButton.disabled = !e.target.checked;

    await chrome.storage.local.set({
      "status": !e.target.checked ? 'disabled' : ''
    });
    if (!e.target.checked) return;

    patternInput.focus();
  });
  regexpCheckbox.addEventListener('change', (e) => {
    patternInput.focus();
    patternInput.style.background = '#444';
    if (!e.target.checked) {
      document.querySelector('head > style').innerHTML = '';
      return;
    }
    patternInput.style.background = '';
    applyButton.disabled = false;
    renderBackground(patternInput.value.split(/\n/));
  });
  caseCheckbox.addEventListener('change', (e) => {
    patternInput.focus();
  });
  const hasCaptureGroups = (regexStr) => {
    const simpler = new RegExp(regexStr).source.replace(/\\.|\[(?:\\.|[^.])*?\]/g, "x");
    return /\([^?]/.test(simpler) || /\(\?</.test(simpler)
  }
  const validateRegExp = (pattern) => {
    if (pattern === '') return true;
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }
  const renderBackground = (lines) => {
    const backgroundColors = [];

    lines.forEach((line, pos) => {
      if (!validateRegExp(line) || hasCaptureGroups(line)) {
        applyButton.disabled = true;
        console.log(patternInput.scrollTop);
        backgroundColors.push(`#FF4500 calc(var(--l)*${pos} - ${patternInput.scrollTop}px) calc(var(--l)*${pos + 1} - ${patternInput.scrollTop}px)`);
      } else {
        backgroundColors.push(`#444 calc(var(--l)*${pos} - ${patternInput.scrollTop}px) calc(var(--l)*${pos + 1} - ${patternInput.scrollTop}px)`);
      }
    });
    backgroundColors.push(`#444 calc(var(--l)*${lines.length}) calc(var(--l)*${lines.length + 1})`);
    document.querySelector('head > style').innerHTML = `
textarea {

background: linear-gradient(
  ${backgroundColors.join(',\n  ')}
) 0 8px no-repeat, #444;
}`;
  }
  const renderBackgroundWrapper = (e) => {
    const lines = e.target.value.split(/\n/);
    if (lines.length == 0) {
      applyButton.disabled = false;
      return;
    }
    if (regexpCheckbox.checked) {
      applyButton.disabled = false;
      renderBackground(lines)
    }
    const numOfRows = lines.length;
    if (numOfRows < 10) return;
    e.target.setAttribute('rows', numOfRows);
  }
  patternInput.addEventListener('scroll', renderBackgroundWrapper);
  patternInput.addEventListener('scroll', (e) => {
    if (patternInput.scrollLeft == 10) patternInput.scrollLeft = 0;
  });
  patternInput.addEventListener('input', renderBackgroundWrapper);

  const { status, keywords, mode, matchCase } = (await chrome.storage.local.get(['status', 'keywords', 'mode', 'matchCase']));
  statusCheckbox.checked = status !== 'disabled';
  caseCheckbox.checked = matchCase;
  regexpCheckbox.checked = mode === 'regexp';
  patternInput.value = keywords || '';

  caseCheckbox.disabled =
    regexpCheckbox.disabled =
    patternInput.disabled =
    applyButton.disabled = !statusCheckbox.checked;

  patternInput.focus();
  if (regexpCheckbox.checked) {
    applyButton.disabled = false;
    renderBackground(patternInput.value.split(/\n/));
  }
});
