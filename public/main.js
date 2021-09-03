import { initViewer, loadModel } from './viewer.js';
import { initTree } from './sidebar.js';

const login = document.getElementById('login');
try {
    const resp = await fetch('/api/auth/profile');
    if (!resp.ok) {
        throw new Error('User is not logged in');
    }
    const profile = await resp.json();
    login.innerText = `Logout (${profile.name})`;
    login.onclick = () => window.location.replace('/api/auth/logout');
    const viewer = await initViewer(document.getElementById('preview'));
    initTree(document.getElementById('tree'), function (nodes) {
        if (nodes.length === 1) {
            const urn = btoa(nodes[0].id).replace(/=/g, '');
            loadModel(viewer, urn);
        }
    });
} catch (err) {
    login.innerText = 'Login';
    login.onclick = () => window.location.replace('/api/auth/login');
}
login.style.display = 'inline';
