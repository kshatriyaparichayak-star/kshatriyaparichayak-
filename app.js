import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, deleteDoc, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

const adminEmail = "kshatriyaparichayak@gmail.com"; 

// --- 1. Referral Lock Logic (इनवाइट सुरक्षा) ---
const urlParams = new URLSearchParams(window.location.search);
const inviteCode = urlParams.get('ref');

// --- Cloudinary फोटो अपलोड ---
async function uploadToFreeCloud(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset'); 
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/dzwsmzvmd/image/upload`, {
            method: 'POST', body: formData
        });
        const result = await response.json();
        return result.secure_url;
    } catch (err) {
        throw new Error("फोटो अपलोड विफल!");
    }
}

function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

// --- 2. नोटिफिकेशन सेटअप (FCM) ---
async function setupNotifications(userUid) {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const messaging = getMessaging();
            // आपकी VAPID Key
            const token = await getToken(messaging, { vapidKey: 'BDJ7sjXj2uKwSKzbc2zkqMQqSz2SExNWVgpBq1QoBmObtZsy5Ag8QtphQzHLODcdZb8jzZhLlE63_SRx-OBO4qQ' });
            if (token) {
                await setDoc(doc(db, "users", userUid), { fcmToken: token }, { merge: true });
            }
        }
    } catch (error) {
        console.log("Notification Setup Error:", error);
    }
}

// --- 3. लॉगिन मॉनिटर ---
onAuthStateChanged(auth, async (user) => {
    const header = document.getElementById('app-header');
    const loginBtn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('invite-error-msg');

    if (user) {
        if (header) header.style.display = 'flex';
        setupNotifications(user.uid); // लॉगिन होते ही नोटिफिकेशन ऑन करें
        listenForAlerts(); // अलर्ट सुनना शुरू करें

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) { 
            showDashboard(); 
        } else { 
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block'; 
        }
    } else {
        if (header) header.style.display = 'none';
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'none';

        // इनवाइट कोड के बिना लॉगिन बटन छिपा दें (Admin Master Key: ?ref=admin)
        if (!inviteCode && inviteCode !== 'admin') {
            loginBtn.style.display = 'none';
            errorMsg.style.display = 'block';
        } else {
            loginBtn.style.display = 'inline-block';
            errorMsg.style.display = 'none';
        }
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

// --- 4. डेटा सुरक्षित करना ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const saveBtn = document.getElementById('save-profile-btn');
    const photoInput = document.getElementById('user-photo-file');
    let photoURL = document.getElementById('user-photo-url').value;

    saveBtn.innerText = "प्रोसेसिंग..."; saveBtn.disabled = true;

    try {
        if (photoInput.files[0]) photoURL = await uploadToFreeCloud(photoInput.files[0]);
        
        const userDocRef = doc(db, "users", user.uid);
        const existingDoc = await getDoc(userDocRef);
        
        let invites = 11;
        if (user.email === adminEmail) invites = 999999;
        else if (existingDoc.exists() && existingDoc.data().inviteCount !== undefined) {
            invites = existingDoc.data().inviteCount;
        }

        const data = {
            photo: photoURL, name: document.getElementById('user-name').value,
            father: document.getElementById('user-father').value, dob: document.getElementById('user-dob').value,
            gotra: document.getElementById('user-gotra').value, phone: document.getElementById('user-phone').value,
            blood: document.getElementById('user-blood').value, profession: document.getElementById('user-profession').value,
            mul_address: {
                gram: document.getElementById('mul-gram').value, dist: document.getElementById('mul-dist').value, state: document.getElementById('mul-state').value
            },
            cur_address: {
                gram: document.getElementById('cur-gram').value, dist: document.getElementById('cur-dist').value, state: document.getElementById('cur-state').value
            },
            uid: user.uid, timestamp: Date.now(), inviteCount: invites, email: user.email
        };
        
        await setDoc(userDocRef, data, { merge: true });
        alert("प्रोफाइल सुरक्षित हुई!"); showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें"; saveBtn.disabled = false;
    }
});

// --- 5. डैशबोर्ड रेंडरिंग ---
let allUsersData = {}; // लोकल डेटा सेव करने के लिए

async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';

    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    const myData = docSnap.data();
    const isAdmin = (user.email === adminEmail);

    const linkCountElement = document.getElementById('link-count');
    const adminPanel = document.getElementById('admin-tools');

    if (isAdmin) {
        linkCountElement.innerText = "अनलिमिटेड";
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        if (adminPanel) adminPanel.style.display = 'none';
        linkCountElement.innerText = myData.inviteCount || "11";
    }

    document.getElementById('display-my-name').innerText = myData.name || "विवरण भरें";
    document.getElementById('display-my-father').innerText = myData.father || "---";
    document.getElementById('display-my-age').innerText = calculateAge(myData.dob);
    document.getElementById('display-my-city').innerText = myData.cur_address?.dist || "शहर";
    document.getElementById('my-profile-pic').src = myData.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

    // सदस्यों की लिस्ट (View Details और Admin Delete के साथ)
    const qMembers = query(collection(db, "users"), orderBy("timestamp", "desc"));
    onSnapshot(qMembers, (snap) => {
        const list = document.getElementById('latest-members-list');
        list.innerHTML = "";
        snap.forEach(s => {
            const d = s.data();
            allUsersData[d.uid] = d; // डेटा लोकल सेव किया
            if(d.uid === user.uid) return; // खुद का कार्ड लिस्ट में न दिखाएं

            const card = document.createElement('div');
            card.className = "profile-card";
            
            let adminDeleteBtn = isAdmin ? `<button onclick="deleteMember('${d.uid}')" style="background:red; color:white; border:none; padding:5px; border-radius:5px; margin-left:10px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>` : "";

            card.innerHTML = `
                <div class="profile-card-left">
                    <img src="${d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}">
                    <div>
                        <h4>${d.name}</h4>
                        <p>📍 ${d.cur_address?.dist || '---'} | 🩸 ${d.blood || '---'}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <button class="btn-view-details" onclick="openMemberDetails('${d.uid}')">विवरण देखें</button>
                    ${adminDeleteBtn}
                </div>`;
            list.appendChild(card);
        });
    });

    // सर्च
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.profile-card');
        cards.forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });

    new Swiper('.swiper-emergency', { loop: true, pagination: { el: '.swiper-pagination' } });
    new Swiper('.swiper-notice', { loop: true, pagination: { el: '.swiper-pagination' } });
}

