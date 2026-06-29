// databaseAdapter.js
import { FIREBASE_CONFIG } from '../config.js';

const DB_URL = FIREBASE_CONFIG.databaseURL;

/**
 * Fetches Properties
 */
export async function fetchProperties() {
    const response = await fetch(`${DB_URL}/properties.json`, { method: 'GET' });
    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    const data = await response.json();
    return data || {};
}

/**
 * Fetches Leads
 */
export async function fetchLeads() {
    const response = await fetch(`${DB_URL}/leads.json`, { method: 'GET' });
    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    const data = await response.json();
    return data || {};
}

/**
 * Fetches Global Settings
 */
export async function fetchGlobalSettings() {
    const response = await fetch(`${DB_URL}/global_settings.json`, { method: 'GET' });
    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    const data = await response.json();
    return data || {};
}

/**
 * Saves a NEW property
 */
export async function saveProperty(data) {
    const id = `prop_${Date.now()}`;
    const response = await fetch(`${DB_URL}/properties/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    return { status: 'success', id: id };
}

/**
 * Updates an EXISTING property
 */
export async function updateProperty(id, data) {
    const response = await fetch(`${DB_URL}/properties/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    return { status: 'success' };
}

/**
 * Deletes a property
 */
export async function deleteProperty(id) {
    const response = await fetch(`${DB_URL}/properties/${id}.json`, {
        method: 'DELETE'
    });

    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    return true;
}

/**
 * Updates Global Settings
 */
export async function updateGlobalSettings(data) {
    const response = await fetch(`${DB_URL}/global_settings.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    return { status: 'success' };
}

/**
 * Updates Lead Status
 */
export async function updateLeadStatus(id, status) {
    const response = await fetch(`${DB_URL}/leads/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_status: status })
    });

    if (!response.ok) throw new Error(`Firebase Error: ${response.status}`);
    return { status: 'success' };
}
