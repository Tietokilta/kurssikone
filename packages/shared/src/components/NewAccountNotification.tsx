import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** ID pre-generated on first visit (and already used for reactions); registered as the user ID. */
  generatedUserId: string
  updateLocalState: () => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
  setUserId: (userId: string) => void | Promise<void>
  getUser: (userId: string) => Promise<unknown>
  makeUser: (userId: string) => Promise<void>
}

const NewAccountNotification = ({
  generatedUserId,
  updateLocalState,
  setIsMakingNewReview,
  setUserId,
  getUser,
  makeUser,
}: Props) => {
  const { t } = useTranslation()
  const [previousUserId, setPreviousUserId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'new' | 'existing'>('new')
  const [copied, setCopied] = useState(false)

  const handleSettingNewUserId = async () => {
    try {
      try {
        await makeUser(generatedUserId)
      } catch (makeUserError) {
        // An earlier attempt may have registered the ID without it being saved locally
        const existing = await getUser(generatedUserId).catch(() => null)
        if (!existing) throw makeUserError
      }
      await setUserId(generatedUserId)
      await updateLocalState()
    } catch (e) {
      console.error('Failed to create user:', e)
      setError(t('shared.genericError'))
    }
  }

  const handleSettingPreviousUserId = async () => {
    if (!previousUserId.trim()) {
      setError(t('shared.enterUserId'))
      return
    }

    try {
      const res = await getUser(previousUserId)

      if (!res || !previousUserId) {
        setError(t('shared.userIdNotFound'))
        return
      }

      await setUserId(previousUserId)
      await updateLocalState()
      setIsMakingNewReview(false)
    } catch (e) {
      console.error('Failed to switch user:', e)
      setError(t('shared.genericError'))
    }
  }

  return (
    <div className="my-6">
      {view === 'new' ? (
        <>
          <h4>{t('shared.firstTimeTitle')}</h4>
          <p>
            {t('shared.newUserIdLabel')} <i>{generatedUserId}</i>
            <button
              className="btn-secondary ml-2 px-2 py-1"
              onClick={async () => {
                await navigator.clipboard.writeText(generatedUserId)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {t('shared.copy')}
            </button>
            {copied && <span className="ml-2">{t('shared.copiedToClipboard')}</span>}
          </p>

          <p>{t('shared.userIdExplanation')}</p>

          <p>
            <b>{t('shared.saveIdWarning')}</b> {t('shared.saveIdDetail')}
          </p>
          {error && (
            <p>
              <b className="text-red-600">{error}</b>
            </p>
          )}
          <div className="my-2 flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setView('existing')
                setError(null)
              }}
            >
              {t('shared.alreadyHaveId')}
            </button>
            <button className="btn-primary" onClick={handleSettingNewUserId}>
              {t('shared.understoodSaved')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h4>{t('shared.welcomeBack')}</h4>

          <p>{t('shared.pasteIdPrompt')}</p>
          {error && (
            <p>
              <b className="text-red-600">{error}</b>
            </p>
          )}
          <input
            type="text"
            placeholder={t('shared.pasteIdPlaceholder')}
            className="min-w-[282px] max-w-[400px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            onChange={(e) => setPreviousUserId(e.target.value)}
          />
          <button className="btn-primary ml-2" onClick={handleSettingPreviousUserId}>
            {t('shared.submit')}
          </button>
          <div className="mt-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setView('new')
                setError(null)
              }}
            >
              {t('shared.back')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default NewAccountNotification
