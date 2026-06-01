/**
 * ==========================================================================
 * INTEGRANTE DATABASE SERVICE - BIBLIOTECA DA VIOLA
 * Firebase Firestore Config + Fallback LocalStorage CRUD
 * ==========================================================================
 */

// 1. CONFIGURAÇÃO DO FIREBASE (Configurações do Cliente)
// Substitua as credenciais abaixo pelos dados do seu console Firebase:
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyA2VwsN2Qlktd10MdtNzsD0Wd0zK4RjYBo",
  authDomain: "biblioteca-da-viola.firebaseapp.com",
  projectId: "biblioteca-da-viola",
  storageBucket: "biblioteca-da-viola.firebasestorage.app",
  messagingSenderId: "910482493282",
  appId: "1:910482493282:web:808e1ae2b94ca2e4c0a63b"
};

// Coleção alvo no Firestore
const LEADS_COLLECTION = "leads_viola";

// Variáveis de estado da conexão
let db = null;
let useFirebase = false;

// Tenta inicializar o Firebase
try {
    // Verifica se os placeholders de configuração ainda estão ativos
    const isPlaceholder = firebaseConfig.apiKey.includes("SUA_API_KEY");
    
    if (!isPlaceholder && typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        // Ativa persistência offline no Firestore
        db.enablePersistence().catch((err) => {
            console.warn("Persistência offline do Firestore não pôde ser ativada:", err.code);
        });
        useFirebase = true;
        console.log("🔥 Firebase Firestore inicializado com sucesso!");
    } else {
        console.warn("⚠️ Firebase não configurado. Utilizando modo 'LocalStorage Fallback'.");
    }
} catch (e) {
    console.error("❌ Falha ao carregar o Firebase SDK:", e);
}

/**
 * MOCK LOCALSTORAGE DATABASE (Para simulação/teste off-line sem fricção)
 * Salva as mesmas estruturas de dados exatamente como no Firestore.
 */
const LocalDB = {
    getLeads: function() {
        const data = localStorage.getItem(LEADS_COLLECTION);
        return data ? JSON.parse(data) : [];
    },
    saveLead: function(lead) {
        const leads = this.getLeads();
        // Evita duplicatas se já houver por algum motivo
        const idx = leads.findIndex(l => l.whatsapp === lead.whatsapp);
        if (idx !== -1) {
            leads[idx] = { ...leads[idx], ...lead, last_update: new Date().toISOString() };
        } else {
            leads.push(lead);
        }
        localStorage.setItem(LEADS_COLLECTION, JSON.stringify(leads));
        return Promise.resolve(lead);
    },
    findLeadByWhatsApp: function(whatsapp) {
        const leads = this.getLeads();
        const cleaned = whatsapp.replace(/\D/g, '');
        const found = leads.find(l => l.whatsapp.replace(/\D/g, '') === cleaned);
        return Promise.resolve(found || null);
    },
    updateLeadField: function(whatsapp, fields) {
        const leads = this.getLeads();
        const cleaned = whatsapp.replace(/\D/g, '');
        const idx = leads.findIndex(l => l.whatsapp.replace(/\D/g, '') === cleaned);
        if (idx !== -1) {
            leads[idx] = { 
                ...leads[idx], 
                ...fields, 
                last_update: new Date().toISOString() 
            };
            localStorage.setItem(LEADS_COLLECTION, JSON.stringify(leads));
            return Promise.resolve(leads[idx]);
        }
        return Promise.reject("Lead não encontrado localmente.");
    },
    clearAll: function() {
        localStorage.removeItem(LEADS_COLLECTION);
        return Promise.resolve();
    }
};

/**
 * INTERFACE UNIFICADA DE BANCO DE DADOS (DATABASE GATEWAY)
 * Define os métodos de CRUD transparentes para app.js
 */
