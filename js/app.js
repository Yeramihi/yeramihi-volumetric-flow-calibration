/*
    Yeramihi Volumetric Flow Calibration
    Author: Yeramihi
    Repository: https://github.com/Yeramihi/yeramihi-volumetric-flow-calibration
    License: MIT
*/

document.addEventListener('DOMContentLoaded', function () {
    initialiseCookies();
    loadSavedSettings();

    const form = document.getElementById('calibrationForm');
    const downloadButton = document.getElementById('downloadButton');
    const clearButton = document.getElementById('clearButton');
    const outputBox = document.getElementById('gcodeOutput');
    const filamentType = document.getElementById('filamentType');

    hideDownloadButton(downloadButton);

    filamentType.addEventListener('change', function () {
        applyFilamentDefaults(filamentType.value);
    });

    clearButton.addEventListener('click', function () {
        clearAllInputs();
        hideDownloadButton(downloadButton);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const settings = getFormSettings();
        saveSettings(settings);

        const result = generateGCode(settings);
        outputBox.value = result.gcode;

        result.success ? showDownloadButton(downloadButton) : hideDownloadButton(downloadButton);
    });

    downloadButton.addEventListener('click', function () {
        const settings = getFormSettings();
        const gcode = outputBox.value;

        if (!gcode.trim()) return;

        const result = generateGCode(settings);

        if (!result.success) {
            hideDownloadButton(downloadButton);
            return;
        }

        downloadGCodeFile(gcode, settings);
    });
});

function initialiseCookies() {
    const banner = document.getElementById('cookieBanner');
    const acceptButton = document.getElementById('acceptCookies');
    const rejectButton = document.getElementById('rejectCookies');

    const consent = getCookie('yeramihiCookieConsent');

    if (!consent) {
        banner.classList.remove('hidden');
    }

    acceptButton.addEventListener('click', function () {
        setCookie('yeramihiCookieConsent', 'accepted', 365);
        banner.classList.add('hidden');
    });

    rejectButton.addEventListener('click', function () {
        setCookie('yeramihiCookieConsent', 'rejected', 365);
        deleteSettingsCookie();
        banner.classList.add('hidden');
    });
}

function applyFilamentDefaults(type) {
    const defaults = {
        PLA: { temp: 220, bedTemp: 55, fanSpeed: 0 },
        PETG: { temp: 240, bedTemp: 75, fanSpeed: 0 },
        TPU: { temp: 220, bedTemp: 50, fanSpeed: 0 }
    };

    if (!defaults[type]) return;

    document.getElementById('temp').value = defaults[type].temp;
    document.getElementById('bedTemp').value = defaults[type].bedTemp;
    document.getElementById('fanSpeed').value = defaults[type].fanSpeed;
}

function clearAllInputs() {
    document.getElementById('plateX').value = '';
    document.getElementById('plateY').value = '';
    document.getElementById('safeX').value = '';
    document.getElementById('safeY').value = '';
    document.getElementById('nozzle').value = '0.4';
    document.getElementById('filamentType').value = '';
    document.getElementById('temp').value = '';
    document.getElementById('bedTemp').value = '';
    document.getElementById('fanSpeed').value = 0;
    document.getElementById('calibrationType').value = 'coarse';
    document.getElementById('startingSpeed').value = 50;
    document.getElementById('zOffset').value = 0;
    document.getElementById('printNumbers').checked = false;
    document.getElementById('gcodeOutput').value = '';

    deleteSettingsCookie();
}

function showDownloadButton(button) {
    button.classList.remove('hidden-button');
    button.classList.add('visible-button');
    button.disabled = false;
    button.style.opacity = '1';
}

function hideDownloadButton(button) {
    button.classList.remove('visible-button');
    button.classList.add('hidden-button');
    button.disabled = true;
    button.style.opacity = '0.5';
}

function getFormSettings() {
    return {
        plateX: Number(document.getElementById('plateX').value),
        plateY: Number(document.getElementById('plateY').value),
        safeX: Number(document.getElementById('safeX').value),
        safeY: Number(document.getElementById('safeY').value),
        nozzle: Number(document.getElementById('nozzle').value),
        temp: Number(document.getElementById('temp').value),
        bedTemp: Number(document.getElementById('bedTemp').value),
        fanSpeed: Number(document.getElementById('fanSpeed').value),
        filamentType: document.getElementById('filamentType').value,
        calibrationType: document.getElementById('calibrationType').value,
        startingSpeed: Number(document.getElementById('startingSpeed').value),
        zOffset: Number(document.getElementById('zOffset').value || 0),
        printNumbers: document.getElementById('printNumbers').checked
    };
}

