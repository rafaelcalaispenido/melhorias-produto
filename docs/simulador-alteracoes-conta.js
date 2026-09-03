/* ═══════════ Simulador · Alterações na conta (e-mail) ═══════════ */

var state = { branch:null };
var otpLock = false; // evita otpComplete disparar duas vezes

var ICON = {
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
  face:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="2.4"/><path d="M6.5 18a5.5 5.5 0 0111 0"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.4"/></svg>',
  arrowL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};

var BRANCHES = {
  baixo: { risk:'low', label:'Baixo risco',
    banner:'Você ainda tem acesso ao e-mail atual e a biometria confere → troca imediata, sem atendimento.',
    steps:['Confirmação de identidade','Biometria','Novo e-mail','Confirmar novo e-mail'] },
  medio: { risk:'mid', label:'Médio risco',
    banner:'Você não tem mais acesso ao e-mail atual → confirma por um canal de recuperação (e-mail secundário ou SMS) + biometria, com janela de segurança.',
    steps:['Verificação de identidade','Biometria','Novo e-mail','Confirmar novo e-mail'] },
  alto:  { risk:'high', label:'Alto risco',
    banner:'Conta PJ / saldo alto → além da biometria, exige documento e segue para análise assistida do CX.',
    steps:['Biometria','Documentos','Análise assistida'] }
};

function startBranch(b){
  state.branch=b; state.channel=null;
  var isPJ = (b==='alto');
  document.getElementById('conta-natureza').textContent = isPJ ? 'Pessoa Jurídica · CNPJ 12.***.***/0001-**' : 'Pessoa Física · CPF 115.***.**6-94';
  document.getElementById('conta-natureza-tag').textContent = isPJ ? ': Pessoa Jurídica' : ': Pessoa Física';
  document.getElementById('up-socios').style.display = isPJ ? 'flex' : 'none';
  goTo('scr-platform'); showView('v-conta'); setContaMode('hoje');
}

/* top-level screen switch */
function goTo(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if(id==='scr-hub') setAnno('hub');
}

/* inner view switch (inside platform) */
function showView(id){
  document.querySelectorAll('.mc-view').forEach(function(v){ v.style.display='none'; });
  document.getElementById(id).style.display='block';
  var main=document.querySelector('.hm-main'); if(main) main.scrollTop=0;
}

/* stepper render */
function renderSteps(containerId, activeIdx){
  var b=BRANCHES[state.branch]; if(!b) return;
  var html='';
  b.steps.forEach(function(s,idx){
    var cls = idx<activeIdx?'done':(idx===activeIdx?'active':'');
    var mark = idx<activeIdx
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:13px;height:13px;"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
      : (idx+1);
    html += '<div class="wz-step '+cls+'">'+(idx>0?'<div class="wz-line"></div>':'')+
            '<div class="dot">'+mark+'</div><div class="lbl">'+s+'</div></div>';
  });
  var el=document.getElementById(containerId); if(el) el.innerHTML=html;
}

/* ── entrada: botão "Alterar e-mail" ── */
function startEmailChange(){ showView('v-verify'); openStepIntro(); }

function openStepIntro(){
  var b=BRANCHES[state.branch];
  var rb=document.getElementById('risk-banner');
  rb.className=''; rb.innerHTML=''; rb.style.display='none';
  renderSteps('wz-steps',0);
  var panel=document.getElementById('verify-panel');
  var cta=document.getElementById('verify-cta');
  if(state.branch==='baixo'){
    panel.innerHTML='<h2>Vamos confirmar que é você</h2><p class="desc">Enviaremos um código de segurança para o seu <b>e-mail atual</b>. Você vai digitá-lo na próxima etapa.</p>'+
      '<div class="info-row"><b>Nome:</b> Thiago Pereira</div><div class="info-row"><b>E-mail:</b> thiago.oliveira@email.com</div>';
    cta.innerHTML=ICON.mail+' Enviar código por e-mail';
  } else if(state.branch==='medio'){
    panel.innerHTML='<h2>Vamos confirmar que é você</h2><p class="desc">Como você não tem mais acesso ao e-mail atual, escolha por onde receber o código de confirmação. Depois, confirmamos com biometria.</p>'+
      '<div class="choice-row" style="margin-top:6px;">'+
        '<div class="choice" data-ch="secondary" onclick="selectChannel(\'secondary\')"><div class="choice-head"><h4>E-mail de recuperação</h4><span class="rec">Recomendado</span></div><p>s***@email.com · canal secundário verificado</p></div>'+
        '<div class="choice" data-ch="phone" onclick="selectChannel(\'phone\')"><div class="choice-head"><h4>SMS no telefone</h4></div><p>(31) 9 9***-**12 · telefone verificado</p></div>'+
      '</div>'+
      '<div style="margin-top:14px;"><span class="novo-badge">Novo</span> <span style="font-size:12.5px;color:var(--gray-500);">canais de recuperação cadastrados na etapa de prevenção</span></div>';
    cta.innerHTML='Selecione um canal'; cta.disabled=true;
  } else {
    panel.innerHTML='<h2>Vamos confirmar que é você</h2><p class="desc">Por se tratar de conta PJ / saldo elevado, iniciamos pela <b>biometria com prova de vida</b> e, em seguida, documentos.</p>'+
      '<div class="info-row"><b>Conta:</b> Pessoa Jurídica</div>';
    cta.innerHTML=ICON.face+' Iniciar biometria';
  }
  setAnno('verify-'+state.branch);
}

/* primeiro passo após a intro */
function verifyCta(){
  if(state.branch==='baixo') openOtp('email');
  else if(state.branch==='medio') openOtp(state.channel || 'secondary');
  else openFacetec();
}

/* ── OTP ── */
var otpCtx=null;
function openOtp(kind){
  otpCtx=kind; otpLock=false;
  var s=document.getElementById('otp-sub');
  if(kind==='email'){ s.innerHTML='Digite o código que enviamos para <strong>thiago.oliveira@email.com</strong>.'; }
  else if(kind==='secondary'){ s.innerHTML='Digite o código que enviamos para o seu e-mail de recuperação <strong>s***@email.com</strong>.'; }
  else if(kind==='phone'){ s.innerHTML='Digite o código que enviamos por SMS para <strong>(31) 9 9***-**12</strong>.'; }
  else if(kind==='new'){ s.innerHTML='Digite o código que enviamos para o <strong>novo e-mail</strong>.'; }
  else if(kind==='compra-mail'){ s.innerHTML='Digite o código que enviamos para o <strong>e-mail da compra</strong> (c***@email.com).'; }
  else if(kind==='compra-sms'){ s.innerHTML='Digite o código que enviamos por SMS para <strong>(31) 9 9***-**12</strong>.'; }
  else if(kind==='compra-new'){ s.innerHTML='Digite o código que enviamos para o <strong>novo e-mail</strong> da compra.'; }
  else if(kind==='tit-2fa'){ s.innerHTML='Digite o código que enviamos para confirmar a solicitação de <strong>troca de titularidade</strong>.'; }
  setAnno('otp-'+kind);
  document.querySelectorAll('#otp-overlay .enotas-otp-box').forEach(function(b){ b.value=''; });
  document.getElementById('otp-overlay').classList.add('show');
  setTimeout(function(){ var f=document.querySelector('#otp-overlay .enotas-otp-box'); if(f) f.focus(); }, 100);
  autoFillOtpDemo();
}
function closeOtp(){ document.getElementById('otp-overlay').classList.remove('show'); }
function otpAdvance(el){
  if(el.value.length>=1){ var n=el.nextElementSibling; if(n&&n.classList.contains('enotas-otp-box')) n.focus(); }
  var boxes=document.querySelectorAll('#otp-overlay .enotas-otp-box');
  var full=Array.prototype.every.call(boxes,function(b){return b.value.length===1;});
  if(full && !otpLock){ otpLock=true; setTimeout(otpComplete,350); }
}
function autoFillOtpDemo(){
  var boxes=document.querySelectorAll('#otp-overlay .enotas-otp-box'); var code='481920';
  boxes.forEach(function(b,idx){ setTimeout(function(){ b.value=code[idx]; if(idx===5) otpAdvance(b); }, 550+idx*130); });
}
function otpComplete(){
  var ctx=otpCtx;
  closeOtp(); showLoading();
  setTimeout(function(){
    hideLoading();
    if(ctx==='new'){ goResult(state.branch); }     // baixo ou medio
    else if(ctx==='compra-mail'||ctx==='compra-sms'){ compraFlow('newemail'); }  // identidade confirmada
    else if(ctx==='compra-new'){ compraResult(); }  // novo e-mail confirmado
    else if(ctx==='tit-2fa'){ titGoResult(); }
    else { openFacetec(); }                        // após confirmar e-mail/telefone
  }, 900);
}

/* ── FaceTec ── */
function openFacetec(){
  document.getElementById('ft-overlay').classList.add('show');
  document.getElementById('ft-oval').classList.remove('scanning');
  var btn=document.getElementById('ft-btn'); btn.disabled=false;
  btn.innerHTML=ICON.face+' Iniciar captura';
  setAnno('facetec');
}
function ftCapture(){
  var oval=document.getElementById('ft-oval'), btn=document.getElementById('ft-btn');
  oval.classList.add('scanning'); btn.disabled=true; btn.innerHTML=ICON.face+' Analisando…';
  setTimeout(function(){
    document.getElementById('ft-overlay').classList.remove('show');
    oval.classList.remove('scanning');
    showToast('Biometria confirmada');
    if(state.titFacetecNext){
      state.titFacetecNext=false;
      titWizGo('cnpj');
      return;
    }
    if(state.branch==='alto'){ showView('v-docs'); renderSteps('wz-steps-3',1); setAnno('docs'); }
    else { resetNewEmailBtn(); showView('v-newemail'); renderSteps('wz-steps-2', 2); setAnno('newemail'); }
  }, 1700);
}

/* ── novo e-mail (uma ação só) ── */
function resetNewEmailBtn(){
  var btn=document.getElementById('newemail-cta');
  if(btn){ btn.dataset.sent=''; btn.disabled=false; }
}
function afterNewEmail(){
  var btn=document.getElementById('newemail-cta');
  if(btn){ if(btn.dataset.sent==='1') return; btn.dataset.sent='1'; btn.disabled=true; }
  openOtp('new');
}

/* ── loading ── */
function showLoading(){ document.getElementById('hm-loading-overlay').classList.add('show'); }
function hideLoading(){ document.getElementById('hm-loading-overlay').classList.remove('show'); }

/* ── resultados ── */
function goResult(kind){
  var el=document.getElementById('result-inner'); var h='';
  if(kind==='baixo'){
    h='<div class="rico ok">'+ICON.check+'</div><h2>E-mail alterado com sucesso</h2>'+
      '<p>Seu novo e-mail já está ativo. Você pode acessar a conta imediatamente com <b>thiago.oliveira.novo@email.com</b>.</p>'+
      '<div style="margin-top:10px;"><span class="novo-badge">Novo</span> <span style="font-size:12.5px;color:var(--gray-500);">resolução em minutos, sem abrir chamado</span></div>';
  } else if(kind==='medio'){
    h='<div class="rico wait">'+ICON.clock+'</div><h2>Alteração confirmada, em janela de segurança</h2>'+
      '<p>Validamos sua identidade por um canal de recuperação (e-mail secundário ou SMS) e biometria. A troca será efetivada após uma janela de segurança.</p>'+
      '<div class="sec-window"><b>Janela de segurança (24–72h)</b><br>Enviamos um aviso para os canais antigos. Se não foi você, é possível contestar e reverter a alteração neste período. Saques ficam bloqueados temporariamente por segurança.</div>'+
      '<span class="notfixed" onclick="showToast(\'Contestação registrada, alteração revertida.\')">'+ICON.warn+' Não fui eu, contestar alteração</span>';
  } else {
    h='<div class="rico cx">'+ICON.person+'</div><h2>Solicitação enviada para análise</h2>'+
      '<p>Por envolver titularidade / alto risco, sua solicitação segue para <b>análise assistida</b> do time de CX. Você receberá o retorno em até <b>2 dias úteis</b>.</p>'+
      '<div class="sec-window" style="background:#EEF1FF;border-color:#C7D0FF;color:#33409E;">Você já enviou tudo pela plataforma (biometria + documentos + aceite dos sócios). O CX apenas valida onde a automação ainda não cobre, sem o vai e vem de reenvio por ticket.</div>';
  }
  h+='<div style="margin-top:26px;"><button class="ui-btn ui-btn-outline" onclick="goTo(\'scr-hub\')">'+ICON.arrowL+' Voltar aos cenários</button></div>';
  el.innerHTML=h; showView('v-result'); setAnno('result-'+kind);
}

/* ── toast ── */
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3000);
}

/* ═══════════ Modo apresentação (anotações) ═══════════ */
var SECICON = {
  do:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
  safe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>'
};
function S(lbl, icon, items){ return {lbl:lbl, icon:icon, items:items}; }

