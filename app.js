// Firebase Modüllerini İçe Aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- KONFİGÜRASYON (Bunu kendi bilgilerinizle değiştirin) ---
const firebaseConfig = {
  apiKey: "AIzaSyCdOJZIlWUWigzW_9-Bi77f_ll_k9zZ5GU",
  authDomain: "pn-katalog-v2-fa1d0.firebaseapp.com",
  projectId: "pn-katalog-v2-fa1d0",
  storageBucket: "pn-katalog-v2-fa1d0.firebasestorage.app",
  messagingSenderId: "89223612336",
  appId: "1:89223612336:web:fa7fc9e04e1470ea7ab875"
};

// Uygulamayı Başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Global Değişkenler
let materialsData = []; // Filtreleme için veriyi burada tutacağız

// --- 1. RESİM SIKIŞTIRMA VE YÜKLEME ---
async function uploadImage(file) {
    // Sıkıştırma ayarları
    const options = {
        maxSizeMB: 0.1,          // Hedef: 100KB altı
        maxWidthOrHeight: 800,   // Maksimum genişlik/yükseklik
        useWebWorker: true
    };

    try {
        console.log("Resim sıkıştırılıyor...");
        const compressedFile = await imageCompression(file, options);
        
        // Storage Referansı (images/zaman_dosyaAdi)
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `images/${fileName}`);

        // Yükleme
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;

    } catch (error) {
        console.error("Resim hatası:", error);
        throw error;
    }
}

// --- 2. VERİ EKLEME (Form Submit) ---
const addForm = document.getElementById('addForm');
const submitBtn = document.getElementById('submitBtn');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Kaydediliyor...";

    try {
        // Form verilerini al
        const name = document.getElementById('mName').value;
        const pn = document.getElementById('mPartNumber').value;
        const category = document.getElementById('mCategory').value;
        const aircraft = document.getElementById('mAircraft').value;
        const note = document.getElementById('mNote').value || "-";
        const imageFile = document.getElementById('mImage').files[0];

        // Önce resmi sıkıştır ve yükle, URL'i al
        const imgUrl = await uploadImage(imageFile);

        // Firestore'a veriyi kaydet
        await addDoc(collection(db, "materials"), {
            name: name,
            partNumber: pn,
            category: category,
            aircraft: aircraft,
            note: note,
            imageUrl: imgUrl,
            createdAt: new Date()
        });

        alert("Malzeme başarıyla eklendi!");
        addForm.reset();
        loadMaterials(); // Listeyi yenile

    } catch (error) {
        console.error("Hata:", error);
        alert("Bir hata oluştu: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Kaydet";
    }
});

// --- 3. VERİLERİ ÇEKME VE LİSTELEME ---
async function loadMaterials() {
    const listContainer = document.getElementById('catalogList');
    listContainer.innerHTML = '<div class="text-center">Yükleniyor...</div>';
    
    try {
        const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        materialsData = []; // Arrayi sıfırla
        querySnapshot.forEach((doc) => {
            materialsData.push({ id: doc.id, ...doc.data() });
        });

        renderMaterials(materialsData);

    } catch (error) {
        console.error("Veri çekme hatası:", error);
        listContainer.innerHTML = '<div class="text-danger">Veriler yüklenemedi.</div>';
    }
}

// --- 4. HTML OLUŞTURMA (RENDER) ---
function renderMaterials(data) {
    const listContainer = document.getElementById('catalogList');
    listContainer.innerHTML = ""; // Temizle

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-center">Kayıt bulunamadı.</div>';
        return;
    }

    data.forEach(item => {
        // Kart HTML Yapısı
        const cardHTML = `
            <div class="col-lg-6 col-12"> <div class="material-card shadow-sm">
                    <div class="material-img-wrapper">
                        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy">
                    </div>
                    <div class="material-content">
                        <div><span class="label-bold">Malzeme İsmi:</span> <span class="text-value">${item.name}</span></div>
                        <div><span class="label-bold">Part Number:</span> <span class="text-value">${item.partNumber}</span></div>
                        <div><span class="label-bold">Kategori:</span> <span class="text-value">${item.category}</span></div>
                        <div><span class="label-bold">Uçak Tipi:</span> <span class="text-value">${item.aircraft}</span></div>
                        <div><span class="label-bold">Not:</span> <span class="text-value">${item.note}</span></div>
                    </div>
                </div>
            </div>
        `;
        listContainer.innerHTML += cardHTML;
    });
}

// --- 5. FİLTRELEME ---
window.filterData = function() {
    const selectedCat = document.getElementById('filterCategory').value;
    const selectedAir = document.getElementById('filterAircraft').value;

    const filtered = materialsData.filter(item => {
        const catMatch = (selectedCat === "Hepsi") || (item.category === selectedCat);
        const airMatch = (selectedAir === "Hepsi") || (item.aircraft === selectedAir);
        return catMatch && airMatch;
    });

    renderMaterials(filtered);
};

// Sayfa açıldığında verileri yükle
document.addEventListener('DOMContentLoaded', loadMaterials);
