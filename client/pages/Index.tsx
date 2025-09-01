import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Index() {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to root which will handle authentication
    navigate('/', { replace: true })
  }, [navigate])

  return null
}
