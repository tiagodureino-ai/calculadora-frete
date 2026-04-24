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

    // Taxa de impostos
    const isExportacao = document.getElementById('exportacao').checked;
    const isFreteInterno = document.getElementById('freteInterno').checked;
    let taxaImpostos = 0;
    if (isFreteInterno) {
        taxaImpostos = 0;
    } else {
        const icms = isExportacao ? 0 : getVal('icms');
        taxaImpostos = (icms + getVal('pis') + getVal('cofins')) / 100;
    }

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

// Troca de abas
function trocarAba(aba) {
    document.getElementById('abaSimulacao').classList.toggle('hidden', aba !== 'simulacao');
    document.getElementById('abaComparativo').classList.toggle('hidden', aba !== 'comparativo');
    document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (i === 0 && aba === 'simulacao') || (i === 1 && aba === 'comparativo'));
    });
}

// Comparar cenários
function comparar() {
    const kmInternoIda = getVal('compKmInternoIda');
    const kmInternoVolta = getVal('compKmInternoVolta');
    const kmExternoIda = getVal('compKmExternoIda');
    const kmExternoVolta = getVal('compKmExternoVolta');
    const oferta = getVal('compOferta');
    const tons = getVal('compToneladas');

    if (!kmInternoIda && !kmInternoVolta) {
        alert('Informe o KM da rota interna.');
        return;
    }

    // Custos por KM
    const subtotalOpKm = getVal('custoCombustiveis') + getVal('custoPneus') +
        getVal('custoManutencao') + getVal('custoMotorista') + getVal('custoOutros');
    const deprecKm = getVal('custoDepreciacao');
    const custoComDepKm = subtotalOpKm + deprecKm;

    // Cenário 1: só interno (ida vazio + volta carregado)
    const c1KmTotal = kmInternoIda + kmInternoVolta;
    const c1ComDeprec = c1KmTotal * custoComDepKm;
    const c1SemDeprec = c1KmTotal * subtotalOpKm;

    // Cenário 2: externo + interno
    const kmExterno = kmExternoIda + kmExternoVolta;
    const kmInterno = kmInternoIda + kmInternoVolta;
    const c2KmTotal = kmExterno + kmInterno;
    const c2ComDeprec = c2KmTotal * custoComDepKm;
    const c2SemDeprec = c2KmTotal * subtotalOpKm;

    // Receita do frete externo (com impostos)
    const isExportacao = document.getElementById('compExportacao').checked;
    const icms = isExportacao ? 0 : getVal('icms');
    const taxaImpostos = (icms + getVal('pis') + getVal('cofins')) / 100;
    const receitaBruta = oferta * tons;
    const receitaLiquida = receitaBruta - (receitaBruta * taxaImpostos);

    // Custo líquido cenário 2
    const c2LiqCom = c2ComDeprec - receitaLiquida;
    const c2LiqSem = c2SemDeprec - receitaLiquida;

    // Preencher Cenário 1
    document.getElementById('c1KmTotal').textContent = c1KmTotal.toLocaleString('pt-BR');
    document.getElementById('c1CustoComDeprec').textContent = formatBRL(c1ComDeprec);
    document.getElementById('c1CustoSemDeprec').textContent = formatBRL(c1SemDeprec);
    document.getElementById('c1CustoTonCom').textContent = formatBRL(c1ComDeprec / tons) + '/ton';
    document.getElementById('c1CustoTonSem').textContent = formatBRL(c1SemDeprec / tons) + '/ton';

    // Preencher Cenário 2
    document.getElementById('c2KmExterno').textContent = kmExterno.toLocaleString('pt-BR');
    document.getElementById('c2KmInterno').textContent = kmInterno.toLocaleString('pt-BR');
    document.getElementById('c2KmTotal').textContent = c2KmTotal.toLocaleString('pt-BR');
    document.getElementById('c2Receita').textContent = formatBRL(receitaLiquida);
    document.getElementById('c2CustoComDeprec').textContent = formatBRL(c2ComDeprec);
    document.getElementById('c2CustoSemDeprec').textContent = formatBRL(c2SemDeprec);
    document.getElementById('c2LiqComDeprec').textContent = formatBRL(c2LiqCom);
    document.getElementById('c2LiqSemDeprec').textContent = formatBRL(c2LiqSem);

    // Economia
    const economiaCom = c1ComDeprec - c2LiqCom;
    const economiaSem = c1SemDeprec - c2LiqSem;
    document.getElementById('compEconomiaCom').textContent = formatBRL(economiaCom);
    document.getElementById('compEconomiaSem').textContent = formatBRL(economiaSem);
    document.getElementById('compEconomiaCom').style.color = economiaCom > 0 ? '#16a34a' : '#dc2626';
    document.getElementById('compEconomiaSem').style.color = economiaSem > 0 ? '#16a34a' : '#dc2626';

    // Veredicto
    const box = document.getElementById('compVerdictBox');
    const icon = document.getElementById('compVerdictIcon');
    const text = document.getElementById('compVerdictText');
    box.classList.remove('viable', 'partial', 'inviable');

    if (economiaCom > 0) {
        box.classList.add('viable');
        icon.textContent = '\u2705';
        text.textContent = 'Cenário 2 (Externo + Interno) é mais vantajoso! Economia de ' + formatBRL(economiaCom) + ' c/ depreciação.';
    } else {
        box.classList.add('inviable');
        icon.textContent = '\u274C';
        text.textContent = 'Cenário 1 (Só Interno) é mais vantajoso. Frete externo aumenta o custo em ' + formatBRL(Math.abs(economiaCom)) + '.';
    }

    document.getElementById('resultadoComp').classList.remove('hidden');
    document.getElementById('resultadoComp').scrollIntoView({ behavior: 'smooth' });
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

// Toggles mutuamente exclusivos
document.getElementById('exportacao').addEventListener('change', function() {
    if (this.checked) document.getElementById('freteInterno').checked = false;
});
document.getElementById('freteInterno').addEventListener('change', function() {
    if (this.checked) document.getElementById('exportacao').checked = false;
});

atualizarTotais();
