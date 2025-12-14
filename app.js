// --- GLOBAL DEĞİŞKEN (Resmi burada tutacağız) ---
let selectedImageFile = null; 

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

// --- 1. RESİM YÜKLEME FONKSİYONU (SADE VE GÜVENLİ) ---
async function uploadImage(file) {
    try {
        console.log("1. Yükleme başlıyor...");
        
        // Dosya ismini temizle
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileName = `${Date.now()}_${safeName}`;
        
        // Storage referansı
        const storageRef = ref(storage, `images/${fileName}`);

        // Dosyayı yükle
        const snapshot = await uploadBytes(storageRef, file);
        
        // Linki al
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("2. Yükleme başarılı: ", downloadURL);
        
        return downloadURL;

    } catch (error) {
        console.error("Yükleme Hatası:", error);
        throw error;
    }
}

// --- 2. VERİ EKLEME (Form Submit) ---
const addForm = document.getElementById('addForm');
const submitBtn = document.getElementById('submitBtn');

if(addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = "Kaydediliyor...";

        try {
            const name = document.getElementById('mName').value;
            const pn = document.getElementById('mPartNumber').value;
            const category = document.getElementById('mCategory').value;
            const aircraft = document.getElementById('mAircraft').value;
            const note = document.getElementById('mNote').value || "-";
            
            // --- DÜZELTME: Artık mImage yok, selectedImageFile kullanıyoruz ---
            const imageFile = selectedImageFile; 
            
            // Varsayılan resim
            let imgUrl = "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg"; 

            // Resim seçildiyse yükle
            if (imageFile) {
                 submitBtn.innerText = "Resim Yükleniyor...";
                 imgUrl = await uploadImage(imageFile);
            }

            submitBtn.innerText = "Veritabanına Yazılıyor...";

            // Firestore'a kaydet
            await addDoc(collection(db, "materials"), {
                name: name,
                partNumber: pn,
                category: category,
                aircraft: aircraft,
                note: note,
                imageUrl: imgUrl,
                createdAt: new Date()
            });

            alert("Kayıt Başarılı!");
            addForm.reset();
            
            // Seçimi sıfırla
            selectedImageFile = null;
            const display = document.getElementById('fileNameDisplay');
            if(display) {
                display.innerText = "Henüz resim seçilmedi.";
                display.classList.remove('text-success', 'fw-bold');
                display.classList.add('text-muted');
            }

            loadMaterials(); 

        } catch (error) {
            console.error("Hata:", error);
            alert("Bir hata oluştu: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Kaydet";
        }
    });
}

// --- 3. VERİLERİ ÇEKME ---
async function loadMaterials() {
    const listContainer = document.getElementById('catalogList');
    if(listContainer) listContainer.innerHTML = '<div class="text-center">Yükleniyor...</div>';
    
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
        if(listContainer) listContainer.innerHTML = '<div class="text-danger">Veriler yüklenemedi.</div>';
    }
}

// --- 4. HTML RENDER ---
function renderMaterials(data) {
    const listContainer = document.getElementById('catalogList');
    if(!listContainer) return;
    
    listContainer.innerHTML = ""; 

    if (data.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-center">Kayıt bulunamadı.</div>';
        return;
    }

    data.forEach(item => {
        const cardHTML = `
            <div class="col-lg-6 col-12"> <div class="material-card shadow-sm">
                    <div class="material-img-wrapper">
                        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy">
                    </div>
                    <div class="material-content">
                        <div><span class="label-bold">Malzeme:</span> ${item.name}</div>
                        <div><span class="label-bold">PN:</span> ${item.partNumber}</div>
                        <div><span class="label-bold">Kategori:</span> ${item.category}</div>
                        <div><span class="label-bold">Uçak:</span> ${item.aircraft}</div>
                        <div><span class="label-bold">Not:</span> ${item.note}</div>
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

document.addEventListener('DOMContentLoaded', loadMaterials);

// --- 6. DOSYA SEÇİM MANTIĞI ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (file) {
        selectedImageFile = file; 
        
        if(fileNameDisplay) {
            fileNameDisplay.innerText = `Seçilen Dosya: ${file.name}`;
            fileNameDisplay.classList.remove('text-muted');
            fileNameDisplay.classList.add('text-success', 'fw-bold');
        }
    }
}

const camInput = document.getElementById('inputCamera');
if (camInput) camInput.addEventListener('change', handleFileSelect);

const galInput = document.getElementById('inputGallery');
if (galInput) galInput.addEventListener('change', handleFileSelect);
