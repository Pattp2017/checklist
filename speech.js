(function () {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  function adicionarBotoesDeVoz() {
    const observacoes = document.querySelectorAll('.item-row textarea.obs');

    observacoes.forEach((textarea) => {
      // Evita criar o botão mais de uma vez
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

      // Navegador sem suporte
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
      let textoAnterior = '';

      btn.addEventListener('click', () => {
        if (!ouvindo) {
          textoAnterior = textarea.value.trim();

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
        let definitivo = '';
        let temporario = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const texto = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            definitivo += texto;
          } else {
            temporario += texto;
          }
        }

        let resultado = textoAnterior;

        if (resultado && (definitivo || temporario)) {
          resultado += ' ';
        }

        resultado += definitivo + temporario;

        textarea.value = resultado.trim();

        // Avisa o persist.js que houve alteração
        textarea.dispatchEvent(
          new Event('change', { bubbles: true })
        );
      };

      recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);

        if (event.error === 'not-allowed') {
          status.textContent = 'Permissão do microfone negada.';
        } else if (event.error === 'no-speech') {
          status.textContent = 'Nenhuma fala detectada.';
        } else {
          status.textContent = 'Não foi possível reconhecer a fala.';
        }
      };

      recognition.onend = () => {
        ouvindo = false;

        btn.textContent = '🎙️ Ditar';
        btn.classList.remove('gravando');

        if (
          status.textContent === 'Ouvindo...' ||
          status.textContent === ''
        ) {
          status.textContent = 'Texto inserido.';
        }

        // Salva novamente ao terminar
        textarea.dispatchEvent(
          new Event('change', { bubbles: true })
        );
      };
    });
  }

  function iniciar() {
    adicionarBotoesDeVoz();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
