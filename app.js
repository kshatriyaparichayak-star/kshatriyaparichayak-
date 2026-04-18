import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. यूजर के लॉगिन स्टेटस पर नजर रखें
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // चेक करें कि क्या यूजर की प्रोफाइल पहले से बनी है
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            // अगर प्रोफाइल है, तो सीधा डैशबोर्ड दिखाओ
            showDashboard();
        } else {
            // अगर प्रोफाइल नहीं है, तो फॉर्म दिखाओ
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block';
        }
    } else {
        // अगर लॉगिन नहीं है
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'none';
        document.getElementById('logout-btn-header').style.display = 'none';
    }
});

// 2. लॉगिन बटन फंक्शन
document.getElementById('login-btn').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("लॉगिन एरर: " + error.message);
    }
});

// 3. डेटा सुरक्षित (Save) करने का फंक्शन
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('user-name').value.trim();
    const gotra = document.getElementById('user-gotra').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const village = document.getElementById('user-village').value.trim();

    if (!name || !gotra || !phone || !village) {
        alert("कृपया सभी जानकारी भरें");
        return;
    }

    const userData = {
        name: name,
        gotra: gotra,
        phone: phone,
        village: village,
        uid: user.uid,
        timestamp: new Date()
    };

    try {
        await setDoc(doc(db, "users", user.uid), userData);
        alert("प्रोफाइल सुरक्षित हो गई!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    }
});

// 4. डैशबोर्ड (सदस्यों की लिस्ट) दिखाने का फंक्शन
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>सदस्यों की सूची लोड हो रही है...</p>";

    try {
        const snapshot = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        
        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="profile-card" style="border-left: 5px solid #ff8c00; margin-bottom: 15px; padding: 15px; background: #fff; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h3 style="margin:0; color: #333;">${d.name}</h3>
                    <p style="margin:8px 0; font-size:14px; color: #666;">
                        🚩 <b>गोत्र:</b> ${d.gotra} <br>
                        🏠 <b>गाँव:</b> ${d.village}
                    </p>
                    <a href="tel:${d.phone}" style="display: inline-block; text-decoration:none; color:white; background:#27ae60; padding: 6px 15px; border-radius: 20px; font-size: 14px; font-weight:bold;">📞 कॉल करें</a>
                </div>`;
        });
    } catch (err) {
        console.error("Data load error:", err);
        list.innerHTML = "<p>डेटा लोड करने में समस्या आई।</p>";
    }
}

// 5. सर्च फिल्टर (नाम या गाँव से खोजें)
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.profile-card');
    
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(term)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// 6. लॉगआउट बटन
document.getElementById('logout-btn-header').addEventListener('click', () => {
    if (confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
        signOut(auth).then(() => {
            location.reload();
        });
    }
});
