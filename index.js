const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');
const app = express();

// Firebase initialization
admin.initializeApp({
  databaseURL: "https://sajilokamai-72496-default-rtdb.firebaseio.com/"
});

const db = admin.database();
const SECRET_KEY = "1eb292ef5a5c266b2b3c59a6bc91774a"; // Timro Secret Key

app.use(express.json());

app.get('/', (req, res) => {
    res.send("Sajilo Kamai TimeWall Backend with Coins Support is Running!");
});

// TimeWall Postback Integration URL
app.get('/timewall-postback', async (req, res) => {
    const { userID, transactionID, revenue, currencyAmount, hash, type } = req.query;

    // Security check: Hash verify gareko falsified request block garna
    const expectedHash = crypto
        .createHash('sha256')
        .update(userID + revenue + SECRET_KEY)
        .digest('hex');

    if (hash !== expectedHash) {
        return res.status(401).send("Unauthorized: Hash match bhayena");
    }

    try {
        // Firebase database data modification rules
        const userRef = db.ref(`users/${userID}`);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).send("User database ma bheteyena");
        }

        const userData = snapshot.val();
        
        // Timro database key format 'balance' integer storage context check
        let currentBalance = parseInt(userData.balance || 0);
        let coinsAmount = parseInt(currencyAmount);

        // Lifecycle stage automation: 'credit' bhaye coins thapne, 'chargeback' bhaye ghataune
        if (type === 'credit') {
            currentBalance += coinsAmount;
        } else if (type === 'chargeback') {
            currentBalance += coinsAmount; // Negative value automated logic thapida direct subtraction huncha
        }

        // Realtime Database direct save criteria execution
        await userRef.update({ balance: currentBalance });
        return res.status(200).send("OK");

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is perfectly listening on port ${PORT}`));
