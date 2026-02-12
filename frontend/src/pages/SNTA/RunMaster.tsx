import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function RunMaster() {
  const navigate = useNavigate()

  useEffect(() => {
    // Navigate to submitted requests page
    navigate('/snta/submitted-requests')
  }, [navigate])

  // Return null or a loading state while redirecting
  return null
}