function downloadGCodeFile(gcode, settings) {
    const geometry = getNozzleGeometry(settings.nozzle);
    const speedStep = getFlowStep(settings.calibrationType) / geometry.lineArea;
    const finalSpeed = calculateFinalSpeed(settings, speedStep);

    const filename =
        settings.filamentType + '-' +
        settings.nozzle + 'mm-' +
        'speed-' +
        formatNumber(settings.startingSpeed) + '-' +
        formatNumber(finalSpeed) +
        '.gcode';

    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function calculateFinalSpeed(s, speedStep) {
    const margin = 10;
    const numberSpace = s.printNumbers ? 25 : 0;

    const yStart = s.safeY + margin;
    const yEnd = s.plateY - margin;

    const rectangleHeight = 2;
    const rectangleSpacing = 10;

    let rectangleCount = 0;

    for (let y = yStart; y + rectangleHeight <= yEnd; y += rectangleSpacing) {
        rectangleCount++;
    }

    return s.startingSpeed + ((rectangleCount - 1) * speedStep);
}

function saveSettings(settings) {
    const consent = getCookie('yeramihiCookieConsent');

    if (consent !== 'accepted') return;

    setCookie('yeramihiSettings', JSON.stringify(settings), 365);
}

function loadSavedSettings() {
    const consent = getCookie('yeramihiCookieConsent');

    if (consent !== 'accepted') return;

    const saved = getCookie('yeramihiSettings');

    if (!saved) return;

    try {
        const s = JSON.parse(saved);

        setValue('plateX', s.plateX);
        setValue('plateY', s.plateY);
        setValue('safeX', s.safeX);
        setValue('safeY', s.safeY);
        setValue('nozzle', s.nozzle);
        setValue('filamentType', s.filamentType);
        setValue('temp', s.temp);
        setValue('bedTemp', s.bedTemp);
        setValue('fanSpeed', s.fanSpeed);
        setValue('calibrationType', s.calibrationType);
        setValue('startingSpeed', s.startingSpeed);
        setValue('zOffset', s.zOffset);

        document.getElementById('printNumbers').checked = !!s.printNumbers;
    } catch (e) {
        console.warn('Could not load saved settings.', e);
    }
}

function setValue(id, value) {
    if (value !== undefined && value !== null) {
        document.getElementById(id).value = value;
    }
}

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();

    document.cookie =
        name + '=' +
        encodeURIComponent(value) +
        '; expires=' + expires +
        '; path=/; SameSite=Lax';
}

function getCookie(name) {
    const prefix = name + '=';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
        cookie = cookie.trim();

        if (cookie.startsWith(prefix)) {
            return decodeURIComponent(cookie.substring(prefix.length));
        }
    }

    return null;
}

