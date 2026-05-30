    function generatePDF() {
        const iframe = previewWrapper.querySelector('iframe');
        if (!iframe) {
            alert('Primero genera una vista previa.');
            return;
        }

        loadingOverlay.style.display = 'flex';
        generatePdfBtn.disabled = true;

        const cleanName = activeProfileName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const fileName = `${cleanName}_curriculum-vitae.pdf`;
        
        // Accedemos al documento interno del iframe
        const iframeDoc = iframe.contentWindow.document;
        const source = iframeDoc.body;
        
        // Ajuste para móviles: Escala 2 es suficiente para buena calidad y consume menos RAM
        const renderScale = 2; 
        const BOTTOM_MARGIN_MM = 30;

        // 1. Nos aseguramos de que las fuentes del IFRAME estén cargadas
        iframeDoc.fonts.ready.then(() => {
            
            // 2. Damos un segundo completo para que el motor gráfico del móvil pinte las fuentes
            setTimeout(() => {

                html2canvas(source, {
                    scale: renderScale,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false, // Cambia a true si necesitas ver errores en consola
                    // Forzamos a que el scroll esté arriba para evitar capturas desplazadas
                    scrollY: -window.scrollY,
                    scrollX: 0,
                }).then(canvas => {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const pdfWidth = 210;
                    const pdfHeight = 297;
                    
                    const pageHeightInCanvas = canvasWidth * (pdfHeight / pdfWidth);
                    const marginInCanvas = canvasWidth * (BOTTOM_MARGIN_MM / pdfWidth);

                    let yPosition = 0;

                    while (yPosition < canvasHeight) {
                        const pageLimitWithMargin = yPosition + pageHeightInCanvas - marginInCanvas;
                        let nextPageStartY = yPosition + pageHeightInCanvas;

                        // Lógica de detección de bloques para evitar cortes feos
                        const unbreakableBlocks = source.querySelectorAll('.cv-column > div, .cv-full-width-section > div');
                        const blockTops = [0];
                        unbreakableBlocks.forEach(block => {
                            if (block.offsetHeight > 0) blockTops.push(block.offsetTop * renderScale);
                        });

                        const fittingBreaks = blockTops.filter(top => top < pageLimitWithMargin);
                        const lastSafeTop = fittingBreaks.length > 0 ? Math.max(...fittingBreaks) : 0;
                        
                        if (lastSafeTop > yPosition) {
                            const nextBlockIndex = blockTops.findIndex(top => top > lastSafeTop);
                            if (nextBlockIndex !== -1) {
                                nextPageStartY = blockTops[nextBlockIndex];
                            } else {
                                nextPageStartY = canvasHeight;
                            }
                        }

                        const sliceHeight = Math.min(nextPageStartY - yPosition, canvasHeight - yPosition);
                        if (sliceHeight <= 0) break;

                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width = canvasWidth;
                        sliceCanvas.height = sliceHeight;
                        const ctx = sliceCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, yPosition, canvasWidth, sliceHeight, 0, 0, canvasWidth, sliceHeight);

                        if (yPosition > 0) pdf.addPage();
                        
                        // Usamos compresión para que el móvil no sufra al descargar el archivo
                        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfWidth, (sliceHeight / canvasWidth) * pdfWidth);
                        
                        yPosition = nextPageStartY;
                    }

                    pdf.save(fileName);
                }).catch(err => {
                    console.error("Error capturando Canvas:", err);
                    alert("Error al generar imagen. Intenta cerrar otras pestañas para liberar memoria.");
                }).finally(() => {
                    loadingOverlay.style.display = 'none';
                    generatePdfBtn.disabled = false;
                });

            }, 1000); // 1000ms es el "punto dulce" para móviles económicos
        });
    }