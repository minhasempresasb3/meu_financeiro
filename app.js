const STORAGE_KEY = 'financeiro_app_v2';

let state = loadState() || {
  salarios: [{nome:'Salário', valor:0, dia:5}],
  entradas: [],
  fixas: [
    {nome:'Aluguel', valor:0, dia:10},
    {nome:'Internet', valor:0, dia:15},
    {nome:'Celular', valor:0, dia:20},
    {nome:'Streaming', valor:0, dia:25}
  ],
  parcelas: [
    {nome:'TV 55" 12x', valor:0, total:12, atual:3, dia:10},
    {nome:'Notebook 10x', valor:0, total:10, atual:5, dia:15}
  ],
  saidas: [],
  saldoInicial: 0,
  mesAtual: { ano: 2026, mes: 7 },
  ajustesDia: {}  // { "2026-08-15": [{nome, valor, tipo}] }
};

let modalDiaAtual = null; // { ano, mes, dia }

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showSaveStatus();
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}
function showSaveStatus() {
  const el = document.getElementById('save-status');
  el.textContent = '💾 Salvo! ' + new Date().toLocaleTimeString('pt-BR');
  el.style.background = 'rgba(67,160,71,0.3)';
  setTimeout(() => { el.style.background = 'rgba(255,255,255,0.15)'; }, 1500);
}

function fmt(v) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function parseVal(id) { return parseFloat(document.getElementById(id).value) || 0; }
function parseStr(id) { return document.getElementById(id).value.trim(); }
function parseIntVal(id) { return parseInt(document.getElementById(id).value) || 0; }
function diasNoMes(ano, mes) { return new Date(ano, mes+1, 0).getDate(); }
function nomeMes(mesIdx) {
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return nomes[mesIdx];
}
function keyDia(ano, mes, dia) { return ano + '-' + String(mes+1).padStart(2,'0') + '-' + String(dia).padStart(2,'0'); }

// ===== ADICIONAR ITENS GLOBAIS =====
function addSalario() {
  const nome = parseStr('salario-nome') || 'Salário';
  const valor = parseVal('salario-valor');
  const dia = parseIntVal('salario-dia');
  if(valor <= 0) return;
  state.salarios.push({nome, valor, dia});
  document.getElementById('salario-nome').value = 'Salário';
  document.getElementById('salario-valor').value = '';
  saveAndUpdate();
}
function addEntrada() {
  const nome = parseStr('entrada-nome');
  const valor = parseVal('entrada-valor');
  const data = document.getElementById('entrada-data').value;
  if(!nome || valor <= 0 || !data) return;
  state.entradas.push({nome, valor, data});
  document.getElementById('entrada-nome').value = '';
  document.getElementById('entrada-valor').value = '';
  document.getElementById('entrada-data').value = '';
  saveAndUpdate();
}
function addFixa() {
  const nome = parseStr('fixa-nome');
  const valor = parseVal('fixa-valor');
  const dia = parseIntVal('fixa-dia');
  if(!nome || valor <= 0 || dia < 1) return;
  state.fixas.push({nome, valor, dia});
  document.getElementById('fixa-nome').value = '';
  document.getElementById('fixa-valor').value = '';
  document.getElementById('fixa-dia').value = '';
  saveAndUpdate();
}
function addParcela() {
  const nome = parseStr('parc-nome');
  const valor = parseVal('parc-valor');
  const total = parseIntVal('parc-total');
  const atual = parseIntVal('parc-atual');
  const dia = parseIntVal('parc-dia');
  if(!nome || valor <= 0 || total < 1 || atual < 1 || atual > total || dia < 1) return;
  state.parcelas.push({nome, valor, total, atual, dia});
  document.getElementById('parc-nome').value = '';
  document.getElementById('parc-valor').value = '';
  document.getElementById('parc-total').value = '12';
  document.getElementById('parc-atual').value = '1';
  document.getElementById('parc-dia').value = '10';
  saveAndUpdate();
}
function addSaida() {
  const nome = parseStr('saida-nome');
  const valor = parseVal('saida-valor');
  const data = document.getElementById('saida-data').value;
  if(!nome || valor <= 0 || !data) return;
  state.saidas.push({nome, valor, data});
  document.getElementById('saida-nome').value = '';
  document.getElementById('saida-valor').value = '';
  document.getElementById('saida-data').value = '';
  saveAndUpdate();
}

function removeItem(tipo, idx) {
  state[tipo].splice(idx, 1);
  saveAndUpdate();
}

function saveAndUpdate() {
  state.saldoInicial = parseVal('saldo-inicial');
  saveState();
  updateAll();
}

