// Abre/fecha painel de configurações
function toggleConfig() {
    document.getElementById('configPanel').classList.toggle('hidden');
}

// Conjuntos de custos: padrão (Julho c/ depreciação reduzida) e alternativo (depreciação cheia)
const CUSTOS_PADRAO = {
    custoCombustiveis: '2.8712',
    custoPneus: '0.2440',
    custoManutencao: '0.6514',
    custoMotorista: '1.5764',
    custoOutros: '0.3590',
    custoDepreciacao: '0.1020'
};

const CUSTOS_ALTERNATIVO = {
    custoCombustiveis: '2.8712',
    custoPneus: '0.2440',
    custoManutencao: '0.6514',
    custoMotorista: '1.5764',
    custoOutros: '0.3590',
    custoDepreciacao: '2.0721'
};

function alternarCustoAlternativo() {
    const ativo = document.getElementById('custoAlternativo').checked;
    const conjunto = ativo ? CUSTOS_ALTERNATIVO : CUSTOS_PADRAO;
    Object.keys(conjunto).forEach(id => {
        document.getElementById(id).value = conjunto[id];
    });
    atualizarTotais();
    // Oculta resultados antigos para forçar novo cálculo
    document.getElementById('resultado').classList.add('hidden');
    document.getElementById('resultadoComp').classList.add('hidden');
    document.getElementById('resultadoSaca').classList.add('hidden');
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
    document.getElementById('abaSaca').classList.toggle('hidden', aba !== 'saca');
    document.getElementById('abaCalcario').classList.toggle('hidden', aba !== 'calcario');
    document.getElementById('abaCotacao').classList.toggle('hidden', aba !== 'cotacao');
    const map = { simulacao: 0, comparativo: 1, saca: 2, calcario: 3, cotacao: 4 };
    document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', i === map[aba]);
    });
}

