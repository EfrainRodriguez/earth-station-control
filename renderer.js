const { SerialPort } = require("serialport");

let port = null;
const portCaptionElement = document.getElementById("port-caption");

function calculateElevation(elevation) {
  const elevationOffset = 180;
  return elevationOffset - elevation;
}

function calculateAzimuth(azimuth) {
  const azimuthOffset = 180;
  if (azimuth > 180) {
    return (360 - azimuth) + azimuthOffset;
  }
  return azimuthOffset - azimuth;
}

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
        const azimuth = calculateAzimuth(parseFloat(basePosition.value));
        port.write(`G1 X${azimuth} F250;\n`);
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
        const elevation = calculateElevation(antennaPosition.value);
        port.write(`G1 Y${elevation} F250;\n`);
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
      const maxElevationEl = document.getElementById("max-elevation");
      const initialAzEl = document.getElementById("initial-azimuth");
      const finalAzEl = document.getElementById("final-azimuth");
      const timeEl = document.getElementById("time");

      const pathCaptionEl = document.getElementById("path-caption");

      if (!maxElevationEl?.value) {
        pathCaptionEl.textContent = "Elevación máxima requerida";
        maxElevationEl.focus();
        return;
      }

      // if (!directionEl?.value) {
      //   pathCaptionEl.textContent = "La dirección es requerida";
      //   directionEl.focus();
      //   return;
      // }

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

      if (timeEl.value <= 0) {
        pathCaptionEl.textContent = "El tiempo debe ser mayor a 0";
        timeEl.focus();
        return;
      }

      const maxElevation = calculateElevation(parseFloat(maxElevationEl.value));
      // const finalElevation = calculateElevation(
      //   parseFloat(finalElevationEl.value)
      // );

      const initialAz = calculateAzimuth(parseFloat(initialAzEl.value));
      const finalAz = calculateAzimuth(parseFloat(finalAzEl.value));

      const time = parseFloat(timeEl.value);
      const deltaAzimuth = Math.abs(finalAz - initialAz);

      const azDirection = finalAz < initialAz ? -1 : 1;

      const time2 = time / 2;
      const azimuth2 = deltaAzimuth / 2;
      const elevation2 = Math.abs(maxElevation - calculateElevation(0));

      const elevationSpeed = elevation2 / time2;
      const azimuthSpeed = azimuth2 / time2;

      const vel = Math.sqrt(
        Math.pow(elevationSpeed, 2) + Math.pow(azimuthSpeed, 2)
      );

      port.write(
        `G01 X${
          initialAz + azimuth2 * azDirection
        } Y${maxElevation} F${vel};\n`
      );
      port.write(`G01 X${finalAz} Y${calculateElevation(0)};\n`);

      pathCaptionEl.textContent = "Enviando trayectoria...";

      maxElevationEl.value = "";
      // finalElevationEl.value = "";
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
