document.addEventListener("DOMContentLoaded", () => {

    // --- ELEMENTOS DEL DOM ---
    const header = document.getElementById('main-header');
    const logo = document.getElementById('logo-svg');
    const bottomBar = document.getElementById('bottom-bar');
    const menuOverlay = document.getElementById('menu-overlay');
    const closeBtn = document.getElementById('close-btn');
    const animatedShape = document.getElementById('animated-shape');
    
    // Todos los elementos interactivos del menú
    const menuInteractables = [closeBtn, ...document.querySelectorAll('.menu-item')];
    let currentFocusIndex = 0;

    // --- 1. LÓGICA DEL SCROLL (Header y Parallax SVG) ---
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // --- A. Transición de Header (0 a 300px) ---
        let progress = scrollY / 300;
        if (progress > 1) progress = 1; 

        // Colores del Header
        const headerRgb = Math.round(0 + (255 * progress));
        const headerAlpha = 1 - (0.1 * progress); 
        header.style.backgroundColor = `rgba(${headerRgb}, ${headerRgb}, ${headerRgb}, ${headerAlpha})`;
        header.style.borderBottom = `1px solid rgba(0,0,0, ${0.1 * progress})`;

        // Color del Logo y Barra Inferior
        const logoColor = Math.round(255 - (155 * progress));
        logo.style.fill = `rgb(${logoColor}, ${logoColor}, ${logoColor})`;

        const barColor = Math.round(0 + (100 * progress));
        bottomBar.style.backgroundColor = `rgb(${barColor}, ${barColor}, ${barColor})`;

        // --- B. Animación SVG Parallax (Bloque 2) ---
        // Hace que la tuerca gire sobre sí misma en relación a los pixeles escroleados
        // Se multiplica por un factor (ej. 0.3) para controlar la velocidad de rotación
        if(animatedShape) {
            const rotation = scrollY * 0.3; 
            animatedShape.style.transform = `rotate(${rotation}deg)`;
        }
    });

    // --- 2. LÓGICA DEL MENÚ Y ACCESIBILIDAD ---
    function openMenu() {
        menuOverlay.classList.add('active');
        // Esperar transición CSS y enfocar
        setTimeout(() => {
            currentFocusIndex = 1; 
            if(menuInteractables[currentFocusIndex]) {
                menuInteractables[currentFocusIndex].focus();
            }
        }, 100);
    }

    function closeMenu() {
        menuOverlay.classList.remove('active');
        bottomBar.focus(); 
    }

    // Eventos Click nativos
    bottomBar.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);

    // Eventos de Teclado global para los botones
    const allButtons = [bottomBar, ...menuInteractables];
    allButtons.forEach(btn => {
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); 
                this.click(); 
            }
        });
    });

    // Navegación con cruceta (Flechas) dentro del menú
    menuOverlay.addEventListener('keydown', (e) => {
        if (!menuOverlay.classList.contains('active')) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocusIndex = (currentFocusIndex + 1) % menuInteractables.length;
            menuInteractables[currentFocusIndex].focus();
        }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocusIndex = (currentFocusIndex - 1 + menuInteractables.length) % menuInteractables.length;
            menuInteractables[currentFocusIndex].focus();
        }
        else if (e.key === 'Escape') {
            closeMenu();
        }
    });

    // Cerrar menú clickeando la zona de cristal/borrosa
    menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
            closeMenu();
        }
    });

});