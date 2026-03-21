import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBase } from '@eu-jap-hack/auth'

const API_BASE = getApiBase()

interface Car {
  id: string
  vin: string
  make: string
  model: string
  variant: string
  year: number
  price: number
  status: string
  dpp: {
    performance?: {
      motorType?: string
    }
    damageHistory?: {
      totalIncidents?: number
    }
    stateOfHealth?: {
      overallRating?: number
      mileageKm?: number
    }
    ownershipChain?: {
      previousOwners?: unknown[]
    }
  }
}

// Car images mapped by VIN — pristine official photos for new cars, real used car photos for older/damaged ones
const carImages: Record<string, string> = {
  // Nexon EV 2025 — brand new, pristine (CarWale official)
  'TATA2025NEXONEV001': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/149123/nexon-ev-exterior-right-front-three-quarter-80.png?isig=0&q=80',
  // Curvv EV 2024 — lightly used (CarWale official)
  'TATA2024CURVVEV001': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/115617/curvv-ev-exterior-right-front-three-quarter-8.png?isig=0&q=80',
  // Harrier 2023 — moderate use, 2 minor incidents (used car listing photo)
  'TATA2023HARRIER001': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-exterior-right-front-three-quarter-7.png?isig=0&q=80',
  // Safari 2022 — well used, 62k km, 3 incidents incl 1 major (used car listing)
  'TATA2022SAFARI0001': 'https://images10.gaadi.com/usedcar_image/5186594/original/processed_de9f26c2-1c91-44e3-9f8f-3c1c99a8ca67.jpg?imwidth=640',
  // Nexon 2020 ICE — heavily used, 105k km, 4 incidents (used car listing)
  'TATA2020NEXON00002': 'https://images10.gaadi.com/usedcar_image/5173722/original/processed_74be42ef-c68f-47b4-a979-db26f0d5e1d5.jpg?imwidth=640',
  // Punch EV 2025 — factory fresh (CarWale official)
  'TATA2025PUNCHEV001': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/217141/punch-ev-facelift-exterior-right-front-three-quarter-4.png?isig=0&q=80',
  // Safari Storme 2018 — old, 158k km, 5 incidents, 4 owners (used car listing)
  'TATA2018SAFARI0002': 'https://images10.gaadi.com/usedcar_image/5045581/original/processed_fc3e7b38-7001-4583-9215-8e1400f72006.jpg?imwidth=640',
  // Tiago EV 2024 — clean, 1 owner (CarWale official)
  'TATA2024TIAGOEV01': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/40453/tiago-ev-exterior-right-front-three-quarter-15.png?isig=0&q=80',
}

// Fallback images by model name
const modelImages: Record<string, string> = {
  'Nexon EV': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/149123/nexon-ev-exterior-right-front-three-quarter-80.png?isig=0&q=80',
  'Curvv EV': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/115617/curvv-ev-exterior-right-front-three-quarter-8.png?isig=0&q=80',
  'Harrier': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-exterior-right-front-three-quarter-7.png?isig=0&q=80',
  'Safari': 'https://images10.gaadi.com/usedcar_image/5186594/original/processed_de9f26c2-1c91-44e3-9f8f-3c1c99a8ca67.jpg?imwidth=640',
  'Safari Storme': 'https://images10.gaadi.com/usedcar_image/5045581/original/processed_fc3e7b38-7001-4583-9215-8e1400f72006.jpg?imwidth=640',
  'Nexon': 'https://images10.gaadi.com/usedcar_image/5173722/original/processed_74be42ef-c68f-47b4-a979-db26f0d5e1d5.jpg?imwidth=640',
  'Punch EV': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/217141/punch-ev-facelift-exterior-right-front-three-quarter-4.png?isig=0&q=80',
  'Tiago EV': 'https://imgd.aeplcdn.com/664x374/n/cw/ec/40453/tiago-ev-exterior-right-front-three-quarter-15.png?isig=0&q=80',
}

function getCarImage(car: Car): string {
  return carImages[car.vin] || modelImages[car.model] || modelImages['Nexon'] || ''
}