// Simulador Calcário
function calcularCalcario() {
    // Mercadorias
    const qtdCal = getVal('calcQtdCalcario');
    const qtdGes = getVal('calcQtdGesso');
    const qtdTotal = qtdCal + qtdGes;
    const precoCompraCal = getVal('calcPrecoCompraCalcario');
    const precoCompraGes = getVal('calcPrecoCompraGesso');
    const precoVendaCal = getVal('calcPrecoVendaCalcario');
    const precoVendaGes = getVal('calcPrecoVendaGesso');

    if (qtdTotal <= 0) {
        alert('Informe a quantidade de calcário ou gesso.');
        return;
    }

    // Custo aquisição e receita
    const custoAqCal = precoCompraCal * qtdCal;
    const custoAqGes = precoCompraGes * qtdGes;
    const custoAqTotal = custoAqCal + custoAqGes;
    const receitaCal = precoVendaCal * qtdCal;
    const receitaGes = precoVendaGes * qtdGes;
    const receitaBruta = receitaCal + receitaGes;

    // Transporte
    const coletaPorTon = getVal('calcColeta');
    const entregaPorTon = getVal('calcEntrega');
    const transpColeta = coletaPorTon * qtdTotal;
    const transpEntrega = entregaPorTon * qtdTotal;
    const transpTotal = transpColeta + transpEntrega;

    // Parâmetros
    const creditoIcmsRecup = parseInt(document.getElementById('calcCreditoIcms').value) === 1;
    const debitosOutras = getVal('calcDebitosOutras');
    const despAdmin = getVal('calcDespAdmin');
    const irpjCsllPct = getVal('calcIrpjCsll') / 100;

    // Alíquotas fixas
    const ICMS_INTER = 0.12;
    const BASE_REM = 0.40; // 40% (redução 60%)
    const ICMS_SAIDA = 0; // isento
    const PIS_COFINS = 0; // zero
    const ICMS_TRANSP = 0;

    // Apuração ICMS
    const baseCheia = custoAqTotal;
    const baseReduzida = baseCheia * BASE_REM;
    const creditoEntrada = baseReduzida * ICMS_INTER;
    const debitoSaida = receitaBruta * ICMS_SAIDA;
    const debitoTransp = transpTotal * ICMS_TRANSP;
    const totalDebitos = debitoSaida + debitoTransp + debitosOutras;
    // NÃO recuperável: crédito perdido (0/0). SIM: compensa com débitos, resto vira saldo credor
    const creditoCompensado = creditoIcmsRecup ? Math.min(creditoEntrada, totalDebitos) : 0;
    const creditoReconhecido = creditoIcmsRecup ? creditoCompensado : 0;
    const saldoCredor = creditoIcmsRecup ? (creditoEntrada - creditoCompensado) : 0;

    // DRE
    const icmsVendas = debitoSaida;
    const pisCofins = receitaBruta * PIS_COFINS;
    const receitaLiquida = receitaBruta - icmsVendas - pisCofins;
    const compra = -custoAqTotal;
    const transpColetaNeg = -transpColeta;
    const cmv = compra + transpColetaNeg + creditoReconhecido;
    const lucroBruto = receitaLiquida + cmv;
    const transpEntregaNeg = -transpEntrega;
    const despAdminNeg = -despAdmin;
    const lucroAntesIr = lucroBruto + transpEntregaNeg + despAdminNeg;
    const irpjCsll = -Math.max(0, lucroAntesIr) * irpjCsllPct;
    const lucroLiquido = lucroAntesIr + irpjCsll;

    // Indicadores
    const margemLiq = receitaBruta > 0 ? lucroLiquido / receitaBruta : 0;
    const lucroPorTon = qtdTotal > 0 ? lucroLiquido / qtdTotal : 0;
    const custoPorTon = qtdTotal > 0 ? (custoAqTotal + transpTotal) / qtdTotal : 0;
    const precoMedioTon = qtdTotal > 0 ? receitaBruta / qtdTotal : 0;
    const transpSobreRec = receitaBruta > 0 ? transpTotal / receitaBruta : 0;
    const precoEquilibrio = custoPorTon;

    // Preencher resumo
    document.getElementById('calcLucroLiquido').textContent = formatBRL(lucroLiquido);
    document.getElementById('calcMargem').textContent = (margemLiq * 100).toFixed(2) + '%';
    document.getElementById('calcPrecoEquilibrio').textContent = formatBRL(precoEquilibrio);

    // Cor do lucro
    const cardLucro = document.getElementById('cardLucroLiq');
    cardLucro.classList.remove('positive', 'negative-result');
    cardLucro.classList.add(lucroLiquido >= 0 ? 'positive' : 'negative-result');

    // Veredicto
    const box = document.getElementById('calcVerdictBox');
    const icon = document.getElementById('calcVerdictIcon');
    const text = document.getElementById('calcVerdictText');
    box.classList.remove('viable', 'partial', 'inviable');
    if (lucroLiquido > 0 && margemLiq >= 0.05) {
        box.classList.add('viable');
        icon.textContent = '✅';
        text.textContent = 'Operação LUCRATIVA — Margem líquida de ' + (margemLiq * 100).toFixed(2) + '%.';
    } else if (lucroLiquido > 0) {
        box.classList.add('partial');
        icon.textContent = '⚠️';
        text.textContent = 'Operação com margem BAIXA (' + (margemLiq * 100).toFixed(2) + '%). Avalie se compensa o risco.';
    } else {
        box.classList.add('inviable');
        icon.textContent = '❌';
        text.textContent = 'Operação com PREJUÍZO de ' + formatBRL(Math.abs(lucroLiquido)) + '.';
    }

    // DRE
    document.getElementById('dreReceitaBruta').textContent = formatBRL(receitaBruta);
    document.getElementById('dreIcmsVendas').textContent = formatBRL(-icmsVendas);
    document.getElementById('drePisCofins').textContent = formatBRL(-pisCofins);
    document.getElementById('dreReceitaLiq').textContent = formatBRL(receitaLiquida);
    document.getElementById('dreCompra').textContent = formatBRL(compra);
    document.getElementById('dreColeta').textContent = formatBRL(transpColetaNeg);
    document.getElementById('dreCredIcms').textContent = formatBRL(creditoReconhecido);
    document.getElementById('dreCmv').textContent = formatBRL(cmv);
    document.getElementById('dreLucroBruto').textContent = formatBRL(lucroBruto);
    document.getElementById('dreEntrega').textContent = formatBRL(transpEntregaNeg);
    document.getElementById('dreDespAdmin').textContent = formatBRL(despAdminNeg);
    document.getElementById('dreLucroAntesIr').textContent = formatBRL(lucroAntesIr);
    document.getElementById('dreIrpjCsll').textContent = formatBRL(irpjCsll);
    document.getElementById('dreLucroLiquido').textContent = formatBRL(lucroLiquido);

    // Indicadores
    document.getElementById('indLucroTon').textContent = formatBRL(lucroPorTon);
    document.getElementById('indCustoTon').textContent = formatBRL(custoPorTon);
    document.getElementById('indPrecoTon').textContent = formatBRL(precoMedioTon);
    document.getElementById('indTranspRec').textContent = (transpSobreRec * 100).toFixed(2) + '%';
    document.getElementById('indCredIcmsNaoConv').textContent = formatBRL(saldoCredor);

    // Resultado por produto (custo total rateado por peso)
    const custoTonCal = qtdCal > 0 ? precoCompraCal + (transpTotal * (qtdCal / qtdTotal)) / qtdCal : 0;
    const custoTonGes = qtdGes > 0 ? precoCompraGes + (transpTotal * (qtdGes / qtdTotal)) / qtdGes : 0;
    const margemTonCal = precoVendaCal - custoTonCal;
    const margemTonGes = precoVendaGes - custoTonGes;
    const margemPctCal = precoVendaCal > 0 ? margemTonCal / precoVendaCal : 0;
    const margemPctGes = precoVendaGes > 0 ? margemTonGes / precoVendaGes : 0;
    const margemTotalCal = margemTonCal * qtdCal;
    const margemTotalGes = margemTonGes * qtdGes;

    document.getElementById('prodCustoCal').textContent = formatBRL(custoTonCal);
    document.getElementById('prodCustoGes').textContent = qtdGes > 0 ? formatBRL(custoTonGes) : '—';
    document.getElementById('prodVendaCal').textContent = formatBRL(precoVendaCal);
    document.getElementById('prodVendaGes').textContent = qtdGes > 0 ? formatBRL(precoVendaGes) : '—';
    document.getElementById('prodMargemCal').textContent = formatBRL(margemTonCal);
    document.getElementById('prodMargemGes').textContent = qtdGes > 0 ? formatBRL(margemTonGes) : '—';
    document.getElementById('prodMargemPctCal').textContent = (margemPctCal * 100).toFixed(2) + '%';
    document.getElementById('prodMargemPctGes').textContent = qtdGes > 0 ? (margemPctGes * 100).toFixed(2) + '%' : '—';
    document.getElementById('prodMargemTotalCal').textContent = formatBRL(margemTotalCal);
    document.getElementById('prodMargemTotalGes').textContent = qtdGes > 0 ? formatBRL(margemTotalGes) : '—';

    document.getElementById('resultadoCalcario').classList.remove('hidden');
    document.getElementById('resultadoCalcario').scrollIntoView({ behavior: 'smooth' });
}

