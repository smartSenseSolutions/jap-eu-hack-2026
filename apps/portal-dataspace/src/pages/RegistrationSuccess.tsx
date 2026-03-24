import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBase, getPortalCompanyUrl } from '@eu-jap-hack/auth'

const API_BASE = getApiBase()
const POLL_INTERVAL_MS = 5000

interface EdcProvisioning {
  status: 'pending' | 'provisioning' | 'ready' | 'failed'
  lastError?: string
  managementUrl?: string
  protocolUrl?: string
  dataplaneUrl?: string
  apiKey?: string
  k8sNamespace?: string
  argoAppName?: string
  vaultPath?: string
  dbName?: string
  provisionedAt?: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-gray-700 break-all">{value}</p>
        <CopyButton value={value} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: EdcProvisioning['status'] }) {
  const styles: Record<string, string> = {
    pending:      'bg-gray-100 text-gray-500',
    provisioning: 'bg-blue-50 text-blue-600',
    ready:        'bg-green-50 text-green-600',
    failed:       'bg-red-50 text-red-600',
  }
  const labels: Record<string, string> = {
    pending:      'Pending',
    provisioning: 'Provisioning…',
    ready:        'Ready',
    failed:       'Failed',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === 'provisioning' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {status === 'ready' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      )}
      {labels[status]}
    </span>
  )
}

export default function RegistrationSuccess() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const [edc, setEdc] = useState<EdcProvisioning | null>(null)

  useEffect(() => {
    if (!companyId) return

    const poll = async () => {
      try {
        const r = await axios.get(`${API_BASE}/companies/${companyId}/edc-status`)
        setEdc(r.data)
      } catch {
        // not yet created — keep polling
      }
    }

    poll()
    const interval = setInterval(() => {
      poll().then(() => {
        // stop polling once terminal state reached
        if (edc?.status === 'ready' || edc?.status === 'failed') {
          clearInterval(interval)
        }
      })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [companyId, edc?.status])

  return (
    <div className="max-w-lg mx-auto mt-16 px-6 pb-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Organization Registered</h1>
        <p className="text-sm text-gray-400">Your OrgVC has been issued and is now verifiable on the EU APAC Dataspace.</p>
      </div>

      {/* Company ID */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Company ID</p>
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-gray-600">{companyId}</p>
          <CopyButton value={companyId!} />
        </div>
      </div>

      {/* EDC Provisioning */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-800">EDC Connector</p>
            <p className="text-xs text-gray-400 mt-0.5">Eclipse Dataspace Connector provisioning</p>
          </div>
          {edc ? <StatusBadge status={edc.status} /> : <StatusBadge status="pending" />}
        </div>

        {/* Pending / Provisioning */}
        {(!edc || edc.status === 'pending' || edc.status === 'provisioning') && (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500">Setting up your dedicated EDC instance…</p>
            <p className="text-[11px] text-gray-400 mt-1">This may take 2–5 minutes. You can leave this page — it will be ready in the background.</p>
          </div>
        )}

        {/* Failed */}
        {edc?.status === 'failed' && (
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs font-medium text-red-600 mb-1">Provisioning failed</p>
            <p className="text-xs text-red-400">{edc.lastError || 'An unexpected error occurred.'}</p>
          </div>
        )}

        {/* Ready — show all EDC config */}
        {edc?.status === 'ready' && (
          <div className="space-y-0">
            {edc.protocolUrl    && <ConfigRow label="DSP Protocol URL"   value={edc.protocolUrl} />}
            {edc.managementUrl  && <ConfigRow label="Management API URL"  value={edc.managementUrl} />}
            {edc.dataplaneUrl   && <ConfigRow label="Dataplane URL"       value={edc.dataplaneUrl} />}
            {edc.apiKey         && <ConfigRow label="API Key"             value={edc.apiKey} />}
            {edc.k8sNamespace   && <ConfigRow label="Kubernetes Namespace" value={edc.k8sNamespace} />}
            {edc.argoAppName    && <ConfigRow label="ArgoCD Application"  value={edc.argoAppName} />}
            {edc.dbName         && <ConfigRow label="Database Name"       value={edc.dbName} />}
            {edc.provisionedAt  && (
              <ConfigRow label="Provisioned At" value={new Date(edc.provisionedAt).toLocaleString()} />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Register Another
        </button>
        <a
          href={getPortalCompanyUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gray-900 text-white py-2.5 rounded text-sm font-medium hover:bg-gray-800 text-center transition-colors"
        >
          Company Portal
        </a>
      </div>
    </div>
  )
}
