// Abre/fecha painel de configurações
function toggleConfig() {
    document.getElementById('configPanel').classList.toggle('hidden');
}

// Atualiza totais calculados no painel de custos
function atualizarTotais() {
    const custos = [
        'custoCombustiveis', 'custoPneus', 'custoManutencao',
        'custoMotorista', 'custoOutros'
    ];
    const subtotal = custos.reduce((s, id) => s + getVal(id), 0);
    const deprec = getVal('custoDepreciacao');

    document.getElementById('subtotalOp').textContent = subtotal.toFixed(4);
    document.getElementById('custoTotalKm').textContent = (subtotal + deprec).toFixed(4);

    const impostos = getVal('icms') + getVal('pis') + getVal('cofins');
    document.getElementById('totalImpostos').textContent = impostos.toFixed(2) + '%';
}

function getVal(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

function formatBRL(v) {
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcular() {
    const km = getVal('km');
    const oferta = getVal('oferta');
    const tons = getVal('toneladas');

    if (!km || km <= 0) {
        alert('Informe o KM da rota.');
        return;
    }
    if (!oferta || oferta <= 0) {
        alert('Informe o valor R$/TON ofertado.');
        return;
    }

    // Custos por KM
    const subtotalOpKm = getVal('custoCombustiveis') + getVal('custoPneus') +
        getVal('custoManutencao') + getVal('custoMotorista') + getVal('custoOutros');
    const deprecKm = getVal('custoDepreciacao');

    // Taxa de impostos (exportação = isento de ICMS)
    const isExportacao = document.getElementById('exportacao').checked;
    const icms = isExportacao ? 0 : getVal('icms');
    const taxaImpostos = (icms + getVal('pis') + getVal('cofins')) / 100;

    // Cálculos
    const fatBruto = oferta * tons;
    const impostos = fatBruto * taxaImpostos;
    const fatLiquido = fatBruto - impostos;
    const custoOp = km * subtotalOpKm;
    const saldo = fatLiquido - custoOp;
    const deprecRota = km * deprecKm;
    const cobertura = deprecRota !== 0 ? saldo / deprecRota : 0;

    // R$/TON mínimos
    const minOp = (km * subtotalOpKm) / (tons * (1 - taxaImpostos));
    const minTotal = (km * (subtotalOpKm + deprecKm)) / (tons * (1 - taxaImpostos));

    // Preencher resultados
    document.getElementById('resFatBruto').textContent = formatBRL(fatBruto);
    document.getElementById('resImpostos').textContent = '- ' + formatBRL(impostos);
    document.getElementById('resFatLiquido').textContent = formatBRL(fatLiquido);
    document.getElementById('resCustoOp').textContent = '- ' + formatBRL(custoOp);
    document.getElementById('resSaldo').textContent = formatBRL(saldo);
    document.getElementById('resCobertura').textContent = (cobertura * 100).toFixed(1) + '%';

    // R$/KM pelo preço ofertado
    const kmBruto = fatBruto / km;
    const kmLiquido = fatLiquido / km;
    const kmSaldo = kmLiquido - (subtotalOpKm + deprecKm);

    document.getElementById('refKmBruto').textContent = 'R$ ' + kmBruto.toFixed(4).replace('.', ',');
    document.getElementById('refKmLiquido').textContent = 'R$ ' + kmLiquido.toFixed(4).replace('.', ',');

    document.getElementById('refMinOp').textContent = formatBRL(minOp) + '/ton';
    document.getElementById('refMinTotal').textContent = formatBRL(minTotal) + '/ton';

    // Cor do saldo
    const cardSaldo = document.getElementById('cardSaldo');
    cardSaldo.classList.remove('positive', 'negative-result');
    cardSaldo.classList.add(saldo >= 0 ? 'positive' : 'negative-result');

    // Cor da cobertura
    const cardCob = document.getElementById('cardCobertura');
    cardCob.style.background = cobertura >= 1 ? '#f0fdf4' : cobertura >= 0 ? '#fffbeb' : '#fef2f2';

    // Verdict
    const box = document.getElementById('verdictBox');
    const icon = document.getElementById('verdictIcon');
    const text = document.getElementById('verdictText');
    box.classList.remove('viable', 'partial', 'inviable');

    if (saldo >= deprecRota && saldo > 0) {
        box.classList.add('viable');
        icon.textContent = '\u2705';
        text.textContent = 'Oferta VIÁVEL — Cobre custo operacional e depreciação total.';
    } else if (saldo >= 0) {
        box.classList.add('partial');
        icon.textContent = '\u26A0\uFE0F';
        text.textContent = 'Oferta PARCIAL — Cobre custo operacional, mas não cobre toda a depreciação (' + (cobertura * 100).toFixed(1) + '%).';
    } else {
        box.classList.add('inviable');
        icon.textContent = '\u274C';
        text.textContent = 'Oferta INVIÁVEL — Não cobre nem o custo operacional. Prejuízo de ' + formatBRL(Math.abs(saldo)) + '.';
    }

    document.getElementById('resultado').classList.remove('hidden');
    document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
}

// Listeners para atualizar totais ao editar parâmetros
document.querySelectorAll('.config-panel input').forEach(input => {
    input.addEventListener('input', atualizarTotais);
});

// Calcular ao pressionar Enter nos campos da rota
document.querySelectorAll('.calc-panel input').forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') calcular();
    });
});

atualizarTotais();
