import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const adminEmail = "kshatriyaparichayak@gmail.com"; 

// --- Cloudinary फोटो अपलोड ---
async function uploadToFreeCloud(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset'); 
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/dzwsmzvmd/image/upload`, {
            method: 'POST',
            body: formData
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

// --- लॉगिन मॉनिटर (Header & UI Control) ---
onAuthStateChanged(auth, async (user) => {
    const header = document.getElementById('app-header');
    if (user) {
        if (header) header.style.display = 'flex'; // लॉगिन के बाद हेडर दिखाएँ
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) { 
            showDashboard(); 
        } else { 
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block'; 
        }
    } else {
        if (header) header.style.display = 'none'; // लॉगिन न होने पर हेडर छिपाएँ
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'none';
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

// --- डेटा सुरक्षित करना ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const saveBtn = document.getElementById('save-profile-btn');
    const photoInput = document.getElementById('user-photo-file');
    let photoURL = document.getElementById('user-photo-url').value;

    saveBtn.innerText = "प्रोसेसिंग...";
    saveBtn.disabled = true;

    try {
        if (photoInput.files[0]) {
            photoURL = await uploadToFreeCloud(photoInput.files[0]);
        }
        
        const userDocRef = doc(db, "users", user.uid);
        const existingDoc = await getDoc(userDocRef);
        
        // नए यूजर के लिए 11 और एडमिन के लिए 999999
        let invites = 11;
        if (user.email === adminEmail) invites = 999999;
        else if (existingDoc.exists()) invites = existingDoc.data().inviteCount;

        const data = {
            photo: photoURL,
            name: document.getElementById('user-name').value,
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
            timestamp: Date.now(),
            inviteCount: invites
        };
        
        await setDoc(userDocRef, data, { merge: true });
        alert("प्रोफाइल सुरक्षित हुई!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// --- डैशबोर्ड रेंडरिंग ---
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';

    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    const myData = docSnap.data();

    const linkCountElement = document.getElementById('link-count');
    const adminPanel = document.getElementById('admin-tools');

    // 1. इनवाइट और एडमिन लॉजिक
    if (user.email === adminEmail) {
        linkCountElement.innerText = "अनलिमिटेड";
        if (adminPanel) adminPanel.style.display = 'block';
    } else {
        if (adminPanel) adminPanel.style.display = 'none';
        if (myData.inviteCount === undefined) {
            await setDoc(userDocRef, { inviteCount: 11 }, { merge: true });
            linkCountElement.innerText = "11";
        } else {
            linkCountElement.innerText = myData.inviteCount;
        }
    }

    // 2. प्रोफाइल डेटा डिस्प्ले
    document.getElementById('display-my-name').innerText = myData.name || "विवरण भरें";
    document.getElementById('display-my-father').innerText = myData.father || "---";
    document.getElementById('display-my-age').innerText = calculateAge(myData.dob);
    document.getElementById('display-my-city').innerText = myData.cur_address?.dist || "शहर";
    document.getElementById('my-profile-pic').src = myData.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

    // 3. लेटेस्ट 5 सदस्य
    const qMembers = query(collection(db, "users"), orderBy("timestamp", "desc"), limit(5));
    onSnapshot(qMembers, (snap) => {
        const list = document.getElementById('latest-members-list');
        list.innerHTML = "";
        snap.forEach(s => {
            const d = s.data();
            const card = document.createElement('div');
            card.className = "profile-card";
            card.innerHTML = `
                <img src="${d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <h4 style="margin:0;">${d.name}</h4>
                    <p style="margin:2px 0; font-size:11px;">📍 ${d.cur_address?.dist || '---'} | 🎂 ${calculateAge(d.dob)} वर्ष</p>
                    <button onclick="window.open('https://wa.me/91${d.phone}')" style="background:#25D366; color:white; border:none; padding:3px 8px; border-radius:5px; font-size:10px; cursor:pointer;">Message</button>
                </div>`;
            list.appendChild(card);
        });
    });

    // 4. सर्च बार फंक्शन
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.profile-card');
        cards.forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });

    // 5. स्वाइपर चालू करना
    new Swiper('.swiper-emergency', { loop: true, pagination: { el: '.swiper-pagination' } });
    new Swiper('.swiper-notice', { loop: true, pagination: { el: '.swiper-pagination' } });
}

// --- शेयर लिंक ---
window.shareAppLink = async () => {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    const data = docSnap.data();

    if (user.email !== adminEmail && data.inviteCount <= 0) {
        alert("आपके लिंक की सीमा समाप्त हो गई है!"); return;
    }

    const shareText = `🚩 क्षत्रिय परिचायक समाज ऐप 🚩\nसमाज से जुड़ने के लिए नीचे दिए गए लिंक से रजिस्टर करें:\nhttps://kshatriyaparichayak-star.github.io/kshatriyaparichayak-/`;
    
    if (navigator.share) {
        await navigator.share({ title: 'क्षत्रिय परिचायक', text: shareText });
        if (user.email !== adminEmail) {
            await setDoc(userDocRef, { inviteCount: data.inviteCount - 1 }, { merge: true });
            document.getElementById('link-count').innerText = data.inviteCount - 1;
        }
    } else {
        alert("लिंक कॉपी करें: " + shareText);
    }
};

// --- एडिट प्रोफाइल ---
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

// --- नोटिस बोर्ड अपडेट (Admin Only) ---
window.updateNotice = async () => {
    const text = document.getElementById('notice-input').value;
    if(text) {
        await setDoc(doc(db, "settings", "notice"), { text: text });
        alert("सूचना अपडेट हुई!");
        document.getElementById('notice-input').value = "";
    }
};

document.getElementById('logout-btn-header').addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});
