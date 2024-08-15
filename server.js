const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');

const app = express();

// Configure multer for file upload
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5 // Maximum 5 files
    }
});

app.use(express.static('.'));

// Add a route for ACME challenge
app.use('/.well-known/acme-challenge', express.static('.well-known/acme-challenge'));

const supportedFormats = [
    'jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic', 'svg', 'ico',
    'tga', 'psd', 'eps', 'avif', 'pdf', 'exr', 'hdr', 'cr2', 'nef', 'dng',
    'arw', 'orf', 'xbm', 'wbmp', 'dicom', 'ras', 'pgm', 'pbm', 'jbig', 'cin',
    'dpx', 'rla', 'vicar', 'djvu', 'fl32', 'mng', 'pcx', 'ppm', 'xpm', 'cut',
    'palm', 'pict', 'fax', 'xwd', 'info', 'rad', 'sun', 'pwp', 'fpx', 'hrz', 'man'
];

// Queue system
const queue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || queue.length === 0) return;

    isProcessing = true;
    const task = queue.shift();
    updateQueuePositions();

    try {
        await handleConversion(task);
    } catch (error) {
        console.error('Error processing task:', error);
        if (task.ws && task.ws.readyState === WebSocket.OPEN) {
            task.ws.send(JSON.stringify({ type: 'error', message: 'Error processing your request' }));
        }
    }

    isProcessing = false;
    processQueue();
}

function updateQueuePositions() {
    queue.forEach((task, index) => {
        if (task.ws && task.ws.readyState === WebSocket.OPEN) {
            task.ws.send(JSON.stringify({ type: 'queuePosition', position: index + 1 }));
        }
    });
}

async function convertImage(inputPath, outputPath, format, ws) {
    const magickPath = path.join(__dirname, 'magick');
    const qualityFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'avif'];
    const qualityOption = qualityFormats.includes(format) ? '-quality 75' : '';
    const command = `${magickPath} "${inputPath}" ${format === 'jpg' || format === 'jpeg' ? '-flatten' : ''} ${qualityOption} "${outputPath}"`;

    console.log(`Executing command: ${command}`);

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command failed: ${stderr}`); // Improved error logging
                return reject(new Error(`Error converting ${inputPath} to ${outputPath}: ${stderr}`));
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'progress', message: `Converted ${path.basename(inputPath)}` }));
            }
            resolve(outputPath);
        });
    });
}

function cleanup(filePaths) {
    filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        }
    });
}

async function handleConversion(task) {
    const { files, format, ws, res } = task;
    const outputDir = path.join(__dirname, 'converted');

    console.log(`Current directory: ${__dirname}`);
    console.log(`Output directory: ${outputDir}`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const filesToCleanup = [];

    if (files.length === 1) {
        await handleSingleFileConversion(files[0], format, ws, res, filesToCleanup, outputDir);
    } else {
        await handleMultipleFilesConversion(files, format, ws, res, filesToCleanup, outputDir);
    }
}

async function handleSingleFileConversion(file, format, ws, res, filesToCleanup, outputDir) {
    const outputFilename = `${path.parse(file.originalname).name}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);

    try {
        console.log(`Converting ${file.originalname} to ${format}`);
        const finalOutputPath = await convertImage(file.path, outputPath, format, ws);

        filesToCleanup.push(file.path, finalOutputPath);

        setTimeout(() => {
            if (fs.existsSync(finalOutputPath)) {
                res.download(finalOutputPath, outputFilename, (err) => {
                    if (err) {
                        console.error(`Error sending file: ${err}`);
                        res.status(500).send(`Error sending file: ${err.message}`);
                    }
                    cleanup(filesToCleanup);
                });
            } else {
                console.error(`File not found: ${finalOutputPath}`);
                res.status(404).send('Converted file not found');
                cleanup(filesToCleanup);
            }
        }, 1000); // 1 second delay
    } catch (error) {
        console.error(`Error converting file ${file.originalname}:`, error);
        res.status(500).send(`Error converting file: ${error.message}`);
        cleanup(filesToCleanup);
    }
}

async function handleMultipleFilesConversion(files, format, ws, res, filesToCleanup, outputDir) {
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.attachment('converted_images.zip');
    archive.pipe(res);

    for (const file of files) {
        const outputFilename = `${path.parse(file.originalname).name}.${format}`;
        const outputPath = path.join(outputDir, outputFilename);

        try {
            console.log(`Converting ${file.originalname} to ${format}`);
            const finalOutputPath = await convertImage(file.path, outputPath, format, ws);

            const finalOutputFilename = path.basename(finalOutputPath);
            console.log(`Adding ${finalOutputFilename} to archive`);
            archive.file(finalOutputPath, { name: finalOutputFilename });

            filesToCleanup.push(file.path, finalOutputPath);
        } catch (error) {
            console.error(`Error converting file ${file.originalname}:`, error);
            archive.append(Buffer.from(`Error converting ${file.originalname}: ${error.message}`), { name: `${file.originalname}_error.txt` });
            filesToCleanup.push(file.path);
        }
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'progress', message: 'Archiving completed files...' }));
    }
    archive.finalize();

    res.on('finish', () => {
        cleanup(filesToCleanup);
    });
}

app.post('/convert', upload.array('files'), async (req, res) => {
    const files = req.files;
    const format = req.body.format.toLowerCase();
    const wsId = req.body.wsId;
    const ws = wsClients.get(wsId);

    console.log(`Received ${files.length} files for conversion to ${format}`);

    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    if (!supportedFormats.includes(format)) {
        return res.status(400).send('Unsupported output format.');
    }

    queue.push({ files, format, ws, res });

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'queuePosition', position: queue.length }));
    }

    if (!isProcessing) {
        processQueue();
    }
});

// Redirect from HTTP to HTTPS
const httpApp = express();
httpApp.all('*', (req, res) => {
    const host = req.headers.host;
    const url = `https://${host}${req.url}`;
    console.log(`Redirecting to: ${url}`);
    res.redirect(301, url);
});

// HTTPS options
const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/freeconvert4u.com/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/freeconvert4u.com/fullchain.pem', 'utf8'),
    ca: fs.readFileSync('/etc/letsencrypt/live/freeconvert4u.com/chain.pem', 'utf8') // Add this line if you have a CA file
};

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app);

// Create WebSocket server
const wss = new WebSocket.Server({ server: httpsServer });
const wsClients = new Map();

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    ws.id = id;
    wsClients.set(id, ws);
    ws.send(JSON.stringify({ type: 'connected', id: id }));

    ws.on('close', () => {
        wsClients.delete(id);
    });
});

// Start both HTTP and HTTPS servers
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

const httpServer = http.createServer(httpApp);

httpServer.on('clientError', (err, socket) => {
    console.error('HTTP clientError', err);
    if (err.code === 'HPE_INVALID_METHOD') {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } else {
        socket.destroy(err);
    }
});

httpsServer.on('clientError', (err, socket) => {
    console.error('HTTPS clientError', err);
    socket.destroy(err);
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running on port ${HTTP_PORT} (redirecting to HTTPS)`);
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});