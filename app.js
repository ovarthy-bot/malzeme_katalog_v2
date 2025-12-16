import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs,
    deleteDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* FIREBASE */
const firebaseConfig = {
    apiKey: "AIzaSyDgFmtEiKYuzQifzggyimdVgWfGHILFX7g",
    authDomain: "pn-katalog-v2-99886.firebaseapp.com",
    projectId: "pn-katalog-v2-99886",
    storageBucket: "pn-katalog-v2-99886.firebasestorage.app",
    messagingSenderId: "471134585410",
    appId: "1:471134585410:web:64012ec2209d3432f063db"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/* GLOBAL */
let allMaterials = [];
let editId = null;
let editImageUrl = null;

/* DOM */
const addForm = document.getElementById("addForm");
const catalogList = document.getElementById("catalogList");
const loadingOverlay = document.getElementById("loadingOverlay");

const fileCamera = document.getElementById("fileCamera");
const fileGallery = document.getElementById("fileGallery");
const inpFile = document.getElementById("inpFile");

btnCamera.onclick = () => fileCamera.click();
btnGallery.onclick = () => fileGallery.click();

[fileCamera, fileGallery].forEach(i => {
    i.onchange = e => inpFile.files = e.target.files;
});

/* FETCH */
async function fetchMaterials() {
    showLoading(true);
    const snap = await getDocs(collection(db, "materials"));
    allMaterials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    showLoading(false);
}

function render() {
    
    catalogList.innerHTML = "";
    allMaterials.forEach(m => {
        catalogList.innerHTML += `
        <div class="col">
            <div class="card h-100">

<img src="${m.imageUrl}" 
     class="card-img-top" 
     style="cursor: zoom-in;" 
     onclick="viewImage('${m.imageUrl}')" 
     title="Büyütmek için tıkla">
     
                <div class="card-body">
                    <span class="badge bg-primary">${m.category}</span>
                    <span class="badge bg-dark">${m.aircraft}</span>
                    <h5 class="mt-2">${m.name}</h5>
                    <small>P/N: ${m.pn}</small>
                    <p class="small">${m.note || ""}</p>

                    <div class="d-flex gap-2">
                        <button class="btn btn-warning btn-sm w-50"
                            onclick="editMaterial('${m.id}')">Düzenle</button>
                        <button class="btn btn-danger btn-sm w-50"
                            onclick="deleteMaterial('${m.id}','${m.imageUrl}')">Sil</button>
                    </div>
                </div>
            </div>
        </div>`;
    });
}

/* SEARCH + FILTER */

document.getElementById("btnFilter").onclick = applyFilters;
document.getElementById("searchInput").onkeyup = applyFilters;
document.getElementById("filterCategory").onchange = applyFilters;
document.getElementById("filterAircraft").onchange = applyFilters;

function applyFilters() {
    const text = searchInput.value.toLowerCase();
    const cat = filterCategory.value;
    const ac = filterAircraft.value;

    const filtered = allMaterials.filter(m => {

        const matchesText =
            m.name.toLowerCase().includes(text) ||
            m.pn.toLowerCase().includes(text) ||
            (m.note && m.note.toLowerCase().includes(text));

        const matchesCat = !cat || m.category === cat;
        const matchesAc = !ac || m.aircraft === ac;

        return matchesText && matchesCat && matchesAc;
    });

    renderFiltered(filtered);
}

function renderFiltered(list) {
    catalogList.innerHTML = "";

    if (!list.length) {
        catalogList.innerHTML =
            `<div class="col-12 text-center mt-5">
                <h6>Kayıt bulunamadı</h6>
             </div>`;
        return;
    }

    list.forEach(m => {
        catalogList.innerHTML += `
        <div class="col">
            <div class="card h-100">
            
<img src="${m.imageUrl}" 
     class="card-img-top" 
     style="cursor: zoom-in;" 
     onclick="viewImage('${m.imageUrl}')" 
     title="Büyütmek için tıkla">
                <div class="card-body">
                    <span class="badge bg-primary">${m.category}</span>
                    <span class="badge bg-dark">${m.aircraft}</span>
                    <h5 class="mt-2">${m.name}</h5>
                    <small>P/N: ${m.pn}</small>
                    <p class="small">${m.note || ""}</p>

                    <div class="d-flex gap-2">
                        <button class="btn btn-warning btn-sm w-50"
                            onclick="editMaterial('${m.id}')">Düzenle</button>
                        <button class="btn btn-danger btn-sm w-50"
                            onclick="deleteMaterial('${m.id}','${m.imageUrl}')">Sil</button>
                    </div>
                </div>
            </div>
        </div>`;
    });
}


window.editMaterial = id => {
    const m = allMaterials.find(x => x.id === id);
    editId = id;
    editImageUrl = m.imageUrl;

    inpName.value = m.name;
    inpPN.value = m.pn;
    inpCat.value = m.category;
    inpAircraft.value = m.aircraft;
    inpNote.value = m.note;

    inpFile.required = false;
    document.querySelector(".modal-title").innerText = "Malzeme Düzenle";
    new bootstrap.Modal(addModal).show();
};

window.deleteMaterial = async (id, img) => {
    if (!confirm("Silinsin mi?")) return;
    showLoading(true);

    try {
        // 1. Önce Firestore kaydını sil
        await deleteDoc(doc(db, "materials", id));

        // 2. Resmi Storage'dan sil (AMA SADECE VARSAYILAN RESİM DEĞİLSE)
        // Eğer resim linki 'no-image.png' içermiyorsa sil, içeriyorsa dokunma.
        if (img && !img.includes("no-image.png")) {
            await deleteObject(ref(storage, img));
        }

        fetchMaterials();
    } catch (error) {
        console.error("Silme hatası:", error);
        showLoading(false);
    }
};window.deleteMaterial = async (id, img) => {
    if (!confirm("Silinsin mi?")) return;
    showLoading(true);
    await deleteDoc(doc(db, "materials", id));
    await deleteObject(ref(storage, img));
    fetchMaterials();
};


/* SUBMIT */
addForm.onsubmit = e => {
    e.preventDefault();
    const file = inpFile.files[0];

    if (file) {
        // Resim varsa sıkıştır ve yükle
        new Compressor(file, {
            quality: 0.6,
            maxWidth: 1024,
            success(result) {
                upload(result);
            },
            error(err) {
                console.error("Sıkıştırma hatası:", err.message);
                // Hata olsa bile users'ı bekletmemek için null ile devam edilebilir veya hata gösterilir
                alert("Resim sıkıştırılamadı.");
            }
        });
    } else {
        // Resim seçilmedi (Hem yeni kayıt hem düzenleme için buraya düşer)
        // upload fonksiyonu içeride durumu yönetecek.
        upload(null);
    }
};

async function upload(file) {
    showLoading(true);

    let imageUrl = editImageUrl; // Düzenleme modundaysak mevcut resmi koru

    try {
        // SENARYO 1: Yeni kayıt yapılıyor ve dosya seçilmemiş
        if (!editId && !file) {
            // Firebase Storage ana dizinindeki no-image.png'nin linkini al
            const defaultImageRef = ref(storage, "no-image.png");
            imageUrl = await getDownloadURL(defaultImageRef);
        }

        // SENARYO 2: Dosya seçilmiş (Yeni veya Düzenleme)
        if (file) {
            // Eski resim varsa ve varsayılan resim değilse sil
            if (editImageUrl && !editImageUrl.includes("no-image.png")) {
                try {
                    await deleteObject(ref(storage, editImageUrl));
                } catch (err) {
                    console.warn("Eski resim silinemedi.", err);
                }
            }
            
            // Yeni resmi yükle
            const r = ref(storage, "images/" + Date.now() + "_" + file.name);
            const s = await uploadBytes(r, file);
            imageUrl = await getDownloadURL(s.ref);
        }

        // Veriyi hazırla
        const data = {
            name: inpName.value,
            pn: inpPN.value,
            category: inpCat.value,
            aircraft: inpAircraft.value,
            note: inpNote.value,
            imageUrl: imageUrl, // Artık burada mutlaka bir link var (yeni, eski veya varsayılan)
            createdAt: serverTimestamp()
        };

        // Firestore'a yaz
        if (editId) {
            await updateDoc(doc(db, "materials", editId), data);
        } else {
            await addDoc(collection(db, "materials"), data);
        }

        resetForm();
        fetchMaterials();

    } catch (error) {
        console.error("İşlem hatası:", error);
        alert("Bir hata oluştu: " + error.code || error.message);
        showLoading(false);
    }
}


/* HELPERS */
function resetForm() {
    addForm.reset();
    editId = null;
    editImageUrl = null;
    inpFile.required = false;
    document.querySelector(".modal-title").innerText = "Malzeme Ekle";
    bootstrap.Modal.getInstance(addModal).hide();
    showLoading(false);
}

function showLoading(v) {
    loadingOverlay.style.display = v ? "flex" : "none";
}



window.addEventListener("DOMContentLoaded", fetchMaterials);

// Resmi büyük gösteren fonksiyon
window.viewImage = (url) => {
    document.getElementById("fullImage").src = url;
    new bootstrap.Modal(document.getElementById('imageModal')).show();
};