// Calcular valor da saca
function calcularSaca() {
    const origem = document.getElementById('sacaOrigem').value.trim() || '—';
    const destino = document.getElementById('sacaDestino').value.trim() || '—';
    const kmIda = getVal('sacaKmIda');
    const kmVolta = getVal('sacaKmVolta');
    const tons = getVal('sacaToneladas');

    if (!kmIda && !kmVolta) {
        alert('Informe o KM Ida e Volta.');
        return;
    }
    if (!tons || tons <= 0) {
        alert('Informe as toneladas.');
        return;
    }

    // Custo por KM com depreciação (das configurações)
    const subtotalOpKm = getVal('custoCombustiveis') + getVal('custoPneus') +
        getVal('custoManutencao') + getVal('custoMotorista') + getVal('custoOutros');
    const custoComDepKm = subtotalOpKm + getVal('custoDepreciacao');

    const kmTotal = kmIda + kmVolta;
    const custoTotal = kmTotal * custoComDepKm;
    const custoPorTon = custoTotal / tons;
    // 1 tonelada = 1000kg / 60kg por saca = 16,6667 sacas
    const custoPorSaca = custoPorTon * 60 / 1000;

    // Preencher tabela
    document.getElementById('sacaT1Origem').textContent = origem;
    document.getElementById('sacaT1Destino').textContent = destino;
    document.getElementById('sacaT1Km').textContent = kmIda.toLocaleString('pt-BR');
    document.getElementById('sacaT2Origem').textContent = destino;
    document.getElementById('sacaT2Destino').textContent = origem;
    document.getElementById('sacaT2Km').textContent = kmVolta.toLocaleString('pt-BR');

    // Preencher cards
    document.getElementById('sacaCustoKm').textContent = 'R$ ' + custoComDepKm.toFixed(4).replace('.', ',');
    document.getElementById('sacaCustoTotal').textContent = formatBRL(custoTotal);
    document.getElementById('sacaTons').textContent = tons.toLocaleString('pt-BR');
    document.getElementById('sacaCustoTon').textContent = formatBRL(custoPorTon);
    document.getElementById('sacaCustoSaca').textContent = formatBRL(custoPorSaca);

    document.getElementById('resultadoSaca').classList.remove('hidden');
    document.getElementById('resultadoSaca').scrollIntoView({ behavior: 'smooth' });
}