// ===== RENDER LISTAS =====
function renderListas() {
  const render = (lista, id, tipo, cls) => {
    const el = document.getElementById(id);
    if(lista.length === 0) { el.innerHTML = '<div class="empty-state">📝 Nenhum item cadastrado</div>'; return; }
    el.innerHTML = lista.map((it, i) => `
      <div class="item-row ${cls}">
        <span class="item-info">${it.nome}${it.dia ? ' (dia '+it.dia+')' : ''}${it.data ? ' ('+it.data+')' : ''}${it.total ? ' - parcela '+it.atual+'/'+it.total : ''}</span>
        <span class="item-val">${fmt(it.valor)}</span>
        <button class="btn-small btn-remove" onclick="removeItem('${tipo}',${i})">✕</button>
      </div>
    `).join('');
  };
  render(state.salarios, 'lista-salarios', 'salarios', 'positive');
  render(state.entradas, 'lista-entradas', 'entradas', 'positive');
  render(state.fixas, 'lista-fixas', 'fixas', 'negative');
  render(state.parcelas, 'lista-parcelas', 'parcelas', 'negative');
  render(state.saidas, 'lista-saidas', 'saidas', 'negative');
  document.getElementById('saldo-inicial').value = state.saldoInicial;
}

// ===== EVENTOS DO DIA (automáticos + ajustes manuais) =====
function getEventosDoDia(ano, mes, dia) {
  const eventos = [];
  state.salarios.forEach(s => { if(s.dia === dia) eventos.push({...s, tipo:'entrada', categoria:'salario'}); });
  state.fixas.forEach(f => { if(f.dia === dia) eventos.push({...f, tipo:'saida', categoria:'fixa'}); });

  const hoje = new Date();
  const mesesDesdeHoje = (ano - hoje.getFullYear())*12 + (mes - hoje.getMonth());
  state.parcelas.forEach(p => {
    const parcelaMes = p.atual + mesesDesdeHoje;
    if(parcelaMes <= p.total && p.dia === dia) {
      eventos.push({nome: p.nome + ' ('+parcelaMes+'/'+p.total+')', valor: p.valor, tipo:'saida', categoria:'parcela'});
    }
  });

  state.entradas.forEach(e => {
    const d = new Date(e.data + 'T00:00:00');
    if(d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia) {
      eventos.push({...e, tipo:'entrada', categoria:'extra'});
    }
  });
  state.saidas.forEach(s => {
    const d = new Date(s.data + 'T00:00:00');
    if(d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia) {
      eventos.push({...s, tipo:'saida', categoria:'extra'});
    }
  });

  // Ajustes manuais do dia
  const k = keyDia(ano, mes, dia);
  if(state.ajustesDia[k]) {
    state.ajustesDia[k].forEach(a => {
      eventos.push({nome: a.nome + ' ✏️', valor: a.valor, tipo: a.tipo, categoria: 'ajuste'});
    });
  }

  return eventos;
}

function calcularSaldoDiario(ano, mes, dia, saldoAnterior) {
  const eventos = getEventosDoDia(ano, mes, dia);
  let mov = 0;
  eventos.forEach(e => { mov += (e.tipo === 'entrada' ? e.valor : -e.valor); });
  return { saldo: saldoAnterior + mov, mov, eventos };
}

