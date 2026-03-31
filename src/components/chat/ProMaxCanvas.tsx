import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Code2, Eye, Pencil, FileCode2, Loader2 } from 'lucide-react';

interface ProMaxCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
  filename: string;
  title: string;
  isStreaming: boolean;
  onCodeChange?: (code: string) => void;
}

type Tab = 'code' | 'preview' | 'edit';

export function ProMaxCanvas({
  isOpen,
  onClose,
  code,
  language,
  filename,
  title,
  isStreaming,
  onCodeChange
}: ProMaxCanvasProps) {
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [copied, setCopied] = useState(false);
  const [editValue, setEditValue] = useState(code);
  const codeEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevStreamingRef = useRef(isStreaming);

  // Auto-scroll code view during streaming
  useEffect(() => {
    if (isStreaming && codeEndRef.current) {
      codeEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [code, isStreaming]);

  // Auto-switch to preview when streaming completes
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && code) {
      const isPreviewable = ['html', 'htm', 'svg'].includes(language);
      if (isPreviewable) {
        // Small delay to let the final render settle
        setTimeout(() => setActiveTab('preview'), 300);
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, code, language]);

  // Sync editValue when code changes externally (not during editing)
  useEffect(() => {
    if (activeTab !== 'edit') {
      setEditValue(code);
    }
  }, [code, activeTab]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  const handleEditSave = useCallback(() => {
    if (onCodeChange) {
      onCodeChange(editValue);
    }
    setActiveTab('code');
  }, [editValue, onCodeChange]);

  const isPreviewable = ['html', 'htm', 'svg'].includes(language);

  // Split code into lines for line numbers
  const codeLines = useMemo(() => code.split('\n'), [code]);

  const glassStyle: React.CSSProperties = {
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.5)',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)',
    border: `1px solid ${isActive ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
    color: isActive ? 'rgb(6, 182, 212)' : 'rgba(255, 255, 255, 0.5)',
    transition: 'all 0.2s ease',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />

          {/* Canvas sidebar */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-[520px] lg:w-[55%] xl:w-[50%] flex flex-col"
            style={glassStyle}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                {/* File badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
                  style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                  }}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300">{filename}</span>
                </div>

                {/* Title */}
                {title && (
                  <span className="text-xs text-white/30 truncate">{title}</span>
                )}

                {/* Streaming indicator */}
                {isStreaming && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span className="text-xs text-cyan-400/70">Writing...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Tab switcher */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg"
                  style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                  <button
                    onClick={() => setActiveTab('code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={tabStyle(activeTab === 'code')}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Code
                  </button>
                  {isPreviewable && (
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                      style={tabStyle(activeTab === 'preview')}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditValue(code);
                      setActiveTab('edit');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={tabStyle(activeTab === 'edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>

                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                  )}
                </button>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-105 hover:bg-white/10"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {/* Code Tab */}
              {activeTab === 'code' && (
                <div className="h-full overflow-auto custom-scrollbar">
                  <div className="flex min-h-full">
                    {/* Line numbers */}
                    <div className="sticky left-0 z-10 flex flex-col pt-4 pb-4 pl-4 pr-3 select-none text-right border-r border-white/[0.04]"
                      style={{ background: 'rgba(10, 10, 15, 0.95)' }}
                    >
                      {codeLines.map((_, i) => (
                        <span key={i} className="text-xs font-mono leading-6 text-white/15">
                          {i + 1}
                        </span>
                      ))}
                    </div>

                    {/* Code content */}
                    <pre className="flex-1 p-4 overflow-x-auto">
                      <code className="text-sm font-mono leading-6 text-white/80 whitespace-pre">
                        {code}
                      </code>
                      <div ref={codeEndRef} />
                    </pre>
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="h-full p-3">
                  <div className="h-full rounded-xl overflow-hidden border border-white/[0.06]"
                    style={{ background: 'white' }}
                  >
                    <iframe
                      ref={iframeRef}
                      srcDoc={code}
                      title="Preview"
                      sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {/* Edit Tab */}
              {activeTab === 'edit' && (
                <div className="h-full flex flex-col p-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 w-full rounded-xl p-4 text-sm font-mono text-white/80 leading-6 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/30 custom-scrollbar"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      caretColor: 'rgb(6, 182, 212)',
                    }}
                    spellCheck={false}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setActiveTab('code')}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white/50 transition-all hover:text-white/80"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.15))',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)',
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar — language info */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04]">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">
                {language}
              </span>
              <span className="text-[10px] text-white/15">
                {codeLines.length} lines
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
