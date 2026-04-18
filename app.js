import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// फोटो स्टोरेज के लिए जरूरी इम्पोर्ट
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

// उम्र निकालने का फंक्शन
function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// 1. लॉगिन स्टेटस चेक
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) { showDashboard(); } 
        else { 
            document.getElementById('login-card').style.display = 'none';
            document.getElementById('profile-container').style.display = 'block'; 
        }
    } else {
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
    }
});

document.getElementById('login-btn').addEventListener('click', () => signInWithPopup(auth, provider));

// 2. डेटा और फोटो सुरक्षित करने का फंक्शन
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;

    const saveBtn = document.getElementById('save-profile-btn');
    const photoFile = document.getElementById('user-photo-file').files[0];
    let photoURL = document.getElementById('user-photo-url').value; // पुरानी फोटो अगर है

    saveBtn.innerText = "सुरक्षित हो रहा है...";
    saveBtn.disabled = true;

    try {
        // अगर नई फोटो चुनी गई है तो अपलोड करें
        if (photoFile) {
            const storageRef = ref(storage, 'profiles/' + user.uid);
            await uploadBytes(storageRef, photoFile);
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
        alert("जानकारी सुरक्षित कर ली गई है!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// 3. डैशबोर्ड फंक्शन
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const list = document.getElementById('users-list');
    list.innerHTML = "<p style='text-align:center;'>लोड हो रहा है...</p>";

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
                    <h3 style="margin:0;">${d.name}</h3>
                    <p style="margin:2px 0; font-size:12px; color:#666;">🚩 ${d.gotra} | 🎂 उम्र: ${age}</p>
                    <p style="margin:2px 0; font-size:12px; color:#e67e22;">📍 ${d.cur_address?.dist || '---'}</p>
                    <div style="margin-top:8px;">
                        <a href="https://wa.me/${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:5px 12px; border-radius:15px; font-size:12px;">💬 मैसेज करें</a>
                    </div>
                </div>
            </div>`;
    });
}

// 4. एडिट बटन का काम (अब यह काम करेगा!)
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

        document.getElementById('dashboard-container').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';
        document.getElementById('cancel-edit-btn').style.display = 'block';
    }
});

document.getElementById('cancel-edit-btn').addEventListener('click', showDashboard);

// 5. सर्च फिल्टर
document.getElementById('searchInput').addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#users-list .profile-card');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'flex' : 'none';
    });
});

// 6. लॉगआउट
document.getElementById('logout-btn-header').addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});
