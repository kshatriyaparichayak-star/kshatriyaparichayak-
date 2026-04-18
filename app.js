import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- एडमिन ईमेल ---
const adminEmail = "kshatriyaparichayak@gmail.com"; 

// --- Cloudinary फोटो अपलोड ---
async function uploadToFreeCloud(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset'); 
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/dzsh8xvre/image/upload`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        return result.secure_url;
    } catch (err) {
        throw new Error("फोटो अपलोड विफल");
    }
}

function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

// लॉगिन और डेटा चेक
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

// नोटिस बोर्ड लोड करना (Real-time)
function loadNotice() {
    onSnapshot(doc(db, "settings", "notice"), (doc) => {
        const noticeArea = document.getElementById('notice-display');
        if (doc.exists()) {
            noticeArea.innerHTML = `<marquee style="color:white; font-weight:bold;">${doc.data().text}</marquee>`;
        }
    });
}

// डेटा सेव करना
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
            cur_address: { dist: document.getElementById('cur-dist').value },
            uid: user.uid
        };
        await setDoc(doc(db, "users", user.uid), data);
        alert("प्रोफाइल सुरक्षित!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// डैशबोर्ड और एडमिन फीचर्स
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const user = auth.currentUser;
    const list = document.getElementById('users-list');
    
    // एडमिन पैनल चेक
    if (user.email === adminEmail) {
        document.getElementById('admin-tools').style.display = 'block';
    }

    loadNotice();

    const snapshot = await getDocs(collection(db, "users"));
    list.innerHTML = "";
    
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const isAdmin = user.email === adminEmail;
        const card = document.createElement('div');
        card.className = "profile-card";
        card.style = "margin-bottom:15px; padding:15px; background:white; border-radius:12px; display:flex; gap:15px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.1); border-left: 5px solid #ff8c00;";
        
        card.innerHTML = `
            <img src="${d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #ff8c00;">
            <div style="flex:1;">
                <h3 style="margin:0; font-size:16px;">${d.name}</h3>
                <p style="margin:2px 0; font-size:12px;">🚩 ${d.gotra} | 🎂 ${calculateAge(d.dob)} वर्ष</p>
                <p style="margin:2px 0; font-size:12px; color:#e67e22; font-weight:bold;">📍 ${d.cur_address?.dist || '---'}</p>
                <div style="margin-top:5px;">
                    <a href="https://wa.me/91${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:4px 10px; border-radius:10px; font-size:11px;">WhatsApp</a>
                    ${isAdmin ? `<button class="del-btn" data-id="${docSnap.id}" style="background:#e74c3c; color:white; border:none; padding:4px 10px; border-radius:10px; font-size:11px; margin-left:5px;">Delete</button>` : ''}
                </div>
            </div>`;
        list.appendChild(card);
    });

    // Delete Logic
    document.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async (e) => {
            if(confirm("क्या आप इस सदस्य को हटाना चाहते हैं?")) {
                await deleteDoc(doc(db, "users", e.target.dataset.id));
                showDashboard();
            }
        };
    });
}

// एडमिन द्वारा नोटिस अपडेट करना
window.updateNotice = async () => {
    const text = document.getElementById('notice-input').value;
    if(text) {
        await setDoc(doc(db, "settings", "notice"), { text: text });
        alert("सूचना अपडेट हो गई!");
    }
};

document.getElementById('logout-btn-header').addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});
