import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  updateLocalState: () => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
  setUserId: (userId: string) => void | Promise<void>
  getUser: (userId: string) => Promise<unknown>
  makeUser: (userId: string) => Promise<void>
}

const NewAccountNotification = ({
  updateLocalState,
  setIsMakingNewReview,
  setUserId,
  getUser,
  makeUser,
}: Props) => {
  const { t } = useTranslation()
  const [generatedUserId] = useState<string>(uuidv4())
  const [previousUserId, setPreviousUserId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'new' | 'existing'>('new')

  const handleSettingNewUserId = async () => {
    await makeUser(generatedUserId)
    await setUserId(generatedUserId)
    await updateLocalState()
  }

  const handleSettingPreviousUserId = async () => {
    if (!previousUserId.trim()) {
      setError(t('shared.enterUserId'))
      return
    }

    const res = await getUser(previousUserId)

    if (!res || !previousUserId) {
      setError(t('shared.userIdNotFound'))
      return
    }

    await setUserId(previousUserId)
    await updateLocalState()
    setIsMakingNewReview(false)
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
              onClick={() => {
                navigator.clipboard.writeText(generatedUserId)
              }}
            >
              {t('shared.copy')}
            </button>
          </p>

          <p>{t('shared.userIdExplanation')}</p>

          <p>
            <b>{t('shared.saveIdWarning')}</b> {t('shared.saveIdDetail')}
          </p>
          <div className="my-2 flex gap-2">
            <button className="btn-secondary" onClick={() => setView('existing')}>
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
