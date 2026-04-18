import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// उम्र निकालने का फंक्शन
function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// 1. यूजर के लॉगिन स्टेटस की जांच
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) { 
            showDashboard(); 
        } else { 
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block'; 
        }
    } else {
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'none';
        document.getElementById('logout-btn-header').style.display = 'none';
    }
});

// 2. लॉगिन बटन
document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

// 3. डेटा सुरक्षित (Save/Update) करने का फंक्शन
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;

    const name = document.getElementById('user-name').value.trim();
    if(!name) { alert("कृपया कम से कम नाम ज़रूर भरें"); return; }

    const data = {
        photo: document.getElementById('user-photo').value,
        name: name,
        father: document.getElementById('user-father').value,
        dob: document.getElementById('user-dob').value,
        gotra: document.getElementById('user-gotra').value,
        phone: document.getElementById('user-phone').value,
        blood: document.getElementById('user-blood').value,
        profession: document.getElementById('user-profession').value,
        mul_address: { 
            gram: document.getElementById('mul-gram').value, 
            dist: document.getElementById('mul-dist').value, 
            state: document.getElementById('mul-state').value 
        },
        cur_address: { 
            gram: document.getElementById('cur-gram').value, 
            dist: document.getElementById('cur-dist').value, 
            state: document.getElementById('cur-state').value 
        },
        uid: user.uid,
        lastUpdated: new Date()
    };

    try {
        await setDoc(doc(db, "users", user.uid), data);
        alert("प्रोफाइल सुरक्षित हो गई!");
        showDashboard();
    } catch (e) {
        alert("Error: " + e.message);
    }
});

// 4. डैशबोर्ड (लिस्ट) दिखाने का फंक्शन
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';
    document.getElementById('cancel-edit-btn').style.display = 'none'; // फॉर्म का कैंसिल बटन छुपाएं

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>लोड हो रहा है...</p>";

    try {
        const snapshot = await getDocs(collection(db, "users"));
        list.innerHTML = "";
        
        snapshot.forEach(doc => {
            const d = doc.data();
            const age = calculateAge(d.dob);
            const userImg = d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

            list.innerHTML += `
                <div class="profile-card" style="margin-bottom:15px; padding:15px; background:white; border-radius:12px; display:flex; gap:15px; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <img src="${userImg}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid #ff8c00;">
                    <div style="flex:1;">
                        <h3 style="margin:0; font-size:18px;">${d.name}</h3>
                        <p style="margin:2px 0; font-size:13px; color:#555;">पिता: ${d.father || '---'}</p>
                        <p style="margin:2px 0; font-size:12px;">🚩 ${d.gotra} | 🎂 उम्र: ${age} | 🩸 ${d.blood || '?'}</p>
                        <p style="margin:2px 0; font-size:12px; color:#e67e22;">📍 वर्तमान जिला: ${d.cur_address?.dist || '---'}</p>
                        <p style="margin:2px 0; font-size:12px; font-style:italic;">💼 ${d.profession || '---'}</p>
                        <div style="margin-top:8px;">
                            <a href="https://wa.me/${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:5px 12px; border-radius:15px; font-size:12px; display:inline-block;">💬 मैसेज करें</a>
                        </div>
                    </div>
                </div>`;
        });
    } catch (err) {
        list.innerHTML = "<p>डेटा लोड करने में विफल।</p>";
    }
}

// 5. एडिट प्रोफाइल फंक्शन (बटन क्लिक पर)
document.getElementById('edit-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const d = userDoc.data();
        
        // फॉर्म में डेटा भरना
        document.getElementById('user-photo').value = d.photo || '';
        document.getElementById('user-name').value = d.name || '';
        document.getElementById('user-father').value = d.father || '';
        document.getElementById('user-dob').value = d.dob || '';
        document.getElementById('user-gotra').value = d.gotra || '';
        document.getElementById('user-phone').value = d.phone || '';
        document.getElementById('user-blood').value = d.blood || '';
        document.getElementById('user-profession').value = d.profession || '';
        
        document.getElementById('mul-gram').value = d.mul_address?.gram || '';
        document.getElementById('mul-dist').value = d.mul_address?.dist || '';
        document.getElementById('mul-state').value = d.mul_address?.state || '';
        
        document.getElementById('cur-gram').value = d.cur_address?.gram || '';
        document.getElementById('cur-dist').value = d.cur_address?.dist || '';
        document.getElementById('cur-state').value = d.cur_address?.state || '';

        // फॉर्म दिखाओ और डैशबोर्ड छुपाओ
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';
        document.getElementById('cancel-edit-btn').style.display = 'block'; // कैंसिल बटन दिखाएं
    }
});

// 6. कैंसिल बटन (एडिट के दौरान वापस जाने के लिए)
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    showDashboard();
});

// 7. सर्च फिल्टर
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#users-list .profile-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
    });
});

// 8. लॉगआउट
document.getElementById('logout-btn-header').addEventListener('click', () => {
    if(confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
        signOut(auth).then(() => location.reload());
    }
});
