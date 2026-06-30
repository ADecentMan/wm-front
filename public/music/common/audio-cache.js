window.AudioCache = class AudioCache {
    constructor(dbName = 'MusicAudioCache', storeName = 'audioCache', maxSize = 500) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.maxSize = maxSize * 1024 * 1024;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'musicId' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };

            request.onerror = (e) => {
                console.error('IndexedDB打开失败:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async get(musicId) {
        if (!this.db) return null;
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.get(musicId);

            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    record.accessTime = Date.now();
                    store.put(record);
                    resolve(record);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => resolve(null);
        });
    }

    async set(musicId, blob) {
        if (!this.db) return;
        try {
            await this.evictIfNeeded(blob.size);
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.put({
                    musicId,
                    blob,
                    size: blob.size,
                    accessTime: Date.now()
                });

                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(e.target.error);
            });
        } catch (error) {
            console.error('缓存写入失败:', error);
        }
    }

    async delete(musicId) {
        if (!this.db) return;
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.delete(musicId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }

    async clear() {
        if (!this.db) return;
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }

    async getCacheSize() {
        if (!this.db) return 0;
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.openCursor();
            let totalSize = 0;

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    totalSize += cursor.value.size || 0;
                    cursor.continue();
                } else {
                    resolve(totalSize);
                }
            };

            request.onerror = () => resolve(0);
        });
    }

    async evictIfNeeded(newSize) {
        const currentSize = await this.getCacheSize();
        if (currentSize + newSize <= this.maxSize) return;

        const records = await this.getAllRecords();
        records.sort((a, b) => a.accessTime - b.accessTime);

        let freedSize = 0;
        const target = currentSize + newSize - this.maxSize;

        for (const record of records) {
            if (freedSize >= target) break;
            await this.delete(record.musicId);
            freedSize += record.size || 0;
        }
    }

    async getAllRecords() {
        if (!this.db) return [];
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}