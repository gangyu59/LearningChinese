async function loadJSON(path) {
    try {
        // console.log(`Loading JSON from: ${path}`); // 检查路径
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        alert("无法加载数据，请检查路径或文件内容。");
    }
}