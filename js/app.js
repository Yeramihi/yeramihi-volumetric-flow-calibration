/*
    Yeramihi Volumetric Flow Calibration
    Author: Yeramihi
    Repository: https://github.com/Yeramihi/yeramihi-volumetric-flow-calibration
    License: MIT
*/

document.addEventListener('DOMContentLoaded', function () {
    initialiseTabs();
    initialiseCookies();
    loadSavedSettings();

    const form = document.getElementById('calibrationForm');
    const downloadButton = document.getElementById('downloadButton');
    const copyButton = document.getElementById('copyButton');
    const copyTooltip = document.getElementById('copyTooltip');
    const clearButton = document.getElementById('clearButton');
    const outputBox = document.getElementById('gcodeOutput');
    const outputWrapper = document.getElementById('gcodeOutputWrapper');
    const nozzleInput = document.getElementById('nozzle');
    const filamentType = document.getElementById('filamentType');
    const calibrationType = document.getElementById('calibrationType');
    const startingSpeedInput = document.getElementById('startingSpeed');
    const startingFlowInput = document.getElementById('startingFlow');
    let startingValueSource = 'speed';

    hideDownloadButton(downloadButton);
    hideDownloadButton(copyButton);
    hideCopyTooltip(copyTooltip);
    hideOutputWrapper(outputWrapper);
    syncStartingFlowFromSpeed(true);
    updateFilamentEstimate(form);

    filamentType.addEventListener('change', function () {
        applyFilamentDefaults(filamentType.value);
    });

    startingSpeedInput.addEventListener('input', function () {
        startingValueSource = 'speed';
        syncStartingFlowFromSpeed();
    });

    startingSpeedInput.addEventListener('change', function () {
        startingValueSource = 'speed';
        syncStartingFlowFromSpeed(true);
    });

    startingFlowInput.addEventListener('input', function () {
        startingValueSource = 'flow';
        syncStartingSpeedFromFlow();
    });

    startingFlowInput.addEventListener('change', function () {
        startingValueSource = 'flow';
        syncStartingSpeedFromFlow(true);
    });

    nozzleInput.addEventListener('change', function () {
        syncStartingInputs(startingValueSource, true);
    });

    calibrationType.addEventListener('change', function () {
        syncStartingInputs(startingValueSource, true);
    });

    clearButton.addEventListener('click', function () {
        clearAllInputs();
        invalidateGeneratedOutput(outputBox, outputWrapper, downloadButton, copyButton, copyTooltip);
        updateFilamentEstimate(form);
    });

    form.addEventListener('input', function () {
        invalidateGeneratedOutput(outputBox, outputWrapper, downloadButton, copyButton, copyTooltip);
        updateFilamentEstimate(form);
    });

    form.addEventListener('change', function () {
        invalidateGeneratedOutput(outputBox, outputWrapper, downloadButton, copyButton, copyTooltip);
        updateFilamentEstimate(form);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        syncStartingInputs(startingValueSource, true);

        if (!form.reportValidity()) return;

        const settings = getFormSettings();
        saveSettings(settings);

        const result = generateGCode(settings);
        outputBox.value = result.gcode;
        showOutputWrapper(outputWrapper);

        if (result.success) {
            resetCopyButton(copyButton);
            hideCopyTooltip(copyTooltip);
            showDownloadButton(downloadButton);
            showDownloadButton(copyButton);
        } else {
            hideDownloadButton(downloadButton);
            hideDownloadButton(copyButton);
            hideCopyTooltip(copyTooltip);
        }
    });

    downloadButton.addEventListener('click', function () {
        const settings = getFormSettings();
        const gcode = outputBox.value;

        if (!gcode.trim()) return;

        downloadGCodeFile(gcode, settings);
    });

    copyButton.addEventListener('click', function () {
        copyGCodeToClipboard(outputBox.value, copyTooltip);
    });
});

function initialiseTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabLinks = document.querySelectorAll('[data-tab-target]');
    const tabPanels = document.querySelectorAll('[data-tab-panel]');

    tabLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            activateTab(link.dataset.tabTarget, tabButtons, tabPanels);
        });
    });
}

