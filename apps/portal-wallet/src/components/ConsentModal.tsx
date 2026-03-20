import { getApiBase } from '@eu-jap-hack/auth'

interface Props {
  consent: Record<string, unknown>
  onApprove: () => void
  onDeny: () => void
}

export default function ConsentModal({ consent, onApprove, onDeny }: Props) {
  const dataRequested = consent.dataRequested as string[] | undefined
  const dataExcluded = consent.dataExcluded as string[] | undefined
  const vin = consent.vin as string
  const carId = `${getApiBase()}/vehicle-registry/vehicles/${vin}`

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="px-6 py-5 border-b border-[#E5EAF0]">
          <p className="text-xs text-[#FBBC05] font-medium uppercase tracking-wide mb-1">Data Access Request</p>
          <p className="text-sm text-[#5F6368]">A third party is requesting consent-based access to your vehicle data</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Requester info */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="w-8 h-8 bg-[#FBBC05] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <div>
              <p className="text-xs font-medium text-[#1F1F1F]">{consent.requesterName as string}</p>
              <p className="text-[10px] text-[#9AA0A6] font-mono">{consent.requesterId as string}</p>
            </div>
          </div>

          {/* Car ID */}
          <div>
            <p className="text-[10px] text-[#9AA0A6] uppercase tracking-wide mb-1">Vehicle (Car ID)</p>
            <div className="bg-[#F8FAFD] border border-[#E5EAF0] rounded-lg px-3 py-2">
              <p className="text-[10px] text-blue-600 font-mono break-all">{carId}</p>
              <p className="text-[10px] text-[#9AA0A6] mt-0.5">VIN: {vin}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-[#9AA0A6] uppercase tracking-wide mb-0.5">Purpose</p>
            <p className="text-xs text-[#5F6368]">{consent.purpose as string}</p>
          </div>

          {dataRequested && dataRequested.length > 0 && (
            <div>
              <p className="text-[10px] text-[#34A853] uppercase tracking-wide mb-1.5">Data They Will Access</p>
              <div className="flex flex-wrap gap-1">
                {dataRequested.map((d: string, i: number) => (
                  <span key={i} className="text-[10px] text-[#5F6368] bg-[#E6F4EA] border border-[#34A853]/20 px-2 py-0.5 rounded">{d}</span>
                ))}
              </div>
            </div>
          )}

          {dataExcluded && dataExcluded.length > 0 && (
            <div>
              <p className="text-[10px] text-[#EA4335] uppercase tracking-wide mb-1.5">Excluded (Not Shared)</p>
              <div className="flex flex-wrap gap-1">
                {dataExcluded.map((d: string, i: number) => (
                  <span key={i} className="text-[10px] text-[#9AA0A6] bg-[#FCE8E6] px-2 py-0.5 rounded line-through">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Access info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-[#9AA0A6] mb-1">Access Details</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className="text-[#9AA0A6]">Session duration</span>
              <span className="text-[#5F6368]">1 hour</span>
              <span className="text-[#9AA0A6]">Data source</span>
              <span className="text-[#5F6368]">Manufacturer registry</span>
              <span className="text-[#9AA0A6]">Exchange method</span>
              <span className="text-[#5F6368]">EDC sovereign transfer</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onDeny} className="flex-1 border border-[#E5EAF0] text-[#5F6368] py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFD] transition-colors">
            Deny Access
          </button>
          <button onClick={onApprove} className="flex-1 bg-[#34A853] hover:bg-[#1e7e34] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            Approve Access
          </button>
        </div>
      </div>
    </div>
  )
}
