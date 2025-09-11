document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN Y SELECTORES ---
    let db;
    const DB_NAME = 'perfilesDB', DB_VERSION = 1, STORE_NAME = 'perfiles';
    const A4_WIDTH_PX = 794;

    const userForm = document.getElementById('user-form');
    const userPhotoInput = document.getElementById('user-photo');
    const dashboardContainer = document.getElementById('dashboard-container');
    const templateGallery = document.getElementById('template-gallery');
    const previewArea = document.getElementById('preview-area');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const educationContainer = document.getElementById('education-container');
    const addEducationBtn = document.getElementById('add-education-btn');
    const experienceContainer = document.getElementById('experience-container');
    const addExperienceBtn = document.getElementById('add-experience-btn');
    const coursesContainer = document.getElementById('courses-container');
    const addCourseBtn = document.getElementById('add-course-btn');
    const referencesContainer = document.getElementById('references-container');
    const addReferenceBtn = document.getElementById('add-reference-btn');

    const cropperModal = document.getElementById('cropper-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropImageBtn = document.getElementById('crop-image-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');

    let cropper;
    let croppedImageBlob = null;

    // --- 2. LÓGICA DE RECORTE DE IMAGEN ---
    userPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                if (img.width < 1080 || img.height < 1080) {
                    alert('La imagen es demasiado pequeña. Debe tener al menos 1080px de ancho y alto.');
                    userPhotoInput.value = '';
                    return;
                }
                imageToCrop.src = event.target.result;
                cropperModal.style.display = 'flex';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { aspectRatio: 1 / 1, viewMode: 1, dragMode: 'move', background: false, autoCropArea: 0.8 });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    cancelCropBtn.addEventListener('click', () => {
        cropperModal.style.display = 'none';
        if (cropper) cropper.destroy();
        userPhotoInput.value = '';
    });

    cropImageBtn.addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 1080, height: 1080, imageSmoothingQuality: 'high' });
        canvas.toBlob((blob) => {
            croppedImageBlob = blob;
            console.log('Imagen recortada y guardada temporalmente.', croppedImageBlob);
            cropperModal.style.display = 'none';
            if (cropper) cropper.destroy();
        }, 'image/jpeg');
    });

    // --- 3. LÓGICA DE LA BASE DE DATOS (INDEXEDDB) ---
    function initDB() { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = (e) => console.error('Error al abrir IndexedDB:', e.target.error); request.onsuccess = (e) => { db = e.target.result; console.log('Base de datos abierta con éxito.'); displayProfiles(); }; request.onupgradeneeded = (e) => { db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true }); } }; }
    function saveProfile(profileData) { if (!db) { console.error("La base de datos no está disponible para guardar."); return; } const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.add(profileData); request.onsuccess = () => { alert('¡Perfil guardado con éxito!'); userForm.reset(); displayProfiles(); }; request.onerror = (e) => console.error('Error al guardar perfil:', e.target.error); }
    function displayProfiles() { if (!db) return; const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.getAll(); request.onsuccess = (e) => { const profiles = e.target.result; dashboardContainer.innerHTML = ''; if (profiles.length === 0) { dashboardContainer.innerHTML = '<p class="empty-dashboard-message">Aún no hay perfiles guardados.</p>'; } else { profiles.forEach(profile => { const profileCard = document.createElement('div'); profileCard.className = 'profile-card'; profileCard.dataset.profileId = profile.id; const photoUrl = profile.photo ? URL.createObjectURL(profile.photo) : 'assets/images/default-user-icon.png'; profileCard.innerHTML = `<img src="${photoUrl}" alt="Foto de ${profile.userName}" class="profile-card-img"><p class="profile-card-name">${profile.userName}</p><div class="profile-card-actions"><button class="view-btn">Ver</button><button class="delete-btn">Eliminar</button></div>`; dashboardContainer.appendChild(profileCard); }); } }; }
    function deleteProfile(profileId) { if (!db) return; if (!confirm('¿Estás seguro de que quieres eliminar este perfil?')) return; const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.delete(profileId); request.onsuccess = () => { console.log(`Perfil ${profileId} eliminado.`); displayProfiles(); }; request.onerror = (e) => console.error(`Error al eliminar perfil ${profileId}:`, e.target.error); }
    function getProfileById(profileId, callback) { if (!db) return; const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.get(profileId); request.onsuccess = (e) => callback(e.target.result); }
    
    // --- 4. LÓGICA DE LA INTERFAZ (UI) ---
    function scalePreview() { const iframe = previewArea.querySelector('iframe'); if (!iframe) return; const containerWidth = previewArea.clientWidth; const scale = containerWidth / A4_WIDTH_PX; iframe.style.transform = `scale(${scale})`; }
    async function renderPreview(profile) { const selectedTemplate = templateGallery.querySelector('.selected'); if (!selectedTemplate) { previewArea.innerHTML = '<p>Por favor, selecciona una plantilla.</p>'; return; } const templateUrl = selectedTemplate.dataset.templateUrl; try { const response = await fetch(templateUrl); if (!response.ok) throw new Error('No se pudo cargar la plantilla.'); const templateHtml = await response.text(); const tempContainer = document.createElement('div'); tempContainer.innerHTML = templateHtml; tempContainer.querySelector('#user-photo').src = profile.photo ? URL.createObjectURL(profile.photo) : 'assets/images/default-user-icon.png'; tempContainer.querySelector('#user-name').textContent = profile.userName || ''; tempContainer.querySelector('#cedula-data').textContent = profile.cedula || ''; tempContainer.querySelector('#birthdate-data').textContent = profile.birthDate || ''; tempContainer.querySelector('#nationality-data').textContent = profile.nationality || ''; tempContainer.querySelector('#location-data').textContent = profile.location || ''; tempContainer.querySelector('#phone-data').textContent = profile.phone || ''; tempContainer.querySelector('#email-data').textContent = profile.email || ''; const lists = { '#courses-list': profile.courses, '#references-list': profile.references, '#education-list': profile.education, '#experience-list': profile.experience }; for (const [selector, items] of Object.entries(lists)) { const listElement = tempContainer.querySelector(selector); listElement.innerHTML = ''; items.forEach(item => { const mainField = item.title || item.name; if (mainField && mainField.trim() !== '') { let subtitle = ''; if (item.institute && item.year) subtitle = `${item.institute}, ${item.year}`; else if (item.institute) subtitle = item.institute; else if (item.company) subtitle = `${item.company}, ${item.startYear} - ${item.endYear}`; else if (item.phone) subtitle = item.phone; listElement.innerHTML += `<li><span class="item-title">${mainField}</span><span class="item-subtitle">${subtitle}</span></li>`; } }); } previewArea.innerHTML = ''; const iframe = document.createElement('iframe'); iframe.onload = () => scalePreview(); iframe.style.cssText = 'width: 794px; height: 1123px; transform-origin: top left; border: none;'; previewArea.appendChild(iframe); iframe.contentWindow.document.open(); iframe.contentWindow.document.write(tempContainer.innerHTML); iframe.contentWindow.document.close(); } catch (error) { console.error('Error al renderizar la vista previa:', error); previewArea.innerHTML = '<p>Ocurrió un error al cargar la vista previa.</p>'; } }
    function generatePDF() { if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') { alert("Error: Las librerías de PDF no se cargaron correctamente."); return; } const iframe = previewArea.querySelector('iframe'); if (!iframe) { alert('Por favor, primero genera una vista previa.'); return; } const btn = generatePdfBtn; const originalText = btn.textContent; btn.textContent = 'Generando...'; btn.disabled = true; const { jsPDF } = window.jspdf; const content = iframe.contentWindow.document.body; html2canvas(content, { scale: 3, useCORS: true }).then(canvas => { const imgData = canvas.toDataURL('image/jpeg', 1.0); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297); pdf.save('perfil.pdf'); }).catch(err => { console.error("Error al generar PDF:", err); alert("Ocurrió un error al generar el PDF."); }).finally(() => { btn.textContent = originalText; btn.disabled = false; }); }

    // --- 5. ASIGNACIÓN DE EVENTOS ---
    function setupEventListeners() {
        const templates = {
            education: `<label>Título/Oficio:</label><input type="text" name="educationTitle" class="education-title" maxlength="50"><label>Instituto:</label><input type="text" name="educationInstitute" class="education-institute" maxlength="50"><label>Año de Culminación:</label><input type="text" name="educationYear" class="education-year" maxlength="50"><button type="button" class="remove-entry-btn">Eliminar</button>`,
            experience: `<label>Cargo:</label><input type="text" name="experienceTitle" class="experience-title" maxlength="50"><label>Empresa:</label><input type="text" name="experienceCompany" class="experience-company" maxlength="50"><label>Año de Inicio:</label><input type="text" name="experienceStartYear" class="experience-start-year" maxlength="50"><label>Año de Culminación:</label><input type="text" name="experienceEndYear" class="experience-end-year" maxlength="50"><button type="button" class="remove-entry-btn">Eliminar</button>`,
            course: `<label>Nombre del Curso:</label><input type="text" name="courseTitle" class="course-title" maxlength="50"><label>Instituto:</label><input type="text" name="courseInstitute" class="course-institute" maxlength="50"><button type="button" class="remove-entry-btn">Eliminar</button>`,
            reference: `<label>Nombre:</label><input type="text" name="referenceName" class="reference-name" maxlength="50"><label>Teléfono:</label><input type="tel" name="referencePhone" class="reference-phone" maxlength="50"><button type="button" class="remove-entry-btn">Eliminar</button>`
        };
        const addEntry = (container, html) => { const entry = document.createElement('div'); entry.className = 'form-entry-group'; entry.innerHTML = html; container.appendChild(entry); entry.querySelector('.remove-entry-btn').addEventListener('click', () => container.removeChild(entry)); };
        addEducationBtn.addEventListener('click', () => addEntry(educationContainer, templates.education));
        addExperienceBtn.addEventListener('click', () => addEntry(experienceContainer, templates.experience));
        addCourseBtn.addEventListener('click', () => addEntry(coursesContainer, templates.course));
        addReferenceBtn.addEventListener('click', () => addEntry(referencesContainer, templates.reference));
        userForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const userProfile = { userName: document.getElementById('user-name').value, cedula: document.getElementById('cedula').value, birthDate: document.getElementById('birth-date').value, nationality: document.getElementById('nationality').value, location: document.getElementById('location').value, phone: document.getElementById('phone').value, email: document.getElementById('email').value, education: [], experience: [], courses: [], references: [], photo: croppedImageBlob || null };
            document.querySelectorAll('#education-container .form-entry-group').forEach(group => userProfile.education.push({ title: group.querySelector('.education-title').value, institute: group.querySelector('.education-institute').value, year: group.querySelector('.education-year').value }));
            document.querySelectorAll('#experience-container .form-entry-group').forEach(group => userProfile.experience.push({ title: group.querySelector('.experience-title').value, company: group.querySelector('.experience-company').value, startYear: group.querySelector('.experience-start-year').value, endYear: group.querySelector('.experience-end-year').value }));
            document.querySelectorAll('#courses-container .form-entry-group').forEach(group => userProfile.courses.push({ title: group.querySelector('.course-title').value, institute: group.querySelector('.course-institute').value }));
            document.querySelectorAll('#references-container .form-entry-group').forEach(group => userProfile.references.push({ name: group.querySelector('.reference-name').value, phone: group.querySelector('.reference-phone').value }));
            saveProfile(userProfile);
            croppedImageBlob = null;
            userPhotoInput.value = '';
        });
        dashboardContainer.addEventListener('click', (event) => { const card = event.target.closest('.profile-card'); if (!card) return; const profileId = Number(card.dataset.profileId); if (event.target.classList.contains('delete-btn')) deleteProfile(profileId); if (event.target.classList.contains('view-btn')) getProfileById(profileId, (profile) => { if (profile) renderPreview(profile) }); });
        templateGallery.addEventListener('click', (event) => { const thumb = event.target.closest('.template-thumbnail'); if (thumb) { const current = templateGallery.querySelector('.selected'); if (current) current.classList.remove('selected'); thumb.classList.add('selected'); } });
        generatePdfBtn.addEventListener('click', generatePDF);
        window.addEventListener('resize', scalePreview);
    }
    
    // --- 6. INICIALIZACIÓN ---
    const style = document.createElement('style');
    style.innerHTML = `.form-entry-group .remove-entry-btn { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 5px 10px; font-size: 0.8em; position: absolute; top: 10px; right: 10px; cursor: pointer; } .form-entry-group .remove-entry-btn:hover { background-color: #f1b0b7; }`;
    document.head.appendChild(style);
    
    setupEventListeners();
    initDB();
});