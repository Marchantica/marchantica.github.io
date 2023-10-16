function executeText() {
  // Obtener la ventana de texto
  const textArea = document.getElementById("textArea");

  // Obtener el texto del botón
  const buttonText = document.querySelector("button").textContent;

 // Añadir el texto a la ventana de texto
 textArea.appendChild(document.createTextNode(buttonText.concat("\n")));
}