(function () {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  function normalizarComandos(texto) {
    return String(texto || '')
      .replace(/definir\s+respons[aá]vel\s*:?/gi, '[[RESPONSAVEL]]')
      .replace(/definir\s+data\s*:?/gi, '[[DATA]]');
  }

  function limparTrecho(texto) {
    return String(texto || '')
      .replace(/^[\s,;:.\-]+/, '')
      .replace(/[\s,;:.\-]+$/, '')
      .trim();
  }

  function converterDataFalada(texto) {
    const bruto = limparTrecho(texto).toLowerCase();
    if (!bruto) return null;

    const numerica = bruto.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
    if (numerica) {
      let ano = Number(numerica[3]);
      if (ano < 100) ano += 2000;
      const mes = Number(numerica[2]);
      const dia = Number(numerica[1]);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      }
    }

    const numeros = {
      'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
      'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
      'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14,
      'catorze': 14, 'quinze': 15, 'dezesseis': 16, 'dezessete': 17,
      'dezoito': 18, 'dezenove': 19, 'vinte': 20, 'vinte e um': 21,
      'vinte e dois': 22, 'vinte e três': 23, 'vinte e tres': 23,
      'vinte e quatro': 24, 'vinte e cinco': 25, 'vinte e seis': 26,
      'vinte e sete': 27, 'vinte e oito': 28, 'vinte e nove': 29,
      'trinta': 30, 'trinta e um': 31
    };

    const meses = {
      janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5,
      junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10,
      novembro: 11, dezembro: 12
    };

    const padrao = bruto.match(/^(.+?)\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(.+))?$/i);
    if (!padrao) return null;

    const diaTexto = padrao[1].trim();
    const mes = meses[padrao[2].toLowerCase()];
    let dia = Number(diaTexto);
    if (!Number.isFinite(dia)) dia = numeros[diaTexto];
    if (!dia || !mes) return null;

    let ano = null;
    const anoTexto = (padrao[3] || '').trim();
    if (/^\d{4}$/.test(anoTexto)) {
      ano = Number(anoTexto);
    }

    if (!ano) {
      const metaData = document.getElementById('meta-data-auditoria')?.value || '';
      ano = Number(metaData.slice(0, 4)) || new Date().getFullYear();
    }

    return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  function separarDitado(texto) {
    const marcado = normalizarComandos(texto);
    const partes = marcado.split(/(\[\[RESPONSAVEL\]\]|\[\[DATA\]\])/);

    let modo = 'OBS';
    const saida = { obs: '', responsavel: '', dataTexto: '' };

    partes.forEach(parte => {
      if (parte === '[[RESPONSAVEL]]') {
        modo = 'RESP';
        return;
      }
      if (parte === '[[DATA]]') {
        modo = 'DATA';
        return;
      }

      const valor = limparTrecho(parte);
      if (!valor) return;

      if (modo === 'OBS') saida.obs = limparTrecho(`${saida.obs} ${valor}`);
      if (modo === 'RESP') saida.responsavel = limparTrecho(`${saida.responsavel} ${valor}`);
      if (modo === 'DATA') saida.dataTexto = limparTrecho(`${saida.dataTexto} ${valor}`);
    });

    return saida;
  }

  function configurarLinha(row) {
    const textarea = row.querySelector('textarea.obs');
    const responsavel = row.querySelector('input.responsavel-nc');
    const dataNC = row.querySelector('input.data-nc');
    const radios = row.querySelectorAll('input[type="radio"]');

    if (!textarea || !radios.length) return;

    function getStatus() {
      const marcado = row.querySelector('input[type="radio"]:checked');
      return marcado ? marcado.value : '';
    }

    function removerControleVoz() {
      const existente = row.querySelector('.speech-controls');
      if (existente) existente.remove();
    }

    function criarControleVoz() {
      if (getStatus() !== 'NC') return;
      if (row.querySelector('.speech-controls')) return;

      const container = document.createElement('div');
      container.className = 'speech-controls';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-speech';
      btn.textContent = '🎙️ Ditar N/C';

      const status = document.createElement('span');
      status.className = 'speech-status';

      container.appendChild(btn);
      container.appendChild(status);

      const ancora = dataNC?.parentElement || responsavel?.parentElement || textarea;
      ancora.insertAdjacentElement('afterend', container);

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
      let textoFinal = '';
      let textoInicialObs = '';
      let responsavelInicial = '';
      let dataInicial = '';

      function aplicarResultado(transcricao) {
        const campos = separarDitado(transcricao);

        const obsNova = limparTrecho(
          [textoInicialObs, campos.obs].filter(Boolean).join(' ')
        );
        textarea.value = obsNova;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        if (responsavel && campos.responsavel) {
          responsavel.value = campos.responsavel;
          responsavel.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (responsavel) {
          responsavel.value = responsavelInicial;
        }

        if (dataNC && campos.dataTexto) {
          const convertida = converterDataFalada(campos.dataTexto);
          if (convertida) {
            dataNC.value = convertida;
            dataNC.dispatchEvent(new Event('change', { bubbles: true }));
            status.textContent = 'Ouvindo...';
          } else {
            dataNC.value = dataInicial;
            status.textContent = 'Data não reconhecida; ajuste manualmente.';
          }
        } else if (dataNC) {
          dataNC.value = dataInicial;
        }
      }

      btn.addEventListener('click', function () {
        if (getStatus() !== 'NC') return;

        if (!ouvindo) {
          textoInicialObs = textarea.value.trim();
          responsavelInicial = responsavel?.value.trim() || '';
          dataInicial = dataNC?.value || '';
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
        status.textContent = 'Ouvindo... Use “definir responsável” e “definir data”.';
      };

      recognition.onresult = function (event) {
        let temporario = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trecho = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            textoFinal += trecho + ' ';
          } else {
            temporario += trecho;
          }
        }

        aplicarResultado((textoFinal + temporario).trim());
      };

      recognition.onerror = function (event) {
        console.error('Erro no reconhecimento de voz:', event.error);

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
        btn.textContent = '🎙️ Ditar N/C';
        btn.classList.remove('gravando');

        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        if (responsavel) responsavel.dispatchEvent(new Event('change', { bubbles: true }));
        if (dataNC) dataNC.dispatchEvent(new Event('change', { bubbles: true }));

        if (!status.textContent.includes('Data não reconhecida')) {
          status.textContent = textarea.value.trim() ? 'Ditado inserido.' : '';
        }
      };
    }

    function atualizar() {
      if (getStatus() === 'NC') criarControleVoz();
      else removerControleVoz();
    }

    atualizar();
    radios.forEach(function (radio) {
      radio.addEventListener('change', atualizar);
    });
  }

  function iniciar() {
    document.querySelectorAll('.item-row').forEach(configurarLinha);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