export default function CarGrid() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(`${API_BASE}/cars`).then(r => {
      setCars(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-[#E5EAF0] border-t-[#4285F4] rounded-full"></div>
    </div>
  )

  return (
    <div>
      <div className="bg-white border-b border-[#E5EAF0] py-16 px-8 text-center">
        <h1 className="text-3xl font-semibold text-[#1F1F1F] mb-2">Find Your Perfect Car</h1>
        <p className="text-[#9AA0A6] text-sm">Every vehicle comes with a verified Digital Product Passport</p>
        <div className="mt-5 flex justify-center gap-3 text-xs">
          <span className="border border-[#E5EAF0] text-[#5F6368] px-3 py-1 rounded-full">{cars.filter(c => c.status === 'available').length} Available</span>
          <span className="border border-[#E5EAF0] text-[#5F6368] px-3 py-1 rounded-full">{cars.length} Total</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {cars.map(car => {
            const imageUrl = getCarImage(car)
            const mileage = car.dpp?.stateOfHealth?.mileageKm
            const owners = (car.dpp?.ownershipChain?.previousOwners?.length ?? 0) + 1

            return (
              <div key={car.vin} className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden hover:shadow-md hover:border-[#4285F4]/30 transition-all group">
                <div className="h-48 bg-[#F6F8FA] relative overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-[#9AA0A6]">
                      {car.dpp?.performance?.motorType === 'BEV' ? '\u26A1' : '\u{1F697}'}
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase ${
                    car.status === 'available' ? 'bg-[#E6F4EA] text-[#34A853] border border-[#34A853]/20' : 'bg-[#F1F3F6] text-[#9AA0A6] border border-[#E5EAF0]'
                  }`}>
                    {car.status}
                  </div>
                  {(car.dpp?.damageHistory?.totalIncidents || 0) > 0 && (
                    <div className="absolute top-3 left-3 bg-[#FBBC05] text-white px-2 py-0.5 rounded-full text-[10px] font-medium">
                      {car.dpp.damageHistory!.totalIncidents} Damage{car.dpp.damageHistory!.totalIncidents! > 1 ? 's' : ''}
                    </div>
                  )}
                  {car.dpp?.stateOfHealth?.overallRating && (
                    <div className={`absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      car.dpp.stateOfHealth.overallRating >= 8 ? 'bg-[#34A853] text-white' :
                      car.dpp.stateOfHealth.overallRating >= 6 ? 'bg-[#FBBC05] text-white' : 'bg-[#EA4335] text-white'
                    }`}>
                      {car.dpp.stateOfHealth.overallRating.toFixed(1)}/10
                    </div>
                  )}
                  {mileage != null && mileage > 0 && (
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm">
                      {mileage >= 1000 ? `${Math.round(mileage / 1000)}k km` : `${mileage} km`}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-[#9AA0A6] mb-0.5">{car.year} &middot; {car.variant}</p>
                  <h3 className="font-medium text-[#1F1F1F]">{car.make} {car.model}</h3>
                  <p className="text-[#4285F4] font-semibold text-lg mt-1">&euro;{car.price?.toLocaleString()}</p>
                  <p className="text-[10px] text-[#9AA0A6] font-mono mt-1">{car.vin}</p>

                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#5F6368] border border-[#E5EAF0] px-1.5 py-0.5 rounded">DPP</span>
                    {car.dpp?.performance?.motorType === 'BEV' && (
                      <span className="text-[10px] text-[#34A853] border border-[#34A853]/20 px-1.5 py-0.5 rounded">EV</span>
                    )}
                    {owners > 1 && (
                      <span className="text-[10px] text-[#9AA0A6] border border-[#E5EAF0] px-1.5 py-0.5 rounded">{owners} owners</span>
                    )}
                  </div>

                  {car.status === 'available' ? (
                    <button
                      onClick={() => navigate(`/car/${car.vin}`)}
                      className="w-full mt-4 bg-[#1F1F1F] hover:bg-[#333] text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View &amp; Buy
                    </button>
                  ) : (
                    <button disabled className="w-full mt-4 bg-[#F1F3F6] text-[#9AA0A6] py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                      Sold
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
