// =======================
// GLOBAL DEĞİŞKENLER
// =======================
let selectedImageFile = null;
let materialsData = [];
let isSubmitting = false;

// =======================
// FIREBASE IMPORTLARI
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// =======================
// FIREBASE CONFIG
// =======================
const firebaseConfig = {
    apiKey: "AIzaSyCdOJZIlWUWigzW_9-Bi77f_ll_k9zZ5GU",
    authDomain: "pn-katalog-v2-fa1d0.firebaseapp.com",
    projectId: "pn-katalog-v2-fa1d0",
    storageBucket: "pn-katalog-v2-fa1d0.appspot.com",
    messagingSenderId: "89223612336",
    appId: "1:89223612336:web:fa7fc9e04e1470ea7ab875"
};

// =======================
// FIREBASE INIT
// =======================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// =======================
// RESİM YÜKLEME (KİLİTLİ)
// =======================
async function uploadImage(file) {
    // Submit dışı upload engeli
    if (!isSubmitting) {
        throw new Error("Submit dışı upload engellendi");
    }

    // File doğrulaması
    if (!(file instanceof File)) {
        throw new Error("Geçersiz dosya tipi (File değil)");
    }

    console.log("1. Yükleme başlıyor...");

    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const storageRef = ref(storage, `images/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("2. Yükleme başarılı:", downloadURL);
    return downloadURL;
}

// =======================
// FORM SUBMIT
// =======================
const addForm = document.getElementById("addForm");
const submitBtn = document.getElementById("submitBtn");

if (addForm) {
    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        isSubmitting = true;

        submitBtn.disabled = true;
        submitBtn.innerText = "Kaydediliyor...";

        try {
            const name = document.getElementById("mName").value.trim();
            const pn = document.getElementById("mPartNumber").value.trim();
            const category = document.getElementById("mCategory").value;
            const aircraft = document.getElementById("mAircraft").value;
            const note = document.getElementById("mNote").value || "-";

            let imgUrl =
                "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg";

            if (selectedImageFile instanceof File) {
                submitBtn.innerText = "Resim Yükleniyor...";
                imgUrl = await uploadImage(selectedImageFile);
            }

            submitBtn.innerText = "Veritabanına Yazılıyor...";

            await addDoc(collection(db, "materials"), {
                name,
                partNumber: pn,
                category,
                aircraft,
                note,
                imageUrl: imgUrl,
                createdAt: new Date()
            });

            alert("Kayıt Başarılı!");

            addForm.reset();
            selectedImageFile = null;

            const display = document.getElementById("fileNameDisplay");
            if (display) {
                display.innerText = "Henüz resim seçilmedi.";
                display.className = "text-muted fst-italic text-center mt-2";
            }

            loadMaterials();

        } catch (err) {
            console.error("KAYIT HATASI:", err);
            alert(err.message);
        } finally {
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerText = "Kaydet";
        }
    });
}

// =======================
// VERİ ÇEKME
// =======================
async function loadMaterials() {
    const listContainer = document.getElementById("catalogList");
    if (listContainer) {
        listContainer.innerHTML = "<div class='text-center'>Yükleniyor...</div>";
    }

    try {
        const q = query(
            collection(db, "materials"),
            orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        materialsData = [];

        snap.forEach((doc) => {
            materialsData.push({ id: doc.id, ...doc.data() });
        });

        renderMaterials(materialsData);

    } catch (err) {
        console.error("VERİ ÇEKME HATASI:", err);
        if (listContainer) {
            listContainer.innerHTML =
                "<div class='text-danger'>Veriler yüklenemedi</div>";
        }
    }
}

// =======================
// RENDER
// =======================
function renderMaterials(data) {
    const listContainer = document.getElementById("catalogList");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    if (data.length === 0) {
        listContainer.innerHTML =
            "<div class='col-12 text-center'>Kayıt yok</div>";
        return;
    }

    data.forEach((item) => {
        listContainer.innerHTML += `
        <div class="col-lg-6 col-12">
            <div class="material-card shadow-sm">
                <div class="material-img-wrapper">
                    <img src="${item.imageUrl}" loading="lazy">
                </div>
                <div class="material-content">
                    <div><b>Malzeme:</b> ${item.name}</div>
                    <div><b>PN:</b> ${item.partNumber}</div>
                    <div><b>Kategori:</b> ${item.category}</div>
                    <div><b>Uçak:</b> ${item.aircraft}</div>
                    <div><b>Not:</b> ${item.note}</div>
                </div>
            </div>
        </div>`;
    });
}

// =======================
// FİLTRE
// =======================
window.filterData = function () {
    const cat = document.getElementById("filterCategory").value;
    const air = document.getElementById("filterAircraft").value;
    const term = document.getElementById("searchInput").value.toLowerCase();

    const filtered = materialsData.filter((i) => {
        const t =
            (i.name || "").toLowerCase() +
            (i.partNumber || "").toLowerCase() +
            (i.note || "").toLowerCase();

        return (
            (cat === "Hepsi" || i.category === cat) &&
            (air === "Hepsi" || i.aircraft === air) &&
            t.includes(term)
        );
    });

    renderMaterials(filtered);
};

// =======================
// DOSYA SEÇİMİ
// =======================
function handleFileSelect(e) {
    const file = e.target.files?.[0];

    if (file instanceof File) {
        selectedImageFile = file;

        const d = document.getElementById("fileNameDisplay");
        if (d) {
            d.innerText = `Seçilen Dosya: ${file.name}`;
            d.className = "text-success fw-bold text-center mt-2";
        }
    }
}

document.getElementById("inputCamera")?.addEventListener("change", handleFileSelect);
document.getElementById("inputGallery")?.addEventListener("change", handleFileSelect);

document.addEventListener("DOMContentLoaded", loadMaterials);
