'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings as SettingsIcon,
  DollarSign,
  Save,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plug,
  Trash2,
  Loader2,
  Info,
} from 'lucide-react'

interface PaymentConfig {
  provider: string
  keyId: string
  keyIdMasked: string
  secretMasked: string
  secretSet: boolean
  secretDecryptFailed: boolean
  mode: 'test' | 'live' | 'unknown'
  enabled: boolean
  isConfigured: boolean
  source: 'database' | 'environment' | 'none'
  envFallbackAvailable: boolean
  updatedAt: string | null
  updatedBy: string | null
}

type Banner = { type: 'success' | 'error' | 'info'; text: string } | null

export default function SettingsPage() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Platform charges
  const [platformCharges, setPlatformCharges] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platformBanner, setPlatformBanner] = useState<Banner>(null)

  // Razorpay payment gateway
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState('')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [testingPayment, setTestingPayment] = useState(false)
  const [togglingPayment, setTogglingPayment] = useState(false)
  const [removingPayment, setRemovingPayment] = useState(false)
  const [paymentBanner, setPaymentBanner] = useState<Banner>(null)
  const [forceSaveAvailable, setForceSaveAvailable] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchPaymentSettings()
  }, [])

  /* ---------------- Platform charges ---------------- */

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.success && data.settings) {
        setPlatformCharges(data.settings.platformCharges ?? '')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setPlatformBanner(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformCharges })
      })
      const data = await response.json()
      if (data.success) {
        setPlatformBanner({ type: 'success', text: 'Platform charges saved successfully.' })
      } else {
        setPlatformBanner({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setPlatformBanner({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- Razorpay ---------------- */

  const applyPaymentConfig = (config: PaymentConfig) => {
    setPaymentConfig(config)
    setKeyId(config.keyId || '')
    setKeySecret('')
    setShowSecret(false)
    setForceSaveAvailable(false)
  }

  const fetchPaymentSettings = async () => {
    setPaymentLoading(true)
    setPaymentError('')
    try {
      const response = await fetch('/api/settings/payment', { cache: 'no-store' })
      const data = await response.json()

      if (response.status === 401) {
        setPaymentError('Your admin session has expired. Please sign in again to manage payment keys.')
        return
      }

      if (data.success && data.config) {
        applyPaymentConfig(data.config)
      } else {
        setPaymentError(data.error || 'Failed to load payment gateway settings')
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
      setPaymentError('Failed to load payment gateway settings')
    } finally {
      setPaymentLoading(false)
    }
  }

  const savePaymentSettings = async (force = false) => {
    setSavingPayment(true)
    setPaymentBanner(null)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: keyId.trim(),
          keySecret: keySecret.trim(),
          enabled: paymentConfig?.enabled ?? true,
          force,
        })
      })
      const data = await response.json()

      if (data.success && data.config) {
        applyPaymentConfig(data.config)
        setPaymentBanner({ type: 'success', text: data.message || 'Razorpay credentials saved.' })
      } else {
        setForceSaveAvailable(Boolean(data.canForce))
        setPaymentBanner({ type: 'error', text: data.error || 'Failed to save Razorpay credentials' })
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
      setPaymentBanner({ type: 'error', text: 'Failed to save Razorpay credentials' })
    } finally {
      setSavingPayment(false)
    }
  }

  const testPaymentConnection = async () => {
    setTestingPayment(true)
    setPaymentBanner(null)
    try {
      const response = await fetch('/api/settings/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: keyId.trim(), keySecret: keySecret.trim() })
      })
      const data = await response.json()

      setPaymentBanner({
        type: data.success ? 'success' : 'error',
        text: data.message || data.error || 'Could not test the connection'
      })
    } catch (error) {
      console.error('Error testing payment connection:', error)
      setPaymentBanner({ type: 'error', text: 'Could not reach the server to test the connection' })
    } finally {
      setTestingPayment(false)
    }
  }

  const togglePaymentEnabled = async () => {
    if (!paymentConfig) return
    const next = !paymentConfig.enabled

    setTogglingPayment(true)
    setPaymentBanner(null)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next })
      })
      const data = await response.json()

      if (data.success && data.config) {
        setPaymentConfig(data.config)
        setPaymentBanner({ type: 'info', text: data.message || 'Updated' })
      } else {
        setPaymentBanner({ type: 'error', text: data.error || 'Failed to update' })
      }
    } catch (error) {
      console.error('Error toggling payment gateway:', error)
      setPaymentBanner({ type: 'error', text: 'Failed to update' })
    } finally {
      setTogglingPayment(false)
    }
  }

  const removePaymentCredentials = async () => {
    const ok = window.confirm(
      'Remove the saved Razorpay credentials?\n\nCheckout will stop using these keys immediately.'
    )
    if (!ok) return

    setRemovingPayment(true)
    setPaymentBanner(null)
    try {
      const response = await fetch('/api/settings/payment', { method: 'DELETE' })
      const data = await response.json()

      if (data.success && data.config) {
        applyPaymentConfig(data.config)
        setPaymentBanner({ type: 'info', text: data.message || 'Credentials removed.' })
      } else {
        setPaymentBanner({ type: 'error', text: data.error || 'Failed to remove credentials' })
      }
    } catch (error) {
      console.error('Error removing payment settings:', error)
      setPaymentBanner({ type: 'error', text: 'Failed to remove credentials' })
    } finally {
      setRemovingPayment(false)
    }
  }

  /* ---------------- Derived values ---------------- */

  const typedMode: 'test' | 'live' | 'unknown' = keyId.startsWith('rzp_live_')
    ? 'live'
    : keyId.startsWith('rzp_test_')
    ? 'test'
    : 'unknown'

  const keyIdChanged = (paymentConfig?.keyId || '') !== keyId.trim()
  const canSavePayment =
    keyId.trim().length > 0 &&
    (keySecret.trim().length > 0 || (!keyIdChanged && paymentConfig?.source === 'database' && paymentConfig?.secretSet))

  const bannerStyles: Record<'success' | 'error' | 'info', string> = {
    success: 'bg-emerald/10 text-emerald border-emerald/30',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  const renderBanner = (banner: Banner) => {
    if (!banner) return null
    const Icon = banner.type === 'success' ? CheckCircle2 : banner.type === 'error' ? XCircle : Info
    return (
      <div className={`flex items-start gap-2 border rounded-lg px-4 py-3 text-sm ${bannerStyles[banner.type]}`}>
        <Icon size={18} className="mt-0.5 shrink-0" />
        <span className="break-words">{banner.text}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-64 transition-all duration-300 min-h-screen">
        <header className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 fixed top-0 right-0 left-64 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-deep-blue">Settings</h1>
              <p className="text-slate-gray text-sm">Configure platform settings</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-gray w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal outline-none"
                />
              </div>

              <button className="relative p-2 text-slate-gray hover:text-deep-blue hover:bg-teal/10 rounded-lg transition-all">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  3
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2 hover:bg-teal/10 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald to-teal rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold">A</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-deep-blue">Admin User</p>
                    <p className="text-xs text-slate-gray">Super Admin</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-gray transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={16} className="mr-3 text-slate-gray" />
                      Profile Settings
                    </button>
                    <button className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <SettingsIcon size={16} className="mr-3 text-slate-gray" />
                      Account Settings
                    </button>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} className="mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-10 mt-24 space-y-8">
          {/* ---------------- Platform charges ---------------- */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 max-w-2xl">
            <div className="flex items-center mb-6">
              <DollarSign className="text-emerald w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Platform Charges</h2>
                <p className="text-sm text-slate-gray">Set the platform commission percentage</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Charges (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={platformCharges}
                      onChange={(e) => setPlatformCharges(e.target.value)}
                      placeholder="Enter percentage (e.g., 10)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald focus:border-emerald outline-none text-lg"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">%</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    This percentage will be charged on all transactions
                  </p>
                </div>

                {renderBanner(platformBanner)}

                <button
                  onClick={handleSave}
                  disabled={saving || !platformCharges}
                  className="w-full flex items-center justify-center px-6 py-3 bg-emerald text-white rounded-lg hover:bg-emerald/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Save size={20} className="mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>

          {/* ---------------- Razorpay payment gateway ---------------- */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 max-w-2xl">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex items-center">
                <CreditCard className="text-teal w-8 h-8 mr-3 shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Payment Gateway</h2>
                  <p className="text-sm text-slate-gray">
                    Razorpay keys used by the website and mobile apps
                  </p>
                </div>
              </div>

              {paymentConfig && (
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      paymentConfig.enabled && paymentConfig.isConfigured
                        ? 'bg-emerald/10 text-emerald'
                        : 'bg-gray-100 text-slate-gray'
                    }`}
                  >
                    {!paymentConfig.isConfigured
                      ? 'Not configured'
                      : paymentConfig.enabled
                      ? 'Active'
                      : 'Disabled'}
                  </span>
                  {paymentConfig.mode !== 'unknown' && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        paymentConfig.mode === 'live'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {paymentConfig.mode === 'live' ? 'LIVE mode' : 'TEST mode'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {paymentLoading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
              </div>
            ) : paymentError ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <XCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{paymentError}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={fetchPaymentSettings}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="px-5 py-2.5 bg-deep-blue text-white rounded-lg hover:bg-deep-blue/90 transition-all"
                  >
                    Sign in again
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={keyId}
                    onChange={(e) => {
                      setKeyId(e.target.value)
                      setForceSaveAvailable(false)
                    }}
                    placeholder="rzp_test_xxxxxxxxxxxx"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal outline-none font-mono text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Razorpay Dashboard &rarr; Account &amp; Settings &rarr; API Keys
                  </p>
                </div>

                {/* Key Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razorpay Key Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={keySecret}
                      onChange={(e) => {
                        setKeySecret(e.target.value)
                        setForceSaveAvailable(false)
                      }}
                      placeholder={
                        paymentConfig?.secretSet
                          ? `Saved: ${paymentConfig.secretMasked} - leave blank to keep`
                          : 'Paste the Key Secret'
                      }
                      autoComplete="new-password"
                      spellCheck={false}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal outline-none font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray hover:text-deep-blue transition-colors"
                      aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Stored encrypted on the server and never sent back to the browser.
                  </p>
                </div>

                {/* Mode warning for the value being typed */}
                {typedMode === 'live' && (
                  <div className="flex items-start gap-2 border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>
                      These are <strong>LIVE</strong> keys. Real money will be charged on every booking.
                    </span>
                  </div>
                )}
                {keyId.trim().length > 0 && typedMode === 'unknown' && (
                  <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg px-4 py-3 text-sm">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>
                      This does not look like a Razorpay Key ID. It should start with
                      {' '}<code className="font-mono">rzp_test_</code> or <code className="font-mono">rzp_live_</code>.
                    </span>
                  </div>
                )}

                {paymentConfig?.secretDecryptFailed && (
                  <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg px-4 py-3 text-sm">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>
                      The saved Key Secret could not be decrypted (the server encryption key changed).
                      Please enter the Key Secret again.
                    </span>
                  </div>
                )}

                {renderBanner(paymentBanner)}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => savePaymentSettings(false)}
                    disabled={savingPayment || !canSavePayment}
                    className="flex-1 flex items-center justify-center px-6 py-3 bg-teal text-white rounded-lg hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {savingPayment ? (
                      <Loader2 size={20} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={20} className="mr-2" />
                    )}
                    {savingPayment ? 'Saving...' : 'Save Keys'}
                  </button>

                  <button
                    onClick={testPaymentConnection}
                    disabled={testingPayment || keyId.trim().length === 0}
                    className="flex-1 flex items-center justify-center px-6 py-3 border border-teal text-teal rounded-lg hover:bg-teal/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {testingPayment ? (
                      <Loader2 size={20} className="mr-2 animate-spin" />
                    ) : (
                      <Plug size={20} className="mr-2" />
                    )}
                    {testingPayment ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {forceSaveAvailable && (
                  <button
                    onClick={() => savePaymentSettings(true)}
                    disabled={savingPayment}
                    className="w-full flex items-center justify-center px-6 py-2.5 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-all text-sm"
                  >
                    <AlertTriangle size={16} className="mr-2" />
                    Save anyway (skip Razorpay validation)
                  </button>
                )}

                {/* Status footer */}
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Enable Razorpay checkout</p>
                      <p className="text-xs text-slate-gray mt-1">
                        When off, the website and apps skip the payment step and book directly.
                      </p>
                    </div>
                    <button
                      onClick={togglePaymentEnabled}
                      disabled={togglingPayment || !paymentConfig || !paymentConfig.keyId}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        paymentConfig?.enabled ? 'bg-emerald' : 'bg-gray-300'
                      }`}
                      aria-pressed={Boolean(paymentConfig?.enabled)}
                      aria-label="Enable Razorpay checkout"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          paymentConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-slate-gray">Credentials source</dt>
                    <dd className="text-gray-900 font-medium text-right">
                      {paymentConfig?.source === 'database'
                        ? 'Admin panel'
                        : paymentConfig?.source === 'environment'
                        ? 'Server environment (.env)'
                        : 'Not set'}
                    </dd>

                    <dt className="text-slate-gray">Key Secret</dt>
                    <dd className="text-gray-900 font-medium text-right font-mono">
                      {paymentConfig?.secretSet ? paymentConfig.secretMasked : 'Not set'}
                    </dd>

                    {paymentConfig?.updatedAt && (
                      <>
                        <dt className="text-slate-gray">Last updated</dt>
                        <dd className="text-gray-900 font-medium text-right">
                          {new Date(paymentConfig.updatedAt).toLocaleString()}
                          {paymentConfig.updatedBy ? ` by ${paymentConfig.updatedBy}` : ''}
                        </dd>
                      </>
                    )}
                  </dl>

                  {paymentConfig?.source === 'environment' && (
                    <div className="flex items-start gap-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg px-4 py-3 text-xs">
                      <Info size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Keys are currently read from the server environment. Saving here overrides them
                        and makes the gateway fully manageable from the admin panel.
                      </span>
                    </div>
                  )}

                  {paymentConfig?.source === 'database' && (
                    <button
                      onClick={removePaymentCredentials}
                      disabled={removingPayment}
                      className="flex items-center text-sm text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={16} className="mr-2" />
                      {removingPayment ? 'Removing...' : 'Remove saved credentials'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
