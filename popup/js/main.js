(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelector('#keywords').value = (await chrome.storage.local.get(["keywords"])).keywords || '';
    document.querySelector('#btnUpdate').addEventListener('click', async () => {
      try {
        const value = document.querySelector('#keywords').value;
        await chrome.storage.local.set({
          "keywords": value
        })
      } catch (e) {
        console.error(e);
      }
      window.close();
    });
    const enabled = (await chrome.storage.local.get(["status"])).status;
    const tgl = document.querySelector('#tglEnabled');
    tgl.checked = enabled || enabled === undefined;
    document.querySelector('#keywords').disabled = document.querySelector('#btnUpdate').disabled = !tgl.checked
    tgl.addEventListener('change', async (e) => {
      await chrome.storage.local.set({
        "status": tgl.checked
      });
      document.querySelector('#keywords').disabled = document.querySelector('#btnUpdate').disabled = !tgl.checked;
    })
    document.querySelector('#keywords').focus();
  });
})();