var ANNO = {
  hub:{ title:'Simulador de decisão', step:'Escolha um cenário', secs:[
    S('O que é isto','do',['Cada card é um perfil de usuário com um nível de risco diferente. O fluxo se adapta ao risco.']),
    S('Como o risco é definido','check',['Combinamos: acesso ao e-mail atual, tipo de conta (PF/PJ), saldo e sinais de fraude (dispositivo, localização).']),
    S('Por que importa','safe',['Casos simples viram self-service; casos sensíveis mantêm o time de CX. Reduz tickets sem abrir mão de segurança.']) ]},
  conta:{ title:'Minha Conta', step:'Ponto de entrada', secs:[
    S('O que a pessoa faz','do',['Encontra "Alterar e-mail" direto no painel. Hoje isso só existe abrindo um chamado no atendimento.']),
    S('O que roda por trás','check',['Ao clicar, o sistema classifica o risco da conta em tempo real para escolher a trilha certa.']),
    S('Segurança','safe',['Nada muda ainda, apenas inicia a verificação de identidade.']) ]},
  'verify-baixo':{ title:'Confirmação de identidade', step:'Baixo risco', secs:[
    S('O que a pessoa faz','do',['Ainda acessa o e-mail atual, então confirma a posse dele com um código de 6 dígitos.']),
    S('O que roda por trás','check',['Código enviado ao e-mail atual; checagem de dispositivo/IP conhecido da conta.']),
    S('Por que é seguro','safe',['Provar acesso ao e-mail atual já é um fator forte de identidade.']) ]},
  'verify-medio':{ title:'Confirmação de identidade', step:'Médio risco', secs:[
    S('O que a pessoa faz','do',['Perdeu o e-mail antigo. Escolhe outro canal confiável já cadastrado: e-mail de recuperação secundário (recomendado) ou SMS.']),
    S('O que roda por trás','check',['Enviamos o código ao canal escolhido e preparamos a biometria como 2º fator.']),
    S('Por que é seguro','safe',['E-mail secundário é preferível ao SMS, imune a golpe de troca de chip (SIM swap).']) ]},
  'verify-alto':{ title:'Confirmação de identidade', step:'Alto risco', secs:[
    S('O que a pessoa faz','do',['Conta PJ / saldo elevado: começa pela biometria e, em seguida, envia documentos.']),
    S('O que roda por trás','check',['Além da biometria e documento, a titularidade é conferida em base oficial.']),
    S('Por que é seguro','safe',['Camadas somadas (biometria + documento + análise humana) para o caso mais sensível.']) ]},
  'otp-email':{ title:'Código por e-mail', step:'Verificação', secs:[
    S('O que a pessoa faz','do',['Digita o código de 6 dígitos recebido no e-mail atual.']),
    S('O que roda por trás','check',['Confere o código, a validade (15 min) e tentativa única; observa dispositivo/IP.']),
    S('Por que é seguro','safe',['Prova a posse do canal antes de qualquer alteração.']) ]},
  'otp-secondary':{ title:'Código no e-mail secundário', step:'Verificação', secs:[
    S('O que a pessoa faz','do',['Digita o código enviado ao e-mail de recuperação secundário.']),
    S('O que roda por trás','check',['Mesmo controle de código/validade; canal já verificado previamente pela conta.']),
    S('Por que é seguro','safe',['Canal independente do e-mail perdido e mais robusto que SMS.']) ]},
  'otp-phone':{ title:'Código por SMS', step:'Verificação', secs:[
    S('O que a pessoa faz','do',['Digita o código enviado por SMS ao telefone verificado.']),
    S('O que roda por trás','check',['Confere o código; observa sinais de SIM swap (chip trocado há pouco).']),
    S('Por que é seguro','safe',['Fator adicional, sempre combinado com a biometria a seguir.']) ]},
  'otp-new':{ title:'Confirmar novo e-mail', step:'Destino', secs:[
    S('O que a pessoa faz','do',['Digita o código enviado ao NOVO e-mail informado.']),
    S('O que roda por trás','check',['Prova que a pessoa realmente controla o endereço de destino.']),
    S('Por que é seguro','safe',['Evita cadastrar um e-mail com erro de digitação ou de terceiros.']) ]},
  facetec:{ title:'Biometria (FaceTec)', step:'Prova de vida', secs:[
    S('O que a pessoa faz','do',['Faz uma selfie com prova de vida, o mesmo motor já usado no cadastro/KYC.']),
    S('O que roda por trás','check',['Compara o rosto com o documento já validado na conta e detecta foto/vídeo/deepfake.']),
    S('Por que é seguro','safe',['Garante pessoa real e titular, barra selfies/documentos forjados por IA.']) ]},
  newemail:{ title:'Novo e-mail', step:'Destino', secs:[
    S('O que a pessoa faz','do',['Informa o novo endereço de e-mail.']),
    S('O que roda por trás','check',['Verifica se o e-mail já existe na plataforma, se é domínio descartável ou está em lista de fraude; dispara o código.']),
    S('Por que é seguro','safe',['Confirma que o destino é válido e controlado pela pessoa.']) ]},
  docs:{ title:'Documentos', step:'Alto risco', secs:[
    S('O que a pessoa faz','do',['Envia RG/CNH em PDF e, se PJ, o contrato social com aceite dos sócios.']),
    S('O que roda por trás','check',['OCR extrai os dados, valida o QR Code do documento e cruza a titularidade com base oficial (SERPRO).']),
    S('Por que é seguro','safe',['PDF + QR Code + OCR dificultam documento adulterado; titularidade conferida na fonte.']) ]},
  'result-baixo':{ title:'Troca imediata', step:'Desfecho · Baixo risco', secs:[
    S('O que acontece','do',['Todos os fatores conferiram, então o e-mail é trocado na hora.']),
    S('Bastidores','check',['Registro em trilha de auditoria; e-mail antigo removido dos acessos.']),
    S('Impacto','safe',['Resolve em minutos, sem chamado. É o caso de maior volume (base 5D<).']) ]},
  'result-medio':{ title:'Janela de segurança', step:'Desfecho · Médio risco', secs:[
    S('O que acontece','do',['A troca é confirmada, mas passa por uma janela de 24–72h antes de virar definitiva.']),
    S('O que roda na janela','check',['Aviso em todos os canais restantes (e-mail secundário, SMS, push) com botão "não fui eu"; saque congelado; checagens de risco (dispositivo, velocidade, reputação do novo e-mail); score da biometria em revisão se estiver no limite.']),
    S('Desfecho','safe',['Sem contestação + risco ok → efetiva. Contestou ou deu alerta → reverte e vai para Fraude/CX.']) ]},
  'result-alto':{ title:'Análise assistida', step:'Desfecho · Alto risco', secs:[
    S('O que acontece','do',['A pessoa já enviou biometria + documento + aceite de sócios pela plataforma; o caso segue para validação humana do CX.']),
    S('Bastidores','check',['OCR + leitura do QR Code do documento; conferência de titularidade (quadro societário) em base oficial. O humano entra só onde a automação não cobre.']),
    S('Impacto','safe',['Reduz o vai-e-vem de reenvio por ticket, mantendo o olho humano onde é crítico.']) ]}
};

function setAnno(key){
  state.annoKey = key;
  var a = ANNO[key];
  var title=document.getElementById('anno-title'), step=document.getElementById('anno-step'), body=document.getElementById('anno-body');
  if(!a){ title.textContent='Modo apresentação'; step.textContent=''; body.innerHTML='<div class="anno-empty">Avance pelo fluxo para ver a explicação de cada etapa.</div>'; return; }
  title.textContent=a.title; step.textContent=a.step;
  var h='';
  a.secs.forEach(function(sec){
    h+='<div class="anno-sec"><div class="lbl">'+SECICON[sec.icon]+' '+sec.lbl+'</div><ul>';
    sec.items.forEach(function(it){ h+='<li>'+it+'</li>'; });
    h+='</ul></div>';
  });
  body.innerHTML=h;
}
function toggleAnno(){
  var on = document.body.classList.toggle('anno-on');
  document.getElementById('anno-rail').classList.toggle('on', on);
  document.getElementById('anno-toggle-label').textContent = on ? 'Ocultar anotações' : 'Modo apresentação';
  if(on) setAnno(state.annoKey || 'hub');
}

/* ── seleção de canal (médio risco) ── */
function selectChannel(ch){
  state.channel = ch;
  document.querySelectorAll('#verify-panel .choice').forEach(function(c){ c.classList.toggle('selected', c.dataset.ch===ch); });
  var cta=document.getElementById('verify-cta');
  cta.disabled=false;
  cta.innerHTML = (ch==='secondary' ? ICON.mail+' Enviar código para o e-mail secundário' : ICON.send+' Enviar código por SMS');
  setAnno(ch==='secondary'?'verify-medio':'verify-medio');
}

/* ═══════════ As-is (Como é hoje) ═══════════ */
var IC_CH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var IC_ALERT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.4"/></svg>';
var IC_AR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function setContaMode(m){
  state.contaMode=m;
  document.getElementById('seg-prop').classList.toggle('on', m==='proposta');
  document.getElementById('seg-hoje').classList.toggle('on', m==='hoje');
  var act=document.getElementById('email-action'), hint=document.getElementById('email-hint');
  if(m==='proposta'){
    act.innerHTML='<button class="ui-btn ui-btn-primary" onclick="startEmailChange()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg> Alterar e-mail <span class="novo-badge">Novo</span></button>';
    hint.innerHTML='Na proposta, a alteração passa a ser self-service na plataforma, com verificação forte (código + biometria).';
    setAnno('conta');
  } else {
    act.innerHTML='';
    hint.innerHTML='<div class="deadend">'+IC_ALERT+'<div>Hoje não existe opção de trocar o e-mail da conta pela plataforma. É preciso abrir um chamado no atendimento, com envio de documento e selfie.</div></div>'+
      '<button class="btn-voltar" style="border-color:var(--gray-300);color:var(--black);" onclick="startAsis()">'+IC_CH+' Ir para a Central de Ajuda</button>';
    setAnno('conta-hoje');
  }
}

function startAsis(ctx){ state.asisCtx=ctx||null; state.asis={motivo:'Acesso e configurações da conta', espec:'Alteração do email da compra ou da minha conta Hotmart'}; showView('v-asis'); asisGo('persona'); }

