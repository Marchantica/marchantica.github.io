document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN Y SELECTORES ---
    let db;
    const DB_NAME = 'perfilesDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'perfiles';

    // Seleccionamos todos los elementos del DOM
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

    // --- 2. LÓGICA DE LA BASE DE DATOS (INDEXEDDB) ---

    function initDB() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (e) => console.error('Error al abrir IndexedDB:', e.target.error);
        request.onsuccess = (e) => {
            db = e.target.result;
            console.log('Base de datos abierta con éxito.');
            displayProfiles(); // Carga los perfiles existentes.
        };
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    }

    function saveProfile(profileData) {
        if (!db) return;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(profileData);
        request.onsuccess = () => {
            alert('¡Perfil guardado con éxito!');
            userForm.reset();
            displayProfiles();
        };
        request.onerror = (e) => console.error('Error al guardar perfil:', e.target.error);
    }

    function displayProfiles() {
        if (!db) return;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = (e) => {
            const profiles = e.target.result;
            dashboardContainer.innerHTML = '';
            if (profiles.length === 0) {
                dashboardContainer.innerHTML = '<p class="empty-dashboard-message">Aún no hay perfiles guardados.</p>';
            } else {
                profiles.forEach(profile => {
                    const profileCard = document.createElement('div');
                    profileCard.className = 'profile-card';
                    profileCard.dataset.profileId = profile.id;
                    const photoUrl = profile.photo ? URL.createObjectURL(profile.photo) : 'assets/images/default-user-icon.png';
                    profileCard.innerHTML = `
                        <img src="${photoUrl}" alt="Foto de ${profile.userName}" class="profile-card-img">
                        <p class="profile-card-name">${profile.userName}</p>
                        <div class="profile-card-actions">
                            <button class="view-btn">Ver</button>
                            <button class="delete-btn">Eliminar</button>
                        </div>
                    `;
                    dashboardContainer.appendChild(profileCard);
                });
            }
        };
    }

    function deleteProfile(profileId) {
        if (!db) return;
        if (!confirm('¿Estás seguro de que quieres eliminar este perfil?')) return;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(profileId);
        request.onsuccess = () => {
            console.log(`Perfil ${profileId} eliminado.`);
            displayProfiles();
        };
        request.onerror = (e) => console.error(`Error al eliminar perfil ${profileId}:`, e.target.error);
    }
    
    function getProfileById(profileId, callback) {
        if (!db) return;
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(profileId);
        request.onsuccess = (e) => callback(e.target.result);
    }

    // --- 3. LÓGICA DE LA INTERFAZ DE USUARIO (UI) ---

    async function renderPreview(profile) {
        const selectedTemplate = templateGallery.querySelector('.selected');
        if (!selectedTemplate) {
            previewArea.innerHTML = '<p>Por favor, selecciona una plantilla.</p>';
            return;
        }
        const templateUrl = selectedTemplate.dataset.templateUrl;
        try {
            const response = await fetch(templateUrl);
            if (!response.ok) throw new Error('No se pudo cargar la plantilla.');
            const templateHtml = await response.text();
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = templateHtml;
            // Inyectar datos
            tempContainer.querySelector('#user-photo').src = profile.photo ? URL.createObjectURL(profile.photo) : '../assets/images/default-user-icon.png';
            tempContainer.querySelector('#user-name').textContent = profile.userName;
            tempContainer.querySelector('#cedula-data').textContent = profile.cedula;
            tempContainer.querySelector('#birthdate-data').textContent = profile.birthDate;
            tempContainer.querySelector('#nationality-data').textContent = profile.nationality;
            tempContainer.querySelector('#location-data').textContent = profile.location;
            tempContainer.querySelector('#phone-data').textContent = profile.phone;
            tempContainer.querySelector('#email-data').textContent = profile.email;
            // Inyectar listas
            const lists = {
                '#courses-list': profile.courses, '#references-list': profile.references,
                '#education-list': profile.education, '#experience-list': profile.experience
            };
            for (const [selector, items] of Object.entries(lists)) {
                const listElement = tempContainer.querySelector(selector);
                listElement.innerHTML = '';
                items.forEach(item => {
                    let subtitle = '';
                    if (item.institute && item.year) subtitle = `${item.institute}, ${item.year}`;
                    else if (item.institute) subtitle = item.institute;
                    else if (item.company) subtitle = `${item.company}, ${item.startYear} - ${item.endYear}`;
                    else if (item.phone) subtitle = item.phone;
                    listElement.innerHTML += `<li><span class="item-title">${item.title || item.name}</span><span class="item-subtitle">${subtitle}</span></li>`;
                });
            }
            // Mostrar en iframe
            previewArea.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            previewArea.appendChild(iframe);
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(tempContainer.innerHTML);
            iframe.contentWindow.document.close();
        } catch (error) {
            console.error('Error al renderizar la vista previa:', error);
            previewArea.innerHTML = '<p>Ocurrió un error al cargar la vista previa.</p>';
        }
    }

    // --- 4. LÓGICA DE GENERACIÓN DE PDF ---
    function generatePDF() {
        const iframe = previewArea.querySelector('iframe');
        if (!iframe) {
            alert('Por favor, primero genera una vista previa haciendo clic en "Ver" en un perfil.');
            return;
        }
        const originalButtonText = generatePdfBtn.textContent;
        generatePdfBtn.textContent = 'Generando...';
        generatePdfBtn.disabled = true;
        
        const { jsPDF } = window.jspdf;
        const content = iframe.contentWindow.document.body;

        html2canvas(content, { scale: 3, useCORS: true })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
                pdf.save('perfil.pdf');
            })
            .catch(err => {
                console.error("Error al generar el PDF:", err);
                alert("Ocurrió un error al generar el PDF.");
            })
            .finally(() => {
                generatePdfBtn.textContent = originalButtonText;
                generatePdfBtn.disabled = false;
            });
    }

    // --- 5. ASIGNACIÓN DE EVENTOS (EVENT LISTENERS) ---

    // Eventos de los botones "Añadir"
    const setupAddButtons = () => {
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
    };

    // Evento del formulario
    userForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const userProfile = {
            userName: document.getElementById('user-name').value, cedula: document.getElementById('cedula').value,
            birthDate: document.getElementById('birth-date').value, nationality: document.getElementById('nationality').value,
            location: document.getElementById('location').value, phone: document.getElementById('phone').value,
            email: document.getElementById('email').value, education: [], experience: [], courses: [], references: [],
            photo: userPhotoInput.files[0] || null
        };
        document.querySelectorAll('#education-container .form-entry-group').forEach(group => userProfile.education.push({ title: group.querySelector('.education-title').value, institute: group.querySelector('.education-institute').value, year: group.querySelector('.education-year').value }));
        document.querySelectorAll('#experience-container .form-entry-group').forEach(group => userProfile.experience.push({ title: group.querySelector('.experience-title').value, company: group.querySelector('.experience-company').value, startYear: group.querySelector('.experience-start-year').value, endYear: group.querySelector('.experience-end-year').value }));
        document.querySelectorAll('#courses-container .form-entry-group').forEach(group => userProfile.courses.push({ title: group.querySelector('.course-title').value, institute: group.querySelector('.course-institute').value }));
        document.querySelectorAll('#references-container .form-entry-group').forEach(group => userProfile.references.push({ name: group.querySelector('.reference-name').value, phone: group.querySelector('.reference-phone').value }));
        saveProfile(userProfile);
    });

    // Eventos del Dashboard (Ver y Eliminar)
    dashboardContainer.addEventListener('click', (event) => {
        const card = event.target.closest('.profile-card');
        if (!card) return;
        const profileId = Number(card.dataset.profileId);
        if (event.target.classList.contains('delete-btn')) deleteProfile(profileId);
        if (event.target.classList.contains('view-btn')) getProfileById(profileId, (profile) => { if (profile) renderPreview(profile) });
    });

    // Evento de la galería de plantillas
    templateGallery.addEventListener('click', (event) => {
        const clickedThumbnail = event.target.closest('.template-thumbnail');
        if (clickedThumbnail) {
            const currentSelected = templateGallery.querySelector('.selected');
            if (currentSelected) currentSelected.classList.remove('selected');
            clickedThumbnail.classList.add('selected');
        }
    });

    // Evento del botón de generar PDF
    generatePdfBtn.addEventListener('click', generatePDF);


    // --- 6. INICIALIZACIÓN ---
    
    // Inyectar estilos para el botón "Eliminar".
    const style = document.createElement('style');
    style.innerHTML = `.form-entry-group .remove-entry-btn { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 5px 10px; font-size: 0.8em; position: absolute; top: 10px; right: 10px; cursor: pointer; } .form-entry-group .remove-entry-btn:hover { background-color: #f1b0b7; }`;
    document.head.appendChild(style);

    // Configurar los botones "Añadir".
    setupAddButtons();

    // Iniciar la conexión con la base de datos (esto da comienzo a todo).
    initDB();
});