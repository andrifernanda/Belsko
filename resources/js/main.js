// ============================================================
//  BELSKO — Bel Sekolah Otomatis v1.0.0
//  Developer: Andri Fernanda S.Pd., Gr.
// ============================================================

// --- State ---
let schedules = [];
let globalBelActive = true;
let selectedDay = 'Senin';
let lastTriggered = '';
let audioFiles = [];
let settings = {
    schoolName: 'SMP Negeri 1 Indonesia',
    theme: 'light'
};

// Preview Audio State
let currentPlayingAudio = null;
let currentPlayingId = null;
let currentBlobUrl = null;

const STORAGE_KEY = 'bel_schedules';
const STORAGE_GLOBAL = 'bel_global_active';
const STORAGE_SETTINGS = 'bel_settings';

const HARI_LIST = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_ALL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Predefined activity options
const AKTIVITAS_OPTIONS = [
    '5 Menit Menjelang Masuk',
    'Jam Pelajaran 1', 'Jam Pelajaran 2', 'Jam Pelajaran 3',
    'Jam Pelajaran 4', 'Jam Pelajaran 5', 'Jam Pelajaran 6',
    'Jam Pelajaran 7', 'Jam Pelajaran 8', 'Jam Pelajaran 9',
    'Jam Pelajaran 10', 'Jam Pelajaran 11', 'Jam Pelajaran 12',
    'Jam Senam', 'Jam Istirahat', 'Jam Kokurikuler',
    'Jam Literasi', 'Jam Numerasi',
    'Jam Shalat Zuhur', 'Jam Shalat Ashar',
    'Jam Pulang'
];

// ============================================================
//  INITIALIZATION
// ============================================================

function bootstrapUI() {
    loadSettingsLocal();
    loadSchedulesLocal();
    loadGlobalStateLocal();

    const today = HARI_LIST[new Date().getDay()];
    if (HARI_ALL.includes(today)) {
        selectedDay = today;
    } else {
        selectedDay = 'Senin';
    }

    applyTheme(settings.theme || 'light');
    applySchoolName();
    selectDay(selectedDay);
    updateStatusBadge();
    updateTotalSchedules();
}

async function initApp() {
    try {
        await loadSettings();
        await loadSchedules();
        await loadGlobalState();
        await scanAudioFiles();
    } catch (e) {
        console.warn('Neutralino storage fallback to localStorage:', e);
    }

    applyTheme(settings.theme || 'light');
    applySchoolName();
    selectDay(selectedDay);
    updateStatusBadge();
    updateTotalSchedules();

    // Inisialisasi System Tray & Status Auto-Start
    initTray();
    checkAutoStartStatus();

    // Buka aplikasi secara layar penuh (fullscreen / maximize) ketika pertama kali aktif
    try {
        await Neutralino.window.maximize();
    } catch (errMax) {
        console.warn('Window maximize on start error:', errMax);
    }

    console.log('BELSKO v1.0.0 — Neutralino Ready');
}

// Start Clock immediately
updateClock();
setInterval(updateClock, 1000);

// Bootstrap local UI immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapUI);
} else {
    bootstrapUI();
}

// Start Scheduler Engine
setInterval(checkSchedule, 1000);

// Neutralino Initialization
Neutralino.init();
Neutralino.events.on('ready', initApp);
Neutralino.events.on('windowClose', onWindowClose);

