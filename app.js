/**
 * ==========================================================================
 * CONTROLLER DA APLICAÇÃO - BIBLIOTECA DA VIOLA
 * Gerenciamento de Etapas, Validações Estritas e Lógica de Funil
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // CONFIGURAÇÕES DE LINKS EXTERNOS (Cole seus links reais aqui quando quiser)
    // ==========================================================================
    const LINKS_CONFIG = {
        // Link do Grupo de WhatsApp (Passo 2 da Página de Boas-Vindas)
        whatsappGroup: "https://chat.whatsapp.com/invite/BibliotecaViolaEvolucaoMock",
        
        // Link do Checkout de Pagamento Externo (Kirvano, Kiwify, Asaas, Stripe, etc.)
        // Se preenchido com seu link real, ao clicar em "Quero Fazer Parte" o usuário é
        // enviado diretamente para sua página de pagamento real em vez do simulador.
        // Deixe em branco "" para usar a tela de checkout simulada interna.
        checkoutReal: "https://pay.kiwify.com.br/b7V5TVv",
        
        // Link para conteúdos gratuitos (Resultado Não Qualificado)
        conteudoGratuito: "https://www.youtube.com/c/BibliotecaDaViolaMock"
    };

    // 1. MAPEAMENTO DE ELEMENTOS DO DOM
    const views = {
        landing: document.getElementById("view-landing"),
        diagnosis: document.getElementById("view-diagnosis"),
        qualified: document.getElementById("view-qualified"),
        unqualified: document.getElementById("view-unqualified"),
        checkout: document.getElementById("view-checkout"),
        welcome: document.getElementById("view-welcome")
    };

    // Form inputs and buttons
    const btnStartDiagnosis = document.getElementById("btn-start-diagnosis");
    const diagnosisForm = document.getElementById("diagnosis-form");
    const formSteps = document.querySelectorAll(".form-step");
    const btnPrevStep = document.getElementById("btn-prev-step");
    const btnNextStep = document.getElementById("btn-next-step");
    const formNavigation = document.querySelector(".form-navigation");
    const globalErrorEl = document.getElementById("form-global-error");
    const globalErrorText = document.getElementById("global-error-text");

    // Inputs
    const inputNome = document.getElementById("input-nome");
    const inputWhatsApp = document.getElementById("input-whatsapp");

    // Results Actions
    const btnGoToPayment = document.getElementById("btn-go-to-payment");
    const btnFreeContent = document.getElementById("btn-free-content");

    // Checkout
    const paymentTabs = document.querySelectorAll(".payment-tab");
    const paymentContents = document.querySelectorAll(".payment-method-content");
    const btnCopyPix = document.getElementById("btn-copy-pix");
    const pixCodeInput = document.getElementById("pix-copy-paste-code");
    const btnSimulatePixPaid = document.getElementById("btn-simulate-pix-paid");
    const btnSimulateCardPaid = document.getElementById("btn-simulate-card-paid");
    const btnCancelCheckout = document.getElementById("btn-cancel-checkout");
    const checkoutCardForm = document.getElementById("checkout-card-form");

    // Welcome
    const btnJoinWhatsappGroup = document.getElementById("btn-join-whatsapp-group");



    // 2. ESTADO DA APLICAÇÃO
    let currentStep = 1;
    let totalSteps = 7;
    let leadData = {
        id: "",
        nome: "",
        whatsapp: "",
        situacao_atual: "",
        maior_desafio: "",
        tempo_toca: "",
        projecao_futura: "",
        purchase_intent: "",
        qualified: false
    };

    // 3. ENGENHARIA DE ROTEAMENTO (SWITCH VIEWS)
    function switchView(targetViewId) {
        // Remove class active de todas as views
        Object.keys(views).forEach(key => {
            views[key].classList.remove("active");
        });
        
        // Adiciona active na view alvo
        const targetView = views[targetViewId];
        if (targetView) {
            targetView.classList.add("active");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

    }

    // 4. MÁSCARA E VALIDAÇÃO DE WHATSAPP (REGRAS RÍGIDAS)
    
    // Formata o input enquanto o usuário digita no padrão: 99 99999-9999
    inputWhatsApp.addEventListener("input", (e) => {
        let value = e.target.value;
        
        // 1. Remove qualquer caractere que não seja número
        let digits = value.replace(/\D/g, "");
        
        // 2. Regra: Não permitir +55 ou 55 no início caso o usuário digite o DDI completo
        // Se começar com 55 e tiver mais de 11 dígitos, removemos os dois primeiros dígitos
        if (digits.startsWith("55") && digits.length > 11) {
            digits = digits.substring(2);
        }
        
        // 3. Limita o tamanho máximo do número limpo a 11 dígitos
        if (digits.length > 11) {
            digits = digits.substring(0, 11);
        }
        
        // 4. Aplica a máscara visual em tempo real: 99 99999-9999
        let formatted = "";
        if (digits.length > 0) {
            formatted += digits.substring(0, 2); // DDD
        }
        if (digits.length > 2) {
            formatted += " " + digits.substring(2, 7); // Prefixo
        }
        if (digits.length > 7) {
            formatted += "-" + digits.substring(7, 11); // Sufixo
        }
        
        e.target.value = formatted;
        
        // Validação em tempo real (feedback visual sutil)
        validateWhatsAppRealTime(digits);
    });

    function validateWhatsAppRealTime(digits) {
        const errorDiv = document.getElementById("error-whatsapp");
        const hintDiv = document.getElementById("hint-whatsapp");
        
        if (digits.length === 0) {
            inputWhatsApp.classList.remove("invalid");
            errorDiv.style.display = "none";
            hintDiv.style.display = "block";
            return;
        }

        const check = checkWhatsAppValidity(digits);
        if (!check.isValid) {
            inputWhatsApp.classList.add("invalid");
            errorDiv.textContent = check.message;
            errorDiv.style.display = "flex";
            hintDiv.style.display = "none";
        } else {
            inputWhatsApp.classList.remove("invalid");
            errorDiv.style.display = "none";
            hintDiv.style.display = "block";
        }
    }

    // Regras rígidas de validade
    function checkWhatsAppValidity(digits) {
        // Tamanho exato
        if (digits.length < 11) {
            return { isValid: false, message: "WhatsApp incompleto. Digite DDD + 9 dígitos." };
        }
        if (digits.length > 11) {
            return { isValid: false, message: "WhatsApp inválido. Máximo de 11 dígitos permitido." };
        }
        
        // Bloqueia números repetidos inválidos (ex: 11 11111-1111, 99 99999-9999)
        if (/^(\d)\1{10}$/.test(digits)) {
            return { isValid: false, message: "Digite um número de telefone válido (evite números repetidos)." };
        }
        
        // DDDs válidos no Brasil (11 a 99)
        const ddd = parseInt(digits.substring(0, 2), 10);
        if (ddd < 11 || ddd > 99) {
            return { isValid: false, message: "DDD inválido. Digite um DDD entre 11 e 99." };
        }
        
        // Bloquear DDI (55) direto no DDD caso digite 11 dígitos começando com 55
        // Exemplo: se o usuário digitar 55 98888-8888, o DDD seria "55" (RS).
        // Embora "55" seja um DDD válido no Rio Grande do Sul, se o número for na verdade de SP (11) e ele incluiu 55 na frente,
        // ficaria 551198888 (faltando dígitos no final porque travou em 11 dígitos).
        // O nosso extrator automático de 55 no evento "input" já resolve a maioria dos casos em que ele digita 55 + DDD.
        
        return { isValid: true };
    }

    // Validador de Nome Completo (Pelo menos Nome + Sobrenome)
    function checkNomeValidity(nome) {
        const trimmed = nome.trim();
        if (trimmed.length === 0) {
            return { isValid: false, message: "Nome é obrigatório." };
        }
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) {
            return { isValid: false, message: "Por favor, digite seu nome e pelo menos um sobrenome." };
        }
        return { isValid: true };
    }

    // 5. NAVEGAÇÃO E PROGRESSO DO WIZARD
    
    // Controla a visibilidade dos botões do formulário dinamicamente
    function updateProgress() {
        // Regra do Usuário: 
        // 1. Etapa 1 e 2 (Nome e WhatsApp): Deixar apenas o botão "Avançar", sem o botão "Voltar".
        // 2. Etapas 3 a 7 (Perguntas): Ocultar toda a barra de navegação (avançam de forma automática).
        if (currentStep === 1 || currentStep === 2) {
            if (formNavigation) formNavigation.style.display = "flex";
            if (btnPrevStep) btnPrevStep.style.display = "none";
            if (btnNextStep) {
                btnNextStep.style.display = "flex";
                btnNextStep.querySelector("span").textContent = "Avançar";
            }
        } else {
            // Oculta a navegação por completo nas perguntas de múltipla escolha
            if (formNavigation) formNavigation.style.display = "none";
        }
    }

    // Valida a etapa atual antes de avançar
    function validateStep(stepNum) {
        if (stepNum === 1) {
            const check = checkNomeValidity(inputNome.value);
            const errDiv = document.getElementById("error-nome");
            if (!check.isValid) {
                inputNome.classList.add("invalid");
                errDiv.textContent = check.message;
                errDiv.style.display = "flex";
                return false;
            } else {
                inputNome.classList.remove("invalid");
                errDiv.style.display = "none";
                return true;
            }
        }
        
        if (stepNum === 2) {
            const cleanDigits = inputWhatsApp.value.replace(/\D/g, "");
            const check = checkWhatsAppValidity(cleanDigits);
            const errDiv = document.getElementById("error-whatsapp");
            const hintDiv = document.getElementById("hint-whatsapp");
            if (!check.isValid) {
                inputWhatsApp.classList.add("invalid");
                errDiv.textContent = check.message;
                errDiv.style.display = "flex";
                hintDiv.style.display = "none";
                return false;
            } else {
                inputWhatsApp.classList.remove("invalid");
                errDiv.style.display = "none";
                hintDiv.style.display = "block";
                return true;
            }
        }
        
        // Etapas de múltipla escolha (3 a 7)
        if (stepNum >= 3 && stepNum <= 7) {
            let nameAttr = "";
            let errId = "";
            switch (stepNum) {
                case 3: nameAttr = "situacao_atual"; errId = "error-situacao"; break;
                case 4: nameAttr = "maior_desafio"; errId = "error-desafio"; break;
                case 5: nameAttr = "tempo_toca"; errId = "error-tempo"; break;
                case 6: nameAttr = "projecao_futura"; errId = "error-projecao"; break;
                case 7: nameAttr = "purchase_intent"; errId = "error-intent"; break;
            }
            
            const checkedOption = document.querySelector(`input[name="${nameAttr}"]:checked`);
            const errDiv = document.getElementById(errId);
            if (!checkedOption) {
                errDiv.style.display = "flex";
                return false;
            } else {
                errDiv.style.display = "none";
                return true;
            }
        }
        
        return true;
    }

    async function goToNextStep() {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                // Se for a etapa 2 (WhatsApp), executa checagem de duplicidade e captura parcial
                if (currentStep === 2) {
                    const originalText = btnNextStep.querySelector("span").textContent;
                    btnNextStep.disabled = true;
                    btnNextStep.querySelector("span").textContent = "Verificando...";
                    
                    const whatsappLimpo = inputWhatsApp.value.replace(/\D/g, "");
                    try {
                        const exists = await ViolaDB.checkWhatsAppExists(whatsappLimpo);
                        if (exists) {
                            const errDiv = document.getElementById("error-whatsapp");
                            const hintDiv = document.getElementById("hint-whatsapp");
                            inputWhatsApp.classList.add("invalid");
                            errDiv.textContent = "Já existe um cadastro realizado com este número.";
                            errDiv.style.display = "flex";
                            hintDiv.style.display = "none";
                            
                            // Efeito visual sutil de shake no formulário
                            const container = document.querySelector(".form-container");
                            container.style.animation = "none";
                            setTimeout(() => {
                                container.style.animation = "shake 0.4s ease";
                            }, 10);
                            
                            btnNextStep.disabled = false;
                            btnNextStep.querySelector("span").textContent = originalText;
                            return; // Impede o avanço do usuário!
                        }
                        
                        // Captura e grava lead parcial de forma imediata
                        leadData.id = leadData.id || "lead_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                        leadData.nome = inputNome.value.trim();
                        leadData.whatsapp = whatsappLimpo;
                        leadData.situacao_atual = "Pendente (abandonou)";
                        leadData.maior_desafio = "Pendente (abandonou)";
                        leadData.tempo_toca = "Pendente (abandonou)";
                        leadData.projecao_futura = "Pendente (abandonou)";
                        leadData.purchase_intent = "Pendente (abandonou)";
                        leadData.qualified = false;
                        
                        await ViolaDB.saveLead(leadData);
                        console.log("Lead parcial capturado e gravado com sucesso:", leadData.nome);
                        
                    } catch (err) {
                        console.error("Erro na verificação ou gravação do lead parcial:", err);
                    } finally {
                        btnNextStep.disabled = false;
                        btnNextStep.querySelector("span").textContent = originalText;
                    }
                }

                // Interceptador Estratégico: Se o usuário estiver no Passo 6 e selecionar "Muito melhor",
                // nós o demitimos imediatamente sem deixá-lo prosseguir para a pergunta de investimento!
                if (currentStep === 6) {
                    const selectedProjecao = document.querySelector('input[name="projecao_futura"]:checked');
                    if (selectedProjecao && selectedProjecao.value === "Muito melhor") {
                        await demitirLeadImediatamente();
                        return; // Trava o fluxo aqui! Não remove classe ativa e nem avança.
                    }
                }

                // Remove active do slide atual
                document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove("active");
                currentStep++;
                // Ativa o próximo slide
                const nextStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
                nextStepEl.classList.add("active");
                updateProgress();
                globalErrorEl.style.display = "none";
            } else {
                // Última etapa concluída, envia o formulário
                handleFormSubmit();
            }
        } else {
            // Efeito visual sutil de shake no formulário se inválido
            const container = document.querySelector(".form-container");
            container.style.animation = "none";
            setTimeout(() => {
                container.style.animation = "shake 0.4s ease";
            }, 10);
        }
    }

    function goToPrevStep() {
        if (currentStep > 1) {
            document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove("active");
            currentStep--;
            document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add("active");
            updateProgress();
            globalErrorEl.style.display = "none";
        }
    }

    // Avanço Automático Inteligente nas perguntas de múltipla escolha
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const step = parseInt(e.target.closest(".form-step").dataset.step, 10);
            
            // Pausa curta de feedback de clique (300ms) antes do auto-avanço
            if (step >= 3 && step < totalSteps) {
                setTimeout(() => {
                    goToNextStep();
                }, 300);
            } else if (step === totalSteps) {
                // Última pergunta: envia o formulário automaticamente
                setTimeout(() => {
                    handleFormSubmit();
                }, 350);
            }
        });
    });

    // Eventos dos botões de controle do formulário
    btnNextStep.addEventListener("click", goToNextStep);
    btnPrevStep.addEventListener("click", goToPrevStep);

    // Evento de Iniciar Diagnóstico
    btnStartDiagnosis.addEventListener("click", () => {
        switchView("diagnosis");
        currentStep = 1;
        // Reseta formulário visualmente
        formSteps.forEach(step => step.classList.remove("active"));
        document.querySelector('.form-step[data-step="1"]').classList.add("active");
        diagnosisForm.reset();
        updateProgress();
        globalErrorEl.style.display = "none";
    });

    // Função estratégica para "Demitir o Lead" de forma instantânea caso responda autossuficiência no Passo 6
    async function demitirLeadImediatamente() {
        btnNextStep.disabled = true;
        btnNextStep.querySelector("span").textContent = "Processando...";
        globalErrorEl.style.display = "none";

        const whatsappLimpo = inputWhatsApp.value.replace(/\D/g, "");
        const projecaoFutura = document.querySelector('input[name="projecao_futura"]:checked').value;
        
        leadData = {
            id: leadData.id,
            nome: inputNome.value.trim(),
            whatsapp: whatsappLimpo,
            situacao_atual: document.querySelector('input[name="situacao_atual"]:checked').value,
            maior_desafio: document.querySelector('input[name="maior_desafio"]:checked').value,
            tempo_toca: document.querySelector('input[name="tempo_toca"]:checked').value,
            projecao_futura: projecaoFutura,
            purchase_intent: "Demitido (autossuficiente no Passo 6)",
            qualified: false
        };

        try {
            await ViolaDB.saveLead(leadData);
            console.log("Lead demitido imediatamente (autossuficiência no Passo 6):", leadData.nome);
            switchView("unqualified");
        } catch (error) {
            console.error("Erro ao demitir lead imediatamente:", error);
            globalErrorText.textContent = "Erro de conexão ao salvar cadastro. Tente novamente.";
            globalErrorEl.style.display = "flex";
        } finally {
            btnNextStep.disabled = false;
            btnNextStep.querySelector("span").textContent = "Avançar";
        }
    }

    // 6. PROCESSAMENTO E LÓGICA DE QUALIFICAÇÃO (SALVAR NO BANCO)
    async function handleFormSubmit() {
        // Evita múltiplos envios paralelos desabilitando o botão
        btnNextStep.disabled = true;
        btnNextStep.querySelector("span").textContent = "Processando...";
        globalErrorEl.style.display = "none";

        // Captura e monta os dados do lead
        const whatsappLimpo = inputWhatsApp.value.replace(/\D/g, "");
        const purchaseIntentEl = document.querySelector('input[name="purchase_intent"]:checked');
        const purchaseIntent = purchaseIntentEl ? purchaseIntentEl.value : "Não respondido";
        const projecaoFutura = document.querySelector('input[name="projecao_futura"]:checked').value;
        
        // Lógica de qualificação: Qualificado se (Sim ou Talvez) E NÃO responder "Muito melhor" no passo 6.
        const isQualified = (purchaseIntent === "Sim" || purchaseIntent === "Talvez") && (projecaoFutura !== "Muito melhor");
        
        // Preserva o ID gerado e gravado no passo 2
        leadData = {
            id: leadData.id,
            nome: inputNome.value.trim(),
            whatsapp: whatsappLimpo,
            situacao_atual: document.querySelector('input[name="situacao_atual"]:checked').value,
            maior_desafio: document.querySelector('input[name="maior_desafio"]:checked').value,
            tempo_toca: document.querySelector('input[name="tempo_toca"]:checked').value,
            projecao_futura: projecaoFutura,
            purchase_intent: purchaseIntent,
            qualified: isQualified
        };

        try {
            // Sobrescreve/Atualiza o mesmo documento com as respostas finais das perguntas
            await ViolaDB.saveLead(leadData);
            console.log("Lead completo atualizado no banco de dados!", leadData.nome);

            // Avança para a view de resultado correspondente
            if (isQualified) {
                switchView("qualified");
            } else {
                switchView("unqualified");
            }

        } catch (error) {
            console.error("Erro no envio do diagnóstico:", error);
            globalErrorText.textContent = "Erro de conexão ao salvar cadastro. Tente novamente.";
            globalErrorEl.style.display = "flex";
        } finally {
            btnNextStep.disabled = false;
            btnNextStep.querySelector("span").textContent = "Concluir Diagnóstico";
        }
    }

    // 7. FLUXO DE PAGAMENTO E CHECKOUT SIMULADO

    // Clique em "Quero Fazer Parte" -> Registrar clique e ir para Checkout
    btnGoToPayment.addEventListener("click", async () => {
        btnGoToPayment.disabled = true;
        btnGoToPayment.textContent = "Redirecionando...";
        
        try {
            // Salva status: clicked_payment_button = true
            await ViolaDB.updateLeadPaymentClick(leadData.whatsapp);
            
            // Regra de link real: se o checkoutReal estiver preenchido, redireciona direto
            if (LINKS_CONFIG.checkoutReal && LINKS_CONFIG.checkoutReal.trim() !== "") {
                window.open(LINKS_CONFIG.checkoutReal, "_blank");
            } else {
                // Abre o checkout simulado
                switchView("checkout");
                resetCheckoutForm();
            }
        } catch (err) {
            console.error(err);
        } finally {
            btnGoToPayment.disabled = false;
            btnGoToPayment.innerHTML = `Quero Fazer Parte <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
    });

    // Clique em Conteúdos Gratuitos (Não qualificado)
    btnFreeContent.addEventListener("click", () => {
        window.open(LINKS_CONFIG.conteudoGratuito, "_blank");
    });

    // Clique em Refazer Diagnóstico (Demitir o lead / Quebrar padrão)
    const btnRetryDiagnosis = document.getElementById("btn-retry-diagnosis");
    if (btnRetryDiagnosis) {
        btnRetryDiagnosis.addEventListener("click", () => {
            switchView("diagnosis");
            currentStep = 1;
            // Reseta slides e inputs
            formSteps.forEach(step => step.classList.remove("active"));
            document.querySelector('.form-step[data-step="1"]').classList.add("active");
            diagnosisForm.reset();
            updateProgress();
            globalErrorEl.style.display = "none";
        });
    }

    // Abas de Pagamento no Checkout (Pix / Cartão)
    paymentTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            paymentTabs.forEach(t => t.classList.remove("active"));
            paymentContents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const targetContent = document.getElementById(`tab-content-${tab.dataset.tab}`);
            if (targetContent) {
                targetContent.classList.add("active");
            }
        });
    });

    // Copiar código Pix
    btnCopyPix.addEventListener("click", () => {
        pixCodeInput.select();
        pixCodeInput.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(pixCodeInput.value);
        
        btnCopyPix.textContent = "Copiado!";
        setTimeout(() => {
            btnCopyPix.textContent = "Copiar Código Pix";
        }, 2000);
    });

    // Cancelar Checkout
    btnCancelCheckout.addEventListener("click", () => {
        switchView("qualified");
    });

    function resetCheckoutForm() {
        if (checkoutCardForm) checkoutCardForm.reset();
    }

    // Ações de Confirmação de Pagamento Simulado (PIX ou Cartão)
    async function processPaymentApproval() {
        const activeTab = document.querySelector(".payment-tab.active").dataset.tab.toUpperCase();
        
        // Simulação de carregamento de processamento do gateway
        const payBtn = activeTab === "PIX" ? btnSimulatePixPaid : btnSimulateCardPaid;
        const originalText = payBtn.textContent;
        payBtn.disabled = true;
        payBtn.textContent = "Processando transação segura...";

        try {
            // Salva status: checkout_completed = true, payment_status = 'approved', payment_date = agora
            await ViolaDB.updateLeadPaymentApproved(leadData.whatsapp);
            
            setTimeout(() => {
                switchView("welcome");
            }, 1000); // feedback visual de processamento

        } catch (e) {
            console.error("Erro ao registrar aprovação do pagamento:", e);
            alert("Erro ao validar pagamento. Tente novamente.");
        } finally {
            payBtn.disabled = false;
            payBtn.textContent = originalText;
        }
    }

    btnSimulatePixPaid.addEventListener("click", processPaymentApproval);
    btnSimulateCardPaid.addEventListener("click", processPaymentApproval);

    // 8. TELA DE BOAS-VINDAS (PÓS-PAGAMENTO) - ENTRADA NO GRUPO
    btnJoinWhatsappGroup.addEventListener("click", async () => {
        btnJoinWhatsappGroup.disabled = true;
        btnJoinWhatsappGroup.textContent = "Registrando entrada...";

        try {
            // Salva status: joined_whatsapp_group = true, date_joined_whatsapp_group = agora
            await ViolaDB.updateLeadJoinedGroup(leadData.whatsapp);
            
            // Redireciona para o link configurado do WhatsApp
            alert("Sucesso! Você está sendo redirecionado para o Grupo Fechado de Evolução da Viola no WhatsApp.");
            window.open(LINKS_CONFIG.whatsappGroup, "_blank");
            
            btnJoinWhatsappGroup.textContent = "Você já entrou no grupo!";
        } catch (e) {
            console.error(e);
            btnJoinWhatsappGroup.disabled = false;
            btnJoinWhatsappGroup.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="whatsapp-btn-svg"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg> Entrar no Grupo de WhatsApp`;
        }
    });


});
