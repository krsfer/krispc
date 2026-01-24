/**
 * Share modal component with privacy controls
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, useIsRTL } from '@/lib/i18n/context';
import { sharingService, type ShareOptions, type ShareResult, type SocialSharePlatform } from '@/lib/sharing/sharing-service';
import type { PatternState } from '@/types/pattern';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternState;
  userId: string;
}

export function ShareModal({ isOpen, onClose, pattern, userId }: ShareModalProps) {
  const t = useTranslation();
  const isRTL = useIsRTL();
  
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    expirationDays: 30,
    maxDownloads: null,
    password: '',
    includeMetadata: true,
    isPublic: true,
    allowComments: true,
    allowRemix: true,
    watermark: false
  });
  
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'link' | 'social' | 'embed'>('options');
  const [socialPlatforms, setSocialPlatforms] = useState<SocialSharePlatform[]>([]);
  const [emailShare, setEmailShare] = useState<{ subject: string; body: string; url: string } | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const handleCreateShare = async () => {
    setIsLoading(true);
    
    try {
      const result = await sharingService.createShare(pattern, userId, shareOptions);
      setShareResult(result);
      
      if (result.success && result.shareUrl) {
        // Generate social media links
        const platforms = sharingService.generateSocialShares(result.shareUrl, pattern);
        setSocialPlatforms(platforms);
        
        // Generate email share
        const email = sharingService.generateEmailShare(result.shareUrl, pattern);
        setEmailShare(email);
        
        setActiveTab('link');
      }
    } catch (error) {
      console.error('Failed to create share:', error);
      setShareResult({
        success: false,
        error: 'Failed to create shareable link'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareResult?.shareUrl && linkInputRef.current) {
      try {
        await navigator.clipboard.writeText(shareResult.shareUrl);
        linkInputRef.current.select();
        
        // Show success feedback (could be a toast notification)
        console.log('Link copied to clipboard');
      } catch (error) {
        // Fallback for browsers that don't support clipboard API
        linkInputRef.current.select();
        document.execCommand('copy');
      }
    }
  };

  const handleSocialShare = (platform: SocialSharePlatform) => {
    window.open(platform.url, '_blank', 'width=600,height=400');
  };

  const handleEmailShare = () => {
    if (emailShare) {
      window.location.href = emailShare.url;
    }
  };

  const downloadQRCode = () => {
    if (shareResult?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = shareResult.qrCodeUrl;
      link.download = `${pattern.name || 'pattern'}-qr-code.png`;
      link.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl
          ${isRTL ? 'font-arabic' : ''}
        `}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="share-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 id="share-modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('sharing', 'sharePattern')}
          </h2>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isRTL ? 'ml-4' : 'mr-4'}
            `}
            aria-label={t('common', 'close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {[
            { id: 'options', label: t('sharing', 'privacySettings') },
            { id: 'link', label: t('sharing', 'shareLink') },
            { id: 'social', label: t('sharing.platforms', 'socialMedia') },
            { id: 'embed', label: t('sharing.platforms', 'embed') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'options' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {t('sharing', 'privacySettings')}
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareOptions.isPublic}
                        onChange={(e) => setShareOptions(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm text-gray-700 dark:text-gray-300 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        {t('sharing', 'publicShare')}
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareOptions.includeMetadata}
                        onChange={(e) => setShareOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm text-gray-700 dark:text-gray-300 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        {t('export', 'includeMetadata')}
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareOptions.allowComments || false}
                        onChange={(e) => setShareOptions(prev => ({ ...prev, allowComments: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm text-gray-700 dark:text-gray-300 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        Allow comments
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareOptions.allowRemix || false}
                        onChange={(e) => setShareOptions(prev => ({ ...prev, allowRemix: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`text-sm text-gray-700 dark:text-gray-300 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                        Allow remixing
                      </span>
                    </label>
                  </div>
                </div>

                {/* Access Controls */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Access Controls
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('sharing', 'linkExpiration')}
                      </label>
                      <select
                        value={shareOptions.expirationDays || ''}
                        onChange={(e) => setShareOptions(prev => ({ 
                          ...prev, 
                          expirationDays: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <option value="">Never expires</option>
                        <option value="1">1 day</option>
                        <option value="7">1 week</option>
                        <option value="30">1 month</option>
                        <option value="90">3 months</option>
                        <option value="365">1 year</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Downloads
                      </label>
                      <input
                        type="number"
                        value={shareOptions.maxDownloads || ''}
                        onChange={(e) => setShareOptions(prev => ({ 
                          ...prev, 
                          maxDownloads: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        placeholder="Unlimited"
                        min="1"
                        max="10000"
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('sharing', 'passwordProtected')}
                      </label>
                      <input
                        type="password"
                        value={shareOptions.password || ''}
                        onChange={(e) => setShareOptions(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Optional password"
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={handleCreateShare}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('sharing', 'sharePreparing') : t('common', 'create')}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('common', 'cancel')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'link' && shareResult?.success && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('sharing', 'shareLink')}
                </h3>
                
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    ref={linkInputRef}
                    type="text"
                    value={shareResult.shareUrl || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('common', 'copy')}
                  </button>
                </div>
                
                {shareResult.expiresAt && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Expires: {shareResult.expiresAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {shareResult.qrCodeUrl && (
                <div className="text-center">
                  <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    QR Code
                  </h4>
                  <img 
                    src={shareResult.qrCodeUrl} 
                    alt="QR Code" 
                    className="mx-auto w-48 h-48 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={downloadQRCode}
                    className="mt-3 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20"
                  >
                    {t('common', 'download')} QR Code
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'social' && socialPlatforms.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('sharing.platforms', 'socialMedia')}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {socialPlatforms.map(platform => (
                  <button
                    key={platform.name}
                    onClick={() => handleSocialShare(platform)}
                    className={`
                      p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 
                      dark:border-gray-600 dark:hover:border-gray-500
                      flex flex-col items-center gap-2 transition-colors
                    `}
                    style={{ borderColor: platform.color + '40' }}
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-sm font-medium">{platform.name}</span>
                  </button>
                ))}
                
                {emailShare && (
                  <button
                    onClick={handleEmailShare}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 flex flex-col items-center gap-2 transition-colors"
                  >
                    <span className="text-2xl">📧</span>
                    <span className="text-sm font-medium">{t('sharing.platforms', 'email')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'embed' && shareResult?.embedCode && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {t('sharing.platforms', 'embed')}
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Embed Code
                </label>
                <textarea
                  value={shareResult.embedCode}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareResult.embedCode || '')}
                  className="mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20"
                >
                  {t('common', 'copy')} Embed Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}