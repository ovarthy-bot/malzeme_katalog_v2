// Firebase Modüllerini İçe Aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- KONFİGÜRASYON ---
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
let materialsData = [];

// --- 1. RESİM SIKIŞTIRMA VE YÜKLEME ---
async function uploadImage(file) {
    // Sıkıştırma ayarları
    const options = {
        maxSizeMB: 0.1,          // 100KB civarı hedef
        maxWidthOrHeight: 800,   // Resim boyutunu küçült
        useWebWorker: true
    };

    try {
        console.log("Resim sıkıştırılıyor...");
        
        // Kütüphaneyi güvenli çağırma (window objesi üzerinden)
        let compressedFile = file;
        if (window.imageCompression) {
            compressedFile = await window.imageCompression(file, options);
        } else {
            console.warn("Sıkıştırma kütüphanesi yüklenemedi, orijinal dosya yükleniyor.");
        }
        
        // Dosya ismi (Türkçe karakter sorununu önlemek için encodeURI kullanılabilir veya basit timestamp)
// Mobil kamera uyumlu dosya adı üretimi
const fileExt = file.type.split('/')[1] || 'jpg';
const fileName = `${Date.now()}.${fileExt}`;
const storageRef = ref(storage, `images/${fileName}`);


        console.log("Firebase Storage'a yükleniyor...");
        
        // Yükleme işlemi
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log("Yükleme başarılı, URL:", downloadURL);
        return downloadURL;

    } catch (error) {
        console.error("Upload Hatası Detayı:", error);
        // Kullanıcıya hatayı göstermek için throw ediyoruz
        throw new Error("Resim yüklenirken hata oluştu: " + error.message);
    }
}

// --- 2. VERİ EKLEME (Form Submit) ---
const addForm = document.getElementById('addForm');
const submitBtn = document.getElementById('submitBtn');

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "İşleniyor...";

    try {
        const name = document.getElementById('mName').value;
        const pn = document.getElementById('mPartNumber').value;
        const category = document.getElementById('mCategory').value;
        const aircraft = document.getElementById('mAircraft').value;
        const note = document.getElementById('mNote').value || "-";
        const imageFile = document.getElementById('mImage').files[0];

        // Varsayılan resim
        let imgUrl = "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg"; 

        if (imageFile) {
             submitBtn.innerText = "Resim Yükleniyor...";
             imgUrl = await uploadImage(imageFile);
        }

        submitBtn.innerText = "Veri Kaydediliyor...";
        
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
        document.getElementById('fileNameDisplay').innerText = "Henüz resim seçilmedi.";
        document.getElementById('fileNameDisplay').className = "text-center mt-2 text-muted fst-italic";
        
        loadMaterials(); 

    } catch (error) {
        console.error("Genel Hata:", error);
        alert("HATA OLUŞTU:\n" + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Kaydet";
    }
});

// --- 3. VERİLERİ ÇEKME VE LİSTELEME ---
async function loadMaterials() {
    const listContainer = document.getElementById('catalogList');
    listContainer.innerHTML = '<div class="text-center w-100">Yükleniyor...</div>';
    
    try {
        const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        materialsData = []; 
        querySnapshot.forEach((doc) => {
            materialsData.push({ id: doc.id, ...doc.data() });
        });

        renderMaterials(materialsData);

    } catch (error) {
        console.error("Veri çekme hatası:", error);
        listContainer.innerHTML = '<div class="text-danger w-100 text-center">Veriler yüklenemedi. İnternet bağlantınızı kontrol edin.</div>';
    }
}

// --- 4. HTML OLUŞTURMA (RENDER) ---
function renderMaterials(data) {
    const listContainer = document.getElementById('catalogList');
    listContainer.innerHTML = ""; 

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-center">Kayıt bulunamadı.</div>';
        return;
    }

    data.forEach(item => {
        const cardHTML = `
            <div class="col-lg-6 col-12"> 
                <div class="material-card shadow-sm">
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
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    const filtered = materialsData.filter(item => {
        const catMatch = (selectedCat === "Hepsi") || (item.category === selectedCat);
        const airMatch = (selectedAir === "Hepsi") || (item.aircraft === selectedAir);
        
        const nameText = (item.name || "").toLowerCase();
        const pnText = (item.partNumber || "").toLowerCase();
        const noteText = (item.note || "").toLowerCase();

        const searchMatch = nameText.includes(searchTerm) || 
                            pnText.includes(searchTerm) || 
                            noteText.includes(searchTerm);

        return catMatch && airMatch && searchMatch;
    });

    renderMaterials(filtered);
};

// Sayfa Yüklenince
document.addEventListener('DOMContentLoaded', loadMaterials);

// --- 6. DOSYA SEÇİMİ GÖRSELLEŞTİRME ---
document.getElementById('mImage').addEventListener('change', function(event) {
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const file = event.target.files[0];

    if (file) {
        fileNameDisplay.innerText = `Seçilen Dosya: ${file.name}`;
        fileNameDisplay.classList.remove('text-muted');
        fileNameDisplay.classList.add('text-success', 'fw-bold');
    } else {
        fileNameDisplay.innerText = "Henüz resim seçilmedi.";
        fileNameDisplay.classList.add('text-muted');
        fileNameDisplay.classList.remove('text-success', 'fw-bold');
    }
});
