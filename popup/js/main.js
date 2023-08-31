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
      window.close();
    });
    document.querySelector('#patternInput').focus();
  });
})();