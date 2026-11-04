import React, { useRef } from 'react'
import './InputBar.css'

const InputBar = ({ value, onChange, onSend, disabled, files, onFilesChange, onRemoveFile, isUploading }) => {
  const fileInputRef = useRef(null)

  const hasFiles = files && files.length > 0
  const isSendDisabled = disabled || isUploading || !value.trim()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isSendDisabled) {
        onSend()
      }
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0 && onFilesChange) {
      onFilesChange(selectedFiles)
    }
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="input-container">
      {/* File Preview Area */}
      {hasFiles && (
        <div className="file-preview-area">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className={`file-preview-chip ${file.status || ''}`}>
              <div className="file-chip-icon">
                <i className="ri-file-pdf-2-line"></i>
              </div>
              <div className="file-chip-info">
                <span className="file-chip-name" title={file.name}>
                  {file.name.length > 25 ? file.name.slice(0, 22) + '...' : file.name}
                </span>
                <span className="file-chip-meta">
                  {file.status === 'uploading' && 'Uploading...'}
                  {file.status === 'processing' && 'Processing...'}
                  {file.status === 'ready' && 'Ready'}
                  {file.status === 'error' && 'Failed'}
                  {!file.status && formatFileSize(file.size)}
                </span>
              </div>
              {file.status === 'uploading' || file.status === 'processing' ? (
                <div className="file-chip-spinner"></div>
              ) : (
                <button
                  className="file-chip-remove"
                  onClick={() => onRemoveFile(index)}
                  title="Remove file"
                  type="button"
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="input-wrapper">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileSelect}
          className="file-input-hidden"
        />

        {/* Attach button */}
        <button
          className="attach-btn"
          onClick={handleAttachClick}
          disabled={disabled || isUploading}
          title="Attach PDF document"
          type="button"
        >
          <i className="ri-attachment-2"></i>
        </button>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasFiles ? "Ask a question about your document(s)..." : "Message SynapseAI..."}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={isSendDisabled}
          title={!value.trim() && hasFiles ? "Please enter a message to send with your file" : "Send message"}
        >
          <i className="ri-arrow-up-line"></i>
        </button>
      </div>
      <p className="input-disclaimer">SynapseAI can make mistakes. Check important info.</p>
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default InputBar
