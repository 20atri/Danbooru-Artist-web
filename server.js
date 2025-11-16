const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;
const IMAGES_DIR = path.join(__dirname, 'images'); // 存储上传图片和画师JSON的目录

// 确保图片目录存在
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR);
}

// CORS 允许所有来源，但生产环境建议限制
app.use(cors());
app.use(express.json()); // 用于解析 JSON 请求体

// 提供静态文件，包括 index.html, script.js, style.css
app.use(express.static(path.join(__dirname, '/'))); 
// 提供 /images 路径下的所有文件（图片和画师JSON）
app.use('/images', express.static(IMAGES_DIR)); 


// =====================================
// Helper functions for data management (now handling individual JSON files)
// =====================================

// Function to get a unique ID for new artists (simple timestamp for now)
function generateUniqueId() {
    return Date.now();
}

// Read all artists data from individual JSON files in IMAGES_DIR
function readArtistsData() {
    const artists = [];
    const files = fs.readdirSync(IMAGES_DIR);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const filePath = path.join(IMAGES_DIR, file);
                const data = fs.readFileSync(filePath, 'utf8');
                const artist = JSON.parse(data);
                artists.push(artist);
            } catch (error) {
                console.error(`Error reading or parsing artist JSON file ${file}:`, error);
            }
        }
    }
    return artists;
}

// Write a single artist's data to a JSON file
// 修改为使用 artist.id 作为文件名，并确保文件名的合法性
function writeArtistData(artist) {
    const safeArtistName = artist.name.replace(/[\\/:*?"<>|]/g, '_'); // 替换非法字符
    const filename = `${safeArtistName}-${artist.id}.json`; 
    const filePath = path.join(IMAGES_DIR, filename);

    // 先查找旧的JSON文件并删除（如果文件名已更改）
    const oldFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith(`${artist.id}.json`) && !f.startsWith(safeArtistName));
    oldFiles.forEach(oldFile => {
        fs.unlinkSync(path.join(IMAGES_DIR, oldFile));
        console.log(`Deleted old artist JSON file: ${oldFile}`);
    });

    fs.writeFileSync(filePath, JSON.stringify(artist, null, 2), 'utf8');
    console.log(`Saved artist data to: ${filename}`);
}

// Delete a single artist's JSON file
function deleteArtistJson(artistId) {
    const files = fs.readdirSync(IMAGES_DIR);
    const artistFile = files.find(f => f.endsWith(`${artistId}.json`));
    if (artistFile) {
        const filePath = path.join(IMAGES_DIR, artistFile);
        fs.unlinkSync(filePath);
        console.log(`Deleted artist JSON file: ${filePath}`);
    }
}


// Initial placeholder images setup
async function createPlaceholderImage(type, filename, svgContent) {
    const filePath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, svgContent, 'utf8');
        console.log(`Created placeholder image: ${filename}`);
    }
    return `/images/${filename}`;
}

const PLACEHOLDER_ARTIST_SVG = `<svg width="200" height="180" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="180" fill="#e6e6fa"/><text x="50%" y="50%" font-family="Arial" font-size="18" text-anchor="middle" alignment-baseline="middle" fill="#777">Artist Image</text></svg>`;
const PLACEHOLDER_SAMPLE_SVG = `<svg width="100" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="80" fill="#f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="12" text-anchor="middle" alignment-baseline="middle" fill="#8a8c8a">Sample</text></svg>`;

createPlaceholderImage('artist', 'placeholder-artist.png', PLACEHOLDER_ARTIST_SVG);
createPlaceholderImage('sample', 'placeholder-sample.png', PLACEHOLDER_SAMPLE_SVG);

// API endpoint to create placeholder images on demand (if not exists)
app.post('/api/create-placeholder', async (req, res) => {
    const { type } = req.body;
    let filePath;
    if (type === 'artist') {
        filePath = await createPlaceholderImage('artist', 'placeholder-artist.png', PLACEHOLDER_ARTIST_SVG);
    } else if (type === 'sample') {
        filePath = await createPlaceholderImage('sample', 'placeholder-sample.png', PLACEHOLDER_SAMPLE_SVG);
    } else {
        return res.status(400).json({ message: 'Invalid placeholder type' });
    }
    res.json({ message: 'Placeholder checked/created', filePath });
});