// ===== CALENDÁRIO =====
function renderCalendario() {
  const ano = state.mesAtual.ano;
  const mes = state.mesAtual.mes;
  document.getElementById('cal-mes-ano').textContent = nomeMes(mes) + ' ' + ano;

  const grid = document.getElementById('calendario-grid');
  grid.innerHTML = '';

  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  diasSemana.forEach(d => {
    const th = document.createElement('div'); th.className = 'cal-header'; th.textContent = d; grid.appendChild(th);
  });

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = diasNoMes(ano, mes);
  const totalDiasAnt = diasNoMes(ano, mes-1);

  let saldoAcum = state.saldoInicial;
  const hoje = new Date();
  const mesesDiff = (ano - hoje.getFullYear())*12 + (mes - hoje.getMonth());

  for(let m = 0; m < mesesDiff; m++) {
    const simAno = hoje.getFullYear() + Math.floor((hoje.getMonth() + m)/12);
    const simMes = (hoje.getMonth() + m) % 12;
    const dMax = diasNoMes(simAno, simMes);
    for(let d = 1; d <= dMax; d++) {
      const r = calcularSaldoDiario(simAno, simMes, d, saldoAcum);
      saldoAcum = r.saldo;
    }
  }

  for(let i = primeiroDia - 1; i >= 0; i--) {
    const dia = totalDiasAnt - i;
    const cell = document.createElement('div'); cell.className = 'cal-day other-month';
    cell.innerHTML = '<div class="day-num">'+dia+'</div>';
    grid.appendChild(cell);
  }

  for(let d = 1; d <= totalDias; d++) {
    const r = calcularSaldoDiario(ano, mes, d, saldoAcum);
    saldoAcum = r.saldo;

    const cell = document.createElement('div'); cell.className = 'cal-day';
    cell.onclick = () => abrirModalDia(ano, mes, d);
    let html = '<div class="day-num">'+d+'</div>';

    if(r.eventos.length > 0) {
      html += '<div class="day-events">';
      r.eventos.slice(0, 3).forEach(e => {
        const cls = e.categoria === 'ajuste' ? 'ajuste' : (e.tipo === 'entrada' ? 'entrada' : (e.categoria === 'fixa' ? 'fixa' : 'saida'));
        html += '<div class="day-event '+cls+'">'+e.nome+'</div>';
      });
      if(r.eventos.length > 3) html += '<div class="day-event" style="background:#eee;color:#666;">+'+(r.eventos.length-3)+' mais</div>';
      html += '</div>';
    }

    html += '<div class="day-saldo '+(r.saldo >= 0 ? 'pos' : 'neg')+'">'+fmt(r.saldo)+'</div>';
    cell.innerHTML = html;
    grid.appendChild(cell);
  }

  const restante = (7 - ((primeiroDia + totalDias) % 7)) % 7;
  for(let d = 1; d <= restante; d++) {
    const cell = document.createElement('div'); cell.className = 'cal-day other-month';
    cell.innerHTML = '<div class="day-num">'+d+'</div>';
    grid.appendChild(cell);
  }
}

function changeMonth(dir) {
  state.mesAtual.mes += dir;
  if(state.mesAtual.mes > 11) { state.mesAtual.mes = 0; state.mesAtual.ano++; }
  if(state.mesAtual.mes < 0) { state.mesAtual.mes = 11; state.mesAtual.ano--; }
  saveState();
  renderCalendario();
}

// ===== MODAL DO DIA =====
function abrirModalDia(ano, mes, dia) {
  modalDiaAtual = { ano, mes, dia };
  const k = keyDia(ano, mes, dia);

  document.getElementById('modal-titulo').textContent = '📅 ' + dia + ' de ' + nomeMes(mes) + ' de ' + ano;

  // Calcular saldo do dia
  const hoje = new Date();
  let saldoAcum = state.saldoInicial;
  const mesesDiff = (ano - hoje.getFullYear())*12 + (mes - hoje.getMonth());

  for(let m = 0; m < mesesDiff; m++) {
    const simAno = hoje.getFullYear() + Math.floor((hoje.getMonth() + m)/12);
    const simMes = (hoje.getMonth() + m) % 12;
    const dMax = diasNoMes(simAno, simMes);
    for(let d = 1; d <= dMax; d++) {
      const r = calcularSaldoDiario(simAno, simMes, d, saldoAcum);
      saldoAcum = r.saldo;
    }
  }
  for(let d = 1; d <= dia; d++) {
    const r = calcularSaldoDiario(ano, mes, d, saldoAcum);
    saldoAcum = r.saldo;
    if(d === dia) {
      const el = document.getElementById('modal-saldo-atual');
      el.textContent = fmt(saldoAcum);
      el.className = 'modal-saldo ' + (saldoAcum >= 0 ? 'pos' : 'neg');
    }
  }

  // Eventos automáticos
  const autoEventos = [];
  state.salarios.forEach(s => { if(s.dia === dia) autoEventos.push({nome: s.nome, valor: s.valor, tipo: 'entrada'}); });
  state.fixas.forEach(f => { if(f.dia === dia) autoEventos.push({nome: f.nome, valor: f.valor, tipo: 'saida'}); });

  const mesesDesdeHoje = (ano - hoje.getFullYear())*12 + (mes - hoje.getMonth());
  state.parcelas.forEach(p => {
    const parcelaMes = p.atual + mesesDesdeHoje;
    if(parcelaMes <= p.total && p.dia === dia) {
      autoEventos.push({nome: p.nome + ' ('+parcelaMes+'/'+p.total+')', valor: p.valor, tipo: 'saida'});
    }
  });

  state.entradas.forEach(e => {
    const d = new Date(e.data + 'T00:00:00');
    if(d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia) {
      autoEventos.push({nome: e.nome, valor: e.valor, tipo: 'entrada'});
    }
  });
  state.saidas.forEach(s => {
    const d = new Date(s.data + 'T00:00:00');
    if(d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia) {
      autoEventos.push({nome: s.nome, valor: s.valor, tipo: 'saida'});
    }
  });

  const autoEl = document.getElementById('modal-eventos-auto');
  if(autoEventos.length === 0) {
    autoEl.innerHTML = '<div class="empty-state">Nenhum lançamento automático neste dia</div>';
  } else {
    autoEl.innerHTML = autoEventos.map(e => `
      <div class="modal-evento-auto ${e.tipo}">
        <span class="ev-nome">${e.tipo==='entrada'?'📥':'📤'} ${e.nome}</span>
        <span class="ev-val">${e.tipo==='entrada'?'+':'-'} ${fmt(e.valor)}</span>
      </div>
    `).join('');
  }

  renderModalAjustes();
  document.getElementById('modal-overlay').classList.add('active');
}

