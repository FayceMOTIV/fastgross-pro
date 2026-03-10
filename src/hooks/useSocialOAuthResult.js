import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useSocialOAuthResult() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [oauthResult, setOauthResult] = useState(null)

  useEffect(() => {
    const success = searchParams.get('oauth_success')
    const error = searchParams.get('oauth_error')
    const reason = searchParams.get('reason')

    if (success) {
      setOauthResult({ type: 'success', platform: success })
      setSearchParams({})
    } else if (error) {
      setOauthResult({ type: 'error', platform: error, reason })
      setSearchParams({})
    }
  }, [])

  return oauthResult
}
