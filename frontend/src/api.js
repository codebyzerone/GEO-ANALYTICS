import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'

export const analyzeBrand = async (brandName, queries) => {
  const response = await axios.post(`${BASE}/analyze`, {
    brand_name: brandName,
    queries: queries
  })
  return response.data
}

export const fetchSample = async () => {
  const response = await axios.get(`${BASE}/demo/sample`)
  return response.data
}

export const fetchHistory = async (brand) => {
  const params = brand ? `?brand=${encodeURIComponent(brand)}` : ''
  const response = await axios.get(`${BASE}/history${params}`)
  return response.data
}

export const fetchTrends = async (brand) => {
  const response = await axios.get(`${BASE}/trends?brand=${encodeURIComponent(brand)}`)
  return response.data
}

export const compareBrands = async (brandNames, queries) => {
  const response = await axios.post(`${BASE}/compare`, null, {
    params: {
      brand_names: brandNames,
      queries: queries
    }
  })
  return response.data
}

export const exportCsv = async (brand) => {
  const params = brand ? `?brand=${encodeURIComponent(brand)}` : ''
  const response = await axios.get(`${BASE}/export/csv${params}`, {
    responseType: 'blob'
  })
  return response.data
}