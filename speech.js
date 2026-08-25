(function () {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  function configurarLinha(row) {
    const textarea = row.querySelector('textarea.obs');
    const radios = row.querySelectorAll('input[type="radio"]');

    if (!textarea || !radios.length) return;

    function getStatus() {
      const marcado = row.querySelector('input[type="radio"]:checked');
      return marcado ? marcado.value : '';
    }

    function removerControleVoz() {
      const existente = row.querySelector('.speech-controls');

      if (existente) {
        existente.remove();
      }
    }

    function criarControleVoz() {
      // Só cria se realmente estiver N/C
      if (getStatus() !== 'NC') return;

      // Evita duplicar
      if (row.querySelector('.speech-controls')) return;

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

      btn.addEventListener('click', function () {
        if (getStatus() !== 'NC') return;

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

      recognition.onstart = function () {
        ouvindo = true;

        btn.textContent = '⏹️ Parar';
        btn.classList.add('gravando');

        status.textContent = 'Ouvindo...';
      };

      recognition.onresult = function (event) {
        let temporario = '';

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const trecho = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            textoFinal += trecho + ' ';
          } else {
            temporario += trecho;
          }
        }

        let resultado = textoInicial;

        if (resultado && (textoFinal || temporario)) {
          resultado += ' ';
        }

        resultado += textoFinal + temporario;

        // TEXTO DIRETO NO CAMPO OBSERVAÇÃO
        textarea.value = resultado.trim();

        textarea.dispatchEvent(
          new Event('input', { bubbles: true })
        );
      };

      recognition.onerror = function (event) {
        console.error(
          'Erro no reconhecimento de voz:',
          event.error
        );

        if (event.error === 'not-allowed') {
          status.textContent = 'Microfone não autorizado.';
        } else if (event.error === 'no-speech') {
          status.textContent = 'Nenhuma fala detectada.';
        } else {
          status.textContent = 'Erro no reconhecimento.';
        }
      };

      recognition.onend = function () {
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
    }

    function atualizar() {
      const status = getStatus();

      if (status === 'NC') {
        criarControleVoz();
      } else {
        removerControleVoz();
      }
    }

    // Estado inicial
    atualizar();

    // Atualiza quando C / N/C / N/A mudar
    radios.forEach(function (radio) {
      radio.addEventListener('change', atualizar);
    });
  }

  function iniciar() {
    document
      .querySelectorAll('.item-row')
      .forEach(configurarLinha);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      iniciar
    );
  } else {
    iniciar();
  }
})();