// ============================================================
//  CLOCK
// ============================================================

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    const elH = document.getElementById('clockHours');
    const elM = document.getElementById('clockMinutes');
    const elS = document.getElementById('clockSeconds');
    const elDate = document.getElementById('clockDate');

    if (elH) elH.textContent = h;
    if (elM) elM.textContent = m;
    if (elS) elS.textContent = s;

    const hari = HARI_LIST[now.getDay()];
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    if (elDate) {
        elDate.textContent = `${hari}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
    }
}

// ============================================================
//  DATA PERSISTENCE
// ============================================================

async function saveSchedules() {
    const data = JSON.stringify(schedules);
    try { await Neutralino.storage.setData(STORAGE_KEY, data); }
    catch (e) { localStorage.setItem(STORAGE_KEY, data); }
}

async function loadSchedules() {
    try {
        const data = await Neutralino.storage.getData(STORAGE_KEY);
        schedules = JSON.parse(data);
    } catch (e) { loadSchedulesLocal(); }
}

function loadSchedulesLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) { try { schedules = JSON.parse(data); } catch (_) { schedules = []; } }
}

async function saveGlobalState() {
    try { await Neutralino.storage.setData(STORAGE_GLOBAL, JSON.stringify(globalBelActive)); }
    catch (e) { localStorage.setItem(STORAGE_GLOBAL, JSON.stringify(globalBelActive)); }
}

async function loadGlobalState() {
    try {
        const data = await Neutralino.storage.getData(STORAGE_GLOBAL);
        globalBelActive = JSON.parse(data);
    } catch (e) { loadGlobalStateLocal(); }
}

function loadGlobalStateLocal() {
    const data = localStorage.getItem(STORAGE_GLOBAL);
    if (data !== null) { try { globalBelActive = JSON.parse(data); } catch (_) { globalBelActive = true; } }
}

async function saveSettings() {
    const data = JSON.stringify(settings);
    try { await Neutralino.storage.setData(STORAGE_SETTINGS, data); }
    catch (e) { localStorage.setItem(STORAGE_SETTINGS, data); }
}

async function loadSettings() {
    try {
        const data = await Neutralino.storage.getData(STORAGE_SETTINGS);
        settings = { ...settings, ...JSON.parse(data) };
    } catch (e) { loadSettingsLocal(); }
}

function loadSettingsLocal() {
    const data = localStorage.getItem(STORAGE_SETTINGS);
    if (data) { try { settings = { ...settings, ...JSON.parse(data) }; } catch (_) {} }
}

// ============================================================
//  AUDIO SCANNING
// ============================================================

async function scanAudioFiles() {
    const select = document.getElementById('inputAudio');
    if (select) {
        select.innerHTML = '<option value="__fallback__">🔊 Bel Default (Sintetis)</option>';
    }

    try {
        const entries = await Neutralino.filesystem.readDirectory('./resources/audio');
        audioFiles = entries
            .filter(e => e.type === 'FILE' && /\.(mp3|wav|ogg|m4a)$/i.test(e.entry))
            .map(e => e.entry)
            .sort();

        if (select) {
            audioFiles.forEach(file => {
                const opt = document.createElement('option');
                opt.value = file;
                opt.textContent = `🎵 ${file}`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn('Could not scan audio folder:', e);
    }
}

// ============================================================
//  DAY DROPDOWN SELECTION (Dipindahkan ke Judul Jadwal Hari)
// ============================================================

function selectDay(day) {
    selectedDay = day;

    const selectTable = document.getElementById('selectDayDropdown');
    if (selectTable && selectTable.value !== day) {
        selectTable.value = day;
    }

    const formSelect = document.getElementById('inputHariForm');
    if (formSelect && formSelect.value !== day) {
        formSelect.value = day;
    }

    renderTable();
    cancelEdit();
}

function onFormDayChange(day) {
    selectDay(day);
}

// ============================================================
//  ACTIVITY DROPDOWN
// ============================================================

function onActivityChange() {
    const sel = document.getElementById('inputAktivitas');
    const customGroup = document.getElementById('customActivityGroup');
    const customInput = document.getElementById('inputCustomActivity');

    if (sel.value === '__custom__') {
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.focus();
    } else {
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

function getActivityValue() {
    const sel = document.getElementById('inputAktivitas');
    if (sel.value === '__custom__') {
        return document.getElementById('inputCustomActivity').value.trim();
    }
    return sel.value;
}

function setActivityValue(value) {
    const sel = document.getElementById('inputAktivitas');
    const customGroup = document.getElementById('customActivityGroup');
    const customInput = document.getElementById('inputCustomActivity');

    if (AKTIVITAS_OPTIONS.includes(value)) {
        sel.value = value;
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    } else {
        sel.value = '__custom__';
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.value = value;
    }
}

// ============================================================
//  SCHEDULE CRUD
// ============================================================

function generateId() {
    return 'sch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

function saveSchedule(event) {
    event.preventDefault();

    const editId = document.getElementById('editId').value;
    const hari = document.getElementById('inputHariForm').value || selectedDay;
    const waktu = document.getElementById('inputWaktu').value;
    const aktivitas = getActivityValue();
    const audio = document.getElementById('inputAudio').value;

    if (!waktu || !aktivitas) {
        showWarningModal('⚠️ Data Belum Lengkap', 'Mohon lengkapi waktu dan nama aktivitas sebelum menyimpan.');
        return false;
    }

    // Tolak jika ada jadwal pada hari & waktu yang sama
    const duplicate = schedules.find(s => s.hari === hari && s.waktu === waktu && s.id !== editId);
    if (duplicate) {
        showWarningModal(
            '⚠️ Waktu Jadwal Duplikat',
            `Sudah ada jadwal pada hari <strong>${escapeHtml(hari)}</strong> pukul <strong>${escapeHtml(waktu)}</strong>, yaitu:<br><br>` +
            `📌 <strong>"${escapeHtml(duplicate.aktivitas)}"</strong><br><br>` +
            `Sistem menolak penambahan jadwal pada waktu yang sama agar bel tidak bentrok. Silakan pilih waktu yang berbeda.`
        );
        return false;
    }

    if (editId) {
        const idx = schedules.findIndex(s => s.id === editId);
        if (idx !== -1) {
            schedules[idx] = { ...schedules[idx], hari, waktu, aktivitas, audio };
        }
        showToast('✏️', 'Jadwal Diperbarui', `${aktivitas} — ${waktu}`);
    } else {
        schedules.push({
            id: generateId(),
            hari,
            waktu,
            aktivitas,
            audio,
            active: true
        });
        showToast('✅', 'Jadwal Ditambahkan', `${aktivitas} — ${waktu}`);
    }

    saveSchedules();
    selectDay(hari);
    updateTotalSchedules();
    resetForm();
    return false;
}

function editSchedule(id) {
    const sch = schedules.find(s => s.id === id);
    if (!sch) return;

    if (sch.hari !== selectedDay) {
        selectDay(sch.hari);
    }

    document.getElementById('editId').value = sch.id;
    document.getElementById('inputHariForm').value = sch.hari;
    document.getElementById('inputWaktu').value = sch.waktu;
    setActivityValue(sch.aktivitas);
    document.getElementById('inputAudio').value = sch.audio;

    document.getElementById('formTitle').textContent = '✏️ Edit Jadwal';
    document.getElementById('btnSubmit').textContent = '💾 Perbarui Jadwal';
    document.getElementById('btnCancel').style.display = 'block';

    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteSchedule(id) {
    const sch = schedules.find(s => s.id === id);
    if (!sch) return;

    showConfirmModal(
        '🗑️ Konfirmasi Hapus Jadwal',
        '⚠️',
        `Apakah Anda yakin ingin menghapus jadwal berikut?<br><br>` +
        `📅 <strong>Hari:</strong> ${escapeHtml(sch.hari)}<br>` +
        `⏰ <strong>Waktu:</strong> ${escapeHtml(sch.waktu)}<br>` +
        `📌 <strong>Aktivitas:</strong> ${escapeHtml(sch.aktivitas)}<br><br>` +
        `Data yang telah dihapus tidak dapat dipulihkan kembali.`,
        'Ya, Hapus Jadwal',
        true,
        () => {
            schedules = schedules.filter(s => s.id !== id);
            saveSchedules();
            renderTable();
            updateTotalSchedules();
            showToast('🗑️', 'Jadwal Dihapus', sch.aktivitas);
        }
    );
}

function toggleScheduleStatus(id) {
    const sch = schedules.find(s => s.id === id);
    if (!sch) return;
    sch.active = !sch.active;
    saveSchedules();
    renderTable();
    updateTotalSchedules();
}

function cancelEdit() {
    resetForm();
}

function resetForm() {
    document.getElementById('scheduleForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('inputHariForm').value = selectedDay;
    document.getElementById('formTitle').textContent = '➕ Tambah Jadwal';
    document.getElementById('btnSubmit').textContent = '💾 Simpan Jadwal';
    document.getElementById('btnCancel').style.display = 'none';
    document.getElementById('customActivityGroup').style.display = 'none';
    document.getElementById('inputCustomActivity').required = false;
}

// ============================================================
//  RENDER TABLE (Filtered by selected day)
// ============================================================

function renderTable() {
    const tbody = document.getElementById('scheduleBody');
    if (!tbody) return;

    const daySchedules = schedules.filter(s => s.hari === selectedDay);

    if (daySchedules.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <span class="empty-icon">📭</span>
                        <span>Belum ada jadwal untuk hari ${selectedDay}.</span>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const sorted = [...daySchedules].sort((a, b) => a.waktu.localeCompare(b.waktu));

    tbody.innerHTML = sorted.map((sch, idx) => {
        const audioDisplay = sch.audio === '__fallback__' ? 'Bel Sintetis' : sch.audio;

        return `
            <tr>
                <td class="col-no">${idx + 1}</td>
                <td class="col-time"><strong>${sch.waktu}</strong></td>
                <td>${escapeHtml(sch.aktivitas)}</td>
                <td><span style="font-size:11px;color:var(--text-secondary)">${escapeHtml(audioDisplay)}</span></td>
                <td class="col-action">
                    <div class="action-btns" style="justify-content: center;">
                        <button class="btn btn-action" onclick="editSchedule('${sch.id}')" title="Edit Jadwal">✏️</button>
                        <button class="btn btn-action btn-delete" onclick="deleteSchedule('${sch.id}')" title="Hapus Jadwal">🗑️</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
//  GLOBAL TOGGLE & STATUS
// ============================================================

function toggleGlobalBel() {
    globalBelActive = document.getElementById('toggleGlobal').checked;
    saveGlobalState();
    updateStatusBadge();
    const state = globalBelActive ? 'Diaktifkan' : 'Dinonaktifkan';
    showToast(globalBelActive ? '✅' : '⏸️', `Bel Otomatis ${state}`, '');
}

function updateStatusBadge() {
    const badge = document.getElementById('statusBadge');
    if (!badge) return;
    const text = badge.querySelector('.status-text');
    const toggle = document.getElementById('toggleGlobal');
    if (toggle) toggle.checked = globalBelActive;

    if (globalBelActive) {
        badge.classList.remove('inactive');
        if (text) text.textContent = 'Status: Aktif';
    } else {
        badge.classList.add('inactive');
        if (text) text.textContent = 'Status: Nonaktif';
    }
}

function updateTotalSchedules() {
    const activeCount = schedules.filter(s => s.active && s.hari === selectedDay).length;
    const el = document.getElementById('totalSchedules');
    if (el) {
        el.textContent = `${activeCount} jadwal aktif (${selectedDay})`;
    }
}

// ============================================================
//  SCHEDULER ENGINE
// ============================================================

function checkSchedule() {
    if (!globalBelActive) return;

    const now = new Date();
    if (now.getSeconds() !== 0) return;

    const currentHari = HARI_LIST[now.getDay()];
    const currentWaktu = String(now.getHours()).padStart(2, '0') + ':' +
                         String(now.getMinutes()).padStart(2, '0');

    if (lastTriggered === currentWaktu) return;

    const matching = schedules.filter(sch => {
        if (!sch.active) return false;
        if (sch.waktu !== currentWaktu) return false;
        return sch.hari === currentHari;
    });

    if (matching.length > 0) {
        lastTriggered = currentWaktu;

        matching.forEach(sch => {
            playBellAudio(sch.audio);
            showToast('🔔', 'Bel Berbunyi!', `${sch.aktivitas} — ${sch.waktu}`);
        });

        setTimeout(() => { lastTriggered = ''; }, 61000);
    }
}

// ============================================================
//  AUDIO PLAYBACK (Scheduled Bell)
// ============================================================

async function playBellAudio(audioFile) {
    if (audioFile === '__fallback__') {
        playFallbackChime();
    } else {
        try {
            let data;
            try {
                data = await Neutralino.filesystem.readBinaryFile(`./resources/audio/${audioFile}`);
            } catch (_) {
                data = await Neutralino.filesystem.readBinaryFile(`resources/audio/${audioFile}`);
            }

            const ext = audioFile.split('.').pop().toLowerCase();
            const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
            const blob = new Blob([data], { type: mimeType });
            const bellUrl = URL.createObjectURL(blob);
            const audio = new Audio(bellUrl);
            audio.volume = 1.0;
            audio.play().catch(err => {
                console.warn('Bell binary play failed, trying chime:', err);
                playFallbackChime();
            });
            audio.onended = () => {
                try { URL.revokeObjectURL(bellUrl); } catch (_) {}
            };
        } catch (e) {
            console.warn('Binary read fallback to direct Audio:', e);
            const audio = new Audio(`audio/${audioFile}`);
            audio.volume = 1.0;
            audio.play().catch(err => {
                console.warn('Audio playback failed, using fallback:', err);
                playFallbackChime();
            });
        }
    }
}

function playFallbackChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;

        const notes = [
            { freq: 830, start: 0, dur: 0.4 },
            { freq: 660, start: 0.45, dur: 0.4 },
            { freq: 740, start: 0.9, dur: 0.4 },
            { freq: 554, start: 1.35, dur: 0.6 },
            { freq: 830, start: 2.1, dur: 0.4 },
            { freq: 660, start: 2.55, dur: 0.4 },
            { freq: 740, start: 3.0, dur: 0.4 },
            { freq: 554, start: 3.45, dur: 0.8 },
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.freq, now + n.start);
            gain.gain.setValueAtTime(0, now + n.start);
            gain.gain.linearRampToValueAtTime(0.35, now + n.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur + 0.05);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(n.freq * 2.5, now + n.start);
            gain2.gain.setValueAtTime(0, now + n.start);
            gain2.gain.linearRampToValueAtTime(0.08, now + n.start + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur * 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + n.start);
            osc2.stop(now + n.start + n.dur + 0.05);
        });

        setTimeout(() => ctx.close(), 5000);
    } catch (e) {
        console.error('AudioContext error:', e);
    }
}

