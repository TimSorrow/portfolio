import * as THREE from 'three';

// Setup Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true ensures background shows through
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Geometry - Icosahedron
const radius = 2.2;
const detail = 1; // Creates geometric subdivision
const geometry = new THREE.IcosahedronGeometry(radius, detail);

// Wireframe Materials (Glowing white/silver lines)
// We add multiple layers to create a 'breathing data model' feel
const material1 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
});

const sphere1 = new THREE.Mesh(geometry, material1);
scene.add(sphere1);

const material2 = new THREE.MeshBasicMaterial({
    color: 0xcccccc, // slightly darker silver
    wireframe: true,
    transparent: true,
    opacity: 0.08,
});
const sphere2 = new THREE.Mesh(geometry, material2);
sphere2.scale.set(1.05, 1.05, 1.05);
scene.add(sphere2);

const material3 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.03,
});
const sphere3 = new THREE.Mesh(geometry, material3);
sphere3.scale.set(1.1, 1.1, 1.1);
scene.add(sphere3);

// Mouse & Scroll Reactivity
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX) * 0.001;
    mouseY = (event.clientY - windowHalfY) * 0.001;
});

let scrollY = window.scrollY;
document.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Breathing effect
    const breath1 = 1 + Math.sin(elapsedTime * 0.8) * 0.02;
    const breath2 = 1.05 + Math.cos(elapsedTime * 0.6) * 0.03;
    const breath3 = 1.1 + Math.sin(elapsedTime * 0.4) * 0.04;

    sphere1.scale.set(breath1, breath1, breath1);
    sphere2.scale.set(breath2, breath2, breath2);
    sphere3.scale.set(breath3, breath3, breath3);

    // Constant slow rotation
    sphere1.rotation.x += 0.001;
    sphere1.rotation.y += 0.002;

    sphere2.rotation.x -= 0.0015;
    sphere2.rotation.y += 0.001;

    sphere3.rotation.x += 0.002;
    sphere3.rotation.y -= 0.001;

    // Smooth dampening for mouse movement
    targetX = mouseX * 0.5;
    targetY = mouseY * 0.5;

    // Apply mouse parallax to the entire scene
    scene.rotation.x += 0.05 * (targetY - scene.rotation.x);
    scene.rotation.y += 0.05 * (targetX - scene.rotation.y);

    // Parallax effect on scroll (anti-gravity floating up)
    const scrollFactor = scrollY * 0.002;
    scene.position.y = scrollFactor * 2.5;
    // Pushes the sphere back slightly as you scroll down
    scene.position.z = -scrollFactor * 1.5;

    renderer.render(scene, camera);
}

// Window resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start loop
animate();