function activateTab(targetId, tabButtons, tabPanels) {
    tabPanels.forEach(function (panel) {
        panel.classList.toggle('hidden', panel.id !== targetId);
    });

    tabButtons.forEach(function (button) {
        const isActive = button.dataset.tabTarget === targetId;

        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function syncStartingInputs(source, normalizeSource) {
    if (source === 'flow') {
        syncStartingSpeedFromFlow(normalizeSource);
        return;
    }

    syncStartingFlowFromSpeed(normalizeSource);
}

function syncStartingFlowFromSpeed(normalizeSource) {
    const speedInput = document.getElementById('startingSpeed');
    const flowInput = document.getElementById('startingFlow');
    const speed = Number(speedInput.value);

    updateStartingFlowStep();

    if (speedInput.value === '' || !Number.isFinite(speed)) {
        flowInput.value = '';
        return;
    }

    const lineArea = getCurrentLineArea();
    const roundedFlow = roundStartingFlow(speed * lineArea);

    if (normalizeSource) {
        setStartingInputsFromFlow(roundedFlow, lineArea);
        return;
    }

    flowInput.value = formatStartingFlow(roundedFlow);
}

function syncStartingSpeedFromFlow(normalizeSource) {
    const speedInput = document.getElementById('startingSpeed');
    const flowInput = document.getElementById('startingFlow');
    const flow = Number(flowInput.value);

    updateStartingFlowStep();

    if (flowInput.value === '' || !Number.isFinite(flow)) {
        speedInput.value = '';
        return;
    }

    const lineArea = getCurrentLineArea();
    const roundedFlow = roundStartingFlow(flow);

    if (normalizeSource) {
        setStartingInputsFromFlow(roundedFlow, lineArea);
        return;
    }

    speedInput.value = formatInputNumber(lineArea > 0 ? roundedFlow / lineArea : 0);
}

function setStartingInputsFromFlow(flow, lineArea) {
    const speedInput = document.getElementById('startingSpeed');
    const flowInput = document.getElementById('startingFlow');
    const speed = lineArea > 0 ? flow / lineArea : 0;

    speedInput.value = formatInputNumber(speed);
    flowInput.value = formatStartingFlow(flow);
}

function updateStartingFlowStep() {
    document.getElementById('startingFlow').step = String(getFlowStep(document.getElementById('calibrationType').value));
}

function getCurrentLineArea() {
    return getNozzleGeometry(Number(document.getElementById('nozzle').value)).lineArea;
}

function roundStartingFlow(flow) {
    return roundFlowForCalibration(flow, document.getElementById('calibrationType').value);
}

function formatStartingFlow(flow) {
    if (document.getElementById('calibrationType').value === 'fine') {
        return flow.toFixed(1);
    }

    return String(Math.round(flow));
}

function formatInputNumber(value) {
    return value.toFixed(3).replace(/\.?0+$/, '');
}

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
    const defaults = getFilamentDefaults(type);

    if (!defaults) return;

    document.getElementById('temp').value = defaults.temp;
    document.getElementById('bedTemp').value = defaults.bedTemp;
    document.getElementById('fanSpeed').value = defaults.fanSpeed;
    document.getElementById('retractPrimeLength').value = defaults.retractPrimeLength;
}

function getFilamentDefaults(type) {
    const defaults = {
        PLA: { temp: 220, bedTemp: 55, fanSpeed: 0, retractPrimeLength: 0.8, labelSpeed: 25 },
        PETG: { temp: 240, bedTemp: 75, fanSpeed: 0, retractPrimeLength: 1.0, labelSpeed: 20 },
        TPU: { temp: 220, bedTemp: 50, fanSpeed: 0, retractPrimeLength: 0.4, labelSpeed: 10 }
    };

    return defaults[type] || null;
}

function getFilamentLabelSpeed(type) {
    const defaults = getFilamentDefaults(type);

    return defaults ? defaults.labelSpeed : 20;
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
    document.getElementById('filamentSpoolCost').value = '';
    document.getElementById('retractPrimeLength').value = '';
    document.getElementById('calibrationType').value = 'coarse';
    document.getElementById('startingSpeed').value = 50;
    syncStartingFlowFromSpeed(true);
    document.getElementById('zOffset').value = 0;
    document.getElementById('printNumbers').checked = false;
    document.getElementById('riskAcknowledgement').checked = false;
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

function showOutputWrapper(wrapper) {
    wrapper.classList.remove('hidden');
}

function hideOutputWrapper(wrapper) {
    wrapper.classList.add('hidden');
}

function invalidateGeneratedOutput(outputBox, outputWrapper, downloadButton, copyButton, copyTooltip) {
    outputBox.value = '';
    hideOutputWrapper(outputWrapper);
    hideDownloadButton(downloadButton);
    hideDownloadButton(copyButton);
    resetCopyButton(copyButton);
    hideCopyTooltip(copyTooltip);
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
        filamentSpoolCost: getOptionalNumber('filamentSpoolCost'),
        retractPrimeLength: Number(document.getElementById('retractPrimeLength').value || 0),
        filamentType: document.getElementById('filamentType').value,
        calibrationType: document.getElementById('calibrationType').value,
        startingSpeed: Number(document.getElementById('startingSpeed').value),
        zOffset: Number(document.getElementById('zOffset').value || 0),
        printNumbers: document.getElementById('printNumbers').checked
    };
}

function getOptionalNumber(id) {
    const value = document.getElementById(id).value;

    return value === '' ? null : Number(value);
}

function updateFilamentEstimate(form) {
    const panel = document.getElementById('filamentEstimatePanel');
    const status = document.getElementById('filamentEstimateStatus');
    const values = document.getElementById('filamentEstimateValues');
    const costs = document.getElementById('filamentCostEstimates');

    if (!hasRequiredEstimateInputs(form)) {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    const settings = getFormSettings();
    const result = generateGCode(settings);

    if (!result.success || !result.estimate) {
        status.textContent = getEstimateErrorMessage(result.gcode);
        values.classList.add('hidden');
        costs.classList.add('hidden');
        return;
    }

    status.textContent = '';
    values.classList.remove('hidden');
    costs.classList.remove('hidden');

    renderFilamentEstimate(result.estimate, settings);
}

function hasRequiredEstimateInputs(form) {
    const requiredControls = Array.from(form.querySelectorAll('[required]')).filter(function (control) {
        return control.id !== 'riskAcknowledgement';
    });
    const spoolCostInput = document.getElementById('filamentSpoolCost');

    if (spoolCostInput.value !== '' && !spoolCostInput.checkValidity()) {
        return false;
    }

    return requiredControls.every(function (control) {
        return control.checkValidity();
    });
}

function getEstimateErrorMessage(gcode) {
    const firstErrorLine = gcode.split('\n').find(function (line) {
        return line.indexOf('; ERROR:') === 0;
    });

    return firstErrorLine ? firstErrorLine.replace('; ERROR: ', '') : 'Estimate unavailable for the current settings.';
}

function renderFilamentEstimate(estimate, settings) {
    document.getElementById('estimateLength').textContent = formatFilamentLength(estimate.lengthMm);
    document.getElementById('estimateWeight').textContent = formatFilamentWeight(estimate.weightGrams);

    const costContainer = document.getElementById('filamentCostEstimates');
    costContainer.textContent = '';

    getFilamentCostEstimates(estimate, settings).forEach(function (costEstimate) {
        const item = document.createElement('div');
        const label = document.createElement('span');
        const value = document.createElement('strong');

        label.textContent = 'If 1kg spool cost was ' + formatSpoolCurrency(costEstimate.spoolCost);
        value.textContent = 'This will cost ' + formatCurrency(costEstimate.cost);

        item.appendChild(label);
        item.appendChild(value);
        costContainer.appendChild(item);
    });
}

function downloadGCodeFile(gcode, settings) {
    const filename = buildGCodeFilename(settings);

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

function buildGCodeFilename(settings) {
    const finalFlow = calculateFinalFlow(settings);
    const startingFlow = calculateStartingFlow(settings);
    const numbersLabel = settings.printNumbers ? 'with numbers' : 'without numbers';

    return (
        settings.filamentType +
        ' - nozzle ' +
        formatNumber(settings.nozzle) +
        'mm ' +
        settings.temp +
        ' Celsius - bedplate ' +
        settings.bedTemp +
        ' Celsius - speed range ' +
        formatNumber(startingFlow) +
        ' - ' +
        formatNumber(finalFlow) +
        ' - ' +
        capitalise(settings.calibrationType) +
        ' - ' +
        numbersLabel +
        '.GCODE'
    );
}

function calculateStartingFlow(settings) {
    const geometry = getNozzleGeometry(settings.nozzle);

    return roundFlowForCalibration(settings.startingSpeed * geometry.lineArea, settings.calibrationType);
}

function calculateFinalFlow(settings) {
    const flowStep = getFlowStep(settings.calibrationType);
    const rectangleCount = calculateRectangleCount(settings);
    const startingFlow = calculateStartingFlow(settings);

    return startingFlow + ((rectangleCount - 1) * flowStep);
}

function calculateRectangleCount(s) {
    const margin = 10;
    const yStart = s.safeY + margin;
    const yEnd = s.plateY - margin;
    const rectangleHeight = 2;
    const rectangleSpacing = 10;

    let rectangleCount = 0;

    for (let y = yStart; y + rectangleHeight <= yEnd; y += rectangleSpacing) {
        rectangleCount++;
    }

    return rectangleCount;
}

function calculateFilamentEstimateFromGCode(gcode, filamentDiameter, filamentType) {
    const lengthMm = calculateNetExtrusionLength(gcode);
    const filamentArea = Math.PI * Math.pow(filamentDiameter / 2, 2);
    const volumeMm3 = lengthMm * filamentArea;
    const weightGrams = (volumeMm3 / 1000) * getFilamentDensity(filamentType);

    return {
        lengthMm,
        volumeMm3,
        weightGrams,
        density: getFilamentDensity(filamentType)
    };
}

function calculateNetExtrusionLength(gcode) {
    let relativeExtrusion = false;
    let currentE = 0;
    let total = 0;

    gcode.split('\n').forEach(function (rawLine) {
        const line = rawLine.split(';')[0].trim();

        if (!line) return;

        if (/\bM83\b/i.test(line)) {
            relativeExtrusion = true;
            return;
        }

        if (/\bM82\b/i.test(line)) {
            relativeExtrusion = false;
            return;
        }

        const eMatch = line.match(/(?:^|\s)E(-?\d+(?:\.\d+)?)/i);

        if (!eMatch) return;

        const eValue = Number(eMatch[1]);

        if (/\bG92\b/i.test(line)) {
            currentE = eValue;
            return;
        }

        if (!/^(G0|G1)\b/i.test(line)) return;

        if (relativeExtrusion) {
            total += eValue;
            currentE += eValue;
        } else {
            total += eValue - currentE;
            currentE = eValue;
        }
    });

    return Math.max(0, Number(total.toFixed(5)));
}

function insertFilamentEstimateHeader(gcode, estimate, settings) {
    const lines = [
        '; Estimated filament length: ' + formatFilamentLength(estimate.lengthMm),
        '; Estimated filament weight: ' + formatFilamentWeight(estimate.weightGrams)
    ];
    const costEstimates = getFilamentCostEstimates(estimate, settings);

    if (settings.filamentSpoolCost !== null) {
        const costEstimate = costEstimates[0];
        lines.push(
            '; Estimated filament cost: ' +
            formatCurrency(costEstimate.cost) +
            ' if 1kg spool cost was ' +
            formatSpoolCurrency(costEstimate.spoolCost)
        );
    } else {
        lines.push('; Estimated filament cost by 1kg spool price:');

        costEstimates.forEach(function (costEstimate) {
            lines.push(
                '; - ' +
                formatSpoolCurrency(costEstimate.spoolCost) +
                ' spool: ' +
                formatCurrency(costEstimate.cost)
            );
        });
    }

    lines.push(';');

    const insertIndex = gcode.indexOf('; Volumetric flow = speed * line area');

    if (insertIndex === -1) {
        gcode.splice(0, 0, ...lines);
        return;
    }

    gcode.splice(insertIndex, 0, ...lines);
}

function getFilamentCostEstimates(estimate, settings) {
    const defaultSpoolCosts = [10, 15, 20, 30, 50];
    const spoolCosts = settings.filamentSpoolCost !== null ? [settings.filamentSpoolCost] : defaultSpoolCosts;

    return spoolCosts.map(function (spoolCost) {
        const normalisedCost = Math.max(0, Number(spoolCost) || 0);

        return {
            spoolCost: normalisedCost,
            cost: (estimate.weightGrams / 1000) * normalisedCost
        };
    });
}

function copyGCodeToClipboard(gcode, tooltip) {
    if (!gcode.trim()) return;

    copyTextToClipboard(gcode)
        .then(function () {
            showCopyTooltip(tooltip, 'G-code copied to clipboard');
        })
        .catch(function () {
            showCopyTooltip(tooltip, 'Copy failed');
        });
}

function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
        const textArea = document.createElement('textarea');

        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';

        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy') ? resolve() : reject(new Error('Copy command failed.'));
        } catch (e) {
            reject(e);
        } finally {
            document.body.removeChild(textArea);
        }
    });
}

