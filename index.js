const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');
const app = express();

// Firebase Admin Initialize garne
// (Render ko Environment Variables bata credentials line)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sajilokamai-72496-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const SECRET_KEY = "1eb292ef5a5c266b2b3c59a6bc91774a"; // Timro Secret Key

app.use(express.json());

// TimeWall Postback URL Endpoint
app.get('/timewall-postback', async (req, res) => {
    const { userID, transactionID, revenue, currencyAmount, hash, type } = req.query;

    // 1. Security Check: Hash match garcha ki nai herne
    const expectedHash = crypto
        .createHash('sha256')
        .update(userID + revenue + SECRET_KEY)
        .digest('hex');

    if (hash !== expectedHash) {
        return res.status(401).send("Unauthorized: Invalid Hash");
    }

    // 2. Main Logic: User ko account ma balance upade garne
    try {
        const userRef = db.ref(`users/${userID}`);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).send("User not found");
        }

        const userData = snapshot.val();
        let currentBalance = parseInt(userData.balance || 0);
        let amountToChange = parseInt(currencyAmount);

        if (type === 'credit') {
            currentBalance += amountToChange;
        } else if (type === 'chargeback') {
            currentBalance += amountToChange; // Negative value aaune bhako le + le nai deduct garcha
        }

        // Database ma balance update garne
        await userRef.update({ balance: currentBalance });

        // TimeWall lai success response pathaune
        return res.status(200).send("OK");

    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
