# Simulador de Alterações na Conta — Referência de Sessão

## Regras de trabalho (NUNCA ignorar)
- **Nunca** fazer `git commit` ou `git push` — o usuário gerencia tudo
- **Nunca** usar emojis em nenhum arquivo
- **Nunca** usar travessões (—) em textos visíveis ao usuário
- **Nunca** colocar seta (arrowL) em botões "Voltar"
- Entregas via `SendUserFile` apenas (JS e/ou HTML conforme alterado)
- Ícones: SVG inline only — sem emojis, sem unicode especial

---

## Arquivos do projeto

```
docs/
  index.html                      # estrutura HTML + views + popup overlay
  simulador-alteracoes-conta.js   # toda a lógica, estado, ANNOs
  simulador-alteracoes-conta.css  # estilos
  cabeçalho-template.jpg          # header do e-mail Hotmart (fundo preto, chama)
  rodape-template.jpg             # footer do e-mail Hotmart (fundo escuro, redes sociais)
```

---

## Sistema de navegação

- **Telas** (`<div class="mc-screen" id="scr-*">`): navegadas via `goTo(id)`
- **Views** (`<div class="mc-view" id="v-*">`): dentro de uma tela, navegadas via `showView(id)`
- **`.screen.active`** / **`.mc-view` com `display:none`** controlam visibilidade

### Views existentes (dentro de `#scr-tit`)
| ID | Descrição |
|----|-----------|
| `v-tit-intro` | Seleção de cenário (PF→PJ / PJ→PJ) |
| `v-tit-wizard` | Wizard principal (biometria → CNPJ → confirmar) |
| `v-tit-doc-upload` | Upload de documentos (titularidade) |
| `v-tit-2fa` | Seleção de canal 2FA |
| `v-tit-result` | Resultado final |
| `v-tit-socia-email` | Simulação do e-mail recebido pela sócia |
| `v-tit-socia-flow` | Wizard do fluxo da sócia |

---

## Estado global (`state`)

```js
state.branch           // 'baixo' | 'medio' | 'alto'
state.titScenario      // 'pf-pj' | 'pj-pj'
state.titWizStep       // 'biometria' | 'cnpj' | 'confirmar'
state.titFacetecNext   // bool — FaceTec avança para titWizGo('cnpj')
state.sociaFacetecNext // bool — FaceTec avança para sociaFlowGo(3)
state.annoKey          // chave atual do painel de anotações
SOCIA_PATH             // 'criar-conta' | 'enviar-docs' (global)
```

---

## Funções-chave

| Função | O que faz |
|--------|-----------|
| `goTo(screenId)` | Navega entre telas principais |
| `showView(viewId)` | Mostra view dentro da tela atual |
| `titWizGo(step)` | Wizard titularidade: `'biometria'`, `'cnpj'`, `'confirmar'` |
| `titGoResult()` | Vai para resultado (diferencia PF→PJ / PJ→PJ) |
| `titSociaEmailCta(path)` | Inicia fluxo da sócia: `'criar-conta'` ou `'enviar-docs'` |
| `sociaFlowGo(stepIdx)` | Wizard da sócia — passos 0..4 (criar-conta) ou 0..2 (enviar-docs) |
| `sociaFacetec()` | Abre FaceTec para sócia (seta `state.sociaFacetecNext`) |
| `ftCapture()` | Conclui FaceTec — roteia por `titFacetecNext` ou `sociaFacetecNext` |
| `openOtp(kind)` | Abre modal OTP — kinds: `'tit-2fa'`, `'socia-2fa'`, etc. |
| `otpComplete()` | Conclui OTP — roteia por `otpCtx` |
| `openGenericPopup(title, html)` | Abre popup genérico `#sim-popup` |
| `closeGenericPopup()` | Fecha popup genérico |
| `titPdfClick()` | Popup "Extrato SERPRO em PDF" |
| `titSerproValidar()` | Popup "Como validar esses dados?" (links Receita Federal, Simples Nacional, REDESIM) |
| `titContinuarDepois()` | Popup "Cache de 60 dias" |
| `setAnno(key)` | Atualiza painel de modo apresentação com a anotação `key` |

