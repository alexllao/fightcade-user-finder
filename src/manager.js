(() => {
  if (document.getElementById('fcuf-root')) return;
  const root = document.createElement('div');
  root.id = 'fcuf-root';
  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; font: 14px system-ui, sans-serif; color: #182339; }
      * { box-sizing: border-box; }
      .backdrop { position: absolute; inset: 0; background: #14213d99; }
      .dialog { position: relative; width: min(640px, calc(100vw - 32px)); margin: 8vh auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 24px 80px #10182855; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      h2 { margin: 0; font-size: 20px; }
      button { padding: 9px 15px; border-radius: 8px; border: 1px solid #dce2ed; cursor: pointer; background: white; }
      textarea { width: 100%; min-height: 145px; margin-top: 12px; padding: 12px; border-radius: 10px; border: 1px solid #ccd5e3; resize: vertical; font: 14px/1.5 monospace; }
      .hint { color: #69768c; font-size: 12px; }
      footer { margin-top: 20px; font-size: 12px; color: #788599; }
    </style>
    <div class="backdrop"></div>
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="fcuf-title">
      <header><h2 id="fcuf-title">Fightcade User Finder</h2><button id="close" aria-label="Cerrar">Cerrar</button></header>
      <p>Introduce nombres de usuario separados por comas.</p>
      <textarea id="users" placeholder="usuario1, usuario2, usuario3"></textarea>
      <p class="hint" id="count">0 usuarios</p>
      <button id="search" disabled>Buscar usuarios (pendiente de configurar)</button>
      <footer>Desarrollado por Àlex Llaó · v<span id="version"></span></footer>
    </section>
  `;
  document.body.append(root);
  shadow.getElementById('version').textContent = chrome.runtime.getManifest().version;
  shadow.getElementById('close').onclick = () => root.remove();
  shadow.querySelector('.backdrop').onclick = () => root.remove();
  shadow.getElementById('users').addEventListener('input', (event) => {
    const names = [...new Set(event.target.value.split(',').map((name) => name.trim()).filter(Boolean))];
    shadow.getElementById('count').textContent = `${names.length} usuarios`;
  });
})();
