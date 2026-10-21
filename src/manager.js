(() => {
  if (document.getElementById('fcuf-root')) return;

  const root = document.createElement('div');
  root.id = 'fcuf-root';
  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; font: 14px/1.5 system-ui, sans-serif; color: #182339; }
      * { box-sizing: border-box; }
      .backdrop { position: absolute; inset: 0; background: #14213d99; }
      .dialog { position: relative; display: flex; flex-direction: column; width: min(720px, calc(100vw - 32px)); max-height: 90vh; margin: 5vh auto; background: white; border-radius: 16px; box-shadow: 0 24px 80px #10182855; overflow: hidden; }
      .head { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px; border-bottom: 1px solid #e5eaf1; }
      h2 { margin: 0; font-size: 20px; }
      .content { padding: 22px 24px; overflow: auto; }
      .label { display: block; font-weight: 650; margin: 12px 0 6px; }
      button, select { padding: 9px 14px; border-radius: 8px; border: 1px solid #dce2ed; font: inherit; background: white; color: #182339; }
      button { cursor: pointer; }
      button:disabled { opacity: .5; cursor: not-allowed; }
      .primary { background: #6244ce; color: white; border-color: #6244ce; }
      textarea { display: block; width: 100%; min-height: 125px; padding: 12px; border-radius: 10px; border: 1px solid #ccd5e3; resize: vertical; font: 14px/1.5 monospace; }
      .hint { color: #69768c; font-size: 12px; }
      .actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
      .status { margin-top: 16px; padding: 12px; border: 1px solid #e2e8f2; border-radius: 9px; background: #f8faff; }
      .group { margin-top: 14px; border: 1px solid #e5eaf1; border-radius: 10px; overflow: hidden; }
      .group h3 { margin: 0; padding: 10px 12px; background: #f7f9fc; font-size: 13px; }
      .item { padding: 9px 12px; border-top: 1px solid #edf0f5; overflow-wrap: anywhere; font-size: 13px; }
      footer { padding: 12px 24px; border-top: 1px solid #e5eaf1; font-size: 12px; color: #788599; text-align: center; }
    </style>
    <div class="backdrop"></div>
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="fcuf-title">
      <header class="head"><h2 id="fcuf-title">Fightcade User Finder</h2><button id="close" aria-label="Cerrar">Cerrar</button></header>
      <main class="content">
        <p>Introduce nombres de usuario separados por comas.</p>
        <label class="label" for="users">Usuarios</label>
        <textarea id="users" placeholder="usuario1, usuario2, usuario3"></textarea>
        <p class="hint" id="count">0 usuarios</p>
        <label class="label" for="game">Juego</label>
        <select id="game"><option value="sf2ce">Street Fighter II: Champion Edition (sf2ce)</option></select>
        <div class="actions"><button class="primary" id="search">Buscar usuarios</button><button id="stop" disabled>Detener</button></div>
        <div class="status" id="status" role="status" aria-live="polite">Introduce los usuarios para comenzar.</div>
        <div id="results"></div>
      </main>
      <footer>Desarrollado por Àlex Llaó · v<span id="version"></span></footer>
    </section>
  `;
  document.body.append(root);

  const el = (id) => shadow.getElementById(id);
  el('version').textContent = chrome.runtime.getManifest().version;
  el('close').onclick = () => root.remove();
  shadow.querySelector('.backdrop').onclick = () => root.remove();

  const parse = () => [
    ...new Map(
      el('users')
        .value.split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [name.toLocaleLowerCase(), name]),
    ).values(),
  ];
  el('users').addEventListener('input', () => {
    const count = parse().length;
    el('count').textContent = count + (count === 1 ? ' usuario' : ' usuarios');
  });

  let running = false;
  let stopped = false;
  const limit = 15;

  function section(title, items) {
    if (!items.length) return;
    const group = document.createElement('section');
    group.className = 'group';
    const heading = document.createElement('h3');
    heading.textContent = title + ' (' + items.length + ')';
    group.append(heading);
    for (const item of items) {
      const line = document.createElement('div');
      line.className = 'item';
      line.textContent = item;
      group.append(line);
    }
    el('results').append(group);
  }

  el('stop').onclick = () => {
    stopped = true;
    el('status').textContent = 'Deteniendo después de la petición actual...';
  };

  el('search').onclick = async () => {
    if (running) return;
    if (location.hostname !== 'www.fightcade.com' && location.hostname !== 'fightcade.com') {
      el('status').textContent = 'Abre www.fightcade.com antes de utilizar la extensión.';
      return;
    }
    const names = parse();
    if (!names.length) {
      el('status').textContent = 'Introduce al menos un usuario.';
      return;
    }

    const pending = new Map(names.map((name) => [name.toLocaleLowerCase(), name]));
    const found = [];
    let offset = 0;
    let total = null;
    let completed = false;
    let errorMessage = null;
    running = true;
    stopped = false;
    el('results').replaceChildren();
    el('search').disabled = true;
    el('stop').disabled = false;
    el('game').disabled = true;

    try {
      while (pending.size && !stopped) {
        el('status').textContent =
          'Consultando resultados ' +
          (offset + 1) +
          '–' +
          (offset + limit) +
          (total === null ? '' : ' de ' + total) +
          '. Pendientes: ' +
          pending.size +
          '.';
        const response = await fetch('/api/', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            req: 'searchrankings',
            gameid: el('game').value,
            limit,
            offset,
            recent: true,
            byElo: true,
          }),
        });
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          throw new Error('Fightcade ha limitado las peticiones (HTTP 429). Búsqueda detenida para evitar más bloqueos.' + (retryAfter ? ' Reintenta después de ' + retryAfter + '.' : ' Espera unos minutos antes de reintentar.'));
        }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (data.res !== 'OK' || !Array.isArray(data.results?.results))
          throw new Error('Respuesta inesperada de Fightcade');
        const batch = data.results.results;
        if (Number.isInteger(data.results.count) && data.results.count >= 0)
          total = data.results.count;

        for (let index = 0; index < batch.length; index++) {
          const user = batch[index];
          if (typeof user.name !== 'string') continue;
          const key = user.name.toLocaleLowerCase();
          if (!pending.has(key)) continue;
          const country = user.country?.full_name || 'País desconocido';
          const stats = user.gameinfo?.[el('game').value];
          found.push(
            user.name +
              ' · ' +
              country +
              ' · posición ' +
              (offset + index + 1) +
              ' · página ' +
              (Math.floor(offset / limit) + 1) +
              (stats?.num_matches != null ? ' · partidas ' + stats.num_matches : ''),
          );
          pending.delete(key);
        }

        offset += batch.length;
        if (batch.length === 0 || batch.length < limit || (total !== null && offset >= total)) {
          completed = true;
          break;
        }
        el('status').textContent = 'Esperando antes de consultar la siguiente página para respetar los límites de Fightcade...';
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      if (!pending.size) completed = true;
    } catch (error) {
      errorMessage = error.message || String(error);
    } finally {
      running = false;
      el('search').disabled = false;
      el('stop').disabled = true;
      el('game').disabled = false;
      section('Encontrados', found);
      section(
        completed && !stopped && !errorMessage ? 'No encontrados' : 'Pendientes sin verificar',
        [...pending.values()],
      );
      el('status').textContent = errorMessage
        ? 'Error: ' + errorMessage + '. Los pendientes no están verificados.'
        : stopped
          ? 'Búsqueda detenida. ' +
            found.length +
            ' encontrados; pendientes sin verificar: ' +
            pending.size +
            '.'
          : 'Búsqueda terminada. ' +
            found.length +
            ' encontrados de ' +
            names.length +
            '; ' +
            offset +
            ' resultados revisados.';
    }
  };
})();
