document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN Y SELECTORES ---
    let db;
    const DB_NAME = 'perfilesDB', DB_VERSION = 1, STORE_NAME = 'perfiles';
    const A4_WIDTH_PX = 794;
    let languageEntryCounter = 0;
    let activeProfileName = '';

    // Selectores del DOM
    const userForm = document.getElementById('user-form');
    const userPhotoInput = document.getElementById('user-photo');
    const fileStatusText = document.getElementById('file-status-text');
    const dashboardContainer = document.getElementById('dashboard-container');
    const templateGallery = document.getElementById('template-gallery');
    const previewArea = document.getElementById('preview-area');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const cropperModal = document.getElementById('cropper-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropImageBtn = document.getElementById('crop-image-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Selectores de secciones dinámicas
    const educationContainer = document.getElementById('education-container');
    const addEducationBtn = document.getElementById('add-education-btn');
    const experienceContainer = document.getElementById('experience-container');
    const addExperienceBtn = document.getElementById('add-experience-btn');
    const skillsContainer = document.getElementById('skills-container');
    const addSkillBtn = document.getElementById('add-skill-btn');
    const languagesContainer = document.getElementById('languages-container');
    const addLanguageBtn = document.getElementById('add-language-btn');
    const coursesContainer = document.getElementById('courses-container');
    const addCourseBtn = document.getElementById('add-course-btn');
    const referencesContainer = document.getElementById('references-container');
    const addReferenceBtn = document.getElementById('add-reference-btn');

    // Selectores para la nueva funcionalidad "Sin Experiencia"
    const noExperienceCheckbox = document.getElementById('no-experience-checkbox');
    const experienceFieldset = document.getElementById('experience-fieldset');

    let cropper;
    let croppedImageBlob = null;

    // --- 2. LÓGICA DE RECORTE DE IMAGEN ---
    // (Esta sección no tiene cambios)
    userPhotoInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { if (img.width < 1080 || img.height < 1080) { alert('La imagen es demasiado pequeña...'); userPhotoInput.value = ''; return; } imageToCrop.src = event.target.result; cropperModal.style.display = 'flex'; if (cropper) cropper.destroy(); cropper = new Cropper(imageToCrop, { aspectRatio: 1 / 1, viewMode: 1, dragMode: 'move', background: false, autoCropArea: 0.8 }); }; img.src = event.target.result; }; reader.readAsDataURL(file); });
    cancelCropBtn.addEventListener('click', () => { cropperModal.style.display = 'none'; if (cropper) cropper.destroy(); userPhotoInput.value = ''; photoPreviewContainer.style.display = 'none'; fileStatusText.textContent = 'Ningún archivo seleccionado'; });
    cropImageBtn.addEventListener('click', () => { if (!cropper) return; const canvas = cropper.getCroppedCanvas({ width: 1080, height: 1080, imageSmoothingQuality: 'high' }); canvas.toBlob((blob) => { croppedImageBlob = blob; photoPreviewImg.src = URL.createObjectURL(blob); photoPreviewContainer.style.display = 'block'; fileStatusText.textContent = 'Imagen recortada lista.'; cropperModal.style.display = 'none'; if (cropper) cropper.destroy(); }, 'image/jpeg'); });

    // --- 3. LÓGICA DE LA BASE DE DATOS (INDEXEDDB) ---
    // (Esta sección no tiene cambios)
    function initDB() { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = (e) => console.error('DB Error:', e.target.error); request.onsuccess = (e) => { db = e.target.result; displayProfiles(); }; request.onupgradeneeded = (e) => { if (!e.target.result.objectStoreNames.contains(STORE_NAME)) e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true }); }; }
    function saveProfile(profileData) { if (!db) return; const transaction = db.transaction([STORE_NAME], 'readwrite'); const store = transaction.objectStore(STORE_NAME); const request = store.add(profileData); request.onsuccess = () => { alert('¡Perfil guardado con éxito!'); userForm.reset(); noExperienceCheckbox.checked = false; experienceFieldset.classList.remove('fields-hidden'); displayProfiles(); photoPreviewContainer.style.display = 'none'; photoPreviewImg.src = '#'; croppedImageBlob = null; fileStatusText.textContent = 'Ningún archivo seleccionado'; userPhotoInput.value = ''; }; request.onerror = (e) => console.error('Save Error:', e.target.error); }
    function displayProfiles() { if (!db) return; const transaction = db.transaction([STORE_NAME], 'readonly'); const store = transaction.objectStore(STORE_NAME); const request = store.getAll(); request.onsuccess = (e) => { const profiles = e.target.result; dashboardContainer.innerHTML = ''; if (profiles.length === 0) { dashboardContainer.innerHTML = '<p class="empty-dashboard-message">Aún no hay perfiles guardados.</p>'; } else { profiles.forEach(profile => { const card = document.createElement('div'); card.className = 'profile-card'; card.dataset.profileId = profile.id; const photoUrl = profile.photo ? URL.createObjectURL(profile.photo) : 'assets/images/default-user-icon.png'; card.innerHTML = `<img src="${photoUrl}" alt="Foto de ${profile.userName}" class="profile-card-img"><p class="profile-card-name">${profile.userName}</p><div class="profile-card-actions"><button class="view-btn">Ver</button><button class="delete-btn">Eliminar</button></div>`; dashboardContainer.appendChild(card); }); } }; }
    function deleteProfile(id) { if (!db || !confirm('¿Estás seguro?')) return; db.transaction([STORE_NAME], 'readwrite').objectStore(STORE_NAME).delete(id).onsuccess = () => displayProfiles(); }
    function getProfileById(id, cb) { if (!db) return; db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).get(id).onsuccess = e => cb(e.target.result); }
    
    // --- 4. LÓGICA DE LA INTERFAZ (UI) ---
    function scalePreview() { const iframe = previewArea.querySelector('iframe'); if (iframe) iframe.style.transform = `scale(${previewArea.clientWidth / A4_WIDTH_PX})`; }
    
    // --- FUNCIÓN RENDERPREVIEW (ACTUALIZADA) ---
    async function renderPreview(profile) {
        activeProfileName = profile.userName || 'perfil';
        const tpl = templateGallery.querySelector('.selected'); if (!tpl) return;
        try {
            const response = await fetch(tpl.dataset.templateUrl); if (!response.ok) throw new Error('Fetch failed');
            const html = await response.text();
            previewArea.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.onload = () => {
                scalePreview();
                const doc = iframe.contentWindow.document;
                doc.querySelector('#user-photo').src = profile.photo ? URL.createObjectURL(profile.photo) : 'assets/images/default-user-icon.png';
                doc.querySelector('#user-name').textContent = profile.userName || '';
                doc.querySelector('#cedula-data').textContent = profile.cedula || '';
                doc.querySelector('#birthdate-data').textContent = profile.birthDate || '';
                doc.querySelector('#nationality-data').textContent = profile.nationality || '';
                doc.querySelector('#location-data').textContent = profile.location || '';
                doc.querySelector('#phone-data').textContent = profile.phone || '';
                doc.querySelector('#email-data').textContent = profile.email || '';
                
                const lists = { '#courses-list': profile.courses, '#references-list': profile.references, '#education-list': profile.education, '#skills-list': profile.skills };
                for (const [selector, items] of Object.entries(lists)) { const list = doc.querySelector(selector); if (list) { list.innerHTML = ''; items.forEach(item => { const main = item.title || item.name; if (main && main.trim()) { let sub = ''; if (item.institute && item.year) sub = `${item.institute}, ${item.year}`; else if (item.institute) sub = item.institute; else if (item.company) sub = `${item.company}, ${item.startYear} - ${item.endYear}`; else if (item.phone) sub = item.phone; list.innerHTML += `<li><span class="item-title">${main}</span><span class="item-subtitle">${sub}</span></li>`; } }); } }
                
                // MEJORA: Lógica específica para Experiencia Laboral en la plantilla
                const experienceList = doc.querySelector('#experience-list');
                if (experienceList) {
                    experienceList.innerHTML = '';
                    if (profile.experience && profile.experience.length === 1 && profile.experience[0].noExperience) {
                        experienceList.innerHTML = `<li>Sin experiencia laboral</li>`;
                    } else if (profile.experience) {
                        profile.experience.forEach(item => {
                            if (item.title && item.title.trim()) {
                                let sub = `${item.company}, ${item.startYear} - ${item.endYear}`;
                                experienceList.innerHTML += `<li><span class="item-title">${item.title}</span><span class="item-subtitle">${sub}</span></li>`;
                            }
                        });
                    }
                }

                const languagesList = doc.querySelector('#languages-list');
                if (languagesList && profile.languages) {
                    languagesList.innerHTML = '';
                    profile.languages.forEach(lang => { if (lang.name && lang.name.trim()) { let dotsHtml = ''; for (let i = 1; i <= 10; i++) { dotsHtml += `<span class="dot ${i <= lang.level ? 'filled' : ''}"></span>`; } languagesList.innerHTML += `<li><span class="item-title">${lang.name}</span><div class="language-level-dots">${dotsHtml}</div></li>`; } });
                }
                generatePdfBtn.disabled = false;
            };
            iframe.style.cssText = 'width: 794px; height: 1123px; transform-origin: top left; border: none;';
            previewArea.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open(); doc.write('<base href="templates/">'); doc.write(html); doc.close();
        } catch (err) { console.error('Render Error:', err); }
    }
    
    function generatePDF() { const iframe = previewArea.querySelector('iframe'); if (!iframe) { alert('Primero genera una vista previa.'); return; } loadingOverlay.style.display = 'flex'; generatePdfBtn.disabled = true; const cleanName = activeProfileName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); const fileName = `${cleanName}_curriculum-vitae.pdf`; html2canvas(iframe.contentWindow.document.body, { scale: 3, useCORS: true, allowTaint: true }).then(canvas => { const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297); pdf.save(fileName); }).catch(err => { console.error("PDF Error:", err); alert("Ocurrió un error al generar el PDF."); }).finally(() => { loadingOverlay.style.display = 'none'; generatePdfBtn.disabled = false; }); }

    // --- 5. ASIGNACIÓN DE EVENTOS ---
    function setupEventListeners() {
        function generateLevelDots(container, counter) { let dotsHtml = ''; for (let i = 3; i <= 10; i++) { dotsHtml += `<div class="level-dot"><input type="radio" id="level-${counter}-${i}" name="language-level-${counter}" value="${i}"><label for="level-${counter}-${i}"></label></div>`; } container.innerHTML = dotsHtml; }
        const initialLevelSelector = document.querySelector('.level-selector');
        if (initialLevelSelector) { generateLevelDots(initialLevelSelector, languageEntryCounter); }
        const templates = { education: `<label>Título/Oficio:</label><input type="text" name="educationTitle" class="education-title" maxlength="50"><label>Instituto:</label><input type="text" name="educationInstitute" class="education-institute" maxlength="50"><label>Año de Culminación:</label><input type="text" name="educationYear" class="education-year" maxlength="50">`, experience: `<label>Cargo:</label><input type="text" name="experienceTitle" class="experience-title" maxlength="50"><label>Empresa:</label><input type="text" name="experienceCompany" class="experience-company" maxlength="50"><label>Año de Inicio:</label><input type="text" name="experienceStartYear" class="experience-start-year" maxlength="50"><label>Año de Culminación:</label><input type="text" name="experienceEndYear" class="experience-end-year" maxlength="50">`, skill: `<label>Habilidad:</label><input type="text" name="skillName" class="skill-name" maxlength="50">`, language: `<label>Idioma:</label><input type="text" name="languageName" class="language-name" maxlength="50"><label>Nivel:</label><div class="level-selector-wrapper"><span class="level-indicator">Bajo</span><div class="level-selector"></div><span class="level-indicator">Alto</span></div>`, course: `<label>Nombre del Curso:</label><input type="text" name="courseTitle" class="course-title" maxlength="50"><label>Instituto:</label><input type="text" name="courseInstitute" class="course-institute" maxlength="50">`, reference: `<label>Nombre:</label><input type="text" name="referenceName" class="reference-name" maxlength="50"><label>Teléfono:</label><input type="tel" name="referencePhone" class="reference-phone" maxlength="50">` };
        const addEntry = (container, html, type) => { const entry = document.createElement('div'); entry.className = 'form-entry-group'; entry.innerHTML = `<button type="button" class="remove-entry-btn">Eliminar</button>` + html; container.appendChild(entry); entry.querySelector('.remove-entry-btn').addEventListener('click', () => container.removeChild(entry)); if (type === 'language') { languageEntryCounter++; generateLevelDots(entry.querySelector('.level-selector'), languageEntryCounter); } };
        addEducationBtn.addEventListener('click', () => addEntry(educationContainer, templates.education, 'education'));
        addExperienceBtn.addEventListener('click', () => addEntry(experienceContainer, templates.experience, 'experience'));
        addSkillBtn.addEventListener('click', () => addEntry(skillsContainer, templates.skill, 'skill'));
        addLanguageBtn.addEventListener('click', () => addEntry(languagesContainer, templates.language, 'language'));
        addCourseBtn.addEventListener('click', () => addEntry(coursesContainer, templates.course, 'course'));
        addReferenceBtn.addEventListener('click', () => addEntry(referencesContainer, templates.reference, 'reference'));
        
        // MEJORA: Lógica aislada para el checkbox "Sin experiencia"
        noExperienceCheckbox.addEventListener('change', () => {
            experienceFieldset.classList.toggle('fields-hidden', noExperienceCheckbox.checked);
        });

        userForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const userProfile = { userName: document.getElementById('user-name').value, cedula: document.getElementById('cedula').value, birthDate: document.getElementById('birth-date').value, nationality: document.getElementById('nationality').value, location: document.getElementById('location').value, phone: document.getElementById('phone').value, email: document.getElementById('email').value, education: [], experience: [], skills: [], languages: [], courses: [], references: [], photo: croppedImageBlob };
            document.querySelectorAll('#education-container .form-entry-group').forEach(group => userProfile.education.push({ title: group.querySelector('.education-title').value, institute: group.querySelector('.education-institute').value, year: group.querySelector('.education-year').value }));
            
            // MEJORA: Lógica de guardado de experiencia
            if (noExperienceCheckbox.checked) {
                userProfile.experience.push({ noExperience: true });
            } else {
                document.querySelectorAll('#experience-container .form-entry-group').forEach(group => {
                    const title = group.querySelector('.experience-title').value;
                    if (title.trim()) {
                        userProfile.experience.push({ title: title, company: group.querySelector('.experience-company').value, startYear: group.querySelector('.experience-start-year').value, endYear: group.querySelector('.experience-end-year').value });
                    }
                });
            }

            document.querySelectorAll('#skills-container .form-entry-group').forEach(group => { const name = group.querySelector('.skill-name').value; if (name.trim()) userProfile.skills.push({ name }); });
            document.querySelectorAll('#languages-container .form-entry-group').forEach(group => { const name = group.querySelector('.language-name').value; const level = group.querySelector('input[type="radio"]:checked'); if (name.trim()) userProfile.languages.push({ name, level: level ? parseInt(level.value, 10) : 0 }); });
            document.querySelectorAll('#courses-container .form-entry-group').forEach(group => userProfile.courses.push({ title: group.querySelector('.course-title').value, institute: group.querySelector('.course-institute').value }));
            document.querySelectorAll('#references-container .form-entry-group').forEach(group => userProfile.references.push({ name: group.querySelector('.reference-name').value, phone: group.querySelector('.reference-phone').value }));
            saveProfile(userProfile);
        });
        dashboardContainer.addEventListener('click', (event) => { const card = event.target.closest('.profile-card'); if (!card) return; const profileId = Number(card.dataset.profileId); if (event.target.classList.contains('delete-btn')) deleteProfile(profileId); if (event.target.classList.contains('view-btn')) getProfileById(profileId, (profile) => { if (profile) renderPreview(profile) }); });
        templateGallery.addEventListener('click', (event) => { const thumb = event.target.closest('.template-thumbnail'); if (thumb) { const current = templateGallery.querySelector('.selected'); if (current) current.classList.remove('selected'); thumb.classList.add('selected'); } });
        generatePdfBtn.addEventListener('click', generatePDF);
        window.addEventListener('resize', scalePreview);
        document.querySelectorAll('.omit-btn').forEach(btn => { btn.addEventListener('click', () => { const targetId = btn.dataset.target; const fieldset = document.getElementById(targetId); if (fieldset) { const isOmitted = fieldset.classList.toggle('seccion-oculta'); btn.textContent = isOmitted ? 'Mostrar' : 'Omitir'; } }); });
    }
    
    // --- 6. INICIALIZACIÓN ---
    const style = document.createElement('style');
    style.innerHTML = `.form-entry-group .remove-entry-btn { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 5px 10px; font-size: 0.8em; position: absolute; top: 10px; right: 10px; cursor: pointer; } .form-entry-group .remove-entry-btn:hover { background-color: #f1b0b7; }`;
    document.head.appendChild(style);
    
    setupEventListeners();
    initDB();
});