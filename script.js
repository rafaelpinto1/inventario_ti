document.addEventListener("DOMContentLoaded", function () {
    const splashScreen = document.getElementById("splash-screen");
    const scannerVideo = document.getElementById("scanner-video");

    const matriculaInput = document.getElementById("matricula");
    const nomeInput = document.getElementById("nome");
    const setorSelect = document.getElementById("setor");
    const codigoPatrimonioInput = document.getElementById("codigo-patrimonio");
    const itemTypeSelect = document.getElementById("item-type");
    const itensTabela = document.getElementById("itens-tabela").getElementsByTagName('tbody')[0];

    const adicionarItemBtn = document.getElementById("adicionar-item");
    const novoFuncionarioBtn = document.getElementById("novo-funcionario");
    const exportarExcelBtn = document.getElementById("exportar-excel");

    let funcionarios = {}; // Objeto para armazenar os itens por funcionário
    let currentMatricula = ""; // Matrícula do funcionário atual

    // Pré-carregar o som de beep
    const beepSound = document.getElementById('beep-sound');

    // Função para tocar o som do "beep" quando um código for lido
    function tocarSom() {
        beepSound.currentTime = 0;  // Reseta o áudio (caso tenha tocado anteriormente)
        beepSound.play().catch((error) => {
            console.error("Erro ao tentar reproduzir o som:", error);
        }); // Reproduz o som
    }

    // Função para inicializar a câmera
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Para usar a câmera traseira
            });
            scannerVideo.srcObject = stream;
            scannerVideo.play();
            startScanner(); // Inicia a leitura do código de barras assim que a câmera começa
        } catch (err) {
            console.error("Erro ao acessar a câmera: ", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    }

    // Função para iniciar a leitura de códigos de barras
    function startScanner() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerVideo, // O alvo será o vídeo da câmera
            },
            decoder: {
                readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"] // Tipos de código de barras que você deseja ler
            }
        }, function (err) {
            if (err) {
                console.log(err);
                return;
            }
            Quagga.start(); // Inicia a leitura
        });

        // Quando o código de barras for lido com sucesso
        Quagga.onDetected(function(result) {
            const codigo = result.codeResult.code;
            codigoPatrimonioInput.value = codigo; // Preenche o campo com o código do patrimônio

            // Toca o som de beep quando o código for lido
            tocarSom();

            // Garantir que o campo permaneça **sempre editável** após o beep
            codigoPatrimonioInput.readOnly = false; // Mantém o campo editável após o beep
        });
    }

    // Função para esconder a splash screen depois de 3 segundos ou após iniciar a câmera
    async function hideSplashScreen() {
        splashScreen.style.display = "none"; // Esconde a splash screen
        await startCamera(); // Inicia a câmera após 3 segundos
    }

    // Exibe a splash screen por 3 segundos e depois esconde
    setTimeout(hideSplashScreen, 3000); // Tempo para mostrar a splash screen (3 segundos)

    // Função para adicionar um item à tabela
    adicionarItemBtn.addEventListener("click", function() {
        const matricula = matriculaInput.value.trim();
        const nome = nomeInput.value.trim();
        const setor = setorSelect.value;
        const codigoPatrimonio = codigoPatrimonioInput.value.trim();
        const tipoItem = itemTypeSelect.value;

        if (!matricula || !nome || !codigoPatrimonio) {
            alert("Por favor, preencha todos os campos!");
            return;
        }

        // Se for um novo funcionário, cria um novo registro no objeto funcionarios
        if (matricula !== currentMatricula) {
            currentMatricula = matricula;
            funcionarios[matricula] = {
                nome: nome,
                setor: setor,
                itens: {
                    desktop: [],
                    notebook: [],
                    monitor: [],
                    teclado: [],
                    webcam: [],
                    headset: [],
                    nobreak: [],
                    leitorCodigoBarra: [] // Adicionando a propriedade para o Leitor de Código de Barras
                }
            };
        }

        // Adiciona o item ao tipo correto
        funcionarios[matricula].itens[tipoItem].push(codigoPatrimonio);

        // Adiciona ou atualiza os itens na linha do funcionário
        let row = Array.from(itensTabela.rows).find(row => row.cells[0].innerText === matricula);

        if (!row) {
            row = itensTabela.insertRow();
            row.innerHTML = ` 
              <td>${matricula}</td>
              <td>${nome}</td>
              <td>${setor}</td>
              <td id="desktop-${matricula}"></td>
              <td id="notebook-${matricula}"></td>
              <td id="monitor-${matricula}"></td>
              <td id="teclado-${matricula}"></td>
              <td id="webcam-${matricula}"></td>
              <td id="headset-${matricula}"></td>
              <td id="nobreak-${matricula}"></td>
              <td id="leitor-codigo-barra-${matricula}"></td> <!-- Coluna do Leitor de Código de Barras -->
              <td><button class="delete-funcionario">Excluir</button></td>
            `;
        }

        // Atualiza os itens na tabela
        for (const tipo in funcionarios[matricula].itens) {
            const itemCell = document.getElementById(`${tipo}-${matricula}`);
            itemCell.innerHTML = funcionarios[matricula].itens[tipo].join("<br>");
        }

        // Limpa os campos após adicionar o item, mas mantém os dados do funcionário
        codigoPatrimonioInput.value = "";
        itemTypeSelect.value = "desktop";

        // Função de exclusão do funcionário
        row.querySelector(".delete-funcionario").addEventListener("click", function() {
            delete funcionarios[matricula];
            itensTabela.deleteRow(row.rowIndex - 1); // Remove a linha do funcionário
        });
    });

    // Função para iniciar um novo funcionário
    novoFuncionarioBtn.addEventListener("click", function() {
        matriculaInput.value = "";
        nomeInput.value = "";
        setorSelect.value = "compras";
        codigoPatrimonioInput.value = "";
        itemTypeSelect.value = "desktop";
        currentMatricula = ""; // Reseta a matrícula para permitir adicionar um novo funcionário
    });

    // Função para exportar para Excel
    exportarExcelBtn.addEventListener("click", function() {
        // Verifica se há dados na variável funcionarios
        if (Object.keys(funcionarios).length === 0) {
            alert("Não há dados para exportar!");
            return;
        }

        // Inicializa a estrutura de dados para exportação
        let tableData = [["Matrícula", "Nome", "Setor", "Desktop", "Notebook", "Monitor", "Teclado", "Webcam", "Headset", "Nobreak", "Leitor de Código de Barras"]];

        // Coleta os dados dos funcionários e organiza nas colunas corretas
        for (const matricula in funcionarios) {
            const funcionario = funcionarios[matricula];
            const rowData = [
                matricula, 
                funcionario.nome, 
                funcionario.setor, 
                funcionario.itens.desktop.join("<br>"), 
                funcionario.itens.notebook.join("<br>"), 
                funcionario.itens.monitor.join("<br>"), 
                funcionario.itens.teclado.join("<br>"), 
                funcionario.itens.webcam.join("<br>"), 
                funcionario.itens.headset.join("<br>"), 
                funcionario.itens.nobreak.join("<br>"),
                funcionario.itens.leitorCodigoBarra.join("<br>") // Incluindo Leitor de Código de Barras
            ];
            tableData.push(rowData);
        }

        // Cria um arquivo Excel
        const worksheet = XLSX.utils.aoa_to_sheet(tableData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventário");
        XLSX.writeFile(workbook, "inventario.xlsx");
    });
});
