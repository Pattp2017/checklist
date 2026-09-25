// =========================================================
// photo.js
// Fotos de itens N/C com persistência offline em IndexedDB
// =========================================================
(function () {
  const fotosPendentes = new Map();
  const DB_NAME = 'checklist_fotos_offline';
  const DB_VERSION = 1;
  const FOTO_MAX_DIMENSAO = 1600;
  const FOTO_QUALIDADE = 0.78;
  const STORE = 'fotos';
  let dbPromise = null;

  function getVistoriaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || '';
  }

  function getChaveItem(row) {
    return (row.dataset.setor || '') + '||' + (row.dataset.item || '');
  }

  function getStatus(row) {
    const radio = row.querySelector('input[type="radio"]:checked');
    return radio ? radio.value : '';
  }

  function abrirDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponível'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('vistoria_id', 'vistoria_id', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB'));
    });
    return dbPromise;
  }

  async function idbSalvar(chave, arquivo) {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId || !arquivo) return;
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        id: vistoriaId + '||' + chave,
        vistoria_id: vistoriaId,
        chave,
        arquivo,
        nome: arquivo.name || 'foto.jpg',
        tipo: arquivo.type || 'image/jpeg',
        salvo_em: new Date().toISOString()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbRemover(chave) {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId) return;
    try {
      const db = await abrirDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(vistoriaId + '||' + chave);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('Não foi possível remover foto offline:', e); }
  }

  async function idbCarregarVistoria() {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId) return [];
    try {
      const db = await abrirDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const idx = tx.objectStore(STORE).index('vistoria_id');
        const req = idx.getAll(vistoriaId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Fotos offline não puderam ser restauradas:', e);
      return [];
    }
  }

  async function idbLimparVistoria() {
    const registros = await idbCarregarVistoria();
    if (!registros.length) return;
    const db = await abrirDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      registros.forEach(r => store.delete(r.id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  function marcarBotao(row, temFoto) {
    if (temFoto) row.dataset.temFoto = 'true';
    else delete row.dataset.temFoto;
    const botao = row.querySelector('.btn-foto');
    if (botao) {
      botao.textContent = temFoto ? '📷 Foto anexada ✓' : '📷 Foto';
      botao.classList.toggle('foto-ok', temFoto);
    }
  }

  async function removerFoto(row) {
    const chave = getChaveItem(row);
    fotosPendentes.delete(chave);
    marcarBotao(row, false);
    await idbRemover(chave);
  }

  async function comprimirFoto(arquivo) {
    if (!arquivo || !arquivo.type?.startsWith('image/')) return arquivo;
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, FOTO_MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao comprimir foto.')), 'image/jpeg', FOTO_QUALIDADE);
    });
    return new File([blob], 'foto-' + Date.now() + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  }

  async function registrarFoto(row, arquivo) {
    const chave = getChaveItem(row);
    try {
      marcarBotao(row, false);
      const botao = row.querySelector('.btn-foto');
      if (botao) { botao.disabled = true; botao.textContent = '📷 Salvando...'; }
      const fotoOtimizada = await comprimirFoto(arquivo);
      await idbSalvar(chave, fotoOtimizada);
      fotosPendentes.set(chave, fotoOtimizada);
      marcarBotao(row, true);
      if (botao) botao.disabled = false;
      console.log('Foto preservada no aparelho:', chave, fotoOtimizada.name, fotoOtimizada.size);
    } catch (e) {
      fotosPendentes.delete(chave);
      marcarBotao(row, false);
      const botao = row.querySelector('.btn-foto');
      if (botao) botao.disabled = false;
      console.error('Falha ao preservar foto no aparelho:', e);
      alert('A foto não pôde ser armazenada no aparelho. O checklist pode continuar normalmente.');
    }
  }

  function abrirCamera(row) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async function () {
      const arquivo = input.files && input.files[0];
      if (arquivo) await registrarFoto(row, arquivo);
      input.remove();
    });
    input.click();
  }

  function criarBotaoFoto(row) {
    if (row.querySelector('.btn-foto')) return;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-foto';
    botao.textContent = row.dataset.temFoto === 'true' ? '📷 Foto anexada ✓' : '📷 Foto';
    if (row.dataset.temFoto === 'true') botao.classList.add('foto-ok');
    botao.addEventListener('click', () => abrirCamera(row));

    const speechControls = row.querySelector('.speech-controls');
    if (speechControls) {
      const status = speechControls.querySelector('.speech-status');
      if (status) speechControls.insertBefore(botao, status);
      else speechControls.appendChild(botao);
      return;
    }
    const obs = row.querySelector('textarea.obs');
    if (obs) obs.insertAdjacentElement('afterend', botao);
    else row.appendChild(botao);
  }

  function removerBotaoFoto(row) {
    const botao = row.querySelector('.btn-foto');
    if (botao) botao.remove();
  }

  function atualizarFoto(row) {
    const status = getStatus(row);
    if (status === 'NC') {
      criarBotaoFoto(row);
      if (fotosPendentes.has(getChaveItem(row))) marcarBotao(row, true);
    } else {
      const chave = getChaveItem(row);
      if (fotosPendentes.has(chave) || row.dataset.temFoto === 'true') removerFoto(row);
      removerBotaoFoto(row);
    }
  }

  async function restaurarFotos() {
    const registros = await idbCarregarVistoria();
    registros.forEach(reg => {
      if (reg.chave && reg.arquivo) fotosPendentes.set(reg.chave, reg.arquivo);
    });
    document.querySelectorAll('.item-row').forEach(row => {
      if (getStatus(row) === 'NC' && fotosPendentes.has(getChaveItem(row))) {
        row.dataset.temFoto = 'true';
        criarBotaoFoto(row);
        marcarBotao(row, true);
      }
    });
    if (registros.length) console.log(registros.length + ' foto(s) restaurada(s) do armazenamento offline.');
  }

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target || target.type !== 'radio') return;
    const row = target.closest('.item-row');
    if (row) atualizarFoto(row);
  });

  async function iniciar() {
    // Sem MutationObserver global: alterações em uma foto não podem disparar
    // uma nova varredura de todas as linhas do checklist.
    document.querySelectorAll('.item-row').forEach(atualizarFoto);
    await restaurarFotos();
    // A montagem do checklist é assíncrona. Uma única restauração tardia é suficiente.
    setTimeout(restaurarFotos, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.VistoriaFotos = {
    getFoto(row) { return fotosPendentes.get(getChaveItem(row)) || null; },
    getFotoPorDados(setor, item) { return fotosPendentes.get(setor + '||' + item) || null; },
    getFotoPorChave(chave) { return fotosPendentes.get(chave) || null; },
    getQuantidade() { return fotosPendentes.size; },
    getTodas() { return Array.from(fotosPendentes.entries()); },
    removerFoto,
    restaurarFotos,
    async removerPersistidaPorDados(setor, item) { await idbRemover(setor + '||' + item); },
    async limparPersistidas() { await idbLimparVistoria(); },
    async limpar() {
      fotosPendentes.clear();
      await idbLimparVistoria();
      document.querySelectorAll('.btn-foto').forEach(botao => botao.remove());
    }
  };
})();

// Módulo isolado para incluir itens somente na vistoria atual.
(function carregarModuloAdicionarItem() {
  if (document.querySelector('script[data-vistoria-add-item]')) return;
  const script = document.createElement('script');
  script.src = 'vistoria-add-item.js?v=1';
  script.dataset.vistoriaAddItem = 'true';
  document.body.appendChild(script);
})();

// Módulo isolado para medida corretiva recomendada das N/C.
(function carregarModuloMedidaCorretiva() {
  if (document.querySelector('script[data-vistoria-medida-corretiva]')) return;
  const script = document.createElement('script');
  script.src = 'vistoria-medida-corretiva.js?v=1';
  script.dataset.vistoriaMedidaCorretiva = 'true';
  document.body.appendChild(script);
})();