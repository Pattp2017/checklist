(function () {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  function configurarVozNaObservacao() {
    const linhas = document.querySelectorAll('.item-row');

    linhas.forEach((row) => {
      const textarea = row.querySelector('textarea.obs');
      const radioNC = row.querySelector('input[type="radio"][value="NC"]');

      if (!textarea || !radioNC) return;

      // Evita duplicar controles
      if (textarea.dataset.speechReady === 'true') return;
      textarea.dataset.speechReady = 'true';

      const container = document.createElement('div');
      container.className = 'speech-controls';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-speech';
      btn.textContent = '🎙️ Ditar';

      const status = document.createElement('span');
      status.className = 'speech-status';

      container.appendChild(btn);
      container.appendChild(status);

      textarea.insertAdjacentElement('afterend', container);

      function atualizarVisibilidade() {
        const ncSelecionado = radioNC.checked;

        if (ncSelecionado) {
          container.style.display = 'flex';
        } else {
          container.style.display = 'none';
          status.textContent = '';
        }
      }

      atualizarVisibilidade();

      const radios = row.querySelectorAll('input[type="radio"]');

      radios.forEach((radio) => {
        radio.addEventListener('change', atualizarVisibilidade);
      });

      // Sem suporte ao reconhecimento de voz
      if (!SpeechRecognition) {
        btn.disabled = true;
        btn.textContent = '🎙️ Voz indisponível';
        return;
      }

      const recognition = new SpeechRecognition();

      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      let ouvindo = false;
      let textoInicial = '';
      let textoFinal = '';

      btn.addEventListener('click', () => {
        if (!radioNC.checked) return;

        if (!ouvindo) {
          textoInicial = textarea.value.trim();
          textoFinal = '';

          try {
            recognition.start();
          } catch (erro) {
            console.error('Erro ao iniciar reconhecimento:', erro);
          }
        } else {
          recognition.stop();
        }
      });

      recognition.onstart = () => {
        ouvindo = true;

        btn.textContent = '⏹️ Parar';
        btn.classList.add('gravando');

        status.textContent = 'Ouvindo...';
      };

      recognition.onresult = (event) => {
        let textoTemporario = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trecho = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            textoFinal += trecho + ' ';
          } else {
            textoTemporario += trecho;
          }
        }

        let resultado = textoInicial;

        if (resultado && (textoFinal || textoTemporario)) {
          resultado += ' ';
        }

        resultado += textoFinal + textoTemporario;

        // O texto vai diretamente para a Observação
        textarea.value = resultado.trim();

        // Dispara evento para o persist.js salvar
        textarea.dispatchEvent(
          new Event('input', { bubbles: true })
        );
      };

      recognition.onerror = (event) => {
        console.error(
          'Erro no reconhecimento de voz:',
          event.error
        );

        if (event.error === 'not-allowed') {
          status.textContent = 'Permissão do microfone negada.';
        } else if (event.error === 'no-speech') {
          status.textContent = 'Nenhuma fala detectada.';
        } else {
          status.textContent = 'Erro no reconhecimento de voz.';
        }
      };

      recognition.onend = () => {
        ouvindo = false;

        btn.textContent = '🎙️ Ditar';
        btn.classList.remove('gravando');

        if (textarea.value.trim()) {
          status.textContent = 'Texto inserido.';
        } else {
          status.textContent = '';
        }

        textarea.dispatchEvent(
          new Event('change', { bubbles: true })
        );
      };
    });
  }

  function iniciar() {
    configurarVozNaObservacao();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
