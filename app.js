import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function uploadToFreeCloud(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset'); // मैंने इसे आसान बनाया है

    try {
        // 'demo' की जगह आप अपनी क्लाउड आईडी भी डाल सकते हैं, अभी चेक करने के लिए यह काम करेगा
        const response = await fetch(`https://api.cloudinary.com/v1_1/dzsh8xvre/image/upload`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        return result.secure_url;
    } catch (err) {
        console.error("Upload Error:", err);
        throw err;
    }
}

function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function setFieldsReadOnly(isReadOnly) {
    const fields = ['user-name', 'user-father', 'user-dob', 'user-gotra', 'user-blood', 'mul-gram', 'mul-dist', 'mul-state'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = isReadOnly;
            if(el.tagName === 'SELECT') el.disabled = isReadOnly;
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) { showDashboard(); } 
        else { 
            setFieldsReadOnly(false);
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block'; 
        }
    } else {
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;

    const saveBtn = document.getElementById('save-profile-btn');
    const photoInput = document.getElementById('user-photo-file');
    let photoURL = document.getElementById('user-photo-url').value;

    saveBtn.innerText = "प्रोफाइल फोटो सुरक्षित हो रही है...";
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
            uid: user.uid
        };

        await setDoc(doc(db, "users", user.uid), data);
        alert("बधाई हो! आपकी प्रोफाइल सुरक्षित हो गई है।");
        document.getElementById('user-photo-file').value = "";
        showDashboard();
    } catch (e) {
        alert("त्रुटि: फोटो अपलोड नहीं हो सकी। कृपया इंटरनेट चेक करें।");
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>समाज की सूची लोड हो रही है...</p>";

    const snapshot = await getDocs(collection(db, "users"));
    list.innerHTML = "";
    
    snapshot.forEach(doc => {
        const d = doc.data();
        const age = calculateAge(d.dob);
        const userImg = d.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        list.innerHTML += `
            <div class="profile-card" style="margin-bottom:15px; padding:15px; background:white; border-radius:12px; display:flex; gap:15px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.1); border-left: 5px solid #ff8c00;">
                <img src="${userImg}" style="width:75px; height:75px; border-radius:50%; object-fit:cover; border:2px solid #ff8c00; background: #eee;">
                <div style="flex:1;">
                    <h3 style="margin:0; color: #333;">${d.name}</h3>
                    <p style="margin:2px 0; font-size:13px; color:#555;">🚩 ${d.gotra} | 🎂 ${age} वर्ष</p>
                    <p style="margin:2px 0; font-size:12px; color:#e67e22; font-weight: bold;">📍 ${d.cur_address?.dist || '---'}</p>
                    <div style="margin-top:10px;">
                        <a href="https://wa.me/91${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:6px 15px; border-radius:20px; font-size:12px; font-weight: bold; display:inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">💬 व्हाट्सएप</a>
                    </div>
                </div>
            </div>`;
    });
}

document.getElementById('edit-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
        const d = userDoc.data();
        document.getElementById('user-photo-url').value = d.photo || '';
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

        setFieldsReadOnly(true);

        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';
        document.getElementById('cancel-edit-btn').style.display = 'block';
    }
});

document.getElementById('cancel-edit-btn').addEventListener('click', showDashboard);

document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#users-list .profile-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
    });
});

document.getElementById('logout-btn-header').addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});
