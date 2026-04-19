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

// --- लॉगिन लॉजिक ---
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
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

// --- डेटा सेव करना ---
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
            inviteCount: 11 // डिफ़ॉल्ट लिंक लिमिट
        };
        await setDoc(doc(db, "users", user.uid), data);
        alert("प्रोफाइल सुरक्षित हुई!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// --- डैशबोर्ड और फीचर्स ---
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';

    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const myData = userDoc.data();

    // 1. अपनी प्रोफाइल अपडेट करें
    document.getElementById('display-my-name').innerText = myData.name;
    document.getElementById('display-my-father').innerText = myData.father;
    document.getElementById('display-my-age').innerText = calculateAge(myData.dob);
    document.getElementById('display-my-city').innerText = myData.cur_address.dist;
    document.getElementById('my-profile-pic').src = myData.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    document.getElementById('link-count').innerText = (user.email === adminEmail) ? "अनलिमिटेड" : (myData.inviteCount || 0);

    // 2. एडमिन चेक
    if (user.email === adminEmail) {
        document.getElementById('admin-tools').style.display = 'block';
    }

    // 3. लेटेस्ट 5 सदस्य लोड करें
    const q = query(collection(db, "users"), orderBy("timestamp", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('latest-members-list');
        list.innerHTML = "";
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const card = document.createElement('div');
            card.className = "profile-card";
            card.innerHTML = `
                <img src="${d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width:55px; height:55px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <h4 style="margin:0;">${d.name}</h4>
                    <p style="margin:2px 0; font-size:11px;">🎂 ${calculateAge(d.dob)} वर्ष | ${d.profession || 'समाज सेवी'}</p>
                    <p style="margin:2px 0; font-size:11px; color:#ff8c00;">📍 ${d.cur_address.dist}</p>
                    <div style="margin-top:5px;">
                        <button class="msg-btn" onclick="window.open('https://wa.me/91${d.phone}')" style="background:#25D366; color:white; border:none; padding:3px 8px; border-radius:5px; font-size:10px;">Message</button>
                        <button class="view-btn" style="background:#3498db; color:white; border:none; padding:3px 8px; border-radius:5px; font-size:10px; margin-left:5px;">विवरण</button>
                    </div>
                </div>`;
            list.appendChild(card);
        });
    });

    // 4. स्लाइडर्स लोड करना (इमरजेंसी और सूचना)
    loadSliders();
}

// --- स्लाइडर्स का डेटा ---
function loadSliders() {
    // यहाँ हम Firebase से डेटा लाएंगे (उदाहरण के लिए 9 स्लाइड्स)
    // अभी के लिए इसे स्वाइपर इनिशियलाइज़ करने के लिए इस्तेमाल कर रहे हैं
    new Swiper('.swiper-emergency', { pagination: { el: '.swiper-pagination' }, loop: true });
    new Swiper('.swiper-notice', { pagination: { el: '.swiper-pagination' }, loop: true });
}

// --- सदस्य जोड़ने का लिंक ---
window.shareAppLink = async () => {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.data();

    if (user.email !== adminEmail && data.inviteCount <= 0) {
        alert("आपके लिंक की सीमा समाप्त हो गई है!");
        return;
    }

    const shareText = `🚩 क्षत्रिय परिचायक ऐप 🚩\nसमाज से जुड़ने के लिए नीचे दिए गए लिंक से रजिस्टर करें:\nhttps://kshatriyaparichayak-star.github.io/kshatriyaparichayak-/`;
    
    if (navigator.share) {
        navigator.share({ title: 'क्षत्रिय परिचायक', text: shareText });
        if (user.email !== adminEmail) {
            await setDoc(doc(db, "users", user.uid), { inviteCount: data.inviteCount - 1 }, { merge: true });
        }
    } else {
        alert("लिंक कॉपी करें: " + shareText);
    }
};

// --- एडिट बटन ---
document.getElementById('edit-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const d = userDoc.data();
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

document.getElementById('logout-btn-header').addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});