// Gerar cotação
function gerarCotacao() {
    const origem = document.getElementById('cotOrigem').value.trim();
    const destino = document.getElementById('cotDestino').value.trim();
    const km = getVal('cotKm');
    const produto = document.getElementById('cotProduto').value.trim();
    const tons = getVal('cotToneladas');
    const valor = getVal('cotValor');
    const validade = document.getElementById('cotValidade').value;
    const obs = document.getElementById('cotObs').value.trim();

    if (!origem || !destino) {
        alert('Informe origem e destino.');
        return;
    }
    if (!valor || valor <= 0) {
        alert('Informe o valor R$/TON.');
        return;
    }

    const valorTotal = valor * tons;
    const hoje = new Date().toLocaleDateString('pt-BR');
    let validadeFmt = '';
    if (validade) {
        const [y, m, d] = validade.split('-');
        validadeFmt = `${d}/${m}/${y}`;
    }

    let texto = `*COTAÇÃO DE FRETE — DUREINO TRANSPORTES*\n`;
    texto += `─────────────────────────────\n\n`;
    texto += `📅 *Data:* ${hoje}\n`;
    if (validadeFmt) texto += `⏳ *Validade:* ${validadeFmt}\n`;
    texto += `\n*ROTA*\n`;
    texto += `📍 Origem: ${origem}\n`;
    texto += `📍 Destino: ${destino}\n`;
    if (produto) texto += `📦 Produto: ${produto}\n`;
    texto += `\n*VALORES*\n`;
    texto += `⚖️ Carga: ${tons} toneladas\n`;
    texto += `💰 Valor por tonelada: ${formatBRL(valor)}\n`;
    texto += `💵 *Valor Total: ${formatBRL(valorTotal)}*\n`;
    if (obs) {
        texto += `\n*OBSERVAÇÕES*\n${obs}\n`;
    }
    texto += `\n─────────────────────────────\n`;
    texto += `Dureino Transportes`;

    document.getElementById('cotacaoTexto').textContent = texto;
    document.getElementById('resultadoCotacao').classList.remove('hidden');
    document.getElementById('resultadoCotacao').scrollIntoView({ behavior: 'smooth' });
}

function copiarCotacao() {
    const texto = document.getElementById('cotacaoTexto').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopiar');
        const original = btn.textContent;
        btn.textContent = '✓ Copiado!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(() => alert('Erro ao copiar. Selecione o texto manualmente.'));
}