function deleteSettingsCookie() {
    document.cookie = 'yeramihiSettings=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

function generateGCode(s) {
    const margin = 10;
    const numberSpace = s.printNumbers ? 25 : 0;

    const xStart = s.safeX + margin + numberSpace;
    const xEnd = s.plateX - margin;
    const printableWidth = xEnd - xStart;

    const yStart = s.safeY + margin;
    const yEnd = s.plateY - margin;

    const rectangleHeight = 2;
    const rectangleSpacing = 10;

    const geometry = getNozzleGeometry(s.nozzle);

    const layerHeight = geometry.layerHeight;
    const lineWidth = geometry.lineWidth;
    const lineArea = geometry.lineArea;

    const printZ = Math.max(0.02, layerHeight + s.zOffset);
    const safeZ = 5;
    const travelLift = 1;

    const filamentDiameter = 1.75;
    const filamentArea = Math.PI * Math.pow(filamentDiameter / 2, 2);

    const flowStep = getFlowStep(s.calibrationType);
    const speedStep = flowStep / lineArea;

    const fanPercent = Math.max(0, Math.min(100, s.fanSpeed));
    const fanValue = Math.round((fanPercent / 100) * 255);

    const labelFeedrate = Math.max(1, s.startingSpeed) * 60;

    let currentSpeed = s.startingSpeed;

    const gcode = [];

    if (!s.filamentType) {
        return {
            success: false,
            gcode: '; ERROR: Filament type is required.'
        };
    }

    if (printableWidth <= 0) {
        return {
            success: false,
            gcode: '; ERROR: Invalid geometry.\n; Safe X / number space / margins leave no printable width.'
        };
    }

    if (yStart + rectangleHeight > yEnd) {
        return {
            success: false,
            gcode: '; ERROR: Invalid geometry.\n; Safe Y / margins leave no printable height.'
        };
    }

    gcode.push('; Yeramihi Calibration Tool v0.1');
    gcode.push('; Repository: https://github.com/Yeramihi/yeramihi-volumetric-flow-calibration');
    gcode.push('; Volumetric flow calibration');
    gcode.push(';');
    gcode.push('; Calibration type: ' + s.calibrationType);
    gcode.push('; Filament: ' + s.filamentType);
    gcode.push('; Nozzle: ' + s.nozzle + 'mm');
    gcode.push('; Layer height: ' + layerHeight.toFixed(3) + 'mm');
    gcode.push('; Line width: ' + lineWidth.toFixed(3) + 'mm');
    gcode.push('; Line area: ' + lineArea.toFixed(3) + 'mm2');
    gcode.push('; Starting speed: ' + formatNumber(s.startingSpeed) + 'mm/s');
    gcode.push('; Volumetric flow step: ' + flowStep.toFixed(2) + 'mm3/s');
    gcode.push('; Speed step: ' + formatNumber(speedStep) + 'mm/s');
    gcode.push('; Bed temperature: ' + s.bedTemp + 'C');
    gcode.push('; Nozzle temperature: ' + s.temp + 'C');
    gcode.push('; Fan speed: ' + fanPercent + '%');
    gcode.push('; Plate size: ' + s.plateX + 'mm x ' + s.plateY + 'mm');
    gcode.push('; Safe start: X' + s.safeX + ' Y' + s.safeY);
    gcode.push('; Pattern start: X' + xStart.toFixed(3) + ' Y' + yStart.toFixed(3));
    gcode.push('; Printable width: ' + printableWidth.toFixed(3) + 'mm');
    gcode.push('; Number label band: ' + (s.printNumbers ? '25mm enabled' : 'disabled'));
    gcode.push('; Z offset adjustment: ' + s.zOffset + 'mm');
    gcode.push(';');
    gcode.push('; Volumetric flow = speed * line area');
    gcode.push('; Main measurement segments are the long horizontal moves.');
    gcode.push('; Short 2mm sides are only used to close the rectangle and may not reach requested speed.');
    gcode.push('; Labels show volumetric flow in mm3/s.');
    gcode.push('');

    gcode.push('G90 ; absolute positioning for setup');
    gcode.push('M82 ; absolute extrusion for setup');
    gcode.push('G28 ; home all axes');
    gcode.push('');

    gcode.push('M140 S' + s.bedTemp + ' ; set bed temperature');
    gcode.push('M104 S' + s.temp + ' ; set nozzle temperature');
    gcode.push('M190 S' + s.bedTemp + ' ; wait for bed temperature');
    gcode.push('M109 S' + s.temp + ' ; wait for nozzle temperature');
    gcode.push('M106 S' + fanValue + ' ; set part cooling fan to ' + fanPercent + '%');
    gcode.push('');

    gcode.push('G1 Z' + safeZ.toFixed(3) + ' F1200 ; lift to safe Z before XY travel');
    gcode.push('G1 X' + s.safeX.toFixed(3) + ' Y' + s.safeY.toFixed(3) + ' F6000 ; move to safe starting position');
    gcode.push('');

    addPrimeLine(gcode, s, layerHeight, lineWidth, filamentArea);

    gcode.push('G1 X' + xStart.toFixed(3) + ' Y' + yStart.toFixed(3) + ' F6000 ; move to first rectangle start');
    gcode.push('G1 Z' + printZ.toFixed(3) + ' F1200 ; lower to print height');
    gcode.push('');
    gcode.push('M83 ; relative extrusion for pattern and labels');
    gcode.push('');

    const rectangleYs = [];

    for (let y = yStart; y + rectangleHeight <= yEnd; y += rectangleSpacing) {
        rectangleYs.push(y);
    }

    for (let i = 0; i < rectangleYs.length; i++) {
        const y = rectangleYs[i];
        const feedrate = currentSpeed * 60;
        const flow = currentSpeed * lineArea;
        const flowLabel = formatFlowLabel(flow, s.calibrationType);

        if (s.printNumbers) {
            gcode.push('; Label: ' + flowLabel + 'mm3/s');
            drawNumberLabel(
                gcode,
                flowLabel,
                xStart - 1,
                y,
                labelFeedrate,
                lineArea,
                filamentArea
            );

            gcode.push('G1 X' + xStart.toFixed(3) + ' Y' + y.toFixed(3) + ' F6000 ; move back to rectangle start');
            gcode.push('');
        }

        gcode.push('G91 ; relative positioning for rectangle');
        gcode.push('; Rectangle speed: ' + formatNumber(currentSpeed) + 'mm/s');
        gcode.push('; Volumetric flow: ' + flow.toFixed(2) + 'mm3/s');
        gcode.push('; Rectangle geometry: ' + printableWidth.toFixed(3) + 'mm wide x ' + rectangleHeight.toFixed(3) + 'mm tall');

        addRelativeExtrudeMove(gcode, printableWidth, 0, feedrate, lineArea, filamentArea, 'right - main measurement segment');
        addRelativeExtrudeMove(gcode, 0, rectangleHeight, feedrate, lineArea, filamentArea, 'forward - short connector');
        addRelativeExtrudeMove(gcode, -printableWidth, 0, feedrate, lineArea, filamentArea, 'left - main measurement segment');
        addRelativeExtrudeMove(gcode, 0, -rectangleHeight, feedrate, lineArea, filamentArea, 'back - short connector');

        if (i < rectangleYs.length - 1) {
            gcode.push('G1 Z' + travelLift.toFixed(3) + ' F1200 ; lift');
            gcode.push('G1 X0.000 Y' + rectangleSpacing.toFixed(3) + ' F6000 ; move to next rectangle');
            gcode.push('G1 Z-' + travelLift.toFixed(3) + ' F1200 ; lower');
            gcode.push('');
        }

        currentSpeed += speedStep;
    }

    gcode.push('');
    gcode.push('G90 ; restore absolute positioning');
    gcode.push('G92 E0 ; reset extrusion distance');
    gcode.push('M82 ; restore absolute extrusion');
    gcode.push('G1 Z10 F1200 ; final lift');
    gcode.push('M104 S0 ; turn off nozzle');
    gcode.push('M140 S0 ; turn off bed');
    gcode.push('M106 S0 ; turn off part cooling fan');
    gcode.push('M84 ; disable motors');

    return {
        success: true,
        gcode: gcode.join('\n')
    };
}

function addPrimeLine(gcode, s, layerHeight, lineWidth, filamentArea) {
    const margin = 10;

    const primeLength = Math.min(120, s.plateX - 2 * margin);
    const primeXStart = Math.max(s.safeX + margin, (s.plateX - primeLength) / 2);
    const primeXEnd = primeXStart + primeLength;
    const primeY = s.safeY;

    const primeHeight = layerHeight * 1.2;
    const primeWidth = lineWidth * 1.5;
    const primeArea = primeHeight * primeWidth;

    const primeVolume = primeLength * primeArea;
    const primeE = primeVolume / filamentArea;

    gcode.push('; Prime line');
    gcode.push('; Slow, wider and taller than normal extrusion.');
    gcode.push('; Used to stabilise nozzle pressure before the calibration pattern.');
    gcode.push('G1 X' + primeXStart.toFixed(3) + ' Y' + primeY.toFixed(3) + ' F6000 ; move to prime line start');
    gcode.push('G1 Z' + primeHeight.toFixed(3) + ' F600 ; lower to prime height');
    gcode.push('G92 E0 ; reset extrusion before prime');
    gcode.push('G1 X' + primeXEnd.toFixed(3) + ' E' + primeE.toFixed(5) + ' F600 ; prime line');
    gcode.push('G92 E0 ; reset extrusion after prime');
    gcode.push('');
}

function drawNumberLabel(gcode, text, rightEdgeX, bottomY, feedrate, lineArea, filamentArea) {
    const digitWidth = 4;
    const digitHeight = 8;
    const charGap = 0.8;
    const dotSize = 1;

    const labelWidth = getLabelWidth(text, digitWidth, charGap, dotSize);
    let cursorX = rightEdgeX - labelWidth;

    gcode.push('G90 ; absolute positioning for label');

    for (const char of text) {
        if (char === '.') {
            drawDecimalPoint(gcode, cursorX, bottomY, dotSize, feedrate, lineArea, filamentArea);
            cursorX += dotSize + charGap;
        } else {
            drawDigit(gcode, char, cursorX, bottomY, digitWidth, digitHeight, feedrate, lineArea, filamentArea);
            cursorX += digitWidth + charGap;
        }
    }
}

function getLabelWidth(text, digitWidth, charGap, dotSize) {
    let width = 0;

    for (const char of text) {
        width += char === '.' ? dotSize : digitWidth;
        width += charGap;
    }

    return Math.max(0, width - charGap);
}

function drawDigit(gcode, digit, x, y, width, height, feedrate, lineArea, filamentArea) {
    const digitSegments = {
        '0': ['A', 'B', 'C', 'D', 'E', 'F'],
        '1': ['B', 'C'],
        '2': ['A', 'B', 'G', 'E', 'D'],
        '3': ['A', 'B', 'G', 'C', 'D'],
        '4': ['F', 'G', 'B', 'C'],
        '5': ['A', 'F', 'G', 'C', 'D'],
        '6': ['A', 'F', 'G', 'E', 'C', 'D'],
        '7': ['A', 'B', 'C'],
        '8': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        '9': ['A', 'B', 'C', 'D', 'F', 'G']
    };

    const segmentPoints = {
        A: [[0, height], [width, height]],
        B: [[width, height], [width, height / 2]],
        C: [[width, height / 2], [width, 0]],
        D: [[0, 0], [width, 0]],
        E: [[0, height / 2], [0, 0]],
        F: [[0, height], [0, height / 2]],
        G: [[0, height / 2], [width, height / 2]]
    };

    if (!digitSegments[digit]) return;

    for (const segment of digitSegments[digit]) {
        const points = segmentPoints[segment];
        const start = points[0];
        const end = points[1];

        drawAbsoluteExtrudeLine(
            gcode,
            x + start[0],
            y + start[1],
            x + end[0],
            y + end[1],
            feedrate,
            lineArea,
            filamentArea,
            'digit ' + digit + ' segment ' + segment
        );
    }
}

function drawDecimalPoint(gcode, x, y, size, feedrate, lineArea, filamentArea) {
    drawAbsoluteExtrudeLine(gcode, x, y, x + size, y, feedrate, lineArea, filamentArea, 'decimal point bottom');
    drawAbsoluteExtrudeLine(gcode, x + size, y, x + size, y + size, feedrate, lineArea, filamentArea, 'decimal point right');
    drawAbsoluteExtrudeLine(gcode, x + size, y + size, x, y + size, feedrate, lineArea, filamentArea, 'decimal point top');
    drawAbsoluteExtrudeLine(gcode, x, y + size, x, y, feedrate, lineArea, filamentArea, 'decimal point left');
}

function drawAbsoluteExtrudeLine(gcode, x1, y1, x2, y2, feedrate, lineArea, filamentArea, comment) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const volume = distance * lineArea;
    const extrusion = volume / filamentArea;

    gcode.push('G1 X' + x1.toFixed(3) + ' Y' + y1.toFixed(3) + ' F6000 ; move to ' + comment);
    gcode.push(
        'G1 X' + x2.toFixed(3) +
        ' Y' + y2.toFixed(3) +
        ' E' + extrusion.toFixed(5) +
        ' F' + feedrate.toFixed(0) +
        ' ; ' + comment
    );
}