function asisGo(step){
  state.asisStep=step;
  var el=document.getElementById('asis-inner'); var h='';
  var back='<span class="back-link" onclick="showView(\'v-conta\')">'+ICON.arrowL+' Voltar</span>';
  if(step==='persona'){
    var compradorClass = (state.asisCtx==='compra') ? 'pill-opt' : 'pill-opt pill-disabled';
    var compradorClick = (state.asisCtx==='compra') ? 'onclick="asisPersona(this,\'Comprador\')"' : '';
    h='<div class="help-card"><div class="help-h1">Como podemos ajudar?</div><div class="help-lead">Selecione o tipo de atendimento que precisa:</div>'+
      '<div class="pill-row">'+
      '<div class="'+compradorClass+'" '+compradorClick+'>Sou Comprador(a)</div>'+
      '<div class="pill-opt" onclick="asisPersona(this,\'Produtor\')">Sou Produtor(a)</div>'+
      '<div class="pill-opt" onclick="asisPersona(this,\'Afiliado\')">Sou Afiliado(a)</div></div>'+
      '<div class="hd-sep"></div><div class="help-actions">'+back+
      '<button class="ui-btn ui-btn-primary" id="asis-cta" disabled onclick="asisAfterPersona()">Iniciar solicitação '+IC_AR+'</button></div></div>';
  } else if(step==='motispec'){
    state.asis.motivo=''; state.asis.espec='';
    h='<div class="help-card"><div class="etapa-label">Solicitação de atendimento</div><div class="help-h1">Como podemos ajudar?</div>'+
      vstep(0)+
      '<div class="fld sel-drop" id="sd-motivo">'+
        '<label>Selecione o motivo do contato *</label>'+
        '<div class="sel-box" onclick="toggleSelDrop(\'sd-motivo\')">Selecione o motivo do contato <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>'+
        '<div class="sel-menu sel-menu-drop">'+
          '<div class="sel-item-disabled">Cancelamentos e reembolsos</div>'+
          '<div class="sel-item-disabled">Dúvidas e problemas gerais sobre o produto que comprei</div>'+
          '<div class="sel-item-disabled">Problemas com pagamentos ou finalização da compra</div>'+
          '<div class="sel-item-disabled">Sobre compras de produtos físicos</div>'+
          '<div onclick="pickMotiSpec(\'motivo\',\'Acesso e configurações da conta\')">Acesso e configurações da conta</div>'+
        '</div>'+
      '</div>'+
      '<div class="fld sel-drop" id="sd-espec">'+
        '<label>Informe a especificação *</label>'+
        '<div class="sel-box" onclick="toggleSelDrop(\'sd-espec\')">Especifique um pouco mais <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>'+
        '<div class="sel-menu sel-menu-drop">'+
          '<div onclick="pickMotiSpec(\'espec\',\'Alteração do email da compra ou da minha conta Hotmart\')">Alteração do email da compra ou da minha conta Hotmart</div>'+
          '<div class="sel-item-disabled">Conta bloqueada</div>'+
          '<div class="sel-item-disabled">Dúvidas sobre aplicativo Hotmart</div>'+
          '<div class="sel-item-disabled">Excluir, desativar ou reativar conta</div>'+
          '<div class="sel-item-disabled">Não consigo acessar minha conta ou produto</div>'+
          '<div class="sel-item-disabled">Quero ser produtor(a) ou afiliado(a)</div>'+
          '<div class="sel-item-disabled">Redefinir senha</div>'+
        '</div>'+
      '</div>'+
      '<div class="help-actions"><button class="btn-voltar" onclick="asisGo(\'persona\')">'+ICON.arrowL+' Voltar</button>'+
      '<button class="ui-btn ui-btn-primary" id="asis-cta" disabled onclick="asisGo(\'dados\')">Avançar '+IC_AR+'</button></div></div>';
  } else if(step==='motivo'||step==='espec'){
    asisGo('motispec'); return;
  } else if(step==='dados'){
    h='<div class="help-card"><div class="etapa-label">Solicitação de atendimento</div><div class="help-h1">Informações necessárias para a sequência do atendimento</div>'+
      vstep(1)+
      '<div class="fld"><label>Nome *</label><input value="Thiago Pereira"></div>'+
      '<div class="fld"><label>Email cadastrado na plataforma *</label><input value="thiago.oliveira@email.com"></div>'+
      '<div class="fld"><label>Descreva sua solicitação *</label><textarea placeholder="Digite o que você precisa resolver..."></textarea></div>'+
      '<div class="fld"><label>Anexe uma imagem que ilustre o problema</label><input value="" placeholder="Selecione um arquivo"></div>'+
      '<div class="fld"><label>Informe o seu país atual *</label><input value="Brasil"></div>'+
      '<div class="fld"><label>Selecione o idioma *</label><div class="pill-row"><div class="pill-opt sel">Português Brasileiro</div><div class="pill-opt">Espanhol</div><div class="pill-opt">Inglês</div><div class="pill-opt">Francês</div><div class="pill-opt">Italiano</div></div></div>'+
      '<div class="help-actions"><button class="btn-voltar" onclick="asisGo(\'espec\')">'+ICON.arrowL+' Voltar</button>'+
      (state.asisCtx==='compra'
        ? '<button class="ui-btn ui-btn-primary" onclick="asisGo(\'especificacoes\')">Avançar '+IC_AR+'</button>'
        : '<button class="ui-btn ui-btn-primary" onclick="asisGo(\'enviado\')">Enviar solicitação '+IC_AR+'</button>')+
      '</div></div>';
  } else if(step==='especificacoes'){
    h='<div class="help-card"><div class="etapa-label">Solicitação de atendimento</div><div class="help-h1">Especificações</div>'+
      '<div class="fld"><label>Anexe o comprovante de pagamento da compra, se houver</label><input value="" placeholder="Selecione um arquivo"></div>'+
      '<div class="fld"><label>E-mail atualmente cadastrado *</label><input value="thiago.comprador@email.com"></div>'+
      '<div class="fld"><label>Novo e-mail que deseja utilizar *</label><input value="thiago.comprador.novo@email.com"></div>'+
      '<div class="fld"><label>CPF do comprador *</label><input value="115.***.**6-94"></div>'+
      '<div class="fld"><label>Número da transação e nome do produto, se houver</label><input value="" placeholder="HP1234567890 · Curso de..."></div>'+
      '<div class="fld"><label>Motivo da solicitação *</label>'+selBox('E-mail incorreto','Selecione o motivo')+'</div>'+
      '<div class="help-actions"><button class="btn-voltar" onclick="asisGo(\'dados\')">'+ICON.arrowL+' Voltar</button>'+
      '<button class="ui-btn ui-btn-primary" onclick="asisGo(\'enviado\')">Enviar solicitação '+IC_AR+'</button></div></div>';
  } else if(step==='chat'){
    h='<div class="help-card"><div class="etapa-label">Atendimento</div><div class="help-h1">Você entrou na fila do chat</div>'+
      '<div class="thread"><div class="msg sys">Chat iniciado · aguardando um atendente disponível</div>'+
      '<div class="msg agent"><div class="who">Atendente</div>Olá! Em breve um de nossos atendentes vai te ajudar. Para a troca de e-mail, vamos precisar validar sua identidade com documento e selfie.</div></div>'+
      '<div class="help-actions"><button class="btn-voltar" onclick="showView(\'v-conta\')">'+ICON.arrowL+' Voltar</button>'+
      '<button class="ui-btn ui-btn-primary" onclick="asisStartLoop()">Continuar o atendimento '+IC_AR+'</button></div></div>';
  } else if(step==='enviado'){
    h='<div class="help-card" style="text-align:center;"><div class="rico wait" style="width:70px;height:70px;margin:6px auto 16px;background:var(--amber-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;">'+ICON.clock+'</div>'+
      '<div class="help-h1">Solicitação enviada</div>'+
      '<p class="help-lead">Protocolo <b>'+asisProto()+'</b>. Você receberá o retorno por e-mail. O prazo pode levar alguns dias.</p>'+
      '<button class="ui-btn ui-btn-primary" onclick="asisStartLoop()">Ver andamento do atendimento '+IC_AR+'</button></div>';
  } else if(step==='loop'){
    h='<div class="help-card"><div class="etapa-label">Ticket '+asisProto()+' · '+asisTema()+'</div>'+
      '<div class="thread" id="asis-thread"></div>'+
      '<div class="help-actions" id="asis-loop-actions" style="justify-content:flex-end;"></div></div>';
  } else if(step==='resolvido'){
    var d=asisCfg().desf; var compra=(state.asisCtx==='compra');
    var ico = d.partial
      ? '<div class="rico wait" style="width:70px;height:70px;margin:6px auto 16px;background:var(--amber-bg);color:#B4740A;border-radius:50%;display:flex;align-items:center;justify-content:center;">'+ICON.warn+'</div>'
      : '<div class="rico ok" style="width:70px;height:70px;margin:6px auto 16px;background:var(--green-bg);color:#128A4B;border-radius:50%;display:flex;align-items:center;justify-content:center;">'+ICON.check+'</div>';
    var lead = d.desc ? d.desc : ('Concluído após <b>'+d.dias+'</b> e <b>'+d.inter+'</b> com o atendimento.');
    h='<div class="help-card" style="text-align:center;">'+ico+
      '<div class="help-h1">'+d.title+'</div>'+
      '<p class="help-lead">'+lead+'</p>'+
      '<div class="cost-box" style="text-align:left;"><b>Custo operacional deste caso:</b> '+d.cost+'</div>'+
      '<div style="margin-top:22px;display:flex;gap:12px;justify-content:center;">'+
      '<button class="ui-btn ui-btn-outline" onclick="'+(compra?'showView(\'v-compra\')':'showView(\'v-conta\')')+'">'+ICON.arrowL+' '+(compra?'Voltar':'Minha Conta')+'</button>'+
      '<button class="ui-btn ui-btn-primary" onclick="compararProposta()">Comparar com a proposta '+IC_AR+'</button></div></div>';
  }
  el.innerHTML=h;
  setAnno('asis-'+step);
  if(step==='loop') asisRenderThread();
}