// ============================================================
//  AUDIO MODAL & PREVIEW PLAYBACK (Menu Audio Header)
// ============================================================

function openAudioModal() {
    stopCurrentAudio();
    document.getElementById('audioModalOverlay').style.display = 'flex';
    renderAudioPlayerList();
}

function closeAudioModal() {
    stopCurrentAudio();
    document.getElementById('audioModalOverlay').style.display = 'none';
}

function closeAudioModalOverlay(event) {
    if (event.target === document.getElementById('audioModalOverlay')) {
        closeAudioModal();
    }
}

function stopCurrentAudio() {
    if (currentPlayingAudio) {
        try {
            currentPlayingAudio.pause();
            currentPlayingAudio.currentTime = 0;
            currentPlayingAudio.src = '';
            currentPlayingAudio.load();
        } catch (_) {}
        currentPlayingAudio = null;
    }
    if (currentBlobUrl) {
        try { URL.revokeObjectURL(currentBlobUrl); } catch (_) {}
        currentBlobUrl = null;
    }
    currentPlayingId = null;
}

async function togglePlayAudio(audioId) {
    // If clicking on the currently playing audio -> Stop it
    if (currentPlayingId === audioId) {
        stopCurrentAudio();
        renderAudioPlayerList();
        return;
    }

    // Stop any existing playback
    stopCurrentAudio();

    currentPlayingId = audioId;
    renderAudioPlayerList();

    if (audioId === '__fallback__') {
        playFallbackChime();
        // Synthetic chime finishes in ~4.3 seconds
        setTimeout(() => {
            if (currentPlayingId === '__fallback__') {
                currentPlayingId = null;
                renderAudioPlayerList();
            }
        }, 4400);
    } else {
        try {
            // Load binary data into memory Blob URL to avoid file locking on Windows
            let data;
            try {
                data = await Neutralino.filesystem.readBinaryFile(`./resources/audio/${audioId}`);
            } catch (_) {
                data = await Neutralino.filesystem.readBinaryFile(`resources/audio/${audioId}`);
            }

            const ext = audioId.split('.').pop().toLowerCase();
            const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
            const blob = new Blob([data], { type: mimeType });
            currentBlobUrl = URL.createObjectURL(blob);

            currentPlayingAudio = new Audio(currentBlobUrl);
            currentPlayingAudio.volume = 1.0;
            currentPlayingAudio.play().catch(err => {
                console.error('Preview error:', err);
                showToast('❌', 'Gagal Memutar Audio', audioId);
                stopCurrentAudio();
                renderAudioPlayerList();
            });

            currentPlayingAudio.onended = () => {
                stopCurrentAudio();
                renderAudioPlayerList();
            };

            currentPlayingAudio.onerror = () => {
                stopCurrentAudio();
                renderAudioPlayerList();
            };
        } catch (e) {
            console.warn('Binary read fallback to direct Audio:', e);
            try {
                currentPlayingAudio = new Audio(`audio/${audioId}`);
                currentPlayingAudio.volume = 1.0;
                currentPlayingAudio.play().catch(err => {
                    console.error('Direct audio error:', err);
                    showToast('❌', 'Gagal Memutar Audio', audioId);
                    stopCurrentAudio();
                    renderAudioPlayerList();
                });
                currentPlayingAudio.onended = () => {
                    stopCurrentAudio();
                    renderAudioPlayerList();
                };
                currentPlayingAudio.onerror = () => {
                    stopCurrentAudio();
                    renderAudioPlayerList();
                };
            } catch (err2) {
                stopCurrentAudio();
                renderAudioPlayerList();
            }
        }
    }
}

