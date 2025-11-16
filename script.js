// 定义后端 API 的基础 URL
const API_BASE_URL = 'http://localhost:3000/api'; // 假设后端运行在 3000 端口

// 全局画师数据数组
let artistsData = [];

let currentArtist = null; // 当前选中的画师
let sortBy = 'count'; // 当前排序方式
let currentSearchTerm = ''; // 当前搜索词

// 新增：画师串生成区开关状态
let artistChainEnabled = false; 

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', async function() {
    await loadArtists(); // 从后端加载数据
    filterAndRender(); // 渲染画师列表和画廊
    setupEventListeners(); // 设置事件监听器

    // 如果没有 placeholder 图片，确保它们存在
    await checkAndCreatePlaceholders();
    updateArtistChainPanelState(); // 初始化画师串面板状态
});

// 检查并创建占位图的辅助函数
async function checkAndCreatePlaceholders() {
    try {
        await fetch('/images/placeholder-artist.png', { method: 'HEAD' });
    } catch (error) {
        console.warn('Placeholder artist image not found, requesting creation...');
        await fetch(`${API_BASE_URL}/create-placeholder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'artist' })
        }).catch(err => console.error("Failed to create artist placeholder:", err));
    }

    try {
        await fetch('/images/placeholder-sample.png', { method: 'HEAD' });
    } catch (error) {
        console.warn('Placeholder sample image not found, requesting creation...');
        await fetch(`${API_BASE_URL}/create-placeholder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'sample' })
        }).catch(err => console.error("Failed to create sample placeholder:", err));
    }
}