// --- 6. व्यू डिटेल्स (पॉप-अप लॉजिक) ---
window.openMemberDetails = (uid) => {
    const d = allUsersData[uid];
    if(!d) return;

    const modalContent = document.getElementById('member-detail-content');
    modalContent.innerHTML = `
        <div class="modal-cover-img">
            <img src="${d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" class="det-img">
        </div>
        <div class="det-body">
            <h2 class="det-name">${d.name}</h2>
            <p class="det-prof"><i class="fa-solid fa-briefcase"></i> ${d.profession || 'व्यवसाय उपलब्ध नहीं'}</p>
            
            <div class="det-grid">
                <div class="det-item"><strong>पिता का नाम:</strong> ${d.father || '---'}</div>
                <div class="det-item"><strong>गोत्र:</strong> ${d.gotra || '---'}</div>
                <div class="det-item"><strong>उम्र:</strong> ${calculateAge(d.dob)} वर्ष</div>
                <div class="det-item"><strong>ब्लड ग्रुप:</strong> ${d.blood || '---'}</div>
                <div class="det-item"><strong>मूल निवास:</strong> ${d.mul_address?.dist || '---'}</div>
                <div class="det-item"><strong>वर्तमान निवास:</strong> ${d.cur_address?.dist || '---'}</div>
            </div>
            
            <button class="btn-msg" onclick="alert('इंटरनल मैसेजिंग फीचर जल्द ही आ रहा है!')">
                <i class="fa-solid fa-envelope"></i> मैसेज भेजें
            </button>
        </div>
    `;
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('member-detail-modal').style.display = 'block';
};

// --- 7. एडमिन पॉवर: सदस्य डिलीट करना ---
window.deleteMember = async (uid) => {
    if(confirm("चेतावनी: क्या आप सच में इस सदस्य को समाज से हटाना चाहते हैं?")) {
        await deleteDoc(doc(db, "users", uid));
        alert("सदस्य को सफलतापूर्वक हटा दिया गया है।");
    }
};

