// js/main.js
import { compressImage } from './utils/compressor.js';
import { uploadImages } from './api/storageAdapter.js';
import { fetchProperties, fetchLeads, fetchGlobalSettings, saveProperty, updateProperty, deleteProperty, updateGlobalSettings, updateLeadStatus } from './api/databaseAdapter.js';
import { FIREBASE_CONFIG } from './config.js';

// Initialize Firebase (v8 compat)
if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION ---
    const loginOverlay = document.getElementById('login-overlay');
    const appShell = document.getElementById('app-shell');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    // Email Login form elements
    const emailLoginForm = document.getElementById('email-login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const emailSignInBtn = document.getElementById('email-signin-btn');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    const eyeIcon = document.getElementById('eye-icon');

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loginOverlay.style.display = 'none';
            appShell.style.display = 'flex';
            authError.style.display = 'none';
            initDashboard();
        } else {
            loginOverlay.style.display = 'flex';
            appShell.style.display = 'none';
            sessionStorage.clear();
            const addPropNav = document.querySelector('.nav-item[data-target="sec-add-property"]');
            if (addPropNav) addPropNav.click(); // Reset to default tab for next login
        }
    });

    // Password visibility toggle
    if (togglePasswordBtn && eyeIcon && loginPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            if (loginPasswordInput.type === 'password') {
                loginPasswordInput.type = 'text';
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                loginPasswordInput.type = 'password';
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        });
    }

    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');

    const showLogoutModal = () => {
        if (logoutModal) logoutModal.classList.add('active');
    };
    const hideLogoutModal = () => {
        if (logoutModal) logoutModal.classList.remove('active');
    };

    if (logoutBtn) logoutBtn.addEventListener('click', showLogoutModal);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', showLogoutModal);
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', hideLogoutModal);

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', () => {
            hideLogoutModal();
            firebase.auth().signOut();
        });
    }

    // --- Premium Delete Modal ---
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteTargetInput = document.getElementById('delete-target-id');

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.classList.remove('active');
            deleteTargetInput.value = '';
        });
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const id = deleteTargetInput.value;
            if (!id) return;
            try {
                confirmDeleteBtn.innerText = 'Deleting...';
                await deleteProperty(id);
                showToast('Property deleted.', 'success');
                deleteModal.classList.remove('active');

                // close edit modal if open
                const editModal = document.getElementById('edit-modal');
                if (editModal && editModal.classList.contains('active')) {
                    editModal.classList.remove('active');
                }

                await handleTabLazyLoad('sec-live-db', true);
            } catch (error) {
                console.error(error);
                showToast('Delete failed.', 'error');
            } finally {
                confirmDeleteBtn.innerText = 'Delete';
            }
        });
    }

    // --- Image Lightbox ---
    const imageLightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');

    window.openLightbox = (src) => {
        if (!imageLightbox || !lightboxImg) return;
        lightboxImg.src = src;
        imageLightbox.classList.add('active');
    };

    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', () => {
            imageLightbox.classList.remove('active');
        });
    }
    if (imageLightbox) {
        imageLightbox.addEventListener('click', (e) => {
            if (e.target === imageLightbox) {
                imageLightbox.classList.remove('active');
            }
        });
    }

    // Email sign in submission
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value;

            emailSignInBtn.disabled = true;
            emailSignInBtn.innerText = "Signing in...";
            authError.style.display = 'none';

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    emailSignInBtn.disabled = false;
                    emailSignInBtn.innerText = "Sign In";
                    emailLoginForm.reset();

                    // Confetti cannon animation for 2s with 5x density
                    if (typeof confetti === 'function') {
                        var duration = 2000;
                        var animationEnd = Date.now() + duration;
                        var defaults = { startVelocity: 40, spread: 360, ticks: 80, zIndex: 10000 };

                        var interval = setInterval(function () {
                            var timeLeft = animationEnd - Date.now();

                            if (timeLeft <= 0) {
                                return clearInterval(interval);
                            }

                            var particleCount = 250 * (timeLeft / duration);
                            confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
                        }, 150);
                    }
                })
                .catch((error) => {
                    console.error("Email Auth Error: ", error);
                    authError.innerText = error.message;
                    authError.style.display = 'block';
                    emailSignInBtn.disabled = false;
                    emailSignInBtn.innerText = "Sign In";
                });
        });
    }

    // --- STATE MANAGEMENT & INIT ---
    async function initDashboard() {
        // Just reset to default tab and fetch global settings (for logo)
        const addPropNav = document.querySelector('.nav-item[data-target="sec-add-property"]');
        if (addPropNav) addPropNav.click();

        try {
            const settings = await fetchGlobalSettings();
            applyGlobalSettings(settings);
        } catch (e) {
            console.error('Failed to load branding', e);
        }
    }

    let syncCooldownTime = 0;
    let syncCooldownInterval = null;
    const syncBtn = document.getElementById('force-sync-btn');

    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            if (syncCooldownTime > 0) return;

            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                const targetId = activeNav.getAttribute('data-target');
                if (targetId === 'sec-add-property') {
                    showToast("No data to sync on this tab.", "info");
                    return;
                }

                if (targetId) {
                    // Sync the data
                    await handleTabLazyLoad(targetId, true);

                    // Set 30 second cooldown
                    syncCooldownTime = 30;
                    syncBtn.disabled = true;
                    syncBtn.style.opacity = '0.5';
                    syncBtn.style.cursor = 'not-allowed';
                    syncBtn.innerHTML = `Cooldown (${syncCooldownTime}s)`;

                    syncCooldownInterval = setInterval(() => {
                        syncCooldownTime--;
                        if (syncCooldownTime <= 0) {
                            clearInterval(syncCooldownInterval);
                            syncBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Refresh`;
                            syncBtn.disabled = false;
                            syncBtn.style.opacity = '1';
                            syncBtn.style.cursor = 'pointer';
                        } else {
                            syncBtn.innerHTML = `Cooldown (${syncCooldownTime}s)`;
                        }
                    }, 1000);
                }
            }
        });
    }

    function updateSyncTime() {
        const now = new Date();
        document.getElementById('last-sync-time').innerText = `Last synced: ${now.toLocaleTimeString()}`;
    }

    // --- LOGO & BRANDING ---
    function applyGlobalSettings(settings) {
        const logoImg = document.getElementById('brand-logo');
        if (settings.branding && settings.branding.logo_url) {
            logoImg.src = settings.branding.logo_url;
        } else {
            logoImg.src = window.PLACEHOLDER_LOGO;
        }
    }

    // --- TAB SWITCHING & LAZY LOADING ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Ignore if it's a modal trigger
            if (item.id === 'mobile-logout-btn' || item.id === 'logout-btn') return;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            viewSections.forEach(sec => {
                sec.classList.remove('active');
            });

            const targetId = item.getAttribute('data-target');
            if (targetId) {
                document.getElementById(targetId).classList.add('active');
                await handleTabLazyLoad(targetId);
            }
        });
    });

    async function handleTabLazyLoad(targetId, force = false) {
        try {
            if (targetId === 'sec-live-db') {
                let data = sessionStorage.getItem('propertiesData');
                if (force || !data) {
                    showToast("Syncing Database...", "success");
                    const properties = await fetchProperties();
                    sessionStorage.setItem('propertiesData', JSON.stringify(properties));
                    renderProperties(properties);
                    updateSyncTime();
                } else {
                    renderProperties(JSON.parse(data));
                }
            } else if (targetId === 'sec-leads') {
                let data = sessionStorage.getItem('leadsData');
                if (force || !data) {
                    showToast("Syncing Leads...", "success");
                    const leads = await fetchLeads();
                    sessionStorage.setItem('leadsData', JSON.stringify(leads));
                    renderLeads(leads);
                    updateSyncTime();
                } else {
                    renderLeads(JSON.parse(data));
                }
            } else if (targetId === 'sec-global-settings') {
                let data = sessionStorage.getItem('settingsData');
                if (force || !data) {
                    showToast("Syncing Settings...", "success");
                    const settings = await fetchGlobalSettings();
                    sessionStorage.setItem('settingsData', JSON.stringify(settings));
                    populateSettingsForm(settings);
                    applyGlobalSettings(settings);
                    updateSyncTime();
                } else {
                    const settings = JSON.parse(data);
                    populateSettingsForm(settings);
                    applyGlobalSettings(settings);
                }
            }
        } catch (error) {
            console.error('Lazy Load Error:', error);
            showToast('Failed to load tab data.', 'error');
        }
    }

    // --- DYNAMIC FIELD RENDERING ---
    const UNIT_OPTIONS = `
        <option value="sq ft">Sq Ft</option>
        <option value="sq yd">Sq Yd</option>
        <option value="acre">Acre</option>
        <option value="hectare">Hectare</option>
        <option value="bigha">Bigha</option>
        <option value="sq m">Sq M</option>
    `;
    const PRICE_UNIT_OPTIONS = `
        <option value="Total">Total</option>
        <option value="per sq ft">Per Sq Ft</option>
        <option value="per sq yd">Per Sq Yd</option>
        <option value="per acre">Per Acre</option>
        <option value="per hectare">Per Hectare</option>
        <option value="per bigha">Per Bigha</option>
        <option value="per sq m">Per Sq M</option>
    `;

    const SUB_CATEGORIES = {
        Residential: ['Villa', 'Apartment', 'House', 'Farmhouse'],
        Commercial: ['Shop', 'Office', 'Showroom', 'Hotel'],
        Industrial: ['Factory', 'Warehouse', 'Shed'],
        Land: ['Agricultural', 'Residential Plot', 'Commercial Plot']
    };

    function renderDynamicFields(category, prefix, existingData = {}) {
        const container = document.getElementById(prefix === 'prop' ? 'dynamic-fields' : 'edit-dynamic-fields');
        const subCats = SUB_CATEGORIES[category] || [];
        const spec = existingData.spec || {};
        const price = existingData.price || {};
        const priceMode = price.mode || 'call_to_know';

        let html = '';

        // Sub-category (optional for all)
        html += `<div class="form-grid">
            <div class="form-group">
                <label>Sub Category <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <select id="${prefix}-sub-category" class="saas-select">
                    <option value="">— None —</option>
                    ${subCats.map(s => `<option value="${s}" ${existingData.sub_category === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="${prefix}-title" class="saas-input" placeholder="Property title" value="${existingData.title || ''}" required>
            </div>
        </div>`;

        // Description (optional for all categories)
        if (true) {
            html += `<div class="form-grid full">
                <div class="form-group">
                    <label>Description <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                    <textarea id="${prefix}-description" class="saas-input" placeholder="Property description..." rows="3">${existingData.description || ''}</textarea>
                </div>
            </div>`;
        }

        // Price Mode
        html += `<div class="form-grid">
            <div class="form-group">
                <label>Price</label>
                <select id="${prefix}-price-mode" class="saas-select" onchange="document.getElementById('${prefix}-price-amount-group').style.display = this.value === 'amount' ? 'flex' : 'none';">
                    <option value="call_to_know" ${priceMode === 'call_to_know' ? 'selected' : ''}>Call to Know</option>
                    <option value="amount" ${priceMode === 'amount' ? 'selected' : ''}>Amount</option>
                </select>
            </div>
            <div class="form-group" id="${prefix}-price-amount-group" style="display: ${priceMode === 'amount' ? 'flex' : 'none'};">
                <label>Amount</label>
                <div class="input-with-unit">
                    <input type="number" id="${prefix}-price-value" class="saas-input" min="0" value="${price.value || ''}" placeholder="e.g. 10000">
                    <select id="${prefix}-price-unit" class="saas-select">${PRICE_UNIT_OPTIONS.replace(`value="${price.unit || 'Total'}"`, `value="${price.unit || 'Total'}" selected`)}</select>
                </div>
            </div>
        </div>`;

        // Area (all categories)
        html += `<div class="form-grid">
            <div class="form-group">
                <label>Area <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <div class="input-with-unit">
                    <input type="number" id="${prefix}-area" class="saas-input" min="0" value="${spec.area?.value || ''}" placeholder="e.g. 1000">
                    <select id="${prefix}-area-unit" class="saas-select">${UNIT_OPTIONS.replace(`value="${spec.area?.unit || 'sq ft'}"`, `value="${spec.area?.unit || 'sq ft'}" selected`)}</select>
                </div>
            </div>`;

        // Category-specific fields
        if (category === 'Residential') {
            html += `
            <div class="form-group">
                <label>Bedrooms <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <input type="number" id="${prefix}-bedrooms" class="saas-input" min="0" value="${spec.bedrooms || ''}">
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Bathrooms <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <input type="number" id="${prefix}-bathrooms" class="saas-input" min="0" value="${spec.bathrooms || ''}">
            </div>
            <div class="form-group">
                <label>Parking <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <select id="${prefix}-parking" class="saas-select">
                    <option value="">— Select —</option>
                    <option value="yes" ${spec.parking === 'yes' ? 'selected' : ''}>Yes</option>
                    <option value="no" ${spec.parking === 'no' ? 'selected' : ''}>No</option>
                </select>
            </div>
        </div>`;
        } else if (category === 'Commercial') {
            html += `
            <div class="form-group">
                <label>Floor Number <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <input type="number" id="${prefix}-floor" class="saas-input" min="0" value="${spec.floor || ''}">
            </div>
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Parking <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <select id="${prefix}-parking" class="saas-select">
                    <option value="">— Select —</option>
                    <option value="yes" ${spec.parking === 'yes' ? 'selected' : ''}>Yes</option>
                    <option value="no" ${spec.parking === 'no' ? 'selected' : ''}>No</option>
                </select>
            </div>
            <div class="form-group">
                <label>Washroom <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <select id="${prefix}-washroom" class="saas-select">
                    <option value="">— Select —</option>
                    <option value="yes" ${spec.washroom === 'yes' ? 'selected' : ''}>Yes</option>
                    <option value="no" ${spec.washroom === 'no' ? 'selected' : ''}>No</option>
                </select>
            </div>
        </div>`;
        } else if (category === 'Industrial') {
            html += `</div>`;
        } else if (category === 'Land') {
            html += `
            <div class="form-group">
                <label>Road Access <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <select id="${prefix}-road-access" class="saas-select">
                    <option value="">— Select —</option>
                    <option value="yes" ${spec.road_access === 'yes' ? 'selected' : ''}>Yes</option>
                    <option value="no" ${spec.road_access === 'no' ? 'selected' : ''}>No</option>
                </select>
            </div>
        </div>`;
        }

        // Location (optional, all categories)
        html += `<div class="form-grid full">
            <div class="form-group">
                <label>Location <span style="color:var(--ink-faint);font-size:0.75rem;">(optional)</span></label>
                <input type="text" id="${prefix}-location" class="saas-input" placeholder="e.g. Mumbai, Maharashtra" value="${existingData.location || ''}">
            </div>
        </div>`;

        container.innerHTML = html;
    }

    function collectDynamicData(prefix) {
        const category = document.getElementById(`${prefix}-category`).value;
        const priceMode = document.getElementById(`${prefix}-price-mode`).value;

        const data = {
            title: document.getElementById(`${prefix}-title`)?.value?.trim() || '',
            category: category,
            sub_category: document.getElementById(`${prefix}-sub-category`)?.value || '',
            status: document.getElementById(`${prefix}-status`).value,
            featured: document.getElementById(`${prefix}-featured`).checked,
            location: document.getElementById(`${prefix}-location`)?.value?.trim() || '',
            price: { mode: priceMode },
            spec: {}
        };

        // Description (optional for all)
        data.description = document.getElementById(`${prefix}-description`)?.value?.trim() || '';

        // Price
        if (priceMode === 'amount') {
            data.price.value = parseFloat(document.getElementById(`${prefix}-price-value`)?.value) || 0;
            data.price.unit = document.getElementById(`${prefix}-price-unit`)?.value || 'Total';
        }

        // Area
        const areaVal = parseFloat(document.getElementById(`${prefix}-area`)?.value) || 0;
        const areaUnit = document.getElementById(`${prefix}-area-unit`)?.value || 'sq ft';
        if (areaVal > 0) data.spec.area = { value: areaVal, unit: areaUnit };

        // Category-specific specs
        if (category === 'Residential') {
            const bed = parseInt(document.getElementById(`${prefix}-bedrooms`)?.value) || 0;
            const bath = parseInt(document.getElementById(`${prefix}-bathrooms`)?.value) || 0;
            const parking = document.getElementById(`${prefix}-parking`)?.value || '';
            if (bed > 0) data.spec.bedrooms = bed;
            if (bath > 0) data.spec.bathrooms = bath;
            if (parking) data.spec.parking = parking;
        } else if (category === 'Commercial') {
            const floor = parseInt(document.getElementById(`${prefix}-floor`)?.value) || 0;
            const parking = document.getElementById(`${prefix}-parking`)?.value || '';
            const washroom = document.getElementById(`${prefix}-washroom`)?.value || '';
            if (floor > 0) data.spec.floor = floor;
            if (parking) data.spec.parking = parking;
            if (washroom) data.spec.washroom = washroom;
        } else if (category === 'Land') {
            const roadAccess = document.getElementById(`${prefix}-road-access`)?.value || '';
            if (roadAccess) data.spec.road_access = roadAccess;
        }

        // Clean up: remove empty strings and empty objects before saving
        for (const key of Object.keys(data)) {
            if (data[key] === '') delete data[key];
            if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key]) && Object.keys(data[key]).length === 0) delete data[key];
        }

        return data;
    }

    // --- ADD PROPERTY ---
    const propertyForm = document.getElementById('property-form');
    const imageInput = document.getElementById('images');
    const previewContainer = document.getElementById('image-preview-container');
    const uploadTrigger = document.getElementById('upload-zone-trigger');
    const categorySelect = document.getElementById('prop-category');

    // Render initial dynamic fields
    renderDynamicFields('Residential', 'prop');

    categorySelect.addEventListener('change', (e) => {
        renderDynamicFields(e.target.value, 'prop');
    });

    uploadTrigger.addEventListener('click', (e) => {
        if (e.target !== imageInput && e.target.tagName !== 'IMG') {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        previewContainer.innerHTML = '';
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-img';
                img.addEventListener('click', (ev) => {
                    ev.stopPropagation(); // prevent triggering file input
                    if (window.openLightbox) window.openLightbox(img.src);
                });
                previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });

    propertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        const rawFiles = imageInput.files;

        if (rawFiles.length === 0) {
            showToast('Please select at least 1 image.', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = "Compressing Images...";
            const warningText = document.getElementById('upload-warning-text');
            if (warningText) warningText.style.display = 'block';

            // 1. Client-Side Compression
            const filesToProcess = Array.from(rawFiles).slice(0, 5);
            const compressionPromises = filesToProcess.map(file => compressImage(file));
            const compressedBlobs = await Promise.all(compressionPromises);

            submitBtn.innerText = "Uploading... 0%";

            // 2. Upload via XMLHttpRequest with live progress
            const uploadedImageUrls = await uploadImages(compressedBlobs, (percentage) => {
                submitBtn.innerText = `Uploading... ${percentage}%`;
            });

            // Map simple strings to objects as per schema
            const finalImages = uploadedImageUrls.map(url => ({
                url: url,
                public_id: 'auto_gen'
            }));

            submitBtn.innerText = "Saving Data...";

            const newProp = collectDynamicData('prop');
            newProp.images = finalImages;
            newProp.created_at = new Date().toLocaleDateString('en-IN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                timeZone: 'Asia/Kolkata'
            }).replace(/\//g, '-');

            await saveProperty(newProp);
            showToast('Property published successfully!', 'success');

            // Confetti cannon animation for 2s with 5x density
            if (typeof confetti === 'function') {
                var duration = 2000;
                var animationEnd = Date.now() + duration;
                var defaults = { startVelocity: 40, spread: 360, ticks: 80, zIndex: 10000 };

                var interval = setInterval(function () {
                    var timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }
                    var particleCount = 250 * (timeLeft / duration);
                    confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
                }, 150);
            }

            propertyForm.reset();
            previewContainer.innerHTML = '';
            renderDynamicFields('Residential', 'prop');

        } catch (error) {
            console.error(error);
            showToast('Error publishing property.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Publish Property";
            const warningText = document.getElementById('upload-warning-text');
            if (warningText) warningText.style.display = 'none';
        }
    });

    // --- LIVE DB & EDITING ---
    function renderProperties(propertiesObj) {
        const grid = document.getElementById('properties-grid');
        grid.innerHTML = '';

        const properties = Object.entries(propertiesObj).map(([id, data]) => ({ id, ...data }));

        if (properties.length === 0) {
            grid.innerHTML = '<p style="color:var(--ink-faint)">No properties found.</p>';
            return;
        }

        properties.forEach(prop => {
            const card = document.createElement('div');
            card.className = 'property-card';

            const badgeClass = prop.status === 'active' ? 'status-active' : (prop.status === 'hidden' ? 'status-hidden' : 'status-sold');
            const badgeText = prop.status || 'Unknown';

            // strict Image Logic: Use images[0] and inject transform
            let thumbnailUrl = window.PLACEHOLDER_IMAGE;
            if (prop.images && prop.images.length > 0) {
                let imgObj = prop.images[0];
                let rawUrl = typeof imgObj === 'string' ? imgObj : imgObj.url;
                if (rawUrl) {
                    // Check if it's a broken demo URL or mock local relative webp to avoid console 404s
                    const isBrokenDemo = rawUrl.includes('res.cloudinary.com/demo/');
                    const isLocalMock = rawUrl.endsWith('.webp') && !rawUrl.startsWith('http') && !rawUrl.startsWith('data:');
                    
                    if (isBrokenDemo || isLocalMock) {
                        thumbnailUrl = window.PLACEHOLDER_IMAGE;
                    } else if (rawUrl.includes('/upload/')) {
                        thumbnailUrl = rawUrl.replace('/upload/', '/upload/c_scale,w_400,q_auto,f_auto/');
                    } else {
                        thumbnailUrl = rawUrl;
                    }
                }
            }

            // Area display
            let areaHtml = '';
            if (prop.spec?.area) {
                areaHtml = `<span style="font-size:0.85rem; color:var(--ink-soft); font-weight: 500;">📐 ${prop.spec.area.value} ${prop.spec.area.unit}</span>`;
            }

            let catString = prop.category;
            if (prop.sub_category) catString += ` — ${prop.sub_category}`;

            card.innerHTML = `
                <span class="status-badge ${badgeClass}">${badgeText}</span>
                <div class="card-actions-wrapper">
                    <button class="card-action-btn edit-card-btn" data-id="${prop.id}" title="Edit Property">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="card-action-btn delete-card-btn" data-id="${prop.id}" title="Delete Property">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="img-wrapper" style="--card-bg-image: url('${thumbnailUrl}')">
                    <img src="${thumbnailUrl}" loading="lazy" class="card-main-img" onerror="this.onerror=null; this.src=window.PLACEHOLDER_IMAGE;">
                </div>
                <div class="card-content">
                    <div class="card-content-top">
                        <span class="cat-tag">${catString}</span>
                        <h3>${prop.title || 'Untitled'}</h3>
                    </div>
                    <div class="prop-specs" style="border:none; margin-bottom:0; padding-bottom:0;">
                        ${areaHtml}
                        ${prop.location ? `<span style="font-size:0.85rem; color:var(--ink-soft); font-weight: 500;">📍 ${prop.location}</span>` : ''}
                    </div>
                </div>
            `;

            // Wire up the edit button
            const editBtn = card.querySelector('.edit-card-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click
                openEditModal(prop.id, prop);
            });

            // Wire up the delete button
            const deleteBtn = card.querySelector('.delete-card-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click
                const targetId = deleteBtn.getAttribute('data-id');
                const delModal = document.getElementById('delete-modal');
                document.getElementById('delete-target-id').value = targetId;
                if (delModal) delModal.classList.add('active');
            });

            // Wire up image click for lightbox
            const imgEl = card.querySelector('.card-main-img');
            imgEl.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click

                // If it's a placeholder, just use the raw url instead of trying to de-transform
                let rawImageSrc = imgEl.src;
                if (prop.images && prop.images.length > 0) {
                    let imgObj = prop.images[0];
                    rawImageSrc = typeof imgObj === 'string' ? imgObj : imgObj.url;
                }
                if (window.openLightbox) window.openLightbox(rawImageSrc);
            });

            // Card click to view details (Edit Modal)
            card.addEventListener('click', () => {
                openEditModal(prop.id, prop);
            });

            grid.appendChild(card);
        });
    }

    // Modal Logic
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.getElementById('close-modal');
    const editCategorySelect = document.getElementById('edit-category');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    editCategorySelect.addEventListener('change', (e) => {
        // Re-render dynamic fields but keep just the category change, no existing data
        renderDynamicFields(e.target.value, 'edit');
    });

    function openEditModal(id, data) {
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-category').value = data.category || 'Residential';
        document.getElementById('edit-status').value = data.status || 'active';
        document.getElementById('edit-featured').checked = data.featured || false;

        // Render dynamic fields with existing data
        renderDynamicFields(data.category || 'Residential', 'edit', data);

        // Render images
        const editImageContainer = document.getElementById('edit-image-preview-container');
        editImageContainer.innerHTML = '';
        if (data.images && data.images.length > 0) {
            data.images.forEach(imgObj => {
                const src = typeof imgObj === 'string' ? imgObj : imgObj.url;
                if (!src) return;
                const img = document.createElement('img');
                img.src = src;
                img.className = 'preview-img';
                img.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    if (window.openLightbox) window.openLightbox(src);
                });
                editImageContainer.appendChild(img);
            });
        } else {
            editImageContainer.innerHTML = '<p style="color:var(--ink-faint); font-size:0.85rem; width:100%; text-align:center;">No images found for this property.</p>';
        }

        modal.classList.add('active');
    }

    document.getElementById('edit-property-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const btn = document.getElementById('save-edit-btn');

        const cachedData = JSON.parse(sessionStorage.getItem('propertiesData') || '{}');
        const existingImages = cachedData[id]?.images || [];

        const updatedData = collectDynamicData('edit');
        updatedData.images = existingImages;

        try {
            btn.innerText = 'Saving...';
            await updateProperty(id, updatedData);
            showToast('Property updated.', 'success');

            // Confetti animation for 2s on success
            if (typeof confetti === 'function') {
                var duration = 2000;
                var animationEnd = Date.now() + duration;
                var defaults = { startVelocity: 40, spread: 360, ticks: 80, zIndex: 10000 };

                var interval = setInterval(function () {
                    var timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }
                    var particleCount = 250 * (timeLeft / duration);
                    confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
                }, 150);
            }

            modal.classList.remove('active');
            await handleTabLazyLoad('sec-live-db', true);
        } catch (error) {
            console.error(error);
            showToast('Update failed.', 'error');
        } finally {
            btn.innerText = 'Save Changes';
        }
    });

    document.getElementById('delete-prop-btn').addEventListener('click', () => {
        const id = document.getElementById('edit-id').value;
        const delModal = document.getElementById('delete-modal');
        document.getElementById('delete-target-id').value = id;
        if (delModal) delModal.classList.add('active');
    });

    // --- LIVE DB SEARCH & FILTER ---
    const dbSearchInput = document.getElementById('db-search');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filterPanel = document.getElementById('filter-panel');
    const searchSuggestions = document.getElementById('search-suggestions');

    // Typewriter
    const searchPlaceholderWords = ['Residential', 'Jaipur', 'Shastri Nagar'];
    let placeholderWordIdx = 0;
    let placeholderCharIdx = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function typeEffect() {
        if (!dbSearchInput) return;
        const currentWord = searchPlaceholderWords[placeholderWordIdx];
        if (isDeleting) {
            dbSearchInput.placeholder = currentWord.substring(0, placeholderCharIdx - 1);
            placeholderCharIdx--;
            typeSpeed = 50;
        } else {
            dbSearchInput.placeholder = currentWord.substring(0, placeholderCharIdx + 1);
            placeholderCharIdx++;
            typeSpeed = 150;
        }

        dbSearchInput.classList.add('typewriter-placeholder');

        if (!isDeleting && placeholderCharIdx === currentWord.length) {
            typeSpeed = 1500;
            isDeleting = true;
        } else if (isDeleting && placeholderCharIdx === 0) {
            isDeleting = false;
            placeholderWordIdx = (placeholderWordIdx + 1) % searchPlaceholderWords.length;
            typeSpeed = 500;
        }

        setTimeout(typeEffect, typeSpeed);
    }
    if (dbSearchInput) setTimeout(typeEffect, 1000);

    // Hardcoded Suggestions
    const SEARCH_SUGGESTIONS = [
        'Residential', 'Commercial', 'Industrial', 'Land',
        'Villa', 'Apartment', 'House', 'Farmhouse',
        'Shop', 'Office', 'Showroom', 'Hotel',
        'Factory', 'Warehouse', 'Shed',
        'Agricultural', 'Residential Plot', 'Commercial Plot',
        'Jaipur', 'Shastri Nagar', 'Vaishali Nagar', 'Malviya Nagar', 'Mansarovar'
    ];

    if (dbSearchInput) {
        dbSearchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            searchSuggestions.innerHTML = '';
            if (val.length < 1) {
                searchSuggestions.classList.remove('active');
                applyFiltersAndSearch();
                return;
            }

            const matches = SEARCH_SUGGESTIONS.filter(item => item.toLowerCase().includes(val)).slice(0, 5);
            if (matches.length > 0) {
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';

                    const lowerMatch = match.toLowerCase();
                    if (['residential', 'commercial', 'industrial', 'land'].includes(lowerMatch)) {
                        div.innerHTML = `<span class="suggestion-category">Category</span>${match}`;
                    } else if (['jaipur', 'shastri nagar', 'vaishali nagar', 'malviya nagar', 'mansarovar'].includes(lowerMatch)) {
                        div.innerHTML = `<span class="suggestion-category">Location</span>${match}`;
                    } else {
                        div.innerHTML = `<span class="suggestion-category">Sub-Category</span>${match}`;
                    }

                    div.addEventListener('click', () => {
                        dbSearchInput.value = match;
                        searchSuggestions.classList.remove('active');
                        applyFiltersAndSearch();
                    });
                    searchSuggestions.appendChild(div);
                });
                searchSuggestions.classList.add('active');
            } else {
                searchSuggestions.classList.remove('active');
            }

            applyFiltersAndSearch();
        });
    }

    document.addEventListener('click', (e) => {
        if (dbSearchInput && searchSuggestions) {
            if (e.target !== dbSearchInput && e.target !== searchSuggestions && !searchSuggestions.contains(e.target)) {
                searchSuggestions.classList.remove('active');
            }
        }
    });

    // Filters
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterCat = document.getElementById('filter-category');
    const filterSubCat = document.getElementById('filter-sub-category');
    const filterStatus = document.getElementById('filter-status');
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');

    const FILTER_SUB_CATEGORIES = {
        'Residential': ['Villa', 'Apartment', 'House', 'Farmhouse'],
        'Commercial': ['Shop', 'Office', 'Showroom', 'Hotel'],
        'Industrial': ['Factory', 'Warehouse', 'Shed'],
        'Land': ['Agricultural', 'Residential Plot', 'Commercial Plot']
    };

    if (filterCat) {
        filterCat.addEventListener('change', (e) => {
            const cat = e.target.value;
            filterSubCat.innerHTML = '<option value="">Any</option>';
            if (!cat) return;
            const subcats = FILTER_SUB_CATEGORIES[cat] || [];
            subcats.forEach(sc => {
                filterSubCat.innerHTML += `<option value="${sc}">${sc}</option>`;
            });
        });
    }

    if (filterToggleBtn) {
        filterToggleBtn.addEventListener('click', () => {
            filterPanel.classList.toggle('active');
            filterToggleBtn.classList.toggle('active');
        });
    }

    function applyFiltersAndSearch() {
        const query = dbSearchInput.value.toLowerCase().trim();
        const cat = filterCat.value;
        const subCat = filterSubCat.value;
        const status = filterStatus.value;
        const dFrom = filterDateFrom.value ? new Date(filterDateFrom.value) : null;
        const dTo = filterDateTo.value ? new Date(filterDateTo.value) : null;

        const rawData = sessionStorage.getItem('propertiesData');
        if (!rawData) return;
        const properties = JSON.parse(rawData);

        const filtered = {};
        for (const [id, prop] of Object.entries(properties)) {
            // Search Query
            if (query) {
                const searchStr = `${prop.title} ${prop.category} ${prop.sub_category} ${prop.status} ${prop.location}`.toLowerCase();
                if (!searchStr.includes(query)) continue;
            }

            // Filters
            if (cat && prop.category !== cat) continue;
            if (subCat && prop.sub_category !== subCat) continue;
            if (status && prop.status !== status) continue;

            // Date Filter (created_at format: DD-MM-YYYY)
            if (dFrom || dTo) {
                if (!prop.created_at) continue;
                const parts = prop.created_at.split('-');
                if (parts.length === 3) {
                    const pDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                    if (dFrom && pDate < dFrom) continue;
                    if (dTo && pDate > dTo) continue;
                } else {
                    continue;
                }
            }

            filtered[id] = prop;
        }

        renderProperties(filtered);
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFiltersAndSearch);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            filterCat.value = '';
            filterSubCat.innerHTML = '<option value="">Any</option>';
            filterStatus.value = '';
            filterDateFrom.value = '';
            filterDateTo.value = '';
            dbSearchInput.value = '';
            applyFiltersAndSearch();
        });
    }

    // --- LEADS ---
    function renderLeads(leadsObj) {
        const tbody = document.getElementById('leads-tbody');
        tbody.innerHTML = '';

        const leads = Object.entries(leadsObj).map(([id, data]) => ({ id, ...data }));
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No leads found.</td></tr>';
            return;
        }

        leads.forEach(lead => {
            const tr = document.createElement('tr');
            const dateStr = new Date(lead.timestamp).toLocaleDateString();

            tr.innerHTML = `
                <td><strong>${lead.client_name}</strong></td>
                <td><a href="tel:${lead.client_phone}" style="color:var(--ink); font-weight:600; text-decoration:none;">${lead.client_phone}</a></td>
                <td style="font-family: monospace; font-size: 0.85rem; color:var(--ink-faint);">${lead.property_id}</td>
                <td style="color:var(--ink-faint);">${dateStr}</td>
                <td>
                    <select class="lead-status-select" data-id="${lead.id}">
                        <option value="new" ${lead.lead_status === 'new' ? 'selected' : ''}>New</option>
                        <option value="contacted" ${lead.lead_status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="deal_closed" ${lead.lead_status === 'deal_closed' ? 'selected' : ''}>Deal Closed</option>
                        <option value="junk" ${lead.lead_status === 'junk' ? 'selected' : ''}>Junk</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.lead-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                try {
                    await updateLeadStatus(id, newStatus);
                    showToast('Lead status updated.', 'success');
                    const cached = JSON.parse(sessionStorage.getItem('dashboardData'));
                    cached.leads[id].lead_status = newStatus;
                    sessionStorage.setItem('dashboardData', JSON.stringify(cached));
                } catch (error) {
                    console.error(error);
                    showToast('Failed to update lead.', 'error');
                }
            });
        });
    }

    // --- GLOBAL SETTINGS ---
    function populateSettingsForm(settings) {
        document.getElementById('set-maintenance').checked = settings.maintenance_mode || false;

        if (settings.branding) {
            document.getElementById('set-logo').value = settings.branding.logo_url || '';
        }
        if (settings.hero_banner) {
            document.getElementById('set-hero').value = settings.hero_banner.images_links || '';
        }
        if (settings.contact_info) {
            document.getElementById('set-whatsapp').value = settings.contact_info.whatsapp_number || '';
            document.getElementById('set-email').value = settings.contact_info.support_email || '';
            document.getElementById('set-address').value = settings.contact_info.office_address || '';
        }
        if (settings.social_links) {
            document.getElementById('set-instagram').value = settings.social_links.instagram || '';
            document.getElementById('set-facebook').value = settings.social_links.facebook || '';
            document.getElementById('set-youtube').value = settings.social_links.youtube || '';
        }
    }

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-settings-btn');

        const newSettings = {
            maintenance_mode: document.getElementById('set-maintenance').checked,
            branding: {
                logo_url: document.getElementById('set-logo').value.trim()
            },
            hero_banner: {
                images_links: document.getElementById('set-hero').value.trim()
            },
            contact_info: {
                whatsapp_number: document.getElementById('set-whatsapp').value.trim(),
                support_email: document.getElementById('set-email').value.trim(),
                office_address: document.getElementById('set-address').value.trim()
            },
            social_links: {
                instagram: document.getElementById('set-instagram').value.trim(),
                facebook: document.getElementById('set-facebook').value.trim(),
                youtube: document.getElementById('set-youtube').value.trim()
            }
        };

        try {
            btn.innerText = 'Deploying...';
            await updateGlobalSettings(newSettings);
            showToast('Settings deployed successfully!', 'success');
            applyGlobalSettings(newSettings);

            const cached = JSON.parse(sessionStorage.getItem('dashboardData'));
            cached.global_settings = newSettings;
            sessionStorage.setItem('dashboardData', JSON.stringify(cached));

        } catch (error) {
            console.error(error);
            showToast('Failed to deploy settings.', 'error');
        } finally {
            btn.innerText = 'Deploy Settings';
        }
    });
});

// Toast System
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Minimalist monochrome icon check
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}