---

## Ícones SVG (variáveis globais)

```js
ICON.mail / .send / .face / .check / .clock / .person / .warn / .arrowL
IC_CLOCK   // relógio 14×14 (botão "Continuar depois")
IC_PDF     // ícone de arquivo PDF com stroke vermelho #CC1818
IC_AR      // seta right
IC_ALERT   // triângulo de alerta
IC_CH      // ícone de headset/atendimento
```

---

## Padrão de layout de actions (wizard)

```html
<!-- Voltar (esquerda) | [Continuar depois] [Ação primária] (direita) -->
<div class="wz-actions">   <!-- display:flex; justify-content:space-between -->
  <span class="back-link" onclick="...">Voltar</span>
  <div style="display:flex;gap:10px;align-items:center;">
    <span class="back-link" onclick="titContinuarDepois()">IC_CLOCK Continuar depois</span>
    <button class="ui-btn ui-btn-primary">Ação</button>
  </div>
</div>
```

---

## Sistema ANNO (modo apresentação)

- Objeto `ANNO` em JS — chaves mapeadas por `setAnno(key)`
- Helper: `S(title, icon, arrayDeStrings)` → `{ title, icon, items }`
- Ícones de seção: `'do'` (olho), `'check'` (escudo), `'safe'` (cadeado)

### Chaves ANNO existentes relevantes para titularidade
`tit-conta-hoje`, `tit-conta-proposta`, `tit-biometria`, `tit-cnpj`, `tit-confirmar`, `tit-result-pf-pj`, `tit-result-pj-pj`, `socia-conta`, `socia-doc`, `socia-verif`, `socia-cx`, `socia-confirmado`

---

## Cenários implementados

### PF→PJ (self-service)
- Biometria → CNPJ (SERPRO) → Confirmar dados → 2FA → Resultado
- CPF do solicitante já está no QSA → sem envio de documentos
- Tem: botão PDF (Extrato SERPRO), "Como validar?", "Continuar depois"
- **Sem** seção de sócios

### PJ→PJ (múltiplos sócios)
- Mesmo wizard + seção de sócia (Maria Santos)
- Sócia COM conta Hotmart: recebe link, autentica na própria conta
- Sócia SEM conta Hotmart (checkbox): e-mail com duas opções:
  1. **Criar conta** → 5 steps: conta → doc → biometria (FaceTec) → 2FA → confirmado
  2. **Enviar docs** → 3 steps: selfie+PDF → verificação QR → aguardando CX
- Resultado PJ→PJ tem botão "Ver e-mail da sócia"

### Documentos aceitos para sócia
- RG (CIN, novo modelo 2022+), CNH, RNM
- **Passaporte não é aceito**
- Com QR Code: validação automática via API (CIN/Gov.br, CNH/SENATRAN, RNM/PF SISCART)
- Sem QR Code: análise manual do CX (até 3 dias úteis)

---

## Template do e-mail da sócia (`v-tit-socia-email`)
- Header: `cabeçalho-template.jpg`
- Footer: `rodape-template.jpg`
- Aviso laranja antes dos CTAs: "Caso não possua uma conta criada na Hotmart, escolha uma das opções abaixo:"
- CTA primário (laranja): "Criar conta Hotmart e confirmar"
- CTA secundário (outline): "Enviar documentos sem criar conta"

---

## Popup genérico (`#sim-popup`)
Definido em `index.html`. Usado por:
- `titPdfClick()` — disponível no BackOffice
- `titSerproValidar()` — links para Receita Federal, Simples Nacional, REDESIM
- `titContinuarDepois()` — cache de 60 dias
