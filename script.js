const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const cvContainer = document.getElementById('cv-container');
cvContainer.appendChild(renderer.domElement);

const planes = [];
const sectionSpacing = 3; // Increased spacing
let currentYOffset = 0;
let totalHeight = 0; // To track the total height of all sections

const metallicMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 0.8,
    roughness: 0.3,
    side: THREE.DoubleSide
});

const font = 'Georgia'; // Set the default font

// Function to create a texture from HTML content
function createTextureFromHTML(htmlContent, width = 512, height = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f0f0'; // Background color of the plane
    ctx.fillRect(0, 0, width, height);
    ctx.font = `20px ${font}`; // Set font style
    ctx.fillStyle = '#333'; // Text color

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textLines = [];

    function getTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
            textLines.push(node.textContent.trim());
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'P' || node.tagName === 'LI') {
                let text = '';
                if (node.tagName === 'STRONG') {
                    text += node.textContent.trim();
                } else {
                    text += node.textContent.trim();
                }
                textLines.push(text);
            } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                // Skip list containers, their items will be handled
            } else if (node.tagName === 'SPAN' && node.classList.contains('right')) {
                textLines.push(node.textContent.trim());
            } else if (node.children.length > 0) {
                Array.from(node.children).forEach(getTextNodes);
            } else if (node.textContent.trim() !== '') {
                textLines.push(node.textContent.trim());
            }
        }
    }

    Array.from(tempDiv.children).forEach(getTextNodes);

    let y = 50;
    const lineHeight = 25;
    textLines.forEach(line => {
        const words = line.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > width - 60 && currentLine !== '') {
                ctx.fillText(currentLine.trim(), 30, y);
                y += lineHeight;
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        ctx.fillText(currentLine.trim(), 30, y);
        y += lineHeight;
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

sectionsData.forEach(sectionInfo => {
    const contentElement = document.getElementById(`${sectionInfo.id}-content`);
    if (contentElement) {
        const htmlContent = contentElement.innerHTML;
        const texture = createTextureFromHTML(htmlContent);
        const planeGeometry = new THREE.PlaneGeometry(16, 9); // Adjust size as needed
        const planeMaterial = metallicMaterial.clone();
        planeMaterial.map = texture;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.y = currentYOffset;
        planes.push(plane);
        scene.add(plane);
        totalHeight += 9 + sectionSpacing;
        currentYOffset -= (9 + sectionSpacing); // Adjust spacing based on plane height
    }
});

// Center the sections vertically
const startYOffset = (totalHeight - sectionSpacing) / 2;
planes.forEach(plane => {
    plane.position.y += startYOffset;
});
camera.position.z = 15;

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const mouse = new THREE.Vector2();
const targetRotation = new THREE.Vector2();
const rotationSpeed = 0.005;

document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    targetRotation.y = mouse.x * Math.PI * 0.05; // Adjust multiplier for sensitivity
    targetRotation.x = mouse.y * Math.PI * 0.05;
}, false);

let cameraTargetY = 0;
const scrollSpeed = 0.5;

cvContainer.addEventListener('wheel', (event) => {
    cameraTargetY += event.deltaY * 0.01 * scrollSpeed;
    // Optionally add limits to the scrolling
    const minY = -(totalHeight / 2) + (window.innerHeight / (window.innerWidth / 16) / 2) + 2; // Approximate lower limit
    const maxY = (totalHeight / 2) - (window.innerHeight / (window.innerWidth / 16) / 2) - 2; // Approximate upper limit
    cameraTargetY = Math.max(minY, Math.min(maxY, cameraTargetY));
});

function animate() {
    requestAnimationFrame(animate);

    planes.forEach(plane => {
        plane.rotation.y += (targetRotation.y - plane.rotation.y) * 0.1;
        plane.rotation.x += (targetRotation.x - plane.rotation.x) * 0.1;
    });

    // Smoothly move the camera
    camera.position.y += (cameraTargetY - camera.position.y) * 0.05;

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
});