/**
 * MRS SOLAR - TNEB / TANGEDCO Quick Pay & Portal Integration Helper
 * Provides seamless 1-click clipboard copy of consumer number & instant portal launch.
 * Guaranteed NON-BLOCKING: No intrusive native browser alerts.
 */

export const TNEB_QUICK_PAY_URL = 'https://www.tnebnet.org/qwp/qpay';
export const TNEB_LOGIN_URL = 'https://www.tnebnet.org/awp/login';
export const TNEB_BBPS_PAY_URL = 'https://paytm.com/electricity-bill-payment/tamil-nadu/tangedco';

/**
 * Displays a smooth, non-blocking in-app floating toast banner that auto-dismisses.
 * @param {string} message - Message text
 * @param {'success'|'info'|'warning'} type - Toast style
 */
export function showFloatingToast(message, type = 'success') {
  if (typeof document === 'undefined') return;

  // Remove existing toast if present
  const existing = document.getElementById('mrs-tneb-floating-toast');
  if (existing) {
    try { existing.remove(); } catch {}
  }

  const toast = document.createElement('div');
  toast.id = 'mrs-tneb-floating-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  
  // High z-index floating banner styled with responsive positioning
  toast.className = 'mrs-toast-animate fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[99999] max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold border transition-all duration-300';
  
  if (type === 'warning') {
    toast.style.background = 'linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.95))';
    toast.style.borderColor = 'rgba(251, 191, 36, 0.5)';
    toast.style.color = '#ffffff';
  } else {
    toast.style.background = 'linear-gradient(135deg, rgba(13, 148, 136, 0.96), rgba(15, 118, 110, 0.96))';
    toast.style.borderColor = 'rgba(45, 212, 191, 0.5)';
    toast.style.color = '#ffffff';
    toast.style.boxShadow = '0 12px 30px -4px rgba(13, 148, 136, 0.45)';
  }

  toast.innerHTML = `
    <div style="width: 24px; height: 24px; border-radius: 9999px; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">
      ⚡
    </div>
    <div style="flex: 1; line-height: 1.35;">
      ${message}
    </div>
  `;

  document.body.appendChild(toast);

  // Auto fade-out after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.96)';
    setTimeout(() => {
      try { toast.remove(); } catch {}
    }, 350);
  }, 3200);
}

/**
 * Seamlessly copies the customer's TNEB consumer number and immediately launches
 * the official TNEB Quick Pay portal in a new tab without any blocking browser alerts.
 * 
 * @param {string} consumerNumber - 10 to 12 digit service number
 * @param {string|object} optionsOrToast - Optional custom message or options object { lang, toastMessage }
 */
export function launchTnebQuickPay(consumerNumber, optionsOrToast) {
  const cleanNumber = String(consumerNumber || '').trim().replace(/\s+/g, '');
  
  // Determine custom message or default
  let customMsg = typeof optionsOrToast === 'string' ? optionsOrToast : optionsOrToast?.toastMessage;
  const lang = typeof optionsOrToast === 'object' ? optionsOrToast?.lang : 'en';

  // 1. Launch official TNEB portal immediately (synchronous user gesture avoids popup blocker)
  try {
    window.open(TNEB_QUICK_PAY_URL, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Window open notice:', err);
  }

  // 2. Silently copy to clipboard in background
  if (cleanNumber) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanNumber).catch((err) => {
        console.warn('Clipboard write warning:', err);
      });
    }

    const defaultMsg = lang === 'ta'
      ? `TNEB எண் "${cleanNumber}" நகலெடுக்கப்பட்டது! Quick Pay தளம் திறக்கப்பட்டுள்ளது.`
      : `TNEB Consumer No. "${cleanNumber}" copied! Portal opened in new tab.`;

    showFloatingToast(customMsg || defaultMsg, 'success');
  } else {
    const noNumberMsg = lang === 'ta'
      ? 'TNEB எண் இல்லை. தளம் திறக்கப்பட்டுள்ளது.'
      : 'TNEB Consumer Number not found. Portal opened.';
    showFloatingToast(customMsg || noNumberMsg, 'warning');
  }
}

/**
 * Launches BBPS UPI Payment page (Paytm / Google Pay / PhonePe) for TNEB
 */
export function launchTnebBbpsPay(consumerNumber, options = {}) {
  const cleanNumber = String(consumerNumber || '').trim().replace(/\s+/g, '');

  try {
    window.open(TNEB_BBPS_PAY_URL, '_blank', 'noopener,noreferrer');
  } catch {}

  if (cleanNumber && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanNumber).catch(() => {});
  }

  const lang = options?.lang || 'en';
  const msg = lang === 'ta'
    ? `TNEB எண் "${cleanNumber}" நகலெடுக்கப்பட்டது! UPI / BBPS தளம் திறக்கப்பட்டது.`
    : `TNEB No. "${cleanNumber}" copied! UPI Payment page opened.`;

  showFloatingToast(options?.toastMessage || msg, 'success');
}
