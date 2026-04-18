import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

// --- 1. फोटो को छोटा (Compress) करने का फंक्शन ---
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.7);
            };
        };
    });
}

// --- 2. उम्र निकालने का फंक्शन ---
function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// --- 3. फील्ड्स को लॉक/अनलॉक करने का फंक्शन ---
function setFieldsReadOnly(isReadOnly) {
    const fields = [
        'user-name', 'user-father', 'user-dob', 
        'user-gotra', 'user-blood', 
        'mul-gram', 'mul-dist', 'mul-state'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (isReadOnly) {
                el.readOnly = true;
                if(el.tagName === 'SELECT') el.disabled = true;
            } else {
                el.readOnly = false;
                if(el.tagName === 'SELECT') el.disabled = false;
            }
        }
    });
}

// लॉगिन स्टेटस चेक
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

// --- 4. डेटा और कंप्रेस्ड फोटो सुरक्षित करना ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;

    const saveBtn = document.getElementById('save-profile-btn');
    const photoInput = document.getElementById('user-photo-file');
    let photoURL = document.getElementById('user-photo-url').value;

    saveBtn.innerText = "तेजी से सुरक्षित हो रहा है...";
    saveBtn.disabled = true;

    try {
        if (photoInput.files[0]) {
            const compressedBlob = await compressImage(photoInput.files[0]);
            const storageRef = ref(storage, 'profiles/' + user.uid);
            await uploadBytes(storageRef, compressedBlob);
            photoURL = await getDownloadURL(storageRef);
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
        alert("जानकारी सुरक्षित हो गई!");
        document.getElementById('user-photo-file').value = ""; // फाइल इनपुट को खाली करने के लिए

        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// --- 5. डैशबोर्ड ---
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>सूची तैयार हो रही है...</p>";

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
                    <p style="margin:2px 0; font-size:12px; color:#666;">🚩 ${d.gotra} | 🎂 उम्र: ${age}</p>
                    <p style="margin:2px 0; font-size:12px; color:#e67e22;">📍 ${d.cur_address?.dist || '---'}</p>
                    <div style="margin-top:8px;">
                        <a href="https://wa.me/${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:5px 12px; border-radius:15px; font-size:12px; display:inline-block;">💬 व्हाट्सएप</a>
                    </div>
                </div>
            </div>`;
    });
}

// --- 6. एडिट बटन (सुरक्षा लॉक के साथ) ---
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

        setFieldsReadOnly(true); // स्थाई जानकारी लॉक करें

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
