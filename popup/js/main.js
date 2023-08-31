(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('#patternInput').value = (await chrome.storage.local.get(["keywords"])).keywords || '';
    document.querySelector('#applyButton').addEventListener('click', async () => {
      try {
        const value = document.querySelector('#patternInput').value;
        await chrome.storage.local.set({
          "mode": document.querySelector('#modeSelect').value,
          "keywords": value
        })
      } catch (e) {
        console.error(e);
      }
      document.querySelector('#patternInput').focus();
    });
    document.querySelector('#patternInput').focus();
    const mode = (await chrome.storage.local.get(["mode"])).mode;
    Array.prototype.some.call(document.querySelector('#modeSelect').options, (opt) => {
      if (opt.value !== mode) return false;
      opt.selected = true;
      return true;
    });
  });
})();