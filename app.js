let selectedImageFile = null; // Dosyayı burada tutacağız

// Firebase Modüllerini İçe Aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- KONFİGÜRASYON (Bunu kendi bilgilerinizle değiştirin) ---
const firebaseConfig = {
  apiKey: "AIzaSyCdOJZIlWUWigzW_9-Bi77f_ll_k9zZ5GU",
  authDomain: "pn-katalog-v2-fa1d0.firebaseapp.com",
  projectId: "pn-katalog-v2-fa1d0",
  storageBucket: "pn-katalog-v2-fa1d0.appspot.com",
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
        const compressedFile = await window.imageCompression(file, options);
        
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
       // ... form verilerini al kısmı ...
        const imageFile = selectedImageFile;
        
        // Varsayılan resim (Eğer resim yüklenmezse bu görünür)
        let imgUrl = "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg"; 

        // Eğer kullanıcı bir dosya seçtiyse yükleme işlemini yap
        if (imageFile) {
             imgUrl = await uploadImage(imageFile);
        }

        // Firestore'a veriyi kaydet
        await addDoc(collection(db, "materials"), {
            name: name,
            partNumber: pn,
            category: category,
            aircraft: aircraft,
            note: note,
            imageUrl: imgUrl, // Ya yüklenen resim ya da varsayılan resim gider
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



// --- 5. GELİŞMİŞ FİLTRELEME (Kategori + Uçak Tipi + Arama) ---
window.filterData = function() {
    // 1. Dropdown değerlerini al
    const selectedCat = document.getElementById('filterCategory').value;
    const selectedAir = document.getElementById('filterAircraft').value;
    
    // 2. Arama kutusundaki değeri al ve küçük harfe çevir (büyük/küçük harf duyarlılığını kaldırmak için)
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    // 3. Veriyi filtrele
    const filtered = materialsData.filter(item => {
        // Kategori Eşleşmesi
        const catMatch = (selectedCat === "Hepsi") || (item.category === selectedCat);
        
        // Uçak Tipi Eşleşmesi
        const airMatch = (selectedAir === "Hepsi") || (item.aircraft === selectedAir);

        // Metin Arama Eşleşmesi (İsim, PN veya Not içinde)
        // (Veri yoksa boş string kabul et ki hata vermesin)
        const nameText = (item.name || "").toLowerCase();
        const pnText = (item.partNumber || "").toLowerCase();
        const noteText = (item.note || "").toLowerCase();

        const searchMatch = nameText.includes(searchTerm) || 
                            pnText.includes(searchTerm) || 
                            noteText.includes(searchTerm);

        // Üç koşul da sağlanmalı (AND mantığı)
        return catMatch && airMatch && searchMatch;
    });

    // 4. Sonuçları ekrana bas
    renderMaterials(filtered);
};

// Sayfa açıldığında verileri yükle
document.addEventListener('DOMContentLoaded', loadMaterials);

// --- 6. YENİ DOSYA SEÇİM MANTIĞI (KAMERA VE GALERİ) ---

// Ortak dosya işleme fonksiyonu
function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (file) {
        selectedImageFile = file; // Global değişkene ata
        
        fileNameDisplay.innerText = `Seçilen Dosya: ${file.name}`;
        fileNameDisplay.classList.remove('text-muted');
        fileNameDisplay.classList.add('text-success', 'fw-bold');
    }
}

// Kamera inputunu dinle
const camInput = document.getElementById('inputCamera');
if (camInput) camInput.addEventListener('change', handleFileSelect);

// Galeri inputunu dinle
const galInput = document.getElementById('inputGallery');
if (galInput) galInput.addEventListener('change', handleFileSelect);
