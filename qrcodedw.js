async function downloadImage() {
  const container = document.getElementById("qrcode");

  // Obtener el elemento de imagen
  const img = container.querySelector("img");

  // Obtener el objeto Blob de la imagen
  const blob = await img.toDataURL();

  // Obtener la URL del archivo
  const url = generateDownloadUrl();

  // Crear el botón de descarga
  const button = document.createElement("a");
  button.href = url;
  button.download = "qrcode.png";
  button.textContent = "Descargar imagen";

  // Añadir el botón al DOM
  document.body.appendChild(button);
}