// =====================================
// Multer setup for file uploads
// =====================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, IMAGES_DIR); // 图片保存到 images 文件夹
    },
    filename: function (req, file, cb) {
        const artistName = req.body.artistName || 'unknown';
        const imageType = req.body.imageType || 'general'; // 'preview' or 'sample'
        const originalExt = path.extname(file.originalname).toLowerCase();
        const safeArtistName = artistName.replace(/[\\/:*?"<>|]/g, '_'); // 替换文件名中的非法字符

        // 获取当前画师的图片数量，用于命名
        const existingFiles = fs.readdirSync(IMAGES_DIR).filter(f => 
            f.startsWith(`${safeArtistName}-${imageType}`) && f.endsWith(originalExt)
        );
        const nextIndex = existingFiles.length + 1;

        let filename = `${safeArtistName}-${imageType}-${nextIndex}${originalExt}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 限制文件大小 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/; // 允许更多图片格式
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed!'));
        }
    }
});

// =====================================
// API Endpoints
// =====================================

// 获取所有画师数据
app.get('/api/artists', (req, res) => {
    const artists = readArtistsData();
    res.json(artists);
});

// 添加新画师
app.post('/api/artists', (req, res) => {
    const newArtist = req.body;
    newArtist.id = generateUniqueId(); // 由后端生成唯一ID
    newArtist.createTime = newArtist.createTime || new Date().toISOString().split('T')[0];
    newArtist.sampleImages = newArtist.sampleImages || [];
    newArtist.artistId = Array.isArray(newArtist.artistId) ? newArtist.artistId : (newArtist.artistId ? newArtist.artistId.split(',').map(s => s.trim()).filter(Boolean) : []);
    newArtist.trainingCount = Array.isArray(newArtist.trainingCount) ? newArtist.trainingCount : (newArtist.trainingCount ? newArtist.trainingCount.split(',').map(s => parseInt(s.trim()) || 0).filter(c => !isNaN(c)) : [0]);

    // Ensure default placeholder if no image path is provided
    if (!newArtist.previewImage) {
        newArtist.previewImage = '/images/placeholder-artist.png';
    }

    writeArtistData(newArtist); // 保存为单独的JSON文件
    res.status(201).json(newArtist);
});

// 更新画师数据
app.put('/api/artists/:id', (req, res) => {
    const artists = readArtistsData();
    const artistId = parseInt(req.params.id);
    const updatedArtistData = req.body;

    const index = artists.findIndex(a => a.id === artistId);
    if (index !== -1) {
        // 合并现有数据和更新数据，确保ID不变
        // 特别处理 artistId 和 trainingCount，确保它们是数组
        updatedArtistData.artistId = Array.isArray(updatedArtistData.artistId) ? updatedArtistData.artistId : (updatedArtistData.artistId ? updatedArtistData.artistId.split(',').map(s => s.trim()).filter(Boolean) : []);
        updatedArtistData.trainingCount = Array.isArray(updatedArtistData.trainingCount) ? updatedArtistData.trainingCount : (updatedArtistData.trainingCount ? updatedArtistData.trainingCount.split(',').map(s => parseInt(s.trim()) || 0).filter(c => !isNaN(c)) : [0]);

        artists[index] = { ...artists[index], ...updatedArtistData, id: artistId };
        writeArtistData(artists[index]); // 更新对应的JSON文件
        res.json(artists[index]);
    } else {
        res.status(404).json({ message: 'Artist not found' });
    }
});

// 删除画师
app.delete('/api/artists/:id', (req, res) => {
    let artists = readArtistsData();
    const artistId = parseInt(req.params.id);

    const artistToDelete = artists.find(a => a.id === artistId);
    if (!artistToDelete) {
        return res.status(404).json({ message: 'Artist not found' });
    }

    // 删除关联的图片文件 (预览图和示例图)
    const imagesToDelete = [];
    if (artistToDelete.previewImage && artistToDelete.previewImage !== '/images/placeholder-artist.png') {
        imagesToDelete.push(artistToDelete.previewImage);
    }
    (artistToDelete.sampleImages || []).forEach(img => {
        if (img && img !== '/images/placeholder-sample.png') {
            imagesToDelete.push(img);
        }
    });

    imagesToDelete.forEach(imgPath => {
        const filename = path.basename(imgPath);
        const fullPath = path.join(IMAGES_DIR, filename);
        
        // 确保只删除 /images 目录下的文件，并且不是占位图
        if (fs.existsSync(fullPath) && !filename.startsWith('placeholder-')) {
            fs.unlink(fullPath, (err) => {
                if (err) console.error(`Error deleting image file ${fullPath}:`, err);
                else console.log(`Deleted image file: ${fullPath}`);
            });
        }
    });

    deleteArtistJson(artistId); // 删除画师的JSON文件
    res.status(204).send(); // No Content
});

// 图片上传API (upload.single 改为 upload.array 支持多文件上传)
app.post('/api/upload-image', upload.single('image'), (req, res) => {
    if (req.file) {
        // 返回图片的相对路径，前端可以直接使用
        const filePath = `/images/${req.file.filename}`;
        res.json({ filePath: filePath });
    } else {
        res.status(400).json({ message: 'No image file uploaded or invalid file type.' });
    }
});

// 删除图片文件（用于删除示例图时，如果需要单独删除文件）
app.post('/api/delete-image', (req, res) => {
    const { path: imagePath } = req.body;
    if (!imagePath) {
        return res.status(400).json({ message: 'Image path is required.' });
    }

    const filename = path.basename(imagePath); // 提取文件名
    const fullPath = path.join(IMAGES_DIR, filename);

    // 避免删除非 /images 目录下的文件或占位图
    if (!fullPath.startsWith(IMAGES_DIR) || filename.startsWith('placeholder-')) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete files outside images directory or placeholder images.' });
    }

    if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
            if (err) {
                console.error(`Error deleting file ${fullPath}:`, err);
                return res.status(500).json({ message: 'Failed to delete image file.' });
            }
            console.log(`Deleted image file: ${fullPath}`);
            res.json({ message: 'Image file deleted successfully.' });
        });
    } else {
        res.status(404).json({ message: 'Image file not found.' });
    }
});


// 导出画师数据 (从后端获取所有画师数据)
app.get('/api/export-artists', (req, res) => {
    const artists = readArtistsData();
    res.json(artists);
});


// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend accessible at http://localhost:${PORT}/`); // 修改为根路径
    console.log(`Images and artist JSON files stored in: ${IMAGES_DIR}`);
});