// --- 8. शेयर लिंक (Referral) ---
window.shareAppLink = async () => {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    const data = docSnap.data();

    if (user.email !== adminEmail && data.inviteCount <= 0) {
        alert("आपके लिंक की सीमा समाप्त हो गई है!"); return;
    }

    const shareText = `🚩 जय श्री राम! 🚩\nक्षत्रिय परिचायक समाज ऐप से जुड़ने के लिए आमंत्रित हैं।\nसुरक्षित लिंक: https://kshatriyaparichayak-star.github.io/kshatriyaparichayak-/?ref=${user.uid}`;
    
    if (navigator.share) {
        await navigator.share({ title: 'क्षत्रिय परिचायक', text: shareText });
        if (user.email !== adminEmail) {
            await setDoc(userDocRef, { inviteCount: data.inviteCount - 1 }, { merge: true });
            document.getElementById('link-count').innerText = data.inviteCount - 1;
        }
    } else {
        alert("लिंक कॉपी करें: \n" + shareText);
    }
};

// --- 9. अलर्ट और नोटिस सिस्टम ---
document.getElementById('submit-alert-btn').addEventListener('click', async () => {
    const text = document.getElementById('alert-msg-input').value;
    const user = auth.currentUser;
    const d = allUsersData[user.uid];
    if(!text) return;

    const btn = document.getElementById('submit-alert-btn');
    btn.innerText = "भेजा जा रहा है..."; btn.disabled = true;

    try {
        await addDoc(collection(db, "alerts"), {
            msg: text,
            senderName: d.name,
            timestamp: serverTimestamp()
        });
        alert("आपका अलर्ट पूरे समाज को भेज दिया गया है!");
        document.getElementById('alert-msg-input').value = "";
        document.getElementById('modal-overlay').click(); // मोडल बंद करें
    } catch (e) {
        console.error(e); alert("त्रुटि!");
    } finally {
        btn.innerText = "🚨 अलर्ट ब्रॉडकास्ट करें"; btn.disabled = false;
    }
});

function listenForAlerts() {
    // बैकग्राउंड में नए अलर्ट सुनना
    const qAlerts = query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(5));
    let initialLoad = true;

    onSnapshot(qAlerts, (snap) => {
        const slider = document.getElementById('emergency-slides');
        slider.innerHTML = "";
        
        if(snap.empty) {
            slider.innerHTML = `<div class="swiper-slide empty-slide">अभी कोई आपातकालीन अलर्ट नहीं है।</div>`;
        } else {
            snap.forEach(doc => {
                const data = doc.data();
                slider.innerHTML += `<div class="swiper-slide" style="background:#ffdddd; padding:15px; border-radius:10px; border:1px solid red; font-size:14px;"><b>🚨 ${data.senderName}</b>: ${data.msg}</div>`;
                
                // अगर कोई नया अलर्ट आता है (और यह पहला लोड नहीं है)
                if(!initialLoad) {
                    if (Notification.permission === "granted") {
                        new Notification("🚩 इमरजेंसी अलर्ट!", { body: `${data.senderName}: ${data.msg}`, icon: "logo.png" });
                    }
                }
            });
        }
        initialLoad = false;
    });
}

// --- एडिट और लॉगआउट ---
document.getElementById('edit-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('user-name').value = d.name || '';
        document.getElementById('user-father').value = d.father || '';
        document.getElementById('user-dob').value = d.dob || '';
        document.getElementById('user-gotra').value = d.gotra || '';
        document.getElementById('user-phone').value = d.phone || '';
        document.getElementById('user-photo-url').value = d.photo || '';
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';
    }
});

window.updateNotice = async () => {
    const text = document.getElementById('notice-input').value;
    if(text) {
        await setDoc(doc(db, "settings", "notice"), { text: text });
        alert("सूचना अपडेट हुई!"); document.getElementById('notice-input').value = "";
    }
};

document.getElementById('logout-btn-header').addEventListener('click', () => signOut(auth).then(() => location.reload()));
