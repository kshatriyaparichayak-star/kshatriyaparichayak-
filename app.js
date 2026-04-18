import { auth, db, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// फोटो अपलोड के लिए Storage इम्पोर्ट करें
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

function calculateAge(birthDate) {
    if(!birthDate) return "---";
    const dob = new Date(birthDate);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

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

// --- फोटो अपलोड और डेटा सेव करने का मुख्य फंक्शन ---
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if(!user) return;

    const name = document.getElementById('user-name').value.trim();
    const photoFile = document.getElementById('user-photo-file').files[0];
    let photoURL = "";

    // बटन को डिसेबल करें ताकि बार-बार क्लिक न हो
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.innerText = "अपलोड हो रहा है...";
    saveBtn.disabled = true;

    try {
        // 1. अगर फोटो चुनी गई है, तो उसे Firebase Storage में अपलोड करें
        if (photoFile) {
            const storageRef = ref(storage, 'profile_photos/' + user.uid);
            await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(storageRef);
        } else {
            // अगर फोटो नहीं चुनी, तो पुरानी वाली ही रहने दें (एडिट के समय)
            const oldDoc = await getDoc(doc(db, "users", user.uid));
            photoURL = oldDoc.exists() ? oldDoc.data().photo : "";
        }

        // 2. बाकी सारा डेटा Firestore में सेव करें
        const data = {
            photo: photoURL,
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
            uid: user.uid
        };

        await setDoc(doc(db, "users", user.uid), data);
        alert("प्रोफाइल सुरक्षित हो गई!");
        showDashboard();
    } catch (e) {
        alert("त्रुटि: " + e.message);
    } finally {
        saveBtn.innerText = "प्रोफाइल सुरक्षित करें";
        saveBtn.disabled = false;
    }
});

// डैशबोर्ड दिखाने का फंक्शन (बाकी वही रहेगा)
async function showDashboard() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('profile-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    document.getElementById('logout-btn-header').style.display = 'block';

    const list = document.getElementById('users-list');
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
                    <p style="margin:2px 0; font-size:13px; color:#555;">पिता: ${d.father || '---'}</p>
                    <p style="margin:2px 0; font-size:12px;">🚩 ${d.gotra} | 🎂 उम्र: ${age} | 🩸 ${d.blood || '?'}</p>
                    <p style="margin:2px 0; font-size:12px; color:#e67e22;">📍 वर्तमान जिला: ${d.cur_address?.dist || '---'}</p>
                    <div style="margin-top:8px;">
                        <a href="https://wa.me/${d.phone}" target="_blank" style="text-decoration:none; background:#25D366; color:white; padding:5px 12px; border-radius:15px; font-size:12px;">💬 मैसेज करें</a>
                    </div>
                </div>
            </div>`;
    });
}

// ... बाकी सर्च और लॉगआउट के बटन वैसे ही रहेंगे
