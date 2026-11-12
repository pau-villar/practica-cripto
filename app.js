const $ = (id) => document.getElementById(id);

// ============ 1. WEBSOCKET ============
const ws = new WebSocket("ws://" + location.host);
ws.onopen = () => ($("estat").textContent = "Connectat ");
ws.onclose = () => ($("estat").textContent = "Desconnectat ");

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.tipus === "clau") {
    $("pubRemota").value = msg.contingut;   // llega la clave pública del otro
  }
  if (msg.tipus === "missatge") {
    $("entrada").value = msg.contingut;     // llega un mensaje cifrado
    desencriptar();
  }
};

// ============ 2. GENERAR CLAUS ============
$("btnGenerar").onclick = () => {
  $("estat").textContent = "Generant claus... (pot trigar uns segons)";
  // setTimeout deja que el navegador pinte el mensaje antes de bloquearse
  setTimeout(() => {
    const crypt = new JSEncrypt({ default_key_size: 2048 });
    $("pubPropia").value = crypt.getPublicKey();
    $("privPropia").value = crypt.getPrivateKey();
    $("estat").textContent = "Connectat (claus generades)";
  }, 50);
};

// ============ 3. ENVIAR CLAU PÚBLICA ============
$("btnEnviarClau").onclick = () => {
  ws.send(JSON.stringify({ tipus: "clau", contingut: $("pubPropia").value }));
};

// ============ 4. SIGNAR ============
$("btnSignar").onclick = () => {
  const text = $("missatge").value;

  const sign = new JSEncrypt();
  sign.setPrivateKey($("privPropia").value);
  const signatura = sign.sign(text, CryptoJS.SHA256, "sha256");

  $("missatge").value = JSON.stringify({ missatge: text, signatura: signatura }, null, 2);
};

// ============ 5. ENCRIPTAR I ENVIAR ============
$("btnEncriptar").onclick = () => {
  // a) contraseña aleatoria para AES
  const password = CryptoJS.lib.WordArray.random(16).toString();

  // b) ciframos el JSON con AES (CryptoJS)
  const dades = CryptoJS.AES.encrypt($("missatge").value, password).toString();

  // c) ciframos la contraseña con la clave pública remota (JSEncrypt)
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey($("pubRemota").value);
  const clau = encrypt.encrypt(password);

  if (!clau) {
    $("resultat").textContent = "Error: no s'ha pogut xifrar (falta la clau remota?)";
    return;
  }

  const paquet = JSON.stringify({ clau: clau, dades: dades });
  $("xifrat").value = paquet;
  ws.send(JSON.stringify({ tipus: "missatge", contingut: paquet }));
};

// ============ 6. DESENCRIPTAR I VALIDAR ============
function desencriptar() {
  try {
    const paquet = JSON.parse($("entrada").value);

    // a) recupero la contraseña con MI clave privada
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey($("privPropia").value);
    const password = decrypt.decrypt(paquet.clau);

    // b) descifro el JSON con AES
    const clar = CryptoJS.AES.decrypt(paquet.dades, password).toString(CryptoJS.enc.Utf8);
    const obj = JSON.parse(clar);

    // c) verifico la firma con la clave pública del remitente
    const verify = new JSEncrypt();
    verify.setPublicKey($("pubRemota").value);
    const valida = verify.verify(obj.missatge, obj.signatura, CryptoJS.SHA256);

    $("resultat").textContent =
      "Missatge: " + obj.missatge + "\nSignatura: " + (valida ? "VÀLIDA" : "TRENCADA");
  } catch (e) {
    $("resultat").textContent = "Error: " + e.message;
  }
}
