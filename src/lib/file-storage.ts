export interface StoredFile {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'code' | 'audio' | 'video' | 'archive' | 'file'
  size: number
  path: string
  parentId: string | null
  encrypted: boolean
  createdAt: Date
  updatedAt: Date
}

const DB_NAME = 'nova-file-storage'
const DB_VERSION = 1
const FILES_STORE = 'files'
const BLOBS_STORE = 'blobs'

class FileStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const store = db.createObjectStore(FILES_STORE, { keyPath: 'id' })
          store.createIndex('parentId', 'parentId', { unique: false })
          store.createIndex('name', 'name', { unique: false })
        }
        if (!db.objectStoreNames.contains(BLOBS_STORE)) {
          db.createObjectStore(BLOBS_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = async () => {
        this.db = request.result
        await this.ensureDefaultFolders()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  private async ensureDefaultFolders(): Promise<void> {
    const existing = await this.getFiles(null)
    if (existing.length > 0) return

    const now = new Date()
    const folders: StoredFile[] = [
      { id: 'folder-docs', name: 'Documents', type: 'folder', size: 0, path: '/Documents', parentId: null, encrypted: false, createdAt: now, updatedAt: now },
      { id: 'folder-projects', name: 'Projects', type: 'folder', size: 0, path: '/Projects', parentId: null, encrypted: false, createdAt: now, updatedAt: now },
      { id: 'folder-media', name: 'Media', type: 'folder', size: 0, path: '/Media', parentId: null, encrypted: false, createdAt: now, updatedAt: now },
      { id: 'folder-archives', name: 'Archives', type: 'folder', size: 0, path: '/Archives', parentId: null, encrypted: false, createdAt: now, updatedAt: now },
    ]

    for (const folder of folders) {
      await this.saveFile(folder)
    }

    // Add some starter files in Documents
    const starterFiles: StoredFile[] = [
      { id: 'file-readme', name: 'README.md', type: 'document', size: 3200, path: '/Documents/README.md', parentId: 'folder-docs', encrypted: false, createdAt: now, updatedAt: now },
      { id: 'file-config', name: 'config.json', type: 'code', size: 512, path: '/config.json', parentId: null, encrypted: false, createdAt: now, updatedAt: now },
    ]

    for (const file of starterFiles) {
      await this.saveFile(file)
      const content = file.name === 'README.md'
        ? '# Welcome to NOVA\n\nThis is your personal file storage. Upload files, create folders, and organize your workspace.'
        : '{\n  "version": "3.2.0",\n  "theme": "midnight-gold"\n}'
      await this.saveFileContent(file.id, new Blob([content], { type: 'text/plain' }))
    }
  }

  async saveFile(file: StoredFile): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readwrite')
      tx.objectStore(FILES_STORE).put(file)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async saveFileContent(id: string, blob: Blob): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOBS_STORE, 'readwrite')
      tx.objectStore(BLOBS_STORE).put({ id, blob })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getFiles(parentId: string | null): Promise<StoredFile[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly')
      const store = tx.objectStore(FILES_STORE)
      const index = store.index('parentId')
      const request = index.getAll(parentId)
      request.onsuccess = () => resolve(request.result as StoredFile[])
      request.onerror = () => reject(request.error)
    })
  }

  async getAllFiles(): Promise<StoredFile[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly')
      const request = tx.objectStore(FILES_STORE).getAll()
      request.onsuccess = () => resolve(request.result as StoredFile[])
      request.onerror = () => reject(request.error)
    })
  }

  async getFile(id: string): Promise<StoredFile | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(FILES_STORE, 'readonly')
      const request = tx.objectStore(FILES_STORE).get(id)
      request.onsuccess = () => resolve(request.result as StoredFile || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getFileContent(id: string): Promise<Blob | null> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(BLOBS_STORE, 'readonly')
      const request = tx.objectStore(BLOBS_STORE).get(id)
      request.onsuccess = () => {
        const result = request.result as { id: string; blob: Blob } | undefined
        resolve(result?.blob || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteFile(id: string): Promise<void> {
    await this.init()
    // Also delete children if it's a folder
    const file = await this.getFile(id)
    if (file && file.type === 'folder') {
      const children = await this.getFiles(id)
      for (const child of children) {
        await this.deleteFile(child.id)
      }
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([FILES_STORE, BLOBS_STORE], 'readwrite')
      tx.objectStore(FILES_STORE).delete(id)
      tx.objectStore(BLOBS_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async renameFile(id: string, newName: string): Promise<void> {
    const file = await this.getFile(id)
    if (!file) return
    file.name = newName
    file.updatedAt = new Date()
    await this.saveFile(file)
  }

  async encryptFile(id: string, _password: string): Promise<void> {
    const file = await this.getFile(id)
    if (!file) return
    file.encrypted = true
    file.updatedAt = new Date()
    await this.saveFile(file)
  }

  async decryptFile(id: string, _password: string): Promise<void> {
    const file = await this.getFile(id)
    if (!file) return
    file.encrypted = false
    file.updatedAt = new Date()
    await this.saveFile(file)
  }

  async getStorageUsage(): Promise<{ used: number; total: number }> {
    const files = await this.getAllFiles()
    const used = files.reduce((acc, f) => acc + f.size, 0)
    return { used, total: 50 * 1024 * 1024 * 1024 } // 50GB virtual total
  }

  async searchFiles(query: string): Promise<StoredFile[]> {
    const files = await this.getAllFiles()
    const lower = query.toLowerCase()
    return files.filter(f => f.name.toLowerCase().includes(lower))
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '--'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  getFileType(fileName: string): StoredFile['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const typeMap: Record<string, StoredFile['type']> = {
      pdf: 'document', doc: 'document', docx: 'document', txt: 'document', md: 'document', rtf: 'document',
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image', bmp: 'image',
      js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', rs: 'code', go: 'code', json: 'code', css: 'code', html: 'code',
      mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
      mp4: 'video', avi: 'video', mov: 'video', mkv: 'video', webm: 'video',
      zip: 'archive', tar: 'archive', gz: 'archive', rar: 'archive', '7z': 'archive',
    }
    return typeMap[ext] || 'file'
  }

  generateId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

export const fileStorage = new FileStorage()
