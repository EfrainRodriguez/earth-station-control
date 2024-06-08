const { SerialPort } = require("serialport");

let port = null;
const portCaptionElement = document.getElementById("port-caption");

async function listSerialPorts() {
  await SerialPort.list().then((ports, err) => {
    if (err) {
      portCaptionElement.innerHTML =
        "<span class='error'>Error al listar los puertos</span>";
      return;
    }

    const selectElement = document.getElementById("com-ports");

    if (!port) {
      portCaptionElement.innerHTML = "";
      selectElement.innerHTML = "";
      selectElement.innerHTML =
        "<option value=''>Selecciona un puerto</option>";
      ports.forEach((element) => {
        const option = document.createElement("option");
        option.value = element.path;
        option.textContent = element.path;
        selectElement.appendChild(option);
      });
    } else {
      portCaptionElement.innerHTML = `<span class='success'>Conectado a: ${port.path}</span>`;
      const selectedPort = port.path;
      const restPorts = ports.filter(
        (element) => element.path !== selectedPort
      );
      restPorts.forEach((element) => {
        const option = document.createElement("option");
        option.value = element.path;
        option.textContent = element.path;
        selectElement.appendChild(option);
      });
    }

    if (ports.length === 0) {
      portCaptionElement.innerHTML =
        "<span class='error'>No hay puertos disponibles</span>";

      selectElement.innerHTML =
        "<option value=''>Selecciona un puerto</option>";
    } else {
      if (!port) {
        portCaptionElement.innerHTML =
          "<span class='error'>Desconectado</span>";
      }
    }
  });
}

function listPorts() {
  listSerialPorts();
  setTimeout(listPorts, 2000);
}

function connectToSerialPort(portPath) {
  if (!portPath) {
    return;
  }

  if (port && port.path === portPath) {
    console.log(`Puerto ${portPath} ya está abierto`);
    return;
  }

  if (port) {
    port.close();
    setTimeout(() => {
      connectToSerialPort(portPath);
    }, 500);
  }

  port = new SerialPort({ path: portPath, baudRate: 115200 });

  port.on("open", () => {
    console.log(`Puerto ${portPath} abierto`);
    portCaptionElement.innerHTML = `<span class='success'>Conectado a: ${portPath}</span>`;
    document.getElementById("control-section").style.display = "block";
    document.getElementById("disconnect").style.display = "inline-block";
  });

  port.on("error", (err) => {
    console.error(`Error en el puerto ${portPath}:`, err.message);
    portCaptionElement.innerHTML = `<span class='error'>Error en el puerto ${portPath}</span>`;
  });

  port.on("data", (data) => {
    console.log(`Datos recibidos del puerto ${portPath}:`, data.toString());
  });

  port.on("close", () => {
    port = null;
    portCaptionElement.innerHTML = "";
    console.log(`Puerto ${portPath} cerrado`);
    document.getElementById("control-section").style.display = "none";
    document.getElementById("disconnect").style.display = "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  listSerialPorts();

  // Ports select element
  const selectElement = document.getElementById("com-ports");
  selectElement.addEventListener("change", () => {
    const selectedPort = selectElement.value;
    if (selectedPort) {
      connectToSerialPort(selectedPort);
    }
  });

  // Home all button
  const homeAllButton = document.getElementById("home-all");
  homeAllButton.addEventListener("click", () => {
    if (port) {
      port.write("G28 X Y\n");
    }
  });

  // Home base button
  const homeBaseButton = document.getElementById("home-base");
  homeBaseButton.addEventListener("click", () => {
    if (port) {
      port.write("G28 X;\n");
    }
  });

  // Home antenna button
  const homeAntennaButton = document.getElementById("home-antenna");
  homeAntennaButton.addEventListener("click", () => {
    if (port) {
      port.write("G28 Y;\n");
    }
  });

  // Position base button
  const positionBaseButton = document.getElementById("pos-base");
  positionBaseButton.addEventListener("click", () => {
    if (port) {
      const basePosition = document.getElementById("base-input");

      if (basePosition?.value) {
        port.write(`G1 X${basePosition.value} F150;\n`);
        basePosition.value = "";
      }
    }
  });

  // Position antenna button
  const positionAntennaButton = document.getElementById("pos-antenna");
  positionAntennaButton.addEventListener("click", () => {
    if (port) {
      const antennaPosition = document.getElementById("antenna-input");

      if (antennaPosition?.value) {
        port.write(`G1 Y${antennaPosition.value} F150;\n`);
        antennaPosition.value = "";
      }
    }
  });

  // Stop button
  const stopButton = document.getElementById("stop");
  stopButton.addEventListener("click", () => {
    const portPath = port?.path;
    if (port) {
      port.close();
      setTimeout(() => {
        connectToSerialPort(portPath);
      }, 500);
    }
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });

  // Disconnect button
  const disconnectButton = document.getElementById("disconnect");
  disconnectButton.addEventListener("click", () => {
    if (port) {
      port.close();
    }
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });

  // Send button
  const sendButton = document.getElementById("start-path");
  sendButton.addEventListener("click", () => {
    if (port) {
      const elevationEl = document.getElementById("elevation");
      const initialAzEl = document.getElementById("initial-azimuth");
      const finalAzEl = document.getElementById("final-azimuth");
      const timeEl = document.getElementById("time");

      const pathCaptionEl = document.getElementById("path-caption");

      if (!elevationEl?.value) {
        pathCaptionEl.textContent = "Elevación requerida";
        elevationEl.focus();
        return;
      }

      if (!initialAzEl?.value) {
        pathCaptionEl.textContent = "Azimut inicial requerido";
        initialAzEl.focus();
        return;
      }

      if (!finalAzEl?.value) {
        pathCaptionEl.textContent = "Azimut final requerido";
        finalAzEl.focus();
        return;
      }

      if (!timeEl?.value) {
        pathCaptionEl.textContent = "Tiempo requerido";
        timeEl.focus();
        return;
      }

      const elevation = parseFloat(elevationEl.value);
      const initialAz = parseFloat(initialAzEl.value);
      const finalAz = parseFloat(finalAzEl.value);
      const time = parseFloat(timeEl.value);

      const azimuthOffset = 90;
      const finalAzWithOffset = azimuthOffset + finalAz;
      const initialAzWithOffset = azimuthOffset + initialAz;

      const azimuthDistance = Math.abs(finalAzWithOffset - initialAzWithOffset);

      const azimuthSpeed = azimuthDistance / time;

      port.write(
        `G01 X${finalAzWithOffset + finalAz} Y${elevation} F${azimuthSpeed};\n`
      );

      pathCaptionEl.textContent = "Enviando trayectoria...";

      elevationEl.value = "";
      initialAzEl.value = "";
      finalAzEl.value = "";
      timeEl.value = "";
    }
  });

  const elevationInput = document.getElementById("elevation");
  elevationInput.addEventListener("keydown", () => {
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });

  const initialAzimuthInput = document.getElementById("initial-azimuth");
  initialAzimuthInput.addEventListener("keydown", () => {
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });

  const finalAzimuthInput = document.getElementById("final-azimuth");
  finalAzimuthInput.addEventListener("keydown", () => {
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });

  const timeInput = document.getElementById("time");
  timeInput.addEventListener("keydown", () => {
    const pathCaptionEl = document.getElementById("path-caption");
    pathCaptionEl.textContent = "";
  });
});

setTimeout(listPorts, 2000);