// 从后端加载所有画师数据
async function loadArtists() {
    try {
        const response = await fetch(`${API_BASE_URL}/artists`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        artistsData = await response.json();
        console.log("Artists loaded from backend:", artistsData);
    } catch (error) {
        console.error("加载画师数据失败:", error);
        alert("加载画师数据失败，请确保后端服务器正在运行！");
        artistsData = []; // 如果加载失败，清空数据
    }
}

// 保存单个画师数据到后端 (PUT 请求)
async function saveArtistDataToBackend(artist) {
    try {
        const response = await fetch(`${API_BASE_URL}/artists/${artist.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artist)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log("Artist saved to backend:", result);
        return result;
    } catch (error) {
        console.error("保存画师数据到后端失败:", error);
        alert("保存画师数据失败，请检查后端服务器连接！");
        return null;
    }
}

// 设置所有交互事件监听器
function setupEventListeners() {
    document.getElementById('sortBy').addEventListener('change', e => {
        sortBy = e.target.value;
        filterAndRender();
    });

    document.getElementById('searchArtist').addEventListener('input', e => {
        currentSearchTerm = e.target.value.toLowerCase();
        filterAndRender();
    });

    document.getElementById('addArtistBtn').addEventListener('click', () => {
        document.getElementById('addArtistModal').style.display = 'flex';
        // 清空表单
        document.getElementById('newArtistName').value = '';
        document.getElementById('newArtistId').value = '';
        document.getElementById('newTrainingCount').value = '0';
        document.getElementById('newPreviewImage').value = '';
        document.getElementById('newPreviewImageDisplay').src = '/images/placeholder-artist.png';
        document.getElementById('newTags').value = '';
        document.getElementById('newTriggerWords').value = '';
        document.getElementById('newStyleDescription').value = '';
    });

    document.getElementById('closeAddArtistModal').addEventListener('click', () => {
        document.getElementById('addArtistModal').style.display = 'none';
    });

    document.getElementById('newPreviewImage').addEventListener('change', event => {
        previewImage(event.target, 'newPreviewImageDisplay');
    });

    document.getElementById('createArtistBtn').addEventListener('click', createArtist);

    document.getElementById('saveBtn').addEventListener('click', () => {
        if (currentArtist) saveArtistChanges();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        if (currentArtist) loadArtistDetails(currentArtist);
    });

    document.getElementById('deleteArtistBtn').addEventListener('click', () => {
        if (currentArtist && confirm(`确定要删除画师 ${currentArtist.name} 吗？`)) {
            deleteArtist(currentArtist.id);
        }
    });

    document.getElementById('editPreviewImage').addEventListener('change', event => {
        previewImage(event.target, 'currentPreviewImage');
    });
    
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('imageModal').style.display = 'none';
    });

    // 模态框点击背景关闭
    document.getElementById('imageModal').addEventListener('click', function(e) {
        // 只有点击到模态框本身（而不是图片）时才关闭
        if (e.target === this || e.target.classList.contains('modal-image')) {
            this.style.display = 'none';
        }
    });

    document.getElementById('addSampleImageBtn').addEventListener('click', () => {
        if (currentArtist) {
            document.getElementById('addSampleImageModal').style.display = 'flex';
            document.getElementById('newSampleImageFiles').value = ''; // 清空文件输入
            document.getElementById('newSampleImagesPreview').innerHTML = ''; // 清空预览
        } else {
            alert('请先选择一个画师！');
        }
    });

    document.getElementById('closeAddSampleImageModal').addEventListener('click', () => {
        document.getElementById('addSampleImageModal').style.display = 'none';
    });
    
    // 示例图多选预览
    document.getElementById('newSampleImageFiles').addEventListener('change', event => {
        const previewContainer = document.getElementById('newSampleImagesPreview');
        previewContainer.innerHTML = ''; // 清空之前的预览

        if (event.target.files && event.target.files.length > 0) {
            Array.from(event.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    img.style.objectFit = 'cover';
                    img.style.margin = '5px';
                    img.style.borderRadius = '4px';
                    previewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        }
    });
    document.getElementById('saveSampleImagesBtn').addEventListener('click', addSampleImages); // 修改为复数

    document.getElementById('exportDataBtn').addEventListener('click', exportData); // 更改为 exportDataBtn

    // === 新增画师串生成器功能监听器 ===
    const artistChainToggle = document.getElementById('artistChainToggle');
    artistChainToggle.addEventListener('change', () => {
        artistChainEnabled = artistChainToggle.checked;
        updateArtistChainPanelState();
    });

    document.getElementById('copyArtistChainBtn').addEventListener('click', copyArtistChain);
    document.getElementById('saveArtistChainBtn').addEventListener('click', saveArtistChainAsNewArtist);
}

// 更新画师串生成面板的启用/禁用状态
function updateArtistChainPanelState() {
    const artistChainPanel = document.getElementById('artistChainPanel');
    const artistChainInput = document.getElementById('artistChainInput');
    const copyArtistChainBtn = document.getElementById('copyArtistChainBtn');
    const saveArtistChainBtn = document.getElementById('saveArtistChainBtn');

    if (artistChainEnabled) {
        artistChainPanel.classList.remove('disabled');
        artistChainPanel.classList.add('expanded'); // 添加 expanded 类
        // 移除 disabled 属性（对于 enabled 状态）
        artistChainInput.removeAttribute('disabled');
        copyArtistChainBtn.removeAttribute('disabled');
        saveArtistChainBtn.removeAttribute('disabled');
    } else {
        artistChainPanel.classList.add('disabled');
        artistChainPanel.classList.remove('expanded'); // 移除 expanded 类
        // 添加 disabled 属性
        artistChainInput.setAttribute('disabled', 'true');
        copyArtistChainBtn.setAttribute('disabled', 'true');
        saveArtistChainBtn.setAttribute('disabled', 'true');
        artistChainInput.value = ''; // 清空输入框内容
    }
}

// 复制画师串到剪贴板
function copyArtistChain() {
    const artistChainInput = document.getElementById('artistChainInput');
    if (artistChainEnabled && artistChainInput) {
        artistChainInput.select();
        document.execCommand('copy'); // 旧方法，但兼容性好
        // navigator.clipboard.writeText(artistChainInput.value) // 新方法，需要HTTPS或localhost
        //     .then(() => {
                alert('画师串已复制到剪贴板！');
        //     })
        //     .catch(err => {
        //         console.error('复制失败:', err);
        //         alert('复制失败，请手动复制。');
        //     });
    } else if (!artistChainEnabled) {
        alert('请先启用画师串组合功能！');
    }
}

// 将画师串保存为新画师
function saveArtistChainAsNewArtist() {
    if (!artistChainEnabled) {
        alert('请先启用画师串组合功能！');
        return;
    }

    const artistChainInput = document.getElementById('artistChainInput');
    const chainContent = artistChainInput.value.trim();

    // 弹出添加新画师模态框
    document.getElementById('addArtistModal').style.display = 'flex';

    // 自动填写触发词
    document.getElementById('newTriggerWords').value = chainContent;

    // 清空其他非自动填充的必填项
    document.getElementById('newArtistName').value = '';
    document.getElementById('newPreviewImage').value = '';
    document.getElementById('newPreviewImageDisplay').src = '/images/placeholder-artist.png';
    document.getElementById('newTags').value = '';
    document.getElementById('newStyleDescription').value = '';

    // --- 新增逻辑：根据画师串内容匹配现有画师并提取ID和训练量 ---
    // 将画师串内容分割成单独的触发词，并转换为小写，过滤空字符串
    const chainWords = chainContent.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    
    let matchedArtistIds = new Set();
    let matchedTrainingCounts = new Set();

    artistsData.forEach(artist => {
        if (artist.triggerWords && artist.triggerWords.length > 0) {
            // 检查当前画师的任意一个触发词是否包含在画师串的任何一个词中 (不区分大小写)
            const artistHasMatchingTriggerWord = artist.triggerWords.some(artistWord => 
                chainWords.includes(artistWord.toLowerCase())
            );

            if (artistHasMatchingTriggerWord) {
                // 如果匹配，将该画师的ID和训练量添加到集合中
                if (artist.artistId && Array.isArray(artist.artistId)) {
                    artist.artistId.forEach(id => matchedArtistIds.add(id));
                }
                if (artist.trainingCount && Array.isArray(artist.trainingCount)) {
                    artist.trainingCount.forEach(count => matchedTrainingCounts.add(count));
                }
            }
        }
    });

    // 填充到新画师表单中，用逗号分隔
    document.getElementById('newArtistId').value = Array.from(matchedArtistIds).join(', ');
    document.getElementById('newTrainingCount').value = Array.from(matchedTrainingCounts).join(', ');

    alert('画师串已填充到新画师表单，请填写其他信息并保存！');
}

// 统一过滤和渲染的函数
function filterAndRender() {
    let filteredArtists = [...artistsData];

    if (currentSearchTerm) {
        filteredArtists = filteredArtists.filter(artist =>
            artist.name.toLowerCase().includes(currentSearchTerm) ||
            // 搜索画师ID (支持多ID搜索)
            (artist.artistId && artist.artistId.some(id => id.toLowerCase().includes(currentSearchTerm))) ||
            (artist.styleDescription && artist.styleDescription.toLowerCase().includes(currentSearchTerm)) ||
            (artist.triggerWords && artist.triggerWords.some(word => word.toLowerCase().includes(currentSearchTerm))) ||
            (artist.tags && artist.tags.some(tag => tag.toLowerCase().includes(currentSearchTerm)))
        );
    }

    const sortedArtists = filteredArtists.sort((a, b) => {
        if (sortBy === 'count') {
            // 对多个 trainingCount 进行求和或取第一个值进行排序
            const countA = Array.isArray(a.trainingCount) ? a.trainingCount.reduce((sum, c) => sum + (parseInt(c) || 0), 0) : (parseInt(a.trainingCount) || 0);
            const countB = Array.isArray(b.trainingCount) ? b.trainingCount.reduce((sum, c) => sum + (parseInt(c) || 0), 0) : (parseInt(b.trainingCount) || 0);
            return countB - countA;
        }
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'date') return new Date(b.createTime) - new Date(a.createTime);
        return 0;
    });

    renderArtistList(sortedArtists);
    renderGallery(sortedArtists);

    // 如果当前选中的画师还在过滤后的列表中，重新加载详情以保持UI同步
    if (currentArtist) {
        const foundArtist = sortedArtists.find(a => a.id === currentArtist.id);
        if (foundArtist) {
            loadArtistDetails(foundArtist);
        } else {
            // 如果当前画师被过滤掉，清空详情面板
            currentArtist = null;
            clearDetailPanel();
        }
    } else {
        clearDetailPanel();
    }
}

function clearDetailPanel() {
    document.getElementById('detailArtistImage').src = '/images/placeholder-artist.png';
    document.getElementById('detailArtistName').textContent = '选择画师查看详情';
    document.getElementById('detailArtistStats').textContent = '点击左侧列表或画廊中的画师查看详情';
    document.getElementById('styleTags').innerHTML = '';
    document.getElementById('sampleImages').innerHTML = '';
    document.getElementById('editArtistName').value = '';
    document.getElementById('artistId').value = '';
    document.getElementById('trainingCount').value = '';
    document.getElementById('editPreviewImage').value = '';
    document.getElementById('currentPreviewImage').src = '/images/placeholder-artist.png';
    document.getElementById('editTags').value = '';
    document.getElementById('triggerWords').value = '';
    document.getElementById('styleDescription').value = '';
    document.getElementById('deleteArtistBtn').style.display = 'none';
}

// 渲染左侧画师列表
function renderArtistList(artists) {
    const artistList = document.getElementById('artistList');
    artistList.innerHTML = '';

    artists.forEach(artist => {
        const artistItem = document.createElement('div');
        artistItem.className = 'artist-item';
        artistItem.dataset.artistId = artist.id; 

        if (currentArtist && currentArtist.id === artist.id) {
            artistItem.classList.add('active');
        }
        
        // 显示训练量时进行求和
        const displayTrainingCount = Array.isArray(artist.trainingCount) 
            ? artist.trainingCount.reduce((sum, c) => sum + (parseInt(c) || 0), 0)
            : (parseInt(artist.trainingCount) || 0);

        artistItem.innerHTML = `
            <div class="artist-name">${artist.name}</div>
            <div class="artist-stats">训练量: ${displayTrainingCount} | 创建: ${artist.createTime}</div>
        `;
        
        artistItem.addEventListener('click', () => selectArtist(artist));
        
        artistList.appendChild(artistItem);
    });
}

// 渲染中间画廊区
function renderGallery(artists) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    artists.forEach(artist => {
        const artistCard = document.createElement('div');
        artistCard.className = 'artist-card';
        
        const displayTrainingCount = Array.isArray(artist.trainingCount) 
            ? artist.trainingCount.reduce((sum, c) => sum + (parseInt(c) || 0), 0)
            : (parseInt(artist.trainingCount) || 0);

        artistCard.innerHTML = `
            <div class="artist-card-image-wrapper">
                <img src="${artist.previewImage || '/images/placeholder-artist.png'}" alt="${artist.name}" class="artist-card-image">
                <div class="zoom-icon"></div> <!-- 将图标内容留空，图标形状由CSS伪元素绘制 -->
            </div>
            <div class="artist-card-info">
                <div class="artist-card-name">${artist.name}</div>
                <div class="artist-card-stats">
                    <span>训练量: ${displayTrainingCount}</span>
                    <span>${artist.createTime}</span>
                </div>
            </div>
        `;
        
        artistCard.addEventListener('click', (e) => {
            if (e.target.classList.contains('zoom-icon')) {
                e.stopPropagation();
                openImageModal(artist.previewImage || '/images/placeholder-artist.png');
            } else {
                // 如果画师串生成器开启，将触发词添加到输入框
                if (artistChainEnabled) {
                    addArtistTriggerWordsToChain(artist);
                }
                // 无论是否开启画师串，都选择画师
                selectArtist(artist);
            }
        });
        
        gallery.appendChild(artistCard);
    });
}

// 将画师的触发词添加到画师串输入框
function addArtistTriggerWordsToChain(artist) {
    const artistChainInput = document.getElementById('artistChainInput');
    if (artistChainInput && artist.triggerWords && artist.triggerWords.length > 0) {
        let currentChain = artistChainInput.value.trim();
        const wordsToAdd = artist.triggerWords.join(', ');
        
        // 分割当前内容为数组，并与新添加的词合并，然后去重
        const existingWords = currentChain.split(',').map(s => s.trim()).filter(Boolean);
        const newWords = wordsToAdd.split(',').map(s => s.trim()).filter(Boolean);

        const combinedWords = [...new Set([...existingWords, ...newWords])]; // 合并并去重
        
        artistChainInput.value = combinedWords.join(', ');
    }
}

// 选中画师
function selectArtist(artist) {
    currentArtist = artist;

    const prevActive = document.querySelector('.artist-item.active');
    if (prevActive) {
        prevActive.classList.remove('active');
    }

    const currentActiveItem = document.querySelector(`.artist-item[data-artist-id="${artist.id}"]`);
    if (currentActiveItem) {
        currentActiveItem.classList.add('active');
    }

    loadArtistDetails(artist);
    document.getElementById('deleteArtistBtn').style.display = 'inline-block';
}

// 加载画师详情到右侧面板
function loadArtistDetails(artist) {
    document.getElementById('detailArtistImage').src = artist.previewImage || '/images/placeholder-artist.png';
    document.getElementById('detailArtistName').textContent = artist.name;

    // 显示训练量时进行求和
    const displayTrainingCount = Array.isArray(artist.trainingCount) 
        ? artist.trainingCount.reduce((sum, c) => sum + (parseInt(c) || 0), 0)
        : (parseInt(artist.trainingCount) || 0);

    document.getElementById('detailArtistStats').textContent = 
        `训练量: ${displayTrainingCount} | 创建时间: ${artist.createTime}`;
    
    const tagsContainer = document.getElementById('styleTags');
    tagsContainer.innerHTML = '';
    (artist.tags || []).forEach(tag => { // 确保 tags 存在
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
    });
    
    const sampleImagesContainer = document.getElementById('sampleImages');
    sampleImagesContainer.innerHTML = '';
    (artist.sampleImages || []).forEach((imageUrl, index) => { // 确保 sampleImages 存在
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'gallery-image';
        imgWrapper.innerHTML = `
            <img src="${imageUrl || '/images/placeholder-sample.png'}" alt="示例图 ${index + 1}">
            <button class="delete-sample-image" data-index="${index}">&times;</button>
        `;
        imgWrapper.querySelector('.delete-sample-image').addEventListener('click', e => {
            e.stopPropagation();
            deleteSampleImage(artist.id, index);
        });
        imgWrapper.addEventListener('click', () => openImageModal(imageUrl || '/images/placeholder-sample.png'));
        sampleImagesContainer.appendChild(imgWrapper);
    });
    
    document.getElementById('editArtistName').value = artist.name;
    // 显示多个画师ID
    document.getElementById('artistId').value = (artist.artistId || []).join(', ');
    // 显示多个训练量
    document.getElementById('trainingCount').value = (artist.trainingCount || []).join(', ');
    document.getElementById('editPreviewImage').value = ''; // 清空文件输入
    document.getElementById('currentPreviewImage').src = artist.previewImage || '/images/placeholder-artist.png';
    document.getElementById('editTags').value = (artist.tags || []).join(', ');
    document.getElementById('triggerWords').value = (artist.triggerWords || []).join(', ');
    document.getElementById('styleDescription').value = artist.styleDescription || '';
}

// 保存对当前画师信息的更改
async function saveArtistChanges() {
    if (!currentArtist) return;

    try {
        const fileInput = document.getElementById('editPreviewImage');
        let newPreviewImagePath = currentArtist.previewImage;

        // 如果有新图片上传，则上传并获取新路径
        if (fileInput.files.length > 0) {
            newPreviewImagePath = await uploadImage(fileInput.files[0], currentArtist.name, 'preview');
            if (!newPreviewImagePath) {
                alert('预览图上传失败！');
                return;
            }
        }
        
        const artistIndex = artistsData.findIndex(a => a.id === currentArtist.id);
        if (artistIndex === -1) {
            alert('画师数据未找到，无法保存。');
            return;
        }

        // 处理多个画师ID和训练量
        const newArtistId = document.getElementById('artistId').value.split(',').map(s => s.trim()).filter(Boolean);
        const newTrainingCount = document.getElementById('trainingCount').value.split(',').map(s => parseInt(s.trim()) || 0).filter(c => !isNaN(c));

        const updatedArtist = {
            ...currentArtist,
            name: document.getElementById('editArtistName').value.trim(),
            artistId: newArtistId, // 保存为数组
            trainingCount: newTrainingCount, // 保存为数组
            previewImage: newPreviewImagePath,
            tags: document.getElementById('editTags').value.split(',').map(s => s.trim()).filter(Boolean),
            triggerWords: document.getElementById('triggerWords').value.split(',').map(s => s.trim()).filter(Boolean),
            styleDescription: document.getElementById('styleDescription').value.trim(),
        };
        
        const result = await saveArtistDataToBackend(updatedArtist);
        if (result) {
            artistsData[artistIndex] = result; // 用后端返回的最新数据更新前端
            currentArtist = result;
            filterAndRender();
            loadArtistDetails(currentArtist);
            alert('更改已保存');
        }
    } catch (error) {
        console.error("保存画师更改失败:", error);
        alert("保存失败，请查看控制台获取更多信息。");
    }
}

// 创建新画师
async function createArtist() {
    const newArtistName = document.getElementById('newArtistName').value.trim();
    // 确保 newArtistId 从输入框获取后是数组
    const newArtistIdInput = document.getElementById('newArtistId').value;
    const newArtistId = newArtistIdInput ? newArtistIdInput.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!newArtistName || newArtistId.length === 0) {
        alert('画师名称和画师ID是必填项！');
        return;
    }

    // --- 修复画师ID重复检测逻辑 (选项 B: 只有当新画师的 artistId 数组与现有画师的 artistId 数组“完全匹配”时才报错) ---
    // 对新的 artistId 数组进行排序和字符串化，以便进行整体比较
    const sortedNewArtistIdString = newArtistId.map(id => id.toLowerCase()).sort().join(',');

    const isDuplicateSet = artistsData.some(artist => {
        if (artist.artistId && Array.isArray(artist.artistId)) {
            const sortedExistingArtistIdString = artist.artistId.map(id => id.toLowerCase()).sort().join(',');
            return sortedExistingArtistIdString === sortedNewArtistIdString;
        }
        return false;
    });

    if (isDuplicateSet) {
        alert('已存在拥有相同画师ID组合的画师，请确保ID组合的唯一性！');
        return;
    }
    // --- 修复结束 ---

    try {
        // 确保 newTrainingCount 从输入框获取后是数组
        const newTrainingCountInput = document.getElementById('newTrainingCount').value;
        const newTrainingCount = newTrainingCountInput ? newTrainingCountInput.split(',').map(s => parseInt(s.trim()) || 0).filter(c => !isNaN(c)) : [0];
        
        const newTags = document.getElementById('newTags').value.split(',').map(s => s.trim()).filter(Boolean);
        const newTriggerWords = document.getElementById('newTriggerWords').value.split(',').map(s => s.trim()).filter(Boolean);
        const newStyleDescription = document.getElementById('newStyleDescription').value.trim();
        const newPreviewImageFile = document.getElementById('newPreviewImage').files[0];

        let previewImagePath = '/images/placeholder-artist.png';
        if (newPreviewImageFile) {
            previewImagePath = await uploadImage(newPreviewImageFile, newArtistName, 'preview');
            if (!previewImagePath) {
                alert('预览图上传失败！');
                return;
            }
        }

        const newArtist = {
            // ID由后端生成
            name: newArtistName,
            artistId: newArtistId, // 保存为数组
            previewImage: previewImagePath,
            trainingCount: newTrainingCount, // 保存为数组
            triggerWords: newTriggerWords,
            styleDescription: newStyleDescription,
            createTime: new Date().toISOString().split('T')[0],
            tags: newTags,
            sampleImages: []
        };

        const response = await fetch(`${API_BASE_URL}/artists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newArtist)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const createdArtist = await response.json();
        artistsData.push(createdArtist); // 添加到前端数据
        filterAndRender();
        selectArtist(createdArtist);
        document.getElementById('addArtistModal').style.display = 'none';
        alert('画师添加成功！');
    } catch(error) {
        console.error("创建画师失败:", error);
        alert("创建画师失败，请查看控制台获取更多信息。");
    }
}

// 删除画师
async function deleteArtist(artistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/artists/${artistId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        artistsData = artistsData.filter(artist => artist.id !== artistId);
        
        currentArtist = null;
        filterAndRender();
        clearDetailPanel(); // 清空详情面板
        alert('画师已删除！');
    } catch (error) {
        console.error("删除画师失败:", error);
        alert("删除画师失败，请检查后端服务器连接！");
    }
}

// 添加示例图片 (支持多选)
async function addSampleImages() {
    if (!currentArtist) return;

    const fileInput = document.getElementById('newSampleImageFiles');
    if (fileInput.files.length === 0) {
        alert('请选择至少一张图片！');
        return;
    }

    try {
        const uploadPromises = Array.from(fileInput.files).map(file => 
            uploadImage(file, currentArtist.name, 'sample')
        );
        const uploadedPaths = await Promise.all(uploadPromises);

        const validPaths = uploadedPaths.filter(Boolean); // 过滤掉上传失败的

        if (validPaths.length === 0) {
            alert('所有示例图上传失败！');
            return;
        }
        
        // 找到当前画师的最新数据
        const artistToUpdate = artistsData.find(a => a.id === currentArtist.id);
        if (artistToUpdate) {
            artistToUpdate.sampleImages = artistToUpdate.sampleImages || [];
            artistToUpdate.sampleImages.push(...validPaths); // 将所有新路径添加到数组

            // 将更新后的画师数据发送到后端保存
            const result = await saveArtistDataToBackend(artistToUpdate);
            if (result) {
                currentArtist = result; // 保持 currentArtist 与主数据同步
                loadArtistDetails(currentArtist); // 重新加载详情面板以显示新图片
                document.getElementById('addSampleImageModal').style.display = 'none';
                alert(`成功添加 ${validPaths.length} 张示例图！`);
            } else {
                alert("保存画师数据失败，示例图未添加。");
            }
        } else {
            alert("错误：找不到当前画师！");
        }
    } catch (error) {
        console.error("添加示例图失败:", error);
        alert("添加示例图失败，请查看控制台获取更多信息。");
    }
}

// 删除示例图片
async function deleteSampleImage(artistId, imageIndex) {
    const artist = artistsData.find(a => a.id === artistId);
    if (artist && confirm(`确定要删除这张示例图吗？`)) {
        if (!artist.sampleImages || imageIndex < 0 || imageIndex >= artist.sampleImages.length) {
            alert('无效的示例图索引。');
            return;
        }

        const imageUrlToDelete = artist.sampleImages[imageIndex];
        
        // 尝试删除后端文件
        try {
            if (imageUrlToDelete && !imageUrlToDelete.includes('placeholder-sample.png')) { // 不删除占位图
                const deleteResponse = await fetch(`${API_BASE_URL}/delete-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: imageUrlToDelete })
                });

                if (!deleteResponse.ok) {
                    // 即使后端文件删除失败，也继续删除数据记录
                    console.warn(`后端图片文件删除失败 (路径: ${imageUrlToDelete}):`, await deleteResponse.text());
                }
            }
        } catch (error) {
            console.error(`删除后端图片文件时发生错误 (路径: ${imageUrlToDelete}):`, error);
        }

        // 删除数据记录
        artist.sampleImages.splice(imageIndex, 1);
        const result = await saveArtistDataToBackend(artist);
        if (result) {
            currentArtist = result; // 更新 currentArtist
            loadArtistDetails(result);
            alert('示例图已删除！');
        } else {
            alert('删除示例图失败，数据未更新。');
        }
    }
}

// 打开图片放大预览模态框
function openImageModal(imageUrl) {
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageUrl;
    
    // 重置图片样式，以便正确计算尺寸
    modalImage.style.maxWidth = 'initial';
    modalImage.style.maxHeight = 'initial';
    modalImage.style.width = 'auto';
    modalImage.style.height = 'auto';
    modalImage.style.transform = 'translate(-50%, -50%) scale(1)';
    modalImage.style.left = '50%';
    modalImage.style.top = '50%';

    const imageModal = document.getElementById('imageModal');
    imageModal.style.display = 'flex';

    // 绑定拖动和缩放事件
    setupImageDragAndZoom(modalImage, imageModal);
}

// 设置图片拖动和缩放
function setupImageDragAndZoom(imageElement, modalElement) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let scale = 1;
    const minScale = 0.1;
    const maxScale = 5;

    imageElement.style.position = 'absolute';
    imageElement.style.transformOrigin = '0 0'; // 缩放围绕左上角
    
    // 重置位置和缩放
    imageElement.style.left = '50%';
    imageElement.style.top = '50%';
    imageElement.style.transform = `translate(-50%, -50%) scale(${scale})`;

    const onMouseDown = (e) => {
        if (e.button === 0) { // 左键
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // 获取当前的 left 和 top 值，如果为百分比，需要计算为像素
            const rect = imageElement.getBoundingClientRect();
            const modalRect = modalElement.getBoundingClientRect();
            startLeft = rect.left - modalRect.left;
            startTop = rect.top - modalRect.top;

            imageElement.style.cursor = 'grabbing';
            e.preventDefault();
        }
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        imageElement.style.left = `${startLeft + dx}px`;
        imageElement.style.top = `${startTop + dy}px`;
    };

    const onMouseUp = () => {
        isDragging = false;
        imageElement.style.cursor = 'grab';
    };

    const onWheel = (e) => {
        e.preventDefault();
        const scaleAmount = 0.1;
        const oldScale = scale;

        if (e.deltaY < 0) {
            scale += scaleAmount; // 放大
        } else {
            scale -= scaleAmount; // 缩小
        }

        scale = Math.max(minScale, Math.min(maxScale, scale)); // 限制缩放范围

        // 计算缩放中心点 (鼠标位置)
        const rect = imageElement.getBoundingClientRect();
        const modalRect = modalElement.getBoundingClientRect();
        const mouseX = e.clientX - modalRect.left;
        const mouseY = e.clientY - modalRect.top;

        // 计算相对于图片左上角的鼠标位置
        const imgX = mouseX - (rect.left - modalRect.left);
        const imgY = mouseY - (rect.top - modalRect.top);

        // 计算新的 left/top 以保持缩放中心不变
        const newLeft = parseFloat(imageElement.style.left) - imgX * (scale / oldScale - 1);
        const newTop = parseFloat(imageElement.style.top) - imgY * (scale / oldScale - 1);

        imageElement.style.left = `${newLeft}px`;
        imageElement.style.top = `${newTop}px`;
        imageElement.style.transform = `scale(${scale})`;
    };

    // 清除旧的事件监听器，避免重复绑定
    modalElement.removeEventListener('mousedown', modalElement._onMouseDown);
    modalElement.removeEventListener('mousemove', modalElement._onMouseMove);
    modalElement.removeEventListener('mouseup', modalElement._onMouseUp);
    modalElement.removeEventListener('mouseleave', modalElement._onMouseUp);
    modalElement.removeEventListener('wheel', modalElement._onWheel);

    // 绑定新的事件监听器
    modalElement._onMouseDown = onMouseDown;
    modalElement._onMouseMove = onMouseMove;
    modalElement._onMouseUp = onMouseUp;
    modalElement._onWheel = onWheel;

    imageElement.addEventListener('mousedown', modalElement._onMouseDown);
    modalElement.addEventListener('mousemove', modalElement._onMouseMove);
    modalElement.addEventListener('mouseup', modalElement._onMouseUp);
    modalElement.addEventListener('mouseleave', modalElement._onMouseUp); // 鼠标离开模态框也停止拖动
    modalElement.addEventListener('wheel', modalElement._onWheel, { passive: false }); // passive: false 允许 preventDefault
    
    imageElement.style.cursor = 'grab'; // 默认手型
}

// 预览图片到指定的 img 标签
function previewImage(inputElement, imgElementId) {
    const imgElement = document.getElementById(imgElementId);
    if (inputElement.files && inputElement.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(inputElement.files[0]);
    }
}

// 上传图片到后端并返回图片路径
async function uploadImage(file, artistName, type) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('artistName', artistName); // 传递画师名称
    formData.append('imageType', type); // 传递图片类型 (preview 或 sample)

    try {
        const response = await fetch(`${API_BASE_URL}/upload-image`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`图片上传失败: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.filePath; // 返回服务器上的图片路径
    } catch (error) {
        console.error("上传图片失败:", error);
        alert("图片上传失败！请检查图片格式和大小。");
        return null;
    }
}

// 导出数据功能 (从后端获取最新数据并提供下载)
async function exportData() {
    try {
        const response = await fetch(`${API_BASE_URL}/export-artists`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.length === 0) {
            alert('没有数据可以导出。');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "danbooru_artists_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        alert('数据已导出为 danbooru_artists_data.json');
    } catch (error) {
        console.error("导出数据失败:", error);
        alert("导出数据失败，请检查后端服务器连接！");
    }
}