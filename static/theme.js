(function () {
  var btn = document.getElementById('theme-toggle');

  function stored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function render(newTheme) {
    document.documentElement.dataset.theme = newTheme;
    if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }

  function save(t) {
    try { localStorage.setItem('theme', t); } catch (e) { /* 忽略 */ }
  }

  if (btn) {
    btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
    btn.addEventListener('click', function () {
      render(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      save(document.documentElement.dataset.theme);
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!stored()) render(e.matches ? 'dark' : 'light');
  });
})();