function vstep(active){
  function it(i,txt){ return '<div class="it'+(i===active?' active':(i<active?' active':''))+'"><span class="rc"></span>'+txt+'</div>'; }
  return '<div class="vstep">'+it(0,'Detalhe da solicitação')+it(1,'Dados do atendimento')+'</div>';
}
function selBox(val,ph){ return '<div class="sel-box'+(val?' filled':'')+'">'+(val||ph)+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M6 9l6 6 6-6"/></svg></div>'; }
function selMenu(opts,cb){ var h='<div class="sel-menu">'; opts.forEach(function(o){ h+='<div onclick="'+cb+'(\''+o.replace(/'/g,"\\'")+'\')">'+o+'</div>'; }); return h+'</div>'; }
function asisPersona(el,p){ state.asis.persona=p; document.querySelectorAll('#asis-inner .pill-opt').forEach(function(x){x.classList.remove('sel');}); el.classList.add('sel'); document.getElementById('asis-cta').disabled=false; }
function asisAfterPersona(){ if(state.asis.persona==='Produtor') asisGo('chat'); else asisGo('motispec'); }
function asisPickMotivo(v){ state.asis.motivo=v; asisGo('motispec'); }
function asisPickEspec(v){ state.asis.espec=v; asisGo('motispec'); }
function toggleSelDrop(id){
  var el=document.getElementById(id);
  var isOpen=el.classList.contains('open');
  document.querySelectorAll('.sel-drop.open').forEach(function(d){ d.classList.remove('open'); });
  if(!isOpen) el.classList.add('open');
}
function pickMotiSpec(field,val){
  state.asis[field]=val;
  var id=field==='motivo'?'sd-motivo':'sd-espec';
  var el=document.getElementById(id);
  el.classList.remove('open');
  var box=el.querySelector('.sel-box');
  box.classList.add('filled');
  box.innerHTML=val+' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg>';
  if(state.asis.motivo && state.asis.espec){
    var btn=document.getElementById('asis-cta');
    if(btn) btn.disabled=false;
  }
}
function compararProposta(){
  if(state.asisCtx==='compra'){ showView('v-compra'); setCompraMode('proposta'); }
  else { showView('v-conta'); setContaMode('proposta'); }
}

/* conjuntos de mensagens do ticket, por cenário */
var ASIS_SETS = {
  perda:{ msgs:[
    {t:'sys', text:'Solicitação #482193 aberta · Motivo: Alteração de e-mail da conta'},
    {t:'agent', who:'Ana · Suporte N1', text:'Olá! Para prosseguir, precisamos validar sua identidade. Envie foto do documento (RG frente e verso ou CNH) e uma selfie segurando o documento.'},
    {t:'me', text:'Enviei o documento e a selfie.'},
    {t:'day', text:'1 dia depois'},
    {t:'reprovado', who:'Ana · Suporte N1', text:'A selfie está com baixa iluminação e o rosto não ficou nítido. Poderia reenviar seguindo as orientações?'},
    {t:'me', text:'Reenviei a selfie.'},
    {t:'day', text:'2 dias depois'},
    {t:'agent', who:'Bruno · Suporte N1', text:'Olá, sou o Bruno e vou dar continuidade ao atendimento. Poderia enviar novamente seu nome, o e-mail atual e os documentos?'},
    {t:'me', text:'Eu já tinha enviado tudo, mas segue novamente.'},
    {t:'sys', text:'Atendimento encaminhado para o time N2 para execução da alteração.'},
    {t:'day', text:'4 dias depois'},
    {t:'agent', who:'Suporte N2', text:'Identidade validada. A alteração do e-mail foi concluída.'}
  ], desf:{ title:'E-mail alterado', dias:'4 dias', inter:'7 interações', partial:false,
    cost:'um ticket que passou por N1, foi reprovado e reenviado, trocou de atendente (perda de contexto) e escalou para o N2. Multiplique por cerca de <b>2.115 tickets/mês</b> neste motivo, com <b>DSAT de 10,49%</b>.' } },

  trocasimples:{ msgs:[
    {t:'sys', text:'Solicitação #482210 aberta · Motivo: Alteração de e-mail da conta'},
    {t:'agent', who:'Ana · Suporte N1', text:'Olá! Mesmo para essa alteração, precisamos validar sua identidade. Envie documento (RG ou CNH) e uma selfie segurando o documento.'},
    {t:'me', text:'Mas eu ainda acesso meu e-mail atual... enviei o documento e a selfie.'},
    {t:'day', text:'1 dia depois'},
    {t:'reprovado', who:'Ana · Suporte N1', text:'A selfie ficou com baixa iluminação. Poderia reenviar?'},
    {t:'me', text:'Reenviei a selfie.'},
    {t:'day', text:'3 dias depois'},
    {t:'agent', who:'Suporte N1', text:'Identidade validada. A alteração do e-mail foi concluída.'}
  ], desf:{ title:'E-mail alterado', dias:'3 dias', inter:'5 interações', partial:false,
    cost:'mesmo sendo uma troca simples, com a pessoa ainda acessando o e-mail atual, foi preciso abrir chamado, enviar documento e selfie e esperar. É o caso mais evidente de algo que não deveria depender de atendimento.' } },

  transicao:{ msgs:[
    {t:'sys', text:'Solicitação #482233 aberta · Motivo: Alteração de e-mail (conta PJ)'},
    {t:'agent', who:'Ana · Suporte N1', text:'Olá! Por ser conta PJ, precisamos de: RG ou CNH do responsável, uma selfie, e o contrato social com aceite de todos os sócios.'},
    {t:'me', text:'Enviei os documentos e a selfie.'},
    {t:'day', text:'1 dia depois'},
    {t:'reprovado', who:'Ana · Suporte N1', text:'A selfie não ficou nítida e faltou o documento de um dos sócios. Poderia reenviar?'},
    {t:'me', text:'Reenviei a selfie e o documento do sócio.'},
    {t:'day', text:'3 dias depois'},
    {t:'agent', who:'Bruno · Suporte N1', text:'Olá, sou o Bruno e vou continuar. Poderia reenviar o contrato social e confirmar os dados?'},
    {t:'me', text:'Já tinha enviado, mas segue novamente.'},
    {t:'sys', text:'Atendimento encaminhado para o time N2 para execução da alteração.'},
    {t:'day', text:'8 dias depois'},
    {t:'agent', who:'Suporte N2', text:'Titularidade validada. A alteração do e-mail foi concluída.'}
  ], desf:{ title:'E-mail alterado', dias:'8 dias', inter:'11 interações', partial:false,
    cost:'conta PJ exige documento do responsável, selfie e aceite de todos os sócios. Reprovações, troca de atendente e escalonamento para o N2 tornam este o caso mais caro e demorado.' } },

  unificacao:{ msgs:[
    {t:'sys', text:'Solicitação #482251 aberta · Motivo: Unificação/transferência de contas'},
    {t:'agent', who:'Ana · Suporte N1', text:'Olá! Para validar, envie documento e selfie das duas contas envolvidas.'},
    {t:'me', text:'Enviei os documentos das duas contas.'},
    {t:'day', text:'2 dias depois'},
    {t:'agent', who:'Bruno · Suporte N1', text:'Conseguimos validar sua identidade e podemos alterar o e-mail. Porém não é possível transferir produtos, saldo, afiliações ou coproduções de uma conta para outra, nem unificar contas.'},
    {t:'me', text:'Mas era exatamente isso que eu precisava...'},
    {t:'day', text:'3 dias depois'},
    {t:'agent', who:'Suporte N1', text:'Infelizmente essa transferência não é suportada pela plataforma hoje.'}
  ], desf:{ title:'Resolvido em parte', dias:'3 dias', inter:'6 interações', partial:true,
    desc:'A identidade foi validada e o e-mail pode ser alterado, mas a unificação e a transferência de produtos e saldo não são suportadas hoje.',
    cost:'o cliente passou por todo o atendimento, mas o que ele realmente queria (unificar e transferir) não é possível. Gera esforço, frustração e DSAT, mesmo sem solução.' } },

  compra:{ msgs:[
    {t:'sys', text:'Solicitação #482270 aberta · Motivo: Alteração de e-mail da compra (E-mail incorreto)'},
    {t:'agent', who:'Ana · Suporte N1', text:'Olá! Recebemos sua solicitação. Estamos conferindo os dados da compra (comprovante, CPF e número da transação) para localizar o pedido.'},
    {t:'day', text:'1 dia depois'},
    {t:'reprovado', who:'Ana · Suporte N1', text:'O comprovante de pagamento enviado está ilegível e não localizamos a transação. Poderia reenviar o comprovante e confirmar o número do pedido?'},
    {t:'me', text:'Reenviei o comprovante e o número da transação.'},
    {t:'day', text:'2 dias depois'},
    {t:'agent', who:'Suporte N1', text:'Compra localizada e dados validados. O e-mail da compra foi alterado.'}
  ], desf:{ title:'E-mail da compra alterado', dias:'2 dias', inter:'4 interações', partial:false,
    cost:'o comprador não consegue resolver sozinho hoje. Precisa abrir chamado e informar comprovante, CPF e número da transação. O tema tem <b>DSAT de 12,19%</b>, bem acima dos 2,86% de quando o produtor faz a troca.' } }
};
function asisScen(){
  if(state.asisCtx==='compra') return 'compra';
  return state.motivo || (state.branch==='alto'?'transicao':(state.branch==='baixo'?'trocasimples':'perda'));
}
function asisCfg(){ return ASIS_SETS[asisScen()] || ASIS_SETS.perda; }

function asisStartLoop(){ state.asisMsg=0; state.asisArr=asisCfg().msgs; asisGo('loop'); }
function asisRenderThread(){
  var th=document.getElementById('asis-thread'); var act=document.getElementById('asis-loop-actions');
  var arr=state.asisArr||asisCfg().msgs; var n=state.asisMsg||0;
  var h='';
  for(var i=0;i<=n && i<arr.length;i++){
    var m=arr[i];
    if(m.t==='day'){ h+='<div class="day-chip">'+m.text+'</div>'; }
    else if(m.t==='sys'){ h+='<div class="msg sys">'+m.text+'</div>'; }
    else { h+='<div class="msg '+(m.t==='me'?'me':(m.t==='reprovado'?'reprovado':'agent'))+'">'+(m.who?'<div class="who">'+m.who+'</div>':'')+m.text+'</div>'; }
  }
  th.innerHTML=h;
  if(n < arr.length-1){
    act.innerHTML='<button class="ui-btn ui-btn-primary" onclick="asisNextMsg()">Avançar no atendimento '+IC_AR+'</button>';
  } else {
    act.innerHTML='<button class="ui-btn ui-btn-primary" onclick="asisGo(\'resolvido\')">Ver desfecho '+IC_AR+'</button>';
  }
}
function asisNextMsg(){ state.asisMsg=(state.asisMsg||0)+1; asisRenderThread(); }

/* anotações do as-is (custo operacional) */
ANNO['conta-hoje']={ title:'Como é hoje', step:'Ponto de entrada', secs:[
  S('O que o usuário encontra','do',['Nenhuma opção de alteração de e-mail está disponível na plataforma. O usuário precisa sair para a Central de Ajuda e abrir um chamado de atendimento.']),
  S('Impacto operacional','check',['Qualquer solicitação, mesmo a mais simples, gera um ticket humano. Nenhum caso se resolve de forma autônoma.']),
  S('Volume','safe',['Aproximadamente 2.115 tickets por mês registrados apenas para este motivo, com índice de insatisfação (DSAT) de 10,49%.']) ]};
ANNO['asis-persona']={ title:'Abertura de chamado', step:'Central de Ajuda', secs:[
  S('O que o usuário faz','do',['Identifica seu perfil de atendimento — Produtor ou Afiliado — para iniciar a solicitação.']),
  S('Inconsistência atual','check',['Produtores são direcionados ao chat em tempo real; Afiliados passam pelo formulário assíncrono. Dois caminhos distintos para a mesma demanda geram experiências inconsistentes e dificultam a padronização do atendimento.']),
  S('Custo operacional','safe',['A partir desta etapa, a resolução depende integralmente do atendimento humano.']) ]};
ANNO['asis-motispec']={ title:'Seleção de motivo e especificação', step:'Detalhe da solicitação', secs:[
  S('O que o usuário faz','do',['Navega pelos menus de suporte para localizar o motivo correto e, em seguida, a especificação correspondente à sua demanda.']),
  S('Pontos de atrito','check',['Não há garantia de que o usuário identificará as opções corretas. Uma seleção equivocada resulta no encaminhamento do ticket para a fila errada, gerando retrabalho e aumento do tempo de resolução.']),
  S('Ambiguidade no sistema','safe',['O mesmo item de especificação ("Alteração do email da compra ou da minha conta") agrupa situações distintas — e-mail de compra e e-mail de conta — sem diferenciação, o que prejudica a triagem.']) ]};
ANNO['asis-dados']={ title:'Formulário', step:'Dados do atendimento', secs:[
  S('O que a pessoa faz','do',['Preenche nome, e-mail, descrição, país e idioma.']),
  S('O que falta','check',['O documento e a selfie nem são pedidos aqui: só depois, dentro do atendimento, o que alonga a jornada.']) ]};
ANNO['asis-chat']={ title:'Chat do Produtor', step:'Atendimento', secs:[
  S('O que acontece','do',['O Produtor cai em uma fila de chat e o atendente conduz tudo manualmente.']),
  S('Custo','safe',['Ocupa um atendente em tempo real, do início ao fim.']) ]};
ANNO['asis-enviado']={ title:'Na fila', step:'Ticket aberto', secs:[
  S('O que acontece','do',['O ticket entra na fila do N1 e a pessoa aguarda um retorno por e-mail.']),
  S('Custo','safe',['O tempo de resolução (dias) e o custo por ticket começam a correr aqui.']) ]};
ANNO['asis-loop']={ title:'Vai e vem do atendimento', step:'Onde mora o custo', secs:[
  S('O que acontece','do',['Cada mensagem é uma interação humana: pedido de documento e selfie, reprovação, reenvio, troca de atendente que retoma do zero e, por fim, escalonamento para o N2.']),
  S('Por que é caro','check',['Reprovação de selfie, perda de contexto entre atendentes e escalonamento N1 para N2 são os principais motores de custo e de DSAT.']) ]};
ANNO['asis-resolvido']={ title:'Resolvido, enfim', step:'Desfecho de hoje', secs:[
  S('O que aconteceu','do',['A troca foi concluída após vários dias e várias interações.']),
  S('O contraste','check',['Na proposta, o mesmo caso se resolve em minutos, self-service, mantendo a segurança por biometria.']),
  S('Escala','safe',['Cerca de 2.115 tickets/mês neste motivo. A conta do custo operacional se multiplica.']) ]};

/* ═══════════ Motivos (hub) ═══════════ */
var MOTIVOS = {
  trocasimples:{ branch:'baixo', titulo:'Trocar para um novo e-mail',
                nota:'A pessoa ainda tem acesso ao e-mail atual, então a verificação é a mais simples. Ainda assim, hoje isso depende do CX.' },
  perda:      { branch:'medio', titulo:'Perdi o acesso ao e-mail antigo',
                nota:'A pessoa não recebe mais nada no e-mail atual, então a verificação usa canais alternativos.' },
  transicao:  { branch:'alto',  titulo:'Transição profissional ou mudança de PJ',
                nota:'Envolve mudança de titularidade ou natureza (PF para PJ), por isso é tratado como alto risco.' },
  unificacao: { branch:'alto',  titulo:'Unificação ou transferência de contas',
                nota:'A troca de e-mail é possível, mas transferir produtos e saldo entre contas não é. Isso segue como caso assistido.' },
  compradorvendedor:{ branch:'baixo', titulo:'Virar produtor ou afiliado',
                nota:'A pessoa ainda tem acesso ao e-mail atual, então a verificação é a mais simples.' }
};
function startMotivo(key){
  state.motivo=key;
  startBranch(MOTIVOS[key].branch);
}

/* ═══════════ E-mail da compra ═══════════ */
function startCompra(){ state.motivo=null; state.branch=null; goTo('scr-platform'); showView('v-compra'); setCompraMode('hoje'); }

function setCompraMode(m){
  state.compraMode=m;
  document.getElementById('cseg-prop').classList.toggle('on', m==='proposta');
  document.getElementById('cseg-hoje').classList.toggle('on', m==='hoje');
  var regras='<div class="mc-card"><h3>Produtor: já pode trocar hoje</h3><div class="hint">Dentro da gestão de vendas, com regras:</div>'+
    '<ul style="margin:0;padding-left:18px;font-size:13px;color:var(--gray-600,#4b4b49);line-height:1.7;">'+
    '<li>Só o e-mail de compra de um aluno do próprio produto.</li>'+
    '<li>Até 40 dias após a compra e o aluno não pode ter acessado o produto.</li>'+
    '<li>O novo e-mail não pode ter saldo nem afiliação ativa.</li>'+
    '<li>Compra "Aprovada" ou "Completa", sem duas alterações anteriores.</li>'+
    '<li>O novo e-mail não pode ser o do próprio produtor.</li></ul></div>';
  var buyer;
  if(m==='hoje'){
    buyer='<div class="mc-card"><h3>Comprador: não consegue trocar o próprio</h3>'+
      '<div class="deadend" style="margin:8px 0 14px;">'+IC_ALERT+'<div>Quando o comprador precisa trocar o próprio e-mail (ou transferir compras de vários produtores), não há opção na plataforma. É preciso abrir um chamado.</div></div>'+
      '<button class="btn-voltar" style="border-color:var(--gray-300);color:var(--black);" onclick="startAsis(\'compra\')">'+IC_CH+' Abrir chamado</button></div>';
    setAnno('compra-hoje');
  } else {
    buyer='<div class="mc-card"><h3>Comprador: passa a trocar sozinho <span class="novo-badge">Novo</span></h3>'+
      '<div class="hint">Self-service com verificação por código, no e-mail da compra ou por SMS no telefone do checkout. Sem biometria, porque o comprador não tem cadastro biométrico.</div>'+
      '<button class="ui-btn ui-btn-primary" onclick="compraStart()">'+ICON.mail+' Simular troca self-service</button></div>';
    setAnno('compra-proposta');
  }
  document.getElementById('compra-inner').innerHTML=regras+buyer;
}
function compraSteps(active){
  var labels=['Verificação','Novo e-mail','Confirmar novo e-mail'];
  var html='';
  labels.forEach(function(s,idx){
    var cls=idx<active?'done':(idx===active?'active':'');
    var mark=idx<active?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:13px;height:13px;"><path d="M5 12.5l4.5 4.5L19 7"/></svg>':(idx+1);
    html+='<div class="wz-step '+cls+'">'+(idx>0?'<div class="wz-line"></div>':'')+'<div class="dot">'+mark+'</div><div class="lbl">'+s+'</div></div>';
  });
  return '<div class="wz-steps">'+html+'</div>';
}
function compraStart(){ state.compraCh=null; showView('v-compra-flow'); compraFlow('verify'); }
function compraFlow(step){
  var el=document.getElementById('compra-flow-inner'); var h='';
  if(step==='verify'){
    h='<div class="mc-title">Alterar e-mail da compra <span class="novo-badge">Novo</span></div>'+
      compraSteps(0)+
      '<div class="wz-panel"><h2>Confirme que é você</h2>'+
      '<p class="desc">Escolha por onde receber o código de confirmação. O comprador não tem biometria, então usamos um código.</p>'+
      '<div class="choice-row">'+
        '<div class="choice" data-cch="email" onclick="compraSelectCh(this,\'email\')"><div class="choice-head"><h4>Código no e-mail da compra</h4></div><p>c***@email.com</p></div>'+
        '<div class="choice" data-cch="sms" onclick="compraSelectCh(this,\'sms\')"><div class="choice-head"><h4>Código por SMS</h4></div><p>(31) 9 9***-**12 · telefone do checkout</p></div>'+
      '</div></div>'+
      '<div class="wz-actions"><span class="back-link" onclick="setCompraMode(\'proposta\'); showView(\'v-compra\');">'+ICON.arrowL+' Voltar</span>'+
      '<button class="ui-btn ui-btn-primary" id="compra-cta" disabled onclick="compraFlowCta()">Enviar código</button></div>';
  } else if(step==='newemail'){
    h='<div class="mc-title">Novo e-mail da compra <span class="novo-badge">Novo</span></div>'+
      compraSteps(1)+
      '<div class="wz-panel"><h2>Qual será o novo e-mail?</h2>'+
      '<p class="desc">Identidade confirmada. Informe o novo e-mail. Enviaremos um código para confirmar o acesso a ele.</p>'+
      '<div class="field-label">Novo e-mail</div>'+
      '<div class="field-box"><input id="compra-new-input" style="border:none;outline:none;width:100%;font-size:14px;background:transparent;" value="thiago.comprador.novo@email.com"></div></div>'+
      '<div class="wz-actions"><span class="back-link" onclick="compraFlow(\'verify\')">'+ICON.arrowL+' Voltar</span>'+
      '<button class="ui-btn ui-btn-primary" onclick="openOtp(\'compra-new\')">'+ICON.send+' Enviar código</button></div>';
  }
  el.innerHTML=h;
  setAnno(step==='verify'?'compra-verify':'compra-newemail');
}
function compraSelectCh(elm,ch){
  state.compraCh=ch;
  document.querySelectorAll('#compra-flow-inner .choice').forEach(function(c){ c.classList.toggle('selected', c.dataset.cch===ch); });
  var cta=document.getElementById('compra-cta'); cta.disabled=false;
  cta.innerHTML=(ch==='sms'?ICON.send+' Enviar código por SMS':ICON.mail+' Enviar código por e-mail');
}
function compraFlowCta(){ openOtp(state.compraCh==='sms'?'compra-sms':'compra-mail'); }
function compraResult(){
  var el=document.getElementById('result-inner');
  el.innerHTML='<div class="rico ok">'+ICON.check+'</div><h2>E-mail da compra alterado</h2>'+
    '<p>O comprador confirmou a identidade e trocou o e-mail da compra sozinho, sem abrir chamado.</p>'+
    '<div style="margin-top:10px;"><span class="novo-badge">Novo</span> <span style="font-size:12.5px;color:var(--gray-500);">tira da fila do atendimento o maior volume de troca de e-mail</span></div>'+
    '<div style="margin-top:26px;"><button class="ui-btn ui-btn-outline" onclick="goTo(\'scr-hub\')">'+ICON.arrowL+' Voltar aos cenários</button></div>';
  showView('v-result'); setAnno('compra-result');
}

/* anotações da compra */
ANNO['compra-proposta']={ title:'E-mail da compra', step:'Proposta', secs:[
  S('Situação','do',['O produtor já troca o e-mail de uma compra sozinho, com regras. O comprador ainda não consegue trocar o próprio.']),
  S('Proposta','check',['Habilitar o comprador a trocar sozinho, confirmando por código no e-mail da compra ou por SMS (telefone do checkout), sem depender de biometria.']),
  S('Impacto','safe',['É o maior volume de troca de e-mail (cerca de 16 mil tickets), boa parte aberta pelo próprio comprador.']) ]};
ANNO['compra-hoje']={ title:'E-mail da compra', step:'Como é hoje', secs:[
  S('Situação','do',['O comprador não consegue trocar o próprio e-mail nem transferir compras de vários produtores.']),
  S('O que acontece','check',['Vira chamado, mesmo fluxo manual de atendimento.']),
  S('Custo','safe',['Tickets abertos pelo comprador têm DSAT mais alto (12,19%) que os abertos pelo produtor (2,86%).']) ]};
ANNO['otp-compra']={ title:'Confirmar e-mail da compra', step:'Verificação', secs:[
  S('O que a pessoa faz','do',['Digita o código enviado ao e-mail da compra para provar a posse.']),
  S('Por que é seguro','safe',['Confirma o acesso antes de trocar, sem depender de atendimento.']) ]};
ANNO['compra-result']={ title:'Trocado', step:'Desfecho', secs:[
  S('O que acontece','do',['O comprador resolve sozinho, em minutos.']),
  S('Impacto','safe',['Deflaciona o maior volume de troca de e-mail da fila do CX.']) ]};

/* protocolo/tema do as-is por cenário */
function asisProto(){ return {trocasimples:'#482210',perda:'#482193',transicao:'#482233',unificacao:'#482251',compra:'#482270'}[asisScen()]||'#482193'; }
function asisTema(){ return state.asisCtx==='compra'?'Alteração de e-mail da compra':'Alteração de e-mail da conta'; }
ANNO['asis-especificacoes']={ title:'Especificações da compra', step:'Dados do atendimento', secs:[
  S('O que a pessoa faz','do',['Informa comprovante de pagamento, e-mail atual, novo e-mail, CPF, número da transação e nome do produto, e o motivo "E-mail incorreto".']),
  S('Atrito','check',['São muitos dados que o comprador nem sempre tem à mão (número da transação, comprovante), o que trava e alonga o atendimento.']),
  S('Custo','safe',['Tudo isso para uma troca que, na proposta, o próprio comprador faria com um código no e-mail da compra.']) ]};

/* anotações do fluxo proposta da compra */
ANNO['compra-verify']={ title:'Confirme que é você', step:'Proposta · E-mail da compra', secs:[
  S('O que a pessoa faz','do',['Escolhe receber um código no e-mail da compra ou por SMS no telefone do checkout.']),
  S('Por que sem biometria','check',['O comprador não faz cadastro biométrico para comprar, então a verificação é por código de posse de canal.']),
  S('Por que é seguro','safe',['Prova que a pessoa controla o e-mail da compra ou o telefone informado no checkout.']) ]};
ANNO['compra-newemail']={ title:'Novo e-mail da compra', step:'Proposta · E-mail da compra', secs:[
  S('O que a pessoa faz','do',['Informa o novo e-mail e confirma o acesso a ele com um segundo código.']),
  S('Por que é seguro','safe',['Confirma que o destino é válido e controlado pela pessoa, evitando erro de digitação ou e-mail de terceiros.']) ]};
ANNO['otp-compra-mail']=ANNO['otp-compra-sms']={ title:'Código de verificação', step:'Proposta · E-mail da compra', secs:[
  S('O que a pessoa faz','do',['Digita o código de 6 dígitos recebido no canal escolhido.']),
  S('Por que é seguro','safe',['Prova a posse do canal antes de liberar a troca.']) ]};
ANNO['otp-compra-new']={ title:'Confirmar novo e-mail', step:'Proposta · E-mail da compra', secs:[
  S('O que a pessoa faz','do',['Digita o código enviado ao novo e-mail para confirmar que tem acesso a ele.']),
  S('Por que é seguro','safe',['Garante que o novo endereço é realmente da pessoa.']) ]};
ANNO['compra-proposta']={ title:'E-mail da compra', step:'Proposta', secs:[
  S('Situação','do',['O produtor já troca o e-mail de uma compra sozinho, com regras. O comprador ainda não consegue trocar o próprio.']),
  S('Proposta','check',['Habilitar o comprador a trocar sozinho, com código no e-mail da compra ou por SMS do checkout. Sem biometria, porque ele não tem cadastro biométrico.']),
  S('Impacto','safe',['É o maior volume de troca de e-mail (cerca de 15.998 tickets no semestre), boa parte aberta pelo próprio comprador, com DSAT de 12,19%.']) ]};

/* ═══════════ Titularidade (Documentos e titularidade) ═══════════ */

var TIT = {
  'pf-pj': {
    label: 'PF → PJ',
    natureza: 'Pessoa Física · CPF 115.***.**6-94',
    naturezaTag: ': Pessoa Física',
    hasPropostaSelfService: true
  },
  'pj-pj': {
    label: 'PJ → PJ',
    natureza: 'Pessoa Jurídica · CNPJ 12.345.678/0001-99',
    naturezaTag: ': Pessoa Jurídica',
    hasPropostaSelfService: false
  }
};

function startTitularidade(key) {
  state.titScenario = key;
  var scn = TIT[key];
  document.getElementById('tit-natureza').textContent = scn.natureza;
  document.getElementById('tit-natureza-tag').textContent = scn.naturezaTag;
  goTo('scr-platform');
  showView('v-tit-conta');
  setTitMode('hoje');
}

function setTitMode(m) {
  state.titMode = m;
  document.getElementById('tseg-prop').classList.toggle('on', m === 'proposta');
  document.getElementById('tseg-hoje').classList.toggle('on', m === 'hoje');
  var scn = TIT[state.titScenario];
  var action = document.getElementById('tit-action');
  var hint = document.getElementById('tit-hint');
  var box = document.getElementById('tit-natureza-box');

  if (m === 'proposta') {
    box.classList.remove('locked');
    if (scn.hasPropostaSelfService) {
      action.innerHTML = '<button class="ui-btn ui-btn-primary" onclick="startTitChange()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>' +
        ' Alterar tipo de conta <span class="novo-badge">Novo</span></button>';
      hint.innerHTML = 'Na proposta, o sistema consulta o CNPJ via SERPRO e valida automaticamente que você é sócio — sem necessidade de atendimento.';
    } else {
      action.innerHTML = '<button class="ui-btn ui-btn-primary" onclick="startTitChange()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>' +
        ' Iniciar alteração <span class="novo-badge">Novo</span></button>';
      hint.innerHTML = 'Na proposta, a plataforma coleta biometria + 2FA do solicitante e consulta SERPRO. Cada sócio valida em sua própria conta Hotmart (biometria + doc + 2FA) — CX só entra se houver problema. Carência de 48h após todas as validações.';
    }
    setAnno('tit-conta-proposta');
  } else {
    box.classList.add('locked');
    action.innerHTML = '';
    hint.innerHTML = '<div class="deadend">' + IC_ALERT + '<div>Hoje não é possível alterar a natureza do negócio pela plataforma. É preciso abrir um chamado no atendimento com documentos e selfie.</div></div>' +
      '<button class="btn-voltar" style="border-color:var(--gray-300);color:var(--black);" onclick="startTitAsis()">' + IC_CH + ' Abrir chamado</button>';
    setAnno('tit-conta-hoje');
  }
}

function startTitAsis() {
  state.titAsisSet = state.titScenario === 'pf-pj' ? 'tit_pf_pj' : 'tit_pj_pj';
  state.titAsisMsg = 0;
  titMotiCount = 0;
  showView('v-tit-asis');
  titAsisGo('persona');
}

function titAsisGo(step) {
  state.titAsisStep = step;
  var el = document.getElementById('tit-asis-inner');
  var back = '<span class="back-link" onclick="showView(\'v-tit-conta\')">' + ICON.arrowL + ' Voltar</span>';
  var h = '';

  if (step === 'persona') {
    h = '<div class="help-card"><div class="help-h1">Como podemos ajudar?</div>' +
      '<div class="help-lead">Selecione o tipo de atendimento que precisa:</div>' +
      '<div class="pill-row">' +
      '<div class="pill-opt pill-opt-disabled" title="Atendimento a compradores não inclui troca de titularidade">Sou Comprador(a)</div>' +
      '<div class="pill-opt" onclick="titAsisPersona(this)">Sou Produtor(a)</div>' +
      '<div class="pill-opt" onclick="titAsisPersona(this)">Sou Afiliado(a)</div>' +
      '</div>' +
      '<div style="margin-top:10px;font-size:12px;color:var(--gray-400);">Alterações de titularidade e dados cadastrais estão disponíveis para produtores e afiliados.</div>' +
      '<div class="hd-sep"></div>' +
      '<div class="help-actions">' + back +
      '<button class="ui-btn ui-btn-primary" id="tit-asis-cta" disabled onclick="titAsisGo(\'motispec\')">Iniciar solicitação ' + IC_AR + '</button>' +
      '</div></div>';
  } else if (step === 'motispec') {
    var isPfPj = state.titScenario === 'pf-pj';
    var especVal = isPfPj ? 'Alterar CPF para CNPJ' : 'Alterar CNPJ para novo CNPJ';
    var docsHtml = isPfPj
      ? '<ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.9;">' +
        '<li><b>Documento de Identificação do titular atual</b>: RG com CPF ou CNH (frente e verso)</li>' +
        '<li><b>Selfie do titular da conta</b>: rosto visível e centralizado, boa iluminação, sem filtros</li>' +
        '<li><b>Documento constitutivo do novo CNPJ</b>: Contrato Social ou CCMEI autenticado pela Junta Comercial ou Cartório</li>' +
        '<li><b>Selfie dos sócios</b>: cada sócio envolvido deve enviar selfie nas mesmas condições</li>' +
        '<li><b>Documento de Identificação dos Sócios</b>: RG com CPF ou CNH (frente e verso) de todos os sócios</li>' +
        '</ul><div style="margin-top:8px;font-size:12px;color:var(--gray-400);">Atenção: o Cartão CNPJ não é válido.</div>'
      : '<ul style="margin:0;padding-left:16px;font-size:12.5px;line-height:1.9;">' +
        '<li><b>Documento constitutivo</b>: Contrato Social ou CCMEI do CNPJ atual <b>e</b> do novo, autenticado pela Junta Comercial ou Cartório</li>' +
        '<li><b>Documento de Identificação dos sócios</b>: RG ou CNH (aberta) de todos os sócios do CNPJ</li>' +
        '<li><b>Selfie recente dos sócios</b>: rosto visível e centralizado, boa iluminação, sem óculos escuros</li>' +
        '</ul><div style="margin-top:8px;font-size:12px;color:var(--gray-400);">Atenção: o Cartão CNPJ não é válido.</div>';
    h = '<div class="help-card">' +
      '<div class="etapa-label" style="display:flex;align-items:center;gap:5px;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;opacity:.55;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
        'Central de Ajuda · portal externo' +
      '</div>' +
      '<div class="help-h1">Como podemos ajudar?</div>' +
      vstep(0) +
      '<div class="fld">' +
        '<label>Selecione o motivo do contato *</label>' +
        '<div class="sel-box filled" style="pointer-events:none;">Acesso e configurações da conta' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>' +
      '</div>' +
      '<div class="fld">' +
        '<label>Informe a especificação *</label>' +
        '<div class="sel-box filled" style="pointer-events:none;">' + especVal +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>' +
      '</div>' +
      '<div style="margin:14px 0 4px;padding:14px 16px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:10px;">' +
        '<div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">Documentos necessários para esta solicitação</div>' +
        docsHtml +
        '<div style="margin-top:10px;font-size:12px;color:var(--gray-400);">Certifique-se de que todas as imagens estejam com boa qualidade. <span style="color:var(--black);font-weight:500;cursor:pointer;">Saiba mais</span></div>' +
      '</div>' +
      '<div class="help-actions"><button class="btn-voltar" onclick="titAsisGo(\'persona\')">' + ICON.arrowL + ' Voltar</button>' +
      '<button class="ui-btn ui-btn-primary" onclick="titAsisGo(\'dados\')">Avançar ' + IC_AR + '</button></div>' +
      '<div style="margin-top:14px;text-align:center;font-size:12px;color:var(--gray-400);">Ou veja como seria na proposta: <span style="color:var(--black);font-weight:600;cursor:pointer;text-decoration:underline;" onclick="titAsisGo(\'proposta-embedded\')">formulário integrado à Hotmart →</span></div>' +
      '</div>';
  } else if (step === 'proposta-embedded') {
    var isPfPj2 = state.titScenario === 'pf-pj';
    var especValP = isPfPj2 ? 'Alterar CPF para CNPJ' : 'Alterar CNPJ para novo CNPJ';
    h = '<div class="help-card">' +
      '<div class="etapa-label"><span class="novo-badge">Proposta</span> Formulário integrado na plataforma</div>' +
      '<div style="border:1.5px solid var(--gray-200);border-radius:12px;overflow:hidden;margin:14px 0;">' +
        '<div style="background:#F05A28;padding:8px 16px;display:flex;align-items:center;gap:8px;">' +
          '<div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:.01em;">hotmart</div>' +
          '<div style="margin-left:auto;font-size:11.5px;color:rgba(255,255,255,.8);">Thiago Pereira · thiago.oliveira@email.com</div>' +
        '</div>' +
        '<div style="padding:18px 16px;">' +
          '<div style="font-size:13px;font-weight:600;color:var(--gray-500);margin-bottom:14px;">Abrir solicitação de suporte</div>' +
          '<div class="fld">' +
            '<label>Motivo do contato</label>' +
            '<div class="sel-box filled" style="pointer-events:none;">Acesso e configurações da conta<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>' +
          '</div>' +
          '<div class="fld">' +
            '<label>Especificação</label>' +
            '<div class="sel-box filled" style="pointer-events:none;">' + especValP + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg></div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;">' +
            '<div class="fld" style="flex:1;"><label>Nome <span style="font-size:11px;color:var(--gray-400);font-weight:400;">(pré-preenchido)</span></label><div class="field-box" style="background:var(--gray-100);"><span style="font-size:14px;color:var(--gray-400);">Thiago Pereira</span></div></div>' +
            '<div class="fld" style="flex:1;"><label>E-mail <span style="font-size:11px;color:var(--gray-400);font-weight:400;">(pré-preenchido)</span></label><div class="field-box" style="background:var(--gray-100);"><span style="font-size:13px;color:var(--gray-400);">thiago.oliveira@email.com</span></div></div>' +
          '</div>' +
          '<div class="fld"><label>Descreva sua solicitação *</label><textarea style="resize:vertical;min-height:50px;font-size:13px;"></textarea></div>' +
          '<div style="text-align:right;margin-top:4px;"><button class="ui-btn ui-btn-primary" onclick="titAsisGo(\'enviado\')">Enviar ' + IC_AR + '</button></div>' +
        '</div>' +
      '</div>' +
      '<div style="padding:10px 12px;background:#E6F5EE;border:1px solid #A8D8BF;border-radius:8px;font-size:12.5px;color:#128A4B;display:flex;gap:8px;align-items:flex-start;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#128A4B" stroke-width="1.8" style="width:14px;height:14px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>' +
        '<span>Na proposta, o formulário é exibido diretamente na Hotmart — o usuário já está identificado. Nome, e-mail e especificação são pré-preenchidos automaticamente, eliminando erros e agilizando a abertura do chamado.</span>' +
      '</div>' +
      '<div class="help-actions"><button class="btn-voltar" onclick="titAsisGo(\'motispec\')">' + ICON.arrowL + ' Voltar</button>' +
      '<button class="ui-btn ui-btn-primary" onclick="titAsisGo(\'enviado\')">Simular envio ' + IC_AR + '</button></div>' +
      '</div>';
  } else if (step === 'dados') {
    var isPfPj3 = state.titScenario === 'pf-pj';
    var desc = isPfPj3
      ? 'Quero alterar minha conta de Pessoa Física para o CNPJ da minha empresa.'
      : 'Quero trocar o CNPJ da minha conta para um novo CNPJ.';
    var sideSteps = isPfPj3
      ? ['Detalhe da solicitação', 'Dados do atendimento', 'Dados do CNPJ']
      : ['Detalhe da solicitação', 'Dados do atendimento', 'Dados do CNPJ atual', 'Dados do novo CNPJ'];
    var sideHtml = '';
    sideSteps.forEach(function(s, i) {
      sideHtml += '<div class="asis-side-step' + (i === 0 ? ' done' : i === 1 ? ' active' : '') + '"><span class="asis-side-dot"></span>' + s + '</div>';
    });
    h = '<div class="help-card help-card-cols">' +
      '<div class="asis-sidebar">' + sideHtml + '</div>' +
      '<div class="asis-main">' +
      '<div class="etapa-label" style="display:flex;align-items:center;gap:5px;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;opacity:.55;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
        'Central de Ajuda · portal externo' +
      '</div>' +
      '<div class="help-h1" style="font-size:17px;margin-bottom:14px;">Informe os seus dados para fazer a solicitação</div>' +
      '<div class="fld"><label>Nome *</label><input value="Thiago Pereira"></div>' +
      '<div class="fld"><label>E-mail da conta Hotmart que deseja alterar os dados *</label><input value="thiago.oliveira@email.com"></div>' +
      '<div class="fld"><label>Descreva o motivo da atualização cadastral *</label><textarea style="resize:vertical;min-height:60px;font-size:13px;">' + desc + '</textarea></div>' +
      '<div class="fld"><label>Informe o seu país atual *</label><input value="Brasil"></div>' +
      '<div class="fld"><label>Selecione o idioma *</label>' +
        '<div class="pill-row" style="flex-wrap:wrap;gap:6px;"><div class="pill-opt sel">Português Brasileiro</div><div class="pill-opt">Espanhol</div><div class="pill-opt">Inglês</div><div class="pill-opt">Francês</div><div class="pill-opt">Italiano</div></div>' +
      '</div>' +
      '<div class="help-actions" style="padding-top:10px;"><button class="btn-voltar" onclick="titAsisGo(\'motispec\')">' + ICON.arrowL + ' Voltar</button>' +
      '<button class="ui-btn ui-btn-primary" onclick="titAsisGo(\'enviado\')">Avançar ' + IC_AR + '</button></div>' +
      '<div style="text-align:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--gray-200);"><span style="font-size:17px;font-weight:800;color:var(--gray-300);letter-spacing:-.01em;">hotmart</span></div>' +
      '</div></div>';
  } else if (step === 'enviado') {
    var proto = state.titScenario === 'pf-pj' ? '#482310' : '#482341';
    h = '<div class="help-card" style="text-align:center;">' +
      '<div class="rico wait" style="width:70px;height:70px;margin:6px auto 16px;background:var(--amber-bg,#FFFBEA);border-radius:50%;display:flex;align-items:center;justify-content:center;">' + ICON.clock + '</div>' +
      '<div class="help-h1">Solicitação enviada</div>' +
      '<p class="help-lead">Protocolo <b>' + proto + '</b>. Você receberá o retorno por e-mail. O prazo pode levar alguns dias úteis.</p>' +
      '<button class="ui-btn ui-btn-primary" onclick="titAsisStartLoop()">Ver andamento do atendimento ' + IC_AR + '</button></div>';
  } else if (step === 'loop') {
    var proto2 = state.titScenario === 'pf-pj' ? '#482310' : '#482341';
    h = '<div class="help-card"><div class="etapa-label">Ticket ' + proto2 + ' · Alteração de titularidade</div>' +
      '<div class="thread" id="tit-asis-thread"></div>' +
      '<div class="help-actions" id="tit-asis-loop-actions" style="justify-content:flex-end;"></div></div>';
  } else if (step === 'resolvido') {
    var ds = TIT_ASIS_SETS[state.titAsisSet].desf;
    h = '<div class="help-card" style="text-align:center;">' +
      '<div class="rico ok" style="width:70px;height:70px;margin:6px auto 16px;background:var(--green-bg,#E6F5EE);color:#128A4B;border-radius:50%;display:flex;align-items:center;justify-content:center;">' + ICON.check + '</div>' +
      '<div class="help-h1">' + ds.title + '</div>' +
      '<p class="help-lead">Concluído após <b>' + ds.dias + '</b> e <b>' + ds.inter + '</b> com o atendimento.</p>' +
      '<div class="cost-box"><b>Custo operacional deste caso:</b> ' + ds.cost + '</div>' +
      '<div style="margin-top:22px;display:flex;gap:12px;justify-content:center;">' +
      '<button class="ui-btn ui-btn-outline" onclick="showView(\'v-tit-conta\')">' + ICON.arrowL + ' Minha Conta</button>' +
      '<button class="ui-btn ui-btn-primary" onclick="setTitMode(\'proposta\');showView(\'v-tit-conta\');">Comparar com a proposta ' + IC_AR + '</button>' +
      '</div></div>';
  }

  el.innerHTML = h;
  setAnno('tit-asis-' + step);
  if (step === 'loop') titAsisRenderThread();
}

function titAsisPersona(el) {
  document.querySelectorAll('#tit-asis-inner .pill-opt').forEach(function(x) { x.classList.remove('sel'); });
  el.classList.add('sel');
  document.getElementById('tit-asis-cta').disabled = false;
}

var titMotiCount = 0;
function titPickMotiSpec(field, val) {
  var id = field === 'motivo' ? 'tit-sd-motivo' : 'tit-sd-espec';
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  var box = el.querySelector('.sel-box');
  box.classList.add('filled');
  box.innerHTML = val + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M6 9l6 6 6-6"/></svg>';
  titMotiCount++;
  if (titMotiCount >= 2) {
    var btn = document.getElementById('tit-asis-cta2');
    if (btn) btn.disabled = false;
  }
}

var TIT_ASIS_SETS = {
  tit_pf_pj: {
    msgs: [
      {t:'sys', text:'Solicitação #482310 aberta · Motivo: Alteração de documentos e titularidade'},
      {t:'agent', who:'Ana · Suporte N1', text:'Olá! Para alterar a natureza da conta de Pessoa Física para Pessoa Jurídica, precisamos: RG ou CNH (frente e verso), selfie segurando o documento, Contrato Social ou CCMEI com o seu nome no quadro societário, e o cartão CNPJ.'},
      {t:'me', text:'Entendido. Enviei todos os documentos.'},
      {t:'day', text:'1 dia depois'},
      {t:'reprovado', who:'Ana · Suporte N1', text:'A selfie está com pouca iluminação e o rosto não ficou nítido. Poderia reenviar seguindo as orientações: boa iluminação, sem óculos escuros, rosto centralizado?'},
      {t:'me', text:'Reenviei a selfie.'},
      {t:'day', text:'1 dia depois'},
      {t:'reprovado', who:'Ana · Suporte N1', text:'O Contrato Social enviado está em formato de imagem (print de tela) e as assinaturas não estão legíveis. Precisamos do documento original em PDF, com todas as páginas e assinaturas reconhecidas.'},
      {t:'me', text:'Enviei o Contrato Social em PDF.'},
      {t:'sys', text:'Atendimento encaminhado para o time N2 para validação da titularidade.'},
      {t:'day', text:'2 dias depois'},
      {t:'agent', who:'Suporte N2', text:'Documentos validados. Seu CPF consta no quadro societário. A natureza da conta foi alterada para Pessoa Jurídica (CNPJ 12.345.678/0001-99).'}
    ],
    desf: {
      title: 'Conta migrada para PJ',
      dias: '4 dias',
      inter: '9 interações',
      cost: 'N1 reprovou duas vezes (selfie com baixa iluminação, Contrato Social em print ao invés de PDF) e escalou para N2. Todo o processo validou uma informação — CPF no quadro societário — que o SERPRO retorna em segundos via API.'
    }
  },
  tit_pj_pj: {
    msgs: [
      {t:'sys', text:'Solicitação #482341 aberta · Motivo: Troca de titularidade (PJ → PJ)'},
      {t:'agent', who:'Bruno · Suporte N1', text:'Olá! Para alterar o CNPJ da conta, precisamos: RG ou CNH do responsável, selfie, Contrato Social da empresa atual assinado por todos os sócios, e Contrato Social da nova empresa.'},
      {t:'me', text:'Enviei os documentos da empresa atual.'},
      {t:'day', text:'1 dia depois'},
      {t:'reprovado', who:'Bruno · Suporte N1', text:'Faltam os documentos da nova empresa e o aceite formal dos demais sócios da empresa atual (precisa ser por e-mail cadastrado na Hotmart). Poderia providenciar?'},
      {t:'me', text:'A nova empresa é ME — enviei o Contrato Social. Estou solicitando o aceite à minha sócia.'},
      {t:'day', text:'2 dias depois'},
      {t:'agent', who:'Bruno · Suporte N1', text:'Recebemos o Contrato Social. Aguardamos o aceite da outra sócia pelo e-mail cadastrado dela na Hotmart.'},
      {t:'me', text:'Minha sócia enviou o aceite por e-mail.'},
      {t:'sys', text:'Atendimento encaminhado para o time N2.'},
      {t:'day', text:'3 dias depois'},
      {t:'agent', who:'Carlos · Suporte N2', text:'Olá, sou o Carlos, vou continuar o atendimento. Poderia reenviar o Contrato Social da nova empresa e a confirmação da sócia? Não consigo localizar os arquivos anteriores.'},
      {t:'me', text:'Reenviei os documentos novamente.'},
      {t:'day', text:'3 dias depois'},
      {t:'agent', who:'Suporte N2', text:'Titularidade validada. A conta foi migrada para o novo CNPJ 98.765.432/0001-11. Saldo e produtos mantidos.'}
    ],
    desf: {
      title: 'CNPJ alterado com sucesso',
      dias: '9 dias',
      inter: '13 interações',
      cost: 'o caso mais complexo: documentos de duas empresas, aceite de todos os sócios de ambas, troca de atendente com perda total de contexto e reenvio de tudo. Um processo de 9 dias que, na proposta, seria reduzido com biometria + SERPRO eliminando o envio de documentos físicos.'
    }
  }
};

function titAsisStartLoop() {
  state.titAsisMsg = 0;
  state.titAsisArr = TIT_ASIS_SETS[state.titAsisSet].msgs;
  titAsisGo('loop');
}

function titAsisRenderThread() {
  var th = document.getElementById('tit-asis-thread');
  var act = document.getElementById('tit-asis-loop-actions');
  var arr = state.titAsisArr;
  var n = state.titAsisMsg || 0;
  var h = '';
  for (var i = 0; i <= n && i < arr.length; i++) {
    var m = arr[i];
    if (m.t === 'day') { h += '<div class="day-chip">' + m.text + '</div>'; }
    else if (m.t === 'sys') { h += '<div class="msg sys">' + m.text + '</div>'; }
    else { h += '<div class="msg ' + (m.t === 'me' ? 'me' : (m.t === 'reprovado' ? 'reprovado' : 'agent')) + '">' + (m.who ? '<div class="who">' + m.who + '</div>' : '') + m.text + '</div>'; }
  }
  th.innerHTML = h;
  th.scrollTop = th.scrollHeight;
  if (n < arr.length - 1) {
    act.innerHTML = '<button class="ui-btn ui-btn-primary" onclick="titAsisNextMsg()">Avançar no atendimento ' + IC_AR + '</button>';
  } else {
    act.innerHTML = '<button class="ui-btn ui-btn-primary" onclick="titAsisGo(\'resolvido\')">Ver desfecho ' + IC_AR + '</button>';
  }
}

function titAsisNextMsg() {
  state.titAsisMsg = (state.titAsisMsg || 0) + 1;
  titAsisRenderThread();
}

/* ══ Proposta wizard ══ */

var TIT_STEPS_PF_PJ = ['Biometria', 'Consulta CNPJ', 'Confirmação'];
var TIT_STEPS_PJ_PJ = ['Biometria', 'Nova empresa', 'Confirmação'];

function startTitChange() {
  state.titFacetecNext = false;
  state.titWizStep = null;
  showView('v-tit-wizard');
  titWizGo('biometria');
}

function titWizGo(step) {
  state.titWizStep = step;
  var steps = state.titScenario === 'pf-pj' ? TIT_STEPS_PF_PJ : TIT_STEPS_PJ_PJ;
  var stepIdx = {biometria:0, cnpj:1, confirmar:2}[step] || 0;
  var stepsHtml = '';
  steps.forEach(function(s, idx) {
    var cls = idx < stepIdx ? 'done' : (idx === stepIdx ? 'active' : '');
    var mark = idx < stepIdx
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:13px;height:13px;"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
      : (idx + 1);
    stepsHtml += '<div class="wz-step ' + cls + '">' + (idx > 0 ? '<div class="wz-line"></div>' : '') + '<div class="dot">' + mark + '</div><div class="lbl">' + s + '</div></div>';
  });
  document.getElementById('tit-wz-steps').innerHTML = stepsHtml;

  var panel = document.getElementById('tit-wz-panel');
  var actions = document.getElementById('tit-wz-actions');

  if (step === 'biometria') {
    panel.innerHTML = '<h2>Vamos confirmar que é você</h2>' +
      '<p class="desc">Para alterar a natureza do negócio, precisamos confirmar sua identidade com <b>biometria facial com prova de vida</b> — o mesmo motor já usado no KYC da conta.</p>' +
      '<div class="info-row"><b>Conta:</b> Thiago Pereira · ' + (state.titScenario === 'pf-pj' ? 'Pessoa Física' : 'Pessoa Jurídica · CNPJ 12.345.678/0001-99') + '</div>';
    actions.innerHTML = '<span class="back-link" onclick="showView(\'v-tit-conta\')">' + ICON.arrowL + ' Cancelar</span>' +
      '<button class="ui-btn ui-btn-primary" onclick="titOpenFacetec()">' + ICON.face + ' Iniciar biometria</button>';
    setAnno('tit-biometria');
  } else if (step === 'cnpj') {
    var isPfPj = state.titScenario === 'pf-pj';
    var cnpjVal = isPfPj ? '12.345.678/0001-99' : '98.765.432/0001-11';
    var title = isPfPj ? 'Informe o CNPJ da empresa' : 'Informe o CNPJ da nova empresa';
    var desc2 = isPfPj
      ? 'O sistema consulta automaticamente a Receita Federal via SERPRO e verifica se o seu CPF consta no quadro societário (QSA).'
      : 'O sistema consulta a Receita Federal e pré-preenche os dados da nova empresa. Você confirma, sem precisar enviar documentos.';
    panel.innerHTML = '<h2>' + title + '</h2>' +
      '<p class="desc">' + desc2 + '</p>' +
      '<div class="field-label">CNPJ</div>' +
      '<div class="field-box"><input id="tit-cnpj-input" style="border:none;outline:none;width:100%;font-size:14px;background:transparent;font-family:monospace;" value="' + cnpjVal + '"></div>' +
      '<div style="margin-top:12px;font-size:12px;color:var(--gray-400);display:flex;align-items:center;gap:6px;">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;flex-shrink:0;"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>' +
      ' Consulta segura à Receita Federal via API (SERPRO). <span class="novo-badge">Novo</span></div>';
    actions.innerHTML = '<span class="back-link" onclick="titWizGo(\'biometria\')">' + ICON.arrowL + ' Voltar</span>' +
      '<button class="ui-btn ui-btn-primary" id="tit-cnpj-btn" onclick="titSerproSearch()">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:15px;height:15px;"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>' +
      ' Consultar CNPJ</button>';
    setAnno('tit-cnpj');
  } else if (step === 'confirmar') {
    var isPfPj2 = state.titScenario === 'pf-pj';
    if (isPfPj2) {
      panel.innerHTML = '<h2>Confirme os dados da empresa</h2>' +
        '<p class="desc">Dados obtidos via SERPRO. Seu CPF consta no quadro societário — nenhum documento adicional é necessário.</p>' +
        '<div class="serpro-card">' +
          '<div class="serpro-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:13px;height:13px;"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg> Receita Federal · SERPRO</div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Razão Social</span><span class="serpro-val">Thiago Pereira Consultoria ME</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">CNPJ</span><span class="serpro-val" style="font-family:monospace;">12.345.678/0001-99</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Natureza Jurídica</span><span class="serpro-val">Microempresa (ME)</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Situação</span><span class="serpro-val"><span class="status-ativa">● ATIVA</span></span></div>' +
          '<div class="serpro-row serpro-qsa"><span class="serpro-lbl">Quadro Societário</span><span class="serpro-val"><div class="qsa-item" style="justify-content:space-between;"><span><b>Thiago Pereira</b> · CPF 115.***.**6-94 · Sócio-Gerente</span><svg viewBox="0 0 24 24" fill="none" stroke="#128A4B" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0;"><path d="M20 6L9 17l-5-5"/></svg></div></span></div>' +
        '</div>' +
        '<div style="margin-top:10px;display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:#E6F5EE;border:1px solid #A8D8BF;border-radius:8px;font-size:13px;color:#128A4B;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#128A4B" stroke-width="1.8" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>' +
          '<span>CPF encontrado no quadro societário. A alteração pode ser concluída agora, sem envio de documentos.</span>' +
        '</div>' +
        '<div style="margin-top:10px;text-align:right;">' +
          '<button class="ui-btn ui-btn-ghost" style="font-size:12.5px;padding:6px 12px;" onclick="titShowDocUpload()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>' +
          ' Alterar informações</button>' +
        '</div>';
      actions.innerHTML = '<span class="back-link" onclick="titWizGo(\'cnpj\')">' + ICON.arrowL + ' Voltar</span>' +
        '<button class="ui-btn ui-btn-primary" onclick="titShowTwoFA()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M20 6L9 17l-5-5"/></svg>' +
        ' Confirmar alteração</button>';
    } else {
      panel.innerHTML = '<h2>Confirme os dados da nova empresa</h2>' +
        '<p class="desc">Ao confirmar, notificações serão enviadas a cada sócio da nova empresa para que validem sua identidade em suas próprias contas Hotmart. A alteração só será efetivada após todas as validações.</p>' +
        '<div class="serpro-card">' +
          '<div class="serpro-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:13px;height:13px;"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg> Receita Federal · SERPRO</div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Razão Social</span><span class="serpro-val">Nova Empresa Digital Ltda</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">CNPJ</span><span class="serpro-val" style="font-family:monospace;">98.765.432/0001-11</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Natureza Jurídica</span><span class="serpro-val">Sociedade Limitada</span></div>' +
          '<div class="serpro-row"><span class="serpro-lbl">Situação</span><span class="serpro-val"><span class="status-ativa">● ATIVA</span></span></div>' +
          '<div class="serpro-row serpro-qsa"><span class="serpro-lbl">Quadro Societário</span><span class="serpro-val">' +
            '<div class="qsa-item" style="justify-content:space-between;"><span><b>Thiago Pereira</b> · CPF 115.***.**6-94 · Sócio</span><svg viewBox="0 0 24 24" fill="none" stroke="#128A4B" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0;"><path d="M20 6L9 17l-5-5"/></svg></div>' +
            '<div class="qsa-item" style="justify-content:space-between;margin-top:6px;"><span><b>Maria Santos</b> · CPF 042.***.**3-17 · Sócia <span style="color:var(--gray-500);">— aceite pendente</span></span><svg viewBox="0 0 24 24" fill="none" stroke="#B4740A" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16v.4"/></svg></div>' +
          '</span></div>' +
        '</div>' +
        '<div style="margin-top:8px;text-align:right;">' +
          '<button class="ui-btn ui-btn-ghost" style="font-size:12.5px;padding:6px 12px;" onclick="titShowDocUpload()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>' +
          ' Alterar informações</button>' +
        '</div>' +
        '<div style="margin-top:14px;">' +
          '<div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Notificação da sócia</div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:#C7D0FF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#33409E;flex-shrink:0;">MS</div>' +
            '<div style="font-size:13.5px;font-weight:600;">Maria Santos <span style="font-size:12px;font-weight:400;color:var(--gray-500);">· Sócia · CPF 042.***.**3-17</span></div>' +
          '</div>' +
          '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--gray-500);margin-bottom:10px;cursor:pointer;">' +
            '<input type="checkbox" id="tit-no-acc-cb" onchange="titSociaToggle(this)"> Não possui conta Hotmart' +
          '</label>' +
          '<div id="tit-has-account">' +
            '<div class="field-label">E-mail Hotmart de Maria Santos</div>' +
            '<div class="field-box"><input style="border:none;outline:none;width:100%;font-size:14px;background:transparent;" placeholder="maria@exemplo.com" value="maria.santos@empresa.com.br"></div>' +
            '<div style="margin-top:6px;font-size:12px;color:var(--gray-400);">Ela receberá um e-mail com link para confirmar sua identidade em sua própria conta Hotmart.</div>' +
          '</div>' +
          '<div id="tit-no-account" style="display:none;">' +
            '<div class="field-label">E-mail para envio do convite</div>' +
            '<div class="field-box"><input style="border:none;outline:none;width:100%;font-size:14px;background:transparent;" placeholder="email@externo.com"></div>' +
            '<div style="margin-top:10px;padding:10px 12px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;">' +
              '<div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">O que ela precisará fazer</div>' +
              '<ul style="margin:0;padding-left:16px;font-size:12.5px;color:var(--gray-500);line-height:1.8;">' +
                '<li>Criar uma conta Hotmart</li>' +
                '<li>Enviar RG ou CNH (documento de identidade)</li>' +
                '<li>Realizar biometria facial com prova de vida</li>' +
                '<li>Confirmar com código 2FA</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';
      actions.innerHTML = '<span class="back-link" onclick="titWizGo(\'cnpj\')">' + ICON.arrowL + ' Voltar</span>' +
        '<button class="ui-btn ui-btn-primary" onclick="titShowTwoFA()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:15px;height:15px;"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>' +
        ' Continuar</button>';
    }
    setAnno('tit-confirmar');
  }
}

function titOpenFacetec() {
  state.titFacetecNext = true;
  document.getElementById('ft-overlay').classList.add('show');
  document.getElementById('ft-oval').classList.remove('scanning');
  var btn = document.getElementById('ft-btn');
  btn.disabled = false;
  btn.innerHTML = ICON.face + ' Iniciar captura';
  setAnno('tit-biometria');
}

function titShowTwoFA() {
  var panel = document.getElementById('tit-wz-panel');
  var actions = document.getElementById('tit-wz-actions');
  panel.innerHTML =
    '<h2>Verificação de segurança</h2>' +
    '<p class="desc">Para concluir a solicitação, enviaremos um código de 6 dígitos ao canal que você escolher.</p>' +
    '<div class="choice-row" style="margin-top:6px;">' +
      '<div class="choice selected" data-ch="email" onclick="titChSelect(this)"><div class="choice-head"><h4>E-mail cadastrado</h4><span class="rec">Recomendado</span></div><p>t***@email.com</p></div>' +
      '<div class="choice" data-ch="sms" onclick="titChSelect(this)"><div class="choice-head"><h4>SMS</h4></div><p>(11) 9****-8901</p></div>' +
    '</div>';
  actions.innerHTML =
    '<span class="back-link" onclick="titWizGo(\'confirmar\')">' + ICON.arrowL + ' Voltar</span>' +
    '<button class="ui-btn ui-btn-primary" onclick="openOtp(\'tit-2fa\')">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>' +
    ' Enviar código</button>';
}

function titChSelect(el) {
  var row = el.closest('.choice-row');
  if (!row) return;
  row.querySelectorAll('.choice').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
}

function titShowDocUpload() {
  var panel = document.getElementById('tit-wz-panel');
  var actions = document.getElementById('tit-wz-actions');
  panel.innerHTML =
    '<h2>Alterar informações da empresa</h2>' +
    '<p class="desc">Como as informações diferem do que consta na Receita Federal, envie os documentos comprobatórios para análise pelo time de atendimento.</p>' +
    '<div style="margin-bottom:14px;">' +
      '<div class="field-label">Documento da alteração</div>' +
      '<div style="border:1.5px dashed var(--gray-300);border-radius:10px;padding:20px;text-align:center;cursor:pointer;background:var(--gray-100);" onclick="showToast(\'Arquivo selecionado\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;margin:0 auto 8px;display:block;color:var(--gray-400);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
        '<div style="font-size:13px;color:var(--gray-500);">Clique para selecionar</div>' +
        '<div style="font-size:11.5px;color:var(--gray-400);margin-top:4px;">Contrato Social, Requerimento de Empresário ou equivalente · PDF, JPG, PNG</div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:10px 12px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:12.5px;color:#78350F;display:flex;gap:8px;align-items:flex-start;">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="1.8" style="width:15px;height:15px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16v.4" stroke-linecap="round"/></svg>' +
      '<span>A análise manual pelo time de atendimento pode levar até <b>3 dias úteis</b>. Você receberá uma notificação quando concluída.</span>' +
    '</div>';
  actions.innerHTML =
    '<span class="back-link" onclick="titWizGo(\'confirmar\')">' + ICON.arrowL + ' Voltar</span>' +
    '<button class="ui-btn ui-btn-primary" onclick="titGoDocResult()">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>' +
    ' Enviar para análise</button>';
}

function titGoDocResult() {
  showLoading();
  setTimeout(function() {
    hideLoading();
    var el = document.getElementById('tit-result-inner');
    el.innerHTML =
      '<div class="rico wait"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16v.4" stroke-linecap="round"/></svg></div>' +
      '<h2>Documentos enviados para análise</h2>' +
      '<p>Nossa equipe irá verificar os documentos e validar as alterações informadas. Você receberá um e-mail assim que a análise for concluída.</p>' +
      '<div style="margin:14px 0;padding:12px 14px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:10px;font-size:13px;">' +
        '<div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">O que acontece a seguir</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;flex-shrink:0;margin-top:2px;color:var(--gray-400);"><circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 16v.4" stroke-linecap="round"/></svg><span>Documentos em análise pelo time de atendimento</span></div>' +
          '<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;flex-shrink:0;margin-top:2px;color:var(--gray-400);"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg><span>Notificação por e-mail ao concluir (até 3 dias úteis)</span></div>' +
          '<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;flex-shrink:0;margin-top:2px;color:var(--gray-400);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Janela de segurança de 24–72h após aprovação</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:26px;"><button class="ui-btn ui-btn-outline" onclick="goTo(\'scr-hub\')">' + ICON.arrowL + ' Voltar aos cenários</button></div>';
    showView('v-tit-result');
    setAnno('tit-result-' + state.titScenario);
  }, 900);
}

function titSociaToggle(cb) {
  var noAcc = document.getElementById('tit-no-account');
  var hasAcc = document.getElementById('tit-has-account');
  if (!noAcc || !hasAcc) return;
  if (cb.checked) { hasAcc.style.display = 'none'; noAcc.style.display = 'block'; }
  else { hasAcc.style.display = 'block'; noAcc.style.display = 'none'; }
}

function titSerproSearch() {
  var btn = document.getElementById('tit-cnpj-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" style="width:15px;height:15px;animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="9" stroke-dasharray="40" stroke-dashoffset="10"/></svg> Consultando SERPRO…'; }
  showLoading();
  setTimeout(function() {
    hideLoading();
    if (btn) { btn.disabled = false; btn.innerHTML = 'Consultar CNPJ'; }
    showToast('Dados obtidos via SERPRO');
    titWizGo('confirmar');
  }, 1600);
}

function titGoResult() {
  showLoading();
  setTimeout(function() {
    hideLoading();
    var el = document.getElementById('tit-result-inner');
    var h = '';
    if (state.titScenario === 'pf-pj') {
      h = '<div class="rico ok">' + ICON.check + '</div>' +
        '<h2>Conta migrada para Pessoa Jurídica</h2>' +
        '<p>Biometria validou sua identidade. O SERPRO confirmou que seu CPF consta no quadro societário. Alteração concluída sem necessidade de atendimento.</p>' +
        '<div style="margin:14px 0;padding:12px 14px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:10px;font-size:13.5px;">' +
        '<div style="font-size:11px;color:var(--gray-400);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Agora você é</div>' +
        '<div style="font-weight:600;">Thiago Pereira Consultoria ME</div>' +
        '<div style="font-family:monospace;color:var(--gray-500);margin-top:2px;">CNPJ 12.345.678/0001-99</div>' +
        '</div>' +
        '<div style="margin-top:10px;"><span class="novo-badge">Novo</span> <span style="font-size:12.5px;color:var(--gray-500);">resolução em minutos, sem abrir chamado — SERPRO + biometria substituem análise manual.</span></div>';
    } else {
      h = '<h2>Aguardando validação dos sócios</h2>' +
        '<p style="font-size:13.5px;color:var(--gray-500);margin-bottom:18px;">Notificações enviadas. Cada sócio deve confirmar sua identidade em sua própria conta Hotmart. A alteração só será efetivada após todas as validações.</p>' +
        '<div class="socios-tracker">' +
          '<div class="socios-tracker-title">Status das validações</div>' +
          '<div class="st-item confirmed">' +
            '<div class="st-avatar">TP</div>' +
            '<div class="st-info">' +
              '<div class="st-name">Thiago Pereira <span class="st-you">(você)</span></div>' +
              '<div class="st-status confirmed">Biometria + 2FA confirmados</div>' +
            '</div>' +
            '<svg class="st-check" viewBox="0 0 24 24" fill="none" stroke="#128A4B" stroke-width="2.5" style="width:18px;height:18px;flex-shrink:0;"><circle cx="12" cy="12" r="9" fill="#E6F5EE" stroke="#128A4B"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>' +
          '</div>' +
          '<div class="st-item pending">' +
            '<div class="st-avatar pending">MS</div>' +
            '<div class="st-info">' +
              '<div class="st-name">Maria Santos</div>' +
              '<div class="st-status pending">E-mail enviado · aguardando validação</div>' +
              '<div class="st-note">Não possui conta Hotmart — receberá link para criar conta e validar identidade (biometria + documento + 2FA)</div>' +
            '</div>' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#B4740A" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;"><circle cx="12" cy="12" r="9" fill="#FEF3C7" stroke="#D97706"/><path d="M12 7v5.5M12 16.5v.01" stroke-linecap="round"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="carencia-timeline">' +
          '<div class="carencia-title">O que acontece a seguir</div>' +
          '<div class="ct-step done"><div class="ct-dot done"></div><div class="ct-body"><b>Você confirmou</b> — biometria + 2FA validados</div></div>' +
          '<div class="ct-step pending"><div class="ct-dot pending"></div><div class="ct-body"><b>Maria Santos valida</b> — biometria + documento + 2FA na conta dela</div></div>' +
          '<div class="ct-step future"><div class="ct-dot future"></div><div class="ct-body" style="flex:1;">' +
            '<div class="sec-window" style="margin:0 0 6px;">' +
              '<b>Janela de segurança (24–72h)</b><br>Enviamos um aviso aos canais de contato cadastrados. Se não foi você, é possível contestar e reverter a alteração neste período. Saques ficam bloqueados temporariamente por segurança.' +
            '</div>' +
            '<span class="notfixed" onclick="showToast(\'Contestação registrada, alteração revertida.\')">' + ICON.warn + ' Não fui eu, contestar alteração</span>' +
          '</div></div>' +
          '<div class="ct-step future"><div class="ct-dot future"></div><div class="ct-body"><b>Alteração efetivada</b> — conta migrada para o novo CNPJ</div></div>' +
        '</div>' +
        '<div style="margin-top:14px;padding:10px 13px;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:8px;font-size:12.5px;color:var(--gray-500);">CX será acionado apenas se houver problema na validação de algum sócio. Sócios sem conta Hotmart recebem link de cadastro simplificado no e-mail.</div>' +
        '<div style="margin-top:10px;"><span class="novo-badge">Novo</span> <span style="font-size:12.5px;color:var(--gray-500);">sem documentos físicos. Prazo: ~1–2 dias após aceite dos sócios, contra os 9 dias do processo atual.</span></div>';
    }
    h += '<div style="margin-top:26px;"><button class="ui-btn ui-btn-outline" onclick="goTo(\'scr-hub\')">' + ICON.arrowL + ' Voltar aos cenários</button></div>';
    el.innerHTML = h;
    showView('v-tit-result');
    setAnno('tit-result-' + state.titScenario);
  }, 800);
}

/* Anotações — titularidade */
ANNO['tit-conta-hoje'] = { title:'Minha Conta · Titularidade', step:'Como é hoje', secs:[
  S('O que o usuário encontra','do',['O campo "Natureza do negócio" está bloqueado. Alterar a natureza da conta — de PF para PJ, ou de um CNPJ para outro — só é possível abrindo um chamado no atendimento, com envio de documentos e selfie.']),
  S('Impacto operacional','check',['Qualquer solicitação gera um ticket com validação manual: documento, selfie, QSA, aceite de sócios. Casos PJ envolvem N2 e múltiplas interações.']),
  S('Custo','safe',['Alterações de titularidade estão entre os subtipos de maior complexidade e DSAT no motivo "Dados da Conta".'])
]};
ANNO['tit-conta-proposta'] = { title:'Minha Conta · Titularidade', step:'Proposta', secs:[
  S('O que muda','do',['O campo "Natureza do negócio" passa a ser editável. Para PF→PJ onde o CPF consta no QSA: fluxo 100% self-service com biometria + SERPRO. Para PJ→PJ: CX-assistido, mas sem documentos físicos.']),
  S('Tecnologia','check',['Biometria FaceTec (já integrado ao KYC) + SERPRO API (Receita Federal): valida QSA, situação cadastral e dados da empresa em tempo real.']),
  S('Impacto','safe',['Elimina envio de documentos para os casos onde a vinculação CPF-CNPJ já existe no QSA. Para PJ→PJ, reduz 9 dias para ~1 dia útil.'])
]};
ANNO['tit-biometria'] = { title:'Biometria', step:'Verificação de identidade', secs:[
  S('O que a pessoa faz','do',['Realiza captura facial com prova de vida (liveness) — o mesmo motor FaceTec usado no KYC da conta.']),
  S('Bastidores','check',['FaceTec compara o rosto com o documento já cadastrado na conta e detecta foto, vídeo ou deepfake.']),
  S('Por que é seguro','safe',['Garante que é a pessoa real e titular, sem selfie manual enviada por ticket — mais robusto e consistente.'])
]};
ANNO['tit-cnpj'] = { title:'Consulta CNPJ via SERPRO', step:'Validação automática', secs:[
  S('O que acontece','do',['A plataforma consulta a API da Receita Federal (SERPRO) com o CNPJ informado, retornando razão social, situação e quadro societário em tempo real.']),
  S('O que o SERPRO retorna','check',['Razão Social, CNPJ, Natureza Jurídica, Situação (ATIVA/BAIXADA), QSA com CPF de cada sócio e seu papel na empresa.']),
  S('Por que importa','safe',['O CX hoje valida manualmente o que o SERPRO retorna em segundos. A automação elimina reprovações por documento ilegível ou CPF não visível.'])
]};
ANNO['tit-confirmar'] = { title:'Confirmação + 2FA', step:'Último passo antes da validação', secs:[
  S('O que a pessoa faz','do',['Confere os dados pré-preenchidos pelo SERPRO e confirma com um código de 6 dígitos enviado ao e-mail ou SMS cadastrado (2FA obrigatório em todas as trocas de titularidade).']),
  S('PF→PJ (self-service)','check',['CPF no QSA + biometria + 2FA = alteração imediata, sem CX. O sócio único é o próprio solicitante.']),
  S('PJ→PJ (múltiplos sócios)','safe',['Após o 2FA do solicitante, cada sócio recebe notificação no e-mail para validar sua identidade (biometria + documento + 2FA) em sua própria conta Hotmart. A alteração só é efetivada após todos validarem.'])
]};
ANNO['tit-result-pf-pj'] = { title:'Conta migrada', step:'Desfecho · PF→PJ', secs:[
  S('O que aconteceu','do',['Biometria validou a identidade; SERPRO confirmou o CPF no QSA. Conta alterada em minutos, sem ticket.']),
  S('Contraste com hoje','check',['Hoje: 4 dias, 9 interações, dois reenvios, escalonamento N2. Na proposta: minutos, sem atendimento humano.']),
  S('Escala','safe',['Alterações PF→PJ são frequentes em criadores que abrem empresa para formalizar a atividade — um caso de alto volume.'])
]};
ANNO['tit-result-pj-pj'] = { title:'Aguardando sócios', step:'Desfecho · PJ→PJ', secs:[
  S('O que aconteceu','do',['Solicitante validou biometria + 2FA. Cada sócio da nova empresa recebeu e-mail com link para validar sua identidade (biometria + documento + 2FA) em sua própria conta Hotmart. Após todos validarem, entra a carência de 48h antes da efetivação.']),
  S('Sócio sem conta Hotmart','check',['Recebe link para criar conta simplificada e validar a identidade antes de confirmar. CX só entra se houver problema nessa validação.']),
  S('Melhoria vs hoje','safe',['Hoje: 9 dias, 13 interações, perda de contexto, reenvio de documentos físicos. Na proposta: ~1–2 dias, sem documentos, sem CX proativo.'])
]};
ANNO['tit-asis-persona'] = { title:'Abertura de chamado', step:'Titularidade · Como é hoje', secs:[
  S('O que o usuário faz','do',['Identifica seu perfil — Produtor ou Afiliado — para iniciar a solicitação no portal de suporte.']),
  S('Custo já começa aqui','check',['A partir desta etapa, a resolução depende integralmente do atendimento humano.']),
  S('Ponto de atenção','safe',['Nenhuma triagem ou pré-validação acontece aqui: o ticket vai para a fila geral antes de qualquer checagem.'])
]};
