(() => {
  const audioByRow = new WeakMap();

  function setupObservationArea(row) {
    const textarea = row.querySelector('textarea.obs');
    if (!textarea || textarea.closest('.obs-area')) return;

    const area = document.createElement('div');
    area.className = 'obs-area';
    textarea.parentNode.insertBefore(area, textarea);
    area.appendChild(textarea);

    const tools = document.createElement('div');
    tools.className = 'audio-tools';

    const btnRecord = document.createElement('button');
    btnRecord.type = 'button';
    btnRecord.className = 'audio-btn';
    btnRecord.textContent = '🎙️ Gravar áudio';

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'audio-btn delete';
    btnDelete.textContent = 'Excluir áudio';
    btnDelete.hidden = true;

    const status = document.createElement('span');
    status.className = 'audio-status';
    status.textContent = 'Use texto ou áudio para registrar a observação.';

    const audio = document.createElement('audio');
    audio.className = 'audio-preview';
    audio.controls = true;
    audio.hidden = true;

    tools.append(btnRecord, btnDelete, status);
    area.append(tools, audio);

    const radios = row.querySelectorAll('input[type="radio"]');
    const nc = Array.from(radios).find(r => r.value === 'NC');

    const updateVisibility = () => {
      const shouldShow = !!(nc && nc.checked) || textarea.value.trim() || audioByRow.has(row);
      area.style.display = shouldShow ? 'block' : 'none';
      row.classList.toggle('is-nc', !!(nc && nc.checked));
    };

    radios.forEach(r => r.addEventListener('change', updateVisibility));
    textarea.addEventListener('input', updateVisibility);
    updateVisibility();

    let mediaRecorder = null;
    let chunks = [];
    let stream = null;

    btnRecord.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        alert('Este navegador não oferece suporte à gravação de áudio. Use Chrome, Edge ou Safari atualizados.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.addEventListener('dataavailable', e => {
          if (e.data && e.data.size) chunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          const type = mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type });
          const old = audioByRow.get(row);
          if (old?.url) URL.revokeObjectURL(old.url);
          const url = URL.createObjectURL(blob);
          audioByRow.set(row, { blob, url, type });
          audio.src = url;
          audio.hidden = false;
          btnDelete.hidden = false;
          btnRecord.textContent = '🎙️ Gravar novamente';
          btnRecord.classList.remove('recording');
          status.textContent = 'Áudio gravado nesta sessão.';
          if (stream) stream.getTracks().forEach(t => t.stop());
          updateVisibility();
        });

        mediaRecorder.start();
        btnRecord.textContent = '⏹️ Parar gravação';
        btnRecord.classList.add('recording');
        status.textContent = 'Gravando…';
      } catch (err) {
        console.error(err);
        alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
      }
    });

    btnDelete.addEventListener('click', () => {
      const current = audioByRow.get(row);
      if (current?.url) URL.revokeObjectURL(current.url);
      audioByRow.delete(row);
      audio.removeAttribute('src');
      audio.load();
      audio.hidden = true;
      btnDelete.hidden = true;
      btnRecord.textContent = '🎙️ Gravar áudio';
      status.textContent = 'Use texto ou áudio para registrar a observação.';
      updateVisibility();
    });
  }

  function improveInitialLocal() {
    const select = document.getElementById('select-local');
    if (!select) return;

    const firstReal = Array.from(select.options).find(o => o.value !== 'ALL');
    if (!firstReal) return;

    select.value = firstReal.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function init() {
    document.querySelectorAll('.item-row').forEach(setupObservationArea);
    improveInitialLocal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