function fecharModal(e) {
  if(e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('active');
  modalDiaAtual = null;
}

function addAjusteDia() {
  if(!modalDiaAtual) return;
  const nome = parseStr('ajuste-nome');
  const valor = parseVal('ajuste-valor');
  const tipo = document.getElementById('ajuste-tipo').value;
  if(!nome || valor <= 0) return;

  const k = keyDia(modalDiaAtual.ano, modalDiaAtual.mes, modalDiaAtual.dia);
  if(!state.ajustesDia[k]) state.ajustesDia[k] = [];
  state.ajustesDia[k].push({nome, valor, tipo});

  document.getElementById('ajuste-nome').value = '';
  document.getElementById('ajuste-valor').value = '';
  saveState();
  renderModalAjustes();
  renderCalendario();
}

function removeAjusteDia(idx) {
  if(!modalDiaAtual) return;
  const k = keyDia(modalDiaAtual.ano, modalDiaAtual.mes, modalDiaAtual.dia);
  if(state.ajustesDia[k]) {
    state.ajustesDia[k].splice(idx, 1);
    if(state.ajustesDia[k].length === 0) delete state.ajustesDia[k];
  }
  saveState();
  renderModalAjustes();
  renderCalendario();
}

function renderModalAjustes() {
  if(!modalDiaAtual) return;
  const k = keyDia(modalDiaAtual.ano, modalDiaAtual.mes, modalDiaAtual.dia);
  const lista = state.ajustesDia[k] || [];
  const el = document.getElementById('modal-lista-ajustes');
  if(lista.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum ajuste manual neste dia. Clique em + para adicionar.</div>';
  } else {
    el.innerHTML = lista.map((a, i) => `
      <div class="item-row ${a.tipo==='entrada'?'positive':'negative'}">
        <span class="item-info">✏️ ${a.nome}</span>
        <span class="item-val">${a.tipo==='entrada'?'+':'-'} ${fmt(a.valor)}</span>
        <button class="btn-small btn-remove" onclick="removeAjusteDia(${i})">✕</button>
      </div>
    `).join('');
  }
}

// ===== PROJEÇÃO MENSAL =====
function calcularProjecao() {
  const hoje = new Date();
  const proj = [];
  let saldoAcum = state.saldoInicial;

  for(let m = 0; m < 12; m++) {
    const ano = hoje.getFullYear() + Math.floor((hoje.getMonth() + m)/12);
    const mes = (hoje.getMonth() + m) % 12;
    const dMax = diasNoMes(ano, mes);

    let entradas = 0, saidas = 0;
    for(let d = 1; d <= dMax; d++) {
      const evs = getEventosDoDia(ano, mes, d);
      evs.forEach(e => {
        if(e.tipo === 'entrada') entradas += e.valor;
        else saidas += e.valor;
      });
    }

    const saldoMes = entradas - saidas;
    saldoAcum += saldoMes;

    proj.push({
      nome: nomeMes(mes) + '/' + ano,
      entradas, saidas, saldoMes, saldoAcum,
      positivo: saldoAcum >= 0
    });
  }
  return proj;
}

function renderProjecao() {
  const proj = calcularProjecao();

  const totalEnt = proj.reduce((a,b) => a + b.entradas, 0);
  const totalSai = proj.reduce((a,b) => a + b.saidas, 0);
  const saldoFinal = proj[proj.length-1].saldoAcum;

  document.getElementById('resumo-projecao').innerHTML = `
    <div class="summary-pill pill-entrada"><div class="label">Total Entradas (12m)</div><div class="value">${fmt(totalEnt)}</div></div>
    <div class="summary-pill pill-saida"><div class="label">Total Saídas (12m)</div><div class="value">${fmt(totalSai)}</div></div>
    <div class="summary-pill pill-saldo ${saldoFinal < 0 ? 'neg' : ''}"><div class="label">Saldo Final Projetado</div><div class="value">${fmt(saldoFinal)}</div></div>
  `;

  const maxVal = Math.max(...proj.map(p => Math.abs(p.saldoAcum)), 1);
  let grafHtml = '';
  proj.forEach(p => {
    const pct = (Math.abs(p.saldoAcum) / maxVal) * 100;
    const cls = p.saldoAcum >= 0 ? 'pos' : 'neg';
    grafHtml += `
      <div class="chart-bar">
        <div class="bar-label">${p.nome}</div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
        <div class="bar-value ${cls}">${fmt(p.saldoAcum)}</div>
      </div>
    `;
  });
  document.getElementById('grafico-projecao').innerHTML = grafHtml;

  const tbody = document.querySelector('#tabela-projecao tbody');
  tbody.innerHTML = proj.map(p => {
    const status = p.positivo ? '✅ Positivo' : '❌ Negativo';
    const rowCls = p.saldoAcum < -500 ? 'danger' : (p.saldoAcum < 0 ? 'warn' : '');
    return `
      <tr class="${rowCls}">
        <td><strong>${p.nome}</strong></td>
        <td class="pos">${fmt(p.entradas)}</td>
        <td class="neg">${fmt(p.saidas)}</td>
        <td class="${p.saldoMes >= 0 ? 'pos' : 'neg'}">${fmt(p.saldoMes)}</td>
        <td class="${p.positivo ? 'pos' : 'neg'}">${fmt(p.saldoAcum)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');
}

// ===== RESUMO RÁPIDO =====
function renderResumo() {
  const totalSal = state.salarios.reduce((a,s) => a + s.valor, 0);
  const totalFix = state.fixas.reduce((a,f) => a + f.valor, 0);
  const totalParc = state.parcelas.reduce((a,p) => a + p.valor, 0);
  const totalEnt = state.entradas.reduce((a,e) => a + e.valor, 0);
  const totalSai = state.saidas.reduce((a,s) => a + s.valor, 0);
  const saldoMensal = totalSal + totalEnt - totalFix - totalParc - totalSai;

  document.getElementById('resumo-rapido').innerHTML = `
    <div class="summary-pill pill-entrada"><div class="label">Renda Fixa/Mês</div><div class="value">${fmt(totalSal)}</div></div>
    <div class="summary-pill pill-saida"><div class="label">Gastos Fixos/Mês</div><div class="value">${fmt(totalFix)}</div></div>
    <div class="summary-pill pill-saida"><div class="label">Parcelas/Mês</div><div class="value">${fmt(totalParc)}</div></div>
    <div class="summary-pill pill-saldo ${saldoMensal < 0 ? 'neg' : ''}"><div class="label">Saldo Mensal Est.</div><div class="value">${fmt(saldoMensal)}</div></div>
  `;
}

// ===== EXPORTAR / IMPORTAR =====
function exportarCSV() {
  const proj = calcularProjecao();
  let csv = 'Mês,Entradas,Saídas,Saldo do Mês,Saldo Acumulado,Status\n';
  proj.forEach(p => {
    csv += `${p.nome},${p.entradas.toFixed(2)},${p.saidas.toFixed(2)},${p.saldoMes.toFixed(2)},${p.saldoAcum.toFixed(2)},${p.positivo ? 'Positivo' : 'Negativo'}\n`;
  });
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'projecao_financeira.csv';
  a.click(); URL.revokeObjectURL(url);
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'backup_financeiro_' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
}

function importarJSON(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if(data.salarios && data.fixas && data.parcelas) {
        state = data;
        saveState();
        updateAll();
        alert('✅ Backup importado com sucesso!');
      } else {
        alert('❌ Arquivo inválido!');
      }
    } catch(err) { alert('❌ Erro ao importar: ' + err.message); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function limparDados() {
  if(!confirm('⚠️ Tem certeza que quer apagar TODOS os dados?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = {
    salarios: [], entradas: [], fixas: [], parcelas: [], saidas: [],
    saldoInicial: 0, mesAtual: { ano: new Date().getFullYear(), mes: new Date().getMonth() },
    ajustesDia: {}
  };
  updateAll();
}

// ===== TABS =====
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
  if(tab === 'calendario') renderCalendario();
  if(tab === 'projecao') renderProjecao();
}

// ===== UPDATE ALL =====
function updateAll() {
  renderListas();
  renderResumo();
  if(document.getElementById('tab-calendario').classList.contains('active')) renderCalendario();
  if(document.getElementById('tab-projecao').classList.contains('active')) renderProjecao();
}

// ===== INIT =====
updateAll();
