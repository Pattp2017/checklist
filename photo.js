// =========================================================
// photo.js
// Foto somente para itens N/C
// =========================================================

(function () {

  const fotosPendentes = new Map();


  function getChaveItem(row) {
    const setor = row.dataset.setor || '';
    const item = row.dataset.item || '';

    return setor + '||' + item;
  }


  function getStatus(row) {
    const radio = row.querySelector(
      'input[type="radio"]:checked'
    );

    return radio ? radio.value : '';
  }


  function removerFoto(row) {
    const chave = getChaveItem(row);

    fotosPendentes.delete(chave);

    delete row.dataset.temFoto;

    const botao = row.querySelector(
      '.btn-foto'
    );

    if (botao) {
      botao.textContent = '📷 Foto';
      botao.classList.remove('foto-ok');
    }
  }


  function registrarFoto(row, arquivo) {
    const chave = getChaveItem(row);

    fotosPendentes.set(
      chave,
      arquivo
    );

    row.dataset.temFoto = 'true';

    const botao = row.querySelector(
      '.btn-foto'
    );

    if (botao) {
      botao.textContent =
        '📷 Foto anexada ✓';

      botao.classList.add(
        'foto-ok'
      );
    }

    console.log(
      'Foto selecionada:',
      chave,
      arquivo.name,
      arquivo.size
    );
  }


  function abrirCamera(row) {

    const input =
      document.createElement('input');

    input.type = 'file';

    input.accept = 'image/*';

    input.capture = 'environment';

    input.style.display = 'none';

    document.body.appendChild(input);


    input.addEventListener(
      'change',
      function () {

        const arquivo =
          input.files &&
          input.files[0];

        if (arquivo) {
          registrarFoto(
            row,
            arquivo
          );
        }

        input.remove();
      }
    );


    input.click();
  }


  function criarBotaoFoto(row) {

    if (
      row.querySelector('.btn-foto')
    ) {
      return;
    }


    const botao =
      document.createElement('button');

    botao.type = 'button';

    botao.className =
      'btn-foto';

    botao.textContent =
      row.dataset.temFoto === 'true'
        ? '📷 Foto anexada ✓'
        : '📷 Foto';


    botao.addEventListener(
      'click',
      function () {

        abrirCamera(row);

      }
    );


    // Tenta colocar junto do botão Ditar
    const speechControls =
      row.querySelector(
        '.speech-controls'
      );


if (speechControls) {

  const status =
    speechControls.querySelector(
      '.speech-status'
    );

  if (status) {
    speechControls.insertBefore(
      botao,
      status
    );
  } else {
    speechControls.appendChild(
      botao
    );
  }

  return;
}


    // Caso o speech ainda não tenha criado
    // os controles, coloca após observação.
    const obs =
      row.querySelector(
        'textarea.obs'
      );


    if (obs) {

      obs.insertAdjacentElement(
        'afterend',
        botao
      );

    } else {

      row.appendChild(
        botao
      );
    }
  }


  function removerBotaoFoto(row) {

    const botao =
      row.querySelector(
        '.btn-foto'
      );

    if (botao) {
      botao.remove();
    }
  }


  function atualizarFoto(row) {

    const status =
      getStatus(row);


    if (status === 'NC') {

      criarBotaoFoto(row);

    } else {

      removerFoto(row);

      removerBotaoFoto(row);
    }
  }


  // =======================================================
  // ALTERAÇÃO C / NC / NA
  // =======================================================

  document.addEventListener(
    'change',
    function (event) {

      const target =
        event.target;


      if (
        !target ||
        target.type !== 'radio'
      ) {
        return;
      }


      const row =
        target.closest(
          '.item-row'
        );


      if (!row) {
        return;
      }


      atualizarFoto(row);
    }
  );


  // =======================================================
  // ITENS CRIADOS DINAMICAMENTE
  // =======================================================

  const observer =
    new MutationObserver(
      function () {

        document
          .querySelectorAll(
            '.item-row'
          )
          .forEach(
            atualizarFoto
          );

      }
    );


  function iniciar() {

    const checklist =
      document.getElementById(
        'checklist'
      );


    if (checklist) {

      observer.observe(
        checklist,
        {
          childList: true,
          subtree: true
        }
      );
    }


    document
      .querySelectorAll(
        '.item-row'
      )
      .forEach(
        atualizarFoto
      );
  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      iniciar
    );

  } else {

    iniciar();
  }


  // =======================================================
  // API
  // =======================================================

// =======================================================
// API
// =======================================================

window.VistoriaFotos = {

  getFoto(row) {
    return fotosPendentes.get(
      getChaveItem(row)
    ) || null;
  },

  getFotoPorDados(setor, item) {
    return fotosPendentes.get(
      setor + '||' + item
    ) || null;
  },

  getFotoPorChave(chave) {
    return fotosPendentes.get(chave) || null;
  },

  getQuantidade() {
    return fotosPendentes.size;
  },

  getTodas() {
    return Array.from(
      fotosPendentes.entries()
    );
  },

  removerFoto,

  limpar() {
    fotosPendentes.clear();

    document
      .querySelectorAll('.btn-foto')
      .forEach(botao => botao.remove());
  }

};

})();
