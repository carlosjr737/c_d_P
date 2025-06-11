// Cole o SEU firebaseConfig do projeto desejos-secretos aqui
const firebaseConfig = {
    apiKey: "AIzaSyCBOJvWpn3roG36KVroR_WNhBIcE5uEd2U",
    authDomain: "desejos-secretos-872f4.firebaseapp.com",
    projectId: "desejos-secretos-872f4",
    storageBucket: "desejos-secretos-872f4.firebasestorage.app",
    messagingSenderId: "504614117746",
    appId: "1:504614117746:web:4376a0a0e87128547efdeb",
    measurementId: "G-6KE5TM6CWQ"
  };

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
// ... (todas as referências HTML e listeners de Login/Cadastro/Logout continuam os mesmos) ...
const cardDeck = document.querySelector('.card-deck'); // Adicionamos a referência para o baralho
const loadingMessage = document.getElementById('loading-message');

// Referências HTML
const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeMessage = document.getElementById('welcomeMessage');
const partnerConnectionSection = document.getElementById('partner-connection-section');
const cardGameSection = document.getElementById('card-game-section');
const userInviteCode = document.getElementById('userInviteCode');
const partnerCodeInput = document.getElementById('partnerCodeInput');
const connectPartnerBtn = document.getElementById('connectPartnerBtn');
function carregarJogo(userId, partnerId) {
    console.log("Iniciando o carregamento do jogo...");
    loadingMessage.style.display = 'block'; // Mostra a mensagem "Carregando..."
    cardDeck.innerHTML = ''; // Limpa o baralho antigo

    // Busca todos os documentos da coleção 'desejos'
    db.collection('desejos').get()
        .then(querySnapshot => {
            const desejos = [];
            querySnapshot.forEach(doc => {
                // Para cada documento, adiciona seus dados a uma lista
                desejos.push(doc.data());
            });

            console.log(`Foram encontrados ${desejos.length} desejos no banco de dados.`);
            
            // Embaralha os desejos para que a ordem seja diferente a cada jogo
            desejos.sort(() => Math.random() - 0.5);

            // Constrói o HTML para cada carta
            let cardsHtml = '';
            desejos.forEach(desejo => {
                // Transforma o nível em um nome de classe CSS válido (ex: "Subindo a Temperatura" -> "Subindo-a-Temperatura")
                const nivelClass = desejo.nivel.replace(/\s+/g, '-');
                cardsHtml += `
                    <div class="card">
                        <span class="level ${nivelClass}">${desejo.nivel}</span>
                        <p>${desejo.texto}</p>
                    </div>
                `;
            });

            // Insere o HTML do novo baralho na página
            cardDeck.innerHTML = cardsHtml;
            // Pega todas as cartas que acabamos de criar
            const allCards = document.querySelectorAll('.card-deck .card');
            // Define a primeira carta como ativa para ela aparecer na tela
            if(allCards.length > 0) {
                allCards[0].classList.add('active');
            }

            loadingMessage.style.display = 'none'; // Esconde a mensagem "Carregando..."
        })
        .catch(error => {
            console.error("Erro ao carregar os desejos:", error);
            loadingMessage.textContent = 'Erro ao carregar o jogo. Tente recarregar a página.';
        });
}

// Lógica de Login
loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch((error) => alert(`Erro ao logar: ${error.message}`));
});



// Lógica de Cadastro
registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { return alert('Por favor, preencha o email e a senha.'); }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => db.collection('usuarios').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            partnerId: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }))
        .catch(error => alert(`Erro no cadastro: ${error.message}`));
});

// Lógica de Logout
logoutBtn.addEventListener('click', () => { auth.signOut(); });

// Lógica de Conexão
connectPartnerBtn.addEventListener('click', () => {
    const partnerCode = partnerCodeInput.value.trim();
    if (!partnerCode) { return alert("Por favor, insira o código do seu parceiro."); }

    const currentUser = auth.currentUser;
    if (!currentUser) { return alert("Erro: você não está logado."); }

    currentUser.getIdToken(true).then(idToken => {
        const functionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/connectPartners`;

        fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({ data: { partnerId: partnerCode } })
        })
        .then(response => {
            if (!response.ok) { return response.json().then(err => { throw new Error(err.error.message); }); }
            return response.json();
        })
        .then(result => {
            console.log("SUCESSO!", result);
            alert("Parabéns, vocês estão conectados!");
        })
        .catch(error => {
            console.error("ERRO na chamada manual:", error);
            alert(`Ocorreu um erro: ${error.message}`);
        });
    });
});


// Vigia de Autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        authContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        welcomeMessage.textContent = `Bem-vindo(a), ${user.email}`;

        const userDocRef = db.collection('usuarios').doc(user.uid);
        userDocRef.onSnapshot(doc => {
            if (doc.exists) {
                const userData = doc.data();
                userInviteCode.textContent = userData.uid;

                if (userData.partnerId) {
                    partnerConnectionSection.style.display = 'none';
                    cardGameSection.style.display = 'block';
                    welcomeMessage.textContent = `Bem-vindo(a), ${user.email} | Conectado(a)!`;
                    
                    // ==========================================================
                    // ATUALIZAÇÃO: Chama a função para carregar o jogo!
                    // ==========================================================
                    carregarJogo(user.uid, userData.partnerId);

                } else {
                    partnerConnectionSection.style.display = 'block';
                    cardGameSection.style.display = 'none';
                }
            }
        });
    } else {
        authContainer.style.display = 'block';
        gameContainer.style.display = 'none';
    }
});