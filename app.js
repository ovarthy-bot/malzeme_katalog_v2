// --- FIREBASE KURULUMU ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// Global Değişken (Filtreleme için veriyi hafızada tutacağız)
let allMaterials = [];

// DOM Elementleri
const loadingOverlay = document.getElementById('loadingOverlay');
const addForm = document.getElementById('addForm');
const catalogList = document.getElementById('catalogList');

//Kamera galeri
const fileCamera = document.getElementById('fileCamera');
const fileGallery = document.getElementById('fileGallery');
const inpFile = document.getElementById('inpFile'); // mevcut input


// --- 1. VERİLERİ ÇEKME VE LİSTELEME ---
async function fetchMaterials() {
    showLoading(true);
    catalogList.innerHTML = '';
    
    try {
        // Tarihe göre yeniden eskiye sırala
        const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        allMaterials = [];
        querySnapshot.forEach((doc) => {
            allMaterials.push({ id: doc.id, ...doc.data() });
        });

        renderMaterials(allMaterials);
    } catch (error) {
        console.error("Veri çekme hatası:", error);
        alert("Veriler yüklenemedi!");
    } finally {
        showLoading(false);
    }
}

// Ekrana Kartları Basan Fonksiyon
function renderMaterials(dataList) {
    catalogList.innerHTML = "";
    
    if(dataList.length === 0) {
        catalogList.innerHTML = `<div class="col-12 text-center mt-5"><h5>Kayıt bulunamadı.</h5></div>`;
        return;
    }

    dataList.forEach(item => {
        const html = `
        <div class="col">
            <div class="card h-100 shadow-sm">
                <img src="${item.imageUrl}" class="card-img-top" alt="${item.name}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary">${item.category}</span>
                        <span class="badge bg-dark">${item.aircraft}</span>
                    </div>
                    <h5 class="card-title">${item.name}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">P/N: ${item.pn}</h6>
                    <p class="card-text small">${item.note}</p>
                </div>
            </div>
        </div>
        `;
        catalogList.innerHTML += html;
    });
}

// --- 2. YENİ MALZEME EKLEME (RESİM SIKIŞTIRMA DAHİL) ---
addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const file = document.getElementById('inpFile').files[0];
    if (!file) return;

    showLoading(true);

    // CompressorJS ile resmi sıkıştır
    new Compressor(file, {
        quality: 0.6, // Kaliteyi %60'a düşür
        maxWidth: 1024, // Genişliği max 1024px yap
        success(result) {
            uploadToFirebase(result);
        },
        error(err) {
            console.error(err.message);
            showLoading(false);
            alert("Resim sıkıştırma hatası!");
        },
    });
});

async function uploadToFirebase(compressedFile) {
    try {
        // 1. Resmi Storage'a yükle
        const storageRef = ref(storage, 'material-images/' + Date.now() + '_' + compressedFile.name);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 2. Veriyi Firestore'a kaydet
        const newMaterial = {
            name: document.getElementById('inpName').value,
            pn: document.getElementById('inpPN').value,
            category: document.getElementById('inpCat').value,
            aircraft: document.getElementById('inpAircraft').value,
            note: document.getElementById('inpNote').value,
            imageUrl: downloadURL,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "materials"), newMaterial);

        // 3. Formu temizle ve yenile
        addForm.reset();
        const modalEl = document.getElementById('addModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        
        fetchMaterials(); // Listeyi güncelle
        alert("Malzeme başarıyla eklendi!");

    } catch (error) {
        console.error("Yükleme hatası:", error);
        alert("Bir hata oluştu: " + error.message);
    } finally {
        showLoading(false);
    }
}

// --- 3. ARAMA VE FİLTRELEME ---
// Hem butona basınca hem de inputlara yazınca filtreleme tetiklensin
document.getElementById('btnFilter').addEventListener('click', applyFilters);
document.getElementById('searchInput').addEventListener('keyup', applyFilters);
document.getElementById('filterCategory').addEventListener('change', applyFilters);
document.getElementById('filterAircraft').addEventListener('change', applyFilters);
document.getElementById('btnCamera').onclick = () => fileCamera.click();
document.getElementById('btnGallery').onclick = () => fileGallery.click();

[fileCamera, fileGallery].forEach(input => {
  input.addEventListener('change', e => {
    inpFile.files = e.target.files;
  });
});

function applyFilters() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const catFilter = document.getElementById('filterCategory').value;
    const aircraftFilter = document.getElementById('filterAircraft').value;

    const filtered = allMaterials.filter(item => {
        // Arama Metni Kontrolü (Ad, P/N veya Not içinde)
        const matchesSearch = 
            item.name.toLowerCase().includes(searchText) || 
            item.pn.toLowerCase().includes(searchText) || 
            (item.note && item.note.toLowerCase().includes(searchText));

        // Kategori Kontrolü
        const matchesCat = catFilter === "" || item.category === catFilter;

        // Uçak Tipi Kontrolü
        const matchesAircraft = aircraftFilter === "" || item.aircraft === aircraftFilter;

        return matchesSearch && matchesCat && matchesAircraft;
    });

    renderMaterials(filtered);
}

// Yardımcı Fonksiyon
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Sayfa açıldığında verileri çek
window.addEventListener('DOMContentLoaded', fetchMaterials);