const ViolaDB = {
    // Informa qual banco de dados está sendo utilizado
    isFirebaseConnected: function() {
        return useFirebase;
    },
    
    // Alterna manualmente o modo de teste (útil para desenvolvedores)
    setDatabaseMode: function(firebaseMode) {
        if (firebaseMode && typeof firebase !== 'undefined' && db !== null) {
            useFirebase = true;
        } else {
            useFirebase = false;
        }
        return useFirebase;
    },

    /**
     * REGRA DE DUPLICIDADE:
     * Pesquisa o número do WhatsApp na coleção de leads.
     * Retorna true se existir, false se não existir.
     */
    checkWhatsAppExists: async function(whatsapp) {
        const cleanWhatsApp = whatsapp.replace(/\D/g, '');
        
        if (useFirebase) {
            try {
                // Consulta no Firestore buscando o número limpo
                const snapshot = await db.collection(LEADS_COLLECTION)
                    .where("whatsapp", "==", cleanWhatsApp)
                    .get();
                return !snapshot.empty;
            } catch (err) {
                console.error("Erro na busca no Firestore. Consultando fallback local:", err);
                const localFound = await LocalDB.findLeadByWhatsApp(cleanWhatsApp);
                return localFound !== null;
            }
        } else {
            const localFound = await LocalDB.findLeadByWhatsApp(cleanWhatsApp);
            return localFound !== null;
        }
    },

    /**
     * SALVAR DIAGNÓSTICO (CRUD CREATE):
     * Salva o lead inicial preenchido pelo formulário.
     */
    saveLead: async function(leadData) {
        // Garante a presença de todos os campos exigidos no escopo do banco de dados
        const timestamp = new Date().toISOString();
        const cleanWhatsApp = leadData.whatsapp.replace(/\D/g, '');
        
        const payload = {
            id: leadData.id || "lead_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            created_at: timestamp,
            nome: leadData.nome.trim(),
            whatsapp: cleanWhatsApp, // salva apenas números para padronização
            situacao_atual: leadData.situacao_atual,
            maior_desafio: leadData.maior_desafio,
            tempo_toca: leadData.tempo_toca,
            projecao_futura: leadData.projecao_futura,
            purchase_intent: leadData.purchase_intent,
            qualified: leadData.qualified, // boolean
            clicked_payment_button: false,
            checkout_completed: false,
            payment_status: "pending", // pending, approved, refused
            payment_date: "",
            joined_whatsapp_group: false,
            date_joined_whatsapp_group: "",
            last_update: timestamp
        };

        if (useFirebase) {
            try {
                await db.collection(LEADS_COLLECTION).doc(payload.id).set(payload);
                console.log("Lead gravado no Firestore com sucesso!", payload.nome);
                return payload;
            } catch (err) {
                console.error("Erro ao salvar no Firestore. Salvando localmente como contingência:", err);
                return await LocalDB.saveLead(payload);
            }
        } else {
            return await LocalDB.saveLead(payload);
        }
    },

    /**
     * REGISTRAR CLIQUE NO BOTÃO DE PAGAMENTO (CRUD UPDATE)
     * Campo: clicked_payment_button = true
     */
    updateLeadPaymentClick: async function(whatsapp) {
        const cleanWhatsApp = whatsapp.replace(/\D/g, '');
        const updateData = {
            clicked_payment_button: true,
            last_update: new Date().toISOString()
        };

        if (useFirebase) {
            try {
                const snapshot = await db.collection(LEADS_COLLECTION).where("whatsapp", "==", cleanWhatsApp).get();
                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await db.collection(LEADS_COLLECTION).doc(docId).update(updateData);
                    console.log("Firestore: clique em pagamento registrado!");
                    return true;
                }
            } catch (err) {
                console.error("Erro Firestore ao registrar pagamento:", err);
            }
        }
        
        // Atualiza fallback local
        try {
            await LocalDB.updateLeadField(cleanWhatsApp, updateData);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    /**
     * CONFIRMAÇÃO DE PAGAMENTO SIMULADO (CRUD UPDATE)
     * Campos: payment_status = 'approved', checkout_completed = true, payment_date
     */
    updateLeadPaymentApproved: async function(whatsapp) {
        const cleanWhatsApp = whatsapp.replace(/\D/g, '');
        const timestamp = new Date().toISOString();
        const updateData = {
            checkout_completed: true,
            payment_status: "approved",
            payment_date: timestamp,
            last_update: timestamp
        };

        if (useFirebase) {
            try {
                const snapshot = await db.collection(LEADS_COLLECTION).where("whatsapp", "==", cleanWhatsApp).get();
                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await db.collection(LEADS_COLLECTION).doc(docId).update(updateData);
                    console.log("Firestore: pagamento aprovado com sucesso!");
                    return true;
                }
            } catch (err) {
                console.error("Erro Firestore ao aprovar pagamento:", err);
            }
        }

        // Atualiza fallback local
        try {
            await LocalDB.updateLeadField(cleanWhatsApp, updateData);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    /**
     * ENTRADA NO GRUPO FECHADO DE WHATSAPP (CRUD UPDATE)
     * Campos: joined_whatsapp_group = true, date_joined_whatsapp_group
     */
    updateLeadJoinedGroup: async function(whatsapp) {
        const cleanWhatsApp = whatsapp.replace(/\D/g, '');
        const timestamp = new Date().toISOString();
        const updateData = {
            joined_whatsapp_group: true,
            date_joined_whatsapp_group: timestamp,
            last_update: timestamp
        };

        if (useFirebase) {
            try {
                const snapshot = await db.collection(LEADS_COLLECTION).where("whatsapp", "==", cleanWhatsApp).get();
                if (!snapshot.empty) {
                    const docId = snapshot.docs[0].id;
                    await db.collection(LEADS_COLLECTION).doc(docId).update(updateData);
                    console.log("Firestore: entrada no grupo de WhatsApp registrada!");
                    return true;
                }
            } catch (err) {
                console.error("Erro Firestore ao registrar entrada no grupo:", err);
            }
        }

        // Atualiza fallback local
        try {
            await LocalDB.updateLeadField(cleanWhatsApp, updateData);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },

    /**
     * RECUPERAR TODOS OS LEADS (CRUD READ)
     * Utilizado para o painel de monitoramento e testes no rodapé.
     */
    getAllLeads: async function() {
        if (useFirebase) {
            try {
                const snapshot = await db.collection(LEADS_COLLECTION).orderBy("created_at", "desc").get();
                const list = [];
                snapshot.forEach(doc => {
                    list.push(doc.data());
                });
                return list;
            } catch (err) {
                console.error("Erro ao ler Firestore, carregando leads locais:", err);
                return LocalDB.getLeads().sort((a,b) => b.created_at.localeCompare(a.created_at));
            }
        } else {
            return LocalDB.getLeads().sort((a,b) => b.created_at.localeCompare(a.created_at));
        }
    },

    /**
     * LIMPAR TODOS OS LEADS LOCAIS (Auxiliar de Teste)
     */
    clearLocalLeads: async function() {
        await LocalDB.clearAll();
        console.log("Mock Database limpo com sucesso!");
    }
};

/**
 * ==========================================================================
 * ESTRUTURA PARA INTEGRAÇÃO FUTURA DE CHECKOUTS DE PAGAMENTO
 * ==========================================================================
 * 
 * Para integrar plataformas reais no futuro (Stripe, Mercado Pago, Kirvano, Kiwify, etc.),
 * siga este modelo de fluxo:
 * 
 * 1. O botão "Quero Fazer Parte" chama ViolaDB.updateLeadPaymentClick(whatsapp) para registrar
 *    que o cliente clicou e iniciou a compra.
 * 2. Em seguida, o botão redireciona o usuário para a URL de checkout externa (Ex: checkout Kiwify,
 *    Kirvano ou link de checkout gerado pelo Stripe/Asaas).
 *    Dica de Alta Conversão: Passe o WhatsApp e Nome como parâmetros de URL no link para auto-preencher
 *    os dados na tela de pagamento (Ex: https://checkout.kiwify.com.br/.../?email=...&phone=5531999999999)
 * 3. Configuração de Webhook na plataforma de pagamento:
 *    Configure a plataforma de pagamento para enviar um evento do tipo "Pagamento Aprovado" (payment.success)
 *    para uma API Serverless/Cloud Function conectada ao Firestore.
 * 4. A API Cloud Function recebe a notificação, limpa o número de whatsapp enviado pela plataforma,
 *    localiza o lead na coleção 'leads_viola' e executa a atualização equivalente a:
 *    ViolaDB.updateLeadPaymentApproved(whatsapp).
 * 5. Quando o cliente conclui o pagamento na plataforma externa, o redirecionamento pós-venda o envia
 *    de volta para a nossa página de Boas-Vindas da Biblioteca (ex: index.html?whatsapp=11999999999&success=true),
 *    onde o app.js detecta o parâmetro, carrega as informações do lead e abre a tela de Boas-Vindas.
 */