function addRelativeExtrudeMove(gcode, x, y, feedrate, lineArea, filamentArea, comment) {
    const distance = Math.hypot(x, y);
    const volume = distance * lineArea;
    const extrusion = volume / filamentArea;

    gcode.push(
        'G1 X' + x.toFixed(3) +
        ' Y' + y.toFixed(3) +
        ' E' + extrusion.toFixed(5) +
        ' F' + feedrate.toFixed(0) +
        ' ; ' + comment
    );
}

function getFlowStep(calibrationType) {
    return calibrationType === 'fine' ? 0.1 : 1.0;
}

function getNozzleGeometry(nozzle) {
    switch (nozzle) {
        case 0.2:
            return { layerHeight: 0.10, lineWidth: 0.25, lineArea: 0.025 };

        case 0.4:
            return { layerHeight: 0.20, lineWidth: 0.50, lineArea: 0.100 };

        case 0.6:
            return { layerHeight: 0.30, lineWidth: 0.667, lineArea: 0.200 };

        case 0.8:
            return { layerHeight: 0.40, lineWidth: 1.00, lineArea: 0.400 };

        default:
            const layerHeight = nozzle * 0.5;
            const lineWidth = nozzle * 1.25;

            return {
                layerHeight,
                lineWidth,
                lineArea: layerHeight * lineWidth
            };
    }
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatFlowLabel(value, calibrationType) {
    if (calibrationType === 'fine') {
        return value.toFixed(2).replace(/\.?0+$/, '');
    }

    return formatNumber(value);
}