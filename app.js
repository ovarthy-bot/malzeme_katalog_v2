// =======================
// FIREBASE IMPORTLARI
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // onAuthStateChanged ekledik
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// =======================
// GLOBAL DEĞİŞKENLER
// =======================
let selectedImageFile = null;
let materialsData = [];
let isSubmitting = false;

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
// 1. ÖNCE UYGULAMAYI BAŞLAT (SIRALAMA ÖNEMLİ!)
// =======================
const app = initializeApp(firebaseConfig); // <-- BU ARTIK EN ÜSTTE
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =======================
// 2. ANONİM GİRİŞ VE VERİ YÜKLEME
// =======================
// Sayfa açılır açılmaz veriyi çekme, ÖNCE giriş yapmasını bekle.
signInAnonymously(auth)
  .then(() => {
    console.log("Anonim giriş başarılı, veriler çekiliyor...");
    // loadMaterials(); // Buradan çağırabiliriz veya onAuthStateChanged kullanabiliriz (daha güvenli):
  })
  .catch((error) => {
    console.error("Giriş Hatası:", error);
    document.getElementById("catalogList").innerHTML = '<div class="text-danger">Giriş yapılamadı, veriler yüklenemiyor.</div>';
  });

// Kullanıcı durumu değiştiğinde (Giriş yapıldığında) veriyi çek
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Kullanıcı doğrulandı, şimdi verileri çekebiliriz
    loadMaterials();
  }
});

// =======================
// RESİM YÜKLEME (KİLİTLİ)
// =======================
async function uploadImage(file) {
    if (!isSubmitting) throw new Error("Submit dışı upload engellendi");
    if (!(file instanceof File)) throw new Error("Geçersiz dosya tipi");

    console.log("1. Yükleme başlıyor...");
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const storageRef = ref(storage, `images/${fileName}`);

    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

// =======================
// FORM SUBMIT
// =======================
const addForm = document.getElementById("addForm");
const submitBtn = document.getElementById("submitBtn");

if (addForm) {
    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Giriş yapılı mı kontrol et
        if (!auth.currentUser) {
            alert("Sistem bağlantısı yok (Auth eksik). Lütfen sayfayı yenileyin.");
            return;
        }

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.innerText = "Kaydediliyor...";

        try {
            const name = document.getElementById("mName").value.trim();
            const pn = document.getElementById("mPartNumber").value.trim();
            const category = document.getElementById("mCategory").value;
            const aircraft = document.getElementById("mAircraft").value;
            const note = document.getElementById("mNote").value || "-";

            let imgUrl = "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg";

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
                createdAt: new Date(),
                userId: auth.currentUser.uid // Kimin eklediğini de kaydedelim
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
            alert("Hata: " + err.message);
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
    if (listContainer) listContainer.innerHTML = "<div class='text-center'>Yükleniyor...</div>";

    try {
        const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        materialsData = [];
        snap.forEach((doc) => {
            materialsData.push({ id: doc.id, ...doc.data() });
        });

        renderMaterials(materialsData);
    } catch (err) {
        console.error("VERİ ÇEKME HATASI:", err);
        // Hata detayını ekrana yazdıralım ki görelim
        if (listContainer) listContainer.innerHTML = `<div class='text-danger text-center'>Veriler yüklenemedi.<br><small>${err.code || err.message}</small></div>`;
    }
}

// =======================
// RENDER FONKSİYONU
// =======================
function renderMaterials(data) {
    const listContainer = document.getElementById("catalogList");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    if (data.length === 0) {
        listContainer.innerHTML = "<div class='col-12 text-center'>Kayıt yok</div>";
        return;
    }

    data.forEach((item) => {
        listContainer.innerHTML += `
        <div class="col-lg-6 col-12">
            <div class="material-card shadow-sm">
                <div class="material-img-wrapper">
                    <img src="${item.imageUrl}" loading="lazy" alt="${item.name}">
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
// FİLTRELEME
// =======================
window.filterData = function () {
    const cat = document.getElementById("filterCategory").value;
    const air = document.getElementById("filterAircraft").value;
    const term = document.getElementById("searchInput").value.toLowerCase();

    const filtered = materialsData.filter((i) => {
        const t = (i.name || "").toLowerCase() + (i.partNumber || "").toLowerCase() + (i.note || "").toLowerCase();
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

// DİKKAT: document.addEventListener("DOMContentLoaded", loadMaterials); SATIRINI SİLDİK.
// Artık veriyi 'onAuthStateChanged' içinde çağırıyoruz.