function showCopyTooltip(tooltip, text) {
    window.clearTimeout(tooltip.hideTimer);

    tooltip.textContent = text;
    tooltip.classList.add('visible');

    tooltip.hideTimer = window.setTimeout(function () {
        hideCopyTooltip(tooltip);
    }, 1600);
}

function resetCopyButton(button) {
    button.textContent = 'Copy to clipboard';
}

function hideCopyTooltip(tooltip) {
    window.clearTimeout(tooltip.hideTimer);
    tooltip.classList.remove('visible');
    tooltip.textContent = '';
}

function capitalise(value) {
    if (!value) return '';

    return value.charAt(0).toUpperCase() + value.slice(1);
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

        if (s.filamentSpoolCost !== undefined && s.filamentSpoolCost !== null) {
            setValue('filamentSpoolCost', s.filamentSpoolCost);
        }

        if (s.retractPrimeLength !== undefined && s.retractPrimeLength !== null) {
            setValue('retractPrimeLength', s.retractPrimeLength);
        } else {
            const defaults = getFilamentDefaults(s.filamentType);

            if (defaults) {
                setValue('retractPrimeLength', defaults.retractPrimeLength);
            }
        }

        document.getElementById('printNumbers').checked = !!s.printNumbers;
        syncStartingFlowFromSpeed(true);
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
    const minimumBedDimension = 100;
    const minimumRectangleAreaDimension = 100;

    const xStart = s.safeX + margin + numberSpace;
    const xEnd = s.plateX - margin;
    const printableWidth = xEnd - xStart;

    const yStart = s.safeY + margin;
    const yEnd = s.plateY - margin;
    const printableHeight = yEnd - yStart;

    const rectangleHeight = 2;
    const rectangleSpacing = 10;

    const geometry = getNozzleGeometry(s.nozzle);

    const layerHeight = geometry.layerHeight;
    const lineWidth = geometry.lineWidth;
    const lineArea = geometry.lineArea;

    const printZ = Math.max(0.02, layerHeight + s.zOffset);
    const safeZ = 5;
    const travelLift = 1;
    const retractPrimeLength = Math.max(0, Number(s.retractPrimeLength) || 0);
    const labelRetractPrimeLength = retractPrimeLength * 0.2;

    const filamentDiameter = 1.75;
    const filamentArea = Math.PI * Math.pow(filamentDiameter / 2, 2);

    const flowStep = getFlowStep(s.calibrationType);
    const speedStep = flowStep / lineArea;
    const startingFlow = roundFlowForCalibration(s.startingSpeed * lineArea, s.calibrationType);
    const startingSpeed = startingFlow / lineArea;
    const labelSpeed = getFilamentLabelSpeed(s.filamentType);

    const fanPercent = Math.max(0, Math.min(100, s.fanSpeed));
    const fanValue = Math.round((fanPercent / 100) * 255);

    const labelFeedrate = labelSpeed * 60;

    let currentSpeed = startingSpeed;

    const gcode = [];

    if (!s.filamentType) {
        return {
            success: false,
            gcode: '; ERROR: Filament type is required.'
        };
    }

    if (s.plateX < minimumBedDimension || s.plateY < minimumBedDimension) {
        return {
            success: false,
            gcode:
                '; ERROR: Unsupported bed size.\n' +
                '; Minimum supported bed size is ' + minimumBedDimension + 'mm x ' + minimumBedDimension + 'mm.\n' +
                '; Current bed size: ' + formatNumber(s.plateX) + 'mm x ' + formatNumber(s.plateY) + 'mm.'
        };
    }

    if (printableWidth <= 0) {
        return {
            success: false,
            gcode: '; ERROR: Invalid geometry.\n; Safe X / number space / margins leave no printable width.'
        };
    }

    if (printableHeight <= 0) {
        return {
            success: false,
            gcode: '; ERROR: Invalid geometry.\n; Safe Y / margins leave no printable height.'
        };
    }

    if (printableWidth < minimumRectangleAreaDimension || printableHeight < minimumRectangleAreaDimension) {
        const requiredPlateX = s.safeX + numberSpace + (2 * margin) + minimumRectangleAreaDimension;
        const requiredPlateY = s.safeY + (2 * margin) + minimumRectangleAreaDimension;

        return {
            success: false,
            gcode:
                '; ERROR: Printable rectangle area is too small.\n' +
                '; This calibration requires at least ' + minimumRectangleAreaDimension + 'mm x ' + minimumRectangleAreaDimension + 'mm for the rectangle area after safe positions, labels and margins.\n' +
                '; Current printable rectangle area: ' + formatNumber(printableWidth) + 'mm x ' + formatNumber(printableHeight) + 'mm.\n' +
                '; Required bed size for current safe positions and label setting: at least ' +
                formatNumber(requiredPlateX) + 'mm x ' + formatNumber(requiredPlateY) + 'mm.'
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
    gcode.push('; Starting speed: ' + formatNumber(startingSpeed) + 'mm/s');
    gcode.push('; Starting volumetric flow: ' + formatFlowLabel(startingFlow, s.calibrationType) + 'mm3/s');
    gcode.push('; Volumetric flow step: ' + flowStep.toFixed(2) + 'mm3/s');
    gcode.push('; Speed step: ' + formatNumber(speedStep) + 'mm/s');
    gcode.push('; Bed temperature: ' + s.bedTemp + 'C');
    gcode.push('; Nozzle temperature: ' + s.temp + 'C');
    gcode.push('; Fan speed: ' + fanPercent + '%');
    gcode.push('; Retract / prime length: ' + formatNumber(retractPrimeLength) + 'mm');
    if (s.printNumbers) {
        gcode.push('; Number label retract / prime length: ' + formatNumber(labelRetractPrimeLength) + 'mm');
        gcode.push('; Number label speed: ' + formatNumber(labelSpeed) + 'mm/s');
    }
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

    gcode.push('M83 ; relative extrusion for pattern and labels');
    gcode.push('');

    const rectangleYs = [];

    for (let y = yStart; y + rectangleHeight <= yEnd; y += rectangleSpacing) {
        rectangleYs.push(y);
    }

    const rectangles = rectangleYs.map(function (y) {
        const speed = currentSpeed;
        const flow = speed * lineArea;

        currentSpeed += speedStep;

        return {
            y,
            speed,
            feedrate: speed * 60,
            flow,
            flowLabel: formatFlowLabel(flow, s.calibrationType)
        };
    });

    if (s.printNumbers) {
        gcode.push('; Number labels');
        gcode.push('; All labels are printed before rectangles at filament-safe ' + formatNumber(labelSpeed) + 'mm/s.');

        for (const rectangle of rectangles) {
            gcode.push('; Label: ' + rectangle.flowLabel + 'mm3/s');
            drawNumberLabel(
                gcode,
                rectangle.flowLabel,
                xStart - 1,
                rectangle.y,
                labelFeedrate,
                lineArea,
                filamentArea,
                labelRetractPrimeLength
            );
            gcode.push('');
        }
    }

    gcode.push('G90 ; absolute positioning before rectangles');
    gcode.push('G1 X' + xStart.toFixed(3) + ' Y' + yStart.toFixed(3) + ' F6000 ; move to first rectangle start');
    gcode.push('G1 Z' + printZ.toFixed(3) + ' F1200 ; lower to print height');
    gcode.push('');

    for (let i = 0; i < rectangles.length; i++) {
        const rectangle = rectangles[i];

        gcode.push('G91 ; relative positioning for rectangle');
        gcode.push('; Rectangle speed: ' + formatNumber(rectangle.speed) + 'mm/s');
        gcode.push('; Volumetric flow: ' + rectangle.flow.toFixed(2) + 'mm3/s');
        gcode.push('; Rectangle geometry: ' + printableWidth.toFixed(3) + 'mm wide x ' + rectangleHeight.toFixed(3) + 'mm tall');

        addRelativeExtrudeMove(gcode, printableWidth, 0, rectangle.feedrate, lineArea, filamentArea, 'right - main measurement segment');
        addRelativeExtrudeMove(gcode, 0, rectangleHeight, rectangle.feedrate, lineArea, filamentArea, 'forward - short connector');
        addRelativeExtrudeMove(gcode, -printableWidth, 0, rectangle.feedrate, lineArea, filamentArea, 'left - main measurement segment');
        addRelativeExtrudeMove(gcode, 0, -rectangleHeight, rectangle.feedrate, lineArea, filamentArea, 'back - short connector');

        if (i < rectangles.length - 1) {
            gcode.push('G1 Z' + travelLift.toFixed(3) + ' F1200 ; lift');
            gcode.push('G1 X0.000 Y' + rectangleSpacing.toFixed(3) + ' F6000 ; move to next rectangle');
            gcode.push('G1 Z-' + travelLift.toFixed(3) + ' F1200 ; lower');
            gcode.push('');
        }
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

    const estimate = calculateFilamentEstimateFromGCode(gcode.join('\n'), filamentDiameter, s.filamentType);
    insertFilamentEstimateHeader(gcode, estimate, s);

    return {
        success: true,
        gcode: gcode.join('\n'),
        estimate
    };
}

function addPrimeLine(gcode, s, layerHeight, lineWidth, filamentArea) {
    const margin = 10;

    const maxPrimeX = s.plateX - margin;
    const centeredPrimeStart = Math.max(margin, (s.plateX - 120) / 2);
    const primeXStart = Math.max(s.safeX + margin, centeredPrimeStart);
    const primeLength = Math.min(120, maxPrimeX - primeXStart);
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

function drawNumberLabel(gcode, text, rightEdgeX, bottomY, feedrate, lineArea, filamentArea, retractPrimeLength) {
    const digitWidth = 4;
    const digitHeight = 8;
    const charGap = 0.8;
    const dotSize = 1;

    const labelWidth = getLabelWidth(text, digitWidth, charGap, dotSize);
    let cursorX = rightEdgeX - labelWidth;

    gcode.push('G90 ; absolute positioning for label');

    for (const char of text) {
        if (char === '.') {
            drawDecimalPoint(gcode, cursorX, bottomY, dotSize, feedrate, lineArea, filamentArea, retractPrimeLength);
            cursorX += dotSize + charGap;
        } else {
            drawDigit(gcode, char, cursorX, bottomY, digitWidth, digitHeight, feedrate, lineArea, filamentArea, retractPrimeLength);
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

function drawDigit(gcode, digit, x, y, width, height, feedrate, lineArea, filamentArea, retractPrimeLength) {
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
            retractPrimeLength,
            'digit ' + digit + ' segment ' + segment
        );
    }
}

function drawDecimalPoint(gcode, x, y, size, feedrate, lineArea, filamentArea, retractPrimeLength) {
    drawAbsoluteExtrudeLine(gcode, x, y, x + size, y, feedrate, lineArea, filamentArea, retractPrimeLength, 'decimal point bottom');
    drawAbsoluteExtrudeLine(gcode, x + size, y, x + size, y + size, feedrate, lineArea, filamentArea, retractPrimeLength, 'decimal point right');
    drawAbsoluteExtrudeLine(gcode, x + size, y + size, x, y + size, feedrate, lineArea, filamentArea, retractPrimeLength, 'decimal point top');
    drawAbsoluteExtrudeLine(gcode, x, y + size, x, y, feedrate, lineArea, filamentArea, retractPrimeLength, 'decimal point left');
}

function drawAbsoluteExtrudeLine(gcode, x1, y1, x2, y2, feedrate, lineArea, filamentArea, retractPrimeLength, comment) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const volume = distance * lineArea;
    const extrusion = volume / filamentArea;

    addRelativeRetraction(gcode, retractPrimeLength, 'label retract before travel');
    gcode.push('G1 X' + x1.toFixed(3) + ' Y' + y1.toFixed(3) + ' F6000 ; move to ' + comment);
    addRelativePrime(gcode, retractPrimeLength, 'label prime after travel');
    gcode.push(
        'G1 X' + x2.toFixed(3) +
        ' Y' + y2.toFixed(3) +
        ' E' + extrusion.toFixed(5) +
        ' F' + feedrate.toFixed(0) +
        ' ; ' + comment
    );
}

function addRelativeRetraction(gcode, retractPrimeLength, comment) {
    if (retractPrimeLength <= 0) return;

    gcode.push('G1 E-' + retractPrimeLength.toFixed(5) + ' F1800 ; ' + comment);
}

function addRelativePrime(gcode, retractPrimeLength, comment) {
    if (retractPrimeLength <= 0) return;

    gcode.push('G1 E' + retractPrimeLength.toFixed(5) + ' F900 ; ' + comment);
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

function roundFlowForCalibration(flow, calibrationType) {
    const step = getFlowStep(calibrationType);
    const rounded = Math.round(flow / step) * step;

    return Number(rounded.toFixed(3));
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

function getFilamentDensity(filamentType) {
    const densities = {
        PLA: 1.24,
        PETG: 1.27,
        TPU: 1.21
    };

    return densities[filamentType] || 1.24;
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatFilamentLength(lengthMm) {
    return (lengthMm / 1000).toFixed(2) + 'm (' + formatNumber(lengthMm) + 'mm)';
}

function formatFilamentWeight(weightGrams) {
    if (weightGrams < 10) {
        return weightGrams.toFixed(2) + 'g';
    }

    return formatNumber(weightGrams) + 'g';
}

function formatCurrency(value, fractionDigits) {
    const locale = getBrowserLocale();
    const currency = getBrowserCurrencyCode(locale);
    const digits = fractionDigits === undefined ? 2 : fractionDigits;

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }).format(value);
    } catch (e) {
        return currency + ' ' + value.toFixed(digits);
    }
}

function formatSpoolCurrency(value) {
    return formatCurrency(value, Number.isInteger(value) ? 0 : 2);
}

function getBrowserLocale() {
    if (typeof navigator !== 'undefined') {
        if (navigator.languages && navigator.languages.length) {
            return navigator.languages[0];
        }

        if (navigator.language) {
            return navigator.language;
        }
    }

    return 'en-GB';
}

function getBrowserCurrencyCode(locale) {
    const currencyByRegion = {
        AT: 'EUR',
        AU: 'AUD',
        BE: 'EUR',
        CA: 'CAD',
        CH: 'CHF',
        CZ: 'CZK',
        DE: 'EUR',
        DK: 'DKK',
        ES: 'EUR',
        FI: 'EUR',
        FR: 'EUR',
        GB: 'GBP',
        GR: 'EUR',
        IE: 'EUR',
        IT: 'EUR',
        JP: 'JPY',
        NL: 'EUR',
        NO: 'NOK',
        NZ: 'NZD',
        PL: 'PLN',
        PT: 'EUR',
        SE: 'SEK',
        US: 'USD'
    };
    const region = getLocaleRegion(locale);

    return currencyByRegion[region] || 'GBP';
}

function getLocaleRegion(locale) {
    try {
        if (typeof Intl !== 'undefined' && Intl.Locale) {
            return new Intl.Locale(locale).region || '';
        }
    } catch (e) {
        // Fall back to parsing below.
    }

    const regionMatch = String(locale).match(/[-_]([A-Za-z]{2})(?:$|[-_])/);

    return regionMatch ? regionMatch[1].toUpperCase() : '';
}

function formatFlowLabel(value, calibrationType) {
    if (calibrationType === 'fine') {
        return value.toFixed(2).replace(/\.?0+$/, '');
    }

    return formatNumber(value);
}
