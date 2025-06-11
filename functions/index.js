const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.connectPartners = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Você precisa estar logado para fazer isso.");
  }
  const currentUserId = context.auth.uid;
  const partnerIdToConnect = data.partnerId;
  if (!partnerIdToConnect || currentUserId === partnerIdToConnect) {
    throw new functions.https.HttpsError("invalid-argument", "Código de parceiro inválido.");
  }
  const db = admin.firestore();
  const currentUserRef = db.collection("usuarios").doc(currentUserId);
  const partnerUserRef = db.collection("usuarios").doc(partnerIdToConnect);

  try {
    await db.runTransaction(async (transaction) => {
      const partnerUserDoc = await transaction.get(partnerUserRef);
      if (!partnerUserDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Parceiro com este código não foi encontrado.");
      }
      const currentUserDoc = await transaction.get(currentUserRef);
      if (!currentUserDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Seu próprio perfil de usuário não foi encontrado.");
      }
      const currentUserData = currentUserDoc.data();
      const partnerUserData = partnerUserDoc.data();
      if (currentUserData.partnerId || partnerUserData.partnerId) {
        throw new functions.https.HttpsError("already-exists", "Um de vocês já está conectado a outra pessoa.");
      }
      transaction.update(currentUserRef, { partnerId: partnerIdToConnect });
      transaction.update(partnerUserRef, { partnerId: currentUserId });
    });
    return { message: "Parceiros conectados com sucesso!" };
  } catch (error) {
    functions.logger.error("A transação falhou com um erro:", error);
    throw error;
  }
});