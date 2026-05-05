import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'

export const analyzeBrand = async (brandName, queries) => {
  const response = await axios.post(`${BASE}/analyze`, {
    brand_name: brandName,
    queries: queries
  })
  return response.data
}