function compartilharWhatsApp() {
    const texto = document.getElementById('cotacaoTexto').textContent;
    const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
    window.open(url, '_blank');
}

// Comparar cenários
function comparar() {
    const kmIda = getVal('compKmIda');
    const kmVolta = getVal('compKmVolta');
    const kmExterno = getVal('compKmExterno');
    const kmInternoC2 = getVal('compKmInterno');
    const oferta = getVal('compOferta');
    const tons = getVal('compToneladas');

    if (!kmIda && !kmVolta) {
        alert('Informe o KM Ida e Volta.');
        return;
    }

    // Custos por KM
    const subtotalOpKm = getVal('custoCombustiveis') + getVal('custoPneus') +
        getVal('custoManutencao') + getVal('custoMotorista') + getVal('custoOutros');
    const deprecKm = getVal('custoDepreciacao');
    const custoComDepKm = subtotalOpKm + deprecKm;

    // Cenário 1: só interno (ida vazio + volta carregado)
    const c1KmTotal = kmIda + kmVolta;
    const c1ComDeprec = c1KmTotal * custoComDepKm;
    const c1SemDeprec = c1KmTotal * subtotalOpKm;

    // Cenário 2: externo + interno (informados pelo usuário)
    const c2KmExtTotal = kmExterno;
    const c2KmIntTotal = kmInternoC2;
    const c2KmTotal = c2KmExtTotal + c2KmIntTotal;
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
    document.getElementById('c2KmExterno').textContent = c2KmExtTotal.toLocaleString('pt-BR');
    document.getElementById('c2KmInterno').textContent = c2KmIntTotal.toLocaleString('pt-BR');
    document.getElementById('c2KmTotal').textContent = c2KmTotal.toLocaleString('pt-BR');
    document.getElementById('c2Receita').textContent = formatBRL(receitaLiquida);
    document.getElementById('c2CustoTonCom').textContent = formatBRL(c2LiqCom / tons) + '/ton';
    document.getElementById('c2CustoTonSem').textContent = formatBRL(c2LiqSem / tons) + '/ton';
    document.getElementById('c2LiqComDeprec').textContent = formatBRL(c2LiqCom);
    document.getElementById('c2LiqSemDeprec').textContent = formatBRL(c2LiqSem);

    // Economia
    const economiaCom = c1ComDeprec - c2LiqCom;
    const economiaSem = c1SemDeprec - c2LiqSem;
    document.getElementById('compEconomiaCom').textContent = formatBRL(economiaCom);
    document.getElementById('compEconomiaSem').textContent = formatBRL(economiaSem);
    document.getElementById('compEconomiaCom').style.color = economiaCom > 0 ? '#16a34a' : '#dc2626';
    document.getElementById('compEconomiaSem').style.color = economiaSem > 0 ? '#16a34a' : '#dc2626';

    // Cobertura de depreciação (cenário 2)
    const deprecTotal = c2KmTotal * deprecKm;
    const economiaOp = c1SemDeprec - c2LiqSem; // quanto o frete externo economiza no operacional
    const pctDeprec = deprecTotal !== 0 ? (economiaOp / deprecTotal) : 0;

    document.getElementById('compDeprecTotal').textContent = formatBRL(deprecTotal);
    document.getElementById('compSaldoParaDeprec').textContent = formatBRL(economiaOp);
    document.getElementById('compSaldoParaDeprec').style.color = economiaOp >= 0 ? '#16a34a' : '#dc2626';
    document.getElementById('compDeprecPct').textContent = (pctDeprec * 100).toFixed(1) + '%';
    document.getElementById('compDeprecPct').style.color = pctDeprec >= 1 ? '#16a34a' : pctDeprec >= 0 ? '#d97706' : '#dc2626';

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
    input.addEventListener('input', () => {
        atualizarTotais();
        // Oculta resultados antigos para forçar novo cálculo
        document.getElementById('resultado').classList.add('hidden');
        document.getElementById('resultadoComp').classList.add('hidden');
        document.getElementById('resultadoSaca').classList.add('hidden');
    });
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