function renderAudioPlayerList() {
    const container = document.getElementById('audioPlayerList');
    if (!container) return;

    let html = '';

    // 1. Built-in synthetic chime
    const isFallbackPlaying = currentPlayingId === '__fallback__';
    html += `
        <div class="audio-player-item ${isFallbackPlaying ? 'is-playing' : ''}">
            <div class="audio-info-col">
                <div class="audio-icon-badge">🔔</div>
                <div class="audio-name-box">
                    <div class="audio-name-text">Bel Default (Sintetis Web Audio)</div>
                    <div class="audio-type-badge">Chime 8-nada bawaan sistem</div>
                </div>
            </div>
            <div class="audio-actions-col">
                <button class="btn-play-audio ${isFallbackPlaying ? 'playing' : ''}" onclick="togglePlayAudio('__fallback__')">
                    ${isFallbackPlaying ? '⏹ Stop' : '▶ Play'}
                </button>
            </div>
        </div>
    `;

    // 2. Audio files from resources/audio/
    if (audioFiles.length === 0) {
        html += `<div class="audio-empty">Belum ada file audio di resources/audio/. Klik tombol "Upload File Audio" di atas.</div>`;
    } else {
        audioFiles.forEach(file => {
            const isPlaying = currentPlayingId === file;
            html += `
                <div class="audio-player-item ${isPlaying ? 'is-playing' : ''}">
                    <div class="audio-info-col">
                        <div class="audio-icon-badge">🎵</div>
                        <div class="audio-name-box">
                            <div class="audio-name-text">${escapeHtml(file)}</div>
                            <div class="audio-type-badge">File Audio Lokal</div>
                        </div>
                    </div>
                    <div class="audio-actions-col">
                        <button class="btn-play-audio ${isPlaying ? 'playing' : ''}" onclick="togglePlayAudio('${escapeHtml(file)}')">
                            ${isPlaying ? '⏹ Stop' : '▶ Play'}
                        </button>
                        <button class="btn-del-audio" onclick="deleteAudioFile('${escapeHtml(file)}')" title="Hapus file audio">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

// ============================================================
//  AUDIO UPLOAD & DELETE
// ============================================================

function uploadAudio() {
    stopCurrentAudio();
    const input = document.getElementById('audioFileInput');
    if (input) {
        input.value = '';
        input.click();
    } else {
        uploadAudioNativeFallback();
    }
}

async function handleAudioFilesSelected(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    stopCurrentAudio();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;

        try {
            const arrayBuffer = await file.arrayBuffer();
            let saved = false;

            try {
                await Neutralino.filesystem.writeBinaryFile(`./resources/audio/${fileName}`, arrayBuffer);
                saved = true;
            } catch (err1) {
                console.warn(`writeBinaryFile with ./ failed for ${fileName}, trying alternate:`, err1);
                try {
                    await Neutralino.filesystem.writeBinaryFile(`resources/audio/${fileName}`, arrayBuffer);
                    saved = true;
                } catch (err2) {
                    console.error(`writeBinaryFile failed for ${fileName}:`, err2);
                }
            }

            if (saved) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (err) {
            console.error(`Error reading ${fileName}:`, err);
            failCount++;
        }
    }

    event.target.value = '';

    await scanAudioFiles();
    renderAudioPlayerList();
    renderTable();

    if (successCount > 0 && failCount === 0) {
        showToast('✅', 'Audio Diupload', `${successCount} file audio berhasil diunggah.`);
    } else if (successCount > 0 && failCount > 0) {
        showToast('⚠️', 'Upload Selesai', `${successCount} berhasil, ${failCount} gagal.`);
    } else if (failCount > 0) {
        showWarningModal(
            '❌ Gagal Mengunggah Audio',
            'Tidak dapat menyimpan file audio ke folder resources/audio. Pastikan izin akses tersedia.'
        );
    }
}

async function uploadAudioNativeFallback() {
    try {
        const entries = await Neutralino.os.showOpenDialog('Pilih File Audio Bel', {
            filters: [
                { name: 'File Audio (*.mp3, *.wav, *.ogg)', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }
            ],
            multiSelections: true
        });

        if (!entries || entries.length === 0) return;

        for (const filePath of entries) {
            const fileName = filePath.replace(/^.*[\\\/]/, '');
            try {
                const data = await Neutralino.filesystem.readBinaryFile(filePath);
                try {
                    await Neutralino.filesystem.writeBinaryFile(`./resources/audio/${fileName}`, data);
                } catch (_) {
                    await Neutralino.filesystem.writeBinaryFile(`resources/audio/${fileName}`, data);
                }
            } catch (err) {
                console.error(`Failed to copy ${fileName}:`, err);
                showToast('❌', 'Gagal Upload', `File: ${fileName}`);
            }
        }

        await scanAudioFiles();
        renderAudioPlayerList();
        showToast('✅', 'Audio Berhasil Diupload', `${entries.length} file ditambahkan.`);
    } catch (e) {
        console.error('Upload error:', e);
        showToast('❌', 'Error', 'Gagal membuka dialog file.');
    }
}

function deleteAudioFile(fileName) {
    showConfirmModal(
        '🗑️ Hapus File Audio',
        '🎵',
        `Apakah Anda yakin ingin menghapus file audio <strong>"${escapeHtml(fileName)}"</strong>?<br><br>` +
        `Semua jadwal yang menggunakan audio ini akan otomatis dialihkan ke suara bel default (sintetis).`,
        'Ya, Hapus Audio',
        true,
        async () => {
            stopCurrentAudio();

            try {
                // Neutralino filesystem API adalah remove(), bukan removeFile()
                await Neutralino.filesystem.remove(`./resources/audio/${fileName}`);
            } catch (err1) {
                console.warn('Remove dengan ./ gagal, mencoba path alternatif:', err1);
                try {
                    await Neutralino.filesystem.remove(`resources/audio/${fileName}`);
                } catch (err2) {
                    console.error('Delete audio error:', err2);
                    showWarningModal(
                        '❌ Gagal Menghapus Audio',
                        `Gagal menghapus file <strong>${escapeHtml(fileName)}</strong>.<br><br>` +
                        `Pastikan file audio tidak sedang digunakan oleh aplikasi lain.`
                    );
                    return;
                }
            }

            // Perbarui jadwal yang menggunakan file audio ini
            let updatedCount = 0;
            schedules.forEach(s => {
                if (s.audio === fileName) {
                    s.audio = '__fallback__';
                    updatedCount++;
                }
            });
            if (updatedCount > 0) {
                saveSchedules();
            }

            await scanAudioFiles();
            renderAudioPlayerList();
            renderTable();
            showToast('🗑️', 'Audio Dihapus', fileName);
        }
    );
}

// ============================================================
//  SETTINGS (Modal Pengaturan)
// ============================================================

function openSettings() {
    document.getElementById('settingsOverlay').style.display = 'flex';
    document.getElementById('settingSchoolName').value = settings.schoolName;
    checkAutoStartStatus();
}

function closeSettings() {
    document.getElementById('settingsOverlay').style.display = 'none';
}

function closeSettingsOverlay(event) {
    if (event.target === document.getElementById('settingsOverlay')) {
        closeSettings();
    }
}

// --- School Name (Baris 2 Header) ---
function saveSchoolName() {
    const name = document.getElementById('settingSchoolName').value.trim();
    if (!name) {
        showToast('⚠️', 'Nama Sekolah Kosong', 'Mohon isi nama sekolah.');
        return;
    }
    settings.schoolName = name;
    saveSettings();
    applySchoolName();
    showToast('✅', 'Nama Sekolah Disimpan', name);
}

function applySchoolName() {
    const el = document.getElementById('schoolNameDisplay');
    if (el) {
        el.textContent = settings.schoolName || 'Nama Sekolah Belum Diatur';
    }
}

// --- Theme (Header Toggle Switch) ---
function toggleTheme() {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
}

function setTheme(theme) {
    settings.theme = theme;
    saveSettings();
    applyTheme(theme);
    showToast('🎨', 'Tema Diubah', theme === 'dark' ? 'Mode Gelap Aktif' : 'Mode Terang Aktif');
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    updateThemeToggleUI();
}

function updateThemeToggleUI() {
    const isDark = settings.theme === 'dark';
    const toggleBtn = document.getElementById('headerThemeToggle');
    const toggleLabel = document.getElementById('headerThemeLabel');
    if (toggleBtn) {
        toggleBtn.classList.toggle('is-dark', isDark);
        toggleBtn.title = isDark ? 'Klik untuk beralih ke Mode Terang' : 'Klik untuk beralih ke Mode Gelap';
    }
    if (toggleLabel) {
        toggleLabel.textContent = isDark ? 'Gelap' : 'Terang';
    }
}

// ============================================================
//  TOAST NOTIFICATION
// ============================================================

function showToast(icon, title, desc) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-message">
            <div class="toast-title">${escapeHtml(title)}</div>
            ${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ''}
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
//  DIALOG MODALS (WARNING & CONFIRMATION)
// ============================================================

let currentDialogConfirmCallback = null;

function showWarningModal(title, messageHtml) {
    const elTitle = document.getElementById('dialogTitle');
    const elIcon = document.getElementById('dialogIcon');
    const elMessage = document.getElementById('dialogMessage');
    const elActions = document.getElementById('dialogActions');
    const elOverlay = document.getElementById('dialogModalOverlay');

    if (elTitle) elTitle.textContent = title || '⚠️ Peringatan';
    if (elIcon) elIcon.textContent = '⚠️';
    if (elMessage) elMessage.innerHTML = messageHtml;
    if (elActions) {
        elActions.innerHTML = `
            <button class="btn btn-primary" onclick="closeDialogModal()" style="width:auto;min-width:110px;">Mengerti</button>
        `;
    }
    if (elOverlay) elOverlay.style.display = 'flex';
}

function showConfirmModal(title, icon, messageHtml, confirmText, isDanger, onConfirm) {
    const elTitle = document.getElementById('dialogTitle');
    const elIcon = document.getElementById('dialogIcon');
    const elMessage = document.getElementById('dialogMessage');
    const elActions = document.getElementById('dialogActions');
    const elOverlay = document.getElementById('dialogModalOverlay');

    if (elTitle) elTitle.textContent = title || 'Konfirmasi';
    if (elIcon) elIcon.textContent = icon || '❓';
    if (elMessage) elMessage.innerHTML = messageHtml;
    currentDialogConfirmCallback = onConfirm;

    const confirmClass = isDanger ? 'btn-danger' : 'btn-primary';
    if (elActions) {
        elActions.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDialogModal()" style="width:auto;min-width:80px;">Batal</button>
            <button class="btn ${confirmClass}" onclick="executeDialogConfirm()" style="width:auto;min-width:110px;">${confirmText || 'Konfirmasi'}</button>
        `;
    }
    if (elOverlay) elOverlay.style.display = 'flex';
}

function executeDialogConfirm() {
    const cb = currentDialogConfirmCallback;
    closeDialogModal();
    if (cb && typeof cb === 'function') {
        cb();
    }
}

function closeDialogModal() {
    currentDialogConfirmCallback = null;
    const overlay = document.getElementById('dialogModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function closeDialogModalOverlay(event) {
    if (event.target === document.getElementById('dialogModalOverlay')) {
        closeDialogModal();
    }
}

// ============================================================
//  SYSTEM TRAY & EXIT APPLICATION
// ============================================================

function initTray() {
    try {
        const trayOptions = {
            icon: '/resources/icons/trayIcon.png',
            menuItems: [
                { id: 'SHOW', text: '🔔 Buka BELSKO' },
                { id: 'SEP', text: '-' },
                { id: 'EXIT', text: '⛔ Matikan BELSKO' }
            ]
        };
        Neutralino.os.setTray(trayOptions);
        Neutralino.events.on('trayMenuItemClicked', onTrayMenuItemClicked);
    } catch (e) {
        console.warn('Set tray error:', e);
    }
}

function onTrayMenuItemClicked(event) {
    if (event.detail.id === 'SHOW') {
        try {
            Neutralino.window.show();
            Neutralino.window.focus();
        } catch (_) {}
    } else if (event.detail.id === 'EXIT') {
        confirmExitApp();
    }
}

async function onWindowClose() {
    try {
        await Neutralino.window.hide();
        showToast('ℹ️', 'BELSKO di System Tray', 'Aplikasi tetap aktif berjalan di latar belakang.');
        try {
            await Neutralino.os.showNotification('BELSKO - Bel Sekolah', 'Aplikasi tetap aktif berjalan di System Tray untuk membunyikan bel otomatis.');
        } catch (_) {}
    } catch (e) {
        console.error('Window hide error:', e);
        Neutralino.app.exit();
    }
}

function confirmExitApp() {
    try {
        Neutralino.window.show();
        Neutralino.window.focus();
    } catch (_) {}

    showConfirmModal(
        '⛔ Konfirmasi Matikan Aplikasi',
        '⚠️',
        'Apakah Anda yakin ingin mematikan aplikasi <strong>BELSKO</strong>?<br><br>' +
        '🚨 <strong>PERINGATAN PENTING:</strong><br>' +
        'Jika aplikasi dimatikan, semua jadwal bel sekolah otomatis <strong>TIDAK AKAN BERBUNYI</strong> sama sekali.<br><br>' +
        '💡 <em>Catatan: Cukup tekan tombol silang [X] jika hanya ingin menyembunyikan jendela ke System Tray tanpa mematikan bel.</em>',
        'Ya, Matikan Aplikasi',
        true,
        () => {
            Neutralino.app.exit();
        }
    );
}

// ============================================================
//  SALIN JADWAL KE HARI LAIN (COPY SCHEDULE)
// ============================================================

function openCopyScheduleModal() {
    const sourceDay = selectedDay;
    const sourceSchedules = schedules.filter(s => s.hari === sourceDay);

    document.getElementById('copySourceDayLabel').textContent = sourceDay;
    document.getElementById('copySourceCount').textContent = `${sourceSchedules.length} jadwal`;

    const container = document.getElementById('copyDaysGrid');
    const otherDays = HARI_ALL.filter(d => d !== sourceDay);

    container.innerHTML = otherDays.map(day => `
        <label class="copy-day-card">
            <input type="checkbox" name="targetCopyDay" value="${day}" class="target-day-checkbox">
            <strong>${day}</strong>
        </label>
    `).join('');

    document.getElementById('checkSelectAllDays').checked = false;
    document.getElementById('copyScheduleModalOverlay').style.display = 'flex';
}

function closeCopyScheduleModal() {
    document.getElementById('copyScheduleModalOverlay').style.display = 'none';
}

function closeCopyScheduleModalOverlay(event) {
    if (event.target === document.getElementById('copyScheduleModalOverlay')) {
        closeCopyScheduleModal();
    }
}

function toggleSelectAllCopyDays(checked) {
    document.querySelectorAll('input[name="targetCopyDay"]').forEach(cb => {
        cb.checked = checked;
    });
}

function executeCopySchedule() {
    const sourceDay = selectedDay;
    const sourceSchedules = schedules.filter(s => s.hari === sourceDay);

    if (sourceSchedules.length === 0) {
        showWarningModal('⚠️ Tidak Ada Jadwal', `Hari <strong>${sourceDay}</strong> belum memiliki jadwal untuk disalin.`);
        return;
    }

    const selectedTargets = Array.from(document.querySelectorAll('input[name="targetCopyDay"]:checked'))
                                 .map(cb => cb.value);

    if (selectedTargets.length === 0) {
        showWarningModal('⚠️ Pilih Hari Tujuan', 'Silakan centang minimal satu hari tujuan.');
        return;
    }

    const mode = document.querySelector('input[name="copyMode"]:checked').value;

    selectedTargets.forEach(targetDay => {
        if (mode === 'replace') {
            schedules = schedules.filter(s => s.hari !== targetDay);
            sourceSchedules.forEach(s => {
                schedules.push({
                    id: generateId(),
                    hari: targetDay,
                    waktu: s.waktu,
                    aktivitas: s.aktivitas,
                    audio: s.audio,
                    active: s.active
                });
            });
        } else {
            sourceSchedules.forEach(s => {
                const exists = schedules.some(ex => ex.hari === targetDay && ex.waktu === s.waktu);
                if (!exists) {
                    schedules.push({
                        id: generateId(),
                        hari: targetDay,
                        waktu: s.waktu,
                        aktivitas: s.aktivitas,
                        audio: s.audio,
                        active: s.active
                    });
                }
            });
        }
    });

    saveSchedules();
    renderTable();
    updateTotalSchedules();
    closeCopyScheduleModal();

    showToast('📋', 'Jadwal Disalin', `Jadwal ${sourceDay} disalin ke: ${selectedTargets.join(', ')}`);
}

// ============================================================
//  BACKUP & RESTORE DATA JADWAL (EXPORT / IMPORT JSON)
// ============================================================

function exportBackupData() {
    const backupObject = {
        appName: 'BELSKO',
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        schoolName: settings.schoolName,
        globalBelActive: globalBelActive,
        schedules: schedules
    };

    const jsonStr = JSON.stringify(backupObject, null, 2);
    const now = new Date();
    const dateSlug = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const filename = `Backup_BELSKO_Jadwal_${dateSlug}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 500);

    showToast('💾', 'Cadangan Diunduh', filename);
}

function triggerImportBackup() {
    const fileInput = document.getElementById('backupFileInput');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

function handleImportBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data || !Array.isArray(data.schedules)) {
                showWarningModal('❌ File Tidak Valid', 'Format file cadangan tidak sesuai. Pastikan file JSON cadangan berasal dari aplikasi BELSKO.');
                return;
            }

            const scheduleCount = data.schedules.length;
            const schoolName = data.schoolName || 'Tidak diubah';

            showConfirmModal(
                '📥 Konfirmasi Pulihkan Jadwal',
                '⚠️',
                `File cadangan valid terdeteksi:<br><br>` +
                `📋 <strong>Jumlah Jadwal:</strong> ${scheduleCount} jadwal<br>` +
                `🏫 <strong>Nama Sekolah:</strong> ${escapeHtml(schoolName)}<br><br>` +
                `<strong>PERHATIAN:</strong> Jadwal yang ada saat ini akan digantikan dengan data cadangan ini. Lanjutkan pemulihan?`,
                'Ya, Pulihkan Sekarang',
                true,
                () => {
                    schedules = data.schedules;
                    if (data.schoolName) {
                        settings.schoolName = data.schoolName;
                        saveSettings();
                        applySchoolName();
                    }
                    if (typeof data.globalBelActive === 'boolean') {
                        globalBelActive = data.globalBelActive;
                        saveGlobalState();
                        updateStatusBadge();
                    }
                    saveSchedules();
                    renderTable();
                    updateTotalSchedules();
                    showToast('✅', 'Pemulihan Selesai', `${scheduleCount} jadwal berhasil dipulihkan.`);
                }
            );
        } catch (err) {
            console.error('Import parse error:', err);
            showWarningModal('❌ Gagal Membaca File', 'File tidak dapat diproses sebagai file JSON cadangan yang valid.');
        }
    };
    reader.readAsText(file);
}

// ============================================================
//  AUTO-START WINDOWS
// ============================================================

async function checkAutoStartStatus() {
    try {
        let res = await Neutralino.os.execCommand('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "BELSKO"');
        let isEnabled = res.exitCode === 0 && res.stdOut.includes('BELSKO');
        if (!isEnabled) {
            res = await Neutralino.os.execCommand('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Belsko"');
            isEnabled = res.exitCode === 0 && res.stdOut.includes('Belsko');
        }
        const toggle = document.getElementById('toggleAutoStart');
        if (toggle) toggle.checked = isEnabled;
    } catch (e) {
        console.warn('Check autostart error:', e);
    }
}

async function toggleAutoStartWindows(enabled) {
    try {
        if (enabled) {
            const currentPath = window.NL_PATH || 'D:\\Proyek\\bel-sekolah';
            const exePath = `${currentPath}\\bin\\neutralino-win_x64.exe`;
            const cmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "BELSKO" /t REG_SZ /d "\\"${exePath}\\" --load-dir-res --path=\\"${currentPath}\\"" /f`;
            const res = await Neutralino.os.execCommand(cmd);
            if (res.exitCode === 0) {
                // Bersihkan entri lama jika ada
                try { await Neutralino.os.execCommand('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Belsko" /f'); } catch (_) {}
                showToast('🚀', 'Auto-Start Aktif', 'BELSKO akan otomatis terbuka setiap komputer Windows dinyalakan.');
            } else {
                throw new Error(res.stdErr || 'Gagal mengubah registry');
            }
        } else {
            const cmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "BELSKO" /f`;
            await Neutralino.os.execCommand(cmd);
            try { await Neutralino.os.execCommand('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Belsko" /f'); } catch (_) {}
            showToast('⏸️', 'Auto-Start Nonaktif', 'BELSKO tidak akan otomatis dibuka saat startup.');
        }
    } catch (err) {
        console.error('Toggle autostart error:', err);
        showWarningModal('❌ Pengaturan Auto-Start Gagal', `Tidak dapat memperbarui status auto-start Windows: ${escapeHtml(err.message || '')}`);
        const toggle = document.getElementById('toggleAutoStart');
        if (toggle) toggle.checked = !enabled;
    }
}

// ============================================================
//  WINDOWS DATE & TIME SETTINGS
// ============================================================

async function openWindowsTimeSettings() {
    try {
        await Neutralino.os.execCommand('cmd /c start ms-settings:dateandtime');
        showToast('🕒', 'Pengaturan Waktu Windows', 'Membuka pengaturan tanggal & waktu Windows...');
    } catch (err1) {
        console.warn('Gagal buka ms-settings:dateandtime, mencoba control panel klasik:', err1);
        try {
            await Neutralino.os.execCommand('cmd /c timedate.cpl');
            showToast('🕒', 'Pengaturan Waktu Windows', 'Membuka dialog Date & Time...');
        } catch (err2) {
            console.error('Gagal membuka pengaturan waktu Windows:', err2);
            showToast('❌', 'Gagal Membuka Waktu', 'Tidak dapat membuka pengaturan Windows.');
        }
    }
}

