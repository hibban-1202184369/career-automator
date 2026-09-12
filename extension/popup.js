document.getElementById('syncBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const targetUrl = document.getElementById('targetUrl').value.trim().replace(/\/$/, '');
  
  statusDiv.style.display = 'block';
  statusDiv.className = '';
  statusDiv.textContent = '🔄 Mengambil cookies dari browser...';

  try {
    const domains = [
      { name: 'glintsCookies', url: 'https://glints.com' },
      { name: 'jobstreetCookies', url: 'https://www.jobstreet.co.id' },
      { name: 'linkedinCookies', url: 'https://www.linkedin.com' },
      { name: 'indeedCookies', url: 'https://id.indeed.com' }
    ];

    const payload = {};

    for (const d of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ url: d.url });
        if (cookies && cookies.length > 0) {
          payload[d.name] = JSON.stringify(cookies);
        }
      } catch (err) {
        console.error('Failed to get cookies for ' + d.url, err);
      }
    }

    statusDiv.textContent = '🌐 Mengirim cookies ke Career Automator...';

    const res = await fetch(targetUrl + '/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success || res.ok) {
      statusDiv.className = 'success';
      statusDiv.textContent = '✅ Berhasil! Semua cookies login berhasil disinkronkan ke bot.';
    } else {
      throw new Error(data.error || 'Gagal menyimpan ke server');
    }
  } catch (err) {
    statusDiv.className = 'error';
    statusDiv.textContent = '❌ Gagal: ' + (err.message || err);
  }
});
