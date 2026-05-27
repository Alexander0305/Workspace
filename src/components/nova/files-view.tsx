'use client'

import { motion } from 'framer-motion'
import {
  Folder, FileText, Image, Code, File, Music, Video, Archive,
  Lock, Upload, Grid, List, ChevronRight, MoreVertical, Plus,
  HardDrive, Download, X
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { fileStorage, type StoredFile } from '@/lib/file-storage'

const FILE_ICONS: Record<string, React.ElementType> = {
  folder: Folder,
  document: FileText,
  image: Image,
  code: Code,
  audio: Music,
  video: Video,
  archive: Archive,
  file: File,
}

const FILE_COLORS: Record<string, string> = {
  folder: 'text-nova-gold',
  document: 'text-blue-400',
  image: 'text-pink-400',
  code: 'text-emerald-400',
  audio: 'text-purple-400',
  video: 'text-red-400',
  archive: 'text-yellow-400',
  file: 'text-muted-foreground',
}

export function FilesView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [path, setPath] = useState<string[]>(['Root'])
  const [currentFiles, setCurrentFiles] = useState<StoredFile[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: StoredFile } | null>(null)
  const [storageUsage, setStorageUsage] = useState<{ used: number; total: number }>({ used: 0, total: 50 * 1024 * 1024 * 1024 })
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Rename dialog
  const [renameFileId, setRenameFileId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')

  // Encrypt dialog
  const [encryptFileId, setEncryptFileId] = useState<string | null>(null)
  const [encryptPassword, setEncryptPassword] = useState('')

  // New folder dialog
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  function getCurrentParentId(): string | null {
    if (path.length <= 1) return null
    return null // Using folderStack approach instead
  }

  const currentParentId = path.length <= 1 ? null : path[path.length - 1]

  const loadFiles = useCallback(async () => {
    const parentId = getCurrentParentId()
    const files = await fileStorage.getFiles(parentId)
    setCurrentFiles(files)

    // Update storage usage
    const usage = await fileStorage.getStorageUsage()
    setStorageUsage(usage)
  }, [path])

  // Track current folder by ID
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderStack, setFolderStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: 'Root' }])

  const loadFilesForFolder = useCallback(async (parentId: string | null) => {
    const files = await fileStorage.getFiles(parentId)
    setCurrentFiles(files)
    setCurrentFolderId(parentId)
    const usage = await fileStorage.getStorageUsage()
    setStorageUsage(usage)
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => { if (mounted) await loadFilesForFolder(currentFolderId) }
    load()
    return () => { mounted = false }
  }, [currentFolderId, loadFilesForFolder])

  const navigateToFolder = (file: StoredFile) => {
    if (file.type === 'folder') {
      setFolderStack(prev => [...prev, { id: file.id, name: file.name }])
      setCurrentFolderId(file.id)
    }
  }

  const navigateUp = () => {
    if (folderStack.length > 1) {
      const newStack = folderStack.slice(0, -1)
      setFolderStack(newStack)
      setCurrentFolderId(newStack[newStack.length - 1].id)
    }
  }

  const navigateToIndex = (index: number) => {
    const newStack = folderStack.slice(0, index + 1)
    setFolderStack(newStack)
    setCurrentFolderId(newStack[newStack.length - 1].id)
  }

  const handleContextMenu = (e: React.MouseEvent, file: StoredFile) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }

  const closeContextMenu = () => setContextMenu(null)

  // Upload files
  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadProgress(0)
    const total = files.length
    let uploaded = 0

    for (const file of files) {
      const fileType = fileStorage.getFileType(file.name)
      const storedFile: StoredFile = {
        id: fileStorage.generateId(),
        name: file.name,
        type: fileType,
        size: file.size,
        path: `${folderStack.map(f => f.name).join('/')}/${file.name}`,
        parentId: currentFolderId,
        encrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await fileStorage.saveFile(storedFile)
      await fileStorage.saveFileContent(storedFile.id, file)
      uploaded++
      setUploadProgress(Math.round((uploaded / total) * 100))
    }

    setUploadProgress(null)
    e.target.value = ''
    loadFilesForFolder(currentFolderId)
  }

  // Context menu actions
  const handleOpen = async (file: StoredFile) => {
    if (file.type === 'folder') {
      navigateToFolder(file)
    } else {
      // Download the file
      const content = await fileStorage.getFileContent(file.id)
      if (content) {
        const url = URL.createObjectURL(content)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    }
    closeContextMenu()
  }

  const handleRename = () => {
    if (renameFileId && renameName.trim()) {
      fileStorage.renameFile(renameFileId, renameName.trim()).then(() => {
        loadFilesForFolder(currentFolderId)
      })
    }
    setRenameFileId(null)
    setRenameName('')
  }

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      await fileStorage.deleteFile(id)
      setDeleteConfirmId(null)
      loadFilesForFolder(currentFolderId)
    } else {
      setDeleteConfirmId(id)
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  const handleEncrypt = async () => {
    if (encryptFileId && encryptPassword) {
      await fileStorage.encryptFile(encryptFileId, encryptPassword)
      loadFilesForFolder(currentFolderId)
    }
    setEncryptFileId(null)
    setEncryptPassword('')
  }

  const handleShare = async (file: StoredFile) => {
    const info = `File: ${file.name}\nSize: ${fileStorage.formatSize(file.size)}\nType: ${file.type}\nPath: ${file.path}`
    try {
      await navigator.clipboard.writeText(info)
    } catch {
      // Fallback: do nothing
    }
    closeContextMenu()
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    const folder: StoredFile = {
      id: fileStorage.generateId(),
      name: newFolderName.trim(),
      type: 'folder',
      size: 0,
      path: `${folderStack.map(f => f.name).join('/')}/${newFolderName.trim()}`,
      parentId: currentFolderId,
      encrypted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await fileStorage.saveFile(folder)
    setNewFolderName('')
    setShowNewFolder(false)
    loadFilesForFolder(currentFolderId)
  }

  // Get encrypted files
  const encryptedFiles = currentFiles.filter(f => f.encrypted)

  const storagePercent = storageUsage.total > 0 ? (storageUsage.used / storageUsage.total) * 100 : 0

  return (
    <div className="flex flex-col h-full p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          {folderStack.map((p, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <button
                onClick={() => navigateToIndex(i)}
                className={`hover:text-nova-gold transition-colors ${i === folderStack.length - 1 ? 'text-nova-gold font-medium' : 'text-muted-foreground'}`}
              >
                {p.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Folder
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </motion.button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileInput} className="hidden" />
          <div className="flex items-center bg-secondary/30 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-l-lg ${viewMode === 'grid' ? 'bg-nova-gold/10 text-nova-gold' : 'text-muted-foreground'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-r-lg ${viewMode === 'list' ? 'bg-nova-gold/10 text-nova-gold' : 'text-muted-foreground'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-foreground">Uploading...</span>
            <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
            <motion.div
              animate={{ width: `${uploadProgress}%` }}
              className="h-full rounded-full progress-gold"
            />
          </div>
        </div>
      )}

      {/* Drag and drop area + file list */}
      <div className="flex-1 glass-card p-4 overflow-y-auto">
        {/* Secure Files Section */}
        {encryptedFiles.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-nova-gold" />
              <h3 className="text-sm font-semibold text-foreground">Secure Files</h3>
              <span className="text-[10px] text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">AES-256</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {encryptedFiles.map(file => {
                const Icon = FILE_ICONS[file.type]
                return (
                  <motion.div
                    key={file.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className="glass-card p-3 flex items-center gap-3 cursor-pointer border-nova-gold/20"
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 ${FILE_COLORS[file.type]}`} />
                      <Lock className="w-2.5 h-2.5 text-nova-gold absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fileStorage.formatSize(file.size)}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent mb-4" />
          </div>
        )}

        {/* All files */}
        {viewMode === 'list' ? (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr,80px,100px,40px] gap-2 px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Name</span>
              <span>Size</span>
              <span>Modified</span>
              <span />
            </div>
            {currentFiles.map(file => {
              const Icon = FILE_ICONS[file.type]
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ x: 2, backgroundColor: 'rgba(212,165,116,0.05)' }}
                  onClick={() => file.type === 'folder' ? navigateToFolder(file) : handleOpen(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="grid grid-cols-[1fr,80px,100px,40px] gap-2 items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors file-tree-item"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${FILE_COLORS[file.type]}`} />
                    <span className="text-sm text-foreground truncate">{file.name}</span>
                    {file.encrypted && <Lock className="w-3 h-3 text-nova-gold flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{fileStorage.formatSize(file.size)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(file.updatedAt).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, file) }} className="p-1 rounded hover:bg-secondary/30 text-muted-foreground">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
            {currentFiles.length === 0 && (
              <div className="text-center py-8">
                <Folder className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">This folder is empty</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentFiles.map(file => {
              const Icon = FILE_ICONS[file.type]
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ scale: 1.03, y: -3 }}
                  onClick={() => file.type === 'folder' ? navigateToFolder(file) : handleOpen(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="glass-card p-4 flex flex-col items-center gap-2 cursor-pointer text-center"
                >
                  <div className="relative">
                    <Icon className={`w-8 h-8 ${FILE_COLORS[file.type]}`} />
                    {file.encrypted && <Lock className="w-3 h-3 text-nova-gold absolute -bottom-0.5 -right-0.5" />}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate w-full">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fileStorage.formatSize(file.size)}</p>
                </motion.div>
              )
            })}
            {currentFiles.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Folder className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">This folder is empty</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage bar */}
      <div className="mt-4 glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-nova-gold" />
            <span className="text-xs font-medium text-foreground">Storage</span>
          </div>
          <span className="text-xs text-muted-foreground">{fileStorage.formatSize(storageUsage.used)} / {fileStorage.formatSize(storageUsage.total)}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(storagePercent, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full progress-gold"
          />
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-50 glass-card p-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { label: 'Open', action: () => handleOpen(contextMenu.file), icon: Download },
              { label: 'Rename', action: () => { setRenameFileId(contextMenu.file.id); setRenameName(contextMenu.file.name); closeContextMenu() } },
              { label: 'Encrypt', action: () => { setEncryptFileId(contextMenu.file.id); closeContextMenu() }, hide: contextMenu.file.encrypted },
              { label: 'Decrypt', action: () => { fileStorage.decryptFile(contextMenu.file.id, ''); closeContextMenu(); loadFilesForFolder(currentFolderId) }, hide: !contextMenu.file.encrypted },
              { label: 'Share', action: () => handleShare(contextMenu.file) },
              { label: 'Delete', action: () => { handleDelete(contextMenu.file.id); closeContextMenu() }, destructive: true },
            ].filter(item => !item.hide).map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                  item.destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-secondary/30'
                }`}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        </>
      )}

      {/* Rename dialog */}
      {renameFileId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setRenameFileId(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Rename File</h3>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameFileId(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleRename} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Rename</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Encrypt dialog */}
      {encryptFileId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setEncryptFileId(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-nova-gold" />
              Encrypt File
            </h3>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEncrypt()}
              placeholder="Enter encryption password..."
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEncryptFileId(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleEncrypt} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Encrypt</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* New folder dialog */}
      {showNewFolder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowNewFolder(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">New Folder</h3>
              <button onClick={() => setShowNewFolder(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
              placeholder="Folder name..."
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNewFolder} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Create</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete confirm inline */}
      {deleteConfirmId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass-card p-4 flex items-center gap-4"
        >
          <span className="text-sm text-foreground">Delete this file?</span>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { handleDelete(deleteConfirmId); closeContextMenu() }} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">
            Confirm Delete
          </motion.button>
          <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </motion.div>
      )}
    </div>
  )
}
