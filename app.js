import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. चेक करें कि यूजर पहले से लॉगिन है या नहीं (Auto-Login)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // अगर लॉगिन है, तो सीधे डैशबोर्ड दिखाओ
        showDashboard();
    } else {
        // अगर लॉगिन नहीं है, तो लॉगिन कार्ड दिखाओ
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
    }
});

// 2. लॉगिन बटन
document.getElementById('login-btn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("लॉगिन एरर: " + error.message);
    }
});

// 3. डेटा सेव करने का फंक्शन
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userData = {
        name: document.getElementById('user-name').value,
        gotra: document.getElementById('user-gotra').value,
        phone: document.getElementById('user-phone').value,
        village: document.getElementById('user-village').value,
        uid: user.uid,
        timestamp: new Date()
    };

    try {
        await setDoc(doc(db, "users", user.uid), userData);
        alert("प्रोफाइल सुरक्षित हो गई!");
        showDashboard();
    } catch (e) {
        alert("Error: " + e.message);
    }
});

// 4. डैशबोर्ड (लिस्ट दिखाने) का फंक्शन
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>लोड हो रहा है...</p>";

    try {
        const snapshot = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="profile-card" style="border-left: 5px solid #e67e22; margin-bottom: 10px;">
                    <h3 style="margin:0;">${d.name}</h3>
                    <p style="margin:5px 0; font-size:14px;">गोत्र: ${d.gotra} | गाँव: ${d.village}</p>
                    <a href="tel:${d.phone}" style="text-decoration:none; color:#27ae60; font-weight:bold;">📞 कॉल करें</a>
                </div>`;
        });
    } catch (err) {
        console.error(err);
